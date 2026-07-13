/**
 * Hybrid Conversational Aly — response planner (expression layer only).
 * Deterministic policy still chooses the field / completion; this module
 * proposes spoken wording as structured JSON. No secrets; minimal PHI.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import type { LiveCallSession, NextAsk } from "./callSession.ts";
import { getIdentityState, patientText } from "./callSession.ts";
import { isLocationComplete } from "./toothLocation.ts";

export type PlannerTone =
  | "warm_concerned"
  | "calm_urgent"
  | "friendly_routine"
  | "emergency_direct";

export type ProposedAction =
  | "ask_name"
  | "ask_last_name_spell"
  | "confirm_last_name_spelling"
  | "ask_swelling"
  | "ask_fever"
  | "ask_breathing"
  | "ask_earliest"
  | "ask_short_notice"
  | "ask_phone"
  | "ask_location"
  | "close_call"
  | "other";

export interface PlannerProposal {
  acknowledgment: string;
  nextQuestion: string;
  reason: string;
  factsUnderstood: string[];
  proposedAction: ProposedAction | string;
  shouldClose: boolean;
  tone: PlannerTone | string;
}

export interface PlannerFactFlags {
  nameCaptured: boolean;
  lastNameSpellingCaptured: boolean;
  lastNameConfirmed: boolean;
  locationComplete: boolean;
  locationConfirmed: boolean;
  swellingKnown: boolean;
  feverKnown: boolean;
  breathingKnown: boolean;
  wantsEarliestKnown: boolean;
  shortNoticeKnown: boolean;
  keptAwake: boolean;
  worried: boolean;
}

export interface PlannerContext {
  latestUtterance: string;
  recentTurns: Array<{ speaker: string; text: string }>;
  factsCaptured: PlannerFactFlags;
  factsConfirmed: {
    lastName: boolean;
    location: boolean;
  };
  missingMaterialFacts: string[];
  urgencyLevel: string;
  emotionalCues: string[];
  requestedOutcome: string;
  allowedNextActions: string[];
  callActionable: boolean;
  practiceOpen: boolean;
  afterHours: boolean;
  /** Deterministic field already chosen — planner rephrases this ask. */
  requiredField: string | null;
  /** Deterministic draft speech (fallback baseline). */
  deterministicDraft: string;
  mode: "ask" | "close";
  persisted: boolean;
  lifeThreatening: boolean;
  firstNameHint: string | null;
  lastNameSpellingHint: string | null;
  locationHint: string | null;
}

