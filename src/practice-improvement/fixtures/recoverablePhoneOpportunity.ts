/**
 * Demo fixtures for Phone Opportunity Recovery.
 * Realistic West Michigan practice data — routed through the real PIE pipeline.
 */

import type { OperationalEvent } from "../../events/types.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "../../events/types.ts";
import type { PhoneOpportunityPayload } from "../phoneOpportunity.ts";

export const DEMO_PHONE_PRACTICE_ID = "practice_cascade_family_gr";

/** Emily Johnson — urgent facial swelling, never scheduled (primary demo). */
export function buildDemoUrgentSwellingPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "urgent_symptoms_unresolved",
    call: {
      callId: "call_emily_swelling_001",
      displayWhen: "yesterday",
      patientDisplayName: "Emily Johnson",
      patientReferenceId: "pat_ref_emily_johnson",
      intent: "emergency",
      patientNeed: "facial swelling that may be worsening",
      symptoms: ["worsening facial swelling"],
      preferredTime: "an afternoon appointment",
      appointmentType: "same_day_emergency",
      ...(overrides.call || {}),
    },
    resolutionQuality: "unresolved",
    clinicalUrgency: "high",
    careDelayed: true,
    revenueRecoverable: true,
    clinicallyLegitimate: true,
    conversionLikelihood: "high",
    estimatedProductionImpact: "medium",
    scheduleRecoveryPotential: true,
    barriers: [],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 18,
    suggestedRecipient: "front_desk",
    suggestedAction: "Call",
    notes: "After-hours urgent call; no callback logged; swelling reported as worsening.",
    ...overrides,
    call: {
      callId: "call_emily_swelling_001",
      displayWhen: "yesterday",
      patientDisplayName: "Emily Johnson",
      patientReferenceId: "pat_ref_emily_johnson",
      intent: "emergency",
      patientNeed: "facial swelling that may be worsening",
      symptoms: ["worsening facial swelling"],
      preferredTime: "an afternoon appointment",
      appointmentType: "same_day_emergency",
      ...(overrides.call || {}),
    },
  };
}

/** Marcus Reed — new patient implant consult, never scheduled. */
export function buildDemoNewPatientPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "new_patient_unscheduled",
    call: {
      callId: "call_marcus_implant_001",
      displayWhen: "yesterday",
      patientDisplayName: "Marcus Reed",
      patientReferenceId: "pat_ref_marcus_reed",
      intent: "new_patient",
      patientNeed: "interested in an implant consult",
      preferredTime: "a morning visit",
      appointmentType: "an implant consult",
      ...(overrides.call || {}),
    },
    resolutionQuality: "unresolved",
    clinicalUrgency: "none",
    careDelayed: false,
    revenueRecoverable: true,
    clinicallyLegitimate: true,
    conversionLikelihood: "high",
    estimatedProductionImpact: "high",
    scheduleRecoveryPotential: true,
    barriers: [],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 20,
    suggestedRecipient: "front_desk",
    suggestedAction: "Call",
    notes: "New patient asked about implant consult; morning preference; never booked.",
    ...overrides,
    call: {
      callId: "call_marcus_implant_001",
      displayWhen: "yesterday",
      patientDisplayName: "Marcus Reed",
      patientReferenceId: "pat_ref_marcus_reed",
      intent: "new_patient",
      patientNeed: "interested in an implant consult",
      preferredTime: "a morning visit",
      appointmentType: "an implant consult",
      ...(overrides.call || {}),
    },
  };
}

/** Existing patient — diagnosed crown discussed, follow-up lost. */
export function buildDemoTreatmentPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "treatment_unscheduled",
    call: {
      callId: "call_sarah_crown_001",
      displayWhen: "yesterday",
      patientDisplayName: "Sarah Nguyen",
      patientReferenceId: "pat_ref_sarah_nguyen",
      intent: "treatment",
      patientNeed: "ready to schedule her crown seat",
      preferredTime: "a morning appointment",
      appointmentType: "crown seat",
      ...(overrides.call || {}),
    },
    resolutionQuality: "partial",
    clinicalUrgency: "medium",
    careDelayed: true,
    revenueRecoverable: true,
    clinicallyLegitimate: true,
    conversionLikelihood: "high",
    estimatedProductionImpact: "high",
    scheduleRecoveryPotential: true,
    barriers: [],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 22,
    suggestedRecipient: "front_desk",
    suggestedAction: "Call",
    ...overrides,
    call: {
      callId: "call_sarah_crown_001",
      displayWhen: "yesterday",
      patientDisplayName: "Sarah Nguyen",
      patientReferenceId: "pat_ref_sarah_nguyen",
      intent: "treatment",
      patientNeed: "ready to schedule her crown seat",
      preferredTime: "a morning appointment",
      appointmentType: "crown seat",
      ...(overrides.call || {}),
    },
  };
}

