import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  PracticeBrain,
  validateRecommendation,
  resetPracticeBrainRegistry,
  MOCK_PRACTICE_ID,
} from "./index.ts";
import { resetDailyAwarenessForTests } from "./dailyAwareness.ts";
import { resetPracticeMemoryForTests } from "./practiceMemory.ts";

const REQUIRED_REC_FIELDS = [
  "recommendation",
  "reason",
  "evidence",
  "confidence",
  "priority",
  "owner",
  "expectedOutcome",
] as const;

describe("PracticeBrain", () => {
  beforeEach(() => {
    resetPracticeBrainRegistry();
    resetDailyAwarenessForTests();
    resetPracticeMemoryForTests();
  });

  test("runDailyCycle produces full intelligence artifact", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const result = brain.runDailyCycle();

    assert.equal(result.practiceId, MOCK_PRACTICE_ID);
    assert.ok(result.awareness.callStream.length > 0);
    assert.ok(result.metrics.departments.length > 0);
    assert.ok(result.opportunities.length > 0);
    assert.ok(result.recommendations.length > 0);
    assert.ok(result.morningBrief.sections.length > 0);
  });

  test("every recommendation satisfies the explainability contract", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const { recommendations } = brain.runDailyCycle();

    assert.ok(recommendations.length > 0, "expected at least one recommendation");

    for (const rec of recommendations) {
      for (const field of REQUIRED_REC_FIELDS) {
        assert.ok(
          rec[field] !== undefined && rec[field] !== null && rec[field] !== "",
          `recommendation ${rec.id} missing ${field}`
        );
      }
      assert.ok(Array.isArray(rec.evidence) && rec.evidence.length > 0);
      assert.ok(rec.confidence >= 0 && rec.confidence <= 1);
      validateRecommendation(rec);
    }
  });

  test("generateMorningBrief is scannable and has stewardship note", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const brief = brain.generateMorningBrief();

    assert.equal(brief.practiceName, "Cascade Family Dentistry");
    assert.ok(brief.estimatedReadMinutes <= 3);
    assert.ok(brief.stewardshipNote.length > 0);
    assert.ok(brief.topRecommendations.length > 0);
    assert.ok(brief.targetDeliveryAt < brief.generatedAt || brief.targetDeliveryAt.length > 0);
  });

  test("detects emergency opportunity from overnight urgent call", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const opportunities = brain.detectOpportunities();

    const emergency = opportunities.filter((o) => o.type === "emergency");
    assert.ok(emergency.length >= 1);
    assert.ok(emergency[0].confidence >= 0.8);
  });

  test("ingestCallSummary enforces tenant isolation", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);

    assert.throws(
      () =>
        brain.ingestCallSummary({
          callId: "call_bad",
          practiceId: "other_practice",
          intent: "confirm",
          receivedAt: new Date().toISOString(),
          afterHours: false,
          completenessScore: 1,
        }),
      /Tenant isolation violation/
    );
  });

  test("critical recommendations appear first", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const recs = brain.generateRecommendations();

    const firstCriticalIdx = recs.findIndex((r) => r.priority === "critical");
    if (firstCriticalIdx >= 0) {
      for (let i = 0; i < firstCriticalIdx; i++) {
        assert.notEqual(recs[i].priority, "low");
      }
    }
  });
});
