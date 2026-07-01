// Core conversation state for every FreedomDesk call.
// This represents what the AI currently knows about the caller.

export type PatientType = "new" | "existing" | "unknown";

export type Emotion =
  | "calm"
  | "anxious"
  | "frustrated"
  | "confused"
  | "pain"
  | "urgent"
  | "unknown";

export type Urgency =
  | "routine"
  | "soon"
  | "urgent_today"
  | "doctor_callback"
  | "emergency";

export interface ConversationState {
  patientType: PatientType;

  patientName?: string;

  phoneNumber?: string;

  chiefConcern?: string;

  painLevel?: number;

  swelling?: boolean;

  bleeding?: boolean;

  fever?: boolean;

  symptomDuration?: string;

  insurance?: string;

  preferredAppointment?: string;

  emotion: Emotion;

  urgency: Urgency;

  completedFields: string[];

  missingFields: string[];
}