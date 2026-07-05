/**
 * Practice Memory — patient-centric institutional memory for one dental practice.
 *
 * Remembers preferences, unresolved problems, clinical context, insurance issues,
 * and opportunities so the team starts each day organized. Distinct from
 * practice-brain operational patterns (POS §27 aggregates).
 *
 * FUTURE: Persist to tenant-scoped store with HIPAA retention policies;
 * sync from call summaries and PMS adapters; RBAC-scoped views per role.
 */

export type PracticeId = string;
export type PatientId = string;
export type ISOTimestamp = string;
export type Confidence = number;

export type MemorySourceType =
  | "call"
  | "front_desk_note"
  | "pms_sync"
  | "manual"
  | "inferred";

/** Provenance for a memory item — inspectable without logging PHI in aggregates. */
export interface MemorySource {
  type: MemorySourceType;
  note?: string;
  referenceId?: string;
  observedAt: ISOTimestamp;
}

export interface ConfidenceNote {
  confidence: Confidence;
  source: MemorySource;
}

export interface PatientIdentity {
  patientId: PatientId;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  isNewPatient?: boolean;
  guardianName?: string;
}

export interface PreferenceMemory {
  id: string;
  category: "scheduling" | "communication" | "comfort" | "clinical" | "other";
  preference: string;
  emotionalContext?: string;
  confidence: ConfidenceNote;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface CommunicationNote {
  id: string;
  note: string;
  channel: "phone" | "text" | "email" | "in_person";
  confidence: ConfidenceNote;
  createdAt: ISOTimestamp;
}

export interface ClinicalConcernMemory {
  id: string;
  concern: string;
  tooth?: string;
  urgency?: "routine" | "urgent" | "emergency";
  status: "active" | "monitoring" | "resolved";
  confidence: ConfidenceNote;
  firstNotedAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface InsuranceMemory {
  id: string;
  program:
    | "delta_dental_ppo"
    | "delta_dental_medicaid"
    | "healthy_kids_dental"
    | "michigan_medicaid"
    | "ppo_other"
    | "cash_pay"
    | "unknown";
  carrierName?: string;
  memberIdLastFour?: string;
  subscriberName?: string;
  verificationStatus: "verified" | "pending" | "issue" | "unknown";
  notes?: string;
  confidence: ConfidenceNote;
  updatedAt: ISOTimestamp;
}

export interface TaskMemory {
  id: string;
  patientId: PatientId;
  title: string;
  description?: string;
  owner: "front_desk" | "dentist" | "hygiene" | "billing" | "office_manager";
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "critical" | "high" | "medium" | "low";
  dueAt?: ISOTimestamp;
  confidence: ConfidenceNote;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface UnresolvedIssue {
  id: string;
  patientId: PatientId;
  title: string;
  description: string;
  category:
    | "billing"
    | "scheduling"
    | "clinical_follow_up"
    | "insurance"
    | "complaint"
    | "other";
  status: "open" | "escalated" | "resolved";
  emotionalContext?: string;
  confidence: ConfidenceNote;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface OpportunityMemory {
  id: string;
  patientId: PatientId;
  type:
    | "recall"
    | "treatment_plan"
    | "household"
    | "insurance"
    | "production"
    | "retention";
  title: string;
  description: string;
  estimatedImpact?: "high" | "medium" | "low";
  status: "open" | "acted" | "dismissed" | "expired";
  confidence: ConfidenceNote;
  detectedAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
}

export interface CallMemory {
  id: string;
  callId?: string;
  intent: string;
  summary: string;
  emotionalFlags?: string[];
  confidence: ConfidenceNote;
  receivedAt: ISOTimestamp;
}

export interface PatientMemory {
  patientId: PatientId;
  practiceId: PracticeId;
  identity: PatientIdentity;
  preferences: PreferenceMemory[];
  communicationNotes: CommunicationNote[];
  clinicalConcerns: ClinicalConcernMemory[];
  insurance: InsuranceMemory[];
  openTasks: TaskMemory[];
  unresolvedIssues: UnresolvedIssue[];
  opportunities: OpportunityMemory[];
  recentCalls: CallMemory[];
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

/** Top-level practice memory container — one per tenant. */
export interface PracticeMemory {
  practiceId: PracticeId;
  practiceName: string;
  patients: PatientMemory[];
  asOf: ISOTimestamp;
  version: string;
}

export interface MorningMemorySummary {
  practiceId: PracticeId;
  practiceName: string;
  generatedAt: ISOTimestamp;
  patientCount: number;
  openTaskCount: number;
  unresolvedIssueCount: number;
  opportunityCount: number;
  highlights: string[];
  openTasks: TaskMemory[];
  unresolvedIssues: UnresolvedIssue[];
  opportunities: OpportunityMemory[];
}
