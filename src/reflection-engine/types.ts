/**
 * Reflection Engine — type contracts (CLE §27, FreedomDesk Intelligence).
 *
 * Reflection runs after a completed interaction. It never writes to Practice Memory.
 * It produces structured learning artifacts and Memory Candidates for the Memory
 * Steward to validate, dedupe, and persist.
 *
 * FUTURE: JSON Schema export; Memory Steward ingestion contract; aggregate
 * reflection logs without PHI for learning metrics.
 */

export type PracticeId = string;
export type CallId = string;
export type InteractionId = string;
export type ISOTimestamp = string;
export type Confidence = number;

/** Pointer to a field in Reasoning Engine output — reflection cites, never invents. */
export type EvidenceRef = string;

export type ReflectionObservationCategory =
  | "fact"
  | "preference"
  | "insurance"
  | "emotional"
  | "scheduling"
  | "operational"
  | "opportunity"
  | "follow_up";

export type LearningCandidateType =
  | "preference"
  | "insurance"
  | "scheduling"
  | "communication"
  | "clinical_context"
  | "operational"
  | "opportunity"
  | "unresolved_issue";

export type LearningCandidateDisposition =
  | "proposed"
  | "needs_verification"
  | "low_confidence";

/**
 * Evidence bundle from the Reasoning Engine for one completed interaction.
 * Reflection treats this as the sole source of truth.
 */
export interface ReasoningFact {
  id: string;
  category:
    | "demographic"
    | "scheduling"
    | "insurance"
    | "clinical_reported"
    | "preference"
    | "operational"
    | "emotional";
  /** Caller-reported or verified statement — not a clinical diagnosis. */
  statement: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
  sourceTurn?: number;
}

export interface ReasoningUnresolvedSlot {
  field: string;
  reason?: string;
  evidenceRef: EvidenceRef;
}

export interface ReasoningEmotionalSignal {
  flag: string;
  description: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
}

export interface ReasoningInsuranceSignal {
  program?: string;
  concern?: string;
  verificationStatus?: "verified" | "pending" | "issue" | "unknown";
  evidenceRef: EvidenceRef;
  confidence: Confidence;
}

export interface ReasoningSchedulingSignal {
  appointmentType?: string;
  preferredTimes?: string[];
  constraint?: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
}

export interface ReasoningOperationalSignal {
  type: "summary_gap" | "friction" | "handoff" | "rework_risk" | "team_action";
  description: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
}

export interface ReasoningOpportunitySignal {
  type: string;
  description: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
}

export interface ReasoningConfidence {
  overall: Confidence;
  needsReview: boolean;
  bindingField?: string;
}

/**
 * Structured output from the Reasoning Engine after interaction completion.
 * Post-call ConversationAnalysis + summary fields collapse into this contract.
 */
export interface ReasoningEvidence {
  intent: string;
  urgency?: "routine" | "urgent" | "emergency";
  facts: ReasoningFact[];
  unresolvedSlots?: ReasoningUnresolvedSlot[];
  emotionalSignals?: ReasoningEmotionalSignal[];
  insuranceSignals?: ReasoningInsuranceSignal[];
  schedulingSignals?: ReasoningSchedulingSignal[];
  operationalSignals?: ReasoningOperationalSignal[];
  opportunitySignals?: ReasoningOpportunitySignal[];
  missingSummaryFields?: string[];
  completenessScore?: number;
  confidence?: ReasoningConfidence;
}

/** Input to reflect() — one completed interaction plus reasoning evidence. */
export interface ReflectionInput {
  practiceId: PracticeId;
  callId: CallId;
  interactionId: InteractionId;
  completedAt: ISOTimestamp;
  patientReferenceId?: string;
  reasoning: ReasoningEvidence;
}

/** One evidence-backed observation from reflection — not a diagnosis. */
export interface ReflectionObservation {
  id: string;
  category: ReflectionObservationCategory;
  observation: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
  /** True when observation is suitable for Memory Steward review. */
  memoryCandidateHint: boolean;
}

/** Unresolved question surfaced during reflection — honest gaps only. */
export interface ReflectionQuestion {
  id: string;
  question: string;
  domain: "insurance" | "scheduling" | "clinical_intake" | "demographics" | "operational" | "other";
  evidenceRef: EvidenceRef;
  blocksMemoryWrite: boolean;
}

/**
 * Memory Candidate — proposed learning for Memory Steward.
 * Reflection Engine NEVER persists these; Memory Steward validates and writes.
 */
export interface LearningCandidate {
  id: string;
  type: LearningCandidateType;
  summary: string;
  evidenceRef: EvidenceRef;
  confidence: Confidence;
  disposition: LearningCandidateDisposition;
  /** Suggested Practice Memory shape — steward maps to concrete records. */
  suggestedMemoryKind:
    | "preference"
    | "insurance"
    | "communication_note"
    | "clinical_concern"
    | "task"
    | "unresolved_issue"
    | "opportunity"
    | "call_memory";
  patientReferenceId?: string;
}

/** Executive reflection summary — what did we actually learn? */
export interface ReflectionSummary {
  headline: string;
  intent: string;
  urgency?: "routine" | "urgent" | "emergency";
  learningYield: "none" | "low" | "moderate" | "high";
  factCount: number;
  unresolvedCount: number;
  candidateCount: number;
  teamReworkRisk: "low" | "medium" | "high";
  anxietyImpact: "reduced" | "stable" | "elevated" | "unknown";
  keyLearnings: string[];
  openQuestions: string[];
}

/** Full reflection artifact for one completed interaction. */
export interface Reflection {
  practiceId: PracticeId;
  callId: CallId;
  interactionId: InteractionId;
  reflectedAt: ISOTimestamp;
  version: string;
  intent: string;

  summary: ReflectionSummary;
  factsLearned: ReflectionObservation[];
  unresolvedQuestions: ReflectionQuestion[];
  followUpOpportunities: ReflectionObservation[];
  patientPreferences: ReflectionObservation[];
  insuranceConcerns: ReflectionObservation[];
  emotionalObservations: ReflectionObservation[];
  schedulingObservations: ReflectionObservation[];
  operationalObservations: ReflectionObservation[];
  opportunities: ReflectionObservation[];
  memoryCandidates: LearningCandidate[];

  /** True when at least one observation or candidate was produced. */
  hadLearning: boolean;
  /** Non-empty when reflection detected diagnostic or invented content — escalate. */
  constitutionalFlags: string[];
}
