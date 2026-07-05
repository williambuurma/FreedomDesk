/**
 * Mock patient-centric practice memory — Cascade Family Dentistry, West Michigan.
 * Synthetic PHI for local development only; no database.
 */

import type {
  CallMemory,
  ClinicalConcernMemory,
  CommunicationNote,
  ConfidenceNote,
  InsuranceMemory,
  OpportunityMemory,
  PatientMemory,
  PracticeId,
  PracticeMemory,
  PreferenceMemory,
  TaskMemory,
  UnresolvedIssue,
} from "./types.ts";

export const MOCK_PRACTICE_ID: PracticeId = "practice_cascade_family_gr";
export const PRACTICE_MEMORY_VERSION = "practice-memory-patient-v1";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function source(
  type: ConfidenceNote["source"]["type"],
  note: string,
  referenceId?: string,
  observedDaysAgo = 0
): ConfidenceNote {
  return {
    confidence: type === "inferred" ? 0.65 : 0.9,
    source: {
      type,
      note,
      referenceId,
      observedAt:
        observedDaysAgo > 0 ? daysAgoIso(observedDaysAgo) : new Date().toISOString(),
    },
  };
}

function sarahMitchell(): PatientMemory {
  const patientId = "pat_sarah_mitchell";
  const practiceId = MOCK_PRACTICE_ID;

  const preferences: PreferenceMemory[] = [
    {
      id: "pref_sm_001",
      category: "comfort",
      preference: "Prefers topical anesthetic before injections; gets anxious with needles.",
      emotionalContext: "Dental anxiety — reassure before clinical questions.",
      confidence: source("call", "Caller mentioned fear of needles on 3/12 intake call.", "call_sm_001", 14),
      createdAt: daysAgoIso(14),
      updatedAt: daysAgoIso(14),
    },
    {
      id: "pref_sm_002",
      category: "scheduling",
      preference: "Tuesday or Thursday mornings only — works from home those days.",
      confidence: source("front_desk_note", "Front desk note after crown prep scheduling.", undefined, 7),
      createdAt: daysAgoIso(7),
      updatedAt: daysAgoIso(7),
    },
  ];

  const communicationNotes: CommunicationNote[] = [
    {
      id: "comm_sm_001",
      note: "Asked for text confirmation the day before appointments; does not check voicemail.",
      channel: "phone",
      confidence: source("call", "Stated during crown seat scheduling call.", "call_sm_002", 3),
      createdAt: daysAgoIso(3),
    },
  ];

  const clinicalConcerns: ClinicalConcernMemory[] = [
    {
      id: "clin_sm_001",
      concern: "Crown #14 seat pending — patient reports occasional cold sensitivity.",
      tooth: "14",
      urgency: "routine",
      status: "active",
      confidence: source("pms_sync", "Treatment plan from Open Dental sync.", "tx_plan_sm_14", 21),
      firstNotedAt: daysAgoIso(21),
      updatedAt: daysAgoIso(3),
    },
  ];

  const insurance: InsuranceMemory[] = [
    {
      id: "ins_sm_001",
      program: "delta_dental_ppo",
      carrierName: "Delta Dental of Michigan",
      memberIdLastFour: "4821",
      subscriberName: "Sarah Mitchell",
      verificationStatus: "pending",
      notes: "Annual max may be near exhaustion — verify before crown seat.",
      confidence: source("front_desk_note", "Benefits check requested at crown prep.", undefined, 7),
      updatedAt: daysAgoIso(7),
    },
  ];

  const openTasks: TaskMemory[] = [
    {
      id: "task_sm_001",
      patientId,
      title: "Verify Delta PPO benefits before crown seat",
      description: "Confirm annual max remaining and crown coverage for #14.",
      owner: "front_desk",
      status: "open",
      priority: "high",
      dueAt: daysAgoIso(-1),
      confidence: source("manual", "Created from treatment plan workflow.", "tx_plan_sm_14", 7),
      createdAt: daysAgoIso(7),
      updatedAt: daysAgoIso(1),
    },
  ];

  const unresolvedIssues: UnresolvedIssue[] = [
    {
      id: "issue_sm_001",
      patientId,
      title: "Crown seat not yet scheduled",
      description: "Patient wanted to wait for benefits verification before booking seat appointment.",
      category: "scheduling",
      status: "open",
      confidence: source("call", "Patient deferred scheduling on last call.", "call_sm_002", 3),
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(3),
    },
  ];

  const opportunities: OpportunityMemory[] = [
    {
      id: "opp_sm_001",
      patientId,
      type: "production",
      title: "Schedule crown #14 seat",
      description: "Crown ready in lab; patient prefers Tue/Thu AM once benefits confirmed.",
      estimatedImpact: "high",
      status: "open",
      confidence: source("pms_sync", "Lab case received notification.", "lab_sm_14", 2),
      detectedAt: daysAgoIso(2),
      expiresAt: daysAgoIso(-14),
    },
  ];

  const recentCalls: CallMemory[] = [
    {
      id: "callmem_sm_001",
      callId: "call_sm_002",
      intent: "treatment_scheduling",
      summary: "Caller asked about crown seat timing; wants benefits verified first. Anxious about appointment length.",
      emotionalFlags: ["anxious"],
      confidence: source("call", "FreedomDesk call summary.", "call_sm_002", 0),
      receivedAt: hoursAgoIso(72),
    },
  ];

  return {
    patientId,
    practiceId,
    identity: {
      patientId,
      firstName: "Sarah",
      lastName: "Mitchell",
      dateOfBirth: "1986-04-12",
      phone: "616-555-0142",
      isNewPatient: false,
    },
    preferences,
    communicationNotes,
    clinicalConcerns,
    insurance,
    openTasks,
    unresolvedIssues,
    opportunities,
    recentCalls,
    createdAt: daysAgoIso(180),
    updatedAt: daysAgoIso(1),
  };
}

