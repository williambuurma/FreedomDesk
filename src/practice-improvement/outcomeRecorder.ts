/**
 * Outcome recorder — Track Outcome stage.
 * Feeds Learn; does not write to PMS.
 */

import type { PracticeId, ISOTimestamp } from "../events/types.ts";
import { nextId } from "./domains/helpers.ts";
import type { LearningSignal, Outcome, OutcomeStatus } from "./types.ts";

export interface RecordOutcomeInput {
  practiceId: PracticeId;
  recommendationId: string;
  actionId?: string;
  status: OutcomeStatus;
  reason?: string;
  improvedPractice?: boolean;
  recordedAt?: ISOTimestamp;
}

export class OutcomeRecorder {
  private readonly outcomes: Outcome[] = [];

  record(input: RecordOutcomeInput): Outcome {
    const outcome: Outcome = {
      id: nextId("out"),
      practiceId: input.practiceId,
      recommendationId: input.recommendationId,
      actionId: input.actionId,
      status: input.status,
      recordedAt: input.recordedAt || new Date().toISOString(),
      reason: input.reason,
      improvedPractice: input.improvedPractice,
    };
    this.outcomes.push(outcome);
    return outcome;
  }

  list(practiceId: PracticeId): Outcome[] {
    return this.outcomes.filter((o) => o.practiceId === practiceId);
  }

  get(outcomeId: string): Outcome | undefined {
    return this.outcomes.find((o) => o.id === outcomeId);
  }
}

/**
 * Derive a CLE-stage learning signal from an outcome.
 * Observation only until pattern thresholds are met elsewhere.
 */
export function learningSignalFromOutcome(outcome: Outcome): LearningSignal | null {
  if (outcome.status === "snoozed") return null;

  let description: string;
  let category: string;
  let confidence = 0.4;

  if (outcome.status === "dismissed") {
    category = "recommendation_dismissal";
    description = outcome.reason
      ? `Recommendation dismissed — ${outcome.reason}`
      : "Recommendation dismissed — calibrate quiet threshold";
    confidence = 0.5;
  } else if (
    outcome.status === "accepted" ||
    outcome.status === "implemented" ||
    outcome.status === "completed"
  ) {
    category = "recommendation_accepted";
    description =
      outcome.improvedPractice === false
        ? "Action completed but practice improvement unclear — review expectedOutcome"
        : "Recommendation accepted or completed — reinforce this judgment pattern";
    confidence = outcome.improvedPractice === true ? 0.65 : 0.55;
  } else if (outcome.status === "expired" || outcome.status === "superseded") {
    category = "recommendation_stale";
    description = "Recommendation expired or superseded — tighten expiry or dedupe";
    confidence = 0.45;
  } else {
    return null;
  }

  return {
    id: nextId("learn"),
    practiceId: outcome.practiceId,
    category,
    description,
    confidence,
    fromOutcomeId: outcome.id,
    stage: "observation",
    recordedAt: outcome.recordedAt,
  };
}
