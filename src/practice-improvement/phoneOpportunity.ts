/**
 * Phone Opportunity Recovery — assess unresolved calls for material follow-up.
 *
 * Runs inside the Practice Improvement Engine (phone domain).
 * Does not create a parallel reasoning path.
 *
 * Evaluates: patient need, resolution quality, clinical urgency, conversion
 * likelihood, care delay, legitimate revenue/schedule impact, recipient,
 * interruption worth, and a single next action.
 */

import type { OwnerRole } from "../practice-brain/types.ts";
import type { UrgencyTier } from "../events/types.ts";
import type {
  DecisionFirstProjection,
  ImprovementResult,
  OutcomeStatus,
} from "./types.ts";

/** Minimum score to surface a phone recovery recommendation. */
export const MIN_PHONE_OPPORTUNITY_SCORE = 70;

export type PhoneOpportunityType =
  | "new_patient_unscheduled"
  | "emergency_no_callback"
  | "urgent_symptoms_unresolved"
  | "treatment_unscheduled"
  | "diagnosed_treatment_lost"
  | "insurance_unresolved"
  | "voicemail_follow_up"
  | "cancellation_callback"
  | "preferred_time_available"
  | "recall_overdue"
  | "financial_barrier"
  | "communication_barrier"
  | "incomplete_resolution";

export type ResolutionQuality =
  | "resolved"
  | "partial"
  | "unresolved"
  | "abandoned"
  | "transferred_incomplete";

export type ClinicalUrgency = "critical" | "high" | "medium" | "low" | "none";
export type ConversionLikelihood = "high" | "medium" | "low";
export type ProductionImpact = "high" | "medium" | "low" | "none";
export type PreferredContact = "call" | "message";
export type PhoneActionVerb =
  | "Call"
  | "Message"
  | "Review call"
  | "Verify insurance"
  | "Escalate"
  | "Reserve opening"
  | "Mark resolved";

export interface PhoneCallContext {
  callId: string;
  /** Human-readable when, e.g. "yesterday" */
  displayWhen: string;
  patientDisplayName: string;
  patientReferenceId: string;
  intent: string;
  /** Short clinical / request summary for copy */
  patientNeed: string;
  symptoms?: string[];
  preferredTime?: string;
  appointmentType?: string;
}

export interface PhoneOpportunityPayload {
  schema: "phone_opportunity/v1";
  opportunityType: PhoneOpportunityType;
  call: PhoneCallContext;
  resolutionQuality: ResolutionQuality;
  clinicalUrgency: ClinicalUrgency;
  careDelayed: boolean;
  revenueRecoverable: boolean;
  /** False when revenue signal is not clinically appropriate — suppress. */
  clinicallyLegitimate: boolean;
  conversionLikelihood: ConversionLikelihood;
  estimatedProductionImpact: ProductionImpact;
  scheduleRecoveryPotential: boolean;
  barriers: string[];
  preferredContact: PreferredContact;
  alreadyContacted: boolean;
  hoursSinceCall: number;
  suggestedRecipient: OwnerRole;
  suggestedAction: PhoneActionVerb;
  notes?: string;
}

export interface ScoredPhoneOpportunity {
  payload: PhoneOpportunityPayload;
  score: number;
  reasons: string[];
  suppressed: boolean;
  suppressReason?: string;
  recipient: OwnerRole;
  urgencyTier: UrgencyTier;
  interruptionHint: "none" | "queue" | "notify" | "interrupt";
}

export interface PhoneOpportunityAssessment {
  meaningful: boolean;
  reason: string;
  scored: ScoredPhoneOpportunity;
  shouldRecommend: boolean;
}

/** Structured learning observation — workflow patterns only, not personal profiling. */
export interface PhoneLearningObservation {
  opportunityType: PhoneOpportunityType;
  preferredContact: PreferredContact;
  hoursSinceCall: number;
  recipient: OwnerRole;
  outcomeStatus: OutcomeStatus;
  barriers: string[];
  conversionSignal: "accepted" | "completed" | "dismissed" | "snoozed" | "other";
  improvedPractice?: boolean;
  categoryHint: string;
}

export function isPhoneOpportunityPayload(
  payload: unknown
): payload is PhoneOpportunityPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p.schema === "phone_opportunity/v1" &&
    typeof p.opportunityType === "string" &&
    typeof p.call === "object" &&
    p.call !== null &&
    typeof p.resolutionQuality === "string"
  );
}

