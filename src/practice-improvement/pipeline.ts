/**
 * Single reasoning pipeline for all FreedomDesk intelligence domains.
 *
 * Observe → Understand → Detect Situation → Identify Opportunity or Risk
 * → Evaluate Impact & Prioritize → Recommend Best Action → Explain Why
 * → (Track Outcome → Learn via recorder)
 */

import { materializeActionFromEvent } from "../actions/fromOperationalEvent.ts";
import type { OperationalEvent } from "../events/types.ts";
import { CONSTITUTIONAL_MUST_NOT_SAY, gateRecommendation } from "./gates.ts";
import { evaluateImpact } from "./impactEvaluation.ts";
import { nextId } from "./domains/helpers.ts";
import { DEFAULT_DOMAIN_MODULES, selectDomainModules } from "./domains/registry.ts";
import type {
  Commitment,
  CommitmentDraft,
  DomainAssessmentModule,
  Explanation,
  ImpactEvaluation,
  ImprovementRecommendation,
  ImprovementResult,
  Observation,
  OpportunityOrRisk,
  PipelineContext,
  PipelineStageTrace,
  Situation,
} from "./types.ts";
import { PRACTICE_IMPROVEMENT_OBJECTIVE as OBJECTIVE } from "./types.ts";

function emptyTrace(): ImprovementResult["trace"] {
  return { objective: OBJECTIVE, stages: [] };
}

function pushStage(
  trace: ImprovementResult["trace"],
  stage: PipelineStageTrace["stage"],
  notes: string[],
  disposition?: PipelineStageTrace["disposition"]
): void {
  trace.stages.push({ stage, notes, disposition });
}

function silencedResult(
  observation: Observation,
  partial: Partial<ImprovementResult> & {
    disposition: ImprovementResult["disposition"];
    silencedReason: string;
  }
): ImprovementResult {
  return {
    practiceId: observation.practiceId,
    eventIds: observation.events.map((e) => e.id),
    domain: partial.domain ?? null,
    disposition: partial.disposition,
    observation,
    understanding: partial.understanding ?? null,
    situation: partial.situation ?? null,
    opportunityOrRisk: partial.opportunityOrRisk ?? null,
    impactEvaluation: partial.impactEvaluation ?? null,
    recommendation: partial.recommendation ?? null,
    silencedReason: partial.silencedReason,
    trace: partial.trace ?? emptyTrace(),
  };
}

function buildExplanation(
  because: string,
  expectedOutcome: string,
  ifIgnored: string,
  evidence: Commitment["evidence"]
): Explanation {
  return {
    because,
    expectedOutcome,
    ifIgnored,
    evidence,
    mustNotSay: [...CONSTITUTIONAL_MUST_NOT_SAY],
  };
}

function toCommitment(
  draft: CommitmentDraft,
  item: OpportunityOrRisk,
  situation: Situation,
  actionThreshold: Commitment["actionThreshold"],
  impact?: ImpactEvaluation | null
): Commitment {
  return {
    id: nextId("cmt"),
    practiceId: item.practiceId,
    domain: item.domain,
    verb: draft.verb,
    object: draft.object,
    because: draft.because,
    primaryResponsibility:
      impact?.recipient || draft.primaryResponsibility,
    urgencyTier: draft.urgencyTier,
    confidence: draft.confidence,
    evidence: draft.evidence,
    uncertainty: draft.uncertainty,
    dueRule: draft.dueRule,
    dependencies: draft.dependencies || [],
    actionThreshold,
    opportunityOrRisk: item.kind,
    sourceEventIds: item.sourceEventIds,
    situationId: situation.id,
    opportunityOrRiskId: item.id,
  };
}

const DISPOSITION_RANK: Record<ImprovementResult["disposition"], number> = {
  action: 4,
  recommend: 3,
  defer: 2,
  ignore: 1,
};

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function impactRank(item: OpportunityOrRisk | null): number {
  if (!item) return 0;
  if (item.estimatedImpact === "high") return 3;
  if (item.estimatedImpact === "medium") return 2;
  return 1;
}

