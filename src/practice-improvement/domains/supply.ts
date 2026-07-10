/**
 * Supply Intelligence — lab status and clinical prep readiness.
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
  nextId,
  resolveOwner,
  resolveUrgency,
} from "./helpers.ts";

export const supplyDomain: DomainAssessmentModule = {
  domain: "supply",

  accepts(event: OperationalEvent): boolean {
    return event.eventType === "lab_status_changed";
  },

  understand(event: OperationalEvent, _ctx: PipelineContext): Understanding {
    const payload = event.payload as Record<string, unknown>;
    const status = typeof payload.status === "string" ? payload.status : "unknown";
    const nextStep = event.routing?.recommendedNextStep || "";

    return {
      domain: "supply",
      eventId: event.id,
      practiceId: event.practiceId,
      summary: `Lab status changed — ${status}`,
      intentHints: ["lab", status],
      urgencyTier: resolveUrgency(event),
      confidence: event.uncertainty.confidence,
      evidence: evidenceFromEvent(event),
      uncertainty: event.uncertainty,
      subject: event.subject,
      pmsDuplicateRisk: looksLikePmsDuplicate(nextStep),
      notes: [status],
    };
  },

  detectSituation(
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): Situation | null {
    if (understanding.pmsDuplicateRisk) return null;
    const status = understanding.notes[0] || "unknown";
    const atRisk = /not_received|delayed|rejected|missing/i.test(status);

    return {
      id: nextId("sit"),
      practiceId: ctx.practiceId,
      domain: "supply",
      kind: atRisk ? "lab_at_risk" : "lab_update",
      summary: understanding.summary,
      subject: understanding.subject,
      evidence: understanding.evidence,
      confidence: understanding.confidence,
      detectedAt: ctx.now,
      sourceEventIds: [event.id],
      tags: ["supply", "lab", status],
    };
  },

  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null {
    if (situation.kind === "lab_update") {
      // Quiet: routine received/shipped updates do not interrupt
      return null;
    }

    const kind = "risk" as const;
    const estimatedImpact = "high" as const;
    const material = isMaterialImprovement({
      estimatedImpact,
      urgencyTier: understanding.urgencyTier,
      confidence: understanding.confidence,
      kind,
    });

    return {
      id: nextId("opp"),
      practiceId: ctx.practiceId,
      domain: "supply",
      kind,
      title: "Confirm lab case before procedure",
      description:
        "Lab case is not ready — confirm or reschedule before the patient is in the chair",
      situationId: situation.id,
      confidence: understanding.confidence,
      estimatedImpact,
      evidence: understanding.evidence,
      suggestedOwner: resolveOwner(event, "assistant"),
      urgencyTier: understanding.urgencyTier,
      materialImprovement: material,
      reasonMaterial: materialReason({
        material,
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
    const next =
      event.routing?.recommendedNextStep?.trim() ||
      "Confirm lab case arrival before the scheduled procedure";

    return {
      verb: "Confirm lab case",
      object: event.subject?.patientReferenceId || event.id,
      because: item.description,
      primaryResponsibility: item.suggestedOwner,
      urgencyTier: item.urgencyTier,
      confidence: item.confidence,
      evidence: item.evidence,
      uncertainty: understanding.uncertainty.confidence
        ? understanding.uncertainty
        : defaultUncertainty(item.confidence),
      dueRule: "before_procedure",
      dependencies: [],
      recommendedNextStep: next,
      expectedOutcome: "Procedure proceeds with case in hand, or is rescheduled before arrival",
      ifIgnored: "The appointment may need to be postponed with the patient already here",
      decision: next.length <= 72 ? next : next.slice(0, 69).trimEnd() + "…",
    };
  },
};
