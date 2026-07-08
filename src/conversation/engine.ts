/**
 * Conversation reasoning orchestrator.
 *
 * Brains do not call each other directly — this module runs the pipeline and
 * merges their outputs. See docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md.
 */

import { ConversationState } from "./state";
import {
  PatientUnderstanding,
  understandPatientMessage,
} from "./understanding";

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
// Brain output types (extend as each brain is implemented)
// ---------------------------------------------------------------------------

/**
 * Psychology Brain — emotional state and tone recommendations.
 * TODO: Wire assessEmotion() from psychology.ts.
 */
export interface PsychologyAnalysis {}

/**
 * Clinical/Triage Brain — urgency, red flags, escalation path.
 * TODO: Wire assessUrgency() from triage.ts.
 */
export interface TriageAnalysis {}

/**
 * Front Desk Brain — missing admin fields, scheduling goal, transfer needs.
 * TODO: Wire getMissingFields() and scheduling helpers here or in a dedicated module.
 */
export interface FrontDeskAnalysis {}

/**
 * Summary Brain — structured staff handoff per docs/CALL_FLOWS.md.
 * TODO: Wire buildCallSummary() from summary.ts.
 */
export interface SummaryAnalysis {}

// ---------------------------------------------------------------------------
// Conversation analysis (single object per patient message)
// ---------------------------------------------------------------------------

/**
 * Everything FreedomDesk knows after processing one patient message.
 * Each field is populated by its corresponding brain in analyzeConversation().
 */
export interface ConversationAnalysis {
  understanding: PatientUnderstanding;
  psychology: PsychologyAnalysis;
  triage: TriageAnalysis;
  frontDesk: FrontDeskAnalysis;
  summary: SummaryAnalysis;
}

/**
 * Run one patient message through the conversation reasoning pipeline.
 *
 * Pipeline (see docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md):
 *   1. Understanding Brain  — understandPatientMessage()
 *   2. Psychology Brain     — assessEmotion()          [not yet wired]
 *   3. Clinical/Triage Brain — assessUrgency()         [not yet wired]
 *   4. Front Desk Brain     — missing fields, scheduling [not yet wired]
 *   5. Summary Brain        — buildCallSummary()       [not yet wired]
 *
 * Future: accept ConversationState + practiceConfig, merge understanding
 * into state, and pass enriched state to downstream brains. determineNextGoal()
 * will consume the full ConversationAnalysis to choose the next question.
 */
export function analyzeConversation(
  message: string
): ConversationAnalysis {
  const understanding = understandPatientMessage(message);

  // TODO: Psychology Brain — assessEmotion(message, state) via psychology.ts
  const psychology: PsychologyAnalysis = {};

  // TODO: Clinical/Triage Brain — assessUrgency(understanding, state) via triage.ts
  const triage: TriageAnalysis = {};

  // TODO: Front Desk Brain — getMissingFields(state, intent, practiceConfig)
  const frontDesk: FrontDeskAnalysis = {};

  // TODO: Summary Brain — buildCallSummary(state) via summary.ts
  const summary: SummaryAnalysis = {};

  return {
    understanding,
    psychology,
    triage,
    frontDesk,
    summary,
  };
}
