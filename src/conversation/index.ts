/**
 * Conversation intelligence — public API.
 */

export { processCallTranscript } from "./processCall.ts";
export {
  loadJudgmentScenarios,
  validateJudgmentScenario,
  formatScenarioFailures,
} from "./judgment/index.ts";
export {
  analyzeConversation,
  analyzeTranscriptTurns,
  determineNextGoal,
  type ConversationAnalysis,
  type ConversationGoal,
  type EngineDecision,
} from "./engine.ts";
export { buildCallSummary, buildCallSummaryWithReasoning } from "./summary.ts";
export { toCallSummarySignal, toCallSummarySignalWithReasoning } from "./signal.ts";
export { understandTranscript, understandTranscriptWithReasoning, understandPatientMessage } from "./understanding.ts";
export { assessUrgency, assessUrgencyWithReasoning } from "./triage.ts";
export { assessEmotion, assessEmotionWithReasoning } from "./psychology.ts";
export { assessFrontDesk, assessFrontDeskWithReasoning } from "./frontDesk.ts";
export {
  type ReasoningTrace,
  type StageReasoning,
  type ReasoningFact,
  type ReasoningRuleFire,
  formatReasoningTrace,
  formatStageReasoning,
  assembleReasoningTrace,
} from "./reasoning/index.ts";

export type {
  CallSummary,
  MockCallTranscript,
  ProcessCallResult,
  TranscriptTurn,
  CallIntent,
  UrgencyLevel,
} from "./types.ts";
