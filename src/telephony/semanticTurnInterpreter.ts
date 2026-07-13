/**
 * Semantic turn interpreter — interprets caller meaning before action selection.
 * OpenAI Structured Outputs when configured; heuristic fallback for tests / offline.
 */

import {
  emptySemanticInterpretation,
  SEMANTIC_TURN_JSON_SCHEMA,
  type SemanticEmotion,
  type SemanticIntent,
  type SemanticTurnInterpretation,
} from "./semanticTurnTypes.ts";
import { normalizeSpokenSpelling } from "./spellingNormalize.ts";
import { parseToothLocationParts } from "./toothLocation.ts";

export interface SemanticInterpreterInput {
  utterance: string;
  previousAction: string | null;
  previousQuestion: string | null;
  structuredState: {
    nameCaptured: boolean;
    lastNameSpellingCaptured: boolean;
    lastNameConfirmed: boolean;
    locationComplete: boolean;
    swellingKnown: boolean;
    wantsEarliestKnown: boolean;
    shortNoticeKnown: boolean;
    locationHint: string | null;
  };
  recentTurns: Array<{ speaker: string; text: string }>;
}

export interface SemanticInterpreterOptions {
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  interpretFn?: (
    input: SemanticInterpreterInput
  ) => Promise<SemanticTurnInterpretation>;
  /** Force heuristic even when API key is present (tests). */
  forceHeuristic?: boolean;
}

const DEFAULT_TIMEOUT_MS = 2000;

export function resolveSemanticModel(override?: string): string {
  return (
    (
      override ||
      process.env.OPENAI_SEMANTIC_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4o-mini"
    ).trim() || "gpt-4o-mini"
  );
}