function pickBest(results: ImprovementResult[]): ImprovementResult {
  return results.reduce((best, cur) => {
    const d = DISPOSITION_RANK[cur.disposition] - DISPOSITION_RANK[best.disposition];
    if (d !== 0) return d > 0 ? cur : best;
    const p =
      (PRIORITY_RANK[cur.impactEvaluation?.priority || ""] || 0) -
      (PRIORITY_RANK[best.impactEvaluation?.priority || ""] || 0);
    if (p !== 0) return p > 0 ? cur : best;
    const i = impactRank(cur.opportunityOrRisk) - impactRank(best.opportunityOrRisk);
    if (i !== 0) return i > 0 ? cur : best;
    const c =
      (cur.recommendation?.confidence ?? cur.opportunityOrRisk?.confidence ?? 0) -
      (best.recommendation?.confidence ?? best.opportunityOrRisk?.confidence ?? 0);
    return c > 0 ? cur : best;
  });
}

/**
 * Run the pipeline for a single domain module against one event.
 */
function runForModule(
  event: OperationalEvent,
  module: DomainAssessmentModule,
  observation: Observation,
  ctx: PipelineContext,
  baseTrace: ImprovementResult["trace"]
): ImprovementResult {
  const trace = {
    objective: OBJECTIVE,
    stages: [...baseTrace.stages],
  } as ImprovementResult["trace"];

  const understanding = module.understand(event, ctx);
  pushStage(trace, "understand", [
    `domain=${module.domain}`,
    understanding.summary,
    ...(understanding.pmsDuplicateRisk ? ["pms_duplicate_risk"] : []),
  ]);

  if (understanding.pmsDuplicateRisk) {
    pushStage(trace, "detect_situation", ["Blocked — PMS duplicate"], "ignore");
    return silencedResult(observation, {
      disposition: "ignore",
      understanding,
      domain: module.domain,
      silencedReason: "Would duplicate PMS — FreedomDesk stays silent",
      trace,
    });
  }

  const situation = module.detectSituation(understanding, event, ctx);
  if (!situation) {
    pushStage(trace, "detect_situation", ["No situation detected"], "ignore");
    return silencedResult(observation, {
      disposition: "ignore",
      understanding,
      domain: module.domain,
      silencedReason: "No actionable situation detected",
      trace,
    });
  }
  pushStage(trace, "detect_situation", [`kind=${situation.kind}`, situation.summary]);

  const item = module.identify(situation, understanding, event, ctx);
  if (!item) {
    pushStage(trace, "identify_opportunity_or_risk", ["Nothing material"], "ignore");
    return silencedResult(observation, {
      disposition: "ignore",
      understanding,
      situation,
      domain: module.domain,
      silencedReason: "No opportunity or risk that improves the practice",
      trace,
    });
  }
  pushStage(trace, "identify_opportunity_or_risk", [
    `${item.kind}:${item.title}`,
    `material_hint=${item.materialImprovement}`,
    item.reasonMaterial,
  ]);

  // Evaluate Impact & Prioritize — before any recommendation is drafted
  const impact = evaluateImpact({ item, situation, understanding, ctx });
  pushStage(
    trace,
    "evaluate_impact",
    [
      `material=${impact.materialImprovement}`,
      `recipient=${impact.recipient ?? "none"}`,
      `interruption=${impact.interruption}`,
      `priority=${impact.priority}`,
      `changesDecision=${impact.changesDecision}`,
      `shouldSurface=${impact.shouldSurface}`,
      ...impact.reasons.slice(0, 2),
    ],
    impact.shouldSurface ? undefined : "ignore"
  );

  if (!impact.shouldSurface) {
    const reason =
      impact.reasons.find((r) => /would not change a decision/i.test(r)) ||
      impact.reasons.find((r) => /suppress/i.test(r)) ||
      impact.reasons[impact.reasons.length - 1] ||
      "Impact evaluation suppressed recommendation";
    return silencedResult(observation, {
      disposition: "ignore",
      understanding,
      situation,
      opportunityOrRisk: item,
      impactEvaluation: impact,
      domain: module.domain,
      silencedReason: reason,
      trace,
    });
  }

  const draft = module.draftCommitment(item, situation, understanding, event, ctx);
  if (!draft) {
    pushStage(trace, "recommend", ["Domain declined to draft commitment"], "ignore");
    return silencedResult(observation, {
      disposition: "ignore",
      understanding,
      situation,
      opportunityOrRisk: item,
      impactEvaluation: impact,
      domain: module.domain,
      silencedReason: "Domain produced no commitment draft",
      trace,
    });
  }

  // Prefer impact-evaluated recipient when drafting ownership
  if (impact.recipient) {
    draft.primaryResponsibility = impact.recipient;
  }

  const gate = gateRecommendation({ understanding, item, draft, impact });
  pushStage(trace, "recommend", [gate.reason], gate.disposition);

  if (!gate.pass) {
    return silencedResult(observation, {
      disposition: gate.disposition,
      understanding,
      situation,
      opportunityOrRisk: item,
      impactEvaluation: impact,
      domain: module.domain,
      silencedReason: gate.reason,
      trace,
    });
  }

  const commitment = toCommitment(draft, item, situation, gate.actionThreshold, impact);
  const explanation = buildExplanation(
    draft.because,
    draft.expectedOutcome,
    draft.ifIgnored,
    draft.evidence
  );
  pushStage(trace, "explain", [
    explanation.because,
    `outcome=${explanation.expectedOutcome}`,
    `priority=${impact.priority}`,
    `interruption=${impact.interruption}`,
  ]);

  const recommendation: ImprovementRecommendation = {
    id: nextId("imp"),
    practiceId: event.practiceId,
    domain: module.domain,
    disposition: gate.disposition === "action" ? "action" : "recommend",
    decision: draft.decision || draft.verb,
    recommendedNextStep: draft.recommendedNextStep,
    explanation,
    commitment,
    confidence: commitment.confidence,
    urgencyTier: commitment.urgencyTier,
    owner: commitment.primaryResponsibility,
    opportunityOrRiskId: item.id,
    sourceEventIds: [event.id],
    createdAt: ctx.now,
    impact,
  };

  if (gate.actionThreshold === "met") {
    const action = materializeActionFromEvent(event, {
      verb: draft.verb,
      object: draft.object,
      because: draft.because,
      decision: draft.decision || draft.verb,
      ifIgnored: draft.ifIgnored,
      primaryResponsibility: draft.primaryResponsibility,
    });
    if (action) {
      recommendation.action = action;
    }
  }

  pushStage(trace, "track_outcome", ["Awaiting human outcome — not yet recorded"]);
  pushStage(trace, "learn", ["Learning deferred until outcome is recorded"]);

  return {
    practiceId: event.practiceId,
    eventIds: [event.id],
    domain: module.domain,
    disposition: gate.disposition,
    observation,
    understanding,
    situation,
    opportunityOrRisk: item,
    impactEvaluation: impact,
    recommendation,
    trace,
  };
}