export function selectPhoneRecipient(
  payload: PhoneOpportunityPayload
): OwnerRole {
  if (payload.suggestedRecipient) return payload.suggestedRecipient;

  switch (payload.opportunityType) {
    case "emergency_no_callback":
    case "urgent_symptoms_unresolved":
      return "dentist";
    case "insurance_unresolved":
    case "new_patient_unscheduled":
    case "treatment_unscheduled":
    case "voicemail_follow_up":
    case "cancellation_callback":
    case "preferred_time_available":
    case "recall_overdue":
    case "financial_barrier":
    case "communication_barrier":
    case "diagnosed_treatment_lost":
    case "incomplete_resolution":
      return "front_desk";
    default:
      return "front_desk";
  }
}

function urgencyTierFromPayload(payload: PhoneOpportunityPayload): UrgencyTier {
  if (
    payload.clinicalUrgency === "critical" ||
    payload.opportunityType === "emergency_no_callback"
  ) {
    return "critical";
  }
  if (
    payload.clinicalUrgency === "high" ||
    payload.opportunityType === "urgent_symptoms_unresolved" ||
    payload.careDelayed
  ) {
    return "important";
  }
  if (
    payload.opportunityLikelihood === "high" ||
    payload.estimatedProductionImpact === "high" ||
    payload.opportunityType === "new_patient_unscheduled" ||
    payload.opportunityType === "treatment_unscheduled" ||
    payload.opportunityType === "insurance_unresolved"
  ) {
    return "important";
  }
  return "informational";
}

function interruptionHint(
  payload: PhoneOpportunityPayload,
  urgencyTier: UrgencyTier,
  score: number
): ScoredPhoneOpportunity["interruptionHint"] {
  if (urgencyTier === "critical") return "interrupt";
  if (urgencyTier === "important" && score >= MIN_PHONE_OPPORTUNITY_SCORE) {
    return payload.clinicalUrgency === "high" || payload.careDelayed
      ? "notify"
      : "notify";
  }
  if (score >= MIN_PHONE_OPPORTUNITY_SCORE) return "queue";
  return "none";
}

/**
 * Score one unresolved phone opportunity.
 * Hard suppressions return suppressed=true with score 0.
 */
