/**
 * Conversation state — dumb data container updated by the orchestrator.
 * No business logic here (Brain Architecture invariant).
 */

import type {
  CallIntent,
  InsuranceProgram,
  MockCallTranscript,
  UrgencyLevel,
} from "./types.ts";

export type ConversationEmotion =
  | "unknown"
  | "anxious"
  | "pain"
  | "frustrated"
  | "calm";

export interface ConversationState {
  callId: string;
  practiceId: string;
  afterHours: boolean;
  intent: CallIntent;
  urgency: UrgencyLevel;
  sameDayEmergency: boolean;
  emotion: ConversationEmotion;
  callerName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isNewPatient: boolean | null;
  chiefConcern: string | null;
  insuranceCarrier: string | null;
  insuranceProgram: InsuranceProgram;
  symptoms: string[];
  missingFields: string[];
  appointmentType: string | null;
  recommendedNextStep: string;
  humanReviewNeeded: boolean;
  confidenceNotes: string[];
  overallConfidence: number;
}

export function createStateFromTranscript(
  transcript: MockCallTranscript
): ConversationState {
  return {
    callId: transcript.id,
    practiceId: transcript.practiceId,
    afterHours: transcript.afterHours,
    intent: "OTHER",
    urgency: "routine",
    sameDayEmergency: false,
    emotion: "unknown",
    callerName: null,
    phone: null,
    dateOfBirth: null,
    isNewPatient: null,
    chiefConcern: null,
    insuranceCarrier: null,
    insuranceProgram: "unknown",
    symptoms: [],
    missingFields: [],
    appointmentType: null,
    recommendedNextStep: "",
    humanReviewNeeded: false,
    confidenceNotes: [],
    overallConfidence: 0,
  };
}