/** Insurance question unresolved — may block scheduling. */
export function buildDemoInsurancePayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "insurance_unresolved",
    call: {
      callId: "call_insurance_001",
      displayWhen: "this morning",
      patientDisplayName: "James Park",
      patientReferenceId: "pat_ref_james_park",
      intent: "insurance",
      patientNeed: "needs Delta Dental PPO benefits clarified before booking hygiene",
      appointmentType: "hygiene",
      ...(overrides.call || {}),
    },
    resolutionQuality: "unresolved",
    clinicalUrgency: "low",
    careDelayed: false,
    revenueRecoverable: true,
    clinicallyLegitimate: true,
    conversionLikelihood: "medium",
    estimatedProductionImpact: "medium",
    scheduleRecoveryPotential: true,
    barriers: ["insurance"],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 3,
    suggestedRecipient: "front_desk",
    suggestedAction: "Verify insurance",
    ...overrides,
    call: {
      callId: "call_insurance_001",
      displayWhen: "this morning",
      patientDisplayName: "James Park",
      patientReferenceId: "pat_ref_james_park",
      intent: "insurance",
      patientNeed: "needs Delta Dental PPO benefits clarified before booking hygiene",
      appointmentType: "hygiene",
      ...(overrides.call || {}),
    },
  };
}

/** Language / communication barrier prevented completion. */
export function buildDemoLanguageBarrierPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "communication_barrier",
    call: {
      callId: "call_language_001",
      displayWhen: "yesterday",
      patientDisplayName: "Ana Ruiz",
      patientReferenceId: "pat_ref_ana_ruiz",
      intent: "new_patient",
      patientNeed: "needs Spanish-language scheduling help for a new-patient exam",
      appointmentType: "new patient exam",
      ...(overrides.call || {}),
    },
    resolutionQuality: "abandoned",
    clinicalUrgency: "low",
    careDelayed: true,
    revenueRecoverable: true,
    clinicallyLegitimate: true,
    conversionLikelihood: "medium",
    estimatedProductionImpact: "medium",
    scheduleRecoveryPotential: true,
    barriers: ["language", "communication"],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 16,
    suggestedRecipient: "front_desk",
    suggestedAction: "Call",
    notes: "Caller struggled in English; call ended without scheduling.",
    ...overrides,
    call: {
      callId: "call_language_001",
      displayWhen: "yesterday",
      patientDisplayName: "Ana Ruiz",
      patientReferenceId: "pat_ref_ana_ruiz",
      intent: "new_patient",
      patientNeed: "needs Spanish-language scheduling help for a new-patient exam",
      appointmentType: "new patient exam",
      ...(overrides.call || {}),
    },
  };
}

/** Already resolved — must suppress. */
export function buildDemoResolvedPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return buildDemoUrgentSwellingPayload({
    resolutionQuality: "resolved",
    alreadyContacted: true,
    notes: "Callback completed; same-day emergency reserved.",
    ...overrides,
  });
}

/** Weak speculative — must suppress. */
export function buildDemoWeakPayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "incomplete_resolution",
    call: {
      callId: "call_weak_001",
      displayWhen: "last week",
      patientDisplayName: "Kevin Ortiz",
      patientReferenceId: "pat_ref_kevin_ortiz",
      intent: "general",
      patientNeed: "asked about office hours",
      ...(overrides.call || {}),
    },
    resolutionQuality: "partial",
    clinicalUrgency: "none",
    careDelayed: false,
    revenueRecoverable: false,
    clinicallyLegitimate: true,
    conversionLikelihood: "low",
    estimatedProductionImpact: "none",
    scheduleRecoveryPotential: false,
    barriers: [],
    preferredContact: "message",
    alreadyContacted: false,
    hoursSinceCall: 96,
    suggestedRecipient: "front_desk",
    suggestedAction: "Mark resolved",
    ...overrides,
    call: {
      callId: "call_weak_001",
      displayWhen: "last week",
      patientDisplayName: "Kevin Ortiz",
      patientReferenceId: "pat_ref_kevin_ortiz",
      intent: "general",
      patientNeed: "asked about office hours",
      ...(overrides.call || {}),
    },
  };
}

/** Revenue without clinical legitimacy — must suppress. */
export function buildDemoIllegitimateRevenuePayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return {
    schema: "phone_opportunity/v1",
    opportunityType: "treatment_unscheduled",
    call: {
      callId: "call_illegitimate_001",
      displayWhen: "yesterday",
      patientDisplayName: "Alex Kim",
      patientReferenceId: "pat_ref_alex_kim",
      intent: "treatment",
      patientNeed: "asked a general fee question with no diagnosed need",
      ...(overrides.call || {}),
    },
    resolutionQuality: "unresolved",
    clinicalUrgency: "none",
    careDelayed: false,
    revenueRecoverable: true,
    clinicallyLegitimate: false,
    conversionLikelihood: "medium",
    estimatedProductionImpact: "high",
    scheduleRecoveryPotential: false,
    barriers: [],
    preferredContact: "call",
    alreadyContacted: false,
    hoursSinceCall: 12,
    suggestedRecipient: "front_desk",
    suggestedAction: "Call",
    ...overrides,
    call: {
      callId: "call_illegitimate_001",
      displayWhen: "yesterday",
      patientDisplayName: "Alex Kim",
      patientReferenceId: "pat_ref_alex_kim",
      intent: "treatment",
      patientNeed: "asked a general fee question with no diagnosed need",
      ...(overrides.call || {}),
    },
  };
}

