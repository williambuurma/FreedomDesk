/**
 * Practice Improvement Engine — public API.
 *
 * Single objective: "Can I improve this practice?"
 * Shared pipeline for Operating, Supply, Owner, Phone, and Practice Brain.
 */

export {
  IMPROVEMENT_ENGINE_VERSION,
  PRACTICE_IMPROVEMENT_OBJECTIVE,
  type PipelineStage,
  type IntelligenceDomain,
  type JudgmentDisposition,
  type ActionThreshold,
  type ConfidenceTier,
  type ImpactLevel,
  type InterruptionTier,
  type RecommendationPriority,
  type OutcomeStatus,
  type LearningStage,
  type Observation,
  type Understanding,
  type Situation,
  type OpportunityOrRisk,
  type ImpactEvaluation,
  type Commitment,
  type Explanation,
  type ImprovementRecommendation,
  type Outcome,
  type LearningSignal,
  type PipelineStageTrace,
  type PipelineTrace,
  type ImprovementResult,
  type CommitmentDraft,
  type PipelineContext,
  type DomainAssessmentModule,
  type DecisionFirstProjection,
  type ArbitrationDisposition,
  type DecisionArbitrationContext,
  type ArbitratedDecision,
  type DecisionArbitrationResult,
} from "./types.ts";

export {
  confidenceTier,
  recommendationFloor,
  actionFloor,
  meetsRecommendationFloor,
  meetsActionFloor,
} from "./confidence.ts";

export {
  looksLikePmsDuplicate,
  isMaterialImprovement,
  materialReason,
  gateRecommendation,
  CONSTITUTIONAL_MUST_NOT_SAY,
} from "./gates.ts";

export { evaluateImpact } from "./impactEvaluation.ts";

export { runImprovementPipeline } from "./pipeline.ts";

export {
  arbitrateDecisions,
  arbitrateImprovementBatch,
  compareArbitrationCandidates,
} from "./decisionArbitration.ts";

export {
  OutcomeRecorder,
  learningSignalFromOutcome,
  type RecordOutcomeInput,
} from "./outcomeRecorder.ts";

export {
  DEFAULT_DOMAIN_MODULES,
  selectDomainModule,
  selectDomainModules,
  modulesByDomain,
  phoneDomain,
  operatingDomain,
  supplyDomain,
  ownerDomain,
  practiceBrainDomain,
} from "./domains/registry.ts";

export {
  PracticeImprovementEngine,
  getPracticeImprovementEngine,
  resetPracticeImprovementEngineRegistry,
  type PracticeImprovementEngineOptions,
} from "./improvementEngine.ts";

export {
  MIN_RECOVERABLE_MINUTES,
  MIN_CANDIDATE_SCORE,
  isScheduleOpportunityPayload,
  isMeaningfulOpening,
  scoreCandidate,
  rankCandidates,
  assessScheduleOpportunity,
  buildSituationLine,
  buildRecommendationLine,
  buildPrimaryAction,
  projectDecisionFirst,
  type ScheduleOpening,
  type ScheduleFillCandidate,
  type ScheduleOpportunityPayload,
  type RankedCandidate,
  type ScheduleOpportunityAssessment,
} from "./scheduleOpportunity.ts";

export {
  MIN_PHONE_OPPORTUNITY_SCORE,
  isPhoneOpportunityPayload,
  selectPhoneRecipient,
  scorePhoneOpportunity,
  rankPhoneOpportunities,
  assessPhoneOpportunity,
  buildPhoneSituationLine,
  buildPhoneRecommendationLine,
  buildPhonePrimaryAction,
  buildPhoneStake,
  phoneLearningObservation,
  projectPhoneDecisionFirst,
  type PhoneOpportunityType,
  type ResolutionQuality,
  type ClinicalUrgency,
  type ConversionLikelihood,
  type PhoneOpportunityPayload,
  type ScoredPhoneOpportunity,
  type PhoneOpportunityAssessment,
  type PhoneLearningObservation,
} from "./phoneOpportunity.ts";

export {
  DEMO_SCHEDULE_PRACTICE_ID,
  DEMO_CANDIDATE_MARIA,
  buildDemoSchedulePayload,
  buildDemoScheduleOpeningEvent,
} from "./fixtures/recoverableScheduleOpportunity.ts";

export {
  DEMO_PHONE_PRACTICE_ID,
  buildDemoPhonePayload,
  buildDemoUrgentSwellingPayload,
  buildDemoNewPatientPayload,
  buildDemoTreatmentPayload,
  buildDemoInsurancePayload,
  buildDemoLanguageBarrierPayload,
  buildDemoResolvedPayload,
  buildDemoWeakPayload,
  buildDemoIllegitimateRevenuePayload,
  buildDemoPhoneRecoveryEvent,
  buildDemoNewPatientRecoveryEvent,
} from "./fixtures/recoverablePhoneOpportunity.ts";
