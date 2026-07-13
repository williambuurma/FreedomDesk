/**
 * Live call session — retained turns + compassionate minimum-sufficient dental intake.
 * Completion requires actionable information, not merely an empty question queue.
 */

import type { MockCallTranscript, TranscriptTurn } from "../conversation/types.ts";
import type { ConversationAnalysis } from "../conversation/engine.ts";
import {
  isAfterHours,
  loadPracticeVoiceConfig,
  selectGreeting,
  type PracticeVoiceConfig,
} from "./practiceConfig.ts";
import {
  classifyConversationTone,
  type ConversationTone,
} from "./conversationTone.ts";
import {
  formatLocationForSpeech,
  isLocationComplete,
  locationQuestionForMissing,
  mergeLocationParts,
  missingLocationDimension,
  parseToothLocationParts,
  type ToothLocationParts,
} from "./toothLocation.ts";
import {
  composeScheduleBridge,
  composeSpokenAsk,
  firstNameFromFull,
  formatSpellingForSpeech,
  maybeAcknowledge,
  spellingToLastName,
} from "./alySpeech.ts";
import {
  MAX_SPELLING_ATTEMPTS,
  normalizeSpokenSpelling,
  parseSpellingCorrection,
  spellingToDisplayName,
} from "./spellingNormalize.ts";

/** Soft ceiling only — prevents infinite loops; does not define "enough info". */
export const MAX_FOLLOW_UPS = 10;

/** Soft max clinical follow-ups after identity is confirmed (routine pain). */
export const ROUTINE_PAIN_MAX_POST_IDENTITY_ASKS = 3;

/** @deprecated Use isCallActionable — kept for test imports during transition. */
export const LEGACY_MAX_FOLLOW_UPS_THAT_CAUSED_PREMATURE_CLOSE = 3;

export interface IntakeSlots {
  /** Explicit identity states — nameCaptured ≠ spelling confirmed. */
  nameCaptured?: boolean;
  lastNameSpellingCaptured?: boolean;
  lastNameConfirmed?: boolean;
  name?: string;
  lastName?: string;
  lastNameSpelling?: string;
  swelling?: boolean;
  fever?: boolean;
  location?: string;
  locationParts?: ToothLocationParts;
  locationConfirmed?: boolean;
  onset?: string;
  severity?: string;
  breathingOk?: boolean;
  traumaOrBreak?: boolean;
  wantsEarliest?: boolean;
  shortNoticeOk?: boolean;
  keptAwake?: boolean;
  /** Noncritical gaps flagged for the team when soft-capped. */
  teamFlags?: string[];
  /** Reason / outcome captured for non-pain completion gate. */
  reasonCaptured?: boolean;
  outcomeCaptured?: boolean;
  /** Spelling normalizer flagged low confidence — re-ask slowly. */
  spellingLowConfidence?: boolean;
  /** Count of spelling asks attempted (initial + retries). */
  spellingAttemptCount?: number;
  /** Exhausted spelling retries — do not ask again. */
  spellingAbandoned?: boolean;
  /** Speak one uncertainty line, then clear. */
  spellingAbandonNeedsAnnounce?: boolean;
}

export interface LiveCallSession {
  callSid: string;
  practiceId: string;
  from: string;
  afterHours: boolean;
  greeting: string;
  turns: TranscriptTurn[];
  followUpsAsked: number;
  /** Clinical asks after name+spelling confirmed (routine pain soft cap). */
  postIdentityAsks: number;
  askedFields: string[];
  slots: IntakeSlots;
  tone: ConversationTone;
  usedOpening: boolean;
  demonstratedUnderstanding: boolean;
  lastAck: string | null;
  /** Soft cap hit — stop noncritical interrogation. */
  routineSoftCapReached?: boolean;
  /** Last selectNextAsk continue/complete reason (dev logs). */
  lastPolicyReason?: string;
  startedAt: string;
}

/** Explicit three-state identity — hearing a name never implies spelling confirmed. */
export function getIdentityState(session: LiveCallSession): {
  nameCaptured: boolean;
  lastNameSpellingCaptured: boolean;
  lastNameConfirmed: boolean;
} {
  return {
    nameCaptured: Boolean(
      session.slots.nameCaptured || session.slots.name
    ),
    lastNameSpellingCaptured: Boolean(
      session.slots.lastNameSpellingCaptured || session.slots.lastNameSpelling
    ),
    lastNameConfirmed: session.slots.lastNameConfirmed === true,
  };
}

/** Safe policy debug — booleans and field names only; no PHI / secrets. */
export function logPolicyDebug(
  event: string,
  session: LiveCallSession,
  extra?: Record<string, string | number | boolean | null | undefined>
): void {
  if (process.env.PHONE_POLICY_DEBUG === "0") return;
  const enabled =
    process.env.PHONE_POLICY_DEBUG === "1" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) return;

  const id = getIdentityState(session);
  const loc = session.slots.locationParts || {};
  const parts = [
    `event=${event}`,
    `CallSid=${session.callSid}`,
    `turn=${session.followUpsAsked}`,
    `tone=${session.tone}`,
    `nameCaptured=${id.nameCaptured}`,
    `lastNameCaptured=${Boolean(session.slots.lastName)}`,
    `lastNameSpellingRequested=${session.askedFields.includes("caller.last_name_spell")}`,
    `lastNameSpellingCaptured=${id.lastNameSpellingCaptured}`,
    `lastNameConfirmed=${id.lastNameConfirmed}`,
    `locV=${Boolean(loc.vertical)}`,
    `locS=${Boolean(loc.side)}`,
    `locD=${Boolean(loc.depth)}`,
    `locConfirmed=${session.slots.locationConfirmed === true}`,
    `swellingKnown=${typeof session.slots.swelling === "boolean"}`,
    `earliestKnown=${typeof session.slots.wantsEarliest === "boolean"}`,
    `shortNoticeKnown=${typeof session.slots.shortNoticeOk === "boolean"}`,
    `postIdentityAsks=${session.postIdentityAsks}`,
    `softCap=${Boolean(session.routineSoftCapReached)}`,
    `reason=${session.lastPolicyReason || "(none)"}`,
  ];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) continue;
      parts.push(`${k}=${v}`);
    }
  }
  console.log(`[phone-policy] ${new Date().toISOString()} ${parts.join(" ")}`);
}

