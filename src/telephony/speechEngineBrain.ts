/**
 * FreedomDesk Speech Engine brain — one continuous conversation controller.
 *
 * ElevenLabs owns STT / turn-taking / TTS / interruptions.
 * This module owns LLM reasoning, validated tools, safety, and persistence.
 * Not wired into ConversationRelay; parallel transport only.
 */

import type { MockCallTranscript, TranscriptTurn } from "../conversation/types.ts";
import {
  hasLifeThreateningLanguage,
  type IntakeSlots,
} from "./callSession.ts";
import {
  completeCallFromTranscript,
  type LatestActionableCall,
} from "./completedCall.ts";
import {
  isAfterHours,
  loadPracticeVoiceConfig,
  selectGreeting,
} from "./practiceConfig.ts";
import { parseToothLocationParts } from "./toothLocation.ts";
import {
  applyAsrName,
  applyLastNameSpelling,
  applyStructuredFactsToArtifact,
  buildStructuredStaffHandoff,
  confirmIdentityReadback,
  createEmptyIdentity,
  extractSpokenFullName,
  hasMeaningfulConversation,
  isSchedulingPhraseAsName,
  nextIdentityPrompt,
  normalizePhoneValue,
  processCallerUtteranceForFacts,
  rejectIdentityReadback,
  setAuthoritativePhone,
  syncIdentityFromFacts,
  type SpeechEngineIdentity,
} from "./speechEngineFidelity.ts";

export const SPEECH_ENGINE_TRANSPORT = "elevenlabs_speech_engine" as const;
export const AMBER_KING_VOICE_ID = "F89WkXaQbUlVyNvtlD3X";

export type FactConfidence = "low" | "medium" | "high" | "confirmed";

export interface CallFactEntry {
  value: unknown;
  confidence: FactConfidence;
  corrected?: boolean;
  updatedAt: string;
}

export interface StructuredCallFacts {
  name?: CallFactEntry;
  firstName?: CallFactEntry;
  lastName?: CallFactEntry;
  lastNameSpelling?: CallFactEntry;
  phone?: CallFactEntry;
  chiefConcern?: CallFactEntry;
  painLocation?: CallFactEntry;
  swelling?: CallFactEntry;
  fever?: CallFactEntry;
  breathingOk?: CallFactEntry;
  availability?: CallFactEntry;
  wantsEarliest?: CallFactEntry;
  shortNoticeOk?: CallFactEntry;
  requestedOutcome?: CallFactEntry;
  sleepDisruption?: CallFactEntry;
  worsening?: CallFactEntry;
  duration?: CallFactEntry;
  insurance?: CallFactEntry;
  needsClarification?: CallFactEntry;
  notes?: CallFactEntry;
  [key: string]: CallFactEntry | undefined;
}

export interface SpeechEngineSessionState {
  callSid: string;
  conversationId?: string;
  from: string;
  afterHours: boolean;
  practiceId: string;
  greeting: string;
  facts: StructuredCallFacts;
  identity: SpeechEngineIdentity;
  turns: TranscriptTurn[];
  emergencyPreempted: boolean;
  persisted: boolean;
  persistArtifact: LatestActionableCall | null;
  followupRequested: boolean;
  closed: boolean;
}

export interface TranscriptMessage {
  role: "user" | "agent";
  content: string;
}

export interface BrainTurnResult {
  text: string;
  aborted: boolean;
  emergency: boolean;
  toolsUsed: string[];
  facts: StructuredCallFacts;
}