export function buildDemoPhonePayload(
  overrides: Partial<PhoneOpportunityPayload> = {}
): PhoneOpportunityPayload {
  return buildDemoUrgentSwellingPayload(overrides);
}

/**
 * Production-shaped operational event for the Emily swelling demo.
 * Process with PracticeImprovementEngine.processEvent — do not hardcode UI.
 */
export function buildDemoPhoneRecoveryEvent(
  overrides: Partial<OperationalEvent> = {}
): OperationalEvent {
  const { payload: payloadOverride, ...rest } = overrides;
  let payload: OperationalEvent["payload"];
  if (payloadOverride === undefined) {
    payload = buildDemoPhonePayload();
  } else if (isPhonePayload(payloadOverride)) {
    payload = payloadOverride;
  } else {
    payload = payloadOverride as OperationalEvent["payload"];
  }

  const phone = isPhonePayload(payload) ? payload : buildDemoPhonePayload();

  return {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_phone_emily_swelling_001",
    practiceId: DEMO_PHONE_PRACTICE_ID,
    source: "call",
    timestamp: "2026-07-10T08:15:00.000Z",
    eventType: "call_completed",
    subject: {
      patientReferenceId: phone.call.patientReferenceId,
      callId: phone.call.callId,
    },
    evidence: [
      {
        source: "call_summary",
        description:
          "Urgent caller reported worsening facial swelling; requested afternoon appointment; no appointment made",
        referenceId: phone.call.callId,
        provenance: "callSummary.emergency",
        observedAt: "2026-07-09T14:40:00.000Z",
      },
      {
        source: "pms_authoritative",
        description: "No completed callback or same-day emergency appointment recorded",
        referenceId: phone.call.patientReferenceId,
        provenance: "pms.commLog.callback",
        observedAt: "2026-07-10T08:15:00.000Z",
      },
      {
        source: "inferred",
        description: "Care may be delayed; patient likely to schedule if called promptly",
        referenceId: phone.call.patientReferenceId,
        provenance: "phoneOpportunity.assessment",
        observedAt: "2026-07-10T08:15:00.000Z",
      },
    ],
    uncertainty: {
      confidence: 0.92,
      humanReviewNeeded: false,
    },
    routing: {
      owner: phone.suggestedRecipient,
      responsibilityTags: ["reception", "callback", "phone_recovery", "urgent"],
      urgencyTier:
        phone.clinicalUrgency === "critical"
          ? "critical"
          : phone.clinicalUrgency === "high"
            ? "important"
            : "important",
      recommendedNextStep: `Call ${phone.call.patientDisplayName} about unresolved ${phone.call.symptoms?.[0] || phone.call.patientNeed}`,
    },
    ...rest,
    payload,
  };
}

export function buildDemoNewPatientRecoveryEvent(
  overrides: Partial<OperationalEvent> = {}
): OperationalEvent {
  const payload = buildDemoNewPatientPayload(
    isPhonePayload(overrides.payload) ? overrides.payload : undefined
  );
  return buildDemoPhoneRecoveryEvent({
    id: "evt_phone_marcus_implant_001",
    subject: {
      patientReferenceId: payload.call.patientReferenceId,
      callId: payload.call.callId,
    },
    routing: {
      owner: "front_desk",
      responsibilityTags: ["reception", "new_patient", "phone_recovery"],
      urgencyTier: "important",
      recommendedNextStep: "Call Marcus Reed to schedule implant consult",
    },
    evidence: [
      {
        source: "call_summary",
        description:
          "New patient interested in implant consult; requested morning visit; did not schedule",
        referenceId: payload.call.callId,
        provenance: "callSummary.new_patient",
        observedAt: "2026-07-09T11:20:00.000Z",
      },
      {
        source: "pms_authoritative",
        description: "No appointment created for Marcus Reed",
        referenceId: payload.call.patientReferenceId,
        provenance: "pms.appointments",
        observedAt: "2026-07-10T08:15:00.000Z",
      },
    ],
    ...overrides,
    payload,
  });
}

function isPhonePayload(value: unknown): value is PhoneOpportunityPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PhoneOpportunityPayload).schema === "phone_opportunity/v1"
  );
}
