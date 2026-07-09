import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test, beforeEach } from "node:test";

import { processCallTranscript } from "../conversation/processCall.ts";
import type { MockCallTranscript } from "../conversation/types.ts";
import { operationalEventToCallSummarySignal } from "./normalize.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "./types.ts";
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

describe("Operational Event Stream", () => {
  test("call summary becomes operational event with required contract fields", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { summary, operationalEvent } = processCallTranscript(transcript);

    assert.equal(operationalEvent.$schema, OPERATIONAL_EVENT_SCHEMA_VERSION);
    assert.equal(operationalEvent.practiceId, summary.practiceId);
    assert.equal(operationalEvent.source, "call");
    assert.equal(operationalEvent.eventType, "call_completed");
    assert.equal(operationalEvent.timestamp, summary.timestamp);
    assert.equal(operationalEvent.id, `evt_${summary.callId}`);
    assert.equal(operationalEvent.subject?.callId, summary.callId);
    assert.ok(operationalEvent.subject?.patientReferenceId);
    assert.ok(operationalEvent.evidence.length >= 3);
    assert.ok(operationalEvent.uncertainty.confidence >= 0);
    assert.ok(operationalEvent.routing?.recommendedNextStep);
    assert.ok(operationalEvent.routing?.owner);
    assert.equal(operationalEvent.payload.schema, "call_summary/v1");
  });

  test("event preserves evidence and provenance from call summary", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { summary, operationalEvent } = processCallTranscript(transcript);

    const intentEvidence = operationalEvent.evidence.find((e) =>
      e.provenance?.includes("callSummary.intent")
    );
    assert.ok(intentEvidence);
    assert.equal(intentEvidence.source, "call_summary");
    assert.equal(intentEvidence.referenceId, summary.id);

    const symptomEvidence = operationalEvent.evidence.find((e) =>
      e.provenance?.includes("emergency.symptoms")
    );
    assert.ok(symptomEvidence);
    assert.equal(symptomEvidence.source, "caller_stated");

    assert.equal(operationalEvent.uncertainty.humanReviewNeeded, summary.humanReviewNeeded);
    assert.ok(operationalEvent.uncertainty.gaps?.includes("insurance.program"));
  });

  test("operational event normalizes to call summary signal for awareness", () => {
    const transcript = loadFixture("new-patient-exam.json");
    const { signal, operationalEvent } = processCallTranscript(transcript);

    const normalized = operationalEventToCallSummarySignal(operationalEvent);
    assert.ok(normalized);
    assert.equal(normalized.callId, signal.callId);
    assert.equal(normalized.intent, signal.intent);
    assert.equal(normalized.urgency, signal.urgency);
    assert.equal(normalized.insuranceProgram, signal.insuranceProgram);
    assert.equal(normalized.completenessScore, signal.completenessScore);
  });
});

describe("Operational Event Stream — Practice Brain ingest", () => {
  beforeEach(() => {
    resetPracticeBrainRegistry();
    resetDailyAwarenessForTests();
    resetPracticeMemoryForTests();
  });

  test("Practice Brain ingests operational event into awareness", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { operationalEvent } = processCallTranscript(transcript);

    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    brain.refreshAwareness();
    brain.ingestOperationalEvent(operationalEvent);

    const ingested = brain
      .getAwareness()
      .callStream.find((c) => c.callId === operationalEvent.subject?.callId);
    assert.ok(ingested);
    assert.equal(ingested?.urgency, "urgent");
    assert.equal(ingested?.afterHours, true);
  });

  test("ingestOperationalEvent enforces tenant isolation", () => {
    const brain = new PracticeBrain(MOCK_PRACTICE_ID);
    const transcript = loadFixture("toothache-overnight.json");
    const { operationalEvent } = processCallTranscript(transcript);

    assert.throws(
      () =>
        brain.ingestOperationalEvent({
          ...operationalEvent,
          practiceId: "other_practice",
        }),
      /Tenant isolation violation/
    );
  });
});