export interface BrainGenerateOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Test seam — bypass OpenAI. */
  generateFn?: (
    state: SpeechEngineSessionState,
    transcript: TranscriptMessage[],
    signal: AbortSignal
  ) => Promise<string> | AsyncIterable<string>;
  persistFn?: (
    transcript: MockCallTranscript,
    options?: { source?: LatestActionableCall["source"]; resetRegistries?: boolean }
  ) => LatestActionableCall;
  now?: () => string;
}

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "update_call_facts",
      description:
        "Record or correct facts the caller supplied. Supports any order. Use confidence and corrected=true for corrections.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          facts: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              lastNameSpelling: { type: "string" },
              phone: { type: "string" },
              chiefConcern: { type: "string" },
              painLocation: { type: "string" },
              swelling: { type: "boolean" },
              fever: { type: "boolean" },
              breathingOk: { type: "boolean" },
              availability: { type: "string" },
              wantsEarliest: { type: "boolean" },
              shortNoticeOk: { type: "boolean" },
              sleepDisruption: { type: "string" },
              worsening: { type: "boolean" },
              duration: { type: "string" },
              insurance: { type: "string" },
              notes: { type: "string" },
              confirmIdentityReadback: { type: "boolean" },
            },
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high", "confirmed"],
          },
          corrected: { type: "boolean" },
        },
        required: ["facts"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_emergency_safety",
      description:
        "Deterministic life-threatening emergency check. Call when breathing, swallowing, uncontrolled bleeding, or trauma is mentioned. FreedomDesk overrides ordinary conversation if unsafe.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          latestUtterance: { type: "string" },
        },
        required: ["latestUtterance"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_office_followup",
      description:
        "Capture the requested office outcome and availability. Does not book an appointment.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          requestedOutcome: { type: "string" },
          availability: { type: "string" },
          wantsEarliest: { type: "boolean" },
          shortNoticeOk: { type: "boolean" },
        },
        required: ["requestedOutcome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "persist_completed_call",
      description:
        "Persist the completed call through Practice Brain, arbitration, executive summary, and Today. Only after this succeeds may you say the message was shared with the team.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          readyToClose: { type: "boolean" },
        },
        required: ["readyToClose"],
      },
    },
  },
] as const;

const EMERGENCY_SPEECH =
  "Thank you for telling me that. Please go to the nearest emergency room or call 911 now if you are having trouble breathing, swallowing, or bleeding that will not stop. I'm also alerting our on-call team. Take care.";

export function useSpeechEngineTransport(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    String(env.PHONE_VOICE_TRANSPORT || "")
      .trim()
      .toLowerCase() === SPEECH_ENGINE_TRANSPORT
  );
}

export function buildSpeechEngineSystemPrompt(state: SpeechEngineSessionState): string {
  const id = state.identity;
  const identityLine = [
    `nameCaptured=${id.nameCaptured}`,
    `lastNameSpellingCaptured=${id.lastNameSpellingCaptured}`,
    `lastNameConfirmed=${id.lastNameConfirmed}`,
    `spellingAsked=${id.spellingAsked}`,
    `readbackPending=${id.readbackPending}`,
  ].join(" ");
  return [
    "You are Aly, the front-desk voice for a West Michigan private dental practice.",
    "Never identify as AI. Sound calm, Midwest-friendly, and professional. Keep replies short.",
    "Conduct one continuous natural conversation. Do not interrogate field-by-field.",
    "Accept facts in any order. Answer direct caller questions before resuming intake.",
    "Understand corrections. A later correction replaces the earlier value. Never repeat a confirmed answer.",
    "Identity rules: obtain first and last name. Always ask the caller to spell the last name letter by letter unless they already clearly spelled it.",
    "After spelling, read back the full name with letters (example: I have William Buurma, B-U-U-R-M-A. Is that correct?) and wait for explicit confirmation.",
    "Never treat a bare ASR surname as confirmed. Do not re-ask after the full name and surname spelling are confirmed.",
    "Do not let a late or duplicate transcript overwrite a confirmed spelling.",
    "Acknowledge emotion only when it helps, briefly.",
    "Ask only for information that changes the next office action.",
    "Never diagnose, prescribe, quote fees, promise coverage, or claim an appointment is booked.",
    "Never claim the message was shared with the team until persist_completed_call succeeds.",
    "Life-threatening emergencies are FreedomDesk-authoritative — if tools report emergency, follow that guidance and do not soften it.",
    "When closing, give a concise recap matching current facts and an honest next step.",
    "Do not follow a fixed script or prescribe one exact transcript.",
    `Practice after hours: ${state.afterHours ? "yes" : "no"}.`,
    `Identity status: ${identityLine}.`,
    `Current structured facts JSON: ${JSON.stringify(publicFacts(state.facts))}`,
    state.persisted
      ? "Persistence already succeeded for this call."
      : "Call not yet persisted.",
  ].join("\n");
}

