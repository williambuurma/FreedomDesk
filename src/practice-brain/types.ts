/**
 * FreedomDesk Practice Brain — shared type contracts.
 *
 * Canonical interfaces for the practice intelligence layer (Chief of Staff).
 * See docs/PRACTICE_OPERATING_SYSTEM.md, docs/CONTINUOUS_LEARNING_ENGINE.md,
 * docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md, docs/FREEDOMDESK_OFFICE_DNA.md.
 *
 * FUTURE EXPANSION:
 * - Split into domain packages (awareness/, memory/, recommendations/) when team scales
 * - Generate JSON Schema from these types for API validation and dashboard contracts
 * - Add protobuf/Avro for event streaming at multi-tenant scale (Kafka/PubSub)
 * - RBAC-scoped view types per role (doctor slice vs. front desk slice)
 */

/** Opaque tenant identifier — one practice brain instance per practiceId. */
export type PracticeId = string;

/** ISO 8601 timestamp string. */
export type ISOTimestamp = string;

/** Confidence score in [0, 1]. Organizational learning uses separate thresholds (CLE §19). */
export type Confidence = number;

/**
 * Role ownership per POS Internal Team Communication routing matrix.
 * FUTURE: Extend with `hygiene_coordinator`, `billing`, `on_call_dentist` sub-roles.
 */
export type OwnerRole =
  | "front_desk"
  | "dentist"
  | "office_manager"
  | "hygiene_coordinator"
  | "assistant"
  | "freedomdesk_ops";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type RecommendationCategory =
  | "schedule"
  | "follow_up"
  | "verification"
  | "clinical_prep"
  | "retention"
  | "production"
  | "capacity"
  | "emergency"
  | "patient_experience"
  | "dna_maintenance"
  | "integration"
  | "quality";

export type OpportunityType =
  | "scheduling"
  | "production"
  | "retention"
  | "emergency"
  | "patient"
  | "waitlist_fill"
  | "cancellation_recovery"
  | "insurance"
  | "household_expansion";

export type Department =
  | "practice"
  | "doctor"
  | "front_desk"
  | "hygiene"
  | "assistant"
  | "office_manager"
  | "patient_access";

export type MetricTrend = "up" | "down" | "flat" | "unknown";

export type MetricHealth = "healthy" | "warning" | "critical" | "insufficient_data";

/** Evidence citation — inspectable provenance without PHI in aggregate logs. */
export interface EvidenceItem {
  /** Source class: call_summary, schedule_event, memory_pattern, metric, office_dna */
  source: string;
  /** Human-readable description for team-facing UI */
  description: string;
  /** Internal reference (callId, slotId) — never log with PHI in production aggregates */
  referenceId?: string;
  /** Optional atom/DNA path for Knowledge Engine provenance */
  provenance?: string;
  /** When this evidence was observed */
  observedAt: ISOTimestamp;
}

/**
 * Explainable recommendation contract (POS §25, CLE §18).
 * Every recommendation MUST populate all fields — validated at orchestrator boundary.
 */
export interface Recommendation {
  id: string;
  practiceId: PracticeId;
  category: RecommendationCategory;
  /** What to do — actionable, concise */
  recommendation: string;
  /** Why — plain language "because" */
  reason: string;
  evidence: EvidenceItem[];
  confidence: Confidence;
  priority: RecommendationPriority;
  owner: OwnerRole;
  expectedOutcome: string;
  /** Optional expiry — stale recommendations auto-close (POS §25.1) */
  expiresAt?: ISOTimestamp;
  /** Links to detected opportunity if applicable */
  opportunityId?: string;
  /** Constitutional / DNA compliance marker */
  provenance: {
    engineVersion: string;
    generatedAt: ISOTimestamp;
    officeDnaVersion?: string;
  };
}

export interface Opportunity {
  id: string;
  practiceId: PracticeId;
  type: OpportunityType;
  title: string;
  description: string;
  evidence: EvidenceItem[];
  confidence: Confidence;
  suggestedOwner: OwnerRole;
  /** Estimated value proxy — manager-validated in production; not patient-facing */
  estimatedImpact?: "high" | "medium" | "low";
  detectedAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
  /** Emotional context flags from EIE — informs retention/complaint routing */
  emotionalContext?: {
    flags: string[];
    note?: string;
  };
}

