/**
 * Recoverable Schedule Opportunity — candidate ranking for open chair time.
 *
 * Runs inside the Practice Improvement Engine (operating domain).
 * Does not create a parallel reasoning path.
 *
 * Evaluates: duration fit, provider compatibility, treatment urgency,
 * availability/preference, insurance readiness, and material decision change.
 */

import type { ImprovementResult } from "./types.ts";

/** Minimum opening length worth recovering (minutes). */
export const MIN_RECOVERABLE_MINUTES = 45;

/** Minimum candidate score to surface a named recommendation. */
export const MIN_CANDIDATE_SCORE = 70;

export type TreatmentUrgency = "high" | "medium" | "low";
export type TimePreference = "morning" | "afternoon" | "flexible";

export interface ScheduleOpening {
  slotId: string;
  /** Human-readable when, e.g. "tomorrow at 10:30 AM" */
  displayWhen: string;
  durationMinutes: number;
  providerId?: string;
  providerName?: string;
  /** hygiene | doctor | assistant */
  column?: string;
  /** What was cancelled / what the block supports */
  appointmentType?: string;
  startTime?: string;
}

export interface ScheduleFillCandidate {
  patientReferenceId: string;
  displayName: string;
  /** e.g. "unscheduled crown" */
  procedure: string;
  durationMinutes: number;
  providerCompatible: boolean;
  treatmentUrgency: TreatmentUrgency;
  availabilityPreference?: TimePreference;
  /** True when the patient previously asked for this kind of slot */
  prefersThisSlot?: boolean;
  insuranceReady: boolean;
  notes?: string;
}

export interface ScheduleOpportunityPayload {
  schema: "schedule_opportunity/v1";
  opening: ScheduleOpening;
  candidates: ScheduleFillCandidate[];
}

export interface RankedCandidate {
  candidate: ScheduleFillCandidate;
  score: number;
  reasons: string[];
  suppressed: boolean;
  suppressReason?: string;
}

export interface ScheduleOpportunityAssessment {
  meaningfulOpening: boolean;
  openingReason: string;
  ranked: RankedCandidate[];
  best: RankedCandidate | null;
  /** True when a named patient recommendation should be drafted */
  shouldRecommend: boolean;
}

/** Decision-first card projection for Today / Morning Brief. */
export interface DecisionFirstProjection {
  situation: string;
  recommendation: string;
  primaryAction: string;
  subject: string;
  stake: string;
  whyText: string;
  accent: "opportunity";
  group: "opportunity";
  recommendationId: string;
  practiceId: string;
  dedupeKey?: string;
  priority?: string;
  evidence: { description: string }[];
}

export function isScheduleOpportunityPayload(
  payload: unknown
): payload is ScheduleOpportunityPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p.schema === "schedule_opportunity/v1" &&
    typeof p.opening === "object" &&
    p.opening !== null &&
    Array.isArray(p.candidates)
  );
}

export function isMeaningfulOpening(opening: ScheduleOpening): {
  meaningful: boolean;
  reason: string;
} {
  if (!opening.durationMinutes || opening.durationMinutes < MIN_RECOVERABLE_MINUTES) {
    return {
      meaningful: false,
      reason: `Opening too short to recover (${opening.durationMinutes || 0} min < ${MIN_RECOVERABLE_MINUTES})`,
    };
  }
  if (!opening.displayWhen?.trim()) {
    return { meaningful: false, reason: "Opening lacks a recoverable time window" };
  }
  return {
    meaningful: true,
    reason: `${opening.durationMinutes}-minute opening at ${opening.displayWhen}`,
  };
}

function preferenceFits(
  opening: ScheduleOpening,
  preference: TimePreference | undefined
): boolean {
  if (!preference || preference === "flexible") return true;
  const when = (opening.displayWhen || "").toLowerCase();
  const start = (opening.startTime || "").toLowerCase();
  const blob = `${when} ${start}`;
  if (preference === "morning") {
    return /\b(am|morning)\b/.test(blob) || /t(0[6-9]|1[0-1]):/.test(blob);
  }
  if (preference === "afternoon") {
    return /\b(pm|afternoon)\b/.test(blob) || /t(1[2-9]|2[0-3]):/.test(blob);
  }
  return true;
}

/**
 * Score one candidate against an opening.
 * Hard suppressions return suppressed=true with score 0.
 */
