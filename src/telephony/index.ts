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
  clearPostInterruptAwait,
  hasLifeThreateningLanguage,
  isCallActionable,
  isDentalPainCall,
  applyUtteranceToSlots,
  getIdentityState,
  logPolicyDebug,
  SPELLING_ABANDON_ANNOUNCE,
  consumeSpellingAbandonAnnounce,
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
  buildConversationOptions,
  deterministicSpeechForAction,
  ACTION_TO_FIELD,
  type ConversationalAction,
  type ConversationOptions,
} from "./allowedActions.ts";

export {
  normalizeSpokenSpelling,
  spellingLettersForSpeech,
  spellingToDisplayName,
} from "./spellingNormalize.ts";

export {
  inferCallStage,
  shouldIncludeProgressLanguage,
  progressBridgeForAction,
  emotionalCuesFromSession,
  PROGRESS_CLINICAL_BRIDGE,
  PROGRESS_SCHEDULING_BRIDGE,
  PROGRESS_URGENCY_CLARIFIED,
  PROGRESS_FEW_DETAILS,
  type CallStage,
} from "./conversationStages.ts";

export {
  EXPECTED_LATENCY_MS,
  isCallTraceEnabled,
  sanitizeCallSid,
  sanitizePhone,
  sanitizeSpokenForTrace,
  createCallTraceSession,
  appendTurnTrace,
  buildTurnTrace,
  type CallTurnTrace,
  type CallTraceSession,
  type TurnLatencyBreakdown,
} from "./callTrace.ts";

export {
  executeLiveTurn,
  type LiveTurnResult,
  type LiveTurnInput,
} from "./liveTurn.ts";

export {
  interpretSemanticTurn,
  interpretSemanticTurnHeuristic,
  heuristicIsStrong,
  resolveSemanticModel,
  isSemanticInterpreterEnabled,
  type SemanticInterpreterInput,
  type SemanticInterpreterOptions,
} from "./semanticTurnInterpreter.ts";

export {
  emptySemanticInterpretation,
  SEMANTIC_TURN_JSON_SCHEMA,
  type SemanticTurnInterpretation,
  type SemanticFacts,
} from "./semanticTurnTypes.ts";

export {
  mergeSemanticInterpretation,
  type FactProvenanceEntry,
  type FactProvenanceMap,
} from "./factProvenance.ts";

export {
  LOOP_RECOVERY_SPEECH,
  ALREADY_ANSWERED_SPEECH,
  noteStateAfterCallerTurn,
  recordSelectedAction,
  applyLoopSuppression,
  factFingerprint,
  actionFactSnapshot,
  isNonSafetyAction,
  type ConversationLoopState,
} from "./conversationLoopDetector.ts";

export {
  classifyPhoneIntentCategory,
  phoneIntentForTrace,
  hasLifeThreateningEmergencySignal,
  type PhoneIntentCategory,
} from "./phoneIntent.ts";

export {
  splitSpeechChunks,
  polishSpokenDelivery,
  isNonInterruptibleAction,
} from "./alyDelivery.ts";

export { applyEmotionalJudgment, composeEmotionalLead } from "./emotionalJudgment.ts";

export {
  GOLDEN_ROUTINE_PAIN_CALL_SID,
  GOLDEN_ROUTINE_PAIN_FROM,
  GOLDEN_ROUTINE_PAIN_OPENING,
  GOLDEN_ROUTINE_PAIN_TURNS,
  ROUTINE_PAIN_MINIMUM_OUTCOME,
} from "./fixtures/routinePainGolden.ts";

export {
  ROUTINE_PAIN_VARIATIONS,
  type VariationScenario,
  type VariationScorecard,
} from "./fixtures/routinePainVariations.ts";

export {
  buildPlannerContext,
  buildPlannerUserPayload,
  buildPlannerSystemPrompt,
  isHybridConversationalEnabled,
  parsePlannerProposal,
  planConversationalResponse,
  proposalChoosing,
  fallbackProposalForOptions,
  resolvePlannerModel,
  type PlannerContext,
  type PlannerProposal,
  type PlanConversationalOptions,
} from "./conversationalPlanner.ts";

export {
  validatePlannerProposal,
  type GuardrailResult,
} from "./conversationalGuardrails.ts";

export {
  planNextTurn,
  articulateNextAsk,
  articulateClosing,
  articulateNextAskDetailed,
  setArticulatePlanOptions,
  getArticulatePlanOptions,
  type TurnDecision,
} from "./articulateResponse.ts";

export {
  SPEECH_ENGINE_TRANSPORT,
  AMBER_KING_VOICE_ID,
  useSpeechEngineTransport,
  createSpeechEngineSession,
  runBrainTurn,
  streamBrainTurn,
  updateCallFacts,
  checkEmergencySafety,
  persistCompletedCall,
  executeTool,
  fallbackReply,
  type SpeechEngineSessionState,
  type StructuredCallFacts,
  type TranscriptMessage,
} from "./speechEngineBrain.ts";

export { processCallTranscript } from "../conversation/processCall.ts";
export { analyzeTranscriptTurns } from "../conversation/engine.ts";
