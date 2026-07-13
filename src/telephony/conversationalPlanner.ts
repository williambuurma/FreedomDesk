/**
 * Hybrid Conversational Aly — planner selects among deterministic allowed actions.
 * Expression + conversational judgment; never invents disallowed actions.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import type { LiveCallSession } from "./callSession.ts";
import {
  buildConversationOptions,
  deterministicSpeechForAction,
  type ConversationOptions,
  type ConversationalAction,
} from "./allowedActions.ts";

export interface PlannerProposal {
  selectedAction: ConversationalAction | string;
  acknowledgment: string;
  spokenResponse: string;
  factsUnderstood: string[];
  tone: string;
  reason: string;
}

export interface PlannerContext {
  latestUtterance: string;
  recentTurns: Array<{ speaker: string; text: string }>;
  options: ConversationOptions;
}

export interface PlanConversationalOptions {
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  planFn?: (context: PlannerContext) => Promise<PlannerProposal>;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 3000;

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
    (override || process.env.OPENAI_MODEL || DEFAULT_MODEL).trim() ||
    DEFAULT_MODEL
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

  return {
    latestUtterance: truncate(latest, 220),
    recentTurns: session.turns.slice(-4).map((t) => ({
      speaker: t.speaker === "agent" || t.speaker === "aly" ? "aly" : "caller",
      text: truncate(t.text, 120),
    })),
    options: {
      ...options,
      // Do not send draft speech templates — keep payload small.
      firstNameHint: options.firstNameHint,
      lastNameSpellingHint: options.lastNameSpellingHint,
      locationHint: options.locationHint,
    },
  };
}

/** Compact JSON payload for the model (no duplicated transcript). */
export function buildPlannerUserPayload(context: PlannerContext): object {
  const o = context.options;
  return {
    latestUtterance: context.latestUtterance,
    recentTurns: context.recentTurns,
    facts: o.factsCaptured,
    confirmed: o.factsConfirmed,
    missing: o.missingMaterialFacts,
    urgency: o.urgency,
    actionable: o.actionable,
    dentalPain: o.dentalPain,
    afterHours: o.afterHours,
    hardRequiredAction: o.hardRequiredAction,
    allowedActions: o.allowedActions,
    hints: {
      firstName: o.firstNameHint,
      spelling: o.lastNameSpellingHint,
      location: o.locationHint,
      spellingLowConfidence: o.spellingLowConfidence,
    },
  };
}

export function buildPlannerSystemPrompt(): string {
  return [
    "You are Aly, a warm dental front-desk phone assistant.",
    "Choose exactly one action from allowedActions. Return JSON only.",
    "Speak calmly and compassionately for pain/worry — not cheerful.",
    "One question max unless action is ask_combined_tooth_location or ask_combined_scheduling_preference.",
    "Never diagnose, invent availability, guarantee appointments, or claim insurance verified.",
    "Never claim a message was saved.",
    "Do not re-ask confirmed facts.",
    "persist_and_close only if actionable is true.",
    "emergency_escalation cannot be softened.",
    "Prefer fewer questions when facts are already known.",
    'JSON: {"selectedAction":"","acknowledgment":"","spokenResponse":"","factsUnderstood":[],"tone":"warm_concerned","reason":""}',
  ].join(" ");
}

export function parsePlannerProposal(raw: unknown): PlannerProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const selectedAction = String(o.selectedAction ?? "").trim();
  const acknowledgment = String(o.acknowledgment ?? "").trim();
  const spokenResponse = String(
    o.spokenResponse ?? o.nextQuestion ?? ""
  ).trim();
  const reason = String(o.reason ?? "").trim();
  const tone = String(o.tone ?? "warm_concerned").trim() || "warm_concerned";
  const factsUnderstood = Array.isArray(o.factsUnderstood)
    ? o.factsUnderstood.map((f) => String(f).trim()).filter(Boolean).slice(0, 10)
    : [];

  if (!selectedAction) return null;
  if (!spokenResponse && selectedAction !== "persist_and_close" && selectedAction !== "emergency_escalation") {
    return null;
  }

  return {
    selectedAction,
    acknowledgment,
    spokenResponse: spokenResponse || acknowledgment,
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
        temperature: 0.3,
        max_tokens: 220,
        response_format: { type: "json_object" },
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
  const action =
    options.hardRequiredAction ||
    options.fallbackPriority.find((a) => a !== "acknowledge_and_recap") ||
    options.allowedActions[0] ||
    "ask_reason_for_calling";

  const spoken = deterministicSpeechForAction(action, session, options);
  return {
    selectedAction: action,
    acknowledgment: "",
    spokenResponse: spoken,
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
    selectedAction: action,
    acknowledgment: overrides.acknowledgment || "",
    spokenResponse,
    factsUnderstood: overrides.factsUnderstood || [],
    tone: overrides.tone || "warm_concerned",
    reason: overrides.reason || "test",
  };
}

export { buildConversationOptions };