/**
 * Run the full improvement pipeline for one operational event.
 * When multiple domains accept, the strongest material result wins.
 */
export function runImprovementPipeline(
  event: OperationalEvent,
  options: {
    modules?: DomainAssessmentModule[];
    ctx?: Partial<PipelineContext>;
  } = {}
): ImprovementResult {
  const now = options.ctx?.now || event.timestamp || new Date().toISOString();
  const ctx: PipelineContext = {
    practiceId: event.practiceId,
    now,
    openActionKeys: options.ctx?.openActionKeys,
  };

  const observation: Observation = {
    events: [event],
    practiceId: event.practiceId,
    observedAt: now,
  };

  const baseTrace = emptyTrace();
  pushStage(baseTrace, "observe", [`event=${event.eventType}`, `source=${event.source}`]);

  const modules = options.modules || DEFAULT_DOMAIN_MODULES;
  const accepted = selectDomainModules(event, modules);

  if (accepted.length === 0) {
    pushStage(baseTrace, "understand", ["No domain module accepts this event"], "ignore");
    return silencedResult(observation, {
      disposition: "ignore",
      silencedReason: "No intelligence domain accepts this event",
      trace: baseTrace,
    });
  }

  pushStage(
    baseTrace,
    "observe",
    [`domains=${accepted.map((m) => m.domain).join(",")}`]
  );

  const results = accepted.map((module) =>
    runForModule(event, module, observation, ctx, baseTrace)
  );

  return pickBest(results);
}