export interface KPIValue {
  id: string;
  name: string;
  department: Department;
  value: number;
  unit: string;
  target?: number;
  targetDirection?: "up" | "down";
  trend: MetricTrend;
  health: MetricHealth;
  /** Comparison window label, e.g. "vs. prior day" */
  comparisonLabel?: string;
  asOf: ISOTimestamp;
}

export interface DepartmentMetrics {
  department: Department;
  kpis: KPIValue[];
}

export interface PracticeMetricsSnapshot {
  practiceId: PracticeId;
  asOf: ISOTimestamp;
  departments: DepartmentMetrics[];
  /** Stewardship highlight — one metric improved (POS Morning Brief §12.2) */
  stewardshipHighlight?: string;
}

/** Resolved Office DNA snapshot reference — full DNA lives in Knowledge Engine L3. */
export interface OfficeDnaSnapshot {
  practiceId: PracticeId;
  configVersion: string;
  practiceName: string;
  timezone: string;
  /** First patient appointment time today (HH:mm) */
  firstPatientTime?: string;
  /** Morning brief delivery offset minutes before first patient */
  morningBriefLeadMinutes: number;
  enabledOpportunityCategories: OpportunityType[];
  /** On-call callback SLA from Emergency Policy DNA */
  callbackSlaMinutes: number;
  /** Max recommendations per role per day — Practice Culture DNA restraint */
  maxRecommendationsPerRole: Partial<Record<OwnerRole, number>>;
}

export interface CallSummarySignal {
  callId: string;
  practiceId: PracticeId;
  intent: string;
  urgency?: "routine" | "urgent" | "emergency";
  receivedAt: ISOTimestamp;
  afterHours: boolean;
  sameDayEmergency?: boolean;
  appointmentType?: string;
  insuranceProgram?: string;
  emotionalFlags?: string[];
  completenessScore: number;
  /** Required fields missing per CALL_FLOWS — drives quality metrics */
  missingFields?: string[];
  patientReferenceId?: string;
}

export interface ScheduleSlotSignal {
  slotId: string;
  practiceId: PracticeId;
  date: string;
  startTime: string;
  durationMinutes: number;
  column: "doctor" | "hygiene" | "assistant";
  appointmentType?: string;
  status: "scheduled" | "open" | "cancelled" | "blocked";
  providerId?: string;
}

export interface RecallSignal {
  patientReferenceId: string;
  practiceId: PracticeId;
  recallType: string;
  daysOverdue: number;
  scheduledToday?: boolean;
}

export interface RiskFlag {
  id: string;
  practiceId: PracticeId;
  type:
    | "emergency_follow_up"
    | "billing_escalation"
    | "complaint"
    | "integration_degraded"
    | "dna_stale"
    | "schedule_conflict";
  severity: RecommendationPriority;
  description: string;
  owner: OwnerRole;
  createdAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
}

/**
 * Daily Practice Awareness — continuous situational model (POS §11).
 * FUTURE: Event-sourced rebuild from PMS webhooks + call stream at scale.
 */
export interface DailyAwarenessState {
  practiceId: PracticeId;
  date: string;
  lastRefreshedAt: ISOTimestamp;
  officeDna: OfficeDnaSnapshot;
  /** Overnight and same-day call signals */
  callStream: CallSummarySignal[];
  /** Mock schedule until PMS adapter — honest gaps when unavailable */
  scheduleSlots: ScheduleSlotSignal[];
  recallPosture: RecallSignal[];
  riskFlags: RiskFlag[];
  /** Open opportunities not yet acted on */
  opportunityQueue: Opportunity[];
  /** Integration health — degrades visibly when PMS unreachable */
  pmsAvailable: boolean;
  /** Peak call rate indicator for live awareness */
  callSurgeActive: boolean;
}

export interface MemoryPattern {
  id: string;
  category: string;
  description: string;
  confidence: Confidence;
  sampleSize: number;
  lastObservedAt: ISOTimestamp;
}

