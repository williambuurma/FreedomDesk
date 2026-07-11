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
  ALY_SAY_LANGUAGE,
  resolveAlySayVoice,
  alySayOptions,
} from "./alyVoice.ts";

export {
  composeMissedInputPrompt,
  composeEmptyHangup,
  composeClosing,
  DENTAL_SPEECH_HINTS,
} from "./callResponses.ts";

export {
  buildCallOperatingIntelligence,
  type CallOperatingIntelligence,
} from "./operatingIntelligence.ts";
