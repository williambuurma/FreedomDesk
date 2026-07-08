/**
 * Conversation reasoning orchestrator.
 *
 * Brains do not call each other directly — this module runs the pipeline and
 * merges their outputs. See docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md.
 */

import { assessFrontDeskWithReasoning, type FrontDeskAssessment } from "./frontDesk.ts";
import { assessEmotionWithReasoning, type PsychologyAnalysis } from "./psychology.ts";
import type { ConversationState } from "./state.ts";
import type { CallSummary } from "./types.ts";
import { assessUrgencyWithReasoning } from "./triage.ts";
import {
  understandTranscriptWithReasoning,
} from "./understanding.ts";
import type { PatientUnderstanding } from "./types.ts";
import type { UrgencyAssessment, TranscriptTurn } from "./types.ts";
import type { ReasoningTrace } from "./reasoning/types.ts";
import { assembleReasoningTrace } from "./reasoning/assembleTrace.ts";

// ---------------------------------------------------------------------------
// Goal selection — stub precedence; full spec in FREEDOMDESK_BRAIN_ARCHITECTURE.md §20
// ---------------------------------------------------------------------------

export type ConversationGoal =
  | "reassure_patient"
  | "answer_question"
  | "gather_information"
  | "schedule_appointment"
  | "transfer_to_office"
  | "escalate_urgent_case"
  | "complete_call";

export interface EngineDecision {
  goal: ConversationGoal;
  reason: string;
}

export function determineNextGoal(
  state: ConversationState
): EngineDecision {
  if (state.urgency === "emergency") {
    return {
      goal: "escalate_urgent_case",
      reason: "Medical emergency detected.",
    };
  }

  if (state.urgency === "urgent") {
    return {
      goal: "escalate_urgent_case",
      reason: "Urgent clinical situation requires escalation.",
    };
  }

  if (state.emotion === "anxious" || state.emotion === "pain") {
    return {
      goal: "reassure_patient",
      reason: "Patient needs reassurance before continuing.",
    };
  }

  if (state.missingFields.length > 0) {
    return {
      goal: "gather_information",
      reason: "Conversation is missing required information.",
    };
  }

  return {
    goal: "schedule_appointment",
    reason: "Enough information has been collected.",
  };
}

// ---------------------------------------------------------------------------
// Brain output types
// ---------------------------------------------------------------------------

export type TriageAnalysis = UrgencyAssessment;
export type SummaryAnalysis = CallSummary | Record<string, never>;

export interface ConversationAnalysis {
  understanding: PatientUnderstanding;
  psychology: PsychologyAnalysis;
  triage: TriageAnalysis;
  frontDesk: FrontDeskAssessment;
  summary: SummaryAnalysis;
  reasoning?: ReasoningTrace;
}

/**
 * Run one patient message through the conversation reasoning pipeline.
 */
export function analyzeConversation(
  message: string,
  options?: { afterHours?: boolean; intent?: PatientUnderstanding["intent"] }
): ConversationAnalysis {
  const understandingResult = understandTranscriptWithReasoning([
    { speaker: "patient", text: message },
  ]);
  const understanding = understandingResult.output;

  const psychologyResult = assessEmotionWithReasoning(message);
  const psychology = psychologyResult.output;

  const triageResult = assessUrgencyWithReasoning(understanding, understanding.intent);
  const triage = triageResult.output;

  const frontDeskResult = assessFrontDeskWithReasoning(
    understanding,
    triage,
    understanding.intent,
    options?.afterHours ?? false
  );
  const frontDesk = frontDeskResult.output;

  const reasoning = assembleReasoningTrace({
    understanding: understandingResult,
    psychology: psychologyResult,
    triage: triageResult,
    frontDesk: frontDeskResult,
  });

  return {
    understanding,
    psychology,
    triage,
    frontDesk,
    summary: {},
    reasoning,
  };
}

/**
 * Analyze a multi-turn transcript slice (all patient turns merged for psychology).
 */
export function analyzeTranscriptTurns(
  turns: TranscriptTurn[],
  afterHours = false
): ConversationAnalysis {
  const understandingResult = understandTranscriptWithReasoning(turns);
  const understanding = understandingResult.output;

  const patientText = turns
    .filter((t) => t.speaker === "patient" || t.speaker === "caller")
    .map((t) => t.text)
    .join(" ");

  const psychologyResult = assessEmotionWithReasoning(patientText);
  const psychology = psychologyResult.output;

  const triageResult = assessUrgencyWithReasoning(understanding, understanding.intent);
  const triage = triageResult.output;

  const frontDeskResult = assessFrontDeskWithReasoning(
    understanding,
    triage,
    understanding.intent,
    afterHours
  );
  const frontDesk = frontDeskResult.output;

  const reasoning = assembleReasoningTrace({
    understanding: understandingResult,
    psychology: psychologyResult,
    triage: triageResult,
    frontDesk: frontDeskResult,
  });

  return {
    understanding,
    psychology,
    triage,
    frontDesk,
    summary: {},
    reasoning,
  };
}

export type { PsychologyAnalysis, FrontDeskAssessment, PatientUnderstanding };
