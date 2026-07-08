/**
 * Adapter — Conversation Summary → Practice Brain CallSummarySignal.
 */

import type { CallSummarySignal } from "../practice-brain/types.ts";
import type { CallSummary } from "./types.ts";

function intentToSignalIntent(intent: CallSummary["intent"]): string {
  const map: Record<string, string> = {
    NEW_PATIENT: "new_patient",
    EMERGENCY: "emergency",
    SCHEDULE_EXISTING: "hygiene_recall",
    TREATMENT_SCHEDULE: "treatment_scheduling",
    RESCHEDULE: "cancel_reschedule",
    CANCEL: "cancel_reschedule",
    CONFIRM: "confirm",
    INSURANCE: "insurance_question",
    BILLING: "billing",
    GENERAL_INFO: "general_info",
    OTHER: "other",
  };
  return map[intent] ?? "other";
}

function emotionalFlags(summary: CallSummary): string[] | undefined {
  const flags: string[] = [];
  if (summary.urgency === "urgent" || summary.urgency === "emergency") {
    flags.push("painDistress");
  }
  if (summary.intent === "NEW_PATIENT") {
    flags.push("highAnxiety");
  }
  if (summary.confidence.notes.some((n) => n.includes("frustrat"))) {
    flags.push("frustrated");
  }
  return flags.length > 0 ? flags : undefined;
}

function completenessScore(summary: CallSummary): number {
  const required = ["caller.name", "caller.phone"];
  if (summary.intent === "EMERGENCY") {
    required.push("emergency.symptoms");
  }
  if (summary.intent === "NEW_PATIENT") {
    required.push("caller.dateOfBirth", "chiefComplaint");
  }

  let present = 0;
  if (summary.caller.name) present++;
  if (summary.caller.phone) present++;
  if (summary.chiefConcern) present++;
  if (summary.caller.dateOfBirth) present++;
  if (summary.emergency?.symptoms.length) present++;

  const base = present / Math.max(required.length, 1);
  const penalty = summary.missingInformation.length * 0.05;
  return Math.max(0.4, Math.min(1, base - penalty));
}

export function toCallSummarySignal(summary: CallSummary): CallSummarySignal {
  return {
    callId: summary.callId,
    practiceId: summary.practiceId,
    intent: intentToSignalIntent(summary.intent),
    urgency: summary.urgency === "priority" ? "routine" : summary.urgency,
    receivedAt: summary.timestamp,
    afterHours: summary.afterHours,
    sameDayEmergency: summary.sameDayEmergency,
    appointmentType: summary.emergency
      ? "emergency_eval"
      : summary.intent === "NEW_PATIENT"
        ? "new_patient_exam"
        : undefined,
    insuranceProgram: summary.insurance?.program,
    emotionalFlags: emotionalFlags(summary),
    completenessScore: completenessScore(summary),
    missingFields: summary.missingInformation,
    patientReferenceId: summary.caller.name
      ? `pat_ref_${summary.caller.name.toLowerCase().replace(/\s+/g, "_")}`
      : undefined,
  };
}
