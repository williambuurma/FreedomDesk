/**
 * Normalize operational events into practice-brain ingest shapes (V1 adapters).
 */

import type { CallSummarySignal } from "../practice-brain/types.ts";
import type { CallCompletedPayload, OperationalEvent } from "./types.ts";

function isCallCompletedPayload(
  payload: OperationalEvent["payload"]
): payload is CallCompletedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "schema" in payload &&
    payload.schema === "call_summary/v1"
  );
}

/**
 * Extract CallSummarySignal from a call_completed event for awareness ingest.
 * Returns null for unsupported event types (future: lab, schedule, etc.).
 */
export function operationalEventToCallSummarySignal(
  event: OperationalEvent
): CallSummarySignal | null {
  if (event.eventType !== "call_completed" || !isCallCompletedPayload(event.payload)) {
    return null;
  }

  const payload = event.payload;

  return {
    callId: event.subject?.callId ?? event.id.replace(/^evt_/, ""),
    practiceId: event.practiceId,
    intent: payload.intent,
    urgency:
      payload.urgency === "routine" ||
      payload.urgency === "urgent" ||
      payload.urgency === "emergency"
        ? payload.urgency
        : undefined,
    receivedAt: event.timestamp,
    afterHours: payload.afterHours,
    sameDayEmergency: payload.sameDayEmergency,
    appointmentType: payload.appointmentType,
    insuranceProgram: payload.insuranceProgram,
    emotionalFlags: payload.emotionalFlags,
    completenessScore: payload.completenessScore,
    missingFields: payload.missingFields,
    patientReferenceId: event.subject?.patientReferenceId,
  };
}
