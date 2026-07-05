/**
 * Mock completed interactions — West Michigan dental practice scenarios.
 * Synthetic data for local development and tests only.
 */

import type { ReflectionInput } from "./types.ts";

export const MOCK_PRACTICE_ID = "practice_cascade_family_gr";

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** New patient intake — Delta PPO disambiguation, morning preference, dental anxiety. */
export function mockNewPatientReflectionInput(): ReflectionInput {
  return {
    practiceId: MOCK_PRACTICE_ID,
    callId: "call_np_delta_8841",
    interactionId: "int_np_delta_8841",
    completedAt: hoursAgoIso(2),
    patientReferenceId: "pat_ref_9901",
    reasoning: {
      intent: "new_patient",
      urgency: "routine",
      completenessScore: 0.95,
      confidence: { overall: 0.88, needsReview: false },
      facts: [
        {
          id: "fact_np_001",
          category: "demographic",
          statement: "Caller is Sarah Nguyen, new patient, DOB 04/12/1991.",
          evidenceRef: "reasoning.facts.demographic.name_dob",
          confidence: 0.95,
          sourceTurn: 4,
        },
        {
          id: "fact_np_002",
          category: "preference",
          statement: "Prefers Tuesday or Thursday mornings — works from home those days.",
          evidenceRef: "reasoning.facts.preference.schedule_window",
          confidence: 0.9,
          sourceTurn: 11,
        },
        {
          id: "fact_np_003",
          category: "clinical_reported",
          statement: "Caller reported sensitivity on lower left when drinking cold water for about two weeks.",
          evidenceRef: "reasoning.facts.clinical_reported.chief_complaint",
          confidence: 0.92,
          sourceTurn: 7,
        },
        {
          id: "fact_np_004",
          category: "emotional",
          statement: "Caller said they have not been to a dentist in six years and feel embarrassed calling.",
          evidenceRef: "reasoning.facts.emotional.dental_anxiety",
          confidence: 0.88,
          sourceTurn: 6,
        },
      ],
      unresolvedSlots: [
        {
          field: "email",
          reason: "Caller will text email address after the call",
          evidenceRef: "reasoning.unresolvedSlots.email",
        },
      ],
      emotionalSignals: [
        {
          flag: "highAnxiety",
          description: "Embarrassment about gap in care; reassurance before admin questions helped.",
          evidenceRef: "reasoning.emotionalSignals.highAnxiety",
          confidence: 0.87,
        },
      ],
      insuranceSignals: [
        {
          program: "delta_dental_ppo",
          concern: "Caller said Delta through employer — classified as Delta Dental PPO, not Medicaid.",
          verificationStatus: "pending",
          evidenceRef: "reasoning.insuranceSignals.delta_ppo",
          confidence: 0.85,
        },
      ],
      schedulingSignals: [
        {
          appointmentType: "new_patient_exam",
          preferredTimes: ["Tuesday 9:00 AM", "Thursday 8:30 AM"],
          constraint: "Appointment request logged — PMS availability not confirmed on call.",
          evidenceRef: "reasoning.schedulingSignals.new_patient_exam",
          confidence: 0.9,
        },
      ],
      opportunitySignals: [
        {
          type: "household",
          description: "Caller mentioned spouse may also need a new patient exam — did not collect spouse details.",
          evidenceRef: "reasoning.opportunitySignals.household_spouse",
          confidence: 0.7,
        },
      ],
      missingSummaryFields: [],
    },
  };
}

/** After-hours emergency — pain, swelling check, same-day routing. */
export function mockEmergencyToothacheInput(): ReflectionInput {
  return {
    practiceId: MOCK_PRACTICE_ID,
    callId: "call_emerg_2203",
    interactionId: "int_emerg_2203",
    completedAt: hoursAgoIso(10),
    patientReferenceId: "pat_ref_8842",
    reasoning: {
      intent: "emergency",
      urgency: "urgent",
      completenessScore: 1,
      confidence: { overall: 0.94, needsReview: false },
      facts: [
        {
          id: "fact_em_001",
          category: "demographic",
          statement: "Existing patient James Mitchell, verified by name and DOB.",
          evidenceRef: "reasoning.facts.demographic.existing_patient",
          confidence: 0.98,
          sourceTurn: 2,
        },
        {
          id: "fact_em_002",
          category: "clinical_reported",
          statement: "Caller reported throbbing pain upper right since last night, pain 8/10, worse when lying down.",
          evidenceRef: "reasoning.facts.clinical_reported.symptoms",
          confidence: 0.95,
          sourceTurn: 5,
        },
        {
          id: "fact_em_003",
          category: "clinical_reported",
          statement: "Caller denied facial swelling and fever when asked.",
          evidenceRef: "reasoning.facts.clinical_reported.swelling_fever",
          confidence: 0.93,
          sourceTurn: 8,
        },
      ],
      emotionalSignals: [
        {
          flag: "painDistress",
          description: "Caller minimized urgency ('I wasn't sure if I should bother you') — pain acknowledged first.",
          evidenceRef: "reasoning.emotionalSignals.painDistress",
          confidence: 0.91,
        },
      ],
      schedulingSignals: [
        {
          appointmentType: "emergency_eval",
          preferredTimes: ["same day morning"],
          constraint: "Routed to on-call dentist callback within 30-minute SLA.",
          evidenceRef: "reasoning.schedulingSignals.emergency_same_day",
          confidence: 0.96,
        },
      ],
      operationalSignals: [
        {
          type: "handoff",
          description: "After-hours emergency protocol followed — on-call notified, front desk task queued for open.",
          evidenceRef: "reasoning.operationalSignals.after_hours_handoff",
          confidence: 0.97,
        },
      ],
      opportunitySignals: [],
      missingSummaryFields: [],
    },
  };
}