export function semanticTimeoutMs(override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  const raw = Number(
    process.env.HYBRID_ALY_SEMANTIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export function isSemanticInterpreterEnabled(): boolean {
  const flag = (process.env.HYBRID_ALY_SEMANTIC || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  // Default on when OpenAI is configured — still falls back to heuristic on failure.
  return Boolean((process.env.OPENAI_API_KEY || "").trim());
}

function stripPrefix(text: string): string {
  return text
    .replace(
      /^(yeah|yep|yup|yes|well|so|um+|uh+|okay|ok|i think|i guess|actually|sorry|like)\b[,.\s-]*/gi,
      ""
    )
    .trim();
}

function looksLikeSpelling(text: string): boolean {
  // Require explicit spelling evidence — never treat ordinary words (e.g. "maybe") as letters.
  if (/(?:[A-Za-z]\s*[-–]\s*){2,}[A-Za-z]/.test(text)) return true;
  if (/\bas in\b/i.test(text)) return true;
  if (/\b[A-Za-z]\s*,\s*[A-Za-z]\s*,/.test(text)) return true;
  if (/yeah[, ]+it'?s\s+[A-Za-z](\s*[-–]\s*[A-Za-z])+/i.test(text)) return true;
  if (/\bit'?s\s+[A-Za-z](?:\s*[-–]\s*[A-Za-z]){2,}/i.test(text)) return true;
  if (/\bspell(?:ed|ing)?\b/i.test(text)) {
    const normalized = normalizeSpokenSpelling(text);
    return normalized.letters.length >= 2 && normalized.confidence !== "none";
  }
  return false;
}

function isAffirmativeUtterance(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (
    /^(yes|yeah|yep|yup|sure|correct|right|that's right|that is right|i do|i can|i am)\b/.test(
      t
    )
  ) {
    return true;
  }
  return /\b(yes|yeah|yep|that's right|that is right|correct)\b/.test(t);
}

function isNegativeUtterance(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/^(no|nope|nah|not really|none|i don't|i do not)\b/.test(t)) return true;
  return /\bno\b/.test(t) && !/\bknow\b/.test(t);
}

function confirmationTarget(previousAction: string | null): string | null {
  if (!previousAction) return null;
  // Spelling *asks* collect letters — "yeah, it's B-U…" is not a confirm.
  if (previousAction === "ask_last_name_spelling") return null;
  if (previousAction === "ask_name") return null;
  if (previousAction === "ask_combined_tooth_location") return null;
  const map: Record<string, string> = {
    confirm_last_name_spelling: "last_name_spelling",
    ask_swelling: "swelling",
    ask_fever: "fever",
    ask_breathing: "breathing",
    ask_combined_scheduling_preference: "scheduling",
  };
  return map[previousAction] || null;
}

function extractName(text: string): { first: string | null; last: string | null } {
  const named = text.match(
    /(?:my name is|this is)\s+([A-Za-z]+)\s+([A-Za-z]+)/i
  );
  if (named) return { first: named[1], last: named[2] };

  const emotionFirst =
    /^(worried|nervous|scared|anxious|afraid|concerned|hurting|calling|sorry|fine|okay|ok|here|back)\b/i;

  // Broad "I'm First Last" — allow mid-utterance after filler/ramble.
  const iam = text.match(/(?:i'm|i am)\s+([A-Za-z]+)\s+([A-Za-z]+)\b/i);
  if (iam && !emotionFirst.test(iam[1])) {
    return { first: iam[1], last: iam[2] };
  }

  // "Hello, William Buurma…" / "Hi William Buurma…"
  const greeted = text.match(
    /(?:hello|hi|hey)[,!\s]+([A-Za-z]+)\s+([A-Za-z]+)\b/i
  );
  if (greeted && !emotionFirst.test(greeted[1])) {
    return { first: greeted[1], last: greeted[2] };
  }

  // "William Buurma, lower-right…" / "William Buurma here." / "Wait—William Buurma—"
  const leading = text.match(
    /(?:^|wait\s*[\u2014\-–,]?\s*)([A-Za-z]+)\s+([A-Za-z]+)\s*(?:,|\.|here\b|speaking\b|[\u2014\-–])/i
  );
  if (leading && !emotionFirst.test(leading[1])) {
    return { first: leading[1], last: leading[2] };
  }

  // Bare "William Buurma."
  const bare = text.match(/^([A-Za-z]+)\s+([A-Za-z]+)[.!]?\s*$/);
  if (bare && !emotionFirst.test(bare[1])) {
    return { first: bare[1], last: bare[2] };
  }

  return { first: null, last: null };
}

/**
 * Deterministic semantic interpretation — generalizes beyond golden-script wording.
 */
export function interpretSemanticTurnHeuristic(
  input: SemanticInterpreterInput
): SemanticTurnInterpretation {
  const raw = String(input.utterance || "").trim();
  const text = stripPrefix(raw);
  const lower = raw.toLowerCase();
  const out = emptySemanticInterpretation("heuristic");

  // Emotions / signals
  if (/worried|concern|anxious/i.test(raw)) out.emotions.push("worried");
  if (/scared|afraid|frightened/i.test(raw)) out.emotions.push("scared");
  if (/frustrat|annoyed|already (told|said|spelled)|can we move on/i.test(raw)) {
    out.emotions.push("frustrated");
    out.conversationSignals.callerIsFrustrated = true;
  }
  if (/hurt|pain|throbbing|ache/i.test(raw)) out.emotions.push("in_pain");
  if (/calm|i'm fine|not worried/i.test(raw)) out.emotions.push("calm");
  if (/already (told|said|gave|spelled)|i already|you already asked/i.test(raw)) {
    out.conversationSignals.callerSaysAlreadyAnswered = true;
    out.refusals.push("already_answered");
  }
  if (/can we move on|let's move on|skip (that|it)/i.test(raw)) {
    out.emotions.push("impatient");
    out.refusals.push("move_on");
  }
  if (/don'?t want to spell|refuse to spell|not going to spell/i.test(raw)) {
    out.refusals.push("spelling");
  }
  if (/what (will happen|happens?) next|what happens (now|next)/i.test(raw)) {
    out.conversationSignals.callerAsksWhatHappensNext = true;
    out.intent = "question";
  }
  if (/do i (already )?have an appointment|am i scheduled/i.test(raw)) {
    out.conversationSignals.callerAsksIfHasAppointment = true;
    out.intent = "question";
  }
  if (
    /i don'?t know which tooth|not sure which tooth|unsure which|don'?t know (the )?exact/i.test(
      raw
    )
  ) {
    out.uncertainty.push("tooth_location");
  }
  if (/i'?m not sure|not sure|i guess|maybe/i.test(raw)) {
    if (!out.uncertainty.includes("general")) out.uncertainty.push("general");
  }

  // Emergency signals
  if (
    /can'?t breathe|cannot breathe|trouble breathing|trouble swallowing|can'?t swallow/i.test(
      raw
    )
  ) {
    out.intent = "emergency";
    out.facts.breathingTrouble = /breath/i.test(raw) ? true : null;
    out.facts.swallowingTrouble = /swallow/i.test(raw) ? true : null;
    if (out.facts.breathingTrouble == null && out.facts.swallowingTrouble) {
      out.facts.swallowingTrouble = true;
    }
  }

  // Corrections — allow intervening words ("wait", "sorry") between actually and side.
  const sideCorrection = raw.match(
    /\b(?:actually|i meant|not the|correction)\b[\s\S]{0,48}?\b(?:it'?s\s+)?(?:the\s+)?(?:bottom|lower|top|upper)?\s*(left|right)\b/i
  );
  if (sideCorrection) {
    out.intent = "correction";
    out.corrections.push({
      field: "toothLocation.leftRight",
      previousHint: input.structuredState.locationHint,
      newValue: sideCorrection[1].toLowerCase(),
    });
    out.facts.toothLocation.leftRight = sideCorrection[1].toLowerCase() as
      | "left"
      | "right";
    if (/\b(bottom|lower)\b/i.test(raw)) {
      out.facts.toothLocation.upperLower = "lower";
    }
    if (/\b(top|upper)\b/i.test(raw)) {
      out.facts.toothLocation.upperLower = "upper";
    }
    if (/\bback\b/i.test(raw)) {
      out.facts.toothLocation.frontBack = "back";
    }
  }
  // "wait—it's the bottom left" without "actually"
  if (
    !sideCorrection &&
    /\bwait\b[\s\S]{0,40}?\b(?:bottom|lower|top|upper)?\s*(left|right)\b/i.test(
      raw
    )
  ) {
    const m = raw.match(/\b(left|right)\b/i);
    if (m) {
      out.intent = "correction";
      out.corrections.push({
        field: "toothLocation.leftRight",
        previousHint: input.structuredState.locationHint,
        newValue: m[1].toLowerCase(),
      });
      out.facts.toothLocation.leftRight = m[1].toLowerCase() as "left" | "right";
      if (/\b(bottom|lower)\b/i.test(raw)) {
        out.facts.toothLocation.upperLower = "lower";
      }
    }
  }
  const otherSide = /actually[, ].{0,40}other side|other side/i.test(raw);
  if (otherSide && input.structuredState.locationHint) {
    const hint = input.structuredState.locationHint.toLowerCase();
    const flipped = hint.includes("left")
      ? "right"
      : hint.includes("right")
        ? "left"
        : null;
    if (flipped) {
      out.intent = "correction";
      out.corrections.push({
        field: "toothLocation.leftRight",
        previousHint: input.structuredState.locationHint,
        newValue: flipped,
      });
      out.facts.toothLocation.leftRight = flipped;
    }
  }
  const spellCorrection = raw.match(
    /actually[, ].{0,30}(?:it'?s|spelled?)\s+([A-Za-z](?:\s*[-–,]\s*[A-Za-z])+)/i
  );
  if (spellCorrection || /wrong|incorrect|that'?s not (right|it)/i.test(raw)) {
    if (looksLikeSpelling(raw)) {
      out.intent = "correction";
      out.corrections.push({
        field: "spelledLastName",
        previousHint: null,
        newValue: "spelling_revision",
      });
    }
  }

  // Name — accept leading "First Last," / intro patterns from extractName.
  const name = extractName(raw);
  if (name.first && name.last) {
    out.facts.firstName = name.first;
    out.facts.lastName = name.last;
    if (out.intent === "other") out.intent = "identity";
  }

  // Spelling — only with explicit evidence, or when Aly just asked for spelling.
  if (looksLikeSpelling(raw) || input.previousAction === "ask_last_name_spelling") {
    if (input.previousAction === "ask_last_name_spelling" && !looksLikeSpelling(raw)) {
      // Asked for spelling but utterance lacks letter evidence — may be refusal/filler.
      const normalized = normalizeSpokenSpelling(raw);
      const hasDelim =
        /[-–,.]/.test(raw) || /\bas in\b/i.test(raw) || /[A-Za-z]\s+[A-Za-z]\s+[A-Za-z]/.test(raw);
      if (normalized.letters.length >= 2 && hasDelim && normalized.confidence !== "none") {
        out.facts.containsSpellingContent = true;
        out.facts.spelledLastName = normalized.letters;
        if (out.intent === "other") out.intent = "identity";
      }
    } else if (looksLikeSpelling(raw)) {
      const normalized = normalizeSpokenSpelling(raw);
      if (normalized.letters.length >= 2) {
        out.facts.containsSpellingContent = true;
        out.facts.spelledLastName = normalized.letters;
        if (out.intent === "other") out.intent = "identity";
      }
    }
  }

  // Location — multiple phrasings
  const loc = parseToothLocationParts(raw);
  // "bottom on my right" / "one of the back ones" / "right side hurts"
  if (/\b(bottom|lower)\b/i.test(raw)) loc.vertical = loc.vertical || "lower";
  if (/\b(top|upper)\b/i.test(raw)) loc.vertical = loc.vertical || "upper";
  if (/\bright side\b/i.test(raw)) loc.side = loc.side || "right";
  if (/\bleft side\b/i.test(raw)) loc.side = loc.side || "left";
  if (/back ones?|toward the back|in the back/i.test(raw)) {
    loc.depth = loc.depth || "back";
  }
  if (loc.vertical || loc.side || loc.depth) {
    out.facts.toothLocation = {
      upperLower: loc.vertical || null,
      leftRight: loc.side || null,
      frontBack: loc.depth || null,
    };
    if (out.intent === "other") out.intent = "dental_pain";
  }

  // Pain / sleep
  if (/tooth|teeth|dental|hurt|pain|ache/i.test(raw)) {
    if (out.intent === "other" || out.intent === "identity") {
      out.intent = "dental_pain";
    }
  }
  if (/kept me (up|awake)|woke me up|can'?t sleep|cannot sleep|awake last night/i.test(raw)) {
    out.facts.sleepDisruption = true;
  }
  const duration = raw.match(
    /\b(last night|yesterday|today|this morning|a few days(?: ago)?|this week)\b/i
  );
  if (duration) out.facts.duration = duration[1];

  // Swelling / fever — keyword or yes/no relative to previous ask
  if (/no swelling|without swelling|swelling.?no/i.test(lower)) {
    out.facts.swelling = false;
  } else if (/\bswelling\b/i.test(lower) && !isNegativeUtterance(raw)) {
    out.facts.swelling = true;
  } else if (input.previousAction === "ask_swelling") {
    if (isAffirmativeUtterance(raw)) out.facts.swelling = true;
    else if (isNegativeUtterance(raw)) out.facts.swelling = false;
  }

  if (/no fever/i.test(lower)) out.facts.fever = false;
  else if (/\bfever\b/i.test(lower) && !isNegativeUtterance(raw)) {
    out.facts.fever = true;
  } else if (input.previousAction === "ask_fever") {
    if (isAffirmativeUtterance(raw)) out.facts.fever = true;
    else if (isNegativeUtterance(raw)) out.facts.fever = false;
  }

  // Scheduling
  if (/earliest|asap|as soon|need to be seen soon|soon as possible/i.test(raw)) {
    out.facts.wantsEarliest = true;
    if (out.intent === "other") out.intent = "scheduling";
  }
  if (/short notice/i.test(raw)) {
    out.facts.shortNoticeAvailable = !/\b(no|not|can'?t|cannot)\b.{0,20}short notice/i.test(
      raw
    );
  } else if (
    /i can come|able to come|flexible|come (right )?in/i.test(raw) &&
    (out.facts.wantsEarliest === true ||
      input.previousAction === "ask_combined_scheduling_preference")
  ) {
    out.facts.shortNoticeAvailable = true;
  }

  if (input.previousAction === "ask_combined_scheduling_preference") {
    if (isAffirmativeUtterance(raw) || /yes|yeah|yep|sure/i.test(raw)) {
      out.facts.wantsEarliest = out.facts.wantsEarliest ?? true;
      out.facts.shortNoticeAvailable = out.facts.shortNoticeAvailable ?? true;
    } else if (isNegativeUtterance(raw) && !/short notice|earliest|asap/i.test(raw)) {
      // Ambiguous "no" to compound question — mark uncertainty, don't invent.
      out.uncertainty.push("scheduling_ambiguous_no");
      out.confirmation.no = true;
      out.confirmation.target = "scheduling";
    }
  }

  // Confirmations relative to previous Aly question.
  // Never treat spelling content + "yeah" prefix as a spelling confirmation.
  const target = confirmationTarget(input.previousAction);
  if (
    target &&
    !out.facts.containsSpellingContent &&
    (isAffirmativeUtterance(raw) || isNegativeUtterance(raw))
  ) {
    out.confirmation.yes = isAffirmativeUtterance(raw);
    out.confirmation.no = isNegativeUtterance(raw);
    out.confirmation.target = target;

    if (target === "breathing") {
      // Affirmative to "trouble breathing?" means trouble (bad).
      if (out.confirmation.yes) out.facts.breathingTrouble = true;
      if (out.confirmation.no) out.facts.breathingTrouble = false;
    }
  }

  // Subject change: routine pain → swelling report mid-call
  if (
    input.structuredState.swellingKnown === false &&
    out.facts.swelling === true &&
    input.previousAction &&
    input.previousAction !== "ask_swelling"
  ) {
    out.conversationSignals.callerChangedSubject = true;
  }

  // Deduplicate emotions
  out.emotions = [...new Set(out.emotions)] as SemanticEmotion[];
  return out;
}

function coerceInterpretation(raw: unknown): SemanticTurnInterpretation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const base = emptySemanticInterpretation("openai");
  const intent = String(o.intent || "other") as SemanticIntent;
  base.intent = intent;
  if (Array.isArray(o.emotions)) {
    base.emotions = o.emotions.map((e) => String(e) as SemanticEmotion).slice(0, 6);
  }
  const facts = (o.facts || {}) as Record<string, unknown>;
  const loc = (facts.toothLocation || {}) as Record<string, unknown>;
  base.facts = {
    firstName: facts.firstName == null ? null : String(facts.firstName),
    lastName: facts.lastName == null ? null : String(facts.lastName),
    spelledLastName:
      facts.spelledLastName == null ? null : String(facts.spelledLastName),
    toothLocation: {
      upperLower:
        loc.upperLower === "upper" || loc.upperLower === "lower"
          ? loc.upperLower
          : null,
      leftRight:
        loc.leftRight === "left" || loc.leftRight === "right"
          ? loc.leftRight
          : null,
      frontBack:
        loc.frontBack === "front" || loc.frontBack === "back"
          ? loc.frontBack
          : null,
    },
    swelling: typeof facts.swelling === "boolean" ? facts.swelling : null,
    fever: typeof facts.fever === "boolean" ? facts.fever : null,
    duration: facts.duration == null ? null : String(facts.duration),
    sleepDisruption:
      typeof facts.sleepDisruption === "boolean" ? facts.sleepDisruption : null,
    wantsEarliest:
      typeof facts.wantsEarliest === "boolean" ? facts.wantsEarliest : null,
    shortNoticeAvailable:
      typeof facts.shortNoticeAvailable === "boolean"
        ? facts.shortNoticeAvailable
        : null,
    breathingTrouble:
      typeof facts.breathingTrouble === "boolean"
        ? facts.breathingTrouble
        : null,
    swallowingTrouble:
      typeof facts.swallowingTrouble === "boolean"
        ? facts.swallowingTrouble
        : null,
    containsSpellingContent: Boolean(facts.containsSpellingContent),
  };
  const conf = (o.confirmation || {}) as Record<string, unknown>;
  base.confirmation = {
    yes: Boolean(conf.yes),
    no: Boolean(conf.no),
    target: conf.target == null ? null : String(conf.target),
  };
  if (Array.isArray(o.corrections)) {
    base.corrections = o.corrections
      .filter((c) => c && typeof c === "object")
      .map((c) => {
        const x = c as Record<string, unknown>;
        return {
          field: String(x.field || ""),
          previousHint: x.previousHint == null ? null : String(x.previousHint),
          newValue: String(x.newValue || ""),
        };
      })
      .filter((c) => c.field);
  }
  if (Array.isArray(o.uncertainty)) {
    base.uncertainty = o.uncertainty.map((u) => String(u)).slice(0, 8);
  }
  if (Array.isArray(o.refusals)) {
    base.refusals = o.refusals.map((u) => String(u)).slice(0, 8);
  }
  const sig = (o.conversationSignals || {}) as Record<string, unknown>;
  base.conversationSignals = {
    callerIsFrustrated: Boolean(sig.callerIsFrustrated),
    callerSaysAlreadyAnswered: Boolean(sig.callerSaysAlreadyAnswered),
    callerChangedSubject: Boolean(sig.callerChangedSubject),
    callerAsksWhatHappensNext: Boolean(sig.callerAsksWhatHappensNext),
    callerAsksIfHasAppointment: Boolean(sig.callerAsksIfHasAppointment),
  };
  return base;
}

export function buildSemanticSystemPrompt(): string {
  return [
    "You interpret one dental phone-call turn for FreedomDesk Aly.",
    "Extract what the caller communicated — do not choose the next question.",
    "Handle multiple facts in one utterance, out-of-order answers, yes/no relative to Aly's previous question,",
    "corrections (e.g. actually the other side), uncertainty, refusals, natural prefixes, and spoken spelling.",
    "Set containsSpellingContent true only when the caller is spelling letters.",
    "Never invent clinical diagnoses. Return only JSON matching the schema.",
  ].join(" ");
}

export async function callOpenAiSemanticInterpreter(
  input: SemanticInterpreterInput,
  options: SemanticInterpreterOptions = {}
): Promise<SemanticTurnInterpretation> {
  const apiKey = (options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("semantic_missing_api_key");

  const model = resolveSemanticModel(options.model);
  const timeoutMs = semanticTimeoutMs(options.timeoutMs);
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
        temperature: 0,
        max_tokens: 420,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "semantic_turn_interpretation",
            strict: true,
            schema: SEMANTIC_TURN_JSON_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: buildSemanticSystemPrompt() },
          {
            role: "user",
            content: JSON.stringify({
              utterance: input.utterance.slice(0, 400),
              previousAction: input.previousAction,
              previousQuestion: input.previousQuestion
                ? input.previousQuestion.slice(0, 160)
                : null,
              state: input.structuredState,
              recent: input.recentTurns.slice(-4).map((t) => ({
                speaker: t.speaker,
                text: t.text.slice(0, 100),
              })),
            }),
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`semantic_http_${res.status}`);
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("semantic_empty_content");
    const parsed = coerceInterpretation(JSON.parse(content));
    if (!parsed) throw new Error("semantic_invalid_shape");
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Interpret the latest caller turn.
 * Heuristic-first: skip OpenAI when the heuristic already has a strong reading
 * (corrections, multi-fact, clear yes/no) — removes a full serial model RTT.
 */
export async function interpretSemanticTurn(
  input: SemanticInterpreterInput,
  options: SemanticInterpreterOptions = {}
): Promise<SemanticTurnInterpretation> {
  if (options.interpretFn) {
    const injected = await options.interpretFn(input);
    return { ...injected, source: injected.source || "injected" };
  }

  const heuristic = interpretSemanticTurnHeuristic(input);

  if (options.forceHeuristic || !isSemanticInterpreterEnabled()) {
    return heuristic;
  }

  if (heuristicIsStrong(heuristic)) {
    return { ...heuristic, source: "heuristic_fast" };
  }

  try {
    return await callOpenAiSemanticInterpreter(input, options);
  } catch {
    return heuristic;
  }
}

/** Strong enough to skip a second OpenAI round-trip. */
export function heuristicIsStrong(
  interpretation: SemanticTurnInterpretation
): boolean {
  if (interpretation.intent === "correction" && interpretation.corrections.length) {
    return true;
  }
  if (interpretation.intent === "emergency") return true;
  if (interpretation.facts.containsSpellingContent) return true;
  if (
    interpretation.confirmation.yes ||
    interpretation.confirmation.no
  ) {
    return true;
  }
  if (
    interpretation.conversationSignals.callerAsksWhatHappensNext ||
    interpretation.conversationSignals.callerAsksIfHasAppointment ||
    interpretation.conversationSignals.callerSaysAlreadyAnswered
  ) {
    return true;
  }
  const f = interpretation.facts;
  let n = 0;
  if (f.firstName && f.lastName) n += 1;
  if (f.toothLocation.leftRight || f.toothLocation.upperLower) n += 1;
  if (typeof f.swelling === "boolean") n += 1;
  if (typeof f.wantsEarliest === "boolean") n += 1;
  if (f.sleepDisruption) n += 1;
  return n >= 2;
}
