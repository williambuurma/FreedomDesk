/**
 * Thin completed-call adapter — Twilio Gather → existing reasoning pipeline → Today card.
 *
 * Reuses: processCallTranscript, OperationalEvent, Practice Brain, PIE, Decision Arbitration.
 * Does not create a second phone or reasoning pipeline.
 */

import { processCallTranscript } from "../conversation/processCall.ts";
import type { CallSummary, MockCallTranscript } from "../conversation/types.ts";
import {
  PracticeBrain,
  MOCK_PRACTICE_ID,
  resetPracticeBrainRegistry,
} from "../practice-brain/index.ts";
import { resetDailyAwarenessForTests } from "../practice-brain/dailyAwareness.ts";
import { resetPracticeMemoryForTests } from "../practice-brain/practiceMemory.ts";
import {
  PracticeImprovementEngine,
  resetPracticeImprovementEngineRegistry,
} from "../practice-improvement/index.ts";
import type { DecisionFirstProjection } from "../practice-improvement/types.ts";
import type { OperationalEvent } from "../events/types.ts";
import {
  buildCallOperatingIntelligence,
  type CallOperatingIntelligence,
} from "./operatingIntelligence.ts";

export interface TodayDecisionCard extends DecisionFirstProjection {
  id: string;
  kind: string;
  disposition?: string;
  arbitration?: string;
  arbitrationReason?: string;
  rank?: number;
  outcomeStatuses: string[];
  callSummary?: Record<string, unknown>;
  operatingIntelligence?: CallOperatingIntelligence;
  live?: boolean;
}

export interface LatestActionableCall {
  schema: "latest-actionable-call/v1";
  generatedAt: string;
  source: "twilio_inbound_gather" | "twilio_conversation_relay" | "local_test";
  callId: string;
  practiceId: string;
  intent: string;
  urgency: string;
  recommendedNextStep: string;
  decisionCard: TodayDecisionCard;
  callSummary: Record<string, unknown>;
  operatingIntelligence: CallOperatingIntelligence;
  operationalEventId: string;
  arbitrationSummary: {
    primaryId: string | null;
    surfaced: number;
    waiting: number;
  };
}

export interface CompleteCallOptions {
  source?: LatestActionableCall["source"];
  /** When true, reset in-memory brain registries (tests / isolated local runs). */
  resetRegistries?: boolean;
}

function toUiCallSummary(
  summary: CallSummary,
  intel: CallOperatingIntelligence
): Record<string, unknown> {
  return {
    patientName: intel.patientName,
    phone: intel.phone,
    intent: intel.intent,
    urgency: intel.urgency,
    chiefConcern: intel.chiefConcern,
    recommendedNextStep: intel.recommendedNextAction,
    afterHours: intel.afterHours,
    sameDayEmergency: intel.sameDayEmergency,
    insuranceProgram: intel.insuranceProgram,
    openDentalCommLogNote: intel.openDentalCommLogNote,
    missingInformation: intel.missingForGoodDecision,
    actionItems: intel.actionItems,
    // Operating intelligence — what Today should lead with
    executiveSummary: intel.executiveSummary,
    suggestedAppointmentType: intel.suggestedAppointmentType,
    followUpTasks: intel.followUpTasks,
    immediateAttention: intel.immediateAttention,
    immediateAttentionReason: intel.immediateAttentionReason,
  };
}

function enrichDecisionCard(
  card: TodayDecisionCard,
  intel: CallOperatingIntelligence
): TodayDecisionCard {
  const immediate = intel.immediateAttention;
  const situation =
    immediate && intel.chiefConcern
      ? `${intel.patientName} needs attention: ${intel.chiefConcern}`
      : card.situation || intel.executiveSummary;
  const recommendation =
    intel.recommendedNextAction || card.recommendation;
  const primaryAction =
    immediate && intel.patientName !== "Caller"
      ? `Call ${intel.patientName.split(/\s+/)[0]}.`
      : immediate
        ? "Start callback now."
        : card.primaryAction || recommendation;

  return {
    ...card,
    situation,
    recommendation,
    primaryAction:
      primaryAction.length <= 72
        ? primaryAction
        : `${primaryAction.slice(0, 69).trimEnd()}…`,
    subject: intel.patientName !== "Caller" ? intel.patientName : card.subject,
    stake:
      intel.immediateAttentionReason ||
      card.stake ||
      "Caller may not receive a timely response",
    whyText: intel.executiveSummary || card.whyText,
    accent: immediate ? "urgent" : card.accent,
    group: immediate ? "urgent" : card.group,
    priority: immediate ? "high" : card.priority,
    operatingIntelligence: intel,
    callSummary: {
      patientName: intel.patientName,
      phone: intel.phone,
      intent: intel.intent,
      urgency: intel.urgency,
      chiefConcern: intel.chiefConcern,
      recommendedNextStep: intel.recommendedNextAction,
      afterHours: intel.afterHours,
      sameDayEmergency: intel.sameDayEmergency,
      insuranceProgram: intel.insuranceProgram,
      openDentalCommLogNote: intel.openDentalCommLogNote,
      missingInformation: intel.missingForGoodDecision,
      actionItems: intel.actionItems,
      executiveSummary: intel.executiveSummary,
      suggestedAppointmentType: intel.suggestedAppointmentType,
      followUpTasks: intel.followUpTasks,
      immediateAttention: intel.immediateAttention,
      immediateAttentionReason: intel.immediateAttentionReason,
    },
  };
}

