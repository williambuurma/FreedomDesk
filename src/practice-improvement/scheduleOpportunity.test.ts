/**
 * Recoverable Schedule Opportunity — ranking, suppression, pipeline, outcomes.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PracticeImprovementEngine,
  assessScheduleOpportunity,
  buildDemoScheduleOpeningEvent,
  buildDemoSchedulePayload,
  buildPrimaryAction,
  buildRecommendationLine,
  buildSituationLine,
  DEMO_CANDIDATE_MARIA,
  MIN_CANDIDATE_SCORE,
  projectDecisionFirst,
  rankCandidates,
  scoreCandidate,
} from "./index.ts";
import {
  DEMO_CANDIDATE_PROVIDER_MISMATCH,
  DEMO_CANDIDATE_SECONDARY,
  DEMO_CANDIDATE_UNVERIFIED,
  DEMO_CANDIDATE_WEAK_DURATION,
} from "./fixtures/recoverableScheduleOpportunity.ts";

describe("Recoverable Schedule Opportunity — candidate ranking", () => {
  test("ranks Maria Lopez first for the 60-minute morning doctor opening", () => {
    const payload = buildDemoSchedulePayload();
    const ranked = rankCandidates(payload.opening, payload.candidates);

    assert.equal(ranked[0].candidate.displayName, "Maria Lopez");
    assert.equal(ranked[0].suppressed, false);
    assert.ok(ranked[0].score >= MIN_CANDIDATE_SCORE);
    assert.ok(ranked[0].reasons.some((r) => /fits/i.test(r)));
    assert.ok(ranked[0].reasons.some((r) => /verified|benefits/i.test(r)));
    assert.ok(ranked[0].reasons.some((r) => /morning|requested/i.test(r)));

    const mariaAboveSarah =
      ranked.find((r) => r.candidate.displayName === "Maria Lopez")!.score >
      ranked.find((r) => r.candidate.displayName === "Sarah Nguyen")!.score;
    assert.equal(mariaAboveSarah, true);
  });

  test("suppresses duration mismatch, provider mismatch, and weak unverified matches", () => {
    const opening = buildDemoSchedulePayload().opening;

    const tooLong = scoreCandidate(opening, DEMO_CANDIDATE_WEAK_DURATION);
    assert.equal(tooLong.suppressed, true);
    assert.match(tooLong.suppressReason || "", /90|duration|min/i);

    const wrongProvider = scoreCandidate(opening, DEMO_CANDIDATE_PROVIDER_MISMATCH);
    assert.equal(wrongProvider.suppressed, true);
    assert.match(wrongProvider.suppressReason || "", /provider/i);

    const weak = scoreCandidate(opening, DEMO_CANDIDATE_UNVERIFIED);
    assert.equal(weak.suppressed, true);
  });

  test("assessScheduleOpportunity selects one best candidate", () => {
    const assessment = assessScheduleOpportunity(buildDemoSchedulePayload());
    assert.equal(assessment.meaningfulOpening, true);
    assert.equal(assessment.shouldRecommend, true);
    assert.equal(assessment.best?.candidate.displayName, "Maria Lopez");
  });

  test("short openings are not meaningful", () => {
    const assessment = assessScheduleOpportunity(
      buildDemoSchedulePayload({
        opening: {
          slotId: "slot_short",
          displayWhen: "today at 3:00 PM",
          durationMinutes: 20,
        },
      })
    );
    assert.equal(assessment.meaningfulOpening, false);
    assert.equal(assessment.shouldRecommend, false);
  });
});

describe("Recoverable Schedule Opportunity — PIE pipeline", () => {
  test("demo fixture surfaces Situation → Recommendation → Call Maria", () => {
    const engine = new PracticeImprovementEngine();
    const event = buildDemoScheduleOpeningEvent();
    const result = engine.processEvent(event);

    assert.equal(result.domain, "operating");
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.equal(result.situation?.kind, "recoverable_schedule_opportunity");
    assert.match(result.situation!.summary, /60-minute opening/i);
    assert.match(result.situation!.summary, /10:30/i);
    assert.match(result.opportunityOrRisk!.description, /Maria Lopez/i);
    assert.match(result.recommendation!.decision, /Call Maria/i);
    assert.equal(result.impactEvaluation?.shouldSurface, true);
    assert.equal(result.impactEvaluation?.recipient, "front_desk");
    assert.equal(result.impactEvaluation?.priority, "high");
    assert.ok(["notify", "interrupt", "queue"].includes(result.impactEvaluation!.interruption));

    const card = projectDecisionFirst(result);
    assert.ok(card);
    assert.match(card!.situation, /60-minute opening became available tomorrow at 10:30 AM/i);
    assert.match(card!.recommendation, /Maria Lopez/);
    assert.match(card!.recommendation, /unscheduled crown/i);
    assert.match(card!.recommendation, /fits|verified|morning|requested/i);
    assert.equal(card!.primaryAction, "Call Maria.");
    assert.equal(card!.subject, "Maria Lopez");
    assert.equal(card!.accent, "opportunity");
    assert.match(
      card!.recommendation,
      /Offer it to Maria Lopez for her unscheduled crown because the procedure fits, benefits are verified, and she previously requested a morning appointment\./
    );  });

  test("suppresses when no candidate clears the ranking floor", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoScheduleOpeningEvent({
        id: "evt_no_fit",
        payload: buildDemoSchedulePayload({
          candidates: [
            DEMO_CANDIDATE_WEAK_DURATION,
            DEMO_CANDIDATE_PROVIDER_MISMATCH,
            DEMO_CANDIDATE_UNVERIFIED,
          ],
        }),
        subject: { patientReferenceId: "pat_none" },
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "No strong waitlist match for this opening",
        },
      })
    );

    assert.equal(result.disposition, "ignore");
    assert.ok(!result.recommendation);
  });

  test("deduplicates when equivalent Action already open", () => {
    const engine = new PracticeImprovementEngine();
    const event = buildDemoScheduleOpeningEvent({ id: "evt_rso_dup" });
    const first = engine.processEvent(event);
    assert.ok(first.impactEvaluation?.dedupeKey);
    assert.match(first.impactEvaluation!.dedupeKey, /recoverable_schedule_opportunity/);

    const second = engine.processEvent(event, {
      openActionKeys: new Set([first.impactEvaluation!.dedupeKey]),
    });
    assert.equal(second.disposition, "ignore");
    assert.equal(second.impactEvaluation?.changesDecision, false);
    assert.equal(second.impactEvaluation?.shouldSurface, false);
  });

  test("priority stays high for material recoverable openings", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoScheduleOpeningEvent());
    assert.equal(result.impactEvaluation?.priority, "high");
    assert.equal(result.opportunityOrRisk?.estimatedImpact, "high");
    assert.equal(result.impactEvaluation?.materialImprovement, true);
    assert.equal(result.impactEvaluation?.changesDecision, true);
  });

  test("generic cancellation without candidates still uses cancellation_recovery", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoScheduleOpeningEvent({
        id: "evt_generic_cancel",
        payload: { slotId: "slot_hyg", appointmentType: "hygiene" },
        subject: { patientReferenceId: "pat_ref_lisa" },
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "Offer waitlist for open hygiene slot",
        },
      })
    );
    assert.equal(result.situation?.kind, "cancellation_recovery");
    assert.ok(["action", "recommend"].includes(result.disposition));
  });
});

describe("Recoverable Schedule Opportunity — outcome recording", () => {
  test("accepted, deferred, dismissed, and completed feed the learning pipeline", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoScheduleOpeningEvent());
    assert.ok(result.recommendation);
    const recommendationId = result.recommendation!.id;

    const accepted = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "accepted",
      improvedPractice: true,
    });
    assert.equal(accepted.outcome.status, "accepted");
    assert.equal(accepted.learning?.category, "recommendation_accepted");

    const deferred = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "snoozed",
      reason: "Call after lunch",
    });
    assert.equal(deferred.outcome.status, "snoozed");
    assert.equal(deferred.learning, null);

    const dismissed = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "dismissed",
      reason: "Patient already booked elsewhere",
    });
    assert.equal(dismissed.learning?.category, "recommendation_dismissal");

    const completed = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "completed",
      improvedPractice: true,
    });
    assert.equal(completed.learning?.category, "recommendation_accepted");
  });
});

describe("Recoverable Schedule Opportunity — copy helpers", () => {
  test("builds the demo Situation → Recommendation → Primary Action lines", () => {
    const payload = buildDemoSchedulePayload();
    const ranked = scoreCandidate(payload.opening, DEMO_CANDIDATE_MARIA);
    assert.equal(ranked.suppressed, false);

    assert.equal(
      buildSituationLine(payload.opening),
      "A 60-minute opening became available tomorrow at 10:30 AM."
    );
    assert.match(buildRecommendationLine(payload.opening, ranked), /Maria Lopez/);
    assert.equal(buildPrimaryAction(DEMO_CANDIDATE_MARIA), "Call Maria.");
    assert.ok(DEMO_CANDIDATE_SECONDARY.displayName);
  });
});
