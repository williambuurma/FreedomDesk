/**
 * Conversation intelligence — public API.
 */

export { processCallTranscript } from "./processCall.ts";
export {
  analyzeConversation,
  analyzeTranscriptTurns,
  determineNextGoal,
  type ConversationAnalysis,
  type ConversationGoal,
  type EngineDecision,
} from "./engine.ts";
export { buildCallSummary } from "./summary.ts";
export { toCallSummarySignal } from "./signal.ts";
export { understandTranscript, understandPatientMessage } from "./understanding.ts";
export { assessUrgency } from "./triage.ts";
export { assessEmotion } from "./psychology.ts";

export type {
  CallSummary,
  MockCallTranscript,
  ProcessCallResult,
  TranscriptTurn,
  CallIntent,
  UrgencyLevel,
} from "./types.ts";
