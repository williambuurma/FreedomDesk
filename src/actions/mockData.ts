/**
 * Mock Operational Events + materialized Actions for Intelligence Inbox V1.
 * Replace with live event stream when Persist + Coordinate is wired.
 */

import type { OperationalEvent } from "../events/types.ts";
import { OPERATIONAL_EVENT_SCHEMA_VERSION } from "../events/types.ts";
import type { Action } from "./types.ts";
import { materializeActionFromEvent } from "./fromOperationalEvent.ts";

export const MOCK_INBOX_PRACTICE_ID = "practice_cascade_family_gr";

function evidence(
  source: string,
  description: string,
  referenceId: string,
  provenance: string,
  observedAt: string
) {
  return { source, description, referenceId, provenance, observedAt };
}

/** Canonical mock operational events — same shape as production ingest. */
export const MOCK_OPERATIONAL_EVENTS: OperationalEvent[] = [
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_call_toothache_overnight_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "call",
    timestamp: "2026-07-08T02:15:00.000Z",
    eventType: "call_completed",
    subject: {
      callId: "call_toothache_overnight_001",
      patientReferenceId: "pat_ref_finn_leo",
    },
    evidence: [
      evidence(
        "call_summary",
        "Call intent: emergency",
        "summary_call_toothache_overnight_001",
        "callSummary.intent",
        "2026-07-08T02:15:00.000Z"
      ),
      evidence(
        "caller_stated",
        "Severe toothache spreading into jaw",
        "summary_call_toothache_overnight_001",
        "callSummary.emergency.symptoms",
        "2026-07-08T02:15:00.000Z"
      ),
      evidence(
        "call_summary",
        "After-hours same-day emergency flag",
        "summary_call_toothache_overnight_001",
        "callSummary.sameDayEmergency",
        "2026-07-08T02:15:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.67,
      humanReviewNeeded: true,
      gaps: ["insurance.program"],
      class: "unverified",
    },
    routing: {
      owner: "dentist",
      responsibilityTags: ["reception"],
      urgencyTier: "critical",
      recommendedNextStep:
        "Flag for on-call callback within practice SLA; keep caller phone nearby",
    },
    payload: {
      schema: "call_summary/v1",
      summaryId: "summary_call_toothache_overnight_001",
      intent: "emergency",
      urgency: "urgent",
      afterHours: true,
      sameDayEmergency: true,
      appointmentType: "emergency_eval",
      insuranceProgram: "unknown",
      emotionalFlags: ["painDistress"],
      completenessScore: 1,
      missingFields: ["insurance.program"],
    },
  },
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_call_new_patient_exam_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "call",
    timestamp: "2026-07-08T13:42:00.000Z",
    eventType: "call_completed",
    subject: {
      callId: "call_new_patient_exam_001",
      patientReferenceId: "pat_ref_maya_chen",
    },
    evidence: [
      evidence(
        "call_summary",
        "Call intent: new patient exam",
        "summary_call_new_patient_exam_001",
        "callSummary.intent",
        "2026-07-08T13:42:00.000Z"
      ),
      evidence(
        "caller_stated",
        "Delta Dental PPO stated by caller",
        "summary_call_new_patient_exam_001",
        "callSummary.insurance.program",
        "2026-07-08T13:42:00.000Z"
      ),
      evidence(
        "call_summary",
        "Appointment preference: mornings next week",
        "summary_call_new_patient_exam_001",
        "callSummary.appointment.preference",
        "2026-07-08T13:42:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.88,
      humanReviewNeeded: false,
    },
    routing: {
      owner: "front_desk",
      responsibilityTags: ["reception"],
      urgencyTier: "important",
      recommendedNextStep:
        "Create new-patient exam request for mornings next week; verify Delta PPO at visit",
    },
    payload: {
      schema: "call_summary/v1",
      summaryId: "summary_call_new_patient_exam_001",
      intent: "new_patient",
      urgency: "routine",
      afterHours: false,
      sameDayEmergency: false,
      appointmentType: "new_patient_exam",
      insuranceProgram: "delta_ppo",
      completenessScore: 0.92,
      missingFields: [],
    },
  },
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_insurance_verify_hkd_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "system",
    timestamp: "2026-07-08T14:05:00.000Z",
    eventType: "insurance_verification_needed",
    subject: {
      patientReferenceId: "pat_ref_jordan_ellis",
    },
    evidence: [
      evidence(
        "pms_authoritative",
        "Pediatric visit tomorrow — HKD ID on file unverified",
        "pms_appt_jordan_ellis_tomorrow",
        "pms.appointment.insuranceStatus",
        "2026-07-08T14:05:00.000Z"
      ),
      evidence(
        "office_dna",
        "Office DNA requires HKD verification before pediatric hygiene",
        "dna_insurance_hkd",
        "officeDna.insurance.hkd.verifyBeforeVisit",
        "2026-07-08T14:05:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.9,
      humanReviewNeeded: false,
      gaps: ["insurance.memberId"],
    },
    routing: {
      owner: "front_desk",
      responsibilityTags: ["reception", "verification"],
      urgencyTier: "important",
      recommendedNextStep:
        "Verify Healthy Kids Dental eligibility before tomorrow's pediatric hygiene",
    },
    payload: {
      appointmentType: "pediatric_hygiene",
      insuranceProgram: "healthy_kids_dental",
      visitDate: "2026-07-09",
    },
  },
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_lab_crown_seat_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "lab",
    timestamp: "2026-07-08T11:20:00.000Z",
    eventType: "lab_status_changed",
    subject: {
      patientReferenceId: "pat_ref_robert_hayes",
    },
    evidence: [
      evidence(
        "lab",
        "Crown case not marked received — seat scheduled 11 AM tomorrow",
        "lab_case_hayes_#14",
        "lab.case.status",
        "2026-07-08T11:20:00.000Z"
      ),
      evidence(
        "pms_authoritative",
        "Crown seat appointment on schedule",
        "pms_appt_hayes_crown",
        "pms.appointment.type",
        "2026-07-08T11:20:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.85,
      humanReviewNeeded: false,
    },
    routing: {
      owner: "assistant",
      responsibilityTags: ["clinical_assist"],
      urgencyTier: "important",
      recommendedNextStep: "Confirm lab case received before crown seat at 11 AM tomorrow",
    },
    payload: {
      labStatus: "not_received",
      appointmentType: "crown_seat",
      tooth: "#14",
    },
  },
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_cancel_hygiene_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "call",
    timestamp: "2026-07-08T15:10:00.000Z",
    eventType: "appointment_cancelled",
    subject: {
      callId: "call_cancel_hygiene_001",
      patientReferenceId: "pat_ref_lisa_nguyen",
    },
    evidence: [
      evidence(
        "call_summary",
        "Hygiene cancel — work conflict, open to waitlist fill",
        "summary_cancel_hygiene_001",
        "callSummary.intent",
        "2026-07-08T15:10:00.000Z"
      ),
      evidence(
        "pms_authoritative",
        "2:00 PM hygiene slot now open today",
        "pms_slot_hygiene_1400",
        "pms.schedule.openSlot",
        "2026-07-08T15:10:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.94,
      humanReviewNeeded: false,
    },
    routing: {
      owner: "front_desk",
      responsibilityTags: ["reception", "waitlist"],
      urgencyTier: "important",
      recommendedNextStep: "Offer 2:00 PM hygiene slot to waitlist patients with flexibility today",
    },
    payload: {
      schema: "call_summary/v1",
      summaryId: "summary_cancel_hygiene_001",
      intent: "cancel",
      urgency: "routine",
      afterHours: false,
      sameDayEmergency: false,
      appointmentType: "hygiene",
      completenessScore: 1,
    },
  },
  {
    $schema: OPERATIONAL_EVENT_SCHEMA_VERSION,
    id: "evt_call_billing_callback_001",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    source: "call",
    timestamp: "2026-07-07T16:45:00.000Z",
    eventType: "call_completed",
    subject: {
      callId: "call_billing_callback_001",
      patientReferenceId: "pat_ref_derek_moss",
    },
    evidence: [
      evidence(
        "call_summary",
        "Billing frustration — requested office manager callback",
        "summary_billing_callback_001",
        "callSummary.intent",
        "2026-07-07T16:45:00.000Z"
      ),
      evidence(
        "inferred",
        "Emotional flags: frustration",
        "summary_billing_callback_001",
        "signal.emotionalFlags",
        "2026-07-07T16:45:00.000Z"
      ),
    ],
    uncertainty: {
      confidence: 0.8,
      humanReviewNeeded: false,
    },
    routing: {
      owner: "office_manager",
      responsibilityTags: ["manager"],
      urgencyTier: "important",
      recommendedNextStep: "Office manager callback on statement question — do not quote balances",
    },
    payload: {
      schema: "call_summary/v1",
      summaryId: "summary_billing_callback_001",
      intent: "billing",
      urgency: "priority",
      afterHours: false,
      sameDayEmergency: false,
      emotionalFlags: ["frustration"],
      completenessScore: 0.85,
    },
  },
];

