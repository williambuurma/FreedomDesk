/**
 * Practice Brain — main orchestrator for FreedomDesk practice intelligence.
 *
 * Implements the Chief of Staff loop (POS §4.3, CLE §23):
 *   Observe → Understand → Recommend → Act → Measure → Remember → Refine
 *
 * Coordinates Daily Awareness, Practice Memory, Metrics, Opportunity Detection,
 * Recommendation Engine, and Morning Brief — with clean module interfaces
 * for future microservice extraction at multi-tenant scale.
 *
 * Architecture alignment:
 * - Constitution: safety/truth precedence in recommendation ordering
 * - Brain Architecture: structured reasoning before team-facing articulation
 * - EIE: emotional context on opportunities and brief items (not clinical decisions)
 * - Office DNA: all practice-specific behavior via resolved snapshot
 * - Continuous Learning: memory feedback and pattern recording hooks
 *
 * FUTURE EXPANSION:
 * - runLiveCycle() for intraday Live Operational Awareness (POS §13)
 * - runEndOfDaySummary() closing the daily loop (POS §28)
 * - runWeeklyReview() / runMonthlyIntelligence() (POS §29–§30)
 * - ingestCallSummary() wired from conversation summary service post-call
 * - PostInteractionReflection artifact generation (CLE §27)
 * - Horizontal scaling: practiceId-sharded workers, idempotent run keys
 * - API layer: REST + webhook delivery for briefs and recommendations
 */

import { DailyAwareness, defaultDailyAwareness } from "./dailyAwareness.ts";
import { defaultMorningBriefGenerator, MorningBriefGenerator } from "./morningBrief.ts";
import { MOCK_PRACTICE_ID } from "./mockData.ts";
import {
  defaultOpportunityDetector,
  OpportunityDetector,
} from "./opportunityDetector.ts";
import {
  defaultPracticeMemory,
  PracticeMemory,
} from "./practiceMemory.ts";
import {
  defaultPracticeMetrics,
  PracticeMetrics,
} from "./practiceMetrics.ts";
import {
  defaultRecommendationEngine,
  RecommendationEngine,
} from "./recommendationEngine.ts";
import type {
  CallSummarySignal,
  DailyAwarenessState,
  IDailyAwareness,
  IMorningBriefGenerator,
  IOpportunityDetector,
  IPracticeMemory,
  IPracticeMetrics,
  IRecommendationEngine,
  MorningBrief,
  Opportunity,
  PracticeBrainRunResult,
  PracticeId,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
  Recommendation,
} from "./types.ts";

export const PRACTICE_BRAIN_VERSION = "practice-brain-v1";

export interface PracticeBrainDependencies {
  awareness: IDailyAwareness;
  memory: IPracticeMemory;
  metrics: IPracticeMetrics;
  opportunityDetector: IOpportunityDetector;
  recommendationEngine: IRecommendationEngine;
  morningBrief: IMorningBriefGenerator;
}

const defaultDependencies: PracticeBrainDependencies = {
  awareness: defaultDailyAwareness,
  memory: defaultPracticeMemory,
  metrics: defaultPracticeMetrics,
  opportunityDetector: defaultOpportunityDetector,
  recommendationEngine: defaultRecommendationEngine,
  morningBrief: defaultMorningBriefGenerator,
};

/**
 * PracticeBrain — tenant-scoped orchestrator.
 * One instance per practiceId; safe for thousands of practices via sharding.
 */
export class PracticeBrain {
  private readonly practiceId: PracticeId;
  private readonly deps: PracticeBrainDependencies;

  constructor(
    practiceId: PracticeId = MOCK_PRACTICE_ID,
    dependencies: Partial<PracticeBrainDependencies> = {}
  ) {
    this.practiceId = practiceId;
    this.deps = { ...defaultDependencies, ...dependencies };
  }

  getPracticeId(): PracticeId {
    return this.practiceId;
  }

  /**
   * Refresh daily awareness from all signal sources.
   * FUTURE: Triggered by cron (pre-morning-brief) and on significant events.
   */
  refreshAwareness(date?: string): DailyAwarenessState {
    return this.deps.awareness.refresh(this.practiceId, date);
  }

  getAwareness(date?: string): DailyAwarenessState {
    return this.deps.awareness.getState(this.practiceId, date);
  }

  getMemory(): PracticeMemorySnapshot {
    return this.deps.memory.getSnapshot(this.practiceId);
  }

