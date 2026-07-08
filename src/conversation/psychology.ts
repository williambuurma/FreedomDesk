/**
 * Psychology Brain — emotional state and tone shaping only.
 *
 * Question (see docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md):
 *   "What is the caller's emotional state, and how should that shape the response?"
 *
 * Owns:
 *   - Emotion detection (anxious, frustrated, confused, embarrassed, pain-driven)
 *   - Fear and dental-anxiety signals
 *   - Frustration from prior bad experiences, hold times, billing disputes
 *   - Tone adjustment: reassure first, slow down, validate, defer admin questions
 *
 * Does not own:
 *   - Clinical urgency or red flags (triage.ts)
 *   - Symptom extraction (understanding.ts)
 *   - Scheduling, insurance, pediatric intent, or practice retention (front desk / business)
 *   - Final goal selection (engine.ts)
 *
 * Deterministic rules with stable IDs — every output is explainable in audits.
 * No LLM calls. No cross-brain imports; engine.ts orchestrates.
 */

import type { ReasoningFact, StageReasoning } from "./reasoning/types.ts";

/** Caller emotion label for this turn. */
export type PsychologyEmotion =
  | "unknown"
  | "anxious"
  | "embarrassed"
  | "frustrated"
  | "confused"
  | "pain"
  | "dental_anxiety";

/** Emotional burden on the caller — not clinical severity or triage level. */
export type EmotionalBurden = "none" | "low" | "moderate" | "high";

/**
 * Primary actionable output: how the next response should be shaped.
 * Response wording is generated elsewhere; this is strategy only.
 */
export type ToneStrategy =
  | "standard"
  | "validate_first"
  | "reassure_before_admin"
  | "acknowledge_frustration"
  | "clarify_gently"
  | "acknowledge_distress";

/** Recommended conversational pace for the next turn. */
export type PsychologyPace = "normal" | "slow" | "unhurried";

export interface PsychologyAnalysis {
  emotion: PsychologyEmotion;
  emotionalBurden: EmotionalBurden;
  toneStrategy: ToneStrategy;
  pace: PsychologyPace;
  /** When true, engine should acknowledge emotion before insurance/scheduling questions. */
  deferAdminQuestions: boolean;
  /** Human-readable audit trail — one entry per matched rule. */
  reasons: string[];
  /** Stable rule IDs that fired, for explainability and tests. */
  matchedRules: string[];
  /** Confidence in this assessment (0–1). No match → 0. */
  confidence: number;
}

