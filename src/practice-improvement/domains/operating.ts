/**
 * Operating Intelligence — schedule, cancellation, conflict, insurance verification.
 * Improves practice rhythm without mirroring the PMS schedule of record.
 *
 * Recoverable Schedule Opportunity: when a cancellation carries opening + candidates,
 * rank patients and draft one named recommendation (Situation → Recommendation → Action).
 */

import type { OperationalEvent } from "../../events/types.ts";
import {
  isMaterialImprovement,
  looksLikePmsDuplicate,
  materialReason,
} from "../gates.ts";
import {
  assessScheduleOpportunity,
  buildPrimaryAction,
  buildRecommendationLine,
  buildSituationLine,
  isScheduleOpportunityPayload,
} from "../scheduleOpportunity.ts";
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

const OPERATING_EVENTS = new Set([
  "appointment_cancelled",
  "schedule_conflict_detected",
  "insurance_verification_needed",
]);

export const operatingDomain: DomainAssessmentModule = {
  domain: "operating",

  accepts(event: OperationalEvent): boolean {
    return OPERATING_EVENTS.has(event.eventType);
  },

  understand(event: OperationalEvent, _ctx: PipelineContext): Understanding {
    const urgencyTier = resolveUrgency(event);
    const nextStep = event.routing?.recommendedNextStep || "";
    const hasScheduleOpp =
      event.eventType === "appointment_cancelled" &&
      isScheduleOpportunityPayload(event.payload);

    const labels: Record<string, string> = {
      appointment_cancelled: hasScheduleOpp
        ? "Recoverable schedule opening with fill candidates"
        : "Appointment cancelled — recovery opportunity",
      schedule_conflict_detected: "Schedule conflict needs reconciliation",
      insurance_verification_needed: "Insurance verification needed before visit",
    };

    return {
      domain: "operating",
      eventId: event.id,
      practiceId: event.practiceId,
      summary: labels[event.eventType] || event.eventType,
      intentHints: hasScheduleOpp
        ? [event.eventType, "recoverable_schedule_opportunity"]
        : [event.eventType],
      urgencyTier,
      confidence: event.uncertainty.confidence,
      evidence: evidenceFromEvent(event),
      uncertainty: event.uncertainty,
      subject: event.subject,
      pmsDuplicateRisk: looksLikePmsDuplicate(nextStep),
      notes: hasScheduleOpp ? ["schedule_opportunity_payload"] : [],
    };
  },

  detectSituation(
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): Situation | null {
    if (understanding.pmsDuplicateRisk) return null;

    if (
      event.eventType === "appointment_cancelled" &&
      isScheduleOpportunityPayload(event.payload)
    ) {
      const assessment = assessScheduleOpportunity(event.payload);
      if (!assessment.meaningfulOpening) {
        return null;
      }
      // Quiet when no realistic patient fits — do not nag with weak waitlist noise.
      if (!assessment.shouldRecommend || !assessment.best) {
        return null;
      }

      const opening = event.payload.opening;
      const best = assessment.best.candidate;
      return {
        id: nextId("sit"),
        practiceId: ctx.practiceId,
        domain: "operating",
        kind: "recoverable_schedule_opportunity",
        summary: buildSituationLine(opening),
        subject: {
          patientReferenceId: best.patientReferenceId,
        },
        evidence: understanding.evidence,
        confidence: understanding.confidence,
        detectedAt: ctx.now,
        sourceEventIds: [event.id],
        tags: ["operating", "schedule_recovery", event.eventType],
      };
    }

    const kindMap: Record<string, string> = {
      appointment_cancelled: "cancellation_recovery",
      schedule_conflict_detected: "schedule_conflict",
      insurance_verification_needed: "verification_queue",
    };

    return {
      id: nextId("sit"),
      practiceId: ctx.practiceId,
      domain: "operating",
      kind: kindMap[event.eventType] || event.eventType,
      summary: understanding.summary,
      subject: understanding.subject,
      evidence: understanding.evidence,
      confidence: understanding.confidence,
      detectedAt: ctx.now,
      sourceEventIds: [event.id],
      tags: ["operating", event.eventType],
    };
  },

  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null {
    let kind: "opportunity" | "risk" = "opportunity";
    let estimatedImpact: OpportunityOrRisk["estimatedImpact"] = "medium";
    let title = understanding.summary;
    let description = understanding.summary;

    if (situation.kind === "recoverable_schedule_opportunity") {
      if (!isScheduleOpportunityPayload(event.payload)) return null;
      const assessment = assessScheduleOpportunity(event.payload);
      if (!assessment.best) return null;

      estimatedImpact = "high";
      title = `Recover ${event.payload.opening.durationMinutes}-minute opening`;
      description = buildRecommendationLine(event.payload.opening, assessment.best);
    } else if (situation.kind === "cancellation_recovery") {
      estimatedImpact = "high";
      title = "Fill cancelled chair from waitlist";
      description =
        "Cancellation creates recoverable production — offer waitlist before the slot goes empty";
    } else if (situation.kind === "schedule_conflict") {
      kind = "risk";
      estimatedImpact = "medium";
      title = "Reconcile schedule conflict";
      description =
        "Appointment type or provider conflict needs human judgment — FreedomDesk flags, PMS remains schedule of record";
    } else if (situation.kind === "verification_queue") {
      kind = "risk";
      estimatedImpact = "medium";
      title = "Clear insurance verification before visit";
      description = "Unverified insurance creates check-in friction and front-desk rework";
    }

    const material = isMaterialImprovement({
      estimatedImpact,
      urgencyTier: understanding.urgencyTier,
      confidence: understanding.confidence,
      kind,
    });

    return {
      id: nextId("opp"),
      practiceId: ctx.practiceId,
      domain: "operating",
      kind,
      title,
      description,
      situationId: situation.id,
      confidence: understanding.confidence,
      estimatedImpact,
      evidence: understanding.evidence,
      suggestedOwner: resolveOwner(event, "front_desk"),
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
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    _ctx: PipelineContext
  ): CommitmentDraft | null {
    if (!item.materialImprovement) return null;

    if (situation.kind === "recoverable_schedule_opportunity") {
      if (!isScheduleOpportunityPayload(event.payload)) return null;
      const assessment = assessScheduleOpportunity(event.payload);
      if (!assessment.best) return null;

      const opening = event.payload.opening;
      const best = assessment.best;
      const primaryAction = buildPrimaryAction(best.candidate);
      const recommendation = buildRecommendationLine(opening, best);

      return {
        verb: "Call",
        object: best.candidate.patientReferenceId,
        because: recommendation,
        primaryResponsibility: item.suggestedOwner,
        urgencyTier: item.urgencyTier,
        confidence: item.confidence,
        evidence: item.evidence,
        uncertainty: understanding.uncertainty.confidence
          ? understanding.uncertainty
          : defaultUncertainty(item.confidence),
        dueRule: "same_day",
        dependencies: [],
        recommendedNextStep:
          event.routing?.recommendedNextStep?.trim() || recommendation,
        expectedOutcome: "Open chair recovered with an appropriate treatment visit",
        ifIgnored: "An open chair stays empty",
        decision: primaryAction.length <= 72 ? primaryAction : primaryAction.slice(0, 69).trimEnd() + "…",
      };
    }

    const defaults: Record<string, { verb: string; next: string; due: string }> = {
      cancellation_recovery: {
        verb: "Offer waitlist",
        next: "Contact waitlist candidates for the open slot per Office DNA waitlist policy",
        due: "same_day",
      },
      schedule_conflict: {
        verb: "Review conflict",
        next: "Reconcile appointment type with provider — update PMS as schedule of record",
        due: "before_appointment",
      },
      verification_queue: {
        verb: "Verify program",
        next: "Verify insurance to program level before the visit — never treat brand as plan",
        due: "before_appointment",
      },
    };

    const d = defaults[situation.kind] || {
      verb: "Follow up",
      next: event.routing?.recommendedNextStep || item.title,
      due: "end_of_shift",
    };

    return {
      verb: d.verb,
      object: event.subject?.patientReferenceId || event.id,
      because: item.description,
      primaryResponsibility: item.suggestedOwner,
      urgencyTier: item.urgencyTier,
      confidence: item.confidence,
      evidence: item.evidence,
      uncertainty: understanding.uncertainty.confidence
        ? understanding.uncertainty
        : defaultUncertainty(item.confidence),
      dueRule: d.due,
      dependencies: [],
      recommendedNextStep: event.routing?.recommendedNextStep?.trim() || d.next,
      expectedOutcome: "Operating friction cleared without rework or empty chair time",
      ifIgnored:
        situation.kind === "cancellation_recovery"
          ? "An open chair stays empty"
          : "Tomorrow's visit stalls or the wrong appointment type proceeds",
      decision: d.next.length <= 72 ? d.next : d.next.slice(0, 69).trimEnd() + "…",
    };
  },
};
