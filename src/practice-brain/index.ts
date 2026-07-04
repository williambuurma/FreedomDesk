/**
 * FreedomDesk Practice Brain — public API surface.
 *
 * Import from this module in server jobs, CLI tools, and future admin dashboard.
 */

export { PRACTICE_BRAIN_VERSION, PracticeBrain, getPracticeBrain, resetPracticeBrainRegistry } from "./practiceBrain.ts";

export { validateRecommendation } from "./recommendationEngine.ts";
export { calibrateConfidenceFromMemory } from "./practiceMemory.ts";

export type {
  CallSummarySignal,
  DailyAwarenessState,
  EvidenceItem,
  MorningBrief,
  MorningBriefItem,
  MorningBriefSection,
  Opportunity,
  OpportunityType,
  OwnerRole,
  PracticeBrainRunResult,
  PracticeId,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
  IPracticeMemory,
  IDailyAwareness,
  IPracticeMetrics,
  IOpportunityDetector,
  IRecommendationEngine,
  IMorningBriefGenerator,
} from "./types.ts";

export { MOCK_PRACTICE_ID, createMockOfficeDna } from "./mockData.ts";
