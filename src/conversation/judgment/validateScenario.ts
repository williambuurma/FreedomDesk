/**
 * Validate one judgment scenario against all five reasoning stages + Practice Brain signal.
 */

import { processCallTranscript } from "../processCall.ts";
import type {
  FrontDeskExpectations,
  JudgmentExpectations,
  PracticeBrainSignalExpectations,
  PsychologyExpectations,
  ReasoningStage,
  ScenarioValidationResult,
  StageValidationResult,
  SummaryExpectations,
  TriageExpectations,
  UnderstandingExpectations,
} from "./types.ts";
import type { MockCallTranscript } from "../types.ts";

function assertEqual<T>(
  failures: string[],
  label: string,
  actual: T,
  expected: T | undefined
): void {
  if (expected === undefined) return;
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(
  failures: string[],
  label: string,
  actual: string[],
  expected: string[] | undefined
): void {
  if (!expected?.length) return;
  for (const item of expected) {
    if (!actual.includes(item)) {
      failures.push(`${label}: expected to include ${JSON.stringify(item)}`);
    }
  }
}

function assertExcludes(
  failures: string[],
  label: string,
  actual: string[],
  expected: string[] | undefined
): void {
  if (!expected?.length) return;
  for (const item of expected) {
    if (actual.includes(item)) {
      failures.push(`${label}: expected to exclude ${JSON.stringify(item)}`);
    }
  }
}

function assertContains(
  failures: string[],
  label: string,
  actual: string,
  expected: string | undefined
): void {
  if (!expected) return;
  if (!actual.toLowerCase().includes(expected.toLowerCase())) {
    failures.push(`${label}: expected to contain ${JSON.stringify(expected)}`);
  }
}

function assertTextIncludes(
  failures: string[],
  label: string,
  actual: string,
  expected: string[] | undefined
): void {
  if (!expected?.length) return;
  for (const fragment of expected) {
    if (!actual.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`${label}: expected note to contain ${JSON.stringify(fragment)}`);
    }
  }
}

function validateUnderstanding(
  actual: ReturnType<typeof processCallTranscript>["analysis"]["understanding"],
  expected: UnderstandingExpectations
): string[] {
  const failures: string[] = [];
  assertEqual(failures, "intent", actual.intent, expected.intent);
  assertIncludes(failures, "intentSignals", actual.intentSignals, expected.intentSignalsIncludes);
  assertEqual(failures, "callerName", actual.callerName, expected.callerName);
  assertEqual(failures, "phone", actual.phone, expected.phone);
  assertEqual(failures, "dateOfBirth", actual.dateOfBirth, expected.dateOfBirth);
  assertEqual(failures, "isNewPatient", actual.isNewPatient, expected.isNewPatient);
  assertEqual(failures, "insuranceProgram", actual.insuranceProgram, expected.insuranceProgram);
  assertIncludes(failures, "symptoms", actual.symptoms, expected.symptomsIncludes);

  if (expected.chiefConcernContains?.length) {
    const concern = (actual.chiefConcern ?? "").toLowerCase();
    for (const fragment of expected.chiefConcernContains) {
      if (!concern.includes(fragment.toLowerCase())) {
        failures.push(
          `chiefConcern: expected to contain ${JSON.stringify(fragment)}`
        );
      }
    }
  }

  if (expected.symptomDetails) {
    for (const [key, value] of Object.entries(expected.symptomDetails)) {
      const actualValue = actual.symptomDetails[key as keyof typeof actual.symptomDetails];
      if (actualValue !== value) {
        failures.push(
          `symptomDetails.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actualValue)}`
        );
      }
    }
  }

  return failures;
}

function validatePsychology(
  actual: ReturnType<typeof processCallTranscript>["analysis"]["psychology"],
  expected: PsychologyExpectations
): string[] {
  const failures: string[] = [];
  assertEqual(failures, "emotion", actual.emotion, expected.emotion);
  assertEqual(failures, "toneStrategy", actual.toneStrategy, expected.toneStrategy);
  assertEqual(
    failures,
    "deferAdminQuestions",
    actual.deferAdminQuestions,
    expected.deferAdminQuestions
  );
  assertEqual(
    failures,
    "emotionalBurden",
    actual.emotionalBurden,
    expected.emotionalBurden
  );
  assertIncludes(
    failures,
    "matchedRules",
    actual.matchedRules,
    expected.matchedRulesIncludes
  );
  return failures;
}

function validateTriage(
  actual: ReturnType<typeof processCallTranscript>["analysis"]["triage"],
  expected: TriageExpectations
): string[] {
  const failures: string[] = [];
  assertEqual(failures, "urgency", actual.urgency, expected.urgency);
  assertEqual(
    failures,
    "sameDayEmergency",
    actual.sameDayEmergency,
    expected.sameDayEmergency
  );
  assertContains(
    failures,
    "routingAction",
    actual.routingAction,
    expected.routingActionContains
  );
  assertIncludes(
    failures,
    "matchedRules",
    actual.matchedRules,
    expected.matchedRulesIncludes
  );
  return failures;
}