function emmaNguyen(): PatientMemory {
  const patientId = "pat_emma_nguyen";
  const practiceId = MOCK_PRACTICE_ID;
  const guardianName = "Lisa Nguyen";

  const preferences: PreferenceMemory[] = [
    {
      id: "pref_en_001",
      category: "communication",
      preference: "Guardian Lisa prefers all scheduling contact; child Emma is shy on the phone.",
      emotionalContext: "Pediatric — speak with parent for scheduling.",
      confidence: source("front_desk_note", "Noted at first HKD visit.", undefined, 90),
      createdAt: daysAgoIso(90),
      updatedAt: daysAgoIso(90),
    },
  ];

  const communicationNotes: CommunicationNote[] = [
    {
      id: "comm_en_001",
      note: "Mom called frustrated about recall letter — thought Emma was already scheduled in August.",
      channel: "phone",
      confidence: source("call", "After-hours recall callback.", "call_en_001", 2),
      createdAt: daysAgoIso(2),
    },
  ];

  const clinicalConcerns: ClinicalConcernMemory[] = [
    {
      id: "clin_en_001",
      concern: "Recall overdue by 4 months — last prophy 10/2025.",
      urgency: "routine",
      status: "active",
      confidence: source("pms_sync", "Recall report from Open Dental.", "recall_en_001", 5),
      firstNotedAt: daysAgoIso(120),
      updatedAt: daysAgoIso(5),
    },
  ];

  const insurance: InsuranceMemory[] = [
    {
      id: "ins_en_001",
      program: "healthy_kids_dental",
      carrierName: "Delta Dental Medicaid",
      memberIdLastFour: "7734",
      subscriberName: guardianName,
      verificationStatus: "verified",
      notes: "HKD active; two cleanings per benefit year.",
      confidence: source("pms_sync", "Eligibility check on file.", undefined, 30),
      updatedAt: daysAgoIso(30),
    },
  ];

  const openTasks: TaskMemory[] = [
    {
      id: "task_en_001",
      patientId,
      title: "Call guardian to schedule overdue hygiene recall",
      description: "Emma Nguyen — HKD; overdue 4 months. Mom prefers after 4 PM.",
      owner: "hygiene",
      status: "open",
      priority: "medium",
      confidence: source("inferred", "Recall queue automation.", "recall_en_001", 1),
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
    },
  ];

  const unresolvedIssues: UnresolvedIssue[] = [
    {
      id: "issue_en_001",
      patientId,
      title: "Recall scheduling confusion",
      description: "Guardian believes August appointment exists; schedule search shows no future hygiene visit.",
      category: "scheduling",
      status: "open",
      emotionalContext: "Guardian sounded frustrated — acknowledge mix-up before rebooking.",
      confidence: source("call", "Overnight callback summary.", "call_en_001", 2),
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(2),
    },
  ];

  const opportunities: OpportunityMemory[] = [
    {
      id: "opp_en_001",
      patientId,
      type: "recall",
      title: "Book overdue child prophy",
      description: "HKD patient; 4 months overdue. Guardian flexible after school.",
      estimatedImpact: "medium",
      status: "open",
      confidence: source("pms_sync", "Recall overdue flag.", "recall_en_001", 5),
      detectedAt: daysAgoIso(5),
    },
    {
      id: "opp_en_002",
      patientId,
      type: "household",
      title: "Schedule sibling Liam (age 10) first visit",
      description: "Mom mentioned second child not yet established — potential HKD new patient.",
      estimatedImpact: "medium",
      status: "open",
      confidence: source("call", "Household expansion mentioned on recall call.", "call_en_001", 2),
      detectedAt: daysAgoIso(2),
      expiresAt: daysAgoIso(-30),
    },
  ];

  const recentCalls: CallMemory[] = [
    {
      id: "callmem_en_001",
      callId: "call_en_001",
      intent: "hygiene_recall",
      summary: "Guardian confused about recall timing; child overdue. Mentioned sibling needs first visit.",
      emotionalFlags: ["frustrated"],
      confidence: source("call", "FreedomDesk after-hours summary.", "call_en_001", 0),
      receivedAt: hoursAgoIso(48),
    },
  ];

  return {
    patientId,
    practiceId,
    identity: {
      patientId,
      firstName: "Emma",
      lastName: "Nguyen",
      dateOfBirth: "2016-09-03",
      guardianName,
      isNewPatient: false,
    },
    preferences,
    communicationNotes,
    clinicalConcerns,
    insurance,
    openTasks,
    unresolvedIssues,
    opportunities,
    recentCalls,
    createdAt: daysAgoIso(400),
    updatedAt: daysAgoIso(2),
  };
}