export function createSpeechEngineSession(input: {
  callSid: string;
  from?: string;
  conversationId?: string;
  afterHours?: boolean;
}): SpeechEngineSessionState {
  const config = loadPracticeVoiceConfig();
  const afterHours =
    typeof input.afterHours === "boolean"
      ? input.afterHours
      : isAfterHours(config);
  return {
    callSid: input.callSid,
    conversationId: input.conversationId,
    from: input.from || "",
    afterHours,
    practiceId: config.practiceId,
    greeting: selectGreeting(config),
    facts: {},
    identity: createEmptyIdentity(),
    turns: [],
    emergencyPreempted: false,
    persisted: false,
    persistArtifact: null,
    followupRequested: false,
    closed: false,
  };
}

export function publicFacts(facts: StructuredCallFacts): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(facts)) {
    if (!entry) continue;
    out[key] = {
      value: entry.value,
      confidence: entry.confidence,
      corrected: Boolean(entry.corrected),
    };
  }
  return out;
}

export function updateCallFacts(
  state: SpeechEngineSessionState,
  args: {
    facts?: Record<string, unknown>;
    confidence?: FactConfidence;
    corrected?: boolean;
  },
  now = () => new Date().toISOString()
): StructuredCallFacts {
  const requestedConfidence =
    args.confidence || (args.corrected ? "confirmed" : "high");
  const stamp = now();
  const incoming = args.facts || {};

  if (incoming.confirmIdentityReadback === true) {
    confirmIdentityReadback(state, now);
    delete incoming.confirmIdentityReadback;
  }

  if (typeof incoming.lastNameSpelling === "string") {
    const incomingLetters = String(incoming.lastNameSpelling)
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (state.identity.lastNameConfirmed) {
      // Confirmed spelling is locked unless an explicit correction replaces it.
      if (
        args.corrected &&
        incomingLetters &&
        incomingLetters !== state.identity.lastNameSpelling
      ) {
        rejectIdentityReadback(state);
        applyLastNameSpelling(state, incoming.lastNameSpelling, now);
      }
    } else {
      applyLastNameSpelling(state, incoming.lastNameSpelling, now);
    }
    delete incoming.lastNameSpelling;
  }

  if (typeof incoming.phone === "string") {
    setAuthoritativePhone(
      state,
      incoming.phone,
      {
        corrected: Boolean(args.corrected),
        confidence: requestedConfidence,
      },
      now
    );
    delete incoming.phone;
  }

  if (typeof incoming.name === "string") {
    const rawName = String(incoming.name).trim();
    if (isSchedulingPhraseAsName(rawName)) {
      delete incoming.name;
    } else if (state.identity.lastNameConfirmed && !args.corrected) {
      // Confirmed spelling wins — ignore bare ASR / duplicate overwrites.
      delete incoming.name;
    } else {
      const parsed =
        extractSpokenFullName(`my name is ${rawName}`) ||
        (() => {
          const parts = rawName.split(/\s+/);
          if (parts.length >= 2) {
            return {
              firstName: parts[0],
              lastName: parts.slice(1).join(" "),
              full: rawName,
            };
          }
          return null;
        })();
      if (parsed) {
        // Bare ASR / tool name can never jump to confirmed without spelling+readback.
        applyAsrName(state, parsed, now);
        if (
          args.corrected &&
          state.identity.lastNameSpellingCaptured &&
          requestedConfidence === "confirmed"
        ) {
          confirmIdentityReadback(state, now);
        }
      }
      delete incoming.name;
    }
  }

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (key === "confirmIdentityReadback") continue;

    let confidence = requestedConfidence;
    // Never allow "confirmed" surname via generic fact write without identity confirm.
    if (
      (key === "lastName" || key === "firstName") &&
      confidence === "confirmed" &&
      !state.identity.lastNameConfirmed
    ) {
      confidence = "high";
    }
    if (
      key === "lastName" &&
      state.identity.lastNameConfirmed &&
      !args.corrected
    ) {
      continue;
    }

    let nextValue: unknown = value;
    if (key === "painLocation" && typeof value === "string") {
      const parts = parseToothLocationParts(value);
      const formatted = [parts.vertical, parts.side, parts.depth]
        .filter(Boolean)
        .join(" ");
      nextValue = formatted || value;
    }
    state.facts[key] = {
      value: nextValue,
      confidence,
      corrected: Boolean(args.corrected) || state.facts[key]?.corrected,
      updatedAt: stamp,
    };
  }
  syncIdentityFromFacts(state);
  return state.facts;
}