function validateFrontDesk(
  actual: ReturnType<typeof processCallTranscript>["analysis"]["frontDesk"],
  expected: FrontDeskExpectations
): string[] {
  const failures: string[] = [];
  assertIncludes(
    failures,
    "missingFields",
    actual.missingFields,
    expected.missingFieldsIncludes
  );
  assertExcludes(
    failures,
    "missingFields",
    actual.missingFields,
    expected.missingFieldsExcludes
  );
  assertEqual(failures, "appointmentType", actual.appointmentType, expected.appointmentType);
  assertContains(
    failures,
    "recommendedNextStep",
    actual.recommendedNextStep,
    expected.recommendedNextStepContains
  );
  return failures;
}

function validateSummary(
  actual: ReturnType<typeof processCallTranscript>["summary"],
  expected: SummaryExpectations
): string[] {
  const failures: string[] = [];
  assertEqual(failures, "intent", actual.intent, expected.intent);
  assertEqual(failures, "urgency", actual.urgency, expected.urgency);
  assertEqual(
    failures,
    "sameDayEmergency",
    actual.sameDayEmergency,
    expected.sameDayEmergency
  );
  assertEqual(
    failures,
    "humanReviewNeeded",
    actual.humanReviewNeeded,
    expected.humanReviewNeeded
  );
  assertEqual(failures, "afterHours", actual.afterHours, expected.afterHours);
  assertEqual(failures, "caller.name", actual.caller.name, expected.callerName);
  assertTextIncludes(
    failures,
    "openDentalCommLogNote",
    actual.openDentalCommLogNote,
    expected.commLogNoteContains
  );
  assertIncludes(
    failures,
    "actionItemTypes",
    actual.actionItems.map((item) => item.type),
    expected.actionItemTypesIncludes
  );
  assertIncludes(
    failures,
    "missingInformation",
    actual.missingInformation,
    expected.missingInformationIncludes
  );
  return failures;
}

function validatePracticeBrainSignal(
  actual: ReturnType<typeof processCallTranscript>["signal"],
  expected: PracticeBrainSignalExpectations
): string[] {
  const failures: string[] = [];
  assertEqual(failures, "intent", actual.intent, expected.intent);
  assertEqual(failures, "urgency", actual.urgency, expected.urgency);
  assertEqual(failures, "afterHours", actual.afterHours, expected.afterHours);
  assertEqual(
    failures,
    "sameDayEmergency",
    actual.sameDayEmergency,
    expected.sameDayEmergency
  );
  assertEqual(failures, "appointmentType", actual.appointmentType, expected.appointmentType);
  assertEqual(
    failures,
    "insuranceProgram",
    actual.insuranceProgram,
    expected.insuranceProgram
  );
  assertIncludes(
    failures,
    "emotionalFlags",
    actual.emotionalFlags ?? [],
    expected.emotionalFlagsIncludes
  );
  return failures;
}

function stageResult(
  stage: ReasoningStage,
  failures: string[]
): StageValidationResult {
  return { stage, passed: failures.length === 0, failures };
}

export function validateJudgmentScenario(input: {
  meta: { id: string; title: string; category: string };
  transcript: MockCallTranscript;
  expectations: JudgmentExpectations;
}): ScenarioValidationResult {
  const { summary, signal, analysis } = processCallTranscript(input.transcript);

  const stages: StageValidationResult[] = [
    stageResult(
      "Understanding",
      validateUnderstanding(analysis.understanding, input.expectations.understanding)
    ),
    stageResult(
      "Psychology",
      validatePsychology(analysis.psychology, input.expectations.psychology)
    ),
    stageResult(
      "Triage",
      validateTriage(analysis.triage, input.expectations.triage)
    ),
    stageResult(
      "FrontDesk",
      validateFrontDesk(analysis.frontDesk, input.expectations.frontDesk)
    ),
    stageResult(
      "Summary",
      validateSummary(summary, input.expectations.summary)
    ),
    stageResult(
      "PracticeBrain",
      validatePracticeBrainSignal(signal, input.expectations.practiceBrainSignal)
    ),
  ];

  return {
    scenarioId: input.meta.id,
    title: input.meta.title,
    category: input.meta.category,
    passed: stages.every((stage) => stage.passed),
    stages,
  };
}

export function formatScenarioFailures(result: ScenarioValidationResult): string {
  const failed = result.stages.filter((stage) => !stage.passed);
  if (failed.length === 0) return "";
  const lines = failed.map(
    (stage) => `  [${stage.stage}] ${stage.failures.join("; ")}`
  );
  return `${result.scenarioId} (${result.title}):\n${lines.join("\n")}`;
}
