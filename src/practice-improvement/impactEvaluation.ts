/**
 * Impact Evaluation and Prioritization — pipeline stage before Recommend.
 *
 * Answers, for every opportunity/risk:
 * - Does this materially improve the practice?
 * - Who should receive it?
 * - Does it deserve an interruption?
 * - What priority should it have?
 * - Would surfacing it meaningfully change a decision?
 *
 * Quiet by default: if it does not change a decision, suppress.
 */

import type { UrgencyTier } from "../events/types.ts";
import type { OwnerRole } from "../practice-brain/types.ts";
import type {
  ImpactEvaluation,
  ImpactLevel,
  InterruptionTier,
  OpportunityOrRisk,
  PipelineContext,
  RecommendationPriority,
  Situation,
  Understanding,
} from "./types.ts";

function priorityFromSignals(input: {
  urgencyTier: UrgencyTier;
  estimatedImpact: ImpactLevel;
  kind: "opportunity" | "risk";
  confidence: number;
}): RecommendationPriority {
  if (input.urgencyTier === "critical") return "critical";
  if (input.kind === "risk" && input.estimatedImpact === "high") return "high";
  if (input.estimatedImpact === "high" && input.confidence >= 0.85) return "high";
  if (input.urgencyTier === "important" || input.estimatedImpact === "medium") {
    return "medium";
  }
  return "low";
}

/**
 * Interruption is earned, not default.
 * informational never interrupts; critical always may; important only when high impact.
 */
function interruptionFromSignals(input: {
  urgencyTier: UrgencyTier;
  estimatedImpact: ImpactLevel;
  priority: RecommendationPriority;
  materialImprovement: boolean;
}): InterruptionTier {
  if (!input.materialImprovement) return "none";
  if (input.urgencyTier === "critical" || input.priority === "critical") {
    return "interrupt";
  }
  if (
    input.urgencyTier === "important" &&
    (input.estimatedImpact === "high" || input.priority === "high")
  ) {
    return "notify";
  }
  if (input.priority === "medium" && input.estimatedImpact !== "low") {
    return "queue";
  }
  return "none";
}

/**
 * Would surfacing this change what someone does next?
 * Restating facts, low-stakes noise, or unresolved ownership → no.
 */
function wouldChangeDecision(input: {
  materialImprovement: boolean;
  recipient: OwnerRole | null;
  priority: RecommendationPriority;
  interruption: InterruptionTier;
  urgencyTier: UrgencyTier;
  estimatedImpact: ImpactLevel;
  kind: "opportunity" | "risk";
  openActionDuplicate: boolean;
  pmsDuplicateRisk: boolean;
}): { changesDecision: boolean; reason: string } {
  if (input.pmsDuplicateRisk) {
    return {
      changesDecision: false,
      reason: "Would not change a decision — mirrors PMS of record",
    };
  }
  if (input.openActionDuplicate) {
    return {
      changesDecision: false,
      reason: "Would not change a decision — equivalent Action already open",
    };
  }
  if (!input.recipient) {
    return {
      changesDecision: false,
      reason: "Would not change a decision — no resolvable recipient",
    };
  }
  if (!input.materialImprovement) {
    return {
      changesDecision: false,
      reason: "Would not change a decision — no material practice improvement",
    };
  }
  if (input.interruption === "none" && input.priority === "low") {
    return {
      changesDecision: false,
      reason: "Would not change a decision — low priority without interruption value",
    };
  }
  if (
    input.urgencyTier === "informational" &&
    input.estimatedImpact === "low" &&
    input.kind === "opportunity"
  ) {
    return {
      changesDecision: false,
      reason: "Would not change a decision — informational low-impact opportunity",
    };
  }

  return {
    changesDecision: true,
    reason:
      input.interruption === "interrupt"
        ? "Changes the next action under time-sensitive stakes"
        : input.interruption === "notify"
          ? "Changes today's operating decision for the recipient"
          : "Changes a queued decision the recipient should act on",
  };
}

function dedupeKey(item: OpportunityOrRisk, situation: Situation): string {
  const subject =
    situation.subject?.patientReferenceId ||
    situation.subject?.callId ||
    item.sourceEventIds[0] ||
    "unknown";
  return `${item.practiceId}|${item.domain}|${situation.kind}|${subject}|${item.kind}`;
}

/**
 * Evaluate impact and prioritize before any recommendation is drafted or surfaced.
 */
export function evaluateImpact(input: {
  item: OpportunityOrRisk;
  situation: Situation;
  understanding: Understanding;
  ctx: PipelineContext;
}): ImpactEvaluation {
  const { item, situation, understanding, ctx } = input;

  const recipient: OwnerRole | null = item.suggestedOwner || null;
  const materialImprovement = item.materialImprovement;
  const priority = priorityFromSignals({
    urgencyTier: item.urgencyTier,
    estimatedImpact: item.estimatedImpact,
    kind: item.kind,
    confidence: item.confidence,
  });
  const interruption = interruptionFromSignals({
    urgencyTier: item.urgencyTier,
    estimatedImpact: item.estimatedImpact,
    priority,
    materialImprovement,
  });

  const key = dedupeKey(item, situation);
  const openActionDuplicate = Boolean(ctx.openActionKeys?.has(key));

  const decision = wouldChangeDecision({
    materialImprovement,
    recipient,
    priority,
    interruption,
    urgencyTier: item.urgencyTier,
    estimatedImpact: item.estimatedImpact,
    kind: item.kind,
    openActionDuplicate,
    pmsDuplicateRisk: understanding.pmsDuplicateRisk,
  });

  const shouldSurface =
    materialImprovement &&
    decision.changesDecision &&
    interruption !== "none" &&
    recipient !== null;

  const reasons: string[] = [
    materialImprovement
      ? item.reasonMaterial
      : item.reasonMaterial || "Not a material practice improvement",
    `recipient=${recipient ?? "none"}`,
    `interruption=${interruption}`,
    `priority=${priority}`,
    decision.reason,
  ];

  if (!shouldSurface && decision.changesDecision && interruption === "none") {
    reasons.push("Suppressed — does not deserve interruption or queue attention");
  }

  return {
    materialImprovement,
    recipient,
    interruption,
    priority,
    changesDecision: decision.changesDecision,
    shouldSurface,
    reasons,
    dedupeKey: key,
  };
}