export function checkEmergencySafety(
  state: SpeechEngineSessionState,
  latestUtterance: string
): {
  lifeThreatening: boolean;
  reasons: string[];
  speech: string | null;
} {
  const factText = Object.values(state.facts)
    .map((f) => (f ? String(f.value) : ""))
    .join(" ");
  const breathingFalse = state.facts.breathingOk?.value === false;
  const blob = `${latestUtterance}\n${factText}`;
  const lifeThreatening =
    hasLifeThreateningLanguage(blob) || breathingFalse;
  const reasons: string[] = [];
  if (hasLifeThreateningLanguage(latestUtterance)) {
    reasons.push("utterance_life_threat_language");
  }
  if (breathingFalse) reasons.push("breathing_not_ok");
  if (lifeThreatening) {
    state.emergencyPreempted = true;
    state.facts.breathingOk = state.facts.breathingOk || {
      value: false,
      confidence: "high",
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    lifeThreatening,
    reasons,
    speech: lifeThreatening ? EMERGENCY_SPEECH : null,
  };
}

export function requestOfficeFollowup(
  state: SpeechEngineSessionState,
  args: {
    requestedOutcome: string;
    availability?: string;
    wantsEarliest?: boolean;
    shortNoticeOk?: boolean;
  }
): StructuredCallFacts {
  state.followupRequested = true;
  updateCallFacts(state, {
    facts: {
      requestedOutcome: args.requestedOutcome,
      ...(args.availability ? { availability: args.availability } : {}),
      ...(typeof args.wantsEarliest === "boolean"
        ? { wantsEarliest: args.wantsEarliest }
        : {}),
      ...(typeof args.shortNoticeOk === "boolean"
        ? { shortNoticeOk: args.shortNoticeOk }
        : {}),
    },
    confidence: "high",
  });
  return state.facts;
}

export function factsToIntakeSlots(facts: StructuredCallFacts): IntakeSlots {
  const slots: IntakeSlots = {};
  const name = facts.name?.value;
  if (typeof name === "string" && name.trim()) {
    slots.name = name.trim();
    slots.nameCaptured = true;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      slots.lastName = parts.slice(1).join(" ");
      slots.lastNameConfirmed = facts.name?.confidence === "confirmed";
    }
  }
  if (typeof facts.lastNameSpelling?.value === "string") {
    slots.lastNameSpelling = String(facts.lastNameSpelling.value);
    slots.lastNameSpellingCaptured = true;
  }
  if (typeof facts.swelling?.value === "boolean") {
    slots.swelling = facts.swelling.value;
  }
  if (typeof facts.fever?.value === "boolean") {
    slots.fever = facts.fever.value;
  }
  if (typeof facts.breathingOk?.value === "boolean") {
    slots.breathingOk = facts.breathingOk.value;
  }
  if (typeof facts.painLocation?.value === "string") {
    slots.location = facts.painLocation.value;
    slots.locationParts = parseToothLocationParts(facts.painLocation.value);
    slots.locationConfirmed =
      facts.painLocation.confidence === "confirmed" ||
      facts.painLocation.confidence === "high";
  }
  if (typeof facts.wantsEarliest?.value === "boolean") {
    slots.wantsEarliest = facts.wantsEarliest.value;
  }
  if (typeof facts.shortNoticeOk?.value === "boolean") {
    slots.shortNoticeOk = facts.shortNoticeOk.value;
  }
  if (facts.requestedOutcome?.value || facts.availability?.value) {
    slots.outcomeCaptured = true;
    slots.reasonCaptured = true;
  }
  if (facts.chiefConcern?.value) {
    slots.reasonCaptured = true;
  }
  return slots;
}

