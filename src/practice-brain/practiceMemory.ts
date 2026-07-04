/**
 * Long-term Practice Memory — institutional memory per practice (POS §27, CLE §26).
 *
 * Stores operational patterns, recommendation calibration, seasonal baselines,
 * and DNA freshness metadata. Predominantly operational — not clinical charts.
 *
 * FUTURE EXPANSION:
 * - PostgreSQL `practice_memory` table with tenant RLS and retention policies
 * - Event sourcing: MemoryEvent[] append-only log for audit and replay
 * - Export API for practice data rights (GDPR/HIPAA operational metadata)
 * - Cross-practice L2 aggregate pipeline (opt-in, anonymized) — never raw PHI
 * - Encryption at rest, per-practice encryption keys for enterprise tier
 */

import { createMockMemoryPatterns, MOCK_PRACTICE_ID } from "./mockData.ts";
import type {
  IPracticeMemory,
  MemoryPattern,
  PracticeId,
  PracticeMemorySnapshot,
  RecommendationFeedback,
} from "./types.ts";

const ENGINE_VERSION = "practice-memory-v1";

interface PracticeMemoryStore {
  patterns: MemoryPattern[];
  seasonal: MemoryPattern[];
  feedback: RecommendationFeedback[];
  dnaLastValidatedAt?: string;
}

/** In-memory tenant-isolated store — V1 mock; production uses durable storage. */
const memoryByPractice = new Map<PracticeId, PracticeMemoryStore>();

function daysSince(isoDate?: string): number | undefined {
  if (!isoDate) return undefined;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function seedPracticeMemory(practiceId: PracticeId): PracticeMemoryStore {
  const mock = createMockMemoryPatterns();
  const store: PracticeMemoryStore = {
    patterns: mock.operationalPatterns,
    seasonal: mock.seasonalBaselines,
    feedback: [
      {
        recommendationId: "rec_hist_waitlist_001",
        status: "accepted",
        recordedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        recommendationId: "rec_hist_verify_002",
        status: "implemented",
        recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    dnaLastValidatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  };
  memoryByPractice.set(practiceId, store);
  return store;
}

function getStore(practiceId: PracticeId): PracticeMemoryStore {
  return memoryByPractice.get(practiceId) ?? seedPracticeMemory(practiceId);
}

/** Calendared confidence adjustment from accept/reject history (CLE §18 feedback loop). */
export function calibrateConfidenceFromMemory(
  baseConfidence: number,
  practiceId: PracticeId,
  category: string
): number {
  const store = getStore(practiceId);
  const relevant = store.feedback.filter((f) =>
    f.recommendationId.includes(category.slice(0, 4))
  );
  if (relevant.length === 0) return baseConfidence;

  const accepted = relevant.filter(
    (f) => f.status === "accepted" || f.status === "implemented"
  ).length;
  const rate = accepted / relevant.length;
  const adjustment = (rate - 0.5) * 0.1;
  return Math.min(1, Math.max(0, baseConfidence + adjustment));
}

export class PracticeMemory implements IPracticeMemory {
  getSnapshot(practiceId: PracticeId): PracticeMemorySnapshot {
    const store = getStore(practiceId);
    return {
      practiceId,
      asOf: new Date().toISOString(),
      operationalPatterns: [...store.patterns],
      seasonalBaselines: [...store.seasonal],
      recommendationHistory: [...store.feedback],
      dnaLastValidatedAt: store.dnaLastValidatedAt,
      dnaFreshnessDays: daysSince(store.dnaLastValidatedAt),
    };
  }

  recordPattern(
    practiceId: PracticeId,
    pattern: Omit<MemoryPattern, "id">
  ): void {
    const store = getStore(practiceId);
    store.patterns.push({
      ...pattern,
      id: `pat_${Date.now()}_${store.patterns.length}`,
    });
  }

  recordRecommendationFeedback(
    practiceId: PracticeId,
    feedback: RecommendationFeedback
  ): void {
    const store = getStore(practiceId);
    store.feedback.push(feedback);
    // FUTURE: Trigger CLE candidate generation when dismissal rate spikes
  }
}

/** Singleton for default orchestrator wiring — replace with DI container at scale. */
export const defaultPracticeMemory = new PracticeMemory();

/** Reset store — test helper only. */
export function resetPracticeMemoryForTests(practiceId = MOCK_PRACTICE_ID): void {
  memoryByPractice.delete(practiceId);
}

export { ENGINE_VERSION as PRACTICE_MEMORY_VERSION };
