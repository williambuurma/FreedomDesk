/**
 * Practice Improvement Engine — tests.
 * Pipeline: Observe → Understand → Detect → Identify → Recommend → Explain → Outcome → Learn
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";

import { processCallTranscript } from "../conversation/processCall.ts";
import type { MockCallTranscript } from "../conversation/types.ts";
import type { OperationalEvent } from "../events/types.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "../events/types.ts";
import {
  PRACTICE_IMPROVEMENT_OBJECTIVE,
  PracticeImprovementEngine,
  getPracticeImprovementEngine,
  resetPracticeImprovementEngineRegistry,
  looksLikePmsDuplicate,
  isMaterialImprovement,
  confidenceTier,
  DEFAULT_DOMAIN_MODULES,
} from "./index.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function loadFixture(name: string): MockCallTranscript {
  const filePath = path.join(repoRoot, "fixtures/calls", name);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MockCallTranscript;
}

function baseEvent(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_test_1",
    practiceId: "practice_test",
    source: "pms",
    timestamp: "2026-07-10T12:00:00.000Z",
    eventType: "appointment_cancelled",
    evidence: [
      {
        source: "pms_authoritative",
        description: "Hygiene appointment cancelled",
        observedAt: "2026-07-10T12:00:00.000Z",
      },
    ],
    uncertainty: { confidence: 0.92 },
    routing: {
      owner: "front_desk",
      urgencyTier: "important",
      recommendedNextStep: "Offer waitlist for Tue 2 PM hygiene opening",
    },
    payload: { slotId: "slot_1", appointmentType: "hygiene" },
    ...overrides,
  };
}

describe("Practice Improvement Engine — foundation", () => {
  test("registers all five intelligence domains on one pipeline", () => {
    const engine = new PracticeImprovementEngine();
    assert.equal(engine.objective, PRACTICE_IMPROVEMENT_OBJECTIVE);
    assert.deepEqual(engine.registeredDomains().sort(), [
      "operating",
      "owner",
      "phone",
      "practice_brain",
      "supply",
    ]);
    assert.equal(DEFAULT_DOMAIN_MODULES.length, 5);
  });

  test("confidence tiers match Intelligence Model bands", () => {
    assert.equal(confidenceTier(0.95), "high");
    assert.equal(confidenceTier(0.8), "moderate");
    assert.equal(confidenceTier(0.55), "low");
    assert.equal(confidenceTier(0.2), "insufficient");
  });

  test("PMS duplicate detection stays quiet", () => {
    assert.equal(looksLikePmsDuplicate("Show today's full schedule"), true);
    assert.equal(looksLikePmsDuplicate("Offer waitlist for open hygiene slot"), false);
  });

  test("material improvement gate rejects low-impact informational noise", () => {
    assert.equal(
      isMaterialImprovement({
        estimatedImpact: "low",
        urgencyTier: "informational",
        confidence: 0.6,
        kind: "opportunity",
      }),
      false
    );
    assert.equal(
      isMaterialImprovement({
        estimatedImpact: "high",
        urgencyTier: "important",
        confidence: 0.85,
        kind: "opportunity",
      }),
      true
    );
  });
});

describe("Practice Improvement Engine — pipeline stages", () => {
  test("overnight emergency call surfaces phone Action with explain-why", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { operationalEvent } = processCallTranscript(transcript);
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(operationalEvent);

    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.equal(result.domain, "phone");
    assert.ok(result.understanding);
    assert.ok(result.situation);
    assert.ok(result.opportunityOrRisk);
    assert.ok(result.recommendation);
    assert.ok(result.recommendation!.explanation.because.length > 0);
    assert.ok(result.recommendation!.explanation.mustNotSay.length >= 3);
    assert.equal(result.trace.objective, PRACTICE_IMPROVEMENT_OBJECTIVE);
    const stages = result.trace.stages.map((s) => s.stage);
    assert.ok(stages.includes("observe"));
    assert.ok(stages.includes("understand"));
    assert.ok(stages.includes("detect_situation"));
    assert.ok(stages.includes("identify_opportunity_or_risk"));
    assert.ok(stages.includes("evaluate_impact"));
    assert.ok(stages.includes("recommend"));
    assert.ok(stages.includes("explain"));
    assert.ok(result.impactEvaluation);
    assert.equal(result.impactEvaluation!.shouldSurface, true);
    assert.equal(result.impactEvaluation!.changesDecision, true);
    assert.ok(result.impactEvaluation!.recipient);
    assert.ok(["interrupt", "notify", "queue"].includes(result.impactEvaluation!.interruption));
    assert.ok(result.recommendation!.impact);
  });

  test("cancellation event uses operating domain — not PMS schedule mirror", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(baseEvent());

    assert.equal(result.domain, "operating");
    assert.ok(["action", "recommend"].includes(result.disposition));
    assert.ok(result.recommendation);
    assert.match(result.recommendation!.recommendedNextStep, /waitlist/i);
    assert.ok(!looksLikePmsDuplicate(result.recommendation!.recommendedNextStep));
    assert.ok(result.impactEvaluation?.shouldSurface);
    assert.equal(result.impactEvaluation?.recipient, "front_desk");
  });

  test("suppresses when equivalent Action already open — no decision change", () => {
    const engine = new PracticeImprovementEngine();
    const event = baseEvent({ id: "evt_dup" });
    const first = engine.processEvent(event);
    assert.ok(first.impactEvaluation?.dedupeKey);

    const second = engine.processEvent(event, {
      openActionKeys: new Set([first.impactEvaluation!.dedupeKey]),
    });
    assert.equal(second.disposition, "ignore");
    assert.ok(second.impactEvaluation);
    assert.equal(second.impactEvaluation!.changesDecision, false);
    assert.equal(second.impactEvaluation!.shouldSurface, false);
    assert.match(second.silencedReason || "", /would not change a decision|already open/i);
  });

  test("lab not_received uses supply domain", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      baseEvent({
        id: "evt_lab_1",
        source: "lab",
        eventType: "lab_status_changed",
        uncertainty: { confidence: 0.9 },
        routing: {
          owner: "assistant",
          urgencyTier: "important",
          recommendedNextStep: "Confirm lab case before crown seat at 11 AM",
        },
        payload: { status: "not_received", procedure: "crown_seat" },
      })
    );

    assert.equal(result.domain, "supply");
    assert.ok(["action", "recommend"].includes(result.disposition));
    assert.equal(result.opportunityOrRisk?.kind, "risk");
  });

  test("routine lab received stays silent", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      baseEvent({
        id: "evt_lab_ok",
        source: "lab",
        eventType: "lab_status_changed",
        uncertainty: { confidence: 0.95 },
        routing: undefined,
        payload: { status: "received" },
      })
    );

    assert.equal(result.disposition, "ignore");
    assert.ok(result.silencedReason);
  });

  test("PMS schedule-mirror recommendation is ignored", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      baseEvent({
        id: "evt_mirror",
        eventType: "schedule_conflict_detected",
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "Show today's full schedule on the operatory board",
        },
        uncertainty: { confidence: 0.9 },
      })
    );

    assert.equal(result.disposition, "ignore");
    assert.match(result.silencedReason || "", /PMS|duplicate|silent/i);
  });

  test("low-confidence informational call stays quiet", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      baseEvent({
        id: "evt_quiet",
        source: "call",
        eventType: "call_completed",
        uncertainty: { confidence: 0.55 },
        routing: {
          owner: "front_desk",
          urgencyTier: "informational",
          recommendedNextStep: "Maybe mention the call in passing",
        },
        payload: {
          schema: "call_summary/v1",
          summaryId: "sum_1",
          intent: "general_question",
          urgency: "routine",
          afterHours: false,
          sameDayEmergency: false,
          completenessScore: 0.9,
        },
      })
    );

    assert.ok(
      result.disposition === "ignore" || result.disposition === "defer",
      `expected silence, got ${result.disposition}`
    );
  });
});

describe("Practice Improvement Engine — outcome and learn", () => {
  test("recordOutcome produces learning observation without autonomous change", () => {
    resetPracticeImprovementEngineRegistry();
    const engine = getPracticeImprovementEngine("practice_test");
    const event = baseEvent();
    const result = engine.processEvent(event);
    assert.ok(result.recommendation);

    const { outcome, learning } = engine.recordOutcome({
      practiceId: "practice_test",
      recommendationId: result.recommendation!.id,
      actionId: result.recommendation!.action?.id,
      status: "accepted",
      improvedPractice: true,
    });

    assert.equal(outcome.status, "accepted");
    assert.ok(learning);
    assert.equal(learning!.stage, "observation");
    assert.equal(engine.listLearnings("practice_test").length, 1);
  });

  test("dismissal feeds calibration learning signal", () => {
    const engine = new PracticeImprovementEngine();
    const { learning } = engine.recordOutcome({
      practiceId: "practice_test",
      recommendationId: "imp_x",
      status: "dismissed",
      reason: "Already handled in PMS",
    });
    assert.ok(learning);
    assert.equal(learning!.category, "recommendation_dismissal");
  });
});

describe("Practice Improvement Engine — batch quiet-by-default", () => {
  test("processBatch separates surfaced from silenced", () => {
    const engine = new PracticeImprovementEngine();
    const events: OperationalEvent[] = [
      baseEvent({ id: "evt_a" }),
      baseEvent({
        id: "evt_b",
        source: "lab",
        eventType: "lab_status_changed",
        routing: undefined,
        payload: { status: "received" },
        uncertainty: { confidence: 0.95 },
      }),
    ];
    const batch = engine.processBatch(events);
    assert.equal(batch.results.length, 2);
    assert.ok(batch.surfaced.length >= 1);
    assert.ok(batch.silenced.length >= 1);
  });
});
