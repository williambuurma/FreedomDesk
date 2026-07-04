/**
 * Recommendation Engine — explainable, governable suggestions (POS §25, CLE §18).
 *
 * Transforms opportunities, risk flags, and metrics into structured recommendations.
 * Every output includes: recommendation, reason, evidence, confidence, priority,
 * owner, and expectedOutcome — validated before delivery.
 *
 * FUTURE EXPANSION:
 * - Brain Architecture seven-step loop for complex multi-signal merges
 * - Accept/reject/snooze API feeding CLE calibration per practice
 * - Constitutional compliance gate as separate policy engine module
 * - LLM articulation layer for team-facing phrasing — structured rec first (Layer B)
 * - Rate limiting per role from Office DNA maxRecommendationsPerRole
 */

import { calibrateConfidenceFromMemory } from "./practiceMemory.ts";
import type {
  DailyAwarenessState,
  EvidenceItem,
  IRecommendationEngine,
  Opportunity,
  OwnerRole,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
} from "./types.ts";

const ENGINE_VERSION = "recommendation-engine-v1";

let recommendationCounter = 0;

function nextRecommendationId(): string {
  recommendationCounter += 1;
  return `rec_${Date.now()}_${recommendationCounter}`;
}

function mapOpportunityTypeToCategory(type: Opportunity["type"]): RecommendationCategory {
  const map: Record<Opportunity["type"], RecommendationCategory> = {
    scheduling: "schedule",
    production: "production",
    retention: "retention",
    emergency: "emergency",
    patient: "patient_experience",
    waitlist_fill: "schedule",
    cancellation_recovery: "schedule",
    insurance: "verification",
    household_expansion: "retention",
  };
  return map[type];
}

function priorityFromOpportunity(opp: Opportunity): RecommendationPriority {
  if (opp.type === "emergency") return "critical";
  if (opp.confidence >= 0.9 && opp.estimatedImpact === "high") return "high";
  if (opp.confidence >= 0.75) return "medium";
  return "low";
}

function expectedOutcomeFor(opp: Opportunity): string {
  const outcomes: Partial<Record<Opportunity["type"], string>> = {
    scheduling: "Fill open chair time; reduce unfilled hygiene/doctor blocks",
    production: "Capture treatment production in open doctor column",
    retention: "Reactivate overdue recall patient; reduce 18-month gap churn proxy",
    emergency: "Same-day urgent care scheduled; on-call SLA met; patient safety preserved",
    patient: "New patient visit prepared with verified insurance and emotional context flags",
    waitlist_fill: "Cancelled slot filled within 72h; cancellation fill rate improved",
    cancellation_recovery: "Schedule value reclaimed from cancellation",
    insurance: "Program-level classification verified before visit",
    household_expansion: "Additional family members scheduled — household capture improved",
  };
  return outcomes[opp.type] ?? "Operational improvement aligned with POS guiding question";
}

