/**
 * Reasoning evidence — structured explainability for validation and audits.
 */

export type {
  ReasoningFact,
  ReasoningRuleFire,
  ReasoningTrace,
  StageReasoning,
} from "./types.ts";

export { formatStageReasoning, formatReasoningTrace } from "./format.ts";
export { assembleReasoningTrace } from "./assembleTrace.ts";