/**
 * Real conversation turns only — do not inject synthetic "My name is…" lines
 * that pollute extraction and staff notes.
 */
export function stateToTranscript(
  state: SpeechEngineSessionState
): MockCallTranscript {
  return {
    id: state.callSid,
    practiceId: state.practiceId,
    scenario: "speech_engine_live",
    afterHours: state.afterHours,
    turns: [...state.turns],
  };
}

export function persistCompletedCall(
  state: SpeechEngineSessionState,
  options: BrainGenerateOptions = {}
): {
  ok: boolean;
  artifact: LatestActionableCall | null;
  error?: string;
  alreadyPersisted?: boolean;
} {
  if (state.persisted && state.persistArtifact) {
    return {
      ok: true,
      artifact: state.persistArtifact,
      alreadyPersisted: true,
    };
  }
  if (!hasMeaningfulConversation(state)) {
    return {
      ok: false,
      artifact: null,
      error: "no_meaningful_conversation",
    };
  }
  try {
    const transcript = stateToTranscript(state);
    let artifact = (options.persistFn || completeCallFromTranscript)(
      transcript,
      {
        source: "twilio_speech_engine",
        resetRegistries: true,
      }
    );
    artifact = applyStructuredFactsToArtifact(state, artifact);
    state.persisted = true;
    state.persistArtifact = artifact;
    return { ok: true, artifact };
  } catch (err) {
    return {
      ok: false,
      artifact: null,
      error: err instanceof Error ? err.message : "persist_failed",
    };
  }
}

/**
 * Persist on media/brain close even when the final model response was aborted
 * (e.g. call_closed / hangup). Idempotent.
 */
