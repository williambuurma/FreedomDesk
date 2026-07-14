/**
 * Speech Engine data-fidelity helpers — identity confirmation, phone corrections,
 * and structured staff handoff from call facts.
 *
 * Does not add a parallel pipeline; used by speechEngineBrain persistence.
 */

import type { LatestActionableCall } from "./completedCall.ts";
import {
  formatSpellingForSpeech,
  spellingToLastName,
} from "./alySpeech.ts";
import { normalizeSpokenSpelling } from "./spellingNormalize.ts";
import type {
  CallFactEntry,
  FactConfidence,
  SpeechEngineSessionState,
  StructuredCallFacts,
} from "./speechEngineBrain.ts";

export interface SpeechEngineIdentity {
  firstName?: string;
  /** Bare ASR surname guess — never treated as confirmed alone. */
  lastNameAsr?: string;
  /** Letter sequence, e.g. BUURMA */
  lastNameSpelling?: string;
  /** Surname derived from spelling. */
  lastName?: string;
  nameCaptured: boolean;
  lastNameSpellingCaptured: boolean;
  lastNameConfirmed: boolean;
  spellingAsked: boolean;
  readbackPending: boolean;
  /** Spelling conflicted with ASR surname — ask to repeat; do not lock a bad parse. */
  spellingAmbiguous?: boolean;
}

export interface StructuredStaffHandoff {
  caller: {
    firstName: string | null;
    lastName: string | null;
    displayName: string;
    phone: string | null;
    nameStatus: "confirmed" | "spelled_unconfirmed" | "asr_unconfirmed" | "missing";
  };
  reason: {
    chiefConcern: string | null;
    location: string | null;
    duration: string | null;
    worsening: string | null;
  };
  safety: {
    swelling: boolean | null;
    fever: boolean | null;
    sleepDisruption: string | null;
    notes: string[];
    needsClarification: string[];
  };
  preferences: {
    scheduling: string | null;
    insurance: string | null;
  };
  nextStep: {
    text: string;
    booked: false;
    followupRequested: boolean;
  };
  missing: string[];
  executiveSummary: string;
  commLogNote: string;
}

export function createEmptyIdentity(): SpeechEngineIdentity {
  return {
    nameCaptured: false,
    lastNameSpellingCaptured: false,
    lastNameConfirmed: false,
    spellingAsked: false,
    readbackPending: false,
  };
}

