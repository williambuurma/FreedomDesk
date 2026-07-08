import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  loadJudgmentScenarios,
  validateJudgmentScenario,
  formatScenarioFailures,
} from "./judgment/index.ts";

describe("Judgment Validation Suite", () => {
  const scenarios = loadJudgmentScenarios();

  test("library contains representative scenario coverage", () => {
    assert.ok(scenarios.length >= 20, `expected at least 20 scenarios, got ${scenarios.length}`);
    const categories = new Set(scenarios.map((scenario) => scenario.meta.category));
    const required = [
      "emergency",
      "broken-tooth",
      "swelling",
      "new-patient",
      "pediatric",
      "insurance",
      "billing",
      "reschedule",
      "cancellation",
      "post-op",
      "lost-filling",
      "broken-denture",
      "implant",
      "crown-off",
      "hygiene-recall",
      "medication",
      "referral",
      "night-emergency",
      "high-anxiety",
      "confused-elderly",
    ];
    for (const category of required) {
      assert.ok(
        categories.has(category),
        `missing scenario category: ${category}`
      );
    }
  });

  for (const scenario of scenarios) {
    test(`${scenario.meta.id} — ${scenario.meta.title}`, () => {
      const result = validateJudgmentScenario(scenario);
      if (!result.passed) {
        assert.fail(formatScenarioFailures(result));
      }
    });
  }
});

describe("Judgment Validation Suite — aggregate report", () => {
  test("reports stage-level failure counts for tuning", () => {
    const scenarios = loadJudgmentScenarios();
    const results = scenarios.map((scenario) => validateJudgmentScenario(scenario));
    const failed = results.filter((result) => !result.passed);

    const stageFailures: Record<string, number> = {};
    for (const result of failed) {
      for (const stage of result.stages) {
        if (!stage.passed) {
          stageFailures[stage.stage] = (stageFailures[stage.stage] ?? 0) + 1;
        }
      }
    }

    // Informational — always passes; detailed failures surface in per-scenario tests above.
    assert.ok(scenarios.length >= 20);
    if (failed.length > 0) {
      console.log(
        `Judgment suite: ${results.length - failed.length}/${results.length} passed; stage failures:`,
        stageFailures
      );
    }
  });
});
