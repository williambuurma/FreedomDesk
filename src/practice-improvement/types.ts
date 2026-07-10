/**
 * Practice Improvement Engine — shared contracts for the Universal Judgment Loop.
 *
 * Single objective for every observation: "Can I improve this practice?"
 * Pipeline: Observe → Understand → Detect Situation → Identify Opportunity or Risk
 *           → Evaluate Impact & Prioritize → Recommend Best Action → Explain Why
 *           → Track Outcome → Learn
 *
 * Authority: docs/INTELLIGENCE_MODEL.md, docs/ACTION_MODEL.md,
 * docs/OPERATING_INTELLIGENCE.md, docs/CONTINUOUS_LEARNING_ENGINE.md
 *
 * Non-goals: UI surfaces, PMS schedule/chart duplication, autonomous DNA changes.
 */

import type { Action } from "../actions/types.ts";
import type {
  OperationalEvent,
  OperationalEventEvidence,
  OperationalEventSubject,
  OperationalEventUncertainty,
  PracticeId,
  ISOTimestamp,
  UrgencyTier,
} from "../events/types.ts";
import type { OwnerRole } from "../practice-brain/types.ts";

export const IMPROVEMENT_ENGINE_VERSION = "practice-improvement-v1";

export const PRACTICE_IMPROVEMENT_OBJECTIVE = "Can I improve this practice?" as const;

/** Ordered pipeline stages — every domain runs through the same sequence. */
export type PipelineStage =
  | "observe"
  | "understand"
  | "detect_situation"
  | "identify_opportunity_or_risk"
  | "evaluate_impact"
  | "recommend"
  | "explain"
  | "track_outcome"
  | "learn";

/**
 * Intelligence domains that share this pipeline.
 * Domain modules assess; the engine judges and gates.
 */
export type IntelligenceDomain =
  | "operating"
  | "supply"
  | "owner"
  | "phone"
  | "practice_brain";

export type JudgmentDisposition = "action" | "recommend" | "defer" | "ignore";

export type ActionThreshold = "met" | "not_met";

export type ConfidenceTier = "high" | "moderate" | "low" | "insufficient";

export type ImpactLevel = "high" | "medium" | "low";

/**
 * Whether this deserves to interrupt attention.
 * none = stay quiet; queue = brief/later; notify = same-shift; interrupt = now.
 */
export type InterruptionTier = "none" | "queue" | "notify" | "interrupt";

/** Priority after impact evaluation — independent of domain heuristics. */
export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type OutcomeStatus =
  | "accepted"
  | "dismissed"
  | "snoozed"
  | "implemented"
  | "completed"
  | "expired"
  | "superseded";

export type LearningStage = "observation" | "pattern" | "candidate";

/** Grounded facts from Observe — event stream is the backbone. */
export interface Observation {
  events: OperationalEvent[];
  practiceId: PracticeId;
  observedAt: ISOTimestamp;
}

/** Interpret output — what the event means operationally. */
export interface Understanding {
  domain: IntelligenceDomain;
  eventId: string;
  practiceId: PracticeId;
  summary: string;
  intentHints: string[];
  urgencyTier: UrgencyTier;
  confidence: number;
  evidence: OperationalEventEvidence[];
  uncertainty: OperationalEventUncertainty;
  subject?: OperationalEventSubject;
  /** True when this looks like PMS schedule/chart mirroring — must stay silent. */
  pmsDuplicateRisk: boolean;
  notes: string[];
}

/** Detected practice-time situation (not a UI card). */
export interface Situation {
  id: string;
  practiceId: PracticeId;
  domain: IntelligenceDomain;
  kind: string;
  summary: string;
  subject?: OperationalEventSubject;
  evidence: OperationalEventEvidence[];
  confidence: number;
  detectedAt: ISOTimestamp;
  sourceEventIds: string[];
  tags: string[];
}

/**
 * Opportunity or risk identified against the practice-improvement objective.
 * `materialImprovement` is a domain hint; Evaluate Impact is authoritative for surfacing.
 */
export interface OpportunityOrRisk {
  id: string;
  practiceId: PracticeId;
  domain: IntelligenceDomain;
  kind: "opportunity" | "risk";
  title: string;
  description: string;
  situationId: string;
  confidence: number;
  estimatedImpact: ImpactLevel;
  evidence: OperationalEventEvidence[];
  suggestedOwner: OwnerRole;
  urgencyTier: UrgencyTier;
  /** Domain hint — does acting on this materially improve the practice? */
  materialImprovement: boolean;
  reasonMaterial: string;
  sourceEventIds: string[];
}

/**
 * Impact Evaluation and Prioritization — runs before Recommend.
 * Suppresses noise that does not meaningfully change a decision.
 */
