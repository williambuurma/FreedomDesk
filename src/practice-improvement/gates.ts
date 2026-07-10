/**
 * Quiet-by-default gates for the Practice Improvement Engine.
 *
 * FreedomDesk stays silent unless a recommendation materially improves the practice.
 * Never duplicate the PMS (schedule of record, chart, task box).
 */

import type { UrgencyTier } from "../events/types.ts";
import { meetsActionFloor, meetsRecommendationFloor } from "./confidence.ts";
import type {
  CommitmentDraft,
  ImpactEvaluation,
  ImpactLevel,
  OpportunityOrRisk,
  Understanding,
} from "./types.ts";

/** Phrases that indicate PMS mirroring — FreedomDesk must not surface these. */
const PMS_DUPLICATE_PATTERNS: RegExp[] = [
  /\b(show|view|open|list|display)\b.*\b(schedule|calendar|chart|ledger|appointment list)\b/i,
  /\b(mirror|duplicate|copy)\b.*\b(pms|schedule|chart)\b/i,
  /\btoday'?s?\s+(full\s+)?schedule\b/i,
  /\bpatient\s+chart\b/i,
  /\boperatory\s+board\b/i,
];

export function looksLikePmsDuplicate(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return PMS_DUPLICATE_PATTERNS.some((re) => re.test(t));
}

/**
 * Material improvement heuristic.
 * Critical urgency always qualifies when confidence is adequate.
 * Low-impact informational noise does not.
 */
export function isMaterialImprovement(input: {
  estimatedImpact: ImpactLevel;
  urgencyTier: UrgencyTier;
  confidence: number;
  kind: "opportunity" | "risk";
}): boolean {
  if (input.urgencyTier === "critical" && input.confidence >= 0.7) return true;
  if (input.kind === "risk" && input.estimatedImpact !== "low" && input.confidence >= 0.7) {
    return true;
  }
  if (input.estimatedImpact === "high" && input.confidence >= 0.7) return true;
  if (
    input.estimatedImpact === "medium" &&
    input.urgencyTier !== "informational" &&
    input.confidence >= 0.8
  ) {
    return true;
  }
  return false;
}

export function materialReason(input: {
  material: boolean;
  estimatedImpact: ImpactLevel;
  urgencyTier: UrgencyTier;
  kind: "opportunity" | "risk";
}): string {
  if (!input.material) {
    return "Does not clearly improve practice outcomes enough to interrupt attention";
  }
  if (input.urgencyTier === "critical") {
    return "Time-sensitive risk — delay harms patients or SLA";
  }
  if (input.kind === "risk") {
    return "Operational risk with material downside if ignored";
  }
  if (input.estimatedImpact === "high") {
    return "High-impact opportunity to improve schedule, retention, or safety";
  }
  return "Clear operational improvement with adequate confidence";
}

export interface GateDecision {
  pass: boolean;
  disposition: "action" | "recommend" | "defer" | "ignore";
  reason: string;
  actionThreshold: "met" | "not_met";
}

/**
 * Apply quiet-by-default + constitutional + PMS non-duplication gates.
 * When Impact Evaluation is present, it is authoritative for material + surfacing.
 */
export function gateRecommendation(input: {
  understanding: Understanding;
  item: OpportunityOrRisk;
  draft: CommitmentDraft;
  impact?: ImpactEvaluation;
}): GateDecision {
  if (input.understanding.pmsDuplicateRisk) {
    return {
      pass: false,
      disposition: "ignore",
      reason: "Would duplicate PMS schedule/chart — FreedomDesk stays silent",
      actionThreshold: "not_met",
    };
  }

  const draftText = [
    input.draft.verb,
    input.draft.recommendedNextStep,
    input.draft.decision || "",
  ].join(" ");
  if (looksLikePmsDuplicate(draftText)) {
    return {
      pass: false,
      disposition: "ignore",
      reason: "Recommendation mirrors PMS — not a FreedomDesk action",
      actionThreshold: "not_met",
    };
  }

  if (input.impact) {
    if (!input.impact.shouldSurface) {
      return {
        pass: false,
        disposition: "ignore",
        reason:
          input.impact.reasons.find((r) => /would not change a decision/i.test(r)) ||
          input.impact.reasons[input.impact.reasons.length - 1] ||
          "Impact evaluation suppressed surfacing",
        actionThreshold: "not_met",
      };
    }
    if (!input.impact.changesDecision) {
      return {
        pass: false,
        disposition: "ignore",
        reason: "Would not meaningfully change a decision — stay quiet",
        actionThreshold: "not_met",
      };
    }
    if (!input.impact.materialImprovement) {
      return {
        pass: false,
        disposition: "ignore",
        reason: "Does not materially improve the practice",
        actionThreshold: "not_met",
      };
    }
  } else if (!input.item.materialImprovement) {
    return {
      pass: false,
      disposition: "ignore",
      reason: input.item.reasonMaterial,
      actionThreshold: "not_met",
    };
  }

  if (!meetsRecommendationFloor(input.draft.confidence, input.draft.urgencyTier)) {
    return {
      pass: false,
      disposition: "defer",
      reason: `Confidence ${input.draft.confidence.toFixed(2)} below recommendation floor for ${input.draft.urgencyTier}`,
      actionThreshold: "not_met",
    };
  }

  const mayMaterializeAction =
    input.draft.urgencyTier !== "informational" &&
    meetsActionFloor(input.draft.confidence, input.draft.urgencyTier) &&
    (!input.impact || input.impact.interruption === "interrupt");

  if (mayMaterializeAction) {
    return {
      pass: true,
      disposition: "action",
      reason: "Material improvement with action threshold met and interruption warranted",
      actionThreshold: "met",
    };
  }

  return {
    pass: true,
    disposition: "recommend",
    reason: "Material improvement — surface as recommendation, not Action Registry item",
    actionThreshold: "not_met",
  };
}

/** Constitutional must-not-say lines attached to every explanation. */
export const CONSTITUTIONAL_MUST_NOT_SAY = [
  "Never diagnose or prescribe",
  "Never promise coverage, fees, or remaining benefits",
  "Never auto-book without PMS-validated bookingMode",
  "Never identify as AI on the phone",
] as const;
