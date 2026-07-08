/**
 * Conversation Summary — structured staff handoff per CALL_FLOWS.md.
 */

import { assessFrontDesk, insuranceProgramLabel } from "./frontDesk.ts";
import type { PsychologyAnalysis } from "./psychology.ts";
import type { ReasoningFact, StageReasoning } from "./reasoning/types.ts";
import type { ConversationState } from "./state.ts";
import type {
  CallSummary,
  FrontDeskAssessment,
  MockCallTranscript,
  PatientUnderstanding,
  UrgencyAssessment,
} from "./types.ts";

export interface SummaryResult {
  output: CallSummary;
  reasoning: StageReasoning<
    {
      humanReviewNeeded: boolean;
      overallConfidence: number;
      actionItemCount: number;
    },
    Pick<
      CallSummary,
      "intent" | "urgency" | "humanReviewNeeded" | "missingInformation"
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

function formatPhoneDisplay(e164: string | null): string {
  if (!e164) return "unknown";
  const digits = e164.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return e164;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function intentLabel(intent: string): string {
  const labels: Record<string, string> = {
    NEW_PATIENT: "New Patient",
    EMERGENCY: "Emergency",
    SCHEDULE_EXISTING: "Schedule Existing",
    TREATMENT_SCHEDULE: "Treatment Schedule",
  };
  return labels[intent] ?? intent.replace(/_/g, " ");
}

function buildCommLogNote(input: {
  understanding: PatientUnderstanding;
  urgency: UrgencyAssessment;
  frontDesk: FrontDeskAssessment;
  afterHours: boolean;
  intent: string;
}): string {
  const { understanding, urgency, frontDesk, afterHours, intent } = input;
  const lines: string[] = [];

  lines.push(`FreedomDesk ${intentLabel(intent)} call${afterHours ? " (after hours)" : ""}.`);

  if (understanding.callerName) {
    lines.push(`Caller: ${understanding.callerName}${understanding.phone ? `, ${formatPhoneDisplay(understanding.phone)}` : ""}.`);
  }

  if (understanding.chiefConcern) {
    lines.push(`Chief concern: ${understanding.chiefConcern}.`);
  }

  if (understanding.symptoms.length > 0) {
    const flags = [];
    if (understanding.symptomDetails.swelling) flags.push("swelling");
    if (understanding.symptomDetails.fever) flags.push("fever");
    if (understanding.symptomDetails.trauma) flags.push("trauma");
    const flagText = flags.length ? ` Red flags: ${flags.join(", ")}.` : " No fever or facial swelling reported.";
    lines.push(`Symptoms: ${understanding.symptoms.join(", ")}.${flagText}`);
  }

  if (understanding.insuranceCarrier) {
    lines.push(
      `Insurance noted: ${understanding.insuranceCarrier} (${insuranceProgramLabel(understanding.insuranceProgram)}). Benefits not verified on call.`
    );
  }

  lines.push(`Urgency: ${urgency.urgency}${urgency.sameDayEmergency ? " — same-day flag" : ""}.`);
  lines.push(`Next step: ${frontDesk.recommendedNextStep}.`);

  if (frontDesk.missingFields.length > 0) {
    lines.push(`Missing: ${frontDesk.missingFields.join(", ")}.`);
  }

  return lines.join(" ");
}

function buildActionItems(
  understanding: PatientUnderstanding,
  urgency: UrgencyAssessment,
  frontDesk: FrontDeskAssessment
): CallSummary["actionItems"] {
  const items: CallSummary["actionItems"] = [];

  if (urgency.routingAction === "on_call_callback") {
    items.push({
      type: "on_call_callback",
      assignee: "on_call_dentist",
      priority: urgency.urgency,
      notes:
        understanding.chiefConcern ??
        `Urgent ${understanding.symptoms.join(", ")} — callback per after-hours protocol`,
    });
  } else if (urgency.urgency === "emergency") {
    items.push({
      type: "on_call_callback",
      assignee: "on_call_dentist",
      priority: "emergency",
      notes: "Emergency triage — immediate escalation",
    });
  }

  if (understanding.intent === "NEW_PATIENT") {
    items.push({
      type: "schedule_appointment",
      assignee: "front_desk",
      priority: "routine",
      notes: "Confirm new patient exam request in PMS",
    });
  }

  if (frontDesk.missingFields.includes("insurance.program")) {
    items.push({
      type: "general_callback",
      assignee: "front_desk",
      priority: "routine",
      notes: "Clarify Delta PPO vs Medicaid program before visit",
    });
  }

  return items;
}

function computeConfidence(
  understanding: PatientUnderstanding,
  urgency: UrgencyAssessment,
  frontDesk: FrontDeskAssessment,
  psychology: PsychologyAnalysis
): CallSummary["confidence"] {
  const notes: string[] = [];
  const scores = Object.values(understanding.perFieldConfidence).filter((v) => v > 0);
  let overall =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0.5;

  overall = Math.min(overall, urgency.confidence);

  if (understanding.insuranceProgram === "unknown" && understanding.insuranceCarrier) {
    notes.push("Delta program not disambiguated (PPO vs Medicaid) — verify before acceptance language");
    overall -= 0.1;
  }
  if (frontDesk.missingFields.length > 0) {
    notes.push(`Missing fields: ${frontDesk.missingFields.join(", ")}`);
    overall -= 0.05 * frontDesk.missingFields.length;
  }
  if (psychology.confidence > 0 && psychology.emotion === "pain") {
    notes.push("Caller pain distress noted — triage prioritized over admin questions");
  }
  if (urgency.matchedRules.length > 0) {
    notes.push(`Triage rules: ${urgency.matchedRules.join(", ")}`);
  }

  overall = Math.max(0.35, Math.min(0.98, overall));

  const humanReviewNeeded =
    urgency.urgency === "emergency" ||
    urgency.urgency === "urgent" ||
    frontDesk.missingFields.length > 0 ||
    understanding.insuranceProgram === "unknown";

  return {
    overall: Math.round(overall * 100) / 100,
    notes,
    humanReviewNeeded,
  };
}

export function buildCallSummaryWithReasoning(input: {
  transcript: MockCallTranscript;
  understanding: PatientUnderstanding;
  urgency: UrgencyAssessment;
  frontDesk: FrontDeskAssessment;
  psychology: PsychologyAnalysis;
}): SummaryResult {
  const summary = buildCallSummary(input);
  const { understanding, urgency, frontDesk, psychology } = input;

  const rulesFired: { ruleId: string; description: string }[] = [];

  if (urgency.routingAction === "on_call_callback") {
    rulesFired.push({
      ruleId: "SUM_ACTION_ON_CALL",
      description: "Urgent routing — on-call callback action item",
    });
  } else if (urgency.urgency === "emergency") {
    rulesFired.push({
      ruleId: "SUM_ACTION_EMERGENCY",
      description: "Emergency urgency — escalation action item",
    });
  }
  if (understanding.intent === "NEW_PATIENT") {
    rulesFired.push({
      ruleId: "SUM_ACTION_NEW_PATIENT",
      description: "New patient — schedule appointment action item",
    });
  }
  if (frontDesk.missingFields.includes("insurance.program")) {
    rulesFired.push({
      ruleId: "SUM_ACTION_INSURANCE_CALLBACK",
      description: "Insurance program ambiguous — clarification callback",
    });
  }
  if (summary.humanReviewNeeded) {
    rulesFired.push({
      ruleId: "SUM_HUMAN_REVIEW",
      description: "Human review flagged by confidence rules",
    });
  }

  return {
    output: summary,
    reasoning: {
      stage: "Summary",
      inputs: {
        callId: input.transcript.id,
        afterHours: input.transcript.afterHours,
        intent: understanding.intent,
        urgency: urgency.urgency,
      },
      facts: [
        fact("FACT_UPSTREAM_INTENT", "Intent from Understanding", understanding.intent, "understanding"),
        fact("FACT_UPSTREAM_URGENCY", "Urgency from Triage", urgency.urgency, "triage"),
        fact("FACT_MISSING_FIELDS", "Missing fields from Front Desk", frontDesk.missingFields, "frontDesk"),
        fact("FACT_PSYCHOLOGY_EMOTION", "Caller emotion", psychology.emotion, "psychology"),
        fact("FACT_CONFIDENCE_NOTES", "Confidence adjustment notes", summary.confidence.notes, "computeConfidence"),
      ],
      rulesFired,
      decision: {
        humanReviewNeeded: summary.humanReviewNeeded,
        overallConfidence: summary.confidence.overall,
        actionItemCount: summary.actionItems.length,
      },
      confidence: summary.confidence.overall,
      rationale: summary.confidence.notes,
      output: {
        intent: summary.intent,
        urgency: summary.urgency,
        humanReviewNeeded: summary.humanReviewNeeded,
        missingInformation: summary.missingInformation,
      },
    },
  };
}

export function buildCallSummary(input: {
  transcript: MockCallTranscript;
  understanding: PatientUnderstanding;
  urgency: UrgencyAssessment;
  frontDesk: FrontDeskAssessment;
  psychology: PsychologyAnalysis;
}): CallSummary {
  const { transcript, understanding, urgency, frontDesk, psychology } = input;
  const confidence = computeConfidence(understanding, urgency, frontDesk, psychology);
  const timestamp = transcript.receivedAt ?? new Date().toISOString();

  const summary: CallSummary = {
    $schema: "https://freedomdesk.com/schemas/call-summary/v1",
    id: `summary_${transcript.id}`,
    practiceId: transcript.practiceId,
    callId: transcript.id,
    timestamp,
    durationSeconds: transcript.durationSeconds ?? null,
    afterHours: transcript.afterHours,
    intent: understanding.intent,
    urgency: urgency.urgency,
    sameDayEmergency: urgency.sameDayEmergency,
    caller: {
      name: understanding.callerName,
      phone: understanding.phone,
      isNewPatient: understanding.isNewPatient,
      dateOfBirth: understanding.dateOfBirth,
    },
    chiefConcern: understanding.chiefConcern,
    missingInformation: frontDesk.missingFields,
    recommendedNextStep: frontDesk.recommendedNextStep,
    humanReviewNeeded: confidence.humanReviewNeeded,
    confidence,
    openDentalCommLogNote: buildCommLogNote({
      understanding,
      urgency,
      frontDesk,
      afterHours: transcript.afterHours,
      intent: understanding.intent,
    }),
    actionItems: buildActionItems(understanding, urgency, frontDesk),
  };

  if (understanding.insuranceCarrier || understanding.insuranceProgram !== "unknown") {
    summary.insurance = {
      carrier: understanding.insuranceCarrier,
      program: understanding.insuranceProgram,
      memberId: null,
    };
  }

  if (understanding.symptoms.length > 0 || understanding.intent === "EMERGENCY") {
    summary.emergency = {
      symptoms: understanding.symptoms,
      swelling: understanding.symptomDetails.swelling ?? false,
      fever: understanding.symptomDetails.fever ?? false,
      trauma: understanding.symptomDetails.trauma ?? false,
      painLevel: understanding.symptomDetails.painLevel ?? null,
      duration: understanding.symptomDetails.duration ?? null,
      routingAction: urgency.routingAction,
    };
  }

  return summary;
}

/** Merge assessments into conversation state for orchestrator consumers. */
export function applyAnalysisToState(
  state: ConversationState,
  understanding: PatientUnderstanding,
  urgency: UrgencyAssessment,
  frontDesk: FrontDeskAssessment,
  psychology: PsychologyAnalysis
): ConversationState {
  const emotionMap: Record<string, ConversationState["emotion"]> = {
    anxious: "anxious",
    dental_anxiety: "anxious",
    pain: "pain",
    frustrated: "frustrated",
    embarrassed: "anxious",
    confused: "anxious",
    unknown: "unknown",
  };

  return {
    ...state,
    intent: understanding.intent,
    urgency: urgency.urgency,
    sameDayEmergency: urgency.sameDayEmergency,
    emotion: emotionMap[psychology.emotion] ?? "unknown",
    callerName: understanding.callerName,
    phone: understanding.phone,
    dateOfBirth: understanding.dateOfBirth,
    isNewPatient: understanding.isNewPatient,
    chiefConcern: understanding.chiefConcern,
    insuranceCarrier: understanding.insuranceCarrier,
    insuranceProgram: understanding.insuranceProgram,
    symptoms: understanding.symptoms,
    missingFields: frontDesk.missingFields,
    appointmentType: frontDesk.appointmentType,
    recommendedNextStep: frontDesk.recommendedNextStep,
    humanReviewNeeded: frontDesk.missingFields.length > 0 || urgency.urgency !== "routine",
    confidenceNotes: urgency.reasons,
    overallConfidence: understanding.intentConfidence,
  };
}
