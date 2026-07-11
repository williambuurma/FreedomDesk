/**
 * Decision Arbitration — coordinate competing ImprovementResults into one
 * attention-safe decision set.
 *
 * Sits after the Practice Improvement pipeline. Reuses ImpactEvaluation
 * (priority, interruption, recipient, dedupeKey), confidence, and outcome
 * learning. Does not redesign domains or UI.
 *
 * Objective: never overwhelm the user with multiple competing cards.
 */

import { projectDecisionFirst } from "./scheduleOpportunity.ts";
import type {
  ArbitrationDisposition,
  ArbitratedDecision,
  DecisionArbitrationContext,
  DecisionArbitrationResult,
  ImprovementResult,
  InterruptionTier,
  LearningSignal,
  Outcome,
  RecommendationPriority,
} from "./types.ts";

const DISPOSITION_RANK: Record<ImprovementResult["disposition"], number> = {
  action: 4,
  recommend: 3,
  defer: 2,
  ignore: 1,
};

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const INTERRUPTION_RANK: Record<InterruptionTier, number> = {
  interrupt: 4,
  notify: 3,
  queue: 2,
  none: 1,
};

const IMPACT_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Hours after which a surfaced recommendation expires by urgency. */
const EXPIRE_HOURS: Record<string, number> = {
  critical: 72,
  important: 168,
  informational: 48,
};

function recommendationId(result: ImprovementResult): string {
  return result.recommendation?.id || `silent:${result.eventIds.join(",")}`;
}

function subjectKey(result: ImprovementResult): string | null {
  const subject = result.situation?.subject;
  if (!subject) return null;
  return subject.patientReferenceId || subject.callId || null;
}

function recipientOf(result: ImprovementResult): string | null {
  return (
    result.impactEvaluation?.recipient ||
    result.recommendation?.owner ||
    null
  );
}

function confidenceOf(result: ImprovementResult): number {
  return (
    result.recommendation?.confidence ??
    result.opportunityOrRisk?.confidence ??
    0
  );
}

function learningBoost(
  result: ImprovementResult,
  learnings: LearningSignal[] | undefined
): number {
  if (!learnings?.length) return 0;
  const domain = result.domain;
  if (!domain) return 0;
  const accepted = learnings.filter(
    (l) =>
      l.practiceId === result.practiceId &&
      (l.category === "recommendation_accepted" ||
        l.description.toLowerCase().includes(domain))
  );
  if (accepted.length === 0) return 0;
  return Math.min(0.05, accepted.length * 0.02);
}

/**
 * Rank competing results — mirrors pipeline pickBest, plus interruption
 * and soft learning boost. Higher score wins.
 */
export function compareArbitrationCandidates(
  a: ImprovementResult,
  b: ImprovementResult,
  learnings?: LearningSignal[]
): number {
  const d = DISPOSITION_RANK[a.disposition] - DISPOSITION_RANK[b.disposition];
  if (d !== 0) return d;

  const p =
    (PRIORITY_RANK[a.impactEvaluation?.priority || "low"] || 0) -
    (PRIORITY_RANK[b.impactEvaluation?.priority || "low"] || 0);
  if (p !== 0) return p;

  const i =
    (INTERRUPTION_RANK[a.impactEvaluation?.interruption || "none"] || 0) -
    (INTERRUPTION_RANK[b.impactEvaluation?.interruption || "none"] || 0);
  if (i !== 0) return i;

  const impact =
    (IMPACT_RANK[a.opportunityOrRisk?.estimatedImpact || "low"] || 0) -
    (IMPACT_RANK[b.opportunityOrRisk?.estimatedImpact || "low"] || 0);
  if (impact !== 0) return impact;

  const ca = confidenceOf(a) + learningBoost(a, learnings);
  const cb = confidenceOf(b) + learningBoost(b, learnings);
  return ca - cb;
}

function eventAgeHours(result: ImprovementResult, now: string): number {
  const ts = result.observation.events[0]?.timestamp || result.observation.observedAt;
  const ageMs = Date.parse(now) - Date.parse(ts);
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  return ageMs / (1000 * 60 * 60);
}

function outcomeFor(
  result: ImprovementResult,
  outcomes: Outcome[] | undefined
): Outcome | undefined {
  if (!outcomes?.length || !result.recommendation) return undefined;
  return outcomes
    .filter((o) => o.recommendationId === result.recommendation!.id)
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
}

