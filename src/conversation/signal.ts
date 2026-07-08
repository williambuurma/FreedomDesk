/**
 * Adapter — Conversation Summary → Practice Brain CallSummarySignal.
 */

import type { ReasoningFact, StageReasoning } from "./reasoning/types.ts";
import type { CallSummarySignal } from "../practice-brain/types.ts";
import type { CallSummary } from "./types.ts";

export interface PracticeBrainSignalResult {
  output: CallSummarySignal;
  reasoning: StageReasoning<
    {
      intent: string;
      urgency: string;
      completenessScore: number;
    },
    Pick<
      CallSummarySignal,
      "intent" | "urgency" | "afterHours" | "sameDayEmergency" | "completenessScore"
    >
  >;
}

function fact(
  id: string,
  description: string,
  value: unknown,
  source: string
): ReasoningFact {
  return { id, description, value, source };
}

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

export function toCallSummarySignalWithReasoning(
  summary: CallSummary
): PracticeBrainSignalResult {
  const output = toCallSummarySignal(summary);
  const rulesFired: { ruleId: string; description: string }[] = [
    {
      ruleId: `PB_INTENT_MAP_${summary.intent}`,
      description: `Map call intent ${summary.intent} → signal intent ${output.intent}`,
    },
    {
      ruleId: "PB_COMPLETENESS",
      description: "Compute completeness score from required fields and missing info",
    },
  ];

  if (output.emotionalFlags?.length) {
    rulesFired.push({
      ruleId: "PB_EMOTIONAL_FLAGS",
      description: `Derive emotional flags: ${output.emotionalFlags.join(", ")}`,
    });
  }
  if (summary.urgency === "priority") {
    rulesFired.push({
      ruleId: "PB_URGENCY_PRIORITY_MAP",
      description: "Map priority urgency → routine for signal contract",
    });
  }

  const rationale: string[] = [
    `Signal intent ${output.intent} from summary intent ${summary.intent}`,
    `Completeness ${output.completenessScore} (${summary.missingInformation.length} missing field penalty)`,
  ];
  if (output.emotionalFlags?.length) {
    rationale.push(`Emotional flags: ${output.emotionalFlags.join(", ")}`);
  }

  return {
    output,
    reasoning: {
      stage: "PracticeBrain",
      inputs: {
        callId: summary.callId,
        summaryIntent: summary.intent,
        summaryUrgency: summary.urgency,
        missingFieldCount: summary.missingInformation.length,
      },
      facts: [
        fact("FACT_SUMMARY_INTENT", "Source summary intent", summary.intent, "callSummary"),
        fact("FACT_SUMMARY_URGENCY", "Source summary urgency", summary.urgency, "callSummary"),
        fact("FACT_MISSING_COUNT", "Missing information count", summary.missingInformation.length, "callSummary"),
        fact("FACT_SIGNAL_INTENT", "Mapped signal intent", output.intent, "intentToSignalIntent"),
        fact("FACT_COMPLETENESS", "Completeness score", output.completenessScore, "completenessScore"),
        fact("FACT_EMOTIONAL_FLAGS", "Emotional flags", output.emotionalFlags ?? [], "emotionalFlags"),
      ],
      rulesFired,
      decision: {
        intent: output.intent,
        urgency: output.urgency,
        completenessScore: output.completenessScore,
      },
      confidence: output.completenessScore,
      rationale,
      output: {
        intent: output.intent,
        urgency: output.urgency,
        afterHours: output.afterHours,
        sameDayEmergency: output.sameDayEmergency,
        completenessScore: output.completenessScore,
      },
    },
  };
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