const DISPLAY_NAMES: Record<string, string> = {
  evt_call_toothache_overnight_001: "Finn Leo",
  evt_call_new_patient_exam_001: "Maya Chen",
  evt_insurance_verify_hkd_001: "Jordan Ellis",
  evt_lab_crown_seat_001: "Robert Hayes",
  evt_cancel_hygiene_001: "Lisa Nguyen",
  evt_call_billing_callback_001: "Derek Moss",
};

const STATUS_OVERRIDES: Record<string, Action["status"]> = {
  evt_call_billing_callback_001: "completed",
  evt_lab_crown_seat_001: "committed",
};

const BECAUSE_OVERRIDES: Record<string, string> = {
  evt_call_toothache_overnight_001:
    "Overnight toothache with jaw spread — on-call SLA applies; insurance program still unknown",
  evt_call_new_patient_exam_001:
    "Complete new-patient intake ready for scheduling — mornings next week preferred",
  evt_insurance_verify_hkd_001:
    "HKD must be verified before pediatric hygiene tomorrow or the visit stalls at check-in",
  evt_lab_crown_seat_001:
    "Crown seat is on the schedule; lab case not marked received — confirm before the patient arrives",
  evt_cancel_hygiene_001:
    "Open hygiene chair this afternoon — waitlist fill recovers production and helps a flexible patient",
  evt_call_billing_callback_001:
    "Caller left frustrated about a statement — manager callback closes the loop without quoting balances",
};