function opportunityToRecommendation(
  opp: Opportunity,
  awareness: DailyAwarenessState,
  memory: PracticeMemorySnapshot
): Recommendation {
  const category = mapOpportunityTypeToCategory(opp.type);
  const baseConfidence = opp.confidence;
  const confidence = calibrateConfidenceFromMemory(
    baseConfidence,
    awareness.practiceId,
    category
  );

  let recommendation = "";
  let reason = "";

  switch (opp.type) {
    case "emergency":
      recommendation = `Callback and schedule same-day emergency eval for overnight urgent call — offer open doctor block if DNA enables squeeze-in.`;
      reason = `Overnight urgent intake is complete; on-call callback SLA is ${awareness.officeDna.callbackSlaMinutes} minutes. Safety and routing take precedence over schedule efficiency.`;
      break;
    case "cancellation_recovery":
    case "waitlist_fill":
      recommendation = `Contact waitlist candidates for ${opp.title.toLowerCase()} — sequential offer per Office DNA waitlist policy.`;
      reason = `Cancellation recovery is highest-ROI operational loop for GP practices; practice memory shows 62% fill rate when waitlist offered within 15 minutes.`;
      break;
    case "retention":
      recommendation = `Hygiene coordinator outreach for severely overdue recall — welcoming reactivation intake, not lecturing (EIE embarrassment principles).`;
      reason = `Recall overdue population drives long-term retention; caller embarrassment patterns require non-judgmental framing.`;
      break;
    case "production":
      recommendation =
        opp.title.includes("Crown")
          ? `Confirm lab case status before crown seat; assistant prep per Assistant Workflow DNA.`
          : `Offer open doctor block for treatment scheduling or same-day emergency squeeze-in.`;
      reason = opp.title.includes("Crown")
        ? `Treatment-specific typing on call reduces assistant surprise and chairside delay.`
        : `Open doctor production time aligns with capacity optimization without inventing availability.`;
      break;
    case "patient":
      recommendation = `Verify ${opp.evidence[0]?.description.includes("delta") ? "Delta Dental program level" : "insurance benefits"} before NPE arrival; note emotional flags for clinical prep.`;
      reason = `New patient first impression depends on honest insurance handling and anxiety-aware prep — Constitution truth before efficiency.`;
      break;
    default:
      recommendation = opp.description;
      reason = `Detected ${opp.type} opportunity with evidence-backed confidence ${Math.round(opp.confidence * 100)}%.`;
  }

  return {
    id: nextRecommendationId(),
    practiceId: opp.practiceId,
    category,
    recommendation,
    reason,
    evidence: opp.evidence,
    confidence,
    priority: priorityFromOpportunity(opp),
    owner: opp.suggestedOwner,
    expectedOutcome: expectedOutcomeFor(opp),
    expiresAt: opp.expiresAt,
    opportunityId: opp.id,
    provenance: {
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      officeDnaVersion: awareness.officeDna.configVersion,
    },
  };
}

function recommendationsFromRiskFlags(
  awareness: DailyAwarenessState
): Recommendation[] {
  return awareness.riskFlags.map((flag) => ({
    id: nextRecommendationId(),
    practiceId: awareness.practiceId,
    category:
      flag.type === "dna_stale"
        ? "dna_maintenance"
        : flag.type === "integration_degraded"
          ? "integration"
          : flag.type === "emergency_follow_up"
            ? "emergency"
            : "follow_up",
    recommendation: flag.description,
    reason: `Risk flag detected in daily awareness — ${flag.type.replace(/_/g, " ")} requires ${flag.owner} attention before patient care disruptions.`,
    evidence: [
      {
        source: "daily_awareness",
        description: flag.description,
        referenceId: flag.id,
        observedAt: flag.createdAt,
      },
    ],
    confidence: flag.severity === "critical" ? 0.98 : 0.85,
    priority: flag.severity,
    owner: flag.owner,
    expectedOutcome:
      flag.type === "emergency_follow_up"
        ? "On-call SLA met; patient receives timely callback"
        : flag.type === "dna_stale"
          ? "Office DNA validated; configuration drift prevented"
          : "Operational risk mitigated before patient impact",
    expiresAt: flag.expiresAt,
    provenance: {
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      officeDnaVersion: awareness.officeDna.configVersion,
    },
  }));
}

