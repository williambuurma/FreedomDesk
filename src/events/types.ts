/**
 * Operational Event Stream — typed contract for practice-time judgment ingest.
 * Authority: docs/INTELLIGENCE_MODEL.md § operational event stream
 */

import type { OwnerRole } from "../practice-brain/types.ts";

/** Opaque tenant identifier — one practice brain instance per practiceId. */
export type PracticeId = string;

/** ISO 8601 timestamp string. */
export type ISOTimestamp = string;

export const OPERATIONAL_EVENT_SCHEMA_VERSION = "operational-event/v1";

/** Channel or system that produced the event. */
export type OperationalEventSource =
  | "call"
  | "pms"
  | "lab"
  | "staff"
  | "system";

/** Normalized operational event types — judgment subscribes to events, not channels. */
export type OperationalEventType =
  | "call_completed"
  | "boundary_utterance"
  | "appointment_cancelled"
  | "lab_status_changed"
  | "insurance_verification_needed"
  | "schedule_conflict_detected";

export type UrgencyTier = "critical" | "important" | "informational";

/** Provenance pointer — inspectable evidence without PHI in aggregate logs. */
export interface OperationalEventEvidence {
  /** Source class: call_summary, caller_stated, pms_authoritative, office_dna, inferred */
  source: string;
  description: string;
  referenceId?: string;
  provenance?: string;
  observedAt: ISOTimestamp;
}

export type UncertaintyClass =
  | "unknown"
  | "unverified"
  | "inferred"
  | "conflicted"
  | "unverifiable_on_channel";

export interface OperationalEventUncertainty {
  confidence: number;
  humanReviewNeeded?: boolean;
  gaps?: string[];
  class?: UncertaintyClass;
}

export interface OperationalEventSubject {
  patientReferenceId?: string;
  callId?: string;
}

export interface OperationalEventRouting {
  owner?: OwnerRole;
  responsibilityTags?: string[];
  urgencyTier?: UrgencyTier;
  recommendedNextStep?: string;
}

/** Payload for call_completed — full structured summary embedded for V1. */
export interface CallCompletedPayload {
  schema: "call_summary/v1";
  summaryId: string;
  intent: string;
  urgency: string;
  afterHours: boolean;
  sameDayEmergency: boolean;
  appointmentType?: string;
  insuranceProgram?: string;
  emotionalFlags?: string[];
  completenessScore: number;
  missingFields?: string[];
}

/**
 * Canonical operational event — decade-scale backbone for practice judgment.
 * All domains (calls, schedule, lab, insurance) normalize into this shape.
 */
export interface OperationalEvent {
  $schema: typeof OPERATIONAL_EVENT_SCHEMA_VERSION;
  id: string;
  practiceId: PracticeId;
  source: OperationalEventSource;
  timestamp: ISOTimestamp;
  eventType: OperationalEventType;
  subject?: OperationalEventSubject;
  evidence: OperationalEventEvidence[];
  uncertainty: OperationalEventUncertainty;
  routing?: OperationalEventRouting;
  payload: CallCompletedPayload | Record<string, unknown>;
}
