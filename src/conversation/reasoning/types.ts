/**
 * Structured reasoning evidence — every stage exposes WHY it reached its conclusion.
 * Authority: docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md, judgment/types.ts ReasoningStage
 */

import type { ReasoningStage } from "../judgment/types.ts";

/** One observed fact extracted or supplied to a stage. */
export interface ReasoningFact {
  id: string;
  description: string;
  value?: unknown;
  /** Parser, upstream stage, or transcript slice that produced this fact. */
  source?: string;
}

/** One deterministic rule that fired during reasoning. */
export interface ReasoningRuleFire {
  ruleId: string;
  description: string;
  weight?: number;
}

/**
 * Canonical shape for one reasoning stage:
 *   Inputs → Evidence (facts + rules) → Decision → Confidence → Output
 */
export interface StageReasoning<TDecision = unknown, TOutput = unknown> {
  stage: ReasoningStage;
  inputs: Record<string, unknown>;
  facts: ReasoningFact[];
  rulesFired: ReasoningRuleFire[];
  decision: TDecision;
  confidence: number;
  /** Human-readable rationale lines — one per rule or inference step. */
  rationale: string[];
  output: TOutput;
}

/** Full call-level reasoning trace across all six stages. */
export interface ReasoningTrace {
  understanding: StageReasoning;
  psychology: StageReasoning;
  triage: StageReasoning;
  frontDesk: StageReasoning;
  /** Present when summary stage runs (full call processing). */
  summary?: StageReasoning;
  /** Present when Practice Brain signal is derived (full call processing). */
  practiceBrain?: StageReasoning;
}
