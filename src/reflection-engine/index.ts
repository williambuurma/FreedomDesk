/**
 * Reflection Engine — post-interaction learning for FreedomDesk.
 *
 * Pipeline position:
 *   Reasoning Engine → Reflection Engine → Memory Steward → Practice Memory
 *
 * Reflection never writes to memory. It produces Memory Candidates only.
 *
 * @module reflection-engine
 */

export {
  REFLECTION_ENGINE_VERSION,
  reflect,
  resetReflectionCountersForTests,
} from "./reflect.ts";

export {
  MOCK_PRACTICE_ID,
  MOCK_REFLECTION_INPUTS,
  mockBillingFrustrationInput,
  mockEmergencyToothacheInput,
  mockHygieneRescheduleInput,
  mockNewPatientReflectionInput,
  mockRoutineConfirmInput,
} from "./mockData.ts";

export {
  assertEvidenceBacked,
  containsDiagnosticLanguage,
  containsInventedCertainty,
} from "./guards.ts";

export type {
  CallId,
  Confidence,
  EvidenceRef,
  InteractionId,
  ISOTimestamp,
  LearningCandidate,
  LearningCandidateDisposition,
  LearningCandidateType,
  PracticeId,
  ReasoningConfidence,
  ReasoningEmotionalSignal,
  ReasoningEvidence,
  ReasoningFact,
  ReasoningInsuranceSignal,
  ReasoningOperationalSignal,
  ReasoningOpportunitySignal,
  ReasoningSchedulingSignal,
  ReasoningUnresolvedSlot,
  Reflection,
  ReflectionInput,
  ReflectionObservation,
  ReflectionObservationCategory,
  ReflectionQuestion,
  ReflectionSummary,
} from "./types.ts";