const sessions = new Map<string, LiveCallSession>();

export function resetCallSessionsForTests(): void {
  sessions.clear();
}

export function getCallSession(callSid: string): LiveCallSession | undefined {
  return sessions.get(callSid);
}

export function clearCallSession(callSid: string): void {
  sessions.delete(callSid);
}

function callerUtterance(speechResult?: string, digits?: string): string {
  const speech = (speechResult || "").trim();
  if (speech) return speech;
  const dig = (digits || "").trim();
  if (dig) return `Caller pressed ${dig} on the keypad.`;
  return "";
}

export function patientText(turns: TranscriptTurn[]): string {
  return turns
    .filter((t) => t.speaker === "patient" || t.speaker === "caller")
    .map((t) => t.text)
    .join(" ");
}

/** Life-threatening language — stop gathering and escalate. */
export function hasLifeThreateningLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /trouble breathing|can't breathe|cannot breathe|hard to breathe|difficulty breathing/.test(
      lower
    ) ||
    /trouble swallowing|can't swallow|cannot swallow|airway/.test(lower) ||
    /uncontrolled bleeding|won't stop bleeding|bleeding heavily/.test(lower) ||
    /knocked out|tooth knocked out|facial trauma|broke my jaw/.test(lower)
  );
}

function isAffirmative(text: string): boolean {
  return (
    /^(yes|yeah|yep|yup|i do|i have|a little|some|it's|it is|correct|that's right|that is right|right)\b/i.test(
      text.trim()
    ) || /\b(yes|correct|that's right|that is right)\b/i.test(text)
  );
}

function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(no|nope|nah|none|not really|i don't|i do not|nothing)\b/.test(t) ||
    /\bno\b/.test(t) ||
    /no swelling|no fever|don't have|do not have/.test(t)
  );
}

function extractPersonName(
  text: string,
  lastAskedField: string | null
): string | null {
  const named = text.match(
    /(?:my name is|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/i
  );
  if (named) return named[1].trim();

  // "Hi, I'm William Buurma." / "I'm William Buurma. I have pain…"
  // Never treat emotion words as a name ("I'm worried").
  const emotionFirst =
    /^(worried|nervous|scared|anxious|afraid|concerned|hurting|calling|sorry|fine|okay|ok|here|back)\b/i;
  const iamIntro = text.match(
    /(?:^|hi[,!\s]+|hello[,!\s]+|[.!?]\s*)(?:i'm|i am)\s+([A-Za-z]+)\s+([A-Za-z]+)\b/i
  );
  if (iamIntro && !emotionFirst.test(iamIntro[1])) {
    return `${iamIntro[1]} ${iamIntro[2]}`.trim();
  }

  // Only treat bare "I'm First Last" or bare full name when we just asked for it.
  if (lastAskedField === "caller.name") {
    if (/^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(text.trim())) return text.trim();
    const iam = text.match(/(?:i'm|i am)\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/i);
    if (iam && !emotionFirst.test(iam[1])) return iam[1].trim();
  }
  return null;
}

function lastNameFromFullName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length >= 2 ? parts[parts.length - 1] : parts[0] || "";
}

function captureName(session: LiveCallSession, name: string): void {
  session.slots.name = name;
  session.slots.lastName = lastNameFromFullName(name);
  session.slots.nameCaptured = true;
  // Hearing a full name must NEVER imply spelling confirmation.
  if (session.slots.lastNameConfirmed !== true) {
    session.slots.lastNameConfirmed = false;
  }
}

function refreshTone(session: LiveCallSession, analysis?: ConversationAnalysis): void {
  session.tone = classifyConversationTone({
    patientText: patientText(session.turns),
    intent: analysis?.understanding.intent,
    lifeThreatening: hasLifeThreateningLanguage(patientText(session.turns)),
    swelling: session.slots.swelling ?? null,
    fever: session.slots.fever ?? null,
  });
}

function applyLocationFromText(session: LiveCallSession, text: string): void {
  const incoming = parseToothLocationParts(text);
  if (!incoming.vertical && !incoming.side && !incoming.depth) {
    if (/tooth|molar|pain|side|area/i.test(text)) {
      session.slots.location = session.slots.location || text.trim();
    }
    return;
  }
  session.slots.locationParts = mergeLocationParts(
    session.slots.locationParts,
    incoming
  );
  session.slots.location = formatLocationForSpeech(session.slots.locationParts);
  // Complete volunteered location is accepted — do not force a confirm turn.
  if (isLocationComplete(session.slots.locationParts)) {
    session.slots.locationConfirmed = true;
  }
}

function flagForTeam(session: LiveCallSession, flag: string): void {
  if (!session.slots.teamFlags) session.slots.teamFlags = [];
  if (!session.slots.teamFlags.includes(flag)) {
    session.slots.teamFlags.push(flag);
  }
}

function abandonSpelling(session: LiveCallSession): void {
  session.slots.spellingAbandoned = true;
  session.slots.spellingLowConfidence = false;
  session.slots.lastNameConfirmed = false;
  if (session.slots.lastNameSpelling) {
    session.slots.lastNameSpellingCaptured = true;
  }
  session.slots.spellingAbandonNeedsAnnounce = true;
  flagForTeam(session, "last_name_spelling_needs_confirmation");
  logSpellingProgress(session, { selectedAction: "spelling_abandoned" });
}

export const SPELLING_ABANDON_ANNOUNCE =
  "I may not have every letter exactly right, but I've noted that for the team to confirm with you.";

/** Consume one-shot abandon line for speech (planner or deterministic path). */
export function consumeSpellingAbandonAnnounce(
  session: LiveCallSession
): string | null {
  if (!session.slots.spellingAbandonNeedsAnnounce) return null;
  session.slots.spellingAbandonNeedsAnnounce = false;
  return SPELLING_ABANDON_ANNOUNCE;
}

/** Identity ready to leave the spelling loop (confirmed or abandoned after retries). */
export function identityReadyForIntake(session: LiveCallSession): boolean {
  if (identityConfirmed(session)) return true;
  const id = getIdentityState(session);
  // After retry budget: continue the call even if letters never parsed cleanly.
  return Boolean(id.nameCaptured && session.slots.spellingAbandoned === true);
}

/** Safe spelling-progress log — counts and booleans only; no letters/PHI. */
export function logSpellingProgress(
  session: LiveCallSession,
  extra?: Record<string, string | number | boolean | null | undefined>
): void {
  if (process.env.PHONE_POLICY_DEBUG === "0") return;
  const enabled =
    process.env.PHONE_POLICY_DEBUG === "1" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) return;

  const id = getIdentityState(session);
  const parts = [
    `[spelling]`,
    new Date().toISOString(),
    `CallSid=${session.callSid}`,
    `spellingAttemptCount=${session.slots.spellingAttemptCount || 0}`,
    `spellingConfidence=${
      session.slots.spellingLowConfidence === true
        ? "low"
        : session.slots.lastNameSpellingCaptured
          ? "high_or_medium"
          : "none"
    }`,
    `parsedLetterCount=${
      session.slots.lastNameSpelling
        ? String(session.slots.lastNameSpelling).replace(/[^A-Za-z]/g, "").length
        : 0
    }`,
    `lastNameConfirmed=${id.lastNameConfirmed}`,
    `spellingAbandoned=${Boolean(session.slots.spellingAbandoned)}`,
  ];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) continue;
      parts.push(`${k}=${v}`);
    }
  }
  console.log(parts.join(" "));
}

