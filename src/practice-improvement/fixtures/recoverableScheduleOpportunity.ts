/**
 * Demo fixtures for Recoverable Schedule Opportunity.
 * Realistic West Michigan practice data — routed through the real PIE pipeline.
 */

import type { OperationalEvent } from "../../events/types.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "../../events/types.ts";
import type {
  ScheduleFillCandidate,
  ScheduleOpportunityPayload,
} from "../scheduleOpportunity.ts";

export const DEMO_SCHEDULE_PRACTICE_ID = "practice_cascade_family_gr";

/** Maria Lopez — best fit for the 60-minute doctor opening. */
export const DEMO_CANDIDATE_MARIA: ScheduleFillCandidate = {
  patientReferenceId: "pat_ref_maria_lopez",
  displayName: "Maria Lopez",
  procedure: "unscheduled crown",
  durationMinutes: 60,
  providerCompatible: true,
  treatmentUrgency: "medium",
  availabilityPreference: "morning",
  prefersThisSlot: true,
  insuranceReady: true,
  notes: "Crown #19 prep complete; seat pending. Asked for morning.",
};

/** Weaker candidates — present for ranking / suppression demos. */
export const DEMO_CANDIDATE_WEAK_DURATION: ScheduleFillCandidate = {
  patientReferenceId: "pat_ref_james_park",
  displayName: "James Park",
  procedure: "implant consult plus records",
  durationMinutes: 90,
  providerCompatible: true,
  treatmentUrgency: "low",
  availabilityPreference: "flexible",
  prefersThisSlot: false,
  insuranceReady: true,
  notes: "Needs 90 minutes — does not fit 60-minute opening",
};

export const DEMO_CANDIDATE_PROVIDER_MISMATCH: ScheduleFillCandidate = {
  patientReferenceId: "pat_ref_amy_brooks",
  displayName: "Amy Brooks",
  procedure: "hygiene recall",
  durationMinutes: 50,
  providerCompatible: false,
  treatmentUrgency: "low",
  availabilityPreference: "morning",
  prefersThisSlot: true,
  insuranceReady: true,
  notes: "Hygiene column only — not compatible with doctor opening",
};

export const DEMO_CANDIDATE_UNVERIFIED: ScheduleFillCandidate = {
  patientReferenceId: "pat_ref_kevin_ortiz",
  displayName: "Kevin Ortiz",
  procedure: "extraction consult",
  durationMinutes: 45,
  providerCompatible: true,
  treatmentUrgency: "low",
  availabilityPreference: "afternoon",
  prefersThisSlot: false,
  insuranceReady: false,
  notes: "Benefits not verified; prefers afternoons",
};

export const DEMO_CANDIDATE_SECONDARY: ScheduleFillCandidate = {
  patientReferenceId: "pat_ref_sarah_nguyen",
  displayName: "Sarah Nguyen",
  procedure: "crown seat",
  durationMinutes: 60,
  providerCompatible: true,
  treatmentUrgency: "medium",
  availabilityPreference: "flexible",
  prefersThisSlot: false,
  insuranceReady: true,
  notes: "Fits, but no stated morning preference",
};

export function buildDemoSchedulePayload(
  overrides: Partial<ScheduleOpportunityPayload> = {}
): ScheduleOpportunityPayload {
  return {
    schema: "schedule_opportunity/v1",
    opening: {
      slotId: "slot_dr_1030_tomorrow",
      displayWhen: "tomorrow at 10:30 AM",
      durationMinutes: 60,
      providerId: "prov_dr_johnson",
      providerName: "Dr. Johnson",
      column: "doctor",
      appointmentType: "crown_seat",
      startTime: "2026-07-11T10:30:00.000Z",
      ...(overrides.opening || {}),
    },
    candidates: overrides.candidates || [
      DEMO_CANDIDATE_MARIA,
      DEMO_CANDIDATE_SECONDARY,
      DEMO_CANDIDATE_WEAK_DURATION,
      DEMO_CANDIDATE_PROVIDER_MISMATCH,
      DEMO_CANDIDATE_UNVERIFIED,
    ],
  };
}

/**
 * Production-shaped operational event for the demo opening.
 * Process with PracticeImprovementEngine.processEvent — do not hardcode UI.
 */
export function buildDemoScheduleOpeningEvent(
  overrides: Partial<OperationalEvent> = {}
): OperationalEvent {
  const { payload: payloadOverride, ...rest } = overrides;
  let payload: OperationalEvent["payload"];
  if (payloadOverride === undefined) {
    payload = buildDemoSchedulePayload();
  } else if (isSchedulePayload(payloadOverride)) {
    payload = payloadOverride;
  } else {
    payload = payloadOverride as OperationalEvent["payload"];
  }

  return {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_schedule_open_1030_001",
    practiceId: DEMO_SCHEDULE_PRACTICE_ID,
    source: "pms",
    timestamp: "2026-07-10T16:05:00.000Z",
    eventType: "appointment_cancelled",
    subject: {
      patientReferenceId: DEMO_CANDIDATE_MARIA.patientReferenceId,
    },
    evidence: [
      {
        source: "pms_authoritative",
        description: "60-minute doctor block opened tomorrow at 10:30 AM",
        referenceId: isSchedulePayload(payload) ? payload.opening.slotId : "slot_open",
        provenance: "pms.schedule.openSlot",
        observedAt: "2026-07-10T16:05:00.000Z",
      },
      {
        source: "office_dna",
        description: "Unscheduled crown treatment pending for Maria Lopez; benefits verified",
        referenceId: DEMO_CANDIDATE_MARIA.patientReferenceId,
        provenance: "practiceMemory.treatmentPlan",
        observedAt: "2026-07-10T16:05:00.000Z",
      },
      {
        source: "inferred",
        description: "Maria previously requested a morning appointment",
        referenceId: DEMO_CANDIDATE_MARIA.patientReferenceId,
        provenance: "callSummary.appointment.preference",
        observedAt: "2026-07-09T14:20:00.000Z",
      },
    ],
    uncertainty: {
      confidence: 0.91,
      humanReviewNeeded: false,
    },
    routing: {
      owner: "front_desk",
      responsibilityTags: ["reception", "waitlist", "schedule_recovery"],
      urgencyTier: "important",
      recommendedNextStep:
        "Offer tomorrow 10:30 AM doctor opening to Maria Lopez for unscheduled crown",
    },
    ...rest,
    payload,
  };
}

function isSchedulePayload(
  value: unknown
): value is ScheduleOpportunityPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as ScheduleOpportunityPayload).schema === "schedule_opportunity/v1"
  );
}
