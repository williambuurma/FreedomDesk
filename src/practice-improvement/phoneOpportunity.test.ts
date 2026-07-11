/**
 * Phone Opportunity Recovery — ranking, suppression, pipeline, outcomes, learning.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PracticeImprovementEngine,
  assessPhoneOpportunity,
  buildDemoInsurancePayload,
  buildDemoIllegitimateRevenuePayload,
  buildDemoLanguageBarrierPayload,
  buildDemoNewPatientPayload,
  buildDemoNewPatientRecoveryEvent,
  buildDemoPhonePayload,
  buildDemoPhoneRecoveryEvent,
  buildDemoResolvedPayload,
  buildDemoTreatmentPayload,
  buildDemoWeakPayload,
  buildPhonePrimaryAction,
  buildPhoneRecommendationLine,
  buildPhoneSituationLine,
  MIN_PHONE_OPPORTUNITY_SCORE,
  phoneLearningObservation,
  projectDecisionFirst,
  rankPhoneOpportunities,
  scorePhoneOpportunity,
  selectPhoneRecipient,
} from "./index.ts";

describe("Phone Opportunity Recovery — urgent patient-care escalation", () => {
  test("Emily swelling demo surfaces Situation → Recommendation → Call Emily", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoPhoneRecoveryEvent());

    assert.equal(result.domain, "phone");
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.equal(result.situation?.kind, "recoverable_phone_opportunity");
    assert.match(result.situation!.summary, /urgent caller from yesterday/i);
    assert.match(result.situation!.summary, /facial swelling|swelling/i);
    assert.match(result.opportunityOrRisk!.description, /Emily Johnson/i);
    assert.match(result.recommendation!.decision, /Call Emily/i);
    assert.equal(result.impactEvaluation?.shouldSurface, true);
    assert.equal(result.impactEvaluation?.recipient, "front_desk");
    assert.ok(["high", "critical"].includes(result.impactEvaluation!.priority));
    assert.ok(["notify", "interrupt", "queue"].includes(result.impactEvaluation!.interruption));

    const card = projectDecisionFirst(result);
    assert.ok(card);
    assert.equal(
      card!.situation,
      "An urgent caller from yesterday reported facial swelling but never scheduled."
    );
    assert.match(card!.recommendation, /Call Emily Johnson first/i);
    assert.match(card!.recommendation, /worsening.*swelling/i);
    assert.match(card!.recommendation, /afternoon/i);
    assert.match(card!.recommendation, /no completed callback/i);
    assert.equal(card!.primaryAction, "Call Emily.");
    assert.equal(card!.subject, "Emily Johnson");
    assert.equal(card!.accent, "urgent");
  });
});

describe("Phone Opportunity Recovery — new-patient scheduling recovery", () => {
  test("Marcus implant consult surfaces a calm business recovery card", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoNewPatientRecoveryEvent());

    assert.equal(result.domain, "phone");
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.equal(result.situation?.kind, "recoverable_phone_opportunity");

    const card = projectDecisionFirst(result);
    assert.ok(card);
    assert.match(card!.situation, /new patient/i);
    assert.match(card!.situation, /implant consult/i);
    assert.match(card!.recommendation, /Marcus Reed/i);
    assert.match(card!.recommendation, /morning/i);
    assert.ok(!/high-value patient/i.test(card!.recommendation));
    assert.equal(card!.primaryAction, "Call Marcus.");
    assert.equal(card!.accent, "opportunity");
  });
});

describe("Phone Opportunity Recovery — treatment, insurance, language", () => {
  test("legitimate treatment opportunity recovers through the pipeline", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoPhoneRecoveryEvent({
        id: "evt_phone_treatment",
        payload: buildDemoTreatmentPayload(),
        subject: {
          patientReferenceId: "pat_ref_sarah_nguyen",
          callId: "call_sarah_crown_001",
        },
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "Call Sarah Nguyen to schedule crown seat",
        },
      })
    );
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.match(result.situation!.summary, /crown seat|treatment/i);
    assert.match(projectDecisionFirst(result)!.primaryAction, /Call Sarah/i);
  });

  test("unresolved insurance question surfaces with verify action", () => {
    const scored = scorePhoneOpportunity(buildDemoInsurancePayload());
    assert.equal(scored.suppressed, false);
    assert.ok(scored.score >= MIN_PHONE_OPPORTUNITY_SCORE);

    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoPhoneRecoveryEvent({
        id: "evt_phone_insurance",
        payload: buildDemoInsurancePayload(),
        subject: {
          patientReferenceId: "pat_ref_james_park",
          callId: "call_insurance_001",
        },
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "Verify Delta Dental PPO benefits for James Park",
        },
      })
    );
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.match(result.situation!.summary, /insurance/i);
    assert.equal(projectDecisionFirst(result)!.primaryAction, "Verify insurance.");
    assert.equal(result.impactEvaluation?.recipient, "front_desk");
  });

  test("language or communication barrier surfaces for front desk ownership", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoPhoneRecoveryEvent({
        id: "evt_phone_language",
        payload: buildDemoLanguageBarrierPayload(),
        subject: {
          patientReferenceId: "pat_ref_ana_ruiz",
          callId: "call_language_001",
        },
        routing: {
          owner: "front_desk",
          urgencyTier: "important",
          recommendedNextStep: "Call Ana Ruiz with Spanish-language scheduling support",
        },
      })
    );
    assert.ok(["action", "recommend"].includes(result.disposition), result.silencedReason);
    assert.match(result.situation!.summary, /language|communication/i);
    assert.equal(result.impactEvaluation?.recipient, "front_desk");
    const card = projectDecisionFirst(result);
    assert.match(card!.recommendation, /communication barrier/i);
  });
});

describe("Phone Opportunity Recovery — suppression and quiet-by-default", () => {
  test("resolved-call suppression", () => {
    const scored = scorePhoneOpportunity(buildDemoResolvedPayload());
    assert.equal(scored.suppressed, true);
    assert.match(scored.suppressReason || "", /resolved|already contacted/i);

    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoPhoneRecoveryEvent({
        id: "evt_phone_resolved",
        payload: buildDemoResolvedPayload(),
      })
    );
    assert.equal(result.disposition, "ignore");
    assert.ok(!result.recommendation);
  });

  test("weak-opportunity suppression", () => {
    const scored = scorePhoneOpportunity(buildDemoWeakPayload());
    assert.equal(scored.suppressed, true);

    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(
      buildDemoPhoneRecoveryEvent({
        id: "evt_phone_weak",
        payload: buildDemoWeakPayload(),
      })
    );
    assert.equal(result.disposition, "ignore");
  });

  test("illegitimate revenue opportunity is suppressed", () => {
    const scored = scorePhoneOpportunity(buildDemoIllegitimateRevenuePayload());
    assert.equal(scored.suppressed, true);
    assert.match(scored.suppressReason || "", /clinical legitimacy/i);
  });

  test("duplicate suppression via openActionKeys", () => {
    const engine = new PracticeImprovementEngine();
    const event = buildDemoPhoneRecoveryEvent({ id: "evt_phone_dup" });
    const first = engine.processEvent(event);
    assert.ok(first.impactEvaluation?.dedupeKey);
    assert.match(first.impactEvaluation!.dedupeKey, /recoverable_phone_opportunity/);

    const second = engine.processEvent(event, {
      openActionKeys: new Set([first.impactEvaluation!.dedupeKey]),
    });
    assert.equal(second.disposition, "ignore");
    assert.equal(second.impactEvaluation?.changesDecision, false);
    assert.equal(second.impactEvaluation?.shouldSurface, false);
  });
});

describe("Phone Opportunity Recovery — ranking, recipient, priority", () => {
  test("candidate ranking prefers urgent clinical over weaker opportunities", () => {
    const ranked = rankPhoneOpportunities([
      buildDemoWeakPayload(),
      buildDemoNewPatientPayload(),
      buildDemoPhonePayload(),
      buildDemoInsurancePayload(),
    ]);
    assert.equal(ranked[0].payload.call.patientDisplayName, "Emily Johnson");
    assert.equal(ranked[0].suppressed, false);
    assert.ok(ranked[0].score >= MIN_PHONE_OPPORTUNITY_SCORE);
    assert.ok(ranked.some((r) => r.suppressed));
  });

  test("recipient selection routes clinical urgency and front-desk work", () => {
    assert.equal(
      selectPhoneRecipient(
        buildDemoPhonePayload({
          opportunityType: "emergency_no_callback",
          suggestedRecipient: "dentist",
        })
      ),
      "dentist"
    );
    assert.equal(selectPhoneRecipient(buildDemoInsurancePayload()), "front_desk");
    assert.equal(selectPhoneRecipient(buildDemoNewPatientPayload()), "front_desk");
    assert.equal(
      selectPhoneRecipient(
        buildDemoLanguageBarrierPayload({ suggestedRecipient: "front_desk" })
      ),
      "front_desk"
    );
  });

  test("priority and interruption level for urgent recovery", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoPhoneRecoveryEvent());
    assert.ok(["high", "critical"].includes(result.impactEvaluation!.priority));
    assert.ok(["notify", "interrupt"].includes(result.impactEvaluation!.interruption));
    assert.equal(result.impactEvaluation?.materialImprovement, true);
    assert.equal(result.impactEvaluation?.changesDecision, true);
  });
});

describe("Phone Opportunity Recovery — outcomes and learning", () => {
  test("accepted begins action without treating opportunity as complete", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoPhoneRecoveryEvent());
    const recommendationId = result.recommendation!.id;

    const accepted = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "accepted",
      improvedPractice: true,
    });
    assert.equal(accepted.outcome.status, "accepted");
    assert.equal(accepted.learning?.category, "recommendation_accepted");
    // Accepted is not terminal completion — completed is a separate outcome.
    assert.notEqual(accepted.outcome.status, "completed");
  });

  test("completed, snoozed, and dismissed feed the learning pipeline", () => {
    const engine = new PracticeImprovementEngine();
    const result = engine.processEvent(buildDemoPhoneRecoveryEvent());
    const recommendationId = result.recommendation!.id;

    const snoozed = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "snoozed",
      reason: "Call after lunch",
    });
    assert.equal(snoozed.outcome.status, "snoozed");
    assert.equal(snoozed.learning, null);

    const dismissed = engine.recordOutcome({
      practiceId: result.practiceId,
      recommendationId,
      status: "dismissed",
      reason: "Patient already scheduled elsewhere",
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

  test("learning signals capture opportunity type and contact preference", () => {
    const payload = buildDemoPhonePayload();
    const learning = phoneLearningObservation(payload, {
      status: "completed",
      improvedPractice: true,
    });
    assert.equal(learning.opportunityType, "urgent_symptoms_unresolved");
    assert.equal(learning.preferredContact, "call");
    assert.equal(learning.recipient, "front_desk");
    assert.equal(learning.conversionSignal, "completed");
    assert.equal(learning.categoryHint, "phone_opportunity_converted");
    assert.equal(learning.improvedPractice, true);

    const dismissed = phoneLearningObservation(payload, {
      status: "dismissed",
      improvedPractice: false,
    });
    assert.equal(dismissed.categoryHint, "phone_opportunity_not_valuable");
  });
});

describe("Phone Opportunity Recovery — copy helpers", () => {
  test("builds the Emily demo Situation → Recommendation → Primary Action lines", () => {
    const payload = buildDemoPhonePayload();
    const assessment = assessPhoneOpportunity(payload);
    assert.equal(assessment.shouldRecommend, true);

    assert.equal(
      buildPhoneSituationLine(payload),
      "An urgent caller from yesterday reported facial swelling but never scheduled."
    );
    assert.match(buildPhoneRecommendationLine(payload), /Emily Johnson first/);
    assert.equal(buildPhonePrimaryAction(payload), "Call Emily.");
  });

  test("builds the Marcus new-patient lines without crude value labels", () => {
    const payload = buildDemoNewPatientPayload();
    assert.match(buildPhoneSituationLine(payload), /implant consult/);
    const rec = buildPhoneRecommendationLine(payload);
    assert.match(rec, /Marcus Reed/);
    assert.ok(!/high-value patient/i.test(rec));
    assert.equal(buildPhonePrimaryAction(payload), "Call Marcus.");
  });
});
