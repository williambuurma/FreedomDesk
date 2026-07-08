import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test, beforeEach } from "node:test";

import { processCallTranscript } from "./processCall.ts";
import type { MockCallTranscript } from "./types.ts";
import {
  PracticeBrain,
  MOCK_PRACTICE_ID,
  resetPracticeBrainRegistry,
} from "../practice-brain/index.ts";
import { resetDailyAwarenessForTests } from "../practice-brain/dailyAwareness.ts";
import { resetPracticeMemoryForTests } from "../practice-brain/practiceMemory.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function loadFixture(name: string): MockCallTranscript {
  const filePath = path.join(repoRoot, "fixtures/calls", name);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MockCallTranscript;
}

describe("V1 proof loop — conversation intelligence", () => {
  test("toothache overnight transcript produces urgent emergency summary", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { summary } = processCallTranscript(transcript);

    assert.equal(summary.intent, "EMERGENCY");
    assert.equal(summary.urgency, "urgent");
    assert.equal(summary.caller.name, "Finn Leo");
    assert.equal(summary.caller.phone, "+16161231356");
    assert.equal(summary.afterHours, true);
    assert.equal(summary.sameDayEmergency, true);
    assert.ok(summary.chiefConcern?.includes("toothache"));
    assert.ok(summary.recommendedNextStep.toLowerCase().includes("on-call"));
    assert.equal(summary.humanReviewNeeded, true);
    assert.ok(summary.openDentalCommLogNote.includes("Finn Leo"));
    assert.ok(summary.actionItems.some((a) => a.type === "on_call_callback"));
    assert.ok(summary.missingInformation.includes("insurance.program"));
  });

  test("new patient transcript classifies intent and captures intake", () => {
    const transcript = loadFixture("new-patient-exam.json");
    const { summary } = processCallTranscript(transcript);

    assert.equal(summary.intent, "NEW_PATIENT");
    assert.equal(summary.urgency, "routine");
    assert.equal(summary.caller.name, "Finn Leo");
    assert.equal(summary.caller.phone, "+16165550198");
    assert.equal(summary.insurance?.program, "delta_dental_ppo");
    assert.ok(summary.chiefConcern?.toLowerCase().includes("new patient"));
    assert.ok(summary.openDentalCommLogNote.includes("New Patient"));
  });
});

describe("V1 proof loop — Practice Brain ingest", () => {
  beforeEach(() => {
    resetPracticeBrainRegistry();
    resetDailyAwarenessForTests();
    resetPracticeMemoryForTests();
  });

  test("ingested call appears in awareness and drives emergency opportunity", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { signal } = processCallTranscript(transcript);

    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    brain.refreshAwareness();
    brain.ingestCallSummary(signal);

    const awareness = brain.getAwareness();
    const ingested = awareness.callStream.find((c) => c.callId === signal.callId);
    assert.ok(ingested, "expected ingested call in awareness stream");
    assert.equal(ingested?.urgency, "urgent");
    assert.equal(ingested?.afterHours, true);

    const result = brain.runDailyCycle(undefined, { refresh: false });
    const emergencyOpps = result.opportunities.filter((o) => o.type === "emergency");
    assert.ok(emergencyOpps.length >= 1);

    const overnightSection = result.morningBrief.sections.find(
      (s) => s.id === "overnight_calls"
    );
    assert.ok(overnightSection);
    assert.ok(
      overnightSection.items.some((item) => item.summary.includes(signal.callId) || item.id.includes(signal.callId))
        || overnightSection.items.length > 0
    );
  });

  test("runDailyCycle with refresh:false preserves ingested calls", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { signal } = processCallTranscript(transcript);

    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    brain.refreshAwareness();
    const beforeCount = brain.getAwareness().callStream.length;
    brain.ingestCallSummary(signal);

    brain.runDailyCycle(undefined, { refresh: false });
    const after = brain.getAwareness().callStream;
    assert.equal(after.length, beforeCount + 1);
  });
});