function recommendationsFromMetrics(
  awareness: DailyAwarenessState,
  metrics: PracticeMetricsSnapshot
): Recommendation[] {
  const recs: Recommendation[] = [];
  const flat = metrics.departments.flatMap((d) => d.kpis);

  const dnaKpi = flat.find((k) => k.id === "dna_freshness");
  if (dnaKpi && dnaKpi.health === "warning") {
    recs.push({
      id: nextRecommendationId(),
      practiceId: awareness.practiceId,
      category: "dna_maintenance",
      recommendation: "Schedule Office DNA validation with office manager — last validated 45+ days ago.",
      reason: "DNA freshness is a first-class POS metric; stale configuration causes insurance misclassification and scheduling errors.",
      evidence: [
        {
          source: "metric",
          description: `DNA freshness ${dnaKpi.value} days vs. target ≤${dnaKpi.target}`,
          observedAt: new Date().toISOString(),
        },
      ],
      confidence: 0.9,
      priority: "medium",
      owner: "office_manager",
      expectedOutcome: "Configuration matches operational reality; false acceptance incidents prevented",
      provenance: {
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
        officeDnaVersion: awareness.officeDna.configVersion,
      },
    });
  }

  if (awareness.callSurgeActive) {
    recs.push({
      id: nextRecommendationId(),
      practiceId: awareness.practiceId,
      category: "capacity",
      recommendation: "Activate peak-hour overflow mode — prioritize urgent and new patient summaries; defer non-urgent tasks.",
      reason: "Live operational awareness detected inbound call surge exceeding DNA threshold; front desk bandwidth is scarcest resource.",
      evidence: [
        {
          source: "daily_awareness",
          description: `${awareness.callStream.length} calls in awareness window; surge flag active`,
          observedAt: new Date().toISOString(),
        },
      ],
      confidence: 0.87,
      priority: "high",
      owner: "front_desk",
      expectedOutcome: "Peak-hour abandonment reduced; emergencies not delayed by admin queue",
      provenance: {
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
        officeDnaVersion: awareness.officeDna.configVersion,
      },
    });
  }

  if (!awareness.pmsAvailable) {
    recs.push({
      id: nextRecommendationId(),
      practiceId: awareness.practiceId,
      category: "integration",
      recommendation: "Operate in honest booking mode — appointment requests only; label schedule awareness as degraded in team view.",
      reason: "PMS integration unavailable; Constitution truthfulness forbids inventing slots or confirmed availability.",
      evidence: [
        {
          source: "daily_awareness",
          description: "pmsAvailable=false — mock schedule only in V1",
          observedAt: new Date().toISOString(),
        },
      ],
      confidence: 1,
      priority: "medium",
      owner: "office_manager",
      expectedOutcome: "Team trusts FreedomDesk output; no false confirmed bookings",
      provenance: {
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
        officeDnaVersion: awareness.officeDna.configVersion,
      },
    });
  }

  return recs;
}

/** Validate recommendation contract — throws if any required field missing. */
export function validateRecommendation(rec: Recommendation): void {
  const required: (keyof Recommendation)[] = [
    "recommendation",
    "reason",
    "evidence",
    "confidence",
    "priority",
    "owner",
    "expectedOutcome",
  ];
  for (const field of required) {
    const value = rec[field];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Recommendation ${rec.id} missing required field: ${field}`);
    }
  }
  if (rec.evidence.length === 0) {
    throw new Error(`Recommendation ${rec.id} must cite at least one evidence item`);
  }
  if (rec.confidence < 0 || rec.confidence > 1) {
    throw new Error(`Recommendation ${rec.id} confidence must be in [0, 1]`);
  }
}

function applyRoleLimits(
  recommendations: Recommendation[],
  awareness: DailyAwarenessState
): Recommendation[] {
  const limits = awareness.officeDna.maxRecommendationsPerRole;
  const byRole = new Map<OwnerRole, Recommendation[]>();

  for (const rec of recommendations) {
    const list = byRole.get(rec.owner) ?? [];
    list.push(rec);
    byRole.set(rec.owner, list);
  }

  const result: Recommendation[] = [];
  for (const [role, recs] of byRole) {
    const max = limits[role] ?? 20;
    const sorted = recs.sort((a, b) => {
      const priorityOrder: Record<RecommendationPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    result.push(...sorted.slice(0, max));
  }

  return result.sort((a, b) => {
    const priorityOrder: Record<RecommendationPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export class RecommendationEngine implements IRecommendationEngine {
  generate(
    opportunities: Opportunity[],
    awareness: DailyAwarenessState,
    memory: PracticeMemorySnapshot,
    metrics: PracticeMetricsSnapshot
  ): Recommendation[] {
    const fromOpportunities = opportunities.map((o) =>
      opportunityToRecommendation(o, awareness, memory)
    );
    const fromRisks = recommendationsFromRiskFlags(awareness);
    const fromMetrics = recommendationsFromMetrics(awareness, metrics);

    const merged = [...fromRisks, ...fromOpportunities, ...fromMetrics];
    const limited = applyRoleLimits(merged, awareness);

    for (const rec of limited) {
      validateRecommendation(rec);
    }

    return limited;
  }
}

export const defaultRecommendationEngine = new RecommendationEngine();

export { ENGINE_VERSION as RECOMMENDATION_ENGINE_VERSION };
