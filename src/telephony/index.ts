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
  createOrUpdateSession,
  getCallSession,
  clearCallSession,
  resetCallSessionsForTests,
  sessionToTranscript,
  selectNextAsk,
  appendAlyAsk,
  hasLifeThreateningLanguage,
  isCallActionable,
  isDentalPainCall,
  applyUtteranceToSlots,
  type LiveCallSession,
  type NextAsk,
  type IntakeSlots,
} from "./callSession.ts";

export { processCallTranscript } from "../conversation/processCall.ts";
export { analyzeTranscriptTurns } from "../conversation/engine.ts";