/** Hygiene recall reschedule — scheduling friction, waitlist interest. */
export function mockHygieneRescheduleInput(): ReflectionInput {
  return {
    practiceId: MOCK_PRACTICE_ID,
    callId: "call_hyg_5510",
    interactionId: "int_hyg_5510",
    completedAt: hoursAgoIso(4),
    patientReferenceId: "pat_ref_7720",
    reasoning: {
      intent: "reschedule",
      urgency: "routine",
      completenessScore: 0.82,
      confidence: { overall: 0.8, needsReview: true, bindingField: "preferredTimes" },
      facts: [
        {
          id: "fact_hyg_001",
          category: "scheduling",
          statement: "Caller needs to move Thursday 2 PM hygiene visit — child has school event.",
          evidenceRef: "reasoning.facts.scheduling.cancel_reason",
          confidence: 0.94,
          sourceTurn: 3,
        },
        {
          id: "fact_hyg_002",
          category: "preference",
          statement: "Caller prefers Friday afternoons for hygiene when possible.",
          evidenceRef: "reasoning.facts.preference.friday_afternoon",
          confidence: 0.86,
          sourceTurn: 9,
        },
      ],
      unresolvedSlots: [
        {
          field: "reschedule_slot",
          reason: "No Friday afternoon hygiene openings in next two weeks — caller asked for waitlist",
          evidenceRef: "reasoning.unresolvedSlots.reschedule_slot",
        },
      ],
      schedulingSignals: [
        {
          appointmentType: "hygiene_recall",
          preferredTimes: ["Friday afternoon"],
          constraint: "Added to hygiene waitlist for Friday PM — no slot confirmed.",
          evidenceRef: "reasoning.schedulingSignals.waitlist",
          confidence: 0.88,
        },
      ],
      operationalSignals: [
        {
          type: "rework_risk",
          description: "Summary missing confirmed new appointment time — front desk must call back when slot opens.",
          evidenceRef: "reasoning.operationalSignals.rework_risk",
          confidence: 0.84,
        },
      ],
      missingSummaryFields: ["appointment.scheduledSlot"],
    },
  };
}

/** Billing frustration — emotional and operational learning, insurance concern. */
export function mockBillingFrustrationInput(): ReflectionInput {
  return {
    practiceId: MOCK_PRACTICE_ID,
    callId: "call_bill_3399",
    interactionId: "int_bill_3399",
    completedAt: hoursAgoIso(1),
    patientReferenceId: "pat_ref_6615",
    reasoning: {
      intent: "billing_question",
      urgency: "routine",
      completenessScore: 0.78,
      confidence: { overall: 0.76, needsReview: true },
      facts: [
        {
          id: "fact_bill_001",
          category: "operational",
          statement: "Caller disputed $180 balance from crown seat last month — wants itemized statement.",
          evidenceRef: "reasoning.facts.operational.balance_dispute",
          confidence: 0.9,
          sourceTurn: 4,
        },
      ],
      emotionalSignals: [
        {
          flag: "billingFrustration",
          description: "Caller frustrated about hold time and prior voicemail not returned — tone de-escalated.",
          evidenceRef: "reasoning.emotionalSignals.billingFrustration",
          confidence: 0.89,
        },
      ],
      insuranceSignals: [
        {
          program: "delta_dental_ppo",
          concern: "Caller believes insurance should have covered more of crown — benefits not quoted on call.",
          verificationStatus: "issue",
          evidenceRef: "reasoning.insuranceSignals.benefit_dispute",
          confidence: 0.82,
        },
      ],
      operationalSignals: [
        {
          type: "team_action",
          description: "Billing coordinator callback requested — manager escalation flag set.",
          evidenceRef: "reasoning.operationalSignals.billing_callback",
          confidence: 0.91,
        },
      ],
      opportunitySignals: [
        {
          type: "retention",
          description: "Caller stated considering switching offices if balance not resolved — retention risk signal.",
          evidenceRef: "reasoning.opportunitySignals.retention_risk",
          confidence: 0.8,
        },
      ],
      missingSummaryFields: ["billing.callbackOwner"],
    },
  };
}

/** Routine confirm — zero-learning call is valid success. */
export function mockRoutineConfirmInput(): ReflectionInput {
  return {
    practiceId: MOCK_PRACTICE_ID,
    callId: "call_confirm_1102",
    interactionId: "int_confirm_1102",
    completedAt: hoursAgoIso(0.5),
    patientReferenceId: "pat_ref_5500",
    reasoning: {
      intent: "confirm",
      urgency: "routine",
      completenessScore: 1,
      confidence: { overall: 0.99, needsReview: false },
      facts: [
        {
          id: "fact_conf_001",
          category: "scheduling",
          statement: "Caller confirmed Monday 10 AM crown seat appointment.",
          evidenceRef: "reasoning.facts.scheduling.confirm",
          confidence: 0.99,
          sourceTurn: 2,
        },
      ],
      missingSummaryFields: [],
    },
  };
}

export const MOCK_REFLECTION_INPUTS = {
  newPatient: mockNewPatientReflectionInput,
  emergencyToothache: mockEmergencyToothacheInput,
  hygieneReschedule: mockHygieneRescheduleInput,
  billingFrustration: mockBillingFrustrationInput,
  routineConfirm: mockRoutineConfirmInput,
};
