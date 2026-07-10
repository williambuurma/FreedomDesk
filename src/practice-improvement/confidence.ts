/**
 * Confidence tiers and action floors — INTELLIGENCE_MODEL.md §8.
 */

import type { UrgencyTier } from "../events/types.ts";
import type { ConfidenceTier } from "./types.ts";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "moderate";
  if (confidence >= 0.5) return "low";
  return "insufficient";
}

/**
 * Minimum confidence to surface a recommendation for a given urgency tier.
 * Below floor → stay silent (queue internally, do not push).
 * Critical uses the insufficient band (0.50) — on-call escalation is rule-matched
 * (INTELLIGENCE_MODEL §8), not a high probabilistic bar.
 */
export function recommendationFloor(urgency: UrgencyTier): number {
  if (urgency === "critical") return 0.5;
  if (urgency === "important") return 0.7;
  return 0.9; // informational — high bar; quiet by default
}

/**
 * Minimum confidence for actionThreshold: met.
 * Critical paths may proceed at moderate; informational almost never materializes.
 */
export function actionFloor(urgency: UrgencyTier): number {
  if (urgency === "critical") return 0.7;
  if (urgency === "important") return 0.85;
  return 0.95;
}

export function meetsRecommendationFloor(
  confidence: number,
  urgency: UrgencyTier
): boolean {
  return confidence >= recommendationFloor(urgency);
}

export function meetsActionFloor(confidence: number, urgency: UrgencyTier): boolean {
  return confidence >= actionFloor(urgency);
}