export function isSchedulingPhraseAsName(value: string): boolean {
  const t = String(value || "").trim().toLowerCase();
  if (!t) return true;
  if (
    /^(available|tomorrow|today|earliest|morning|afternoon|evening|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(available|earliest|short notice|come in|open(ing)?s?)\b/.test(t) &&
    !/\b(my name is|i am|i'm)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

export function normalizePhoneValue(raw: unknown): string | null {
  const text = String(raw || "").trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

function isAffirmative(text: string): boolean {
  const t = text.trim();
  // Clear confirmations for a pending identity readback.
  if (
    /^(yes|yeah|yep|yup)([,.]|\s|$)/i.test(t) ||
    /^(correct|right)([,.]|\s|$)/i.test(t) ||
    /^(that's|that is|thats)\s+(correct|right|it)\b/i.test(t) ||
    /^(sounds right|that's it|that is it)\b/i.test(t)
  ) {
    return true;
  }
  return /\b(yes|yeah|yep|yup|correct|that's right|that is right|that's correct|that is correct)\b/i.test(
    t
  );
}

function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/^(no|nope|nah|not really|incorrect|wrong)\b/.test(t)) return true;
  if (/\b(incorrect|wrong|not right|that's not|that is not)\b/.test(t)) {
    return true;
  }
  // Word-boundary "no" — do not match the "no" inside "know".
  return /(^|[^a-z])no([^a-z]|$)/i.test(t);
}

/**
 * First-letter clash between ASR surname and spelled surname (live B→E trap).
 * Does not invent letters from the ASR guess — only flags ambiguity.
 */
export function spellingConflictsWithAsrSurname(
  asrLast: string | undefined,
  spelledLast: string
): boolean {
  const a = String(asrLast || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const b = String(spelledLast || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!a || !b) return false;
  if (a === b) return false;
  return a.charAt(0) !== b.charAt(0);
}

function looksLikeLetterSpelling(text: string): boolean {
  return (
    /(?:[A-Za-z]\s*[-–]\s*){2,}[A-Za-z]/.test(text) ||
    /\b(?:[A-Za-z]\s*,\s*){2,}[A-Za-z]\b/.test(text) ||
    /\b[A-Za-z](?:\s+[A-Za-z]){3,}\b/.test(text)
  );
}

function ordinaryNonSpelling(text: string): boolean {
  return /^(what|huh|hmm|maybe|yes|yeah|no|nope|ok|okay|sure|right)\??$/i.test(
    text.trim()
  );
}

export function extractSpokenFullName(text: string): {
  firstName: string;
  lastName: string;
  full: string;
} | null {
  const named = text.match(
    /(?:my name is|this is|i'm|i am)\s+([A-Za-z]+)\s+([A-Za-z]+)/i
  );
  if (named) {
    const full = `${named[1]} ${named[2]}`;
    if (isSchedulingPhraseAsName(full)) return null;
    return {
      firstName: named[1],
      lastName: named[2],
      full,
    };
  }
  // "William, um, Burma." / "William Burma"
  const loose = text.match(
    /\b([A-Z][a-z]+)\s*(?:,\s*(?:um|uh)\s*,?\s*)?([A-Z][a-z]+)\b/
  );
  if (loose) {
    const full = `${loose[1]} ${loose[2]}`;
    if (isSchedulingPhraseAsName(full)) return null;
    if (
      /^(Upper|Lower|Left|Right|Tooth|Pain|Delta|Healthy)\b/i.test(loose[1])
    ) {
      return null;
    }
    return { firstName: loose[1], lastName: loose[2], full };
  }
  return null;
}

export function composedDisplayName(identity: SpeechEngineIdentity): string {
  const first = identity.firstName || "";
  const last =
    identity.lastNameConfirmed || identity.lastNameSpellingCaptured
      ? identity.lastName || ""
      : identity.lastNameAsr || identity.lastName || "";
  return `${first} ${last}`.trim();
}

export function applyAsrName(
  state: SpeechEngineSessionState,
  parsed: { firstName: string; lastName: string; full: string },
  now = () => new Date().toISOString()
): void {
  if (state.identity.lastNameConfirmed) return;
  if (isSchedulingPhraseAsName(parsed.full)) return;

  state.identity.firstName = parsed.firstName;
  state.identity.lastNameAsr = parsed.lastName;
  state.identity.nameCaptured = true;
  state.identity.lastNameConfirmed = false;
  // Bare ASR surname stays unconfirmed even if model claims "confirmed".
  const stamp = now();
  state.facts.name = {
    value: parsed.full,
    confidence: "high",
    corrected: Boolean(state.facts.name?.corrected),
    updatedAt: stamp,
  };
  state.facts.firstName = {
    value: parsed.firstName,
    confidence: "high",
    updatedAt: stamp,
  };
  state.facts.lastName = {
    value: parsed.lastName,
    confidence: "medium",
    updatedAt: stamp,
  };
}

export function applyLastNameSpelling(
  state: SpeechEngineSessionState,
  lettersRaw: string,
  now = () => new Date().toISOString()
): { ok: boolean; ambiguous?: boolean } {
  const letters = String(lettersRaw || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (letters.length < 2) return { ok: false };

  // Confirmed spelling is locked — late model/tool/duplicate updates cannot reopen it.
  if (state.identity.lastNameConfirmed) {
    if (letters === state.identity.lastNameSpelling) return { ok: true };
    return { ok: false };
  }

  const lastName = spellingToLastName(letters);

  // Live failure: ASR "E-U-U-R-M-A" after surname guess "Burma" → Euurma.
  // Do not invent B from Burma; refuse the conflicting sequence and re-ask.
  if (spellingConflictsWithAsrSurname(state.identity.lastNameAsr, lastName)) {
    state.identity.spellingAmbiguous = true;
    state.identity.lastNameSpellingCaptured = false;
    state.identity.lastNameSpelling = undefined;
    state.identity.lastName = undefined;
    state.identity.lastNameConfirmed = false;
    state.identity.readbackPending = false;
    state.identity.spellingAsked = true;
    return { ok: false, ambiguous: true };
  }

  const first = state.identity.firstName || "";
  const full = `${first} ${lastName}`.trim();
  const stamp = now();

  state.identity.lastNameSpelling = letters;
  state.identity.lastName = lastName;
  state.identity.lastNameSpellingCaptured = true;
  state.identity.lastNameConfirmed = false;
  state.identity.readbackPending = true;
  state.identity.spellingAsked = true;
  state.identity.spellingAmbiguous = false;

  state.facts.lastNameSpelling = {
    value: letters,
    confidence: "high",
    corrected: true,
    updatedAt: stamp,
  };
  state.facts.lastName = {
    value: lastName,
    confidence: "high",
    corrected: true,
    updatedAt: stamp,
  };
  if (full) {
    state.facts.name = {
      value: full,
      confidence: "high",
      corrected: true,
      updatedAt: stamp,
    };
  }
  return { ok: true };
}

export function confirmIdentityReadback(
  state: SpeechEngineSessionState,
  now = () => new Date().toISOString()
): void {
  if (!state.identity.lastNameSpellingCaptured || !state.identity.lastName) {
    return;
  }
  if (state.identity.spellingAmbiguous) return;
  const stamp = now();
  state.identity.lastNameConfirmed = true;
  state.identity.readbackPending = false;
  state.identity.spellingAmbiguous = false;
  const full = composedDisplayName(state.identity);
  state.facts.name = {
    value: full,
    confidence: "confirmed",
    corrected: true,
    updatedAt: stamp,
  };
  state.facts.lastName = {
    value: state.identity.lastName,
    confidence: "confirmed",
    corrected: true,
    updatedAt: stamp,
  };
  if (state.identity.lastNameSpelling) {
    state.facts.lastNameSpelling = {
      value: state.identity.lastNameSpelling,
      confidence: "confirmed",
      corrected: true,
      updatedAt: stamp,
    };
  }
}

export function rejectIdentityReadback(state: SpeechEngineSessionState): void {
  state.identity.lastNameConfirmed = false;
  state.identity.lastNameSpellingCaptured = false;
  state.identity.lastNameSpelling = undefined;
  state.identity.lastName = undefined;
  state.identity.readbackPending = false;
  state.identity.spellingAsked = true;
  state.identity.spellingAmbiguous = false;
}

export function setAuthoritativePhone(
  state: SpeechEngineSessionState,
  phone: string,
  opts: { corrected?: boolean; confidence?: FactConfidence } = {},
  now = () => new Date().toISOString()
): void {
  const normalized = normalizePhoneValue(phone);
  if (!normalized) return;
  const prior = normalizePhoneValue(state.facts.phone?.value);
  const corrected =
    Boolean(opts.corrected) || Boolean(prior && prior !== normalized);
  state.facts.phone = {
    value: normalized,
    confidence: opts.confidence || (corrected ? "confirmed" : "high"),
    corrected: corrected || Boolean(state.facts.phone?.corrected),
    updatedAt: now(),
  };
}

/**
 * Deterministic identity / phone / clarification updates from the latest caller turn.
 * Confirmed spelling cannot be overwritten by a later ASR name guess.
 */
export function processCallerUtteranceForFacts(
  state: SpeechEngineSessionState,
  utterance: string,
  now = () => new Date().toISOString()
): void {
  const text = String(utterance || "").trim();
  if (!text) return;

  const phoneHit = text.match(
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  if (phoneHit) {
    setAuthoritativePhone(state, phoneHit[0], {}, now);
  }

  // Readback confirmation / rejection — bind only while readback is pending.
  if (state.identity.readbackPending) {
    if (isAffirmative(text) && !isNegative(text)) {
      confirmIdentityReadback(state, now);
      return;
    }
    if (isNegative(text)) {
      // Prefer a correction spelling in the same turn when present.
      if (looksLikeLetterSpelling(text)) {
        const normalized = normalizeSpokenSpelling(text);
        if (
          normalized.letters.length >= 2 &&
          normalized.confidence !== "none" &&
          (normalized.confidence === "high" ||
            normalized.confidence === "medium")
        ) {
          rejectIdentityReadback(state);
          applyLastNameSpelling(state, normalized.letters, now);
          return;
        }
      }
      rejectIdentityReadback(state);
      return;
    }
    if (looksLikeLetterSpelling(text)) {
      const normalized = normalizeSpokenSpelling(text);
      if (
        normalized.letters.length >= 2 &&
        normalized.confidence !== "none" &&
        (normalized.confidence === "high" || normalized.confidence === "medium")
      ) {
        applyLastNameSpelling(state, normalized.letters, now);
        return;
      }
    }
  }

  // Spelling capture (required after ASR name; also accept clear letter sequences anytime before confirm)
  const awaitingSpell =
    state.identity.nameCaptured && !state.identity.lastNameSpellingCaptured;
  if (
    (awaitingSpell || looksLikeLetterSpelling(text)) &&
    !state.identity.lastNameConfirmed
  ) {
    const normalized = normalizeSpokenSpelling(text);
    if (
      normalized.letters.length >= 2 &&
      (normalized.confidence === "high" ||
        normalized.confidence === "medium") &&
      !ordinaryNonSpelling(text)
    ) {
      applyLastNameSpelling(state, normalized.letters, now);
      return;
    }
    if (awaitingSpell && looksLikeLetterSpelling(text)) {
      // Ambiguous / low-confidence sequence — keep unconfirmed and re-ask.
      state.identity.spellingAmbiguous = true;
      state.identity.spellingAsked = true;
      return;
    }
  }

  // Bare ASR name — never confirms surname; never overwrites confirmed spelling.
  if (!state.identity.lastNameConfirmed) {
    const parsed = extractSpokenFullName(text);
    if (parsed) {
      if (
        state.identity.lastNameSpellingCaptured &&
        parsed.lastName.toLowerCase() !==
          String(state.identity.lastName || "").toLowerCase()
      ) {
        // Keep spelled value; ignore ASR guess.
      } else if (!state.identity.lastNameSpellingCaptured) {
        applyAsrName(state, parsed, now);
      }
    }
  }

  // Sleep contradiction markers — check negations before positives.
  const lower = text.toLowerCase();
  const deniesSleepDisruption =
    /\b(hasn'?t kept me up|has not kept me up|not kept me (up|awake)|doesn'?t keep me up|didn'?t keep me up)\b/.test(
      lower
    );
  const reportsSleepDisruption =
    !deniesSleepDisruption &&
    /\b(kept me (up|awake)|can'?t sleep|couldn'?t sleep)\b/.test(lower);

  if (reportsSleepDisruption) {
    const prior = state.facts.sleepDisruption?.value;
    if (
      prior &&
      /hasn'?t kept|not kept|doesn'?t keep|no sleep|not disrupting/i.test(
        String(prior)
      )
    ) {
      state.facts.sleepDisruption = {
        value: "Needs clarification",
        confidence: "medium",
        corrected: true,
        updatedAt: now(),
      };
      appendNeedsClarification(state, "sleep disruption", now);
    } else {
      state.facts.sleepDisruption = {
        value: "Kept caller awake",
        confidence: "high",
        updatedAt: now(),
      };
    }
  } else if (deniesSleepDisruption) {
    const prior = state.facts.sleepDisruption?.value;
    if (
      prior &&
      /kept/i.test(String(prior)) &&
      !/clarification/i.test(String(prior))
    ) {
      state.facts.sleepDisruption = {
        value: "Needs clarification",
        confidence: "medium",
        corrected: true,
        updatedAt: now(),
      };
      appendNeedsClarification(state, "sleep disruption", now);
    } else {
      state.facts.sleepDisruption = {
        value: "Not disrupting sleep",
        confidence: "high",
        updatedAt: now(),
      };
    }
  }

  if (/\b(getting worse|worsening|worse)\b/.test(lower)) {
    state.facts.worsening = {
      value: true,
      confidence: "high",
      updatedAt: now(),
    };
  }
}

function appendNeedsClarification(
  state: SpeechEngineSessionState,
  item: string,
  now: () => string
): void {
  const existing = Array.isArray(state.facts.needsClarification?.value)
    ? (state.facts.needsClarification!.value as string[])
    : [];
  if (existing.includes(item)) return;
  state.facts.needsClarification = {
    value: [...existing, item],
    confidence: "high",
    updatedAt: now(),
  };
}

export function nextIdentityPrompt(state: SpeechEngineSessionState): string | null {
  const id = state.identity;
  if (!id.nameCaptured || !id.firstName) {
    return "Thanks for calling. Can I get your first and last name?";
  }
  if (!id.lastNameSpellingCaptured) {
    id.spellingAsked = true;
    if (id.spellingAmbiguous) {
      return "I want to make sure I have your last name right. Could you spell it again, letter by letter?";
    }
    return "Thanks. Could you spell your last name for me, letter by letter?";
  }
  if (!id.lastNameConfirmed) {
    id.readbackPending = true;
    const first = id.firstName;
    const last = id.lastName || "";
    const spelling = formatSpellingForSpeech(id.lastNameSpelling || "");
    return `I have ${first} ${last}, ${spelling}. Is that correct?`;
  }
  return null;
}

export function identityStatusLabel(
  identity: SpeechEngineIdentity
): StructuredStaffHandoff["caller"]["nameStatus"] {
  if (identity.lastNameConfirmed) return "confirmed";
  if (identity.lastNameSpellingCaptured) return "spelled_unconfirmed";
  if (identity.nameCaptured) return "asr_unconfirmed";
  return "missing";
}

function factString(entry: CallFactEntry | undefined): string | null {
  if (!entry || entry.value == null) return null;
  const s = String(entry.value).trim();
  return s || null;
}

function factBool(entry: CallFactEntry | undefined): boolean | null {
  if (!entry || typeof entry.value !== "boolean") return null;
  return entry.value;
}

export function buildStructuredStaffHandoff(
  state: SpeechEngineSessionState
): StructuredStaffHandoff {
  const id = state.identity;
  const nameStatus = identityStatusLabel(id);
  const displayName =
    nameStatus === "confirmed" || nameStatus === "spelled_unconfirmed"
      ? composedDisplayName(id)
      : nameStatus === "asr_unconfirmed"
        ? `${id.firstName || ""} ${id.lastNameAsr || ""}`.trim() || "Caller"
        : "Caller";

  const phone = normalizePhoneValue(state.facts.phone?.value);
  const chief =
    factString(state.facts.chiefConcern) ||
    (state.facts.painLocation ? "Tooth pain" : null);
  const location = factString(state.facts.painLocation);
  const duration = factString(state.facts.duration);
  const worsening =
    state.facts.worsening?.value === true
      ? "Worsening"
      : state.facts.worsening?.value === false
        ? "Not worsening"
        : null;
  const swelling = factBool(state.facts.swelling);
  const fever = factBool(state.facts.fever);
  const sleep = factString(state.facts.sleepDisruption);
  const scheduling =
    factString(state.facts.availability) ||
    (state.facts.wantsEarliest?.value === true ? "Earliest available" : null);
  const insurance = factString(state.facts.insurance);
  const clarification = Array.isArray(state.facts.needsClarification?.value)
    ? (state.facts.needsClarification!.value as string[])
    : [];

  const safetyNotes: string[] = [];
  if (swelling === true) safetyNotes.push("Facial swelling reported");
  if (swelling === false) safetyNotes.push("No swelling reported");
  if (fever === true) safetyNotes.push("Fever reported");
  if (fever === false) safetyNotes.push("No fever reported");
  if (sleep) safetyNotes.push(`Sleep: ${sleep}`);

  const missing: string[] = [];
  if (nameStatus === "missing") missing.push("caller.name");
  else if (nameStatus !== "confirmed") missing.push("caller.name_confirmation");
  if (!phone) missing.push("caller.phone");
  if (fever === null && (swelling === true || chief)) {
    missing.push("fever (unknown)");
  }
  if (!insurance) {
    // Do not invent — only list if clinically/office relevant and never discussed.
    // Staff handoff labels unknown insurance only when other intake is present.
    if (chief || swelling !== null) missing.push("insurance (unknown)");
  }

  const outcome = factString(state.facts.requestedOutcome);
  const nextText = state.followupRequested
    ? outcome
      ? `Office follow-up requested: ${outcome}. Not booked.`
      : "Office follow-up requested. Not booked."
    : outcome
      ? `Caller requested: ${outcome}. Not booked.`
      : "Review call details and follow up. Not booked.";

  const callerLine =
    nameStatus === "confirmed"
      ? `${displayName} (confirmed${
          id.lastNameSpelling
            ? `; ${formatSpellingForSpeech(id.lastNameSpelling)}`
            : ""
        })`
      : nameStatus === "spelled_unconfirmed"
        ? `${displayName} (spelled, awaiting confirmation)`
        : nameStatus === "asr_unconfirmed"
          ? `${displayName} (ASR unconfirmed — spelling needed)`
          : "Caller (name missing)";

  const reasonParts = [chief, location, duration, worsening].filter(Boolean);
  const safetyParts: string[] = [];
  if (swelling === true) safetyParts.push("swelling: yes");
  else if (swelling === false) safetyParts.push("swelling: no");
  else safetyParts.push("swelling: unknown");
  if (fever === true) safetyParts.push("fever: yes");
  else if (fever === false) safetyParts.push("fever: no");
  else safetyParts.push("fever: unknown");
  if (sleep) safetyParts.push(`sleep: ${sleep}`);
  if (clarification.length) {
    safetyParts.push(`needs clarification: ${clarification.join(", ")}`);
  }

  const prefParts: string[] = [];
  if (scheduling) prefParts.push(scheduling);
  if (insurance) prefParts.push(`insurance: ${insurance}`);

  const executiveSummary = [
    `Caller: ${callerLine}${phone ? `; phone ${phone}` : ""}`,
    `Reason: ${reasonParts.join("; ") || "Not stated clearly"}`,
    `Safety: ${safetyParts.join("; ")}`,
    prefParts.length ? `Preferences: ${prefParts.join("; ")}` : null,
    `Next: ${nextText}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const commLogNote = [
    `CALLER: ${callerLine}`,
    phone ? `PHONE: ${phone}` : "PHONE: unknown",
    `REASON: ${reasonParts.join("; ") || "unknown"}`,
    `SAFETY: ${safetyParts.join("; ")}`,
    prefParts.length ? `PREFERENCES: ${prefParts.join("; ")}` : null,
    `NEXT: ${nextText}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    caller: {
      firstName: id.firstName || null,
      lastName:
        id.lastNameConfirmed || id.lastNameSpellingCaptured
          ? id.lastName || null
          : id.lastNameAsr || null,
      displayName: displayName || "Caller",
      phone,
      nameStatus,
    },
    reason: {
      chiefConcern: chief,
      location,
      duration,
      worsening,
    },
    safety: {
      swelling,
      fever,
      sleepDisruption: sleep,
      notes: safetyNotes,
      needsClarification: clarification,
    },
    preferences: {
      scheduling,
      insurance,
    },
    nextStep: {
      text: nextText,
      booked: false,
      followupRequested: state.followupRequested,
    },
    missing,
    executiveSummary,
    commLogNote,
  };
}

/**
 * Overlay structured Speech Engine facts onto the existing completed-call artifact.
 * Keeps Practice Brain / arbitration; makes staff-facing fields fact-authoritative.
 */
export function applyStructuredFactsToArtifact(
  state: SpeechEngineSessionState,
  artifact: LatestActionableCall
): LatestActionableCall {
  const handoff = buildStructuredStaffHandoff(state);
  const patientName =
    handoff.caller.nameStatus === "missing"
      ? "Caller"
      : handoff.caller.displayName;
  const phone = handoff.caller.phone || "";

  const intel = {
    ...artifact.operatingIntelligence,
    patientName,
    phone,
    chiefConcern:
      handoff.reason.chiefConcern ||
      artifact.operatingIntelligence.chiefConcern,
    executiveSummary: handoff.executiveSummary,
    openDentalCommLogNote: handoff.commLogNote,
    recommendedNextAction: handoff.nextStep.text,
    missingForGoodDecision: handoff.missing,
    insuranceProgram: handoff.preferences.insurance
      ? handoff.preferences.insurance
      : null,
    followUpTasks: handoff.nextStep.followupRequested
      ? [
          {
            type: "office_callback",
            assignee: "front_desk",
            priority: artifact.operatingIntelligence.immediateAttention
              ? "high"
              : "medium",
            notes: handoff.nextStep.text,
          },
        ]
      : artifact.operatingIntelligence.followUpTasks,
  };

  const callSummary = {
    ...artifact.callSummary,
    patientName,
    phone,
    chiefConcern: intel.chiefConcern,
    executiveSummary: intel.executiveSummary,
    openDentalCommLogNote: intel.openDentalCommLogNote,
    recommendedNextStep: intel.recommendedNextAction,
    missingInformation: intel.missingForGoodDecision,
    insuranceProgram: intel.insuranceProgram,
    followUpTasks: intel.followUpTasks,
    conversationId: state.conversationId || null,
  };

  const decisionCard = {
    ...artifact.decisionCard,
    subject: patientName !== "Caller" ? patientName : artifact.decisionCard.subject,
    situation: intel.executiveSummary,
    recommendation: intel.recommendedNextAction,
    whyText: intel.executiveSummary,
    callSummary,
    operatingIntelligence: intel,
  };

  return {
    ...artifact,
    callId: state.callSid,
    recommendedNextStep: handoff.nextStep.text,
    callSummary,
    operatingIntelligence: intel,
    decisionCard,
  };
}

export function hasMeaningfulConversation(
  state: SpeechEngineSessionState
): boolean {
  const patientTurns = state.turns.filter(
    (t) => t.speaker === "patient" || t.speaker === "caller"
  );
  if (patientTurns.some((t) => String(t.text || "").trim().length >= 8)) {
    return true;
  }
  return Object.keys(state.facts).length > 0;
}

export function syncIdentityFromFacts(state: SpeechEngineSessionState): void {
  const name = state.facts.name?.value;
  if (typeof name === "string" && name.trim() && !state.identity.nameCaptured) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && !isSchedulingPhraseAsName(name)) {
      state.identity.firstName = parts[0];
      state.identity.lastNameAsr = parts.slice(1).join(" ");
      state.identity.nameCaptured = true;
    }
  }
  const spelling = state.facts.lastNameSpelling?.value;
  if (typeof spelling === "string" && spelling.replace(/[^A-Za-z]/g, "").length >= 2) {
    if (!state.identity.lastNameSpellingCaptured) {
      applyLastNameSpelling(state, spelling);
    }
  }
  if (
    state.facts.name?.confidence === "confirmed" &&
    state.identity.lastNameSpellingCaptured
  ) {
    state.identity.lastNameConfirmed = true;
    state.identity.readbackPending = false;
  }
}