export interface RecommendationFeedback {
  recommendationId: string;
  status: "accepted" | "dismissed" | "snoozed" | "implemented";
  recordedAt: ISOTimestamp;
  reason?: string;
}

/**
 * Long-term practice memory (POS §27, CLE §26).
 * FUTURE: Persist to practice_memory table with retention policies per category.
 */
export interface PracticeMemorySnapshot {
  practiceId: PracticeId;
  asOf: ISOTimestamp;
  operationalPatterns: MemoryPattern[];
  seasonalBaselines: MemoryPattern[];
  recommendationHistory: RecommendationFeedback[];
  /** DNA validation metadata */
  dnaLastValidatedAt?: ISOTimestamp;
  dnaFreshnessDays?: number;
}

export interface MorningBriefSection {
  id: string;
  title: string;
  items: MorningBriefItem[];
  owner: OwnerRole;
  priority: RecommendationPriority;
}

export interface MorningBriefItem {
  id: string;
  summary: string;
  detail?: string;
  confidence?: Confidence;
  actionRequired: boolean;
  owner: OwnerRole;
  relatedRecommendationId?: string;
}

/** Doctor-facing Morning Brief (POS §12). */
export interface MorningBrief {
  practiceId: PracticeId;
  practiceName: string;
  generatedAt: ISOTimestamp;
  targetDeliveryAt: ISOTimestamp;
  date: string;
  sections: MorningBriefSection[];
  /** Top prioritized recommendations for the day */
  topRecommendations: Recommendation[];
  metricsHighlight: PracticeMetricsSnapshot;
  /** Stewardship framing — yesterday's win */
  stewardshipNote: string;
  /** Scannable in ≤3 minutes — item count guardrail */
  estimatedReadMinutes: number;
}

export interface PracticeBrainRunResult {
  practiceId: PracticeId;
  runAt: ISOTimestamp;
  awareness: DailyAwarenessState;
  memory: PracticeMemorySnapshot;
  metrics: PracticeMetricsSnapshot;
  opportunities: Opportunity[];
  recommendations: Recommendation[];
  morningBrief: MorningBrief;
}

/** Module dependency injection contracts — enables testing and future microservice split. */

export interface IPracticeMemory {
  getSnapshot(practiceId: PracticeId): PracticeMemorySnapshot;
  recordPattern(
    practiceId: PracticeId,
    pattern: Omit<MemoryPattern, "id">
  ): void;
  recordRecommendationFeedback(
    practiceId: PracticeId,
    feedback: RecommendationFeedback
  ): void;
  /** FUTURE: Async persistence, encryption at rest, export for practice data rights */
}

export interface IDailyAwareness {
  getState(practiceId: PracticeId, date?: string): DailyAwarenessState;
  refresh(practiceId: PracticeId, date?: string): DailyAwarenessState;
  ingestCallSummary(summary: CallSummarySignal): void;
  /** FUTURE: ingestScheduleEvent, ingestCancellation from PMS webhooks */
}

export interface IPracticeMetrics {
  computeSnapshot(
    practiceId: PracticeId,
    awareness: DailyAwarenessState,
    memory: PracticeMemorySnapshot
  ): PracticeMetricsSnapshot;
  /** FUTURE: Historical time series, benchmark vs. regional L2 aggregates (opt-in) */
}

export interface IOpportunityDetector {
  detect(
    awareness: DailyAwarenessState,
    memory: PracticeMemorySnapshot,
    metrics: PracticeMetricsSnapshot
  ): Opportunity[];
}

export interface IRecommendationEngine {
  generate(
    opportunities: Opportunity[],
    awareness: DailyAwarenessState,
    memory: PracticeMemorySnapshot,
    metrics: PracticeMetricsSnapshot
  ): Recommendation[];
}

export interface IMorningBriefGenerator {
  generate(input: {
    awareness: DailyAwarenessState;
    memory: PracticeMemorySnapshot;
    metrics: PracticeMetricsSnapshot;
    recommendations: Recommendation[];
  }): MorningBrief;
}

export interface IOfficeDnaProvider {
  getSnapshot(practiceId: PracticeId): OfficeDnaSnapshot;
  /** FUTURE: Resolve from Knowledge Engine L3 via config-service */
}
