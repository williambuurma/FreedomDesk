/**
 * Hybrid Conversational Aly — planner decides the best next conversational move
 * among deterministic allowed actions. Never invents disallowed actions.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import type { LiveCallSession } from "./callSession.ts";
import {
  buildConversationOptions,
  deterministicSpeechForAction,
  type ConversationOptions,
  type ConversationalAction,
} from "./allowedActions.ts";
import { inferCallStage } from "./conversationStages.ts";

export interface PlannerProposal {
  /** What the patient just communicated (one short sentence). */
  understanding: string;
  emotionalResponseNeeded: boolean;
  selectedAction: ConversationalAction | string;
  spokenResponse: string;
  whyThisAction: string;
  shouldRecapProgress: boolean;
  shouldClose: boolean;
  /** @deprecated Prefer understanding; kept for compat / traces. */
  acknowledgment: string;
  factsUnderstood: string[];
  tone: string;
  /** @deprecated Prefer whyThisAction. */
  reason: string;
}

export interface PlannerContext {
  latestUtterance: string;
  /** Compact recent turns — truncated, last 3 only. */
  recentTurns: Array<{ speaker: string; text: string }>;
  options: ConversationOptions;
  callStage: string;
  /** Semantic facts from the turn interpreter. */
  semanticFacts?: Record<string, unknown> | null;
  /** Confirmed / high-status provenance keys. */
  confirmedFacts?: string[];
  /** Previous Aly action. */
  previousAction?: string | null;
  /** Loop / repetition state summary. */
  repetition?: {
    lastActions: string[];
    suppressActions: string[];
    recoverySpeech: string | null;
  } | null;
  /** Emotional cues from semantic + tone. */
  emotionalCues?: string[];
  /** Requested outcome summary. */
  requestedOutcome?: string | null;
}

