import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { processCallTranscript } from "./processCall.ts";
import type { MockCallTranscript } from "./types.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function loadFixture(name: string): MockCallTranscript {
  const filePath = path.join(repoRoot, "fixtures/calls", name);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MockCallTranscript;
}

describe("Reasoning evidence trace", () => {
  test("full call produces six-stage reasoning with facts and rules", () => {
    const { reasoning } = processCallTranscript(loadFixture("toothache-overnight.json"));

    assert.ok(reasoning.understanding.facts.length >= 5);
    assert.ok(reasoning.understanding.rulesFired.some((r) => r.ruleId.startsWith("INTENT_")));
    assert.equal(reasoning.understanding.stage, "Understanding");
    assert.ok(reasoning.understanding.confidence > 0);

    assert.equal(reasoning.psychology.stage, "Psychology");
    assert.ok(Array.isArray(reasoning.psychology.rulesFired));

    assert.equal(reasoning.triage.stage, "Triage");
    assert.ok(reasoning.triage.rulesFired.length >= 1);
    assert.ok(reasoning.triage.rationale.length >= 1);

    assert.equal(reasoning.frontDesk.stage, "FrontDesk");
    assert.ok(reasoning.frontDesk.facts.some((f) => f.id.startsWith("FACT_FIELD_")));

    assert.ok(reasoning.summary);
    assert.equal(reasoning.summary?.stage, "Summary");
    assert.ok(reasoning.summary!.rulesFired.length >= 1);

    assert.ok(reasoning.practiceBrain);
    assert.equal(reasoning.practiceBrain?.stage, "PracticeBrain");
    assert.ok(reasoning.practiceBrain!.facts.some((f) => f.id === "FACT_SIGNAL_INTENT"));
  });
});
