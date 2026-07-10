/**
 * Owner Intelligence — practice-level patterns that need owner/manager attention.
 * Quiet by default: only surfaces when stakes are strategic, not operational noise.
 */

import type { OperationalEvent } from "../../events/types.ts";
import {
  isMaterialImprovement,
  looksLikePmsDuplicate,
  materialReason,
} from "../gates.ts";
import type {
  CommitmentDraft,
  DomainAssessmentModule,
  OpportunityOrRisk,
  PipelineContext,
  Situation,
  Understanding,
} from "../types.ts";
import {
  defaultUncertainty,
  evidenceFromEvent,
  isCallPayload,
  nextId,
  resolveUrgency,
} from "./helpers.ts";

/**
 * Owner domain accepts system-tagged events or high-stakes call patterns
 * that imply capacity/trust decisions — not routine front-desk work.
 */
export const ownerDomain: DomainAssessmentModule = {
  domain: "owner",

  accepts(event: OperationalEvent): boolean {
    if (event.source === "system" && event.eventType === "call_completed") return true;
    if (!isCallPayload(event.payload)) return false;
    // Surge / incomplete emergency intake — owner-visible risk, not schedule mirror
    return (
      event.payload.sameDayEmergency === true &&
      (event.payload.completenessScore < 0.6 ||
        (event.payload.missingFields?.length ?? 0) >= 3)
    );
  },

  understand(event: OperationalEvent, _ctx: PipelineContext): Understanding {
    const nextStep = event.routing?.recommendedNextStep || "";
    return {
      domain: "owner",
      eventId: event.id,
      practiceId: event.practiceId,
      summary: "Owner-level practice risk signal",
      intentHints: ["owner", "capacity", "trust"],
      urgencyTier: resolveUrgency(event),
      confidence: event.uncertainty.confidence,
      evidence: evidenceFromEvent(event),
      uncertainty: event.uncertainty,
      subject: event.subject,
      pmsDuplicateRisk: looksLikePmsDuplicate(nextStep),
      notes: ["owner_attention"],
    };
  },

  detectSituation(
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): Situation | null {
    if (understanding.pmsDuplicateRisk) return null;
    return {
      id: nextId("sit"),
      practiceId: ctx.practiceId,
      domain: "owner",
      kind: "owner_attention",
      summary: "Incomplete emergency intake may indicate process or staffing gap",
      subject: understanding.subject,
      evidence: understanding.evidence,
      confidence: understanding.confidence,
      detectedAt: ctx.now,
      sourceEventIds: [event.id],
      tags: ["owner", "quality"],
    };
  },

  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null {
    const kind = "risk" as const;
    const estimatedImpact = "medium" as const;
    // Owner signals require higher bar — informational owner noise stays silent
    const urgencyTier =
      understanding.urgencyTier === "critical" ? understanding.urgencyTier : "important";

    const material = isMaterialImprovement({
      estimatedImpact,
      urgencyTier,
      confidence: Math.min(understanding.confidence, 0.85),
      kind,
    });

    return {
      id: nextId("opp"),
      practiceId: ctx.practiceId,
      domain: "owner",
      kind,
      title: "Review emergency intake quality",
      description:
        "Emergency call closed with material gaps — may indicate after-hours process or staffing risk",
      situationId: situation.id,
      confidence: Math.min(understanding.confidence, 0.85),
      estimatedImpact,
      evidence: understanding.evidence,
      suggestedOwner: "office_manager",
      urgencyTier,
      materialImprovement: material,
      reasonMaterial: materialReason({
        material,
        estimatedImpact,
        urgencyTier,
        kind,
      }),
      sourceEventIds: [event.id],
    };
  },

  draftCommitment(
    item: OpportunityOrRisk,
    _situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    _ctx: PipelineContext
  ): CommitmentDraft | null {
    if (!item.materialImprovement) return null;
    const next =
      "Review after-hours emergency intake completeness with the team — improve process, not the chart";

    return {
      verb: "Review process",
      object: event.practiceId,
      because: item.description,
      primaryResponsibility: "office_manager",
      urgencyTier: item.urgencyTier,
      confidence: item.confidence,
      evidence: item.evidence,
      uncertainty: understanding.uncertainty.confidence
        ? understanding.uncertainty
        : defaultUncertainty(item.confidence),
      dueRule: "end_of_shift",
      dependencies: [],
      recommendedNextStep: next,
      expectedOutcome: "Intake quality improves; fewer incomplete emergency summaries",
      ifIgnored: "Process gaps persist and emergency patients keep arriving under-documented",
      decision: "Review emergency intake quality with the team",
    };
  },
};
