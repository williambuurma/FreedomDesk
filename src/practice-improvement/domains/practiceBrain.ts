/**
 * Practice Brain domain — practice-timescale judgment over the same pipeline.
 *
 * Bridges event-level assessment into the Practice Brain's daily awareness loop
 * without a separate reasoning path. Batch opportunity detection remains in
 * practice-brain/; this module handles event-driven practice-brain situations.
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
  resolveOwner,
  resolveUrgency,
} from "./helpers.ts";

/**
 * Practice Brain accepts events that affect the daily situational model
 * when other domains have not already claimed a stronger specific assessment.
 * Used for cross-cutting practice rhythm (call surge, DNA freshness proxies).
 */
export const practiceBrainDomain: DomainAssessmentModule = {
  domain: "practice_brain",

  accepts(event: OperationalEvent): boolean {
    // Cross-cutting: incomplete routine calls that still need practice-level quality signal
    if (event.eventType !== "call_completed" || !isCallPayload(event.payload)) return false;
    const p = event.payload;
    if (p.sameDayEmergency) return false; // phone domain owns emergencies
    return p.completenessScore < 0.75 && (p.missingFields?.length ?? 0) >= 2;
  },

  understand(event: OperationalEvent, _ctx: PipelineContext): Understanding {
    const p = isCallPayload(event.payload) ? event.payload : null;
    const nextStep = event.routing?.recommendedNextStep || "";
    return {
      domain: "practice_brain",
      eventId: event.id,
      practiceId: event.practiceId,
      summary: "Call summary quality gap — practice awareness signal",
      intentHints: p ? [p.intent, "quality"] : ["quality"],
      urgencyTier: resolveUrgency(event),
      confidence: event.uncertainty.confidence,
      evidence: evidenceFromEvent(event),
      uncertainty: event.uncertainty,
      subject: event.subject,
      pmsDuplicateRisk: looksLikePmsDuplicate(nextStep),
      notes: p?.missingFields || [],
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
      domain: "practice_brain",
      kind: "summary_quality",
      summary: understanding.summary,
      subject: understanding.subject,
      evidence: understanding.evidence,
      confidence: understanding.confidence,
      detectedAt: ctx.now,
      sourceEventIds: [event.id],
      tags: ["practice_brain", "quality", ...understanding.notes.slice(0, 3)],
    };
  },

  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null {
    // Quiet: quality gaps are often informational — only surface when impact is clear
    const kind = "risk" as const;
    const estimatedImpact = "low" as const;
    const material = isMaterialImprovement({
      estimatedImpact,
      urgencyTier: understanding.urgencyTier,
      confidence: understanding.confidence,
      kind,
    });

    // Explicitly allow medium material when important + many missing fields
    const missing = understanding.notes.length;
    const elevated =
      understanding.urgencyTier !== "informational" && missing >= 2 && understanding.confidence >= 0.7;
    const materialFinal = material || elevated;

    return {
      id: nextId("opp"),
      practiceId: ctx.practiceId,
      domain: "practice_brain",
      kind,
      title: "Complete missing intake fields",
      description: `Call summary missing ${missing || "required"} fields — front desk rework risk`,
      situationId: situation.id,
      confidence: understanding.confidence,
      estimatedImpact: elevated ? "medium" : estimatedImpact,
      evidence: understanding.evidence,
      suggestedOwner: resolveOwner(event, "front_desk"),
      urgencyTier: understanding.urgencyTier,
      materialImprovement: materialFinal,
      reasonMaterial: materialFinal
        ? "Incomplete intake creates measurable front-desk rework"
        : materialReason({
            material: false,
            estimatedImpact,
            urgencyTier: understanding.urgencyTier,
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
    const fields = understanding.notes.slice(0, 3).join(", ") || "required fields";
    const next =
      event.routing?.recommendedNextStep?.trim() ||
      `Collect missing intake fields (${fields}) before the visit`;

    return {
      verb: "Complete intake",
      object: event.subject?.patientReferenceId || event.subject?.callId || event.id,
      because: item.description,
      primaryResponsibility: item.suggestedOwner,
      urgencyTier: item.urgencyTier,
      confidence: item.confidence,
      evidence: item.evidence,
      uncertainty: understanding.uncertainty.confidence
        ? understanding.uncertainty
        : defaultUncertainty(item.confidence),
      dueRule: "before_appointment",
      dependencies: [],
      recommendedNextStep: next,
      expectedOutcome: "Visit proceeds with complete typed data — no re-collection at the desk",
      ifIgnored: "Front desk re-asks the patient for information already discussed on the phone",
      decision: next.length <= 72 ? next : next.slice(0, 69).trimEnd() + "…",
    };
  },
};