export function scoreCandidate(
  opening: ScheduleOpening,
  candidate: ScheduleFillCandidate
): RankedCandidate {
  const reasons: string[] = [];

  if (!candidate.providerCompatible) {
    return {
      candidate,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: "Provider incompatible with this opening",
    };
  }

  if (candidate.durationMinutes > opening.durationMinutes) {
    return {
      candidate,
      score: 0,
      reasons: [],
      suppressed: true,
      suppressReason: `Procedure needs ${candidate.durationMinutes} min; opening is ${opening.durationMinutes} min`,
    };
  }

  let score = 40;
  reasons.push("Procedure fits the open chair time");

  const slack = opening.durationMinutes - candidate.durationMinutes;
  if (slack <= 15) {
    score += 10;
    reasons.push("Duration is a tight fit");
  } else {
    score += 5;
  }

  if (candidate.insuranceReady) {
    score += 20;
    reasons.push("Benefits are verified");
  } else {
    score -= 15;
    reasons.push("Insurance not ready");
  }

  if (candidate.treatmentUrgency === "high") {
    score += 15;
    reasons.push("Treatment urgency is high");
  } else if (candidate.treatmentUrgency === "medium") {
    score += 8;
  } else {
    score -= 5;
  }

  if (candidate.prefersThisSlot) {
    score += 15;
    reasons.push("Previously requested this kind of appointment time");
  } else if (preferenceFits(opening, candidate.availabilityPreference)) {
    score += 8;
    reasons.push("Availability preference matches");
  } else if (candidate.availabilityPreference) {
    score -= 20;
    reasons.push("Availability preference does not match this opening");
  }

  if (!candidate.insuranceReady && candidate.treatmentUrgency === "low") {
    return {
      candidate,
      score: Math.max(0, score),
      reasons,
      suppressed: true,
      suppressReason: "Weak match — unverified insurance and low urgency",
    };
  }

  if (score < MIN_CANDIDATE_SCORE) {
    return {
      candidate,
      score,
      reasons,
      suppressed: true,
      suppressReason: `Score ${score} below surface threshold ${MIN_CANDIDATE_SCORE}`,
    };
  }

  return { candidate, score, reasons, suppressed: false };
}

export function rankCandidates(
  opening: ScheduleOpening,
  candidates: ScheduleFillCandidate[]
): RankedCandidate[] {
  return candidates
    .map((c) => scoreCandidate(opening, c))
    .sort((a, b) => {
      if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
      return b.score - a.score;
    });
}

/**
 * Assess whether this opening yields one named recoverable recommendation.
 */
export function assessScheduleOpportunity(
  payload: ScheduleOpportunityPayload
): ScheduleOpportunityAssessment {
  const openingCheck = isMeaningfulOpening(payload.opening);
  if (!openingCheck.meaningful) {
    return {
      meaningfulOpening: false,
      openingReason: openingCheck.reason,
      ranked: [],
      best: null,
      shouldRecommend: false,
    };
  }

  const ranked = rankCandidates(payload.opening, payload.candidates || []);
  const best = ranked.find((r) => !r.suppressed) || null;

  return {
    meaningfulOpening: true,
    openingReason: openingCheck.reason,
    ranked,
    best,
    shouldRecommend: best !== null,
  };
}

export function buildSituationLine(opening: ScheduleOpening): string {
  const mins = opening.durationMinutes;
  return `A ${mins}-minute opening became available ${opening.displayWhen}.`;
}

export function buildRecommendationLine(
  _opening: ScheduleOpening,
  ranked: RankedCandidate
): string {
  const c = ranked.candidate;
  const bits: string[] = [];

  bits.push("the procedure fits");
  if (c.insuranceReady) bits.push("benefits are verified");
  if (c.prefersThisSlot) {
    bits.push("she previously requested a morning appointment");
  } else if (
    c.availabilityPreference === "morning" ||
    c.availabilityPreference === "afternoon"
  ) {
    bits.push(`her ${c.availabilityPreference} preference matches`);
  }

  const because =
    bits.length === 1
      ? bits[0]
      : bits.length === 2
        ? `${bits[0]} and ${bits[1]}`
        : `${bits.slice(0, -1).join(", ")}, and ${bits[bits.length - 1]}`;

  return `Offer it to ${c.displayName} for ${possessiveProcedure(c)} because ${because}.`;
}

function possessiveProcedure(c: ScheduleFillCandidate): string {
  const p = c.procedure.trim();
  if (/^her |^his |^their /i.test(p)) return p;
  if (/^unscheduled /i.test(p)) return `her ${p}`;
  return `her ${p}`;
}

export function buildPrimaryAction(candidate: ScheduleFillCandidate): string {
  const first = candidate.displayName.trim().split(/\s+/)[0] || candidate.displayName;
  return `Call ${first}.`;
}

/**
 * Project a surfaced ImprovementResult into Situation → Recommendation → Primary Action.
 */
export function projectDecisionFirst(
  result: ImprovementResult
): DecisionFirstProjection | null {
  if (
    result.disposition !== "action" &&
    result.disposition !== "recommend"
  ) {
    return null;
  }
  const rec = result.recommendation;
  if (!rec) return null;

  const event = result.observation.events[0];
  const payload = event?.payload;
  let situation = result.situation?.summary || "";
  let subject = "";
  let recommendation = rec.explanation.because || rec.recommendedNextStep;
  let primaryAction = rec.decision || rec.recommendedNextStep;

  if (isScheduleOpportunityPayload(payload)) {
    const assessment = assessScheduleOpportunity(payload);
    situation = buildSituationLine(payload.opening);
    if (assessment.best) {
      subject = assessment.best.candidate.displayName;
      recommendation = buildRecommendationLine(payload.opening, assessment.best);
      primaryAction = buildPrimaryAction(assessment.best.candidate);
    }
  }

  return {
    situation,
    recommendation,
    primaryAction,
    subject,
    stake: rec.explanation.ifIgnored,
    whyText: rec.explanation.because,
    accent: "opportunity",
    group: "opportunity",
    recommendationId: rec.id,
    practiceId: rec.practiceId,
    dedupeKey: result.impactEvaluation?.dedupeKey,
    priority: result.impactEvaluation?.priority,
    evidence: (rec.explanation.evidence || []).map((e) => ({
      description: e.description,
    })),
  };
}
