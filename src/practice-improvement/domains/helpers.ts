/**
 * Shared helpers for domain assessment modules.
 */

import type {
  CallCompletedPayload,
  OperationalEvent,
  OperationalEventEvidence,
  UrgencyTier,
} from "../events/types.ts";
import type { OwnerRole } from "../practice-brain/types.ts";

export function isCallPayload(
  payload: OperationalEvent["payload"]
): payload is CallCompletedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "schema" in payload &&
    (payload as CallCompletedPayload).schema === "call_summary/v1"
  );
}

export function nextId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultUncertainty(confidence: number, gaps: string[] = []) {
  return {
    confidence,
    gaps: gaps.length ? gaps : undefined,
    humanReviewNeeded: confidence < 0.7 || gaps.length > 0,
  };
}

export function evidenceFromEvent(event: OperationalEvent): OperationalEventEvidence[] {
  return event.evidence.length
    ? event.evidence
    : [
        {
          source: event.source,
          description: event.eventType.replace(/_/g, " "),
          referenceId: event.id,
          observedAt: event.timestamp,
        },
      ];
}

export function resolveOwner(event: OperationalEvent, fallback: OwnerRole = "front_desk"): OwnerRole {
  return event.routing?.owner || fallback;
}

export function resolveUrgency(event: OperationalEvent): UrgencyTier {
  if (event.routing?.urgencyTier) return event.routing.urgencyTier;
  if (isCallPayload(event.payload)) {
    if (event.payload.sameDayEmergency || event.payload.urgency === "emergency") {
      return "critical";
    }
    if (event.payload.urgency === "urgent" || event.payload.urgency === "priority") {
      return "important";
    }
  }
  if (
    event.eventType === "lab_status_changed" ||
    event.eventType === "schedule_conflict_detected"
  ) {
    return "important";
  }
  return "informational";
}