export interface PlanConversationalOptions {
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  planFn?: (context: PlannerContext) => Promise<PlannerProposal>;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 2500;

export function isHybridConversationalEnabled(): boolean {
  const flag = (process.env.HYBRID_CONVERSATIONAL_ALY || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return Boolean((process.env.OPENAI_API_KEY || "").trim());
}

export function plannerTimeoutMs(override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  const raw = Number(process.env.HYBRID_ALY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export function resolvePlannerModel(override?: string): string {
  return (
    (
      override ||
      process.env.OPENAI_PLANNER_MODEL ||
      process.env.OPENAI_MODEL ||
      DEFAULT_MODEL
    ).trim() || DEFAULT_MODEL
  );
}

function truncate(text: string, max: number): string {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildPlannerContext(
  session: LiveCallSession,
  analysis: ConversationAnalysis,
  options: ConversationOptions
): PlannerContext {
  const latest =
    [...session.turns]
      .reverse()
      .find((t) => t.speaker === "patient" || t.speaker === "caller")?.text ||
    "";

  const sem = session.lastSemanticInterpretation;
  const confirmedFacts: string[] = [];
  if (options.factsConfirmed.lastName) confirmedFacts.push("lastName");
  if (options.factsConfirmed.location) confirmedFacts.push("location");
  if (options.factsCaptured.swellingKnown) confirmedFacts.push("swelling");
  if (typeof options.factsCaptured.wantsEarliest === "boolean") {
    confirmedFacts.push("wantsEarliest");
  }
  if (typeof options.factsCaptured.shortNoticeOk === "boolean") {
    confirmedFacts.push("shortNoticeOk");
  }

  const emotionalCues = [
    ...(sem?.emotions || []),
    ...(sem?.conversationSignals.callerIsFrustrated ? ["frustrated"] : []),
  ];

  let requestedOutcome: string | null = null;
  if (session.slots.wantsEarliest === true) {
    requestedOutcome = "earliest_available";
  } else if (options.factsCaptured.outcomeCaptured) {
    requestedOutcome = "outcome_captured";
  }

  return {
    latestUtterance: truncate(latest, 180),
    recentTurns: session.turns.slice(-3).map((t) => ({
      speaker: t.speaker === "agent" || t.speaker === "aly" ? "aly" : "caller",
      text: truncate(t.text, 90),
    })),
    options: {
      ...options,
      firstNameHint: options.firstNameHint,
      lastNameSpellingHint: options.lastNameSpellingHint,
      locationHint: options.locationHint,
    },
    callStage: inferCallStage(session, options),
    semanticFacts: sem
      ? {
          intent: sem.intent,
          facts: sem.facts,
          confirmation: sem.confirmation,
          corrections: sem.corrections,
          uncertainty: sem.uncertainty,
          refusals: sem.refusals,
          signals: sem.conversationSignals,
        }
      : null,
    confirmedFacts,
    previousAction: session.lastSelectedAction || null,
    repetition: session.loopState
      ? {
          lastActions: [...session.loopState.lastActions],
          suppressActions: [...session.loopState.suppressActions],
          recoverySpeech: session.loopState.recoverySpeech,
        }
      : null,
    emotionalCues,
    requestedOutcome,
  };
}

/** Compact JSON payload — no speech templates, no duplicated drafts. */
export function buildPlannerUserPayload(context: PlannerContext): object {
  const o = context.options;
  return {
    stage: context.callStage,
    latest: context.latestUtterance,
    turns: context.recentTurns,
    semantic: context.semanticFacts || null,
    facts: o.factsCaptured,
    confirmed: context.confirmedFacts || o.factsConfirmed,
    missing: o.missingMaterialFacts,
    previousAction: context.previousAction || null,
    repetition: context.repetition || null,
    emotions: context.emotionalCues || [],
    requestedOutcome: context.requestedOutcome || null,
    urgency: o.urgency,
    actionable: o.actionable,
    dentalPain: o.dentalPain,
    hard: o.hardRequiredAction,
    allowed: o.allowedActions,
    hints: {
      first: o.firstNameHint,
      spell: o.lastNameSpellingHint,
      loc: o.locationHint,
      spellLow: o.spellingLowConfidence || undefined,
    },
  };
}

/**
 * Planner job: best next conversational move — not “next missing DB field.”
 * Must still answer via selectedAction ∈ allowed.
 */
export function buildPlannerSystemPrompt(): string {
  return [
    "You are Aly, a calm Midwest dental front-desk phone assistant.",
    "Decide the single best next conversational move from allowed actions.",
    "Use semantic facts and confirmed facts — do not infer facts solely from a fixed question sequence.",
    "For each turn answer internally:",
    "1) What did the patient just communicate?",
    "2) What emotion should Aly acknowledge, if any?",
    "3) What information is materially missing?",
    "4) Does another question change the practice next action?",
    "5) What is the single best next move?",
    "6) Can Aly recap progress instead of asking another question?",
    "7) Is the call actionable now?",
    "Stages: understand (hear them + identity) → clarify (only material facts) → resolve (recap + close).",
    "Do not clinically interview. No pain scores, onset grilling, eating, insurance, or DOB.",
    "Facts already known/confirmed must not be re-asked.",
    "If repetition.suppressActions lists an action, never select it.",
    "Prefer one natural spoken turn. Combined scheduling/location actions may cover two facts in one question.",
    "Respond to worry or frustration when present — do not force empathy every turn, and never fake enthusiasm during pain.",
    "Occasionally explain progress when moving stages — not after every answer.",
    "Never say the word truly. Never diagnose, invent availability, guarantee appointments, or claim insurance verified.",
    "Never claim a message was saved. persist_and_close only if actionable. emergency_escalation cannot be softened.",
    "Return JSON only:",
    '{"understanding":"","emotionalResponseNeeded":false,"selectedAction":"","spokenResponse":"","whyThisAction":"","shouldRecapProgress":false,"shouldClose":false}',
  ].join(" ");
}

export function parsePlannerProposal(raw: unknown): PlannerProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const selectedAction = String(o.selectedAction ?? "").trim();
  const understanding = String(o.understanding ?? "").trim();
  const acknowledgment = String(o.acknowledgment ?? "").trim();
  const spokenResponse = String(
    o.spokenResponse ?? o.nextQuestion ?? ""
  ).trim();
  const whyThisAction = String(o.whyThisAction ?? o.reason ?? "").trim();
  const reason = whyThisAction;
  const tone = String(o.tone ?? "warm_concerned").trim() || "warm_concerned";
  const factsUnderstood = Array.isArray(o.factsUnderstood)
    ? o.factsUnderstood.map((f) => String(f).trim()).filter(Boolean).slice(0, 8)
    : [];

  const emotionalResponseNeeded = Boolean(
    o.emotionalResponseNeeded === true ||
      (understanding && /worried|pain|hurt|afraid|concern/i.test(understanding))
  );
  const shouldRecapProgress = Boolean(o.shouldRecapProgress);
  const shouldClose = Boolean(o.shouldClose);

  if (!selectedAction) return null;
  if (
    !spokenResponse &&
    selectedAction !== "persist_and_close" &&
    selectedAction !== "emergency_escalation"
  ) {
    return null;
  }

  return {
    understanding: understanding || acknowledgment,
    emotionalResponseNeeded,
    selectedAction,
    spokenResponse: spokenResponse || acknowledgment,
    whyThisAction,
    shouldRecapProgress,
    shouldClose,
    acknowledgment: acknowledgment || understanding,
    factsUnderstood,
    tone,
    reason,
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("planner_json_parse_failed");
  }
}

export async function callOpenAiPlanner(
  context: PlannerContext,
  options: PlanConversationalOptions = {}
): Promise<PlannerProposal> {
  const apiKey = (options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("planner_missing_api_key");

  const model = resolvePlannerModel(options.model);
  const timeoutMs = plannerTimeoutMs(options.timeoutMs);
  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 180,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "planner_proposal",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "understanding",
                "emotionalResponseNeeded",
                "selectedAction",
                "spokenResponse",
                "whyThisAction",
                "shouldRecapProgress",
                "shouldClose",
              ],
              properties: {
                understanding: { type: "string" },
                emotionalResponseNeeded: { type: "boolean" },
                selectedAction: { type: "string" },
                spokenResponse: { type: "string" },
                whyThisAction: { type: "string" },
                shouldRecapProgress: { type: "boolean" },
                shouldClose: { type: "boolean" },
              },
            },
          },
        },
        messages: [
          { role: "system", content: buildPlannerSystemPrompt() },
          {
            role: "user",
            content: JSON.stringify(buildPlannerUserPayload(context)),
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`planner_http_${res.status}`);
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("planner_empty_content");
    const parsed = parsePlannerProposal(extractJsonObject(content));
    if (!parsed) throw new Error("planner_invalid_shape");
    // Soft strip forbidden filler if the model slips.
    if (/\btruly\b/i.test(parsed.spokenResponse)) {
      parsed.spokenResponse = parsed.spokenResponse
        .replace(/\btruly\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export async function planConversationalResponse(
  context: PlannerContext,
  options: PlanConversationalOptions = {}
): Promise<PlannerProposal> {
  if (options.planFn) return options.planFn(context);
  return callOpenAiPlanner(context, options);
}

export function fallbackProposalForOptions(
  session: LiveCallSession,
  options: ConversationOptions
): PlannerProposal {
  let action =
    options.hardRequiredAction ||
    options.fallbackPriority.find((a) => a !== "acknowledge_and_recap") ||
    options.allowedActions[0] ||
    null;

  // Empty allow-list after loop suppression — soft-complete and progress.
  if (!action) {
    const suppressed = session.loopState?.suppressActions || [];
    if (
      session.slots.nameCaptured &&
      !session.slots.lastNameConfirmed &&
      !session.slots.spellingAbandoned
    ) {
      session.slots.spellingAbandoned = true;
      session.slots.spellingAbandonNeedsAnnounce = true;
      if (!session.slots.teamFlags) session.slots.teamFlags = [];
      if (!session.slots.teamFlags.includes("last_name_spelling_needs_confirmation")) {
        session.slots.teamFlags.push("last_name_spelling_needs_confirmation");
      }
    }
    if (
      typeof session.slots.wantsEarliest !== "boolean" &&
      suppressed.includes("ask_combined_scheduling_preference")
    ) {
      session.slots.wantsEarliest = true;
      session.slots.shortNoticeOk = false;
      session.slots.outcomeCaptured = true;
      if (!session.slots.teamFlags) session.slots.teamFlags = [];
      if (!session.slots.teamFlags.includes("scheduling_preference_needs_confirmation")) {
        session.slots.teamFlags.push("scheduling_preference_needs_confirmation");
      }
    }
    if (options.actionable || typeof session.slots.wantsEarliest === "boolean") {
      action = "persist_and_close";
    } else if (
      typeof session.slots.swelling !== "boolean" &&
      !suppressed.includes("ask_swelling")
    ) {
      action = "ask_swelling";
    } else {
      action = "acknowledge_and_recap";
    }
  }

  const spoken = deterministicSpeechForAction(action, session, options);
  return {
    understanding: "Deterministic fallback — planner unavailable.",
    emotionalResponseNeeded: false,
    selectedAction: action,
    spokenResponse: spoken,
    whyThisAction: "deterministic_fallback",
    shouldRecapProgress: action === "acknowledge_and_recap",
    shouldClose: action === "persist_and_close",
    acknowledgment: "",
    factsUnderstood: [],
    tone: session.tone,
    reason: "deterministic_fallback",
  };
}

/** Test helper */
export function proposalChoosing(
  action: ConversationalAction,
  spokenResponse: string,
  overrides: Partial<PlannerProposal> = {}
): PlannerProposal {
  return {
    understanding: overrides.understanding || "",
    emotionalResponseNeeded: overrides.emotionalResponseNeeded ?? false,
    selectedAction: action,
    acknowledgment: overrides.acknowledgment || "",
    spokenResponse,
    whyThisAction: overrides.whyThisAction || overrides.reason || "test",
    shouldRecapProgress: overrides.shouldRecapProgress ?? false,
    shouldClose: overrides.shouldClose ?? action === "persist_and_close",
    factsUnderstood: overrides.factsUnderstood || [],
    tone: overrides.tone || "warm_concerned",
    reason: overrides.reason || overrides.whyThisAction || "test",
  };
}

export { buildConversationOptions };
