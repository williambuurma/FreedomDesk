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