function robertChen(): PatientMemory {
  const patientId = "pat_robert_chen";
  const practiceId = MOCK_PRACTICE_ID;

  const preferences: PreferenceMemory[] = [
    {
      id: "pref_rc_001",
      category: "scheduling",
      preference: "Needs ride coordination — prefers afternoon slots when daughter can drive.",
      confidence: source("front_desk_note", "Transportation noted at extraction consult.", undefined, 10),
      createdAt: daysAgoIso(10),
      updatedAt: daysAgoIso(10),
    },
  ];

  const communicationNotes: CommunicationNote[] = [
    {
      id: "comm_rc_001",
      note: "Speaks limited English; daughter Mei translates for insurance and billing questions.",
      channel: "in_person",
      confidence: source("front_desk_note", "Intake demographics update.", undefined, 45),
      createdAt: daysAgoIso(45),
    },
  ];

  const clinicalConcerns: ClinicalConcernMemory[] = [
    {
      id: "clin_rc_001",
      concern: "Post-extraction #19 — reports mild soreness; no swelling reported on last call.",
      tooth: "19",
      urgency: "routine",
      status: "monitoring",
      confidence: source("call", "Post-op check-in call.", "call_rc_001", 4),
      firstNotedAt: daysAgoIso(5),
      updatedAt: daysAgoIso(4),
    },
  ];

  const insurance: InsuranceMemory[] = [
    {
      id: "ins_rc_001",
      program: "michigan_medicaid",
      carrierName: "Michigan Medicaid",
      memberIdLastFour: "2198",
      subscriberName: "Robert Chen",
      verificationStatus: "issue",
      notes: "Prior authorization for extraction was approved; claim still showing pending.",
      confidence: source("manual", "Billing queue note.", "claim_rc_019", 6),
      updatedAt: daysAgoIso(6),
    },
  ];

  const openTasks: TaskMemory[] = [
    {
      id: "task_rc_001",
      patientId,
      title: "Follow up on Medicaid claim for extraction #19",
      owner: "billing",
      status: "open",
      priority: "high",
      confidence: source("manual", "Aged claim report.", "claim_rc_019", 3),
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(3),
    },
    {
      id: "task_rc_002",
      patientId,
      title: "Post-op phone check — extraction site healing",
      owner: "front_desk",
      status: "open",
      priority: "medium",
      dueAt: daysAgoIso(-2),
      confidence: source("manual", "Standard extraction follow-up protocol.", undefined, 5),
      createdAt: daysAgoIso(5),
      updatedAt: daysAgoIso(4),
    },
  ];

  const unresolvedIssues: UnresolvedIssue[] = [
    {
      id: "issue_rc_001",
      patientId,
      title: "Medicaid claim pending past 30 days",
      description: "Patient concerned about bill; daughter called twice. Do not quote balance — route to billing.",
      category: "billing",
      status: "escalated",
      emotionalContext: "Family worried about unexpected cost — empathize before transferring.",
      confidence: source("call", "Two billing inquiry calls this week.", "call_rc_002", 1),
      createdAt: daysAgoIso(6),
      updatedAt: daysAgoIso(1),
    },
  ];

  const opportunities: OpportunityMemory[] = [
    {
      id: "opp_rc_001",
      patientId,
      type: "treatment_plan",
      title: "Schedule partial denture consult",
      description: "Doctor noted partial recommended at extraction visit; patient asked to wait until extraction heals.",
      estimatedImpact: "high",
      status: "open",
      confidence: source("pms_sync", "Unsigned treatment plan in chart.", "tx_plan_rc_partial", 5),
      detectedAt: daysAgoIso(5),
      expiresAt: daysAgoIso(-60),
    },
  ];

  const recentCalls: CallMemory[] = [
    {
      id: "callmem_rc_001",
      callId: "call_rc_002",
      intent: "billing_inquiry",
      summary: "Daughter asking about Medicaid claim status for father's extraction. Requested callback from billing.",
      emotionalFlags: ["worried", "frustrated"],
      confidence: source("call", "FreedomDesk billing routing summary.", "call_rc_002", 0),
      receivedAt: hoursAgoIso(26),
    },
  ];

  return {
    patientId,
    practiceId,
    identity: {
      patientId,
      firstName: "Robert",
      lastName: "Chen",
      dateOfBirth: "1958-11-22",
      phone: "616-555-0287",
      isNewPatient: false,
    },
    preferences,
    communicationNotes,
    clinicalConcerns,
    insurance,
    openTasks,
    unresolvedIssues,
    opportunities,
    recentCalls,
    createdAt: daysAgoIso(120),
    updatedAt: daysAgoIso(1),
  };
}

/** Default in-memory practice memory for development and tests. */
export function createMockPracticeMemory(): PracticeMemory {
  return {
    practiceId: MOCK_PRACTICE_ID,
    practiceName: "Cascade Family Dentistry",
    patients: [sarahMitchell(), emmaNguyen(), robertChen()],
    asOf: new Date().toISOString(),
    version: PRACTICE_MEMORY_VERSION,
  };
}