function shouldExpire(
  result: ImprovementResult,
  ctx: DecisionArbitrationContext
): { expire: boolean; reason: string } {
  const outcome = outcomeFor(result, ctx.outcomes);
  if (outcome?.status === "expired") {
    return { expire: true, reason: "Outcome marked expired" };
  }
  if (outcome?.status === "superseded") {
    return { expire: true, reason: "Outcome marked superseded" };
  }
  if (outcome?.status === "completed" || outcome?.status === "implemented") {
    return { expire: true, reason: "Already completed — no longer actionable" };
  }
  if (outcome?.status === "dismissed") {
    return { expire: true, reason: "Dismissed — do not re-surface" };
  }

  const urgency = result.recommendation?.urgencyTier || result.opportunityOrRisk?.urgencyTier;
  const limit = EXPIRE_HOURS[urgency || "informational"] ?? 48;
  const age = eventAgeHours(result, ctx.now);
  if (age > limit) {
    return {
      expire: true,
      reason: `Expired after ${Math.floor(age)}h (limit ${limit}h for ${urgency || "informational"})`,
    };
  }

  const key = result.impactEvaluation?.dedupeKey;
  if (key && ctx.openActionKeys?.has(key)) {
    return {
      expire: true,
      reason: "Equivalent Action already open — recommendation stale",
    };
  }

  return { expire: false, reason: "" };
}

function isSurfacedCandidate(result: ImprovementResult): boolean {
  return result.disposition === "action" || result.disposition === "recommend";
}

function emptyBuckets(
  practiceId: string,
  now: string
): DecisionArbitrationResult {
  return {
    practiceId,
    now,
    primary: null,
    surface: [],
    waiting: [],
    merged: [],
    suppressed: [],
    expired: [],
    escalated: [],
    items: [],
  };
}

function toItem(
  result: ImprovementResult,
  disposition: ArbitrationDisposition,
  reason: string,
  relatedIds: string[] = [],
  rank: number | null = null
): ArbitratedDecision {
  return {
    result,
    disposition,
    rank,
    reason,
    relatedIds,
    projection: projectDecisionFirst(result),
  };
}

/**
 * Arbitrate multiple simultaneous ImprovementResults into one attention-safe set.
 *
 * Order of operations:
 * 1. Drop non-surfaced pipeline results (already silenced).
 * 2. Expire stale / completed / open-action duplicates.
 * 3. Suppress exact dedupeKey duplicates (keep best).
 * 4. Merge same-subject + same-recipient competitors into the stronger card.
 * 5. Rank remaining; surface up to maxSurface (default 1).
 * 6. Escalate interrupt-tier losers; wait the rest.
 */
