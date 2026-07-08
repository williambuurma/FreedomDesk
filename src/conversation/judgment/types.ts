/**
 * Judgment Validation Suite — scenario contracts for reasoning quality checks.
 * Authority: docs/CALL_FLOWS.md, docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md
 */

import type { CallIntent, InsuranceProgram, MockCallTranscript, UrgencyLevel } from "../types.ts";
import type { PsychologyEmotion, ToneStrategy } from "../psychology.ts";

export type ReasoningStage =
  | "Understanding"
  | "Psychology"
  | "Triage"
  | "FrontDesk"
  | "Summary"
  | "PracticeBrain";

export interface JudgmentScenarioMeta {
  id: string;
  title: string;
  category: string;
  description: string;
}

export interface UnderstandingExpectations {
  intent?: CallIntent;
  intentSignalsIncludes?: string[];
  callerName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  isNewPatient?: boolean | null;
  insuranceProgram?: InsuranceProgram;
  chiefConcernContains?: string[];
  symptomsIncludes?: string[];
  symptomDetails?: Partial<{
    swelling: boolean;
    fever: boolean;
    trauma: boolean;
    painLevel: string;
  }>;
}

export interface PsychologyExpectations {
  emotion?: PsychologyEmotion;
  toneStrategy?: ToneStrategy;
  deferAdminQuestions?: boolean;
  matchedRulesIncludes?: string[];
  emotionalBurden?: "none" | "low" | "moderate" | "high";
}

export interface TriageExpectations {
  urgency?: UrgencyLevel;
  sameDayEmergency?: boolean;
  routingActionContains?: string;
  matchedRulesIncludes?: string[];
}

export interface FrontDeskExpectations {
  missingFieldsIncludes?: string[];
  missingFieldsExcludes?: string[];
  appointmentType?: string | null;
  recommendedNextStepContains?: string;
}

export interface SummaryExpectations {
  intent?: CallIntent;
  urgency?: UrgencyLevel;
  sameDayEmergency?: boolean;
  humanReviewNeeded?: boolean;
  afterHours?: boolean;
  callerName?: string | null;
  commLogNoteContains?: string[];
  actionItemTypesIncludes?: string[];
  missingInformationIncludes?: string[];
}

export interface PracticeBrainSignalExpectations {
  intent?: string;
  urgency?: string;
  afterHours?: boolean;
  sameDayEmergency?: boolean;
  appointmentType?: string;
  emotionalFlagsIncludes?: string[];
  insuranceProgram?: InsuranceProgram;
}

export interface JudgmentExpectations {
  understanding: UnderstandingExpectations;
  psychology: PsychologyExpectations;
  triage: TriageExpectations;
  frontDesk: FrontDeskExpectations;
  summary: SummaryExpectations;
  practiceBrainSignal: PracticeBrainSignalExpectations;
}

export interface JudgmentScenario {
  meta: JudgmentScenarioMeta;
  /** Inline transcript — use when scenario is self-contained. */
  transcript?: MockCallTranscript;
  /** Repo-relative path to a MockCallTranscript JSON file. */
  transcriptRef?: string;
  expectations: JudgmentExpectations;
}

export interface StageValidationResult {
  stage: ReasoningStage;
  passed: boolean;
  failures: string[];
}

export interface ScenarioValidationResult {
  scenarioId: string;
  title: string;
  category: string;
  passed: boolean;
  stages: StageValidationResult[];
}
