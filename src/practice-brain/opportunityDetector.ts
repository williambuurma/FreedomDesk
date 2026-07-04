/**
 * Opportunity Detector — proactive identification of scheduling, production,
 * retention, emergency, and patient opportunities (POS §23, CLE §10).
 *
 * Every opportunity cites evidence and carries confidence — low-confidence
 * opportunities queue for human review, not auto-action (Constitution + CLE §19).
 *
 * FUTURE EXPANSION:
 * - PMS read: unscheduled treatment, recall status, waitlist depth
 * - ML-assisted ranking at scale — organizational calibration per practice only
 * - DNA gating: filter by officeDna.enabledOpportunityCategories
 * - Opportunity decay worker: auto-close expired items
 * - Revenue attribution validation loop (manager-validated, not patient-facing)
 */

import type {
  DailyAwarenessState,
  EvidenceItem,
  IOpportunityDetector,
  Opportunity,
  OpportunityType,
  OwnerRole,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
} from "./types.ts";

const ENGINE_VERSION = "opportunity-detector-v1";

function evidence(
  source: string,
  description: string,
  referenceId?: string,
  provenance?: string
): EvidenceItem {
  return {
    source,
    description,
    referenceId,
    provenance,
    observedAt: new Date().toISOString(),
  };
}

function isEnabled(
  awareness: DailyAwarenessState,
  type: OpportunityType
): boolean {
  return awareness.officeDna.enabledOpportunityCategories.includes(type);
}

function detectSchedulingOpportunities(
  awareness: DailyAwarenessState
): Opportunity[] {
  if (!isEnabled(awareness, "scheduling")) return [];
  const opportunities: Opportunity[] = [];
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const openHygiene = awareness.scheduleSlots.filter(
    (s) => s.column === "hygiene" && s.status === "open"
  );
  for (const slot of openHygiene) {
    opportunities.push({
      id: `opp_sched_hyg_${slot.slotId}`,
      practiceId: awareness.practiceId,
      type: "scheduling",
      title: `Open hygiene slot at ${slot.startTime}`,
      description: `Unfilled hygiene capacity — waitlist or recall candidate may fit ${slot.durationMinutes}-min prophy/perio.`,
      evidence: [
        evidence(
          "schedule_event",
          `Hygiene slot open ${slot.date} ${slot.startTime}`,
          slot.slotId,
          "officeDna.scheduling.hygieneColumn"
        ),
      ],
      confidence: awareness.pmsAvailable ? 0.92 : 0.75,
      suggestedOwner: "front_desk",
      estimatedImpact: "medium",
      detectedAt: now,
      expiresAt: expires,
    });
  }

  const openDoctor = awareness.scheduleSlots.filter(
    (s) => s.column === "doctor" && s.status === "open"
  );
  for (const slot of openDoctor) {
    opportunities.push({
      id: `opp_sched_doc_${slot.slotId}`,
      practiceId: awareness.practiceId,
      type: "production",
      title: `Open doctor block at ${slot.startTime}`,
      description: `Doctor column capacity available — same-day emergency squeeze-in or treatment scheduling opportunity.`,
      evidence: [
        evidence(
          "schedule_event",
          `Doctor block open ${slot.date} ${slot.startTime}`,
          slot.slotId,
          "officeDna.scheduling.doctorColumn"
        ),
      ],
      confidence: awareness.pmsAvailable ? 0.9 : 0.72,
      suggestedOwner: "front_desk",
      estimatedImpact: "high",
      detectedAt: now,
      expiresAt: expires,
    });
  }

  return opportunities;
}

function detectCancellationRecovery(
  awareness: DailyAwarenessState
): Opportunity[] {
  if (!isEnabled(awareness, "cancellation_recovery")) return [];
  const cancelled = awareness.scheduleSlots.filter((s) => s.status === "cancelled");
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  return cancelled.map((slot) => ({
    id: `opp_cancel_${slot.slotId}`,
    practiceId: awareness.practiceId,
    type: "cancellation_recovery",
    title: `Cancellation recovery — ${slot.startTime} ${slot.column}`,
    description: `Cancelled slot may be offered to waitlist per Office DNA waitlist policy within 15-minute target latency.`,
    evidence: [
      evidence(
        "schedule_event",
        `Slot cancelled ${slot.date} ${slot.startTime}`,
        slot.slotId,
        "officeDna.scheduling.waitlistPolicy"
      ),
    ],
    confidence: 0.85,
    suggestedOwner: "front_desk",
    estimatedImpact: "high",
    detectedAt: now,
    expiresAt: expires,
  }));
}

function detectRetentionOpportunities(
  awareness: DailyAwarenessState
): Opportunity[] {
  if (!isEnabled(awareness, "retention")) return [];
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return awareness.recallPosture
    .filter((r) => r.daysOverdue > 90 && !r.scheduledToday)
    .map((r) => ({
      id: `opp_recall_${r.patientReferenceId}`,
      practiceId: awareness.practiceId,
      type: "retention",
      title: "Reactivation candidate — severely overdue recall",
      description: `${r.recallType} recall ${r.daysOverdue} days overdue — hygiene coordinator outreach opportunity.`,
      evidence: [
        evidence(
          "recall_posture",
          `Recall overdue ${r.daysOverdue} days`,
          r.patientReferenceId,
          "officeDna.hygiene.recallPolicy"
        ),
      ],
      confidence: 0.78,
      suggestedOwner: "hygiene_coordinator",
      estimatedImpact: "medium",
      detectedAt: now,
      expiresAt: expires,
    }));
}