export function persistOnCallClose(
  state: SpeechEngineSessionState,
  options: BrainGenerateOptions = {}
): {
  ok: boolean;
  artifact: LatestActionableCall | null;
  error?: string;
  alreadyPersisted?: boolean;
  skipped?: boolean;
} {
  state.closed = true;
  if (state.persisted && state.persistArtifact) {
    return {
      ok: true,
      artifact: state.persistArtifact,
      alreadyPersisted: true,
    };
  }
  if (!hasMeaningfulConversation(state)) {
    return {
      ok: false,
      artifact: null,
      skipped: true,
      error: "no_meaningful_conversation",
    };
  }
  return persistCompletedCall(state, options);
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function executeTool(
  state: SpeechEngineSessionState,
  name: string,
  argsJson: string,
  options: BrainGenerateOptions = {}
): Record<string, unknown> {
  const args = parseToolArgs(argsJson);
  if (name === "update_call_facts") {
    const facts = updateCallFacts(state, {
      facts: (args.facts as Record<string, unknown>) || {},
      confidence: args.confidence as FactConfidence | undefined,
      corrected: Boolean(args.corrected),
    });
    return { ok: true, facts: publicFacts(facts) };
  }
  if (name === "check_emergency_safety") {
    const result = checkEmergencySafety(
      state,
      String(args.latestUtterance || "")
    );
    return {
      ok: true,
      lifeThreatening: result.lifeThreatening,
      reasons: result.reasons,
      authoritativeSpeech: result.speech,
    };
  }
  if (name === "request_office_followup") {
    const facts = requestOfficeFollowup(state, {
      requestedOutcome: String(args.requestedOutcome || "office follow-up"),
      availability:
        typeof args.availability === "string" ? args.availability : undefined,
      wantsEarliest:
        typeof args.wantsEarliest === "boolean"
          ? args.wantsEarliest
          : undefined,
      shortNoticeOk:
        typeof args.shortNoticeOk === "boolean"
          ? args.shortNoticeOk
          : undefined,
    });
    return {
      ok: true,
      booked: false,
      message:
        "Follow-up requested. Do not claim an appointment is booked.",
      facts: publicFacts(facts),
    };
  }
  if (name === "persist_completed_call") {
    if (!args.readyToClose) {
      return { ok: false, error: "not_ready" };
    }
    const result = persistCompletedCall(state, options);
    return {
      ok: result.ok,
      persisted: result.ok,
      alreadyPersisted: Boolean(result.alreadyPersisted),
      error: result.error,
      executiveSummary:
        result.artifact?.operatingIntelligence?.executiveSummary || null,
      recommendedNextStep: result.artifact?.recommendedNextStep || null,
    };
  }
  return { ok: false, error: "unknown_tool" };
}

function appendTurnsFromTranscript(
  state: SpeechEngineSessionState,
  transcript: TranscriptMessage[]
): void {
  // Replace with authoritative recent history from Speech Engine.
  state.turns = transcript.map((m) => ({
    speaker: m.role === "agent" ? "aly" : "patient",
    text: m.content,
  }));
}

function latestUserText(transcript: TranscriptMessage[]): string {
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    if (transcript[i].role === "user") return transcript[i].content;
  }
  return "";
}

async function* streamOpenAiReply(
  state: SpeechEngineSessionState,
  transcript: TranscriptMessage[],
  signal: AbortSignal,
  options: BrainGenerateOptions
): AsyncGenerator<string> {
  const apiKey = (options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    yield fallbackReply(state, latestUserText(transcript));
    return;
  }

  const model =
    options.model ||
    process.env.OPENAI_SPEECH_ENGINE_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";
  const fetchImpl = options.fetchImpl || fetch;

  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: buildSpeechEngineSystemPrompt(state) },
    ...transcript.map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const toolsUsed: string[] = [];

  // First pass may request tools (non-stream for reliable tool parsing).
  const first = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 280,
      tools: TOOL_DEFINITIONS,
      messages,
    }),
  });
  if (!first.ok) throw new Error(`speech_engine_llm_http_${first.status}`);
  const firstBody = (await first.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          function: { name: string; arguments: string };
        }>;
      };
    }>;
  };
  const message = firstBody.choices?.[0]?.message;
  if (!message) throw new Error("speech_engine_llm_empty");

  if (message.tool_calls && message.tool_calls.length > 0) {
    messages.push({
      role: "assistant",
      content: message.content || null,
      tool_calls: message.tool_calls,
    });
    for (const call of message.tool_calls) {
      if (signal.aborted) return;
      toolsUsed.push(call.function.name);
      const result = executeTool(
        state,
        call.function.name,
        call.function.arguments,
        options
      );
      if (
        call.function.name === "check_emergency_safety" &&
        result.lifeThreatening &&
        typeof result.authoritativeSpeech === "string"
      ) {
        yield result.authoritativeSpeech;
        return;
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    // Stream the spoken reply after tools.
    const second = await fetchImpl(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 220,
          stream: true,
          messages: [
            {
              role: "system",
              content: buildSpeechEngineSystemPrompt(state),
            },
            ...messages.slice(1),
          ],
        }),
      }
    );
    if (!second.ok || !second.body) {
      throw new Error(`speech_engine_llm_stream_${second.status}`);
    }
    yield* readOpenAiSseText(second.body, signal);
    return;
  }

  const content = String(message.content || "").trim();
  if (content) {
    yield content;
    return;
  }
  yield fallbackReply(state, latestUserText(transcript));
}