/** Decision-first headlines — what to do, not what happened. */
const DECISION_OVERRIDES: Record<string, string> = {
  evt_call_toothache_overnight_001: "Call Finn Leo before 9:00 AM",
  evt_call_new_patient_exam_001: "Schedule Maya Chen for a morning new-patient exam",
  evt_insurance_verify_hkd_001: "Verify Jordan Ellis's HKD before tomorrow's visit",
  evt_lab_crown_seat_001: "Confirm Robert Hayes's crown case before 11 AM tomorrow",
  evt_cancel_hygiene_001: "Fill Lisa Nguyen's 2:00 PM hygiene chair from the waitlist",
  evt_call_billing_callback_001: "Call Derek Moss back about his statement",
};

const IF_IGNORED_OVERRIDES: Record<string, string> = {
  evt_call_toothache_overnight_001: "Pain may worsen and the on-call SLA is missed",
  evt_call_new_patient_exam_001: "A ready new patient waits longer than they should",
  evt_insurance_verify_hkd_001: "Tomorrow's visit stalls at check-in",
  evt_lab_crown_seat_001: "The crown seat may need to be postponed",
  evt_cancel_hygiene_001: "An open chair stays empty this afternoon",
  evt_call_billing_callback_001: "Frustration compounds and trust erodes",
};

/**
 * Materialize inbox Actions from mock Operational Events.
 * This is the same path live ingest will use once the event stream is wired.
 */
export function buildMockInboxActions(): Action[] {
  const actions: Action[] = [];

  for (const event of MOCK_OPERATIONAL_EVENTS) {
    const action = materializeActionFromEvent(event, {
      subjectDisplayName: DISPLAY_NAMES[event.id],
      status: STATUS_OVERRIDES[event.id] || "needs_action",
      because: BECAUSE_OVERRIDES[event.id],
      decision: DECISION_OVERRIDES[event.id],
      ifIgnored: IF_IGNORED_OVERRIDES[event.id],
      verb: DECISION_OVERRIDES[event.id],
    });
    if (action) actions.push(action);
  }

  return actions;
}

/** JSON-serializable decision payload for the product surface. */
export function buildMockInboxPayload() {
  const actions = buildMockInboxActions();
  return {
    $schema: "intelligence-inbox/v1",
    practiceId: MOCK_INBOX_PRACTICE_ID,
    generatedAt: new Date().toISOString(),
    source: "mock_operational_events",
    eventCount: MOCK_OPERATIONAL_EVENTS.length,
    actions: actions.map((a) => ({
      id: a.id,
      decision: a.decision,
      ifIgnored: a.ifIgnored,
      whatHappened: a.whatHappened,
      subjectDisplayName: a.subjectDisplayName,
      because: a.because,
      recommendedNextStep: a.recommendedNextStep,
      primaryResponsibility: a.primaryResponsibility,
      urgencyTier: a.urgencyTier,
      status: a.status,
      confidence: a.confidence,
      sourceEventIds: a.sourceEventIds,
      createdAt: a.createdAt,
      category: a.category,
      evidence: a.evidence.map((e) => ({
        source: e.source,
        description: e.description,
        provenance: e.provenance,
        observedAt: e.observedAt,
      })),
    })),
  };
}