function detectEmergencyOpportunities(
  awareness: DailyAwarenessState
): Opportunity[] {
  if (!isEnabled(awareness, "emergency")) return [];
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  return awareness.callStream
    .filter((c) => c.afterHours && (c.urgency === "urgent" || c.sameDayEmergency))
    .map((call) => ({
      id: `opp_emerg_${call.callId}`,
      practiceId: awareness.practiceId,
      type: "emergency",
      title: "Overnight urgent — same-day follow-up required",
      description: `Emergency eval intake complete — schedule same-day squeeze-in if clinically appropriate per DNA; callback SLA applies.`,
      evidence: [
        evidence(
          "call_summary",
          `After-hours ${call.urgency} call, type ${call.appointmentType ?? "unknown"}`,
          call.callId,
          "callFlows.emergency.summarySchema"
        ),
      ],
      confidence: call.completenessScore >= 0.95 ? 0.95 : 0.8,
      suggestedOwner: "front_desk" as OwnerRole,
      estimatedImpact: "high",
      detectedAt: now,
      expiresAt: expires,
      emotionalContext: call.emotionalFlags
        ? { flags: call.emotionalFlags, note: "EIE flags inform prep — not clinical decisions" }
        : undefined,
    }));
}

function detectPatientOpportunities(
  awareness: DailyAwarenessState
): Opportunity[] {
  if (!isEnabled(awareness, "patient")) return [];
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const opportunities: Opportunity[] = [];

  for (const call of awareness.callStream) {
    if (call.intent === "new_patient" && call.completenessScore >= 0.9) {
      opportunities.push({
        id: `opp_npe_${call.callId}`,
        practiceId: awareness.practiceId,
        type: "patient",
        title: "New patient arriving today — verification and prep",
        description: `NPE with ${call.insuranceProgram ?? "insurance TBD"} — benefits verification queue before visit.`,
        evidence: [
          evidence(
            "call_summary",
            `New patient intent, completeness ${Math.round(call.completenessScore * 100)}%`,
            call.callId,
            "callFlows.newPatient.requiredFields"
          ),
        ],
        confidence: 0.88,
        suggestedOwner: "front_desk",
        estimatedImpact: "medium",
        detectedAt: now,
        expiresAt: expires,
        emotionalContext: call.emotionalFlags
          ? { flags: call.emotionalFlags }
          : undefined,
      });
    }

    if (call.intent === "treatment_scheduling" && call.appointmentType === "crown_seat") {
      opportunities.push({
        id: `opp_prod_${call.callId}`,
        practiceId: awareness.practiceId,
        type: "production",
        title: "Crown seat scheduled — lab case confirmation",
        description: "Treatment-specific typing captured — assistant lab case flag per Assistant Workflow DNA.",
        evidence: [
          evidence(
            "call_summary",
            "Crown seat appointment type confirmed on call",
            call.callId,
            "officeDna.assistant.labCaseFlags"
          ),
        ],
        confidence: 0.91,
        suggestedOwner: "assistant",
        estimatedImpact: "medium",
        detectedAt: now,
        expiresAt: expires,
      });
    }

    if (call.emotionalFlags?.includes("frustrated") && call.intent === "cancel_reschedule") {
      opportunities.push({
        id: `opp_retain_${call.callId}`,
        practiceId: awareness.practiceId,
        type: "retention",
        title: "Cancellation save opportunity — frustrated caller",
        description: "Frustrated cancel/reschedule intent — disambiguate reschedule vs. cancel; EIE validation before admin.",
        evidence: [
          evidence(
            "call_summary",
            "Frustration flag on cancel/reschedule intent",
            call.callId,
            "emotionalIntelligence.frustration"
          ),
        ],
        confidence: 0.74,
        suggestedOwner: "front_desk",
        estimatedImpact: "medium",
        detectedAt: now,
        expiresAt: expires,
        emotionalContext: { flags: call.emotionalFlags, note: "Complaint recovery if cancel confirmed" },
      });
    }
  }

  return opportunities;
}

function detectWaitlistFill(
  awareness: DailyAwarenessState,
  metrics: PracticeMetricsSnapshot
): Opportunity[] {
  if (!isEnabled(awareness, "waitlist_fill")) return [];
  const cancelledCount =
    metrics.departments
      .flatMap((d) => d.kpis)
      .find((k) => k.id === "cancellation_count")?.value ?? 0;
  if (cancelledCount === 0) return [];

  const now = new Date().toISOString();
  return [
    {
      id: `opp_waitlist_${awareness.date}`,
      practiceId: awareness.practiceId,
      type: "waitlist_fill",
      title: "Waitlist match for cancelled hygiene slot",
      description: `${cancelledCount} cancellation(s) today — offer to waitlist candidates within 15-minute POS target latency.`,
      evidence: [
        evidence(
          "metric",
          `Cancellation count ${cancelledCount} on ${awareness.date}`,
          undefined,
          "practiceOperatingSystem.cancellationRecovery"
        ),
      ],
      confidence: 0.82,
      suggestedOwner: "front_desk",
      estimatedImpact: "high",
      detectedAt: now,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export class OpportunityDetector implements IOpportunityDetector {
  detect(
    awareness: DailyAwarenessState,
    _memory: PracticeMemorySnapshot,
    metrics: PracticeMetricsSnapshot
  ): Opportunity[] {
    const all = [
      ...detectSchedulingOpportunities(awareness),
      ...detectCancellationRecovery(awareness),
      ...detectRetentionOpportunities(awareness),
      ...detectEmergencyOpportunities(awareness),
      ...detectPatientOpportunities(awareness),
      ...detectWaitlistFill(awareness, metrics),
    ];

    // Deduplicate by id and sort by confidence descending
    const seen = new Set<string>();
    return all
      .filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }
}

export const defaultOpportunityDetector = new OpportunityDetector();

export { ENGINE_VERSION as OPPORTUNITY_DETECTOR_VERSION };
