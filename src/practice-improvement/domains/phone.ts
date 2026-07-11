/**
 * Phone Intelligence — call_completed and boundary_utterance assessments.
 *
 * Phone Opportunity Recovery: when a call_completed event carries a
 * phone_opportunity/v1 payload, assess resolution quality and draft one
 * named recommendation (Situation → Recommendation → Action).
 */

import type { OperationalEvent } from "../../events/types.ts";
import {
  isMaterialImprovement,
  looksLikePmsDuplicate,
  materialReason,
} from "../gates.ts";
import {
  assessPhoneOpportunity,
  buildPhonePrimaryAction,
  buildPhoneRecommendationLine,
  buildPhoneSituationLine,
  buildPhoneStake,
  isPhoneOpportunityPayload,
  selectPhoneRecipient,
} from "../phoneOpportunity.ts";
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

export const phoneDomain: DomainAssessmentModule = {
  domain: "phone",

  accepts(event: OperationalEvent): boolean {
    if (event.eventType === "boundary_utterance") return true;
    if (event.eventType !== "call_completed") return false;
    if (isPhoneOpportunityPayload(event.payload)) return true;
    if (!isCallPayload(event.payload)) return false;
    const p = event.payload;
    // Phone owns actionable call follow-ups — not every completed call
    if (p.sameDayEmergency || p.urgency === "emergency" || p.urgency === "urgent") {
      return true;
    }
    if (p.missingFields?.some((f) => /insurance/i.test(f))) return true;
    if (p.intent === "new_patient" || p.intent === "NEW_PATIENT") return true;
    if (event.routing?.recommendedNextStep?.trim()) return true;
    if (event.routing?.urgencyTier === "critical" || event.routing?.urgencyTier === "important") {
      return true;
    }
    return false;
  },

  understand(event: OperationalEvent, _ctx: PipelineContext): Understanding {
    const evidence = evidenceFromEvent(event);
    const confidence = event.uncertainty.confidence;
    const notes: string[] = [];
    const intentHints: string[] = [];

    if (isPhoneOpportunityPayload(event.payload)) {
      const p = event.payload;
      intentHints.push(p.opportunityType, "recoverable_phone_opportunity");
      notes.push("phone_opportunity_payload");
      if (p.careDelayed) notes.push("care_delayed");
      if (p.barriers.length) notes.push(`barriers:${p.barriers.join(",")}`);

      return {
        domain: "phone",
        eventId: event.id,
        practiceId: event.practiceId,
        summary: "Recoverable phone opportunity — unresolved call needs follow-up",
        intentHints,
        urgencyTier: resolveUrgency(event),
        confidence,
        evidence,
        uncertainty: event.uncertainty,
        subject: {
          patientReferenceId: p.call.patientReferenceId,
          callId: p.call.callId,
        },
        pmsDuplicateRisk: looksLikePmsDuplicate(
          event.routing?.recommendedNextStep || ""
        ),
        notes,
      };
    }

    const urgencyTier = resolveUrgency(event);

    if (isCallPayload(event.payload)) {
      intentHints.push(event.payload.intent);
      if (event.payload.sameDayEmergency) notes.push("same_day_emergency");
      if (event.payload.afterHours) notes.push("after_hours");
      if (event.payload.missingFields?.length) {
        notes.push(`missing_fields:${event.payload.missingFields.length}`);
      }
      if (event.payload.completenessScore < 0.7) notes.push("incomplete_intake");
    }

    const nextStep = event.routing?.recommendedNextStep || "";
    const pmsDuplicateRisk = looksLikePmsDuplicate(nextStep);

    let summary = "Phone event observed";
    if (event.eventType === "boundary_utterance") {
      summary = "Boundary utterance flagged during call";
    } else if (isCallPayload(event.payload)) {
      const p = event.payload;
      summary = p.sameDayEmergency
        ? "Same-day emergency call completed"
        : `Call completed — ${p.intent.replace(/_/g, " ")}`;
    }

    return {
      domain: "phone",
      eventId: event.id,
      practiceId: event.practiceId,
      summary,
      intentHints,
      urgencyTier,
      confidence,
      evidence,
      uncertainty: event.uncertainty,
      subject: event.subject,
      pmsDuplicateRisk,
      notes,
    };
  },

  detectSituation(
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): Situation | null {
    if (understanding.pmsDuplicateRisk) return null;

    if (isPhoneOpportunityPayload(event.payload)) {
      const assessment = assessPhoneOpportunity(event.payload);
      // Quiet when the call was resolved, weak, duplicate, or not material.
      if (!assessment.shouldRecommend || assessment.scored.suppressed) {
        return null;
      }

      return {
        id: nextId("sit"),
        practiceId: ctx.practiceId,
        domain: "phone",
        kind: "recoverable_phone_opportunity",
        summary: buildPhoneSituationLine(event.payload),
        subject: {
          patientReferenceId: event.payload.call.patientReferenceId,
          callId: event.payload.call.callId,
        },
        evidence: understanding.evidence,
        confidence: understanding.confidence,
        detectedAt: ctx.now,
        sourceEventIds: [event.id],
        tags: ["phone", "phone_recovery", event.payload.opportunityType],
      };
    }

    if (event.eventType === "boundary_utterance") {
      return {
        id: nextId("sit"),
        practiceId: ctx.practiceId,
        domain: "phone",
        kind: "boundary_review",
        summary: understanding.summary,
        subject: understanding.subject,
        evidence: understanding.evidence,
        confidence: understanding.confidence,
        detectedAt: ctx.now,
        sourceEventIds: [event.id],
        tags: ["phone", "boundary"],
      };
    }

    if (!isCallPayload(event.payload)) return null;
    const p = event.payload;
    let kind = "call_follow_up";
    const tags = ["phone", p.intent];
    if (p.sameDayEmergency || p.urgency === "emergency") {
      kind = "emergency_callback";
      tags.push("emergency");
    } else if (p.missingFields?.some((f) => /insurance/i.test(f))) {
      kind = "insurance_incomplete";
      tags.push("insurance");
    } else if (p.intent === "new_patient" || p.intent === "NEW_PATIENT") {
      kind = "new_patient_prep";
      tags.push("new_patient");
    }

    return {
      id: nextId("sit"),
      practiceId: ctx.practiceId,
      domain: "phone",
      kind,
      summary: understanding.summary,
      subject: understanding.subject,
      evidence: understanding.evidence,
      confidence: understanding.confidence,
      detectedAt: ctx.now,
      sourceEventIds: [event.id],
      tags,
    };
  },

  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null {
    if (situation.kind === "recoverable_phone_opportunity") {
      if (!isPhoneOpportunityPayload(event.payload)) return null;
      const assessment = assessPhoneOpportunity(event.payload);
      if (!assessment.shouldRecommend) return null;

      const p = event.payload;
      const isClinicalRisk =
        p.opportunityType === "emergency_no_callback" ||
        p.opportunityType === "urgent_symptoms_unresolved" ||
        p.clinicalUrgency === "critical" ||
        p.clinicalUrgency === "high";

      const kind: "opportunity" | "risk" = isClinicalRisk ? "risk" : "opportunity";
      const estimatedImpact: OpportunityOrRisk["estimatedImpact"] =
        isClinicalRisk ||
        p.estimatedProductionImpact === "high" ||
        p.conversionLikelihood === "high"
          ? "high"
          : "medium";

      const material = isMaterialImprovement({
        estimatedImpact,
        urgencyTier: assessment.scored.urgencyTier,
        confidence: understanding.confidence,
        kind,
      });

      return {
        id: nextId("opp"),
        practiceId: ctx.practiceId,
        domain: "phone",
        kind,
        title: isClinicalRisk
          ? "Recover urgent unresolved phone call"
          : "Recover unresolved phone opportunity",
        description: buildPhoneRecommendationLine(p),
        situationId: situation.id,
        confidence: understanding.confidence,
        estimatedImpact,
        evidence: understanding.evidence,
        suggestedOwner: selectPhoneRecipient(p),
        urgencyTier: assessment.scored.urgencyTier,
        materialImprovement: material,
        reasonMaterial: materialReason({
          material,
          estimatedImpact,
          urgencyTier: assessment.scored.urgencyTier,
          kind,
        }),
        sourceEventIds: [event.id],
      };
    }

    const urgencyTier = understanding.urgencyTier;
    let estimatedImpact: OpportunityOrRisk["estimatedImpact"] = "medium";
    let kind: "opportunity" | "risk" = "opportunity";
    let title = "Phone follow-up";
    let description = understanding.summary;

    if (situation.kind === "emergency_callback") {
      kind = "risk";
      estimatedImpact = "high";
      title = "Same-day emergency callback";
      description = "Overnight or urgent intake needs callback within on-call SLA";
    } else if (situation.kind === "insurance_incomplete") {
      kind = "risk";
      estimatedImpact = "medium";
      title = "Insurance classification incomplete";
      description = "Visit prep stalls without program-level insurance classification";
    } else if (situation.kind === "new_patient_prep") {
      estimatedImpact = "medium";
      title = "New patient intake ready for prep";
      description = "Structured intake complete — front desk can prepare arrival without rework";
    } else if (situation.kind === "boundary_review") {
      kind = "risk";
      estimatedImpact = "low";
      title = "Boundary utterance review";
      description = "Call crossed a constitutional boundary — review for coaching, not patient action";
    } else if (urgencyTier === "informational" && understanding.confidence < 0.9) {
      // Quiet: routine low-signal calls do not create opportunities
      return null;
    }

    // Critical safety / SLA risks are always material — confidence still gates Action vs Defer
    const material =
      situation.kind === "emergency_callback" ||
      isMaterialImprovement({
        estimatedImpact,
        urgencyTier,
        confidence: understanding.confidence,
        kind,
      });

    return {
      id: nextId("opp"),
      practiceId: ctx.practiceId,
      domain: "phone",
      kind,
      title,
      description,
      situationId: situation.id,
      confidence: understanding.confidence,
      estimatedImpact,
      evidence: understanding.evidence,
      suggestedOwner: resolveOwner(event),
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
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    _ctx: PipelineContext
  ): CommitmentDraft | null {
    if (!item.materialImprovement) return null;

    if (situation.kind === "recoverable_phone_opportunity") {
      if (!isPhoneOpportunityPayload(event.payload)) return null;
      const assessment = assessPhoneOpportunity(event.payload);
      if (!assessment.shouldRecommend) return null;

      const p = event.payload;
      const primaryAction = buildPhonePrimaryAction(p);
      const recommendation = buildPhoneRecommendationLine(p);

      return {
        verb: p.suggestedAction === "Verify insurance" ? "Verify" : "Call",
        object: p.call.patientReferenceId,
        because: recommendation,
        primaryResponsibility: item.suggestedOwner,
        urgencyTier: item.urgencyTier,
        confidence: item.confidence,
        evidence: item.evidence,
        uncertainty: understanding.uncertainty.confidence
          ? understanding.uncertainty
          : defaultUncertainty(item.confidence),
        dueRule:
          item.urgencyTier === "critical"
            ? "callback_sla"
            : p.clinicalUrgency === "high"
              ? "same_day"
              : "end_of_shift",
        dependencies: [],
        recommendedNextStep:
          event.routing?.recommendedNextStep?.trim() || recommendation,
        expectedOutcome:
          p.clinicalUrgency === "high" || p.clinicalUrgency === "critical"
            ? "Patient contacted; clinically appropriate same-day or urgent path offered"
            : "Unresolved call recovered into a scheduled visit or clear next step",
        ifIgnored: buildPhoneStake(p),
        decision:
          primaryAction.length <= 72
            ? primaryAction
            : primaryAction.slice(0, 69).trimEnd() + "…",
      };
    }

    const nextStep =
      event.routing?.recommendedNextStep?.trim() ||
      (situation.kind === "emergency_callback"
        ? "Callback patient and offer same-day emergency evaluation per on-call SLA"
        : situation.kind === "insurance_incomplete"
          ? "Verify insurance program before visit — classify to plan level, never brand alone"
          : "Complete front-desk follow-up from call summary");

    const object =
      event.subject?.patientReferenceId || event.subject?.callId || event.id;

    return {
      verb:
        situation.kind === "emergency_callback"
          ? "Callback"
          : situation.kind === "insurance_incomplete"
            ? "Verify program"
            : "Follow up",
      object,
      because: item.description,
      primaryResponsibility: item.suggestedOwner,
      urgencyTier: item.urgencyTier,
      confidence: item.confidence,
      evidence: item.evidence,
      uncertainty: understanding.uncertainty.confidence
        ? understanding.uncertainty
        : defaultUncertainty(item.confidence),
      dueRule:
        situation.kind === "emergency_callback"
          ? "callback_sla"
          : situation.kind === "insurance_incomplete"
            ? "before_appointment"
            : "end_of_shift",
      dependencies: [],
      recommendedNextStep: nextStep,
      expectedOutcome:
        situation.kind === "emergency_callback"
          ? "Patient contacted within SLA; same-day path offered when clinically appropriate"
          : "Front desk acts from structured summary without re-listening to the call",
      ifIgnored:
        situation.kind === "emergency_callback"
          ? "Pain may worsen and on-call SLA is missed"
          : "Rework piles up and someone rediscovers this from scratch",
      decision: nextStep.length <= 72 ? nextStep : nextStep.slice(0, 69).trimEnd() + "…",
    };
  },
};