export function scorePhoneOpportunity(
  payload: PhoneOpportunityPayload
): ScoredPhoneOpportunity {
  const recipient = selectPhoneRecipient(payload);
  const reasons: string[] = [];

  if (payload.resolutionQuality === "resolved") {
    return {
      payload,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: "Call already resolved appropriately",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  if (payload.alreadyContacted) {
    return {
      payload,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: "Patient already contacted — duplicate callback",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  if (payload.revenueRecoverable && !payload.clinicallyLegitimate) {
    return {
      payload,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: "Revenue signal without clinical legitimacy",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  if (!payload.call.patientDisplayName?.trim() || !payload.call.patientNeed?.trim()) {
    return {
      payload,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: "Insufficient evidence for a clear next action",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  let score = 35;
  reasons.push("Unresolved phone opportunity with a clear patient need");

  // Clinical urgency and safety
  if (payload.clinicalUrgency === "critical") {
    score += 30;
    reasons.push("Clinical urgency is critical");
  } else if (payload.clinicalUrgency === "high") {
    score += 22;
    reasons.push("Clinical urgency is high");
  } else if (payload.clinicalUrgency === "medium") {
    score += 10;
  } else if (payload.clinicalUrgency === "low") {
    score += 2;
  }

  // Time since call — fresher unresolved care matters more
  if (payload.hoursSinceCall <= 4) {
    score += 12;
    reasons.push("Call is recent");
  } else if (payload.hoursSinceCall <= 24) {
    score += 10;
    reasons.push("Call was within the last day");
  } else if (payload.hoursSinceCall <= 48) {
    score += 6;
  } else if (payload.hoursSinceCall > 72) {
    score -= 8;
    reasons.push("Opportunity is aging");
  }

  if (payload.careDelayed) {
    score += 12;
    reasons.push("Care may have been delayed");
  }

  // Conversion / schedule recovery
  if (payload.conversionLikelihood === "high") {
    score += 12;
    reasons.push("Patient is likely to schedule");
  } else if (payload.conversionLikelihood === "medium") {
    score += 6;
  } else {
    score -= 8;
  }

  if (payload.scheduleRecoveryPotential) {
    score += 8;
    reasons.push("Schedule recovery potential");
  }

  // Legitimate production impact (never alone)
  if (payload.clinicallyLegitimate && payload.estimatedProductionImpact === "high") {
    score += 8;
    reasons.push("Legitimate high production impact");
  } else if (
    payload.clinicallyLegitimate &&
    payload.estimatedProductionImpact === "medium"
  ) {
    score += 4;
  }

  // Barriers — actionable barriers raise priority; vague ones do not
  if (payload.barriers.includes("language") || payload.barriers.includes("communication")) {
    score += 6;
    reasons.push("Communication barrier needs ownership");
  }
  if (payload.barriers.includes("insurance")) {
    score += 5;
    reasons.push("Insurance question may block scheduling");
  }
  if (payload.barriers.includes("financial") || payload.barriers.includes("financing")) {
    score += 4;
    reasons.push("Financial hesitation may need a phased-care conversation");
  }
  if (payload.barriers.includes("anxiety") || payload.barriers.includes("transportation")) {
    score += 3;
  }

  // Weak speculative opportunities
  const weakSpeculative =
    payload.clinicalUrgency === "none" &&
    payload.conversionLikelihood === "low" &&
    payload.estimatedProductionImpact === "none" &&
    !payload.careDelayed;

  if (weakSpeculative) {
    return {
      payload,
      score: Math.max(0, score),
      reasons,
      suppressed: true,
      suppressReason: "Weak or speculative opportunity",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  // Low-value informational
  if (
    payload.opportunityType === "incomplete_resolution" &&
    payload.clinicalUrgency === "none" &&
    payload.conversionLikelihood === "low" &&
    score < MIN_PHONE_OPPORTUNITY_SCORE
  ) {
    return {
      payload,
      score,
      reasons,
      suppressed: true,
      suppressReason: "Low-value informational call",
      recipient,
      urgencyTier: urgencyTierFromPayload(payload),
      interruptionHint: "none",
    };
  }

  const urgencyTier = urgencyTierFromPayload(payload);

  if (score < MIN_PHONE_OPPORTUNITY_SCORE) {
    return {
      payload,
      score,
      reasons,
      suppressed: true,
      suppressReason: `Score ${score} below surface threshold ${MIN_PHONE_OPPORTUNITY_SCORE}`,
      recipient,
      urgencyTier,
      interruptionHint: "none",
    };
  }

  return {
    payload,
    score,
    reasons,
    suppressed: false,
    recipient,
    urgencyTier,
    interruptionHint: interruptionHint(payload, urgencyTier, score),
  };
}

/** Rank multiple phone opportunities — clinical urgency and score first. */
export function rankPhoneOpportunities(
  payloads: PhoneOpportunityPayload[]
): ScoredPhoneOpportunity[] {
  return payloads
    .map((p) => scorePhoneOpportunity(p))
    .sort((a, b) => {
      if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
      const urgencyRank = (t: UrgencyTier) =>
        t === "critical" ? 0 : t === "important" ? 1 : 2;
      const ur = urgencyRank(a.urgencyTier) - urgencyRank(b.urgencyTier);
      if (ur !== 0) return ur;
      return b.score - a.score;
    });
}

export function assessPhoneOpportunity(
  payload: PhoneOpportunityPayload
): PhoneOpportunityAssessment {
  const scored = scorePhoneOpportunity(payload);
  if (scored.suppressed) {
    return {
      meaningful: false,
      reason: scored.suppressReason || "Suppressed",
      scored,
      shouldRecommend: false,
    };
  }
  return {
    meaningful: true,
    reason: scored.reasons[0] || "Material phone recovery opportunity",
    scored,
    shouldRecommend: true,
  };
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function buildPhoneSituationLine(payload: PhoneOpportunityPayload): string {
  const when = payload.call.displayWhen || "recently";
  const name = payload.call.patientDisplayName;

  switch (payload.opportunityType) {
    case "emergency_no_callback":
    case "urgent_symptoms_unresolved": {
      const raw = payload.call.symptoms?.[0] || "";
      const symptom =
        raw.replace(/^worsening\s+/i, "").trim() ||
        (payload.clinicalUrgency === "high" || payload.clinicalUrgency === "critical"
          ? "urgent symptoms"
          : "a concern");
      return `An urgent caller from ${when} reported ${symptom} but never scheduled.`;
    }
    case "new_patient_unscheduled":
      return `A new patient interested in ${payload.call.appointmentType || "a visit"} called ${when} but did not schedule.`;
    case "treatment_unscheduled":
    case "diagnosed_treatment_lost":
      return `An existing patient called about ${payload.call.appointmentType || "treatment"} ${when}, but no appointment was made.`;
    case "insurance_unresolved":
      return `A caller from ${when} still has an unresolved insurance question that may prevent scheduling.`;
    case "voicemail_follow_up":
      return `A voicemail from ${when} still needs a callback.`;
    case "cancellation_callback":
      return `A cancellation from ${when} created a callback opportunity that is still open.`;
    case "preferred_time_available":
      return `${name} asked for a preferred time that later became available.`;
    case "recall_overdue":
      return `A recall or overdue-care need was discovered on a call from ${when}.`;
    case "financial_barrier":
      return `A patient expressed financial hesitation on a call from ${when} and may benefit from a careful follow-up.`;
    case "communication_barrier":
      return `A language or communication barrier prevented completing a call from ${when}.`;
    case "incomplete_resolution":
    default:
      return `A call from ${when} ended without a clear resolution for ${name}.`;
  }
}

export function buildPhoneRecommendationLine(
  payload: PhoneOpportunityPayload
): string {
  const name = payload.call.patientDisplayName;
  const bits: string[] = [];

  if (payload.call.symptoms?.length) {
    bits.push(
      payload.call.symptoms.length === 1
        ? `reported ${payload.call.symptoms[0]}`
        : `reported ${payload.call.symptoms.slice(0, 2).join(" and ")}`
    );
  } else if (payload.call.patientNeed && payload.opportunityType !== "new_patient_unscheduled") {
    bits.push(payload.call.patientNeed.replace(/\.+$/, "").replace(/^she |^he |^they /i, ""));
  }

  if (payload.call.preferredTime) {
    bits.push(`requested ${payload.call.preferredTime}`);
  }

  if (
    payload.opportunityType === "new_patient_unscheduled" &&
    payload.scheduleRecoveryPotential
  ) {
    bits.push("has compatible availability");
  }

  if (
    payload.resolutionQuality === "unresolved" ||
    payload.resolutionQuality === "abandoned" ||
    payload.resolutionQuality === "transferred_incomplete"
  ) {
    if (payload.opportunityType === "new_patient_unscheduled") {
      bits.push("the consult request is still unresolved");
    } else {
      bits.push("no completed callback is recorded");
    }
  }

  if (payload.barriers.includes("insurance")) {
    bits.push("an insurance question remains open");
  }
  if (payload.barriers.includes("language") || payload.barriers.includes("communication")) {
    bits.push("a communication barrier blocked completion");
  }

  const because =
    bits.length === 0
      ? "follow-up is still needed"
      : bits.length === 1
        ? bits[0]
        : bits.length === 2
          ? `${bits[0]}, and ${bits[1]}`
          : `${bits.slice(0, -1).join(", ")}, and ${bits[bits.length - 1]}`;

  const urgent =
    payload.clinicalUrgency === "critical" ||
    payload.clinicalUrgency === "high" ||
    payload.opportunityType === "emergency_no_callback" ||
    payload.opportunityType === "urgent_symptoms_unresolved";

  const lead = urgent ? `Call ${name} first` : `Call ${name}`;
  const clause = because.charAt(0).toUpperCase() + because.slice(1);
  // Prefer natural "She/He reported…" when the first clause is a symptom report.
  const withPronoun = clause.replace(
    /^Reported /,
    () => `${guessPronoun(name)} reported `
  );

  return `${lead}. ${withPronoun}.`;
}

function guessPronoun(displayName: string): string {
  // Demo fixtures use known given names; default to "They" when unknown.
  const first = firstName(displayName).toLowerCase();
  if (
    [
      "emily",
      "maria",
      "sarah",
      "amy",
      "lisa",
      "jennifer",
      "anna",
      "rachel",
    ].includes(first)
  ) {
    return "She";
  }
  if (
    ["marcus", "james", "robert", "kevin", "liam", "david", "michael", "john"].includes(
      first
    )
  ) {
    return "He";
  }
  return "They";
}

export function buildPhonePrimaryAction(
  payload: PhoneOpportunityPayload
): string {
  const first = firstName(payload.call.patientDisplayName);
  switch (payload.suggestedAction) {
    case "Message":
      return `Message ${first}.`;
    case "Review call":
      return "Review call.";
    case "Verify insurance":
      return "Verify insurance.";
    case "Escalate":
      return "Escalate to clinical team.";
    case "Reserve opening":
      return "Reserve opening.";
    case "Mark resolved":
      return "Mark resolved.";
    case "Call":
    default:
      return `Call ${first}.`;
  }
}

export function buildPhoneStake(payload: PhoneOpportunityPayload): string {
  if (
    payload.opportunityType === "emergency_no_callback" ||
    payload.opportunityType === "urgent_symptoms_unresolved"
  ) {
    return "Symptoms may worsen and the patient may seek care elsewhere";
  }
  if (payload.opportunityType === "new_patient_unscheduled") {
    return "A legitimate new-patient consult may be lost";
  }
  if (payload.opportunityType === "insurance_unresolved") {
    return "Scheduling stalls until benefits are clarified";
  }
  if (payload.opportunityType === "communication_barrier") {
    return "The patient may not complete care without language support";
  }
  return "An unresolved call becomes lost care and rework";
}

/**
 * Learning observation for phone recovery outcomes.
 * Captures workflow patterns only — not invasive personal profiling.
 */
export function phoneLearningObservation(
  payload: PhoneOpportunityPayload,
  outcome: { status: OutcomeStatus; improvedPractice?: boolean }
): PhoneLearningObservation {
  let conversionSignal: PhoneLearningObservation["conversionSignal"] = "other";
  if (
    outcome.status === "accepted" ||
    outcome.status === "completed" ||
    outcome.status === "dismissed" ||
    outcome.status === "snoozed"
  ) {
    conversionSignal = outcome.status;
  }

  let categoryHint = "phone_opportunity_outcome";
  if (outcome.status === "completed" && outcome.improvedPractice) {
    categoryHint = "phone_opportunity_converted";
  } else if (outcome.status === "dismissed") {
    categoryHint = "phone_opportunity_not_valuable";
  } else if (outcome.status === "accepted") {
    categoryHint = "phone_opportunity_accepted";
  } else if (outcome.status === "snoozed") {
    categoryHint = "phone_opportunity_deferred";
  }

  return {
    opportunityType: payload.opportunityType,
    preferredContact: payload.preferredContact,
    hoursSinceCall: payload.hoursSinceCall,
    recipient: selectPhoneRecipient(payload),
    outcomeStatus: outcome.status,
    barriers: [...payload.barriers],
    conversionSignal,
    improvedPractice: outcome.improvedPractice,
    categoryHint,
  };
}

/**
 * Project a surfaced ImprovementResult into Situation → Recommendation → Primary Action.
 * Handles phone opportunity payloads; schedule payloads remain in scheduleOpportunity.
 */
export function projectPhoneDecisionFirst(
  result: ImprovementResult
): DecisionFirstProjection | null {
  if (result.disposition !== "action" && result.disposition !== "recommend") {
    return null;
  }
  const rec = result.recommendation;
  if (!rec) return null;

  const event = result.observation.events[0];
  const payload = event?.payload;
  if (!isPhoneOpportunityPayload(payload)) return null;

  const assessment = assessPhoneOpportunity(payload);
  const situation = buildPhoneSituationLine(payload);
  const recommendation = assessment.shouldRecommend
    ? buildPhoneRecommendationLine(payload)
    : rec.explanation.because || rec.recommendedNextStep;
  const primaryAction = assessment.shouldRecommend
    ? buildPhonePrimaryAction(payload)
    : rec.decision || rec.recommendedNextStep;

  const accent: DecisionFirstProjection["accent"] =
    payload.clinicalUrgency === "critical" ||
    payload.clinicalUrgency === "high" ||
    payload.opportunityType === "emergency_no_callback" ||
    payload.opportunityType === "urgent_symptoms_unresolved"
      ? "urgent"
      : "opportunity";

  return {
    situation,
    recommendation,
    primaryAction,
    subject: payload.call.patientDisplayName,
    stake: rec.explanation.ifIgnored || buildPhoneStake(payload),
    whyText: rec.explanation.because,
    accent,
    group: accent === "urgent" ? "urgent" : "opportunity",
    recommendationId: rec.id,
    practiceId: rec.practiceId,
    dedupeKey: result.impactEvaluation?.dedupeKey,
    priority: result.impactEvaluation?.priority,
    evidence: (rec.explanation.evidence || []).map((e) => ({
      description: e.description,
    })),
  };
}
