/**
 * Mock practice data for Practice Brain V1 development.
 *
 * Simulates Cascade Family Dentistry — West Michigan GP profile from workspace rules.
 * No PMS integration; schedule and recall data are synthetic.
 *
 * FUTURE EXPANSION:
 * - Replace with OfficeDnaProvider + PmsScheduleAdapter per practice
 * - Load fixtures from JSON for golden tests (morning brief, opportunity detection)
 * - Multi-practice factory for load testing thousands of tenants
 */

import type {
  CallSummarySignal,
  OfficeDnaSnapshot,
  PracticeId,
  RecallSignal,
  ScheduleSlotSignal,
} from "./types.ts";

export const MOCK_PRACTICE_ID: PracticeId = "practice_cascade_family_gr";

export function createMockOfficeDna(
  practiceId: PracticeId = MOCK_PRACTICE_ID
): OfficeDnaSnapshot {
  return {
    practiceId,
    configVersion: "dna-v2026.04.1",
    practiceName: "Cascade Family Dentistry",
    timezone: "America/Detroit",
    firstPatientTime: "08:30",
    morningBriefLeadMinutes: 45,
    enabledOpportunityCategories: [
      "scheduling",
      "production",
      "retention",
      "emergency",
      "patient",
      "waitlist_fill",
      "cancellation_recovery",
    ],
    callbackSlaMinutes: 30,
    maxRecommendationsPerRole: {
      front_desk: 12,
      dentist: 6,
      office_manager: 8,
      hygiene_coordinator: 6,
    },
  };
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function createMockCallStream(
  practiceId: PracticeId = MOCK_PRACTICE_ID
): CallSummarySignal[] {
  return [
    {
      callId: "call_overnight_001",
      practiceId,
      intent: "emergency",
      urgency: "urgent",
      receivedAt: hoursAgoIso(11),
      afterHours: true,
      sameDayEmergency: true,
      appointmentType: "emergency_eval",
      completenessScore: 1,
      emotionalFlags: ["painDistress", "fearful"],
      patientReferenceId: "pat_ref_8842",
    },
    {
      callId: "call_overnight_002",
      practiceId,
      intent: "new_patient",
      urgency: "routine",
      receivedAt: hoursAgoIso(9),
      afterHours: true,
      appointmentType: "new_patient_exam",
      insuranceProgram: "delta_dental_ppo",
      completenessScore: 0.95,
      emotionalFlags: ["highAnxiety"],
      patientReferenceId: "pat_ref_9901",
    },
    {
      callId: "call_early_003",
      practiceId,
      intent: "treatment_scheduling",
      urgency: "routine",
      receivedAt: hoursAgoIso(2),
      afterHours: false,
      appointmentType: "crown_seat",
      completenessScore: 0.9,
      patientReferenceId: "pat_ref_7720",
    },
    {
      callId: "call_early_004",
      practiceId,
      intent: "cancel_reschedule",
      urgency: "routine",
      receivedAt: hoursAgoIso(1.5),
      afterHours: false,
      completenessScore: 0.85,
      emotionalFlags: ["frustrated"],
      patientReferenceId: "pat_ref_5510",
    },
    {
      callId: "call_early_005",
      practiceId,
      intent: "hygiene_recall",
      urgency: "routine",
      receivedAt: hoursAgoIso(1),
      afterHours: false,
      appointmentType: "prophy",
      completenessScore: 0.92,
      patientReferenceId: "pat_ref_3312",
    },
  ];
}

export function createMockScheduleSlots(
  practiceId: PracticeId = MOCK_PRACTICE_ID
): ScheduleSlotSignal[] {
  const date = todayDateString();
  return [
    {
      slotId: "slot_doc_0830",
      practiceId,
      date,
      startTime: "08:30",
      durationMinutes: 60,
      column: "doctor",
      appointmentType: "new_patient_exam",
      status: "scheduled",
      providerId: "dr_vanderberg",
    },
    {
      slotId: "slot_doc_1000",
      practiceId,
      date,
      startTime: "10:00",
      durationMinutes: 45,
      column: "doctor",
      appointmentType: "crown_seat",
      status: "scheduled",
      providerId: "dr_vanderberg",
    },
    {
      slotId: "slot_doc_1400",
      practiceId,
      date,
      startTime: "14:00",
      durationMinutes: 60,
      column: "doctor",
      status: "open",
      providerId: "dr_vanderberg",
    },
    {
      slotId: "slot_hyg_0900",
      practiceId,
      date,
      startTime: "09:00",
      durationMinutes: 60,
      column: "hygiene",
      appointmentType: "prophy",
      status: "scheduled",
      providerId: "hyg_martinez",
    },
    {
      slotId: "slot_hyg_1100",
      practiceId,
      date,
      startTime: "11:00",
      durationMinutes: 60,
      column: "hygiene",
      status: "cancelled",
      providerId: "hyg_martinez",
    },
    {
      slotId: "slot_hyg_1300",
      practiceId,
      date,
      startTime: "13:00",
      durationMinutes: 60,
      column: "hygiene",
      status: "open",
      providerId: "hyg_martinez",
    },
    {
      slotId: "slot_doc_1530",
      practiceId,
      date,
      startTime: "15:30",
      durationMinutes: 30,
      column: "doctor",
      status: "open",
      providerId: "dr_vanderberg",
    },
  ];
}

export function createMockRecallPosture(
  practiceId: PracticeId = MOCK_PRACTICE_ID
): RecallSignal[] {
  return [
    {
      patientReferenceId: "pat_ref_3312",
      practiceId,
      recallType: "prophy",
      daysOverdue: 45,
      scheduledToday: true,
    },
    {
      patientReferenceId: "pat_ref_2201",
      practiceId,
      recallType: "prophy",
      daysOverdue: 120,
      scheduledToday: false,
    },
    {
      patientReferenceId: "pat_ref_8890",
      practiceId,
      recallType: "perio_maintenance",
      daysOverdue: 30,
      scheduledToday: true,
    },
  ];
}

export function createMockMemoryPatterns() {
  return {
    operationalPatterns: [
      {
        id: "pat_peak_morning",
        category: "demand",
        description:
          "Highest new-patient call volume 8–9 AM weekdays — front desk peak load",
        confidence: 0.88,
        sampleSize: 142,
        lastObservedAt: hoursAgoIso(24),
      },
      {
        id: "pat_tuesday_cancels",
        category: "scheduling",
        description:
          "Tuesday hygiene cancellations fill within 72h at 62% when waitlist offered within 15 min",
        confidence: 0.76,
        sampleSize: 38,
        lastObservedAt: hoursAgoIso(168),
      },
      {
        id: "pat_delta_disambiguation",
        category: "insurance",
        description:
          "Delta program disambiguation succeeds 91% when employer vs. Medicaid asked before acceptance language",
        confidence: 0.82,
        sampleSize: 56,
        lastObservedAt: hoursAgoIso(72),
      },
    ],
    seasonalBaselines: [
      {
        id: "pat_summer_slowdown",
        category: "seasonal",
        description:
          "Hygiene volume dips ~12% mid-July — capacity available for reactivation outreach",
        confidence: 0.71,
        sampleSize: 24,
        lastObservedAt: hoursAgoIso(720),
      },
    ],
  };
}