export interface ImpactEvaluation {
  materialImprovement: boolean;
  /** Who should receive this — null means cannot route → suppress. */
  recipient: OwnerRole | null;
  interruption: InterruptionTier;
  priority: RecommendationPriority;
  /** Would surfacing this change what someone does next? */
  changesDecision: boolean;
  /** Final quiet-by-default gate for this stage. */
  shouldSurface: boolean;
  reasons: string[];
  /** Stable key for Action Registry dedupe hooks. */
  dedupeKey: string;
}

/**
 * Judgment Commitment — ACTION_MODEL §5.
 * Gates Action vs Recommendation vs silence.
 */
export interface Commitment {
  id: string;
  practiceId: PracticeId;
  domain: IntelligenceDomain;
  verb: string;
  object: string;
  because: string;
  primaryResponsibility: OwnerRole;
  urgencyTier: UrgencyTier;
  confidence: number;
  evidence: OperationalEventEvidence[];
  uncertainty: OperationalEventUncertainty;
  dueRule?: string;
  dependencies: string[];
  actionThreshold: ActionThreshold;
  opportunityOrRisk: "opportunity" | "risk";
  sourceEventIds: string[];
  situationId: string;
  opportunityOrRiskId: string;
}

/** Explain Why — Answer Contract subset for team-facing articulation. */
export interface Explanation {
  because: string;
  expectedOutcome: string;
  ifIgnored: string;
  evidence: OperationalEventEvidence[];
  /** Constitutional must-not-say reminders for Express. */
  mustNotSay: string[];
}

/** Surfaced improvement artifact — quiet by default; only when material. */
export interface ImprovementRecommendation {
  id: string;
  practiceId: PracticeId;
  domain: IntelligenceDomain;
  disposition: "action" | "recommend";
  decision: string;
  recommendedNextStep: string;
  explanation: Explanation;
  commitment: Commitment;
  confidence: number;
  urgencyTier: UrgencyTier;
  owner: OwnerRole;
  opportunityOrRiskId: string;
  sourceEventIds: string[];
  createdAt: ISOTimestamp;
  /** Present only when actionThreshold is met. */
  action?: Action;
  /** Impact evaluation that authorized surfacing — additive for decision quality. */
  impact?: ImpactEvaluation;
}

/** Track Outcome — feeds Learn; never invents PMS state. */
export interface Outcome {
  id: string;
  practiceId: PracticeId;
  recommendationId: string;
  actionId?: string;
  status: OutcomeStatus;
  recordedAt: ISOTimestamp;
  reason?: string;
  /** Human or measured signal: did this improve the practice? */
  improvedPractice?: boolean;
}

/** Learn signal — CLE confidence stages; no autonomous behavior change. */
export interface LearningSignal {
  id: string;
  practiceId: PracticeId;
  category: string;
  description: string;
  confidence: number;
  fromOutcomeId: string;
  stage: LearningStage;
  recordedAt: ISOTimestamp;
}

export interface PipelineStageTrace {
  stage: PipelineStage;
  disposition?: JudgmentDisposition;
  notes: string[];
}

export interface PipelineTrace {
  objective: typeof PRACTICE_IMPROVEMENT_OBJECTIVE;
  stages: PipelineStageTrace[];
}

/**
 * Result of one pipeline run over an observation (single event or cluster).
 * Silence is a first-class success: disposition ignore|defer with silencedReason.
 */
export interface ImprovementResult {
  practiceId: PracticeId;
  eventIds: string[];
  domain: IntelligenceDomain | null;
  disposition: JudgmentDisposition;
  observation: Observation;
  understanding: Understanding | null;
  situation: Situation | null;
  opportunityOrRisk: OpportunityOrRisk | null;
  /** Present once Evaluate Impact runs (including suppressions at that stage). */
  impactEvaluation: ImpactEvaluation | null;
  recommendation: ImprovementRecommendation | null;
  silencedReason?: string;
  trace: PipelineTrace;
}

/** Draft commitment from a domain module before engine gates. */
export interface CommitmentDraft {
  verb: string;
  object: string;
  because: string;
  primaryResponsibility: OwnerRole;
  urgencyTier: UrgencyTier;
  confidence: number;
  evidence: OperationalEventEvidence[];
  uncertainty: OperationalEventUncertainty;
  dueRule?: string;
  dependencies?: string[];
  recommendedNextStep: string;
  expectedOutcome: string;
  ifIgnored: string;
  decision?: string;
}

export interface PipelineContext {
  practiceId: PracticeId;
  now: ISOTimestamp;
  /** Optional open Actions for dedupe — Action Registry hook. */
  openActionKeys?: Set<string>;
}

export interface DomainAssessmentModule {
  readonly domain: IntelligenceDomain;
  accepts(event: OperationalEvent): boolean;
  understand(event: OperationalEvent, ctx: PipelineContext): Understanding;
  detectSituation(
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): Situation | null;
  identify(
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): OpportunityOrRisk | null;
  draftCommitment(
    item: OpportunityOrRisk,
    situation: Situation,
    understanding: Understanding,
    event: OperationalEvent,
    ctx: PipelineContext
  ): CommitmentDraft | null;
}