  /**
   * Ingest boundary event from call summary service (Phase 1 POS).
   * Updates awareness and records learning patterns asynchronously in production.
   */
  ingestCallSummary(summary: CallSummarySignal): void {
    if (summary.practiceId !== this.practiceId) {
      throw new Error(
        `Tenant isolation violation: summary practiceId ${summary.practiceId} !== ${this.practiceId}`
      );
    }
    this.deps.awareness.ingestCallSummary(summary);

    // FUTURE: PostInteractionReflection → CLE candidate pipeline
    if (summary.completenessScore < 0.9 && summary.missingFields?.length) {
      this.deps.memory.recordPattern(this.practiceId, {
        category: "friction",
        description: `Incomplete ${summary.intent} summary — missing: ${summary.missingFields.join(", ")}`,
        confidence: 0.7,
        sampleSize: 1,
        lastObservedAt: new Date().toISOString(),
      });
    }
  }

  computeMetrics(
    awareness?: DailyAwarenessState,
    memory?: PracticeMemorySnapshot
  ): PracticeMetricsSnapshot {
    const a = awareness ?? this.getAwareness();
    const m = memory ?? this.getMemory();
    return this.deps.metrics.computeSnapshot(this.practiceId, a, m);
  }

  detectOpportunities(
    awareness?: DailyAwarenessState,
    memory?: PracticeMemorySnapshot,
    metrics?: PracticeMetricsSnapshot
  ): Opportunity[] {
    const a = awareness ?? this.getAwareness();
    const m = memory ?? this.getMemory();
    const met = metrics ?? this.computeMetrics(a, m);
    return this.deps.opportunityDetector.detect(a, m, met);
  }

  generateRecommendations(
    opportunities?: Opportunity[],
    awareness?: DailyAwarenessState,
    memory?: PracticeMemorySnapshot,
    metrics?: PracticeMetricsSnapshot
  ): Recommendation[] {
    const a = awareness ?? this.getAwareness();
    const m = memory ?? this.getMemory();
    const met = metrics ?? this.computeMetrics(a, m);
    const opps = opportunities ?? this.detectOpportunities(a, m, met);
    return this.deps.recommendationEngine.generate(opps, a, m, met);
  }

  /**
   * Generate the doctor and team Morning Brief (POS §12).
   * Primary entry point for daily Chief of Staff delivery.
   */
  generateMorningBrief(date?: string): MorningBrief {
    const awareness = this.refreshAwareness(date);
    const memory = this.getMemory();
    const metrics = this.computeMetrics(awareness, memory);
    const opportunities = this.detectOpportunities(awareness, memory, metrics);
    const recommendations = this.generateRecommendations(
      opportunities,
      awareness,
      memory,
      metrics
    );

    // Attach opportunity queue to awareness for downstream consumers
    awareness.opportunityQueue = opportunities;

    return this.deps.morningBrief.generate({
      awareness,
      memory,
      metrics,
      recommendations,
    });
  }

  /**
   * Full daily intelligence cycle — single call for batch jobs and tests.
   * FUTURE: Emit PracticeBrainRunCompleted event for analytics pipeline.
   */
  runDailyCycle(date?: string): PracticeBrainRunResult {
    const runAt = new Date().toISOString();
    const awareness = this.refreshAwareness(date);
    const memory = this.getMemory();
    const metrics = this.computeMetrics(awareness, memory);
    const opportunities = this.detectOpportunities(awareness, memory, metrics);
    const recommendations = this.generateRecommendations(
      opportunities,
      awareness,
      memory,
      metrics
    );
    awareness.opportunityQueue = opportunities;

    const morningBrief = this.deps.morningBrief.generate({
      awareness,
      memory,
      metrics,
      recommendations,
    });

    return {
      practiceId: this.practiceId,
      runAt,
      awareness,
      memory,
      metrics,
      opportunities,
      recommendations,
      morningBrief,
    };
  }

  /**
   * Record team feedback on a recommendation — feeds CLE calibration.
   */
  recordRecommendationFeedback(
    recommendationId: string,
    status: "accepted" | "dismissed" | "snoozed" | "implemented",
    reason?: string
  ): void {
    this.deps.memory.recordRecommendationFeedback(this.practiceId, {
      recommendationId,
      status,
      recordedAt: new Date().toISOString(),
      reason,
    });
  }
}

/** Factory for multi-tenant registry — FUTURE: LRU cache with lifecycle management. */
const brainRegistry = new Map<PracticeId, PracticeBrain>();

export function getPracticeBrain(practiceId: PracticeId = MOCK_PRACTICE_ID): PracticeBrain {
  let brain = brainRegistry.get(practiceId);
  if (!brain) {
    brain = new PracticeBrain(practiceId);
    brainRegistry.set(practiceId, brain);
  }
  return brain;
}

export function resetPracticeBrainRegistry(): void {
  brainRegistry.clear();
}

// Re-export module types and defaults for consumers
export {
  DailyAwareness,
  MorningBriefGenerator,
  OpportunityDetector,
  PracticeMemory,
  PracticeMetrics,
  RecommendationEngine,
  MOCK_PRACTICE_ID,
};

export type { PracticeBrainDependencies, PracticeBrainRunResult };
