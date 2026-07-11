/**
 * Decision Arbitration — ranking, suppression, escalation, expiration, merging.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PracticeImprovementEngine,
  arbitrateDecisions,
  buildDemoNewPatientRecoveryEvent,
  buildDemoPhonePayload,
  buildDemoPhoneRecoveryEvent,
  buildDemoScheduleOpeningEvent,
  compareArbitrationCandidates,
  DEMO_CANDIDATE_MARIA,
  projectDecisionFirst,
  type ImprovementResult,
} from "./index.ts";

const NOW = "2026-07-10T09:00:00.000Z";

function assertSurfaced(result: ImprovementResult, label: string): ImprovementResult {
  assert.ok(
    ["action", "recommend"].includes(result.disposition),
    `${label} should surface: ${result.silencedReason}`
  );
  assert.ok(result.recommendation, `${label} needs recommendation`);
  assert.ok(result.impactEvaluation, `${label} needs impactEvaluation`);
  return result;
}

function withImpact(
  result: ImprovementResult,
  patch: Partial<NonNullable<ImprovementResult["impactEvaluation"]>>
): ImprovementResult {
  assert.ok(result.impactEvaluation);
  return {
    ...result,
    impactEvaluation: { ...result.impactEvaluation!, ...patch },
    recommendation: result.recommendation
      ? {
          ...result.recommendation,
          impact: { ...result.impactEvaluation!, ...patch },
        }
      : null,
  };
}

describe("Decision Arbitration — ranking", () => {
  test("phone urgent beats schedule fill when both compete for front desk attention", () => {
    const engine = new PracticeImprovementEngine();
    const { arbitration } = engine.processAndArbitrate(
      [buildDemoPhoneRecoveryEvent(), buildDemoScheduleOpeningEvent()],
      { now: NOW, practiceId: "practice_cascade_family_gr", maxSurface: 1 }
    );

    assert.ok(arbitration.primary, "expected a primary decision");
    assert.equal(arbitration.surface.length, 1);
    assert.equal(arbitration.primary!.disposition, "surface");
    assert.equal(arbitration.primary!.rank, 1);
    assert.equal(arbitration.primary!.result.domain, "phone");
    assert.match(
      arbitration.primary!.projection?.primaryAction || "",
      /Call Emily/i
    );

    // Schedule remains available — not discarded.
    const waitingOrEscalated = [
      ...arbitration.waiting,
      ...arbitration.escalated,
    ];
    assert.ok(
      waitingOrEscalated.some((i) => i.result.domain === "operating"),
      "schedule opportunity should wait or escalate, not vanish"
    );
  });

  test("compareArbitrationCandidates prefers higher interruption and priority", () => {
    const engine = new PracticeImprovementEngine();
    const phone = assertSurfaced(
      engine.processEvent(buildDemoPhoneRecoveryEvent()),
      "phone"
    );
    const schedule = assertSurfaced(
      engine.processEvent(buildDemoScheduleOpeningEvent()),
      "schedule"
    );

    const critical = withImpact(schedule, {
      priority: "critical",
      interruption: "interrupt",
    });
    assert.ok(compareArbitrationCandidates(critical, phone) > 0);
  });
});

describe("Decision Arbitration — suppression", () => {
  test("duplicate dedupeKey suppresses the weaker copy", () => {
    const engine = new PracticeImprovementEngine();
    const first = assertSurfaced(
      engine.processEvent(buildDemoPhoneRecoveryEvent()),
      "first"
    );
    const second = assertSurfaced(
      engine.processEvent(
        buildDemoPhoneRecoveryEvent({ id: "evt_phone_emily_dup" })
      ),
      "second"
    );

    // Force identical dedupe keys (same opportunity, two pipeline runs).
    const key = first.impactEvaluation!.dedupeKey;
    const a = withImpact(first, { dedupeKey: key });
    const b = withImpact(second, { dedupeKey: key });

    const arbitration = arbitrateDecisions([a, b], {
      practiceId: first.practiceId,
      now: NOW,
      maxSurface: 1,
    });

    assert.equal(arbitration.surface.length, 1);
    assert.equal(arbitration.suppressed.length, 1);
    assert.equal(arbitration.suppressed[0].disposition, "suppress");
    assert.match(arbitration.suppressed[0].reason, /duplicate/i);
    assert.equal(
      arbitration.suppressed[0].relatedIds[0],
      arbitration.primary!.result.recommendation!.id
    );
  });
});

describe("Decision Arbitration — merging", () => {
  test("same patient + recipient across phone and schedule merges into the stronger card", () => {
    const engine = new PracticeImprovementEngine();

    // Phone recovery for Maria — same patient as the schedule fill.
    const phoneForMaria = assertSurfaced(
      engine.processEvent(
        buildDemoPhoneRecoveryEvent({
          id: "evt_phone_maria_crown",
          payload: buildDemoPhonePayload({
            opportunityType: "treatment_unscheduled",
            call: {
              callId: "call_maria_crown_001",
              displayWhen: "yesterday",
              patientDisplayName: "Maria Lopez",
              patientReferenceId: DEMO_CANDIDATE_MARIA.patientReferenceId,
              intent: "treatment",
              patientNeed: "unscheduled crown seat",
              preferredTime: "a morning visit",
              appointmentType: "crown_seat",
            },
            clinicalUrgency: "medium",
            careDelayed: false,
            suggestedAction: "Call",
          }),
          subject: {
            patientReferenceId: DEMO_CANDIDATE_MARIA.patientReferenceId,
            callId: "call_maria_crown_001",
          },
        })
      ),
      "phone-maria"
    );

    const schedule = assertSurfaced(
      engine.processEvent(buildDemoScheduleOpeningEvent()),
      "schedule"
    );

    assert.equal(
      phoneForMaria.situation?.subject?.patientReferenceId,
      schedule.situation?.subject?.patientReferenceId
    );
    assert.equal(
      phoneForMaria.impactEvaluation?.recipient,
      schedule.impactEvaluation?.recipient
    );

    const arbitration = arbitrateDecisions([phoneForMaria, schedule], {
      practiceId: phoneForMaria.practiceId,
      now: NOW,
      maxSurface: 1,
    });

    assert.equal(arbitration.surface.length, 1);
    assert.equal(arbitration.merged.length, 1);
    assert.equal(arbitration.merged[0].disposition, "merge");
    assert.match(arbitration.merged[0].reason, /same patient and recipient/i);
    assert.equal(
      arbitration.merged[0].relatedIds[0],
      arbitration.primary!.result.recommendation!.id
    );
  });
});

describe("Decision Arbitration — expiration", () => {
  test("expired outcome removes a recommendation from contention", () => {
    const engine = new PracticeImprovementEngine();
    const phone = assertSurfaced(
      engine.processEvent(buildDemoPhoneRecoveryEvent()),
      "phone"
    );
    const schedule = assertSurfaced(
      engine.processEvent(buildDemoScheduleOpeningEvent()),
      "schedule"
    );

    engine.recordOutcome({
      practiceId: phone.practiceId,
      recommendationId: phone.recommendation!.id,
      status: "expired",
      reason: "Caller already scheduled elsewhere",
      recordedAt: NOW,
    });

    const arbitration = engine.arbitrate([phone, schedule], {
      practiceId: phone.practiceId,
      now: NOW,
      maxSurface: 1,
    });

    assert.equal(arbitration.expired.length, 1);
    assert.equal(arbitration.expired[0].result.recommendation!.id, phone.recommendation!.id);
    assert.equal(arbitration.primary!.result.domain, "operating");
    assert.match(arbitration.primary!.projection?.primaryAction || "", /Call Maria/i);
  });

  test("stale event beyond urgency window expires", () => {
    const engine = new PracticeImprovementEngine();
    const stale = assertSurfaced(
      engine.processEvent(
        buildDemoNewPatientRecoveryEvent({
          timestamp: "2026-06-01T08:00:00.000Z",
        })
      ),
      "stale"
    );

    const arbitration = arbitrateDecisions([stale], {
      practiceId: stale.practiceId,
      now: NOW,
      maxSurface: 1,
    });

    assert.equal(arbitration.expired.length, 1);
    assert.equal(arbitration.primary, null);
    assert.equal(arbitration.surface.length, 0);
    assert.match(arbitration.expired[0].reason, /Expired after/i);
  });
});

describe("Decision Arbitration — escalation", () => {
  test("interrupt-tier loser escalates instead of quietly waiting", () => {
    const engine = new PracticeImprovementEngine();
    const phone = assertSurfaced(
      engine.processEvent(buildDemoPhoneRecoveryEvent()),
      "phone"
    );
    const schedule = assertSurfaced(
      engine.processEvent(buildDemoScheduleOpeningEvent()),
      "schedule"
    );

    const a = withImpact(phone, {
      priority: "critical",
      interruption: "interrupt",
    });
    const b = withImpact(schedule, {
      priority: "critical",
      interruption: "interrupt",
    });

    const arbitration = arbitrateDecisions([a, b], {
      practiceId: phone.practiceId,
      now: NOW,
      maxSurface: 1,
      maxInterrupts: 1,
    });

    assert.equal(arbitration.surface.length, 1);
    assert.equal(arbitration.escalated.length, 1);
    assert.equal(arbitration.escalated[0].disposition, "escalate");
    assert.match(arbitration.escalated[0].reason, /Escalated/i);
    assert.ok(arbitration.escalated[0].projection);
  });
});

describe("Decision Arbitration — attention protection", () => {
  test("never surfaces more than maxSurface competing cards", () => {
    const engine = new PracticeImprovementEngine();
    const { arbitration } = engine.processAndArbitrate(
      [
        buildDemoPhoneRecoveryEvent(),
        buildDemoScheduleOpeningEvent(),
        buildDemoNewPatientRecoveryEvent(),
      ],
      { now: NOW, practiceId: "practice_cascade_family_gr", maxSurface: 1 }
    );

    assert.equal(arbitration.surface.length, 1);
    assert.ok(arbitration.primary);
    const held =
      arbitration.waiting.length +
      arbitration.escalated.length +
      arbitration.merged.length +
      arbitration.suppressed.length +
      arbitration.expired.length;
    assert.ok(held >= 2, "remaining recommendations stay available or resolved");

    const card = projectDecisionFirst(arbitration.primary!.result);
    assert.ok(card);
    assert.ok(card!.primaryAction);
  });

  test("empty input yields empty arbitration", () => {
    const arbitration = arbitrateDecisions([], {
      practiceId: "practice_cascade_family_gr",
      now: NOW,
    });
    assert.equal(arbitration.primary, null);
    assert.equal(arbitration.items.length, 0);
  });
});
