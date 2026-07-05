import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  reflect,
  resetReflectionCountersForTests,
  containsDiagnosticLanguage,
  mockNewPatientReflectionInput,
  mockEmergencyToothacheInput,
  mockHygieneRescheduleInput,
  mockBillingFrustrationInput,
  mockRoutineConfirmInput,
  REFLECTION_ENGINE_VERSION,
} from "./index.ts";

describe("Reflection Engine guards", () => {
  test("detects diagnostic language", () => {
    assert.equal(containsDiagnosticLanguage("Caller likely has an abscess"), true);
    assert.equal(containsDiagnosticLanguage("Caller reported throbbing pain"), false);
  });
});

describe("Reflection Engine — new patient intake", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("extracts preferences, insurance, and emotional observations from evidence", () => {
    const reflection = reflect(mockNewPatientReflectionInput());

    assert.equal(reflection.version, REFLECTION_ENGINE_VERSION);
    assert.equal(reflection.intent, "new_patient");
    assert.ok(reflection.hadLearning);
    assert.equal(reflection.constitutionalFlags.length, 0);

    assert.ok(reflection.patientPreferences.some((o) => o.observation.includes("Tuesday")));
    assert.ok(reflection.insuranceConcerns.some((o) => o.observation.includes("Delta Dental PPO")));
    assert.ok(reflection.emotionalObservations.some((o) => o.observation.includes("embarrassed")));
    assert.ok(reflection.schedulingObservations.some((o) => o.observation.includes("new_patient_exam")));
    assert.ok(reflection.opportunities.some((o) => o.observation.includes("spouse")));
  });

  test("surfaces unresolved questions without inventing answers", () => {
    const reflection = reflect(mockNewPatientReflectionInput());

    assert.ok(reflection.unresolvedQuestions.some((q) => q.question.includes("email")));
    assert.ok(reflection.unresolvedQuestions.every((q) => q.evidenceRef.startsWith("reasoning")));
  });

  test("produces memory candidates but does not persist them", () => {
    const reflection = reflect(mockNewPatientReflectionInput());

    assert.ok(reflection.memoryCandidates.length > 0);
    assert.ok(reflection.memoryCandidates.every((c) => c.evidenceRef.startsWith("reasoning")));
    assert.ok(reflection.memoryCandidates.some((c) => c.type === "preference"));
    assert.ok(reflection.memoryCandidates.every((c) => c.disposition !== undefined));
  });

  test("summary reflects learning yield and team rework risk", () => {
    const reflection = reflect(mockNewPatientReflectionInput());

    assert.ok(["moderate", "high"].includes(reflection.summary.learningYield));
    assert.equal(reflection.summary.teamReworkRisk, "medium");
    assert.ok(reflection.summary.keyLearnings.length > 0);
  });
});

describe("Reflection Engine — emergency toothache", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("records caller-reported symptoms without diagnosis", () => {
    const reflection = reflect(mockEmergencyToothacheInput());

    assert.ok(
      reflection.factsLearned.some((o) => o.observation.includes("throbbing pain"))
    );
    assert.ok(
      reflection.factsLearned.some((o) => o.observation.includes("denied facial swelling"))
    );
    assert.ok(
      !reflection.factsLearned.some((o) => containsDiagnosticLanguage(o.observation))
    );
    assert.equal(reflection.summary.urgency, "urgent");
    assert.ok(reflection.schedulingObservations.some((o) => o.observation.includes("emergency")));
  });

  test("captures operational handoff observations", () => {
    const reflection = reflect(mockEmergencyToothacheInput());

    assert.ok(
      reflection.operationalObservations.some((o) =>
        o.observation.includes("on-call")
      )
    );
    assert.equal(reflection.summary.teamReworkRisk, "low");
  });
});

describe("Reflection Engine — hygiene reschedule", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("flags incomplete summary and waitlist follow-up", () => {
    const reflection = reflect(mockHygieneRescheduleInput());

    assert.ok(reflection.unresolvedQuestions.some((q) => q.question.includes("reschedule_slot")));
    assert.ok(reflection.unresolvedQuestions.some((q) => q.question.includes("scheduledSlot")));
    assert.ok(reflection.followUpOpportunities.some((o) => o.observation.includes("waitlist")));
    assert.equal(reflection.summary.teamReworkRisk, "high");
  });
});

describe("Reflection Engine — billing frustration", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("captures insurance concern and retention opportunity", () => {
    const reflection = reflect(mockBillingFrustrationInput());

    assert.ok(reflection.insuranceConcerns.some((o) => o.observation.includes("benefit")));
    assert.ok(reflection.emotionalObservations.some((o) => /frustrat/i.test(o.observation)));
    assert.ok(reflection.opportunities.some((o) => o.observation.includes("retention")));
    assert.ok(reflection.operationalObservations.some((o) => o.observation.includes("Billing coordinator")));
  });
});

describe("Reflection Engine — routine confirm", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("zero-learning routine call is valid", () => {
    const reflection = reflect(mockRoutineConfirmInput());

    assert.ok(reflection.hadLearning);
    assert.equal(reflection.unresolvedQuestions.length, 0);
    assert.equal(reflection.summary.teamReworkRisk, "low");
    assert.ok(reflection.schedulingObservations.length >= 1);
  });
});

describe("Reflection Engine — constitutional boundaries", () => {
  beforeEach(() => resetReflectionCountersForTests());

  test("flags diagnostic language in reasoning evidence", () => {
    const input = mockNewPatientReflectionInput();
    input.reasoning.facts.push({
      id: "fact_bad",
      category: "clinical_reported",
      statement: "Patient likely has an infection requiring antibiotics.",
      evidenceRef: "reasoning.facts.clinical_reported.bad",
      confidence: 0.9,
    });

    const reflection = reflect(input);

    assert.ok(reflection.constitutionalFlags.includes("diagnostic_language_in_evidence"));
    assert.ok(
      !reflection.factsLearned.some((o) => o.observation.includes("infection requiring"))
    );
  });

  test("never invents facts beyond reasoning evidence", () => {
    const reflection = reflect(mockRoutineConfirmInput());
    const allObservations = [
      ...reflection.factsLearned,
      ...reflection.patientPreferences,
      ...reflection.insuranceConcerns,
      ...reflection.emotionalObservations,
      ...reflection.schedulingObservations,
      ...reflection.operationalObservations,
      ...reflection.opportunities,
      ...reflection.followUpOpportunities,
    ];

    assert.ok(allObservations.every((o) => o.evidenceRef.startsWith("reasoning")));
  });
});