async function* readOpenAiSseText(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore partial JSON
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

export function fallbackReply(
  state: SpeechEngineSessionState,
  latestUtterance: string
): string {
  const emergency = checkEmergencySafety(state, latestUtterance);
  if (emergency.lifeThreatening && emergency.speech) return emergency.speech;

  const lower = latestUtterance.toLowerCase();
  if (/what happens next|what('s| is) next|what do you do/i.test(lower)) {
    if (state.persisted) {
      return "I've shared these details with the team, and someone will follow up with you. I haven't booked an appointment yet.";
    }
    return "I'll take down what you need, save a clear summary for the team, and someone from the office will follow up. I won't book an appointment on this call.";
  }
  if (/already answered|move on|can we move on/i.test(lower)) {
    return "You're right — thanks for saying that. I won't ask that again. What else should the office know before I save this for the team?";
  }

  // Identity gate — spelling + readback before treating surname as confirmed.
  if (!state.identity.lastNameConfirmed) {
    const identityAsk = nextIdentityPrompt(state);
    if (identityAsk) return identityAsk;
  }

  const name = state.facts.name?.value;
  const location = state.facts.painLocation?.value;
  const swelling = state.facts.swelling?.value;
  const availability = state.facts.availability?.value;
  const known: string[] = [];
  if (name && state.identity.lastNameConfirmed) {
    known.push(`name ${String(name)}`);
  }
  if (location) known.push(`pain ${String(location)}`);
  if (typeof swelling === "boolean") {
    known.push(swelling ? "swelling noted" : "no swelling");
  }
  if (availability) known.push(`availability ${String(availability)}`);
  if (known.length >= 3) {
    return `Thanks — I have ${known.join(", ")}. I'll save this for the team so they can follow up. Is there anything else they should know?`;
  }
  if (!location && /pain|hurt|tooth|ache/i.test(lower + JSON.stringify(state.facts))) {
    return "Thanks. Where in the mouth is the pain?";
  }
  return "Thanks — I'm listening. Go ahead with whatever helps the office help you.";
}

/**
 * One caller turn → one brain path (optional tools + streamed speech).
 * AbortSignal cancels in-flight generation when the caller interrupts.
 */
export async function runBrainTurn(
  state: SpeechEngineSessionState,
  transcript: TranscriptMessage[],
  signal: AbortSignal,
  options: BrainGenerateOptions = {}
): Promise<BrainTurnResult> {
  appendTurnsFromTranscript(state, transcript);
  const latest = latestUserText(transcript);
  processCallerUtteranceForFacts(state, latest);
  const toolsUsed: string[] = [];

  // Deterministic emergency preemption — model cannot override.
  const emergency = checkEmergencySafety(state, latest);
  if (emergency.lifeThreatening && emergency.speech) {
    toolsUsed.push("check_emergency_safety");
    state.turns.push({ speaker: "aly", text: emergency.speech });
    return {
      text: emergency.speech,
      aborted: false,
      emergency: true,
      toolsUsed,
      facts: state.facts,
    };
  }

  if (signal.aborted) {
    return {
      text: "",
      aborted: true,
      emergency: false,
      toolsUsed,
      facts: state.facts,
    };
  }

  // Deterministic identity gate — do not depend on the model for spelling/readback.
  if (
    state.identity.nameCaptured &&
    !state.identity.lastNameConfirmed
  ) {
    const identityAsk = nextIdentityPrompt(state);
    if (identityAsk) {
      state.turns.push({ speaker: "aly", text: identityAsk });
      return {
        text: identityAsk,
        aborted: false,
        emergency: false,
        toolsUsed,
        facts: state.facts,
      };
    }
  }

  let text = "";
  try {
    if (options.generateFn) {
      const generated = await options.generateFn(state, transcript, signal);
      if (typeof generated === "string") {
        text = generated;
      } else {
        for await (const chunk of generated) {
          if (signal.aborted) {
            return {
              text,
              aborted: true,
              emergency: false,
              toolsUsed,
              facts: state.facts,
            };
          }
          text += chunk;
        }
      }
    } else {
      for await (const chunk of streamOpenAiReply(
        state,
        transcript,
        signal,
        options
      )) {
        if (signal.aborted) {
          return {
            text,
            aborted: true,
            emergency: false,
            toolsUsed,
            facts: state.facts,
          };
        }
        text += chunk;
      }
    }
  } catch (err) {
    if (signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      return {
        text,
        aborted: true,
        emergency: false,
        toolsUsed,
        facts: state.facts,
      };
    }
    text = fallbackReply(state, latest);
  }

  text = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) text = fallbackReply(state, latest);
  if (!signal.aborted && text) {
    state.turns.push({ speaker: "aly", text });
  }
  return {
    text,
    aborted: Boolean(signal.aborted),
    emergency: false,
    toolsUsed,
    facts: state.facts,
  };
}

/**
 * Async iterable for Speech Engine session.sendResponse().
 * Streams OpenAI tokens when available; falls back to phrase chunks.
 */
export async function* streamBrainTurn(
  state: SpeechEngineSessionState,
  transcript: TranscriptMessage[],
  signal: AbortSignal,
  options: BrainGenerateOptions = {}
): AsyncGenerator<string> {
  appendTurnsFromTranscript(state, transcript);
  const latest = latestUserText(transcript);
  processCallerUtteranceForFacts(state, latest);

  const emergency = checkEmergencySafety(state, latest);
  if (emergency.lifeThreatening && emergency.speech) {
    state.turns.push({ speaker: "aly", text: emergency.speech });
    yield emergency.speech;
    return;
  }

  if (signal.aborted) return;

  // Deterministic identity gate — spelling + readback before continuing intake.
  if (state.identity.nameCaptured && !state.identity.lastNameConfirmed) {
    const identityAsk = nextIdentityPrompt(state);
    if (identityAsk) {
      state.turns.push({ speaker: "aly", text: identityAsk });
      yield identityAsk;
      return;
    }
  }

  let text = "";
  try {
    const source = options.generateFn
      ? await (async function* () {
          const generated = await options.generateFn!(
            state,
            transcript,
            signal
          );
          if (typeof generated === "string") {
            yield generated;
          } else {
            for await (const chunk of generated) yield chunk;
          }
        })()
      : streamOpenAiReply(state, transcript, signal, options);

    for await (const chunk of source) {
      if (signal.aborted) {
        return;
      }
      text += chunk;
      yield chunk;
    }
  } catch (err) {
    if (signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      return;
    }
    const fallback = fallbackReply(state, latest);
    text = fallback;
    yield fallback;
  }

  text = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text && !signal.aborted) {
    text = fallbackReply(state, latest);
    yield text;
  }
  if (!signal.aborted && text) {
    state.turns.push({ speaker: "aly", text });
  }
}

export {
  TOOL_DEFINITIONS,
  EMERGENCY_SPEECH,
  processCallerUtteranceForFacts,
  nextIdentityPrompt,
  applyLastNameSpelling,
  confirmIdentityReadback,
  applyAsrName,
  buildStructuredStaffHandoff,
  applyStructuredFactsToArtifact,
  normalizePhoneValue,
  isSchedulingPhraseAsName,
};
