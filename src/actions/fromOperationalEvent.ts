/**
 * Materialize an Action from an Operational Event routing hint.
 * V1: Commitment Extractor stub — uses event.routing when present.
 * Authority: docs/ACTION_MODEL.md §5
 */

import type { OperationalEvent, CallCompletedPayload } from "../events/types.ts";
import type { OwnerRole } from "../practice-brain/types.ts";
import type { Action, ActionCategory, InboxStatus } from "./types.ts";
import { ACTION_SCHEMA_VERSION } from "./types.ts";

function isCallPayload(payload: OperationalEvent["payload"]): payload is CallCompletedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "schema" in payload &&
    (payload as CallCompletedPayload).schema === "call_summary/v1"
  );
}

function verbFromNextStep(nextStep: string): string {
  const trimmed = nextStep.trim();
  if (!trimmed) return "Follow up";
  const first = trimmed.split(/[.;]/)[0]?.trim() || trimmed;
  if (first.length <= 72) return first;
  return first.slice(0, 69).trimEnd() + "…";
}

function whatHappenedFromEvent(event: OperationalEvent): string {
  if (event.eventType === "call_completed" && isCallPayload(event.payload)) {
    const p = event.payload;
    const parts: string[] = [];
    if (p.afterHours) parts.push("After-hours");
    if (p.sameDayEmergency) parts.push("same-day emergency");
    else if (p.intent) parts.push(p.intent.replace(/_/g, " "));
    if (p.appointmentType) parts.push(`(${p.appointmentType.replace(/_/g, " ")})`);
    const base = parts.length ? parts.join(" ") + " call" : "Call completed";
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  const labels: Record<string, string> = {
    appointment_cancelled: "Appointment cancelled",
    lab_status_changed: "Lab status changed",
    insurance_verification_needed: "Insurance verification needed",
    schedule_conflict_detected: "Schedule conflict detected",
    boundary_utterance: "Boundary utterance flagged",
  };
  return labels[event.eventType] || event.eventType.replace(/_/g, " ");
}

function categoryFromEvent(event: OperationalEvent): ActionCategory | undefined {
  if (event.eventType === "call_completed" && isCallPayload(event.payload)) {
    if (event.payload.sameDayEmergency || event.payload.urgency === "emergency") {
      return "emergency";
    }
    if (event.payload.intent === "new_patient" || event.payload.intent === "NEW_PATIENT") {
      return "schedule";
    }
    if (event.payload.missingFields?.some((f) => f.includes("insurance"))) {
      return "verification";
    }
    return "follow_up";
  }
  if (event.eventType === "insurance_verification_needed") return "verification";
  if (event.eventType === "lab_status_changed") return "clinical_prep";
  if (event.eventType === "appointment_cancelled") return "schedule";
  if (event.eventType === "schedule_conflict_detected") return "schedule";
  return undefined;
}

function becauseFromEvent(event: OperationalEvent): string {
  const gaps = event.uncertainty.gaps;
  if (event.uncertainty.humanReviewNeeded && gaps?.length) {
    return `Needs review — ${gaps.slice(0, 2).join(", ").replace(/\./g, " ")}`;
  }
  if (isCallPayload(event.payload) && event.payload.sameDayEmergency) {
    return "Same-day emergency flag — delay risks patient harm and trust";
  }
  if (event.routing?.urgencyTier === "critical") {
    return "Critical urgency — act within practice SLA";
  }
  if (event.routing?.urgencyTier === "important") {
    return "Important for today's rhythm — resolve before it becomes rework";
  }
  return "Judgment produced a recommended next step from this event";
}

function ifIgnoredFromEvent(event: OperationalEvent): string {
  if (isCallPayload(event.payload) && event.payload.sameDayEmergency) {
    return "Pain may worsen and the on-call SLA is missed";
  }
  if (event.eventType === "insurance_verification_needed") {
    return "Tomorrow's visit stalls at check-in";
  }
  if (event.eventType === "lab_status_changed") {
    return "The appointment may need to be postponed";
  }
  if (event.eventType === "appointment_cancelled") {
    return "An open chair stays empty";
  }
  if (event.routing?.urgencyTier === "critical") {
    return "A time-sensitive commitment slips";
  }
  return "Rework piles up and someone else has to rediscover this";
}

/**
 * Build a decision headline. Prefer an explicit override from materialize options.
 * Fallback: short verb line — never the event type.
 */
function decisionFromParts(verb: string, subjectDisplayName?: string): string {
  if (!subjectDisplayName) return verb;
  if (verb.toLowerCase().includes(subjectDisplayName.toLowerCase())) return verb;
  return verb;
}

export interface MaterializeActionOptions {
  /** Display name for surface — not stored in aggregate telemetry. */
  subjectDisplayName?: string;
  status?: InboxStatus;
  because?: string;
  whatHappened?: string;
  /** Decision-first headline override. */
  decision?: string;
  /** Cost of inaction override. */
  ifIgnored?: string;
  verb?: string;
  object?: string;
  primaryResponsibility?: OwnerRole;
}

/**
 * Convert an Operational Event into an Action when routing hints are present.
 * Returns null when there is nothing actionable (Ignore path).
 */
export function materializeActionFromEvent(
  event: OperationalEvent,
  options: MaterializeActionOptions = {}
): Action | null {
  const nextStep = event.routing?.recommendedNextStep?.trim();
  if (!nextStep) return null;

  const owner = options.primaryResponsibility || event.routing?.owner || "front_desk";
  const urgencyTier = event.routing?.urgencyTier || "informational";
  const status = options.status || "needs_action";
  const verb = options.verb || verbFromNextStep(nextStep);
  const decision =
    options.decision || decisionFromParts(verb, options.subjectDisplayName);

  return {
    $schema: ACTION_SCHEMA_VERSION,
    id: `act_${event.id.replace(/^evt_/, "")}`,
    practiceId: event.practiceId,
    verb,
    object: options.object || event.subject?.patientReferenceId || event.subject?.callId || event.id,
    because: options.because || becauseFromEvent(event),
    decision,
    ifIgnored: options.ifIgnored || ifIgnoredFromEvent(event),
    whatHappened: options.whatHappened || whatHappenedFromEvent(event),
    subjectDisplayName: options.subjectDisplayName,
    primaryResponsibility: owner,
    urgencyTier,
    recommendedNextStep: nextStep,
    evidence: event.evidence,
    confidence: event.uncertainty.confidence,
    uncertainty: event.uncertainty,
    status,
    lifecycleStatus: status === "completed" || status === "dismissed" ? status : "active",
    sourceEventIds: [event.id],
    createdAt: event.timestamp,
    category: categoryFromEvent(event),
    appointmentType: isCallPayload(event.payload) ? event.payload.appointmentType : undefined,
  };
}
