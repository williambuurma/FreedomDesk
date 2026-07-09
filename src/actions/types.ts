/**
 * Action Model — typed contract for judgment-backed operational commitments.
 * Authority: docs/ACTION_MODEL.md
 *
 * Inbox surface statuses are a thin UI projection of Action lifecycle.
 */

import type { OwnerRole } from "../practice-brain/types.ts";
import type {
  OperationalEventEvidence,
  OperationalEventUncertainty,
  PracticeId,
  ISOTimestamp,
  UrgencyTier,
} from "../events/types.ts";

export const ACTION_SCHEMA_VERSION = "action/v1";

/** Action Model registry lifecycle (docs/ACTION_MODEL.md §7). */
export type ActionLifecycleStatus =
  | "active"
  | "blocked"
  | "escalated"
  | "completed"
  | "dismissed"
  | "expired"
  | "superseded"
  | "merged";

/**
 * Intelligence Inbox surface status — product-facing projection.
 * Maps to Action lifecycle: needs_action→active, committed→active+accepted,
 * completed/dismissed→terminal.
 */
export type InboxStatus = "needs_action" | "committed" | "completed" | "dismissed";

export type ActionCategory =
  | "schedule"
  | "verification"
  | "clinical_prep"
  | "follow_up"
  | "emergency"
  | "retention"
  | "dna_maintenance"
  | "integration";

/** Judgment-backed Action — durable commitment for human resolution. */
export interface Action {
  $schema: typeof ACTION_SCHEMA_VERSION;
  id: string;
  practiceId: PracticeId;
  verb: string;
  object: string;
  because: string;
  /**
   * Decision-first headline for humans — imperative, ten-second act test.
   * Example: "Call Finn Leo before 9:00 AM" — not "Emergency call".
   */
  decision: string;
  /** Cost of inaction — plain language, one line. */
  ifIgnored: string;
  /** What happened — supporting context; event is not the headline. */
  whatHappened: string;
  /** Display name for patient/caller when available (UI only; not for aggregate logs). */
  subjectDisplayName?: string;
  primaryResponsibility: OwnerRole;
  urgencyTier: UrgencyTier;
  recommendedNextStep: string;
  evidence: OperationalEventEvidence[];
  confidence: number;
  uncertainty: OperationalEventUncertainty;
  status: InboxStatus;
  lifecycleStatus: ActionLifecycleStatus;
  sourceEventIds: string[];
  createdAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
  category?: ActionCategory;
  appointmentType?: string;
}

/** Decision card view model — Action fields the product surface renders. */
export interface InboxCard {
  id: string;
  decision: string;
  ifIgnored: string;
  whatHappened: string;
  subjectDisplayName?: string;
  because: string;
  recommendedNextStep: string;
  primaryResponsibility: OwnerRole;
  urgencyTier: UrgencyTier;
  status: InboxStatus;
  evidence: OperationalEventEvidence[];
  confidence: number;
  sourceEventIds: string[];
  createdAt: ISOTimestamp;
  category?: ActionCategory;
}