function toDecisionCard(
  item: {
    projection: DecisionFirstProjection | null;
    result: {
      situation?: { kind?: string } | null;
      domain?: string;
      disposition?: string;
      recommendation?: { id?: string } | null;
    };
    disposition?: string;
    reason?: string;
    rank?: number;
  },
  intel: CallOperatingIntelligence
): TodayDecisionCard | null {
  const card = item.projection;
  if (!card) return null;
  const kind =
    item.result.situation?.kind ||
    (item.result.domain === "phone"
      ? "call_follow_up"
      : "improvement_recommendation");
  const base: TodayDecisionCard = {
    id: card.recommendationId,
    kind,
    situation: card.situation,
    recommendation: card.recommendation,
    primaryAction: card.primaryAction,
    subject: card.subject,
    stake: card.stake,
    whyText: card.whyText,
    accent: card.accent,
    group: card.group,
    recommendationId: card.recommendationId,
    practiceId: card.practiceId,
    dedupeKey: card.dedupeKey,
    priority: card.priority,
    evidence: card.evidence,
    disposition: item.result.disposition,
    arbitration: item.disposition,
    arbitrationReason: item.reason,
    rank: item.rank,
    outcomeStatuses: ["accepted", "snoozed", "dismissed", "completed"],
    live: true,
  };
  return enrichDecisionCard(base, intel);
}

/**
 * Run one completed transcript through the existing FreedomDesk spine
 * and return a persistable latest-actionable-call artifact.
 */
export function completeCallFromTranscript(
  transcript: MockCallTranscript,
  options: CompleteCallOptions = {}
): LatestActionableCall {
  if (options.resetRegistries !== false) {
    resetPracticeBrainRegistry();
    resetDailyAwarenessForTests();
    resetPracticeMemoryForTests();
    resetPracticeImprovementEngineRegistry();
  }

  const { summary, operationalEvent, analysis } =
    processCallTranscript(transcript);

  const practiceId = summary.practiceId || MOCK_PRACTICE_ID;
  const brain = new PracticeBrain(practiceId);
  brain.refreshAwareness();
  brain.ingestOperationalEvent(operationalEvent);
  brain.runDailyCycle(undefined, { refresh: false });

  const engine = new PracticeImprovementEngine();
  const { arbitration } = engine.processAndArbitrate([operationalEvent], {
    practiceId,
    now: new Date().toISOString(),
    maxSurface: 1,
  });

  const intel = buildCallOperatingIntelligence(
    summary,
    analysis.frontDesk.appointmentType
  );
  const uiSummary = toUiCallSummary(summary, intel);

  const primary = arbitration.primary;
  let decisionCard: TodayDecisionCard | null = primary
    ? toDecisionCard(primary, intel)
    : null;

  // Guaranteed front-desk card when arbitration surfaces nothing (rare quiet path).
  if (!decisionCard) {
    const step = intel.recommendedNextAction || "Review call summary and follow up";
    decisionCard = enrichDecisionCard(
      {
        id: `live_${summary.callId}`,
        kind: "call_follow_up",
        situation: intel.executiveSummary,
        recommendation: step,
        primaryAction: step.length <= 72 ? step : `${step.slice(0, 69).trimEnd()}…`,
        subject: intel.patientName !== "Caller" ? intel.patientName : "",
        stake:
          intel.immediateAttentionReason ||
          "The caller may not receive a timely response",
        whyText: intel.executiveSummary,
        accent: intel.immediateAttention ? "urgent" : "opportunity",
        group: intel.immediateAttention ? "urgent" : "opportunity",
        recommendationId: `live_${summary.callId}`,
        practiceId,
        priority: intel.immediateAttention ? "high" : "medium",
        evidence: [
          { description: intel.executiveSummary },
          ...(intel.suggestedAppointmentType
            ? [
                {
                  description: `Suggested appointment: ${intel.suggestedAppointmentType}`,
                },
              ]
            : []),
        ],
        disposition: "recommend",
        arbitration: "surface",
        arbitrationReason: "Live inbound call — fallback front-desk recommendation",
        rank: 1,
        outcomeStatuses: ["accepted", "snoozed", "dismissed", "completed"],
        live: true,
      },
      intel
    );
  }

  return {
    schema: "latest-actionable-call/v1",
    generatedAt: new Date().toISOString(),
    source: options.source || "twilio_inbound_gather",
    callId: summary.callId,
    practiceId,
    intent: analysis.understanding.intent,
    urgency: analysis.triage.urgency,
    recommendedNextStep: summary.recommendedNextStep,
    decisionCard,
    callSummary: uiSummary,
    operatingIntelligence: intel,
    operationalEventId: (operationalEvent as OperationalEvent).id,
    arbitrationSummary: {
      primaryId: arbitration.primary?.result.recommendation?.id || decisionCard.id,
      surfaced: arbitration.surface.length || 1,
      waiting: arbitration.waiting.length,
    },
  };
}
