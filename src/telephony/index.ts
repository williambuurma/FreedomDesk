/**
 * Telephony adapters — Twilio inbound → existing conversation / practice spine.
 */

export {
  loadPracticeVoiceConfig,
  isAfterHours,
  selectGreeting,
  type PracticeVoiceConfig,
} from "./practiceConfig.ts";

export {
  buildTranscriptFromGather,
  type GatherTranscriptInput,
} from "./transcriptFromGather.ts";

export {
  completeCallFromTranscript,
  type CompleteCallOptions,
  type LatestActionableCall,
  type TodayDecisionCard,
} from "./completedCall.ts";

export {
  mergeTodayWithLatestCall,
  type MyDayPreviewData,
} from "./todayMerge.ts";

export {
  ALY_DEFAULT_SAY_VOICE,
  ALY_PREVIOUS_SAY_VOICE,
  ALY_SAY_LANGUAGE,
  resolveAlySayVoice,
  alySayOptions,
  wrapAlySpeech,
} from "./alyVoice.ts";

export {
  composeMissedInputPrompt,
  composeEmptyHangup,
  composeClosing,
  composePersistFailureClosing,
  DENTAL_SPEECH_HINTS,
} from "./callResponses.ts";

export {
  buildCallOperatingIntelligence,
  type CallOperatingIntelligence,
} from "./operatingIntelligence.ts";

export {
  MAX_FOLLOW_UPS,
  ROUTINE_PAIN_MAX_POST_IDENTITY_ASKS,
  ensureLiveCallSession,
  createOrUpdateSession,
  getCallSession,
  clearCallSession,
  resetCallSessionsForTests,
  sessionToTranscript,
  selectNextAsk,
  appendAlyAsk,
  applyInterruptToSession,
  hasLifeThreateningLanguage,
  isCallActionable,
  isDentalPainCall,
  applyUtteranceToSlots,
  getIdentityState,
  logPolicyDebug,
  type LiveCallSession,
  type NextAsk,
  type IntakeSlots,
} from "./callSession.ts";

export {
  classifyConversationTone,
  type ConversationTone,
} from "./conversationTone.ts";

export {
  parseToothLocationParts,
  isLocationComplete,
  formatLocationForSpeech,
  type ToothLocationParts,
} from "./toothLocation.ts";

export {
  composeToneOpening,
  composeCompassionateClosing,
  composePainFactSummary,
} from "./alySpeech.ts";

export {
  buildPlannerContext,
  buildMissingMaterialFacts,
  isHybridConversationalEnabled,
  parsePlannerProposal,
  planConversationalResponse,
  proposalForField,
  renderPlannerSpeech,
  type PlannerContext,
  type PlannerProposal,
  type PlanConversationalOptions,
} from "./conversationalPlanner.ts";

export {
  validatePlannerProposal,
  type GuardrailResult,
} from "./conversationalGuardrails.ts";

export {
  articulateNextAsk,
  articulateClosing,
  articulateNextAskDetailed,
  setArticulatePlanOptions,
  getArticulatePlanOptions,
} from "./articulateResponse.ts";

export { processCallTranscript } from "../conversation/processCall.ts";
export { analyzeTranscriptTurns } from "../conversation/engine.ts";
