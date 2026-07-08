/**
 * Conversation layer shared types — mock transcript through call summary.
 * Authority: docs/CALL_FLOWS.md, docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md
 */

export type TranscriptSpeaker = "aly" | "patient" | "caller";

export interface TranscriptTurn {
  speaker: TranscriptSpeaker;
  text: string;
  /** Optional media offset seconds — not used in V1 proof logic */
  start?: number;
}

/** Mock call input for V1 proof loop (no telephony). */
export interface MockCallTranscript {
  id: string;
  practiceId: string;
  scenario: string;
  afterHours: boolean;
  durationSeconds?: number;
  receivedAt?: string;
  turns: TranscriptTurn[];
}

export type CallIntent =
  | "NEW_PATIENT"
  | "EMERGENCY"
  | "SCHEDULE_EXISTING"
  | "TREATMENT_SCHEDULE"
  | "RESCHEDULE"
  | "CANCEL"
  | "CONFIRM"
  | "INSURANCE"
  | "BILLING"
  | "GENERAL_INFO"
  | "OTHER";

/** Brain Architecture urgency ladder — summary uses CALL_FLOWS subset today. */
export type UrgencyLevel = "routine" | "priority" | "urgent" | "emergency";

export type InsuranceProgram =
  | "delta_dental_ppo"
  | "delta_dental_medicaid"
  | "healthy_kids_dental"
  | "michigan_medicaid"
  | "ppo_other"
  | "none"
  | "unknown";

export interface PatientUnderstanding {
  intent: CallIntent;
  intentConfidence: number;
  intentSignals: string[];
  callerName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isNewPatient: boolean | null;
  chiefConcern: string | null;
  insuranceCarrier: string | null;
  insuranceProgram: InsuranceProgram;
  symptoms: string[];
  symptomDetails: {
    swelling?: boolean;
    fever?: boolean;
    trauma?: boolean;
    painLevel?: string;
    duration?: string;
    location?: string;
  };
  perFieldConfidence: Record<string, number>;
}

export interface UrgencyAssessment {
  urgency: UrgencyLevel;
  sameDayEmergency: boolean;
  matchedRules: string[];
  reasons: string[];
  routingAction: string;
  confidence: number;
}

export interface FrontDeskAssessment {
  missingFields: string[];
  appointmentType: string | null;
  recommendedNextStep: string;
}

export interface CallSummaryConfidence {
  overall: number;
  notes: string[];
  humanReviewNeeded: boolean;
}

/**
 * Structured call artifact — staff handoff + Practice Brain ingest source.
 * Maps to CALL_FLOWS summary schema with V1 proof fields explicit.
 */
export interface CallSummary {
  $schema: "https://freedomdesk.com/schemas/call-summary/v1";
  id: string;
  practiceId: string;
  callId: string;
  timestamp: string;
  durationSeconds: number | null;
  afterHours: boolean;
  intent: CallIntent;
  urgency: UrgencyLevel;
  sameDayEmergency: boolean;
  caller: {
    name: string | null;
    phone: string | null;
    isNewPatient: boolean | null;
    dateOfBirth: string | null;
  };
  chiefConcern: string | null;
  insurance?: {
    carrier: string | null;
    program: InsuranceProgram;
    memberId: string | null;
  };
  emergency?: {
    symptoms: string[];
    swelling: boolean;
    fever: boolean;
    trauma: boolean;
    painLevel: string | null;
    duration: string | null;
    routingAction: string;
  };
  missingInformation: string[];
  recommendedNextStep: string;
  humanReviewNeeded: boolean;
  confidence: CallSummaryConfidence;
  openDentalCommLogNote: string;
  actionItems: Array<{
    type: string;
    assignee: string;
    priority: UrgencyLevel;
    notes: string;
  }>;
}

export interface ProcessCallResult {
  summary: CallSummary;
  signal: import("../practice-brain/types.ts").CallSummarySignal;
}