export interface PsychologyResult {
  output: PsychologyAnalysis;
  reasoning: StageReasoning<
    {
      emotion: PsychologyEmotion;
      toneStrategy: ToneStrategy;
      deferAdminQuestions: boolean;
    },
    Pick<
      PsychologyAnalysis,
      "emotion" | "toneStrategy" | "emotionalBurden" | "deferAdminQuestions"
    >
  >;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

interface PsychologyRule {
  id: string;
  phrases: string[];
  emotion: PsychologyEmotion;
  weight: number;
  emotionalBurden: EmotionalBurden;
  toneStrategy: ToneStrategy;
  pace: PsychologyPace;
  deferAdminQuestions: boolean;
  reason: string;
}

const PSYCHOLOGY_RULES: PsychologyRule[] = [
  {
    id: "PSY_SCARED",
    phrases: ["i'm scared", "im scared", "i am scared", "so scared", "terrified"],
    emotion: "anxious",
    weight: 10,
    emotionalBurden: "high",
    toneStrategy: "reassure_before_admin",
    pace: "slow",
    deferAdminQuestions: true,
    reason: "Caller expressed fear.",
  },
  {
    id: "PSY_EMBARRASSED",
    phrases: [
      "i'm embarrassed",
      "im embarrassed",
      "i am embarrassed",
      "so embarrassed",
      "ashamed",
    ],
    emotion: "embarrassed",
    weight: 9,
    emotionalBurden: "moderate",
    toneStrategy: "validate_first",
    pace: "unhurried",
    deferAdminQuestions: true,
    reason: "Caller expressed embarrassment.",
  },
  {
    id: "PSY_DENTAL_ANXIETY",
    phrases: [
      "i hate the dentist",
      "hate the dentist",
      "hate going to the dentist",
      "afraid of the dentist",
      "scared of the dentist",
      "dental phobia",
    ],
    emotion: "dental_anxiety",
    weight: 9,
    emotionalBurden: "moderate",
    toneStrategy: "reassure_before_admin",
    pace: "slow",
    deferAdminQuestions: true,
    reason: "Caller expressed dental anxiety.",
  },
  {
    id: "PSY_APOLOGETIC",
    phrases: [
      "i'm sorry to bother you",
      "im sorry to bother you",
      "sorry to bother",
      "didn't mean to bother",
      "hope i'm not bothering",
    ],
    emotion: "anxious",
    weight: 7,
    emotionalBurden: "low",
    toneStrategy: "validate_first",
    pace: "unhurried",
    deferAdminQuestions: true,
    reason: "Caller is apologetic and may need reassurance they are welcome.",
  },
  {
    id: "PSY_FRUSTRATED_HOLD",
    phrases: [
      "i've been calling all day",
      "ive been calling all day",
      "calling all day",
      "been calling for hours",
      "on hold forever",
      "on hold for",
    ],
    emotion: "frustrated",
    weight: 8,
    emotionalBurden: "moderate",
    toneStrategy: "acknowledge_frustration",
    pace: "normal",
    deferAdminQuestions: true,
    reason: "Caller expressed frustration with reaching the office.",
  },
  {
    id: "PSY_FRUSTRATED_CALLBACK",
    phrases: [
      "nobody called me back",
      "no one called me back",
      "never called me back",
      "didn't call me back",
      "didnt call me back",
      "still waiting for a call",
      "never heard back",
      "no callback",
    ],
    emotion: "frustrated",
    weight: 9,
    emotionalBurden: "moderate",
    toneStrategy: "acknowledge_frustration",
    pace: "normal",
    deferAdminQuestions: true,
    reason: "Caller expressed frustration about a missed callback.",
  },
  {
    id: "PSY_CONFUSED_UNCERTAIN",
    phrases: [
      "i don't know what to do",
      "i dont know what to do",
      "don't know what to do",
      "dont know what to do",
      "not sure what to do",
      "what should i do",
    ],
    emotion: "confused",
    weight: 8,
    emotionalBurden: "moderate",
    toneStrategy: "clarify_gently",
    pace: "slow",
    deferAdminQuestions: true,
    reason: "Caller expressed uncertainty about next steps.",
  },
  {
    id: "PSY_CONFUSED_LANGUAGE",
    phrases: [
      "i don't understand",
      "i dont understand",
      "don't understand",
      "dont understand",
      "confused about",
      "doesn't make sense",
      "doesnt make sense",
    ],
    emotion: "confused",
    weight: 8,
    emotionalBurden: "low",
    toneStrategy: "clarify_gently",
    pace: "slow",
    deferAdminQuestions: false,
    reason: "Caller expressed confusion and may need simpler explanations.",
  },
  {
    id: "PSY_PAIN_DISTRESS",
    phrases: [
      "i can't sleep",
      "i cant sleep",
      "can't sleep",
      "cant sleep",
      "keeps me up",
      "up all night",
    ],
    emotion: "pain",
    weight: 8,
    emotionalBurden: "high",
    toneStrategy: "acknowledge_distress",
    pace: "slow",
    deferAdminQuestions: true,
    reason: "Caller described distress from ongoing discomfort.",
  },
  {
    id: "PSY_ANXIOUS",
    phrases: ["nervous", "worried", "anxious", "anxiety"],
    emotion: "anxious",
    weight: 6,
    emotionalBurden: "moderate",
    toneStrategy: "reassure_before_admin",
    pace: "slow",
    deferAdminQuestions: true,
    reason: "Caller expressed anxiety.",
  },
];

const BURDEN_RANK: Record<EmotionalBurden, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

const PACE_RANK: Record<PsychologyPace, number> = {
  normal: 0,
  slow: 1,
  unhurried: 2,
};

const UNKNOWN_ANALYSIS: PsychologyAnalysis = {
  emotion: "unknown",
  emotionalBurden: "none",
  toneStrategy: "standard",
  pace: "normal",
  deferAdminQuestions: false,
  reasons: [],
  matchedRules: [],
  confidence: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

function maxBurden(
  current: EmotionalBurden,
  candidate: EmotionalBurden
): EmotionalBurden {
  return BURDEN_RANK[candidate] > BURDEN_RANK[current] ? candidate : current;
}

function slowestPace(
  current: PsychologyPace,
  candidate: PsychologyPace
): PsychologyPace {
  return PACE_RANK[candidate] > PACE_RANK[current] ? candidate : current;
}

function computeConfidence(matched: PsychologyRule[]): number {
  if (matched.length === 0) {
    return 0;
  }

  const topWeight = Math.max(...matched.map((rule) => rule.weight));
  const signalStrength = Math.min(1, topWeight / 10);
  const breadth = Math.min(1, matched.length / 3);
  return Math.round((0.5 + signalStrength * 0.35 + breadth * 0.15) * 100) / 100;
}

function fact(
  id: string,
  description: string,
  value: unknown,
  source: string
): ReasoningFact {
  return { id, description, value, source };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assess caller emotional state and tone strategy for one message.
 *
 * Conversation history merging belongs in engine.ts. This function stays pure
 * and testable per utterance.
 */
export function assessEmotionWithReasoning(message: string): PsychologyResult {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    const output = { ...UNKNOWN_ANALYSIS };
    return {
      output,
      reasoning: {
        stage: "Psychology",
        inputs: { messageLength: 0 },
        facts: [fact("FACT_EMPTY_MESSAGE", "No patient text to assess", true, "input")],
        rulesFired: [],
        decision: {
          emotion: output.emotion,
          toneStrategy: output.toneStrategy,
          deferAdminQuestions: output.deferAdminQuestions,
        },
        confidence: 0,
        rationale: ["Empty message — default to standard tone"],
        output: {
          emotion: output.emotion,
          toneStrategy: output.toneStrategy,
          emotionalBurden: output.emotionalBurden,
          deferAdminQuestions: output.deferAdminQuestions,
        },
      },
    };
  }

  const matched = PSYCHOLOGY_RULES.filter((rule) =>
    rule.phrases.some((phrase) => normalized.includes(phrase))
  );

  if (matched.length === 0) {
    const output = { ...UNKNOWN_ANALYSIS };
    return {
      output,
      reasoning: {
        stage: "Psychology",
        inputs: { messageLength: normalized.length },
        facts: [
          fact("FACT_MESSAGE", "Normalized patient text length", normalized.length, "input"),
        ],
        rulesFired: [
          {
            ruleId: "PSY_DEFAULT_UNKNOWN",
            description: "No psychology rule matched — standard tone",
          },
        ],
        decision: {
          emotion: output.emotion,
          toneStrategy: output.toneStrategy,
          deferAdminQuestions: output.deferAdminQuestions,
        },
        confidence: 0,
        rationale: ["No emotional signal detected"],
        output: {
          emotion: output.emotion,
          toneStrategy: output.toneStrategy,
          emotionalBurden: output.emotionalBurden,
          deferAdminQuestions: output.deferAdminQuestions,
        },
      },
    };
  }

  const sorted = [...matched].sort((a, b) => b.weight - a.weight);
  const primary = sorted[0];

  let emotionalBurden: EmotionalBurden = "none";
  let pace: PsychologyPace = "normal";
  let deferAdminQuestions = false;

  for (const rule of matched) {
    emotionalBurden = maxBurden(emotionalBurden, rule.emotionalBurden);
    pace = slowestPace(pace, rule.pace);
    deferAdminQuestions = deferAdminQuestions || rule.deferAdminQuestions;
  }

  const output: PsychologyAnalysis = {
    emotion: primary.emotion,
    emotionalBurden,
    toneStrategy: primary.toneStrategy,
    pace,
    deferAdminQuestions,
    reasons: matched.map((rule) => rule.reason),
    matchedRules: matched.map((rule) => rule.id),
    confidence: computeConfidence(matched),
  };

  return {
    output,
    reasoning: {
      stage: "Psychology",
      inputs: { messageLength: normalized.length },
      facts: [
        fact("FACT_MESSAGE", "Normalized patient text length", normalized.length, "input"),
        fact("FACT_PRIMARY_EMOTION", "Primary emotion from highest-weight rule", primary.emotion, primary.id),
        fact("FACT_MATCH_COUNT", "Psychology rules matched", matched.length, "PSYCHOLOGY_RULES"),
      ],
      rulesFired: matched.map((rule) => ({
        ruleId: rule.id,
        description: rule.reason,
        weight: rule.weight,
      })),
      decision: {
        emotion: output.emotion,
        toneStrategy: output.toneStrategy,
        deferAdminQuestions: output.deferAdminQuestions,
      },
      confidence: output.confidence,
      rationale: output.reasons,
      output: {
        emotion: output.emotion,
        toneStrategy: output.toneStrategy,
        emotionalBurden: output.emotionalBurden,
        deferAdminQuestions: output.deferAdminQuestions,
      },
    },
  };
}

export function assessEmotion(message: string): PsychologyAnalysis {
  return assessEmotionWithReasoning(message).output;
}
