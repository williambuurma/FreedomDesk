/**
 * Express artifact → operational event (Persist + Coordinate boundary).
 */

import type { CallSummary } from "../conversation/types.ts";
import type { OwnerRole } from "../practice-brain/types.ts";
import { toCallSummarySignal } from "../conversation/signal.ts";
import type {
  CallCompletedPayload,
  OperationalEvent,
  OperationalEventEvidence,
  UrgencyTier,
} from "./types.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "./types.ts";

function evidence(
  source: string,
  description: string,
  referenceId: string,
  provenance: string,
  observedAt: string
): OperationalEventEvidence {
  return { source, description, referenceId, provenance, observedAt };
}

function urgencyToTier(urgency: CallSummary["urgency"]): UrgencyTier {
  if (urgency === "emergency" || urgency === "urgent") return "critical";
  if (urgency === "priority") return "important";
  return "informational";
}

function assigneeToOwner(assignee: string): OwnerRole | undefined {
  const map: Record<string, OwnerRole> = {
    front_desk: "front_desk",
    on_call_dentist: "dentist",
    office_manager: "office_manager",
    assistant: "assistant",
    hygiene_coordinator: "hygiene_coordinator",
  };
  return map[assignee];
}

function buildEvidence(summary: CallSummary, signal: ReturnType<typeof toCallSummarySignal>): OperationalEventEvidence[] {
  const ref = summary.id;
  const at = summary.timestamp;
  const items: OperationalEventEvidence[] = [
    evidence("call_summary", "Call intent", ref, "callSummary.intent", at),
    evidence("call_summary", "Urgency ladder", ref, "callSummary.urgency", at),
    evidence("call_summary", "After-hours flag", ref, "callSummary.afterHours", at),
  ];

  if (summary.caller.name) {
    items.push(
      evidence("caller_stated", "Caller name collected", ref, "callSummary.caller.name", at)
    );
  }
  if (summary.insurance?.program) {
    items.push(
      evidence(
        "caller_stated",
        "Insurance program classification",
        ref,
        "callSummary.insurance.program",
        at
      )
    );
  }
  if (summary.emergency?.symptoms.length) {
    items.push(
      evidence(
        "caller_stated",
        "Emergency symptoms documented",
        ref,
        "callSummary.emergency.symptoms",
        at
      )
    );
  }
  if (signal.emotionalFlags?.length) {
    items.push(
      evidence(
        "inferred",
        `Emotional flags: ${signal.emotionalFlags.join(", ")}`,
        ref,
        "signal.emotionalFlags",
        at
      )
    );
  }
  if (summary.missingInformation.length) {
    items.push(
      evidence(
        "call_summary",
        `${summary.missingInformation.length} missing field(s)`,
        ref,
        "callSummary.missingInformation",
        at
      )
    );
  }

  return items;
}

function buildPayload(
  summary: CallSummary,
  signal: ReturnType<typeof toCallSummarySignal>
): CallCompletedPayload {
  return {
    schema: "call_summary/v1",
    summaryId: summary.id,
    intent: signal.intent,
    urgency: signal.urgency ?? summary.urgency,
    afterHours: summary.afterHours,
    sameDayEmergency: summary.sameDayEmergency,
    appointmentType: signal.appointmentType,
    insuranceProgram: signal.insuranceProgram,
    emotionalFlags: signal.emotionalFlags,
    completenessScore: signal.completenessScore,
    missingFields: signal.missingFields,
  };
}

/**
 * Convert a completed call summary into a practice-time operational event.
 */
export function callSummaryToOperationalEvent(summary: CallSummary): OperationalEvent {
  const signal = toCallSummarySignal(summary);
  const primaryAction = summary.actionItems[0];

  return {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: `evt_${summary.callId}`,
    practiceId: summary.practiceId,
    source: "call",
    timestamp: summary.timestamp,
    eventType: "call_completed",
    subject: {
      callId: summary.callId,
      patientReferenceId: signal.patientReferenceId,
    },
    evidence: buildEvidence(summary, signal),
    uncertainty: {
      confidence: summary.confidence.overall,
      humanReviewNeeded: summary.humanReviewNeeded,
      gaps: summary.missingInformation.length ? summary.missingInformation : undefined,
      class: summary.humanReviewNeeded ? "unverified" : undefined,
    },
    routing: {
      owner: primaryAction ? assigneeToOwner(primaryAction.assignee) : "front_desk",
      responsibilityTags: ["reception"],
      urgencyTier: urgencyToTier(summary.urgency),
      recommendedNextStep: summary.recommendedNextStep,
    },
    payload: buildPayload(summary, signal),
  };
}
