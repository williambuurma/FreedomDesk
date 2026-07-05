/**
 * Practice Memory — patient-centric memory layer for FreedomDesk.
 *
 * @module practice-memory
 */

export {
  createMockPracticeMemory,
  MOCK_PRACTICE_ID,
  PRACTICE_MEMORY_VERSION,
} from "./mockData.ts";

export {
  generateMorningMemorySummary,
  getPatientMemoryById,
  getPatientMemoryByName,
  listOpenTasks,
  listOpportunities,
  listUnresolvedIssues,
} from "./helpers.ts";

export type {
  CallMemory,
  ClinicalConcernMemory,
  CommunicationNote,
  Confidence,
  ConfidenceNote,
  InsuranceMemory,
  MemorySource,
  MemorySourceType,
  MorningMemorySummary,
  OpportunityMemory,
  PatientId,
  PatientIdentity,
  PatientMemory,
  PracticeId,
  PracticeMemory,
  PreferenceMemory,
  TaskMemory,
  UnresolvedIssue,
} from "./types.ts";
