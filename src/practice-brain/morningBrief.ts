/**
 * Morning Brief Generator — Chief of Staff daily opening handshake (POS §12).
 *
 * Delivers prioritized, actionable intelligence before the first patient arrives.
 * Scannable in ≤3 minutes; every item has an owner role; confidence labeled.
 *
 * FUTURE EXPANSION:
 * - Configurable sections per Office DNA (Office Manager DNA brief toggles)
 * - Delivery channels: email, SMS, dashboard, webhook to PMS task queue
 * - Doctor vs. front desk vs. manager brief variants (role-scoped projections)
 * - Read confirmation tracking and item action rate by noon (POS §12.4 metrics)
 * - Integration with post-overnight batch jobs across thousands of practices (queue sharded by practiceId)
 */

import type {
  DailyAwarenessState,
  IMorningBriefGenerator,
  MorningBrief,
  MorningBriefItem,
  MorningBriefSection,
  OwnerRole,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
  Recommendation,
  RecommendationPriority,
} from "./types.ts";

const ENGINE_VERSION = "morning-brief-v1";

function parseFirstPatientTime(time?: string): Date {
  const now = new Date();
  const [h, m] = (time ?? "08:30").split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function computeTargetDelivery(
  awareness: DailyAwarenessState
): string {
  const firstPatient = parseFirstPatientTime(awareness.officeDna.firstPatientTime);
  const leadMs = awareness.officeDna.morningBriefLeadMinutes * 60 * 1000;
  return new Date(firstPatient.getTime() - leadMs).toISOString();
}

function priorityRank(p: RecommendationPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[p];
}

function sectionFromRecommendations(
  id: string,
  title: string,
  owner: OwnerRole,
  recs: Recommendation[],
  defaultPriority: RecommendationPriority = "medium"
): MorningBriefSection {
  const items: MorningBriefItem[] = recs.map((rec) => ({
    id: `brief_item_${rec.id}`,
    summary: rec.recommendation,
    detail: rec.reason,
    confidence: rec.confidence,
    actionRequired: rec.priority === "critical" || rec.priority === "high",
    owner: rec.owner,
    relatedRecommendationId: rec.id,
  }));

  const priority =
    recs.length > 0
      ? recs.reduce(
          (best, r) => (priorityRank(r.priority) < priorityRank(best) ? r.priority : best),
          recs[0].priority
        )
      : defaultPriority;

  return { id, title, items, owner, priority };
}

function buildOvernightCallsSection(awareness: DailyAwarenessState): MorningBriefSection {
  const overnight = awareness.callStream.filter((c) => c.afterHours);
  const items: MorningBriefItem[] = overnight.map((call) => ({
    id: `brief_call_${call.callId}`,
    summary: `${call.intent.replace(/_/g, " ")} — ${call.urgency ?? "routine"}${call.sameDayEmergency ? " (same-day flag)" : ""}`,
    detail: call.appointmentType
      ? `Appointment type: ${call.appointmentType}. Completeness: ${Math.round(call.completenessScore * 100)}%.`
      : undefined,
    confidence: call.completenessScore,
    actionRequired: call.urgency === "urgent" || call.sameDayEmergency === true,
    owner: call.urgency === "urgent" ? "dentist" : "front_desk",
  }));

  return {
    id: "overnight_calls",
    title: "Overnight calls",
    items,
    owner: "front_desk",
    priority: items.some((i) => i.actionRequired) ? "critical" : "medium",
  };
}

function buildScheduleSnapshotSection(awareness: DailyAwarenessState): MorningBriefSection {
  const scheduled = awareness.scheduleSlots.filter((s) => s.status === "scheduled");
  const open = awareness.scheduleSlots.filter((s) => s.status === "open");
  const cancelled = awareness.scheduleSlots.filter((s) => s.status === "cancelled");

  const items: MorningBriefItem[] = [
    {
      id: "brief_sched_count",
      summary: `${scheduled.length} appointments scheduled today across doctor and hygiene columns`,
      actionRequired: false,
      owner: "front_desk",
    },
    {
      id: "brief_sched_open",
      summary: `${open.length} open blocks available for squeeze-ins or waitlist fill`,
      actionRequired: open.length > 0,
      owner: "front_desk",
      confidence: awareness.pmsAvailable ? 0.95 : 0.7,
      detail: awareness.pmsAvailable
        ? undefined
        : "Schedule from mock data — PMS integration pending; verify before confirming.",
    },
    {
      id: "brief_sched_cancel",
      summary: `${cancelled.length} cancellation(s) — recovery pipeline active`,
      actionRequired: cancelled.length > 0,
      owner: "front_desk",
    },
  ];

  const crownToday = scheduled.filter((s) => s.appointmentType === "crown_seat");
  for (const slot of crownToday) {
    items.push({
      id: `brief_lab_${slot.slotId}`,
      summary: `Crown seat at ${slot.startTime} — confirm lab case status`,
      actionRequired: true,
      owner: "assistant",
      confidence: 0.9,
    });
  }

  return {
    id: "schedule_snapshot",
    title: "Today's schedule snapshot",
    items,
    owner: "front_desk",
    priority: cancelled.length > 0 ? "high" : "medium",
  };
}

function buildNewPatientsSection(awareness: DailyAwarenessState): MorningBriefSection {
  const npeCalls = awareness.callStream.filter(
    (c) => c.intent === "new_patient" || c.appointmentType === "new_patient_exam"
  );
  const npeSlots = awareness.scheduleSlots.filter(
    (s) => s.appointmentType === "new_patient_exam" && s.status === "scheduled"
  );

  const items: MorningBriefItem[] = npeSlots.map((slot) => {
    const matchingCall = npeCalls[0];
    return {
      id: `brief_npe_${slot.slotId}`,
      summary: `New patient exam at ${slot.startTime}`,
      detail: matchingCall
        ? `Insurance: ${matchingCall.insuranceProgram ?? "verify before visit"}. Emotional flags: ${matchingCall.emotionalFlags?.join(", ") ?? "none"}.`
        : undefined,
      confidence: matchingCall?.completenessScore ?? 0.8,
      actionRequired: true,
      owner: "front_desk",
    };
  });

  return {
    id: "new_patients_today",
    title: "New patients today",
    items,
    owner: "front_desk",
    priority: items.length > 0 ? "high" : "low",
  };
}

function buildRecallSection(awareness: DailyAwarenessState): MorningBriefSection {
  const overdueOnSchedule = awareness.recallPosture.filter(
    (r) => r.daysOverdue > 0 && r.scheduledToday
  );

  const items: MorningBriefItem[] = overdueOnSchedule.map((r) => ({
    id: `brief_recall_${r.patientReferenceId}`,
    summary: `${r.recallType} recall ${r.daysOverdue} days overdue — patient on schedule today`,
    detail: "Discuss rebooking additional hygiene or perio maintenance while patient is in office.",
    actionRequired: true,
    owner: "hygiene_coordinator",
    confidence: 0.85,
  }));

  return {
    id: "recall_opportunities",
    title: "Recall opportunities on today's schedule",
    items,
    owner: "hygiene_coordinator",
    priority: items.length > 0 ? "medium" : "low",
  };
}

function buildAlertsSection(
  awareness: DailyAwarenessState,
  memory: PracticeMemorySnapshot
): MorningBriefSection {
  const items: MorningBriefItem[] = awareness.riskFlags.map((flag) => ({
    id: `brief_alert_${flag.id}`,
    summary: flag.description,
    actionRequired: flag.severity === "critical" || flag.severity === "high",
    owner: flag.owner,
    confidence: 0.9,
  }));

  if ((memory.dnaFreshnessDays ?? 0) > 30) {
    items.push({
      id: "brief_dna_freshness",
      summary: `Office DNA last validated ${memory.dnaFreshnessDays} days ago — review recommended`,
      actionRequired: (memory.dnaFreshnessDays ?? 0) > 90,
      owner: "office_manager",
      confidence: 0.95,
    });
  }

  return {
    id: "alerts",
    title: "Alerts",
    items,
    owner: "office_manager",
    priority: items.some((i) => i.actionRequired) ? "high" : "low",
  };
}

function buildStewardshipSection(metrics: PracticeMetricsSnapshot): MorningBriefSection {
  return {
    id: "yesterday_highlight",
    title: "Stewardship highlight",
    items: [
      {
        id: "brief_stewardship",
        summary: metrics.stewardshipHighlight ?? "Practice operating within normal parameters.",
        actionRequired: false,
        owner: "office_manager",
      },
    ],
    owner: "office_manager",
    priority: "low",
  };
}

function estimateReadMinutes(sections: MorningBriefSection[]): number {
  const itemCount = sections.reduce((n, s) => n + s.items.length, 0);
  return Math.min(3, Math.max(1, Math.ceil(itemCount / 5)));
}

export class MorningBriefGenerator implements IMorningBriefGenerator {
  generate(input: {
    awareness: DailyAwarenessState;
    memory: PracticeMemorySnapshot;
    metrics: PracticeMetricsSnapshot;
    recommendations: Recommendation[];
  }): MorningBrief {
    const { awareness, memory, metrics, recommendations } = input;

    const emergRecs = recommendations.filter((r) => r.category === "emergency");
    const scheduleRecs = recommendations.filter(
      (r) => r.category === "schedule" || r.category === "production"
    );
    const retentionRecs = recommendations.filter((r) => r.category === "retention");

    const sections: MorningBriefSection[] = [
      buildOvernightCallsSection(awareness),
      sectionFromRecommendations(
        "emergent_followups",
        "Emergent follow-ups",
        "front_desk",
        emergRecs,
        "critical"
      ),
      buildScheduleSnapshotSection(awareness),
      buildNewPatientsSection(awareness),
      sectionFromRecommendations(
        "squeeze_in_capacity",
        "Same-day squeeze-in & production",
        "front_desk",
        scheduleRecs.filter((r) => r.category === "production"),
        "high"
      ),
      buildRecallSection(awareness),
      sectionFromRecommendations(
        "waitlist_cancellations",
        "Cancellation & waitlist actions",
        "front_desk",
        scheduleRecs.filter((r) => r.category === "schedule"),
        "high"
      ),
      sectionFromRecommendations(
        "retention_actions",
        "Retention opportunities",
        "hygiene_coordinator",
        retentionRecs,
        "medium"
      ),
      buildAlertsSection(awareness, memory),
      buildStewardshipSection(metrics),
    ].filter((s) => s.items.length > 0 || s.id === "alerts");

    const topRecommendations = [...recommendations]
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
      .slice(0, 8);

    return {
      practiceId: awareness.practiceId,
      practiceName: awareness.officeDna.practiceName,
      generatedAt: new Date().toISOString(),
      targetDeliveryAt: computeTargetDelivery(awareness),
      date: awareness.date,
      sections,
      topRecommendations,
      metricsHighlight: metrics,
      stewardshipNote:
        metrics.stewardshipHighlight ??
        "How can I leave this practice better than I found it today?",
      estimatedReadMinutes: estimateReadMinutes(sections),
    };
  }
}

export const defaultMorningBriefGenerator = new MorningBriefGenerator();

export { ENGINE_VERSION as MORNING_BRIEF_VERSION };