function applySpellingCapture(
  session: LiveCallSession,
  normalized: ReturnType<typeof normalizeSpokenSpelling>
): void {
  if (normalized.letters.length < 2) return;
  session.slots.lastNameSpelling = normalized.letters;
  session.slots.lastNameSpellingCaptured = true;
  session.slots.spellingLowConfidence =
    normalized.confidence === "low" || normalized.confidence === "none";
  session.slots.lastName =
    spellingToDisplayName(normalized.letters) ||
    spellingToLastName(normalized.letters) ||
    session.slots.lastName;
  session.slots.lastNameConfirmed = false;
  logSpellingProgress(session, {
    spellingConfidence: normalized.confidence,
    ignoredPrefix: Boolean(normalized.ignoredPrefix),
  });
}


/** Apply the latest patient utterance to intake slots based on what was just asked. */
export function applyUtteranceToSlots(
  session: LiveCallSession,
  utterance: string,
  lastAskedField: string | null
): void {
  const text = utterance.trim();
  const lower = text.toLowerCase();

  // Name capture — volunteered or in answer to name ask. Never sets spelling confirmed.
  const maybeName = extractPersonName(text, lastAskedField);
  if (
    maybeName &&
    (lastAskedField === "caller.name" ||
      /my name is|this is/i.test(text) ||
      /(?:^|hi[,!\s]+|hello[,!\s]+)(?:i'm|i am)\s+[A-Za-z]+\s+[A-Za-z]+/i.test(
        text
      ) ||
      /(?:i'm|i am)\s+[A-Za-z]+\s+[A-Za-z]+\s*[.,]/i.test(text))
  ) {
    captureName(session, maybeName);
  }

  if (lastAskedField === "caller.last_name_spell") {
    const normalized = normalizeSpokenSpelling(text);
    if (normalized.letters.length >= 2) {
      applySpellingCapture(session, normalized);
      // Second (final) attempt still low-confidence → abandon; do not loop.
      if (
        (session.slots.spellingAttemptCount || 0) >= MAX_SPELLING_ATTEMPTS &&
        session.slots.spellingLowConfidence === true
      ) {
        abandonSpelling(session);
      }
    } else {
      logSpellingProgress(session, {
        spellingConfidence: "none",
        parseFailed: true,
        parsedLetterCount: 0,
      });
      if ((session.slots.spellingAttemptCount || 0) >= MAX_SPELLING_ATTEMPTS) {
        abandonSpelling(session);
      }
    }
  }

  if (lastAskedField === "caller.last_name_confirm") {
    // Natural correction: "No, the fourth letter is R"
    if (isNegative(text) || /\bletter\b/i.test(text)) {
      const corrected = parseSpellingCorrection(
        text,
        session.slots.lastNameSpelling || ""
      );
      if (corrected && corrected.length >= 2) {
        session.slots.lastNameSpelling = corrected;
        session.slots.lastNameSpellingCaptured = true;
        session.slots.spellingLowConfidence = false;
        session.slots.lastName =
          spellingToDisplayName(corrected) ||
          spellingToLastName(corrected) ||
          session.slots.lastName;
        session.slots.lastNameConfirmed = false;
        logSpellingProgress(session, {
          spellingConfidence: "high",
          correctionApplied: true,
        });
        // Stay on confirm path — next ask should re-confirm once.
        return;
      }
    }

    // Affirmative confirmation — lock identity spelling and advance.
    if (isAffirmative(text)) {
      session.slots.lastNameConfirmed = true;
      session.slots.spellingLowConfidence = false;
      session.slots.spellingAbandoned = false;
      logSpellingProgress(session, {
        selectedAction: "spelling_confirmed",
      });
    } else if (isNegative(text)) {
      session.slots.lastNameConfirmed = false;
      // Retry budget is driven by spelling asks (appendAlyAsk), not confirm rejects.
      if ((session.slots.spellingAttemptCount || 0) >= MAX_SPELLING_ATTEMPTS) {
        abandonSpelling(session);
      } else {
        session.slots.lastNameSpelling = undefined;
        session.slots.lastNameSpellingCaptured = false;
        session.slots.spellingLowConfidence = undefined;
        session.askedFields = session.askedFields.filter(
          (f) =>
            f !== "caller.last_name_spell" && f !== "caller.last_name_confirm"
        );
      }
      logSpellingProgress(session, {
        selectedAction: "spelling_rejected",
      });
    }
  }

  if (
    lastAskedField === "pain.location" ||
    lastAskedField === "pain.location.combined" ||
    lastAskedField === "pain.location.vertical" ||
    lastAskedField === "pain.location.side" ||
    lastAskedField === "pain.location.depth"
  ) {
    applyLocationFromText(session, text);
  } else if (/(upper|lower|top|bottom|left|right|front|back|molar|wisdom)/i.test(text)) {
    applyLocationFromText(session, text);
  }

  if (lastAskedField === "pain.location.confirm") {
    session.slots.locationConfirmed = isAffirmative(text)
      ? true
      : isNegative(text)
        ? false
        : session.slots.locationConfirmed;
    if (session.slots.locationConfirmed === false) {
      session.slots.locationParts = undefined;
      session.slots.location = undefined;
      session.askedFields = session.askedFields.filter(
        (f) => !f.startsWith("pain.location")
      );
    }
  }

  if (lastAskedField === "pain.swelling" || /swelling/.test(lower)) {
    if (
      isNegative(text) &&
      (lastAskedField === "pain.swelling" || /no swelling/.test(lower))
    ) {
      session.slots.swelling = false;
    } else if (/swelling/.test(lower) && !isNegative(text)) {
      session.slots.swelling = true;
    } else if (lastAskedField === "pain.swelling") {
      session.slots.swelling = isAffirmative(text);
    }
  }

  if (lastAskedField === "pain.fever" || /fever/.test(lower)) {
    if (
      isNegative(text) &&
      (lastAskedField === "pain.fever" || /no fever/.test(lower))
    ) {
      session.slots.fever = false;
    } else if (/fever/.test(lower) && !isNegative(text)) {
      session.slots.fever = true;
    } else if (lastAskedField === "pain.fever") {
      session.slots.fever = isAffirmative(text);
    }
  }

  // Urgency context — capture short facts only; never store the whole utterance.
  if (/kept me (up|awake)|can't sleep|cannot sleep|awake last night/i.test(text)) {
    session.slots.keptAwake = true;
  }
  if (lastAskedField === "pain.onset") {
    session.slots.onset = text.slice(0, 80);
  } else {
    const onsetHit = text.match(
      /\b(last night|yesterday|today|this morning|a few days(?: ago)?|a couple days(?: ago)?|this week|last week)\b/i
    );
    if (onsetHit) session.slots.onset = session.slots.onset || onsetHit[1];
  }

  if (
    lastAskedField === "pain.severity" ||
    /\b(awful|severe|terrible|can't eat|cannot eat|throbbing)\b/i.test(text)
  ) {
    if (lastAskedField === "pain.severity") {
      session.slots.severity = text.slice(0, 80);
    } else if (!session.slots.severity) {
      const sev = text.match(/\b(awful|severe|terrible|throbbing)\b/i);
      if (sev) session.slots.severity = sev[1];
    }
  }

  if (
    lastAskedField === "schedule.combined" ||
    lastAskedField === "schedule.earliest"
  ) {
    const mentionsEarliest =
      /earliest|asap|as soon|soon as|today|whenever you can|as soon as possible/i.test(
        text
      );
    const mentionsShort = /short notice/i.test(text);
    const canCome =
      /come (right )?in|come today|flexible|i can come|able to come/i.test(text);

    if (
      mentionsEarliest ||
      (isAffirmative(text) && lastAskedField === "schedule.earliest") ||
      (lastAskedField === "schedule.combined" &&
        /yes|yeah|yep|sure|asap/i.test(text))
    ) {
      session.slots.wantsEarliest = !(
        isNegative(text) &&
        /earliest|asap/i.test(text) &&
        !/short notice/i.test(text)
      );
      if (mentionsEarliest || /asap|yes|yeah|yep|sure/i.test(text)) {
        session.slots.wantsEarliest = true;
      }
    }

    if (mentionsShort) {
      // "short notice no" / "no short notice" / "yes short notice"
      if (
        /\b(no|not|can't|cannot)\b.{0,20}short notice|short notice.{0,12}\b(no|not)\b/i.test(
          text
        )
      ) {
        session.slots.shortNoticeOk = false;
      } else {
        session.slots.shortNoticeOk = true;
      }
    } else if (
      lastAskedField === "schedule.combined" &&
      session.slots.wantsEarliest === true &&
      (canCome || /yes|yeah|yep|sure|i can|able/i.test(text))
    ) {
      session.slots.shortNoticeOk = true;
    }

    if (typeof session.slots.wantsEarliest === "boolean") {
      session.slots.outcomeCaptured = true;
    }
  } else if (/earliest|asap|as soon as possible|soon as you can/i.test(text)) {
    session.slots.wantsEarliest = true;
    session.slots.outcomeCaptured = true;
  }

  if (lastAskedField === "schedule.short_notice") {
    session.slots.shortNoticeOk = isAffirmative(text)
      ? true
      : isNegative(text)
        ? false
        : session.slots.shortNoticeOk;
    if (typeof session.slots.shortNoticeOk === "boolean") {
      session.slots.outcomeCaptured = true;
    }
  }

  if (lastAskedField === "caller.reason") {
    if (text.length >= 3) {
      session.slots.reasonCaptured = true;
      session.slots.outcomeCaptured = true;
    }
  }

  if (lastAskedField === "safety.breathing") {
    session.slots.breathingOk = isNegative(text)
      ? true
      : isAffirmative(text)
        ? false
        : session.slots.breathingOk;
    if (hasLifeThreateningLanguage(text)) session.slots.breathingOk = false;
  }

  if (
    lastAskedField === "pain.context" ||
    /broken|crown off|filling fell|cracked|trauma|hit|accident/i.test(text)
  ) {
    if (/broken|crown|filling|cracked|trauma|hit|accident/i.test(text)) {
      session.slots.traumaOrBreak = true;
    }
  }
}

function lastAskedField(session: LiveCallSession): string | null {
  if (!session.askedFields.length) return null;
  return session.askedFields[session.askedFields.length - 1];
}

function identityConfirmed(session: LiveCallSession): boolean {
  const id = getIdentityState(session);
  return (
    id.nameCaptured &&
    id.lastNameSpellingCaptured &&
    id.lastNameConfirmed
  );
}

function emptySessionFields(
  callSid: string,
  config: PracticeVoiceConfig,
  from: string,
  greeting: string,
  now: Date
): LiveCallSession {
  return {
    callSid,
    practiceId: config.practiceId,
    from,
    afterHours: isAfterHours(config, now),
    greeting,
    turns: [{ speaker: "aly", text: greeting }],
    followUpsAsked: 0,
    postIdentityAsks: 0,
    askedFields: [],
    slots: {},
    tone: "routine_friendly",
    usedOpening: false,
    demonstratedUnderstanding: false,
    lastAck: null,
    startedAt: now.toISOString(),
  };
}

/**
 * Create (or return) a live session before the first caller utterance —
 * used by ConversationRelay `setup` so CallSid / Caller ID / hours are retained.
 */
export function ensureLiveCallSession(input: {
  callSid: string;
  from?: string;
  config?: PracticeVoiceConfig;
  now?: Date;
}): LiveCallSession {
  const now = input.now || new Date();
  const config = input.config || loadPracticeVoiceConfig();
  const callSid = input.callSid || `local_${Date.now()}`;
  const existing = sessions.get(callSid);
  if (existing) {
    if (input.from && !existing.from) existing.from = input.from.trim();
    return existing;
  }

  const greeting = selectGreeting(config, now);
  const from = (input.from || "").trim();
  const session = emptySessionFields(callSid, config, from, greeting, now);

  if (from && /^\+?\d{10,15}$/.test(from.replace(/[\s()-]/g, ""))) {
    session.askedFields.push("caller.phone");
  }

  sessions.set(callSid, session);
  return session;
}

/**
 * Truncate the last Aly turn after a ConversationRelay interrupt.
 * Preserves all intake slots and earlier turns.
 */
export function applyInterruptToSession(
  session: LiveCallSession,
  utteranceUntilInterrupt?: string
): void {
  if (!utteranceUntilInterrupt) return;
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    const turn = session.turns[i];
    if (turn.speaker !== "aly") continue;
    const idx = turn.text.indexOf(utteranceUntilInterrupt);
    if (idx >= 0) {
      turn.text = turn.text.slice(0, idx + utteranceUntilInterrupt.length);
    }
    break;
  }
}

export function createOrUpdateSession(input: {
  callSid: string;
  speechResult?: string;
  digits?: string;
  from?: string;
  config?: PracticeVoiceConfig;
  now?: Date;
}): LiveCallSession | null {
  const utterance = callerUtterance(input.speechResult, input.digits);
  if (!utterance) return null;

  const now = input.now || new Date();
  const config = input.config || loadPracticeVoiceConfig();
  const callSid = input.callSid || `local_${Date.now()}`;
  const existing = sessions.get(callSid);

  if (existing) {
    const asked = lastAskedField(existing);
    existing.turns.push({ speaker: "patient", text: utterance });
    applyUtteranceToSlots(existing, utterance, asked);
    if (input.from && !existing.from) existing.from = input.from.trim();
    refreshTone(existing);
    return existing;
  }

  const greeting = selectGreeting(config, now);
  const from = (input.from || "").trim();
  const session = emptySessionFields(callSid, config, from, greeting, now);
  session.turns.push({ speaker: "patient", text: utterance });

  applyUtteranceToSlots(session, utterance, null);

  if (from && /^\+?\d{10,15}$/.test(from.replace(/[\s()-]/g, ""))) {
    if (!session.askedFields.includes("caller.phone")) {
      session.askedFields.push("caller.phone");
    }
  }

  refreshTone(session);
  sessions.set(callSid, session);
  return session;
}

export function sessionToTranscript(session: LiveCallSession): MockCallTranscript {
  const turns = [...session.turns];
  if (session.slots.name && !turns.some((t) => /my name is/i.test(t.text))) {
    turns.push({
      speaker: "aly",
      text: "May I have your first and last name?",
    });
    turns.push({
      speaker: "patient",
      text: `My name is ${session.slots.name}`,
    });
  }
  if (session.slots.swelling === true) {
    turns.push({ speaker: "patient", text: "I have facial swelling." });
  } else if (session.slots.swelling === false) {
    turns.push({ speaker: "patient", text: "No swelling." });
  }
  if (session.slots.fever === true) {
    turns.push({ speaker: "patient", text: "I have a fever." });
  } else if (session.slots.fever === false) {
    turns.push({ speaker: "patient", text: "No fever." });
  }
  if (session.slots.location) {
    turns.push({
      speaker: "patient",
      text: `The pain is ${session.slots.location}`,
    });
  }
  if (session.slots.onset) {
    turns.push({
      speaker: "patient",
      text: `It started ${session.slots.onset}`,
    });
  }
  if (session.slots.severity) {
    turns.push({
      speaker: "patient",
      text: session.slots.severity,
    });
  }
  if (session.slots.wantsEarliest) {
    turns.push({
      speaker: "patient",
      text: "I'd like the earliest available help.",
    });
  }
  if (session.slots.shortNoticeOk === true) {
    turns.push({
      speaker: "patient",
      text: "I can come in on short notice.",
    });
  }

  return {
    id: `call_twilio_${session.callSid.replace(/\W/g, "_")}`,
    practiceId: session.practiceId,
    scenario: "twilio-inbound-multiturn",
    afterHours: session.afterHours,
    receivedAt: session.startedAt,
    turns,
  };
}

export interface NextAsk {
  field: string;
  question: string;
}

export function isDentalPainCall(
  analysis: ConversationAnalysis,
  session: LiveCallSession
): boolean {
  const u = analysis.understanding;
  const text = patientText(session.turns).toLowerCase();
  return (
    u.intent === "EMERGENCY" ||
    u.symptoms.includes("toothache") ||
    u.symptoms.includes("pain") ||
    /toothache|tooth ache|tooth pain|dental pain|hurts/.test(text)
  );
}

function isElevatedPain(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): boolean {
  const allPatient = patientText(session.turns);
  return (
    session.slots.swelling === true ||
    session.slots.fever === true ||
    analysis.understanding.symptomDetails.swelling === true ||
    analysis.understanding.symptomDetails.fever === true ||
    analysis.triage.urgency === "emergency" ||
    /worse|worsening|spreading|neck|fever|swelling/i.test(allPatient)
  );
}

/**
 * Actionable dental pain call — minimum-sufficient for front desk action.
 * Soft-capped routine calls may complete with teamFlags for missing noncritical fields.
 */
export function isCallActionable(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): boolean {
  const allPatient = patientText(session.turns);
  if (hasLifeThreateningLanguage(allPatient)) return true;
  if (analysis.triage.routingAction === "er_or_on_call_immediate") return true;
  if (session.slots.breathingOk === false) return true;

  const name =
    session.slots.name || analysis.understanding.callerName || null;
  const phone =
    analysis.understanding.phone || (session.from ? session.from : null);

  if (!isDentalPainCall(analysis, session)) {
    const reasonOk =
      session.slots.reasonCaptured === true ||
      (analysis.understanding?.intent &&
        analysis.understanding.intent !== "OTHER") ||
      String(analysis.understanding?.chiefConcern || "").trim().length >= 4 ||
      /cleaning|checkup|check-up|new patient|appointment|reschedule|cancel|insurance|crown|consult|hurt|pain|toothache/i.test(
        allPatient
      );
    const outcomeOk =
      session.slots.outcomeCaptured === true ||
      typeof session.slots.wantsEarliest === "boolean" ||
      /schedule|appoint|come in|earliest|asap|reschedule|cancel|confirm/i.test(
        allPatient
      ) ||
      String(analysis.frontDesk?.recommendedNextStep || "").trim().length >= 4;
    return Boolean(
      name &&
        (phone || session.askedFields.includes("caller.phone")) &&
        reasonOk &&
        outcomeOk
    );
  }

  if (!identityReadyForIntake(session)) return false;
  if (!phone && !session.askedFields.includes("caller.phone")) return false;

  // Soft-capped: identity + callback is enough; missing clinical bits are flagged.
  if (session.routineSoftCapReached) {
    return true;
  }

  const locationOk =
    session.slots.locationConfirmed === true ||
    isLocationComplete(session.slots.locationParts) ||
    Boolean(
      session.slots.location &&
        isLocationComplete(parseToothLocationParts(session.slots.location))
    );

  if (!locationOk) return false;
  if (typeof session.slots.swelling !== "boolean") return false;

  if (typeof session.slots.wantsEarliest !== "boolean") return false;
  if (
    session.slots.wantsEarliest === true &&
    typeof session.slots.shortNoticeOk !== "boolean"
  ) {
    return false;
  }

  if (
    (session.slots.swelling === true || session.slots.fever === true) &&
    typeof session.slots.breathingOk !== "boolean" &&
    !hasLifeThreateningLanguage(allPatient)
  ) {
    return false;
  }

  return true;
}

function baseQuestion(field: string, session: LiveCallSession): string {
  switch (field) {
    case "caller.name":
      return "May I have your first and last name?";
    case "caller.last_name_spell": {
      const first = firstNameFromFull(session.slots.name);
      return first
        ? `Thank you, ${first}. Could you spell your last name for me?`
        : "Could you spell your last name for me?";
    }
    case "caller.last_name_confirm": {
      if (session.slots.spellingLowConfidence) {
        return "I may have missed one letter. Could you spell that once more, a little slowly?";
      }
      const spelling = formatSpellingForSpeech(
        session.slots.lastNameSpelling || ""
      );
      const spokenLast =
        session.slots.lastName ||
        spellingToLastName(session.slots.lastNameSpelling || "");
      return `${spelling}, ${spokenLast}. Did I get that right?`;
    }
    case "pain.location.combined":
      return "Can you tell me where it is—upper or lower, left or right, and more toward the front or the back?";
    case "pain.location.vertical":
      return locationQuestionForMissing("vertical");
    case "pain.location.side":
      return locationQuestionForMissing("side");
    case "pain.location.depth":
      return locationQuestionForMissing("depth");
    case "pain.location.confirm": {
      const phrase = formatLocationForSpeech(
        session.slots.locationParts || {}
      );
      return `Okay—the ${phrase}. Is that right?`;
    }
    case "pain.swelling":
      return "Have you noticed any swelling on your face or gums?";
    case "schedule.combined":
      return "Are you looking for the earliest available appointment, and would you be able to come in on short notice?";
    case "schedule.earliest":
      return (
        `${composeScheduleBridge()} ` +
        "Are you hoping for the earliest available help?"
      );
    case "schedule.short_notice":
      return "Would you be able to come in on short notice if an opening becomes available?";
    case "safety.breathing":
      return "Are you having any trouble breathing or swallowing?";
    case "pain.fever":
      return "Have you had a fever?";
    case "caller.phone":
      return "What's the best number to reach you back on?";
    case "caller.reason":
      return "How can I help you today?";
    case "conversation.recap":
      return "I have the important details you shared.";
    default:
      return "Could you tell me a little more?";
  }
}

function wrapAsk(
  session: LiveCallSession,
  field: string,
  analysis: ConversationAnalysis,
  continueReason: string
): NextAsk {
  refreshTone(session, analysis);
  session.lastPolicyReason = continueReason;
  const question = baseQuestion(field, session);
  const dentalPain = isDentalPainCall(analysis, session);
  const needsOpening =
    !session.usedOpening &&
    (session.tone === "pain_discomfort" ||
      session.tone === "worried_anxious" ||
      session.tone === "urgent_calm" ||
      dentalPain);

  let ack = "";
  const abandonLine = consumeSpellingAbandonAnnounce(session);
  if (abandonLine) {
    ack = abandonLine;
  } else if (!needsOpening && dentalPain) {
    const forceUnderstanding =
      !session.demonstratedUnderstanding &&
      identityReadyForIntake(session) &&
      (field === "pain.swelling" ||
        field === "schedule.earliest" ||
        field === "schedule.combined" ||
        field === "pain.location.combined" ||
        session.postIdentityAsks >= 1);
    ack = maybeAcknowledge({
      tone: session.tone,
      lastAck: session.lastAck,
      forceUnderstanding,
      callSid: session.callSid,
      turnIndex: session.followUpsAsked,
    });
    if (forceUnderstanding && ack) session.demonstratedUnderstanding = true;
    if (ack) session.lastAck = ack;
  }

  const spoken = composeSpokenAsk({
    tone: session.tone,
    question,
    includeOpening: needsOpening,
    ack: ack || undefined,
    callSid: session.callSid,
  });

  if (needsOpening) session.usedOpening = true;

  logPolicyDebug("continue", session, {
    nextAction: field,
    reason: continueReason,
  });

  return { field, question: spoken };
}

/**
 * Adaptive next question — compassionate, minimum-sufficient routine pain path.
 */
export function selectNextAsk(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): NextAsk | null {
  if (session.followUpsAsked >= MAX_FOLLOW_UPS) {
    session.lastPolicyReason = "max_follow_ups";
    logPolicyDebug("complete", session, {
      nextAction: "complete",
      reason: "max_follow_ups",
    });
    return null;
  }

  const { understanding, triage } = analysis;
  const allPatient = patientText(session.turns);
  refreshTone(session, analysis);

  // Sync understanding name into slots without confirming spelling.
  if (!session.slots.name && understanding.callerName) {
    captureName(session, understanding.callerName);
  }

  if (
    hasLifeThreateningLanguage(allPatient) ||
    triage.routingAction === "er_or_on_call_immediate" ||
    session.slots.breathingOk === false
  ) {
    session.lastPolicyReason = "emergency_escalate";
    logPolicyDebug("complete", session, {
      nextAction: "complete",
      reason: "emergency_escalate",
    });
    return null;
  }

  if (isCallActionable(session, analysis)) {
    session.lastPolicyReason = "actionable";
    logPolicyDebug("complete", session, {
      nextAction: "complete",
      reason: "actionable",
    });
    return null;
  }

  const dentalPain = isDentalPainCall(analysis, session);
  const elevated = isElevatedPain(session, analysis);
  const id = getIdentityState(session);

  // Elevated path — screen airway when swelling/fever already known.
  if (
    elevated &&
    (session.slots.swelling === true || session.slots.fever === true) &&
    typeof session.slots.breathingOk !== "boolean" &&
    !session.askedFields.includes("safety.breathing")
  ) {
    return wrapAsk(
      session,
      "safety.breathing",
      analysis,
      "elevated_airway_screen"
    );
  }

  if (!id.nameCaptured) {
    return wrapAsk(session, "caller.name", analysis, "need_name");
  }

  // Spelling loop — max initial + one retry, then abandon and continue.
  if (!session.slots.spellingAbandoned) {
    if (!id.lastNameSpellingCaptured) {
      return wrapAsk(
        session,
        "caller.last_name_spell",
        analysis,
        "need_last_name_spelling"
      );
    }

    if (
      !id.lastNameConfirmed &&
      session.slots.spellingLowConfidence === true &&
      (session.slots.spellingAttemptCount || 0) < MAX_SPELLING_ATTEMPTS
    ) {
      return wrapAsk(
        session,
        "caller.last_name_spell",
        analysis,
        "need_last_name_spelling_retry"
      );
    }

    if (
      !id.lastNameConfirmed &&
      session.slots.spellingLowConfidence === true &&
      (session.slots.spellingAttemptCount || 0) >= MAX_SPELLING_ATTEMPTS
    ) {
      abandonSpelling(session);
    }

    if (!id.lastNameConfirmed && !session.slots.spellingAbandoned) {
      return wrapAsk(
        session,
        "caller.last_name_confirm",
        analysis,
        "need_last_name_confirm"
      );
    }
  }

  if (
    !understanding.phone &&
    !session.from &&
    !session.askedFields.includes("caller.phone")
  ) {
    return wrapAsk(session, "caller.phone", analysis, "need_callback");
  }

  if (dentalPain) {
    // Soft cap — stop noncritical interrogation; flag gaps for the team.
    if (
      !elevated &&
      identityReadyForIntake(session) &&
      session.postIdentityAsks >= ROUTINE_PAIN_MAX_POST_IDENTITY_ASKS
    ) {
      session.routineSoftCapReached = true;
      if (!isLocationComplete(session.slots.locationParts)) {
        flagForTeam(session, "location_incomplete");
      }
      if (typeof session.slots.swelling !== "boolean") {
        flagForTeam(session, "swelling_unknown");
      }
      if (typeof session.slots.wantsEarliest !== "boolean") {
        flagForTeam(session, "earliest_preference_unknown");
        session.slots.wantsEarliest = true;
      }
      if (
        session.slots.wantsEarliest === true &&
        typeof session.slots.shortNoticeOk !== "boolean"
      ) {
        flagForTeam(session, "short_notice_unknown");
        session.slots.shortNoticeOk = true;
      }
      session.lastPolicyReason = "routine_soft_cap";
      logPolicyDebug("complete", session, {
        nextAction: "complete",
        reason: "routine_soft_cap",
      });
      return null;
    }

    // Location — one combined ask; complete volunteered location is already confirmed.
    if (
      !isLocationComplete(session.slots.locationParts) &&
      !session.askedFields.includes("pain.location.combined")
    ) {
      return wrapAsk(
        session,
        "pain.location.combined",
        analysis,
        "need_location_combined"
      );
    }

    // If combined was asked but still incomplete, fall back to missing dimension once.
    if (!isLocationComplete(session.slots.locationParts)) {
      const missing = missingLocationDimension(session.slots.locationParts);
      if (missing) {
        const field =
          missing === "vertical"
            ? "pain.location.vertical"
            : missing === "side"
              ? "pain.location.side"
              : "pain.location.depth";
        if (!session.askedFields.includes(field)) {
          return wrapAsk(
            session,
            field,
            analysis,
            `need_location_${missing}`
          );
        }
      }
    }

    if (
      typeof session.slots.swelling !== "boolean" &&
      !session.askedFields.includes("pain.swelling")
    ) {
      return wrapAsk(session, "pain.swelling", analysis, "need_swelling");
    }

    // Fever only when elevated — not routine.
    if (
      elevated &&
      typeof session.slots.fever !== "boolean" &&
      !session.askedFields.includes("pain.fever") &&
      (session.slots.swelling === true || /\bfever\b|chills/i.test(allPatient))
    ) {
      return wrapAsk(session, "pain.fever", analysis, "elevated_fever");
    }

    if (
      (session.slots.swelling === true || session.slots.fever === true) &&
      typeof session.slots.breathingOk !== "boolean" &&
      !session.askedFields.includes("safety.breathing")
    ) {
      return wrapAsk(
        session,
        "safety.breathing",
        analysis,
        "swelling_or_fever_airway"
      );
    }

    if (
      (typeof session.slots.wantsEarliest !== "boolean" ||
        (session.slots.wantsEarliest === true &&
          typeof session.slots.shortNoticeOk !== "boolean")) &&
      !session.askedFields.includes("schedule.combined")
    ) {
      return wrapAsk(
        session,
        "schedule.combined",
        analysis,
        "need_scheduling_preference"
      );
    }
  } else {
    // Non-pain: do not close without reason / outcome.
    if (
      !session.slots.reasonCaptured &&
      !(
        understanding.intent &&
        understanding.intent !== "OTHER"
      ) &&
      !session.askedFields.includes("caller.reason")
    ) {
      return wrapAsk(session, "caller.reason", analysis, "need_reason");
    }
  }

  session.lastPolicyReason = "no_further_asks";
  logPolicyDebug("complete", session, {
    nextAction: "complete",
    reason: "no_further_asks",
  });
  return null;
}

export function appendAlyAsk(session: LiveCallSession, ask: NextAsk): void {
  session.turns.push({ speaker: "aly", text: ask.question });
  const identityRetry =
    ask.field === "caller.name" ||
    ask.field === "caller.last_name_spell" ||
    ask.field === "caller.last_name_confirm";
  if (!session.askedFields.includes(ask.field) || identityRetry) {
    if (!session.askedFields.includes(ask.field)) {
      session.askedFields.push(ask.field);
    }
  }
  session.followUpsAsked += 1;

  if (ask.field === "caller.last_name_spell") {
    session.slots.spellingAttemptCount =
      (session.slots.spellingAttemptCount || 0) + 1;
    logSpellingProgress(session, { selectedAction: "ask_last_name_spelling" });
  }
  if (ask.field === "caller.last_name_confirm") {
    logSpellingProgress(session, {
      selectedAction: "confirm_last_name_spelling",
    });
  }

  // Soft-cap counts preferred post-identity topics only.
  // Combined location is one clinical ask; combined schedule is one preference ask.
  const softCapFields = new Set([
    "pain.swelling",
    "pain.location.combined",
    "schedule.combined",
    "schedule.earliest",
    "schedule.short_notice",
    "pain.fever",
  ]);
  if (identityReadyForIntake(session) && softCapFields.has(ask.field)) {
    session.postIdentityAsks += 1;
  }
}