export interface PlanConversationalOptions {
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Injected planner for tests — bypasses network. */
  planFn?: (context: PlannerContext) => Promise<PlannerProposal>;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 2200;

const FIELD_TO_ACTION: Record<string, ProposedAction> = {
  "caller.name": "ask_name",
  "caller.last_name_spell": "ask_last_name_spell",
  "caller.last_name_confirm": "confirm_last_name_spelling",
  "pain.swelling": "ask_swelling",
  "pain.fever": "ask_fever",
  "safety.breathing": "ask_breathing",
  "schedule.earliest": "ask_earliest",
  "schedule.short_notice": "ask_short_notice",
  "caller.phone": "ask_phone",
  "pain.location": "ask_location",
  "pain.location.vertical": "ask_location",
  "pain.location.side": "ask_location",
  "pain.location.depth": "ask_location",
  "pain.location.confirm": "ask_location",
};

export function isHybridConversationalEnabled(): boolean {
  const flag = (process.env.HYBRID_CONVERSATIONAL_ALY || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  // Default on when an API key is present so live phone can use hybrid without
  // an extra flag; tests / offline stay deterministic without a key.
  return Boolean((process.env.OPENAI_API_KEY || "").trim());
}

export function plannerTimeoutMs(override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  const raw = Number(process.env.HYBRID_ALY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export function resolvePlannerModel(override?: string): string {
  return (
    (override || process.env.OPENAI_MODEL || DEFAULT_MODEL).trim() ||
    DEFAULT_MODEL
  );
}

function truncate(text: string, max: number): string {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function firstNameFrom(name?: string | null): string | null {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
}

export function buildMissingMaterialFacts(session: LiveCallSession): string[] {
  const id = getIdentityState(session);
  const missing: string[] = [];
  if (!id.nameCaptured) missing.push("name");
  if (!id.lastNameSpellingCaptured) missing.push("last_name_spelling");
  if (!id.lastNameConfirmed) missing.push("last_name_confirm");
  if (!isLocationComplete(session.slots.locationParts)) missing.push("location");
  if (typeof session.slots.swelling !== "boolean") missing.push("swelling");
  if (typeof session.slots.wantsEarliest !== "boolean") missing.push("earliest_preference");
  if (
    session.slots.wantsEarliest === true &&
    typeof session.slots.shortNoticeOk !== "boolean"
  ) {
    missing.push("short_notice");
  }
  return missing;
}

export function buildEmotionalCues(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): string[] {
  const cues: string[] = [];
  const text = patientText(session.turns).toLowerCase();
  if (session.slots.keptAwake || /kept me awake|couldn't sleep|could not sleep/.test(text)) {
    cues.push("sleep_disrupted");
  }
  if (/worried|worry|nervous|scared|anxious|afraid|concerned/.test(text)) {
    cues.push("worried");
  }
  if (/pain|hurt|toothache|throbbing|awful/.test(text)) {
    cues.push("pain");
  }
  if (analysis.psychology?.emotion && analysis.psychology.emotion !== "unknown") {
    cues.push(String(analysis.psychology.emotion));
  }
  if (session.tone === "worried_anxious") cues.push("tone_worried");
  if (session.tone === "pain_discomfort") cues.push("tone_pain");
  if (session.tone === "emergency_direct") cues.push("tone_emergency");
  return [...new Set(cues)];
}

export function buildPlannerContext(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  mode: "ask" | "close";
  requiredField?: string | null;
  deterministicDraft: string;
  callActionable: boolean;
  persisted?: boolean;
  lifeThreatening?: boolean;
}): PlannerContext {
  const { session, analysis } = input;
  const id = getIdentityState(session);
  const latest =
    [...session.turns]
      .reverse()
      .find((t) => t.speaker === "patient" || t.speaker === "caller")?.text ||
    "";

  const recentTurns = session.turns.slice(-6).map((t) => ({
    speaker: t.speaker === "agent" || t.speaker === "aly" ? "aly" : "caller",
    text: truncate(t.text, 180),
  }));

  const factsCaptured: PlannerFactFlags = {
    nameCaptured: id.nameCaptured,
    lastNameSpellingCaptured: id.lastNameSpellingCaptured,
    lastNameConfirmed: id.lastNameConfirmed,
    locationComplete: isLocationComplete(session.slots.locationParts),
    locationConfirmed: session.slots.locationConfirmed === true,
    swellingKnown: typeof session.slots.swelling === "boolean",
    feverKnown: typeof session.slots.fever === "boolean",
    breathingKnown: typeof session.slots.breathingOk === "boolean",
    wantsEarliestKnown: typeof session.slots.wantsEarliest === "boolean",
    shortNoticeKnown: typeof session.slots.shortNoticeOk === "boolean",
    keptAwake: session.slots.keptAwake === true,
    worried: /worried|worry|nervous|scared|anxious|afraid|concerned/i.test(
      patientText(session.turns)
    ),
  };

  const missingMaterialFacts = buildMissingMaterialFacts(session);
  const field = input.requiredField ?? null;
  const allowedNextActions =
    input.mode === "close"
      ? ["close_call"]
      : field
        ? [FIELD_TO_ACTION[field] || "other", "acknowledge"]
        : ["other"];

  return {
    latestUtterance: truncate(latest, 280),
    recentTurns,
    factsCaptured,
    factsConfirmed: {
      lastName: id.lastNameConfirmed,
      location: session.slots.locationConfirmed === true,
    },
    missingMaterialFacts,
    urgencyLevel: analysis.triage?.urgency || "routine",
    emotionalCues: buildEmotionalCues(session, analysis),
    requestedOutcome: truncate(
      analysis.understanding?.chiefConcern ||
        analysis.frontDesk?.recommendedNextStep ||
        "dental help",
      120
    ),
    allowedNextActions,
    callActionable: input.callActionable,
    practiceOpen: !session.afterHours,
    afterHours: session.afterHours,
    requiredField: field,
    deterministicDraft: truncate(input.deterministicDraft, 400),
    mode: input.mode,
    persisted: input.persisted === true,
    lifeThreatening: input.lifeThreatening === true,
    firstNameHint: firstNameFrom(session.slots.name),
    lastNameSpellingHint: session.slots.lastNameSpelling
      ? String(session.slots.lastNameSpelling).replace(/[^A-Za-z]/g, "").slice(0, 24)
      : null,
    locationHint: session.slots.location
      ? truncate(session.slots.location, 60)
      : null,
  };
}

export function parsePlannerProposal(raw: unknown): PlannerProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const acknowledgment = String(o.acknowledgment ?? "").trim();
  const nextQuestion = String(o.nextQuestion ?? "").trim();
  const reason = String(o.reason ?? "").trim();
  const factsUnderstood = Array.isArray(o.factsUnderstood)
    ? o.factsUnderstood.map((f) => String(f).trim()).filter(Boolean).slice(0, 12)
    : [];
  const proposedAction = String(o.proposedAction ?? "other").trim() || "other";
  const shouldClose = o.shouldClose === true;
  const tone = String(o.tone ?? "warm_concerned").trim() || "warm_concerned";

  if (!acknowledgment && !nextQuestion) return null;

  return {
    acknowledgment,
    nextQuestion,
    reason,
    factsUnderstood,
    proposedAction,
    shouldClose,
    tone,
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

export function buildPlannerSystemPrompt(): string {
  return [
    "You are Aly, a warm dental front-desk phone assistant for a private practice.",
    "Propose the next spoken response as JSON only — no markdown, no SSML, no bracketed emotion tags.",
    "Deterministic policy already chose the next required field. Rephrase that ask; do not change the goal.",
    "Rules:",
    "- One question at a time (at most one '?' in nextQuestion).",
    "- Acknowledge pain/worry genuinely when emotional cues include pain or worried — not generic 'Okay'.",
    "- Never diagnose, prescribe, or say it is nothing serious.",
    "- Never guarantee an appointment time or invent availability.",
    "- Never claim insurance was verified.",
    "- Never claim a message was saved unless persisted is true.",
    "- Do not re-ask facts already confirmed (name spelling, location, swelling, etc.).",
    "- Keep phone-length: acknowledgment ≤ 2 short sentences; question ≤ 1 sentence.",
    "- For pain/worry tone: calm and compassionate, not cheerful.",
    "- If mode is close: shouldClose true, nextQuestion empty, honest next step only.",
    "- If lifeThreatening: instruct ER/911 and on-call alert; do not soften that.",
    "JSON shape:",
    '{"acknowledgment":"...","nextQuestion":"...","reason":"...","factsUnderstood":[],"proposedAction":"...","shouldClose":false,"tone":"warm_concerned"}',
  ].join("\n");
}

export async function callOpenAiPlanner(
  context: PlannerContext,
  options: PlanConversationalOptions = {}
): Promise<PlannerProposal> {
  const apiKey = (options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("planner_missing_api_key");
  }

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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildPlannerSystemPrompt() },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Propose Aly's next spoken turn from this structured context.",
              context,
            }),
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`planner_http_${res.status}`);
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("planner_empty_content");
    const parsed = parsePlannerProposal(extractJsonObject(content));
    if (!parsed) throw new Error("planner_invalid_shape");
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export async function planConversationalResponse(
  context: PlannerContext,
  options: PlanConversationalOptions = {}
): Promise<PlannerProposal> {
  if (options.planFn) {
    return options.planFn(context);
  }
  return callOpenAiPlanner(context, options);
}

/** Map deterministic field → expected proposedAction for soft alignment checks. */
export function expectedActionForField(field: string | null): string | null {
  if (!field) return null;
  return FIELD_TO_ACTION[field] || null;
}

export function renderPlannerSpeech(
  proposal: PlannerProposal,
  mode: "ask" | "close"
): string {
  if (mode === "close") {
    return [proposal.acknowledgment, proposal.nextQuestion]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return [proposal.acknowledgment, proposal.nextQuestion]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Test helper — builds a proposal shaped for a known field. */
export function proposalForField(
  field: string,
  overrides: Partial<PlannerProposal> = {}
): PlannerProposal {
  const action = FIELD_TO_ACTION[field] || "other";
  const defaults: Record<string, PlannerProposal> = {
    "caller.last_name_spell": {
      acknowledgment:
        "I'm sorry you're dealing with that pain, and I understand why you're worried. I'll get the important details to the team so they know you need help.",
      nextQuestion: "Could you spell your last name for me?",
      reason: "Name and location volunteered; confirm spelling next.",
      factsUnderstood: [
        "full_name",
        "lower_right_back_tooth",
        "kept_awake",
        "worried",
      ],
      proposedAction: "ask_last_name_spell",
      shouldClose: false,
      tone: "warm_concerned",
    },
    "caller.last_name_confirm": {
      acknowledgment: "Thank you.",
      nextQuestion: "B-U-U-R-M-A, Buurma. Did I get that right?",
      reason: "Read back spelling.",
      factsUnderstood: ["last_name_spelling"],
      proposedAction: "confirm_last_name_spelling",
      shouldClose: false,
      tone: "warm_concerned",
    },
    "pain.swelling": {
      acknowledgment:
        "Thank you — I have your name and that the pain is in the lower-right back tooth.",
      nextQuestion: "Have you noticed any swelling on your face or gums?",
      reason: "Need swelling for triage without re-asking location.",
      factsUnderstood: ["name", "location"],
      proposedAction: "ask_swelling",
      shouldClose: false,
      tone: "warm_concerned",
    },
    "schedule.earliest": {
      acknowledgment: "Got it, thank you.",
      nextQuestion: "Are you hoping for the earliest available help?",
      reason: "Schedule preference after clinical facts.",
      factsUnderstood: ["swelling"],
      proposedAction: "ask_earliest",
      shouldClose: false,
      tone: "warm_concerned",
    },
    "schedule.short_notice": {
      acknowledgment: "Thank you.",
      nextQuestion:
        "Would you be able to come in on short notice if an opening becomes available?",
      reason: "Short-notice flexibility.",
      factsUnderstood: ["earliest"],
      proposedAction: "ask_short_notice",
      shouldClose: false,
      tone: "warm_concerned",
    },
  };

  const base =
    defaults[field] ||
    ({
      acknowledgment: "Thank you.",
      nextQuestion: "Could you tell me a little more?",
      reason: "fallback",
      factsUnderstood: [],
      proposedAction: action,
      shouldClose: false,
      tone: "warm_concerned",
    } satisfies PlannerProposal);

  return { ...base, ...overrides, proposedAction: overrides.proposedAction || action };
}