export function arbitrateDecisions(
  results: ImprovementResult[],
  ctx: DecisionArbitrationContext
): DecisionArbitrationResult {
  const maxSurface = Math.max(1, ctx.maxSurface ?? 1);
  const maxInterrupts = Math.max(1, ctx.maxInterrupts ?? 1);
  const out = emptyBuckets(ctx.practiceId, ctx.now);

  const candidates = results.filter(isSurfacedCandidate);
  if (candidates.length === 0) {
    return out;
  }

  const active: ImprovementResult[] = [];

  for (const result of candidates) {
    const check = shouldExpire(result, ctx);
    if (check.expire) {
      const item = toItem(result, "expire", check.reason);
      out.expired.push(item);
      out.items.push(item);
    } else {
      active.push(result);
    }
  }

  // Suppress exact dedupeKey duplicates — keep the strongest.
  const byDedupe = new Map<string, ImprovementResult[]>();
  const noKey: ImprovementResult[] = [];
  for (const result of active) {
    const key = result.impactEvaluation?.dedupeKey;
    if (!key) {
      noKey.push(result);
      continue;
    }
    const list = byDedupe.get(key) || [];
    list.push(result);
    byDedupe.set(key, list);
  }

  const afterDedupe: ImprovementResult[] = [...noKey];

  for (const [, group] of byDedupe) {
    if (group.length === 1) {
      afterDedupe.push(group[0]);
      continue;
    }
    const ranked = [...group].sort((a, b) =>
      compareArbitrationCandidates(b, a, ctx.learnings)
    );
    const winner = ranked[0];
    afterDedupe.push(winner);
    for (const loser of ranked.slice(1)) {
      const item = toItem(
        loser,
        "suppress",
        `Suppressed — duplicate of ${recommendationId(winner)} (${winner.impactEvaluation?.dedupeKey})`,
        [recommendationId(winner)]
      );
      out.suppressed.push(item);
      out.items.push(item);
    }
  }

  // Merge same patient + same recipient across domains into the stronger card.
  const mergeGroups = new Map<string, ImprovementResult[]>();
  const ungrouped: ImprovementResult[] = [];

  for (const result of afterDedupe) {
    const subject = subjectKey(result);
    const recipient = recipientOf(result);
    if (!subject || !recipient) {
      ungrouped.push(result);
      continue;
    }
    const key = `${result.practiceId}|${subject}|${recipient}`;
    const list = mergeGroups.get(key) || [];
    list.push(result);
    mergeGroups.set(key, list);
  }

  const afterMerge: ImprovementResult[] = [...ungrouped];

  for (const [, group] of mergeGroups) {
    if (group.length === 1) {
      afterMerge.push(group[0]);
      continue;
    }
    // Only merge when domains differ — same-domain peers are ranked, not merged.
    const domains = new Set(group.map((r) => r.domain));
    if (domains.size < 2) {
      afterMerge.push(...group);
      continue;
    }
    const ranked = [...group].sort((a, b) =>
      compareArbitrationCandidates(b, a, ctx.learnings)
    );
    const winner = ranked[0];
    afterMerge.push(winner);
    for (const loser of ranked.slice(1)) {
      const item = toItem(
        loser,
        "merge",
        `Merged into ${recommendationId(winner)} — same patient and recipient`,
        [recommendationId(winner)]
      );
      out.merged.push(item);
      out.items.push(item);
    }
  }

  // Rank remaining contenders.
  const ranked = [...afterMerge].sort((a, b) =>
    compareArbitrationCandidates(b, a, ctx.learnings)
  );

  let surfaceCount = 0;
  let interruptCount = 0;

  for (const result of ranked) {
    const interruption = result.impactEvaluation?.interruption || "none";
    const isInterrupt = interruption === "interrupt";

    const canSurface =
      surfaceCount < maxSurface &&
      (!isInterrupt || interruptCount < maxInterrupts);

    if (canSurface) {
      surfaceCount += 1;
      if (isInterrupt) interruptCount += 1;
      const item = toItem(
        result,
        "surface",
        surfaceCount === 1
          ? "Primary recommendation — highest value for attention right now"
          : `Surfaced within attention budget (rank ${surfaceCount})`,
        [],
        surfaceCount
      );
      out.surface.push(item);
      out.items.push(item);
      if (surfaceCount === 1) out.primary = item;
      continue;
    }

    // Interrupt-tier losers escalate — still available, elevated for next slot.
    if (isInterrupt || result.impactEvaluation?.priority === "critical") {
      const item = toItem(
        result,
        "escalate",
        "Escalated — high-stakes recommendation waiting for attention capacity",
        out.primary ? [recommendationId(out.primary.result)] : []
      );
      out.escalated.push(item);
      out.items.push(item);
      continue;
    }

    const item = toItem(
      result,
      "wait",
      "Waiting — available after primary attention clears",
      out.primary ? [recommendationId(out.primary.result)] : []
    );
    out.waiting.push(item);
    out.items.push(item);
  }

  // Stable ledger order: surface → escalate → wait → merge → suppress → expire
  const order: Record<ArbitrationDisposition, number> = {
    surface: 0,
    escalate: 1,
    wait: 2,
    merge: 3,
    suppress: 4,
    expire: 5,
  };
  out.items.sort((a, b) => {
    const o = order[a.disposition] - order[b.disposition];
    if (o !== 0) return o;
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    return compareArbitrationCandidates(b.result, a.result, ctx.learnings);
  });

  return out;
}

/**
 * Convenience: process events through the pipeline, then arbitrate.
 * Caller supplies processBatch results or raw ImprovementResult[].
 */
export function arbitrateImprovementBatch(
  batch: {
    results: ImprovementResult[];
    surfaced: ImprovementResult[];
  },
  ctx: DecisionArbitrationContext
): DecisionArbitrationResult {
  // Prefer already-surfaced; fall back to full results so expiration can still run.
  const input = batch.surfaced.length > 0 ? batch.surfaced : batch.results;
  return arbitrateDecisions(input, ctx);
}
