/**
 * Live call session — retained turns + adaptive dental intake.
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

/** Soft ceiling only — prevents infinite loops; does not define "enough info". */
export const MAX_FOLLOW_UPS = 10;

/** @deprecated Use isCallActionable — kept for test imports during transition. */
export const LEGACY_MAX_FOLLOW_UPS_THAT_CAUSED_PREMATURE_CLOSE = 3;

export interface IntakeSlots {
  name?: string;
  swelling?: boolean;
  fever?: boolean;
  location?: string;
  onset?: string;
  severity?: string;
  breathingOk?: boolean;
  traumaOrBreak?: boolean;
}

export interface LiveCallSession {
  callSid: string;
  practiceId: string;
  from: string;
  afterHours: boolean;
  greeting: string;
  turns: TranscriptTurn[];
  followUpsAsked: number;
  askedFields: string[];
  slots: IntakeSlots;
  startedAt: string;
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
  return /^(yes|yeah|yep|yup|i do|i have|a little|some|it's|it is)\b/i.test(
    text.trim()
  ) || /\byes\b/i.test(text);
}

function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(no|nope|nah|none|not really|i don't|i do not|nothing)\b/.test(t) ||
    /\bno\b/.test(t) ||
    /no swelling|no fever|don't have|do not have/.test(t)
  );
}

/** Apply the latest patient utterance to intake slots based on what was just asked. */
export function applyUtteranceToSlots(
  session: LiveCallSession,
  utterance: string,
  lastAskedField: string | null
): void {
  const text = utterance.trim();
  const lower = text.toLowerCase();

  if (lastAskedField === "caller.name" || /my name is|this is|i'm|i am/i.test(text)) {
    const named = text.match(
      /(?:my name is|this is|i'm|i am)\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/i
    );
    if (named) session.slots.name = named[1].trim();
    else if (lastAskedField === "caller.name" && /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(text)) {
      session.slots.name = text;
    }
  }

  if (lastAskedField === "pain.swelling" || /swelling/.test(lower)) {
    if (isNegative(text) && (lastAskedField === "pain.swelling" || /no swelling/.test(lower))) {
      session.slots.swelling = false;
    } else if (/swelling/.test(lower) && !isNegative(text)) {
      session.slots.swelling = true;
    } else if (lastAskedField === "pain.swelling") {
      session.slots.swelling = isAffirmative(text);
    }
  }

  if (lastAskedField === "pain.fever" || /fever/.test(lower)) {
    if (isNegative(text) && (lastAskedField === "pain.fever" || /no fever/.test(lower))) {
      session.slots.fever = false;
    } else if (/fever/.test(lower) && !isNegative(text)) {
      session.slots.fever = true;
    } else if (lastAskedField === "pain.fever") {
      session.slots.fever = isAffirmative(text);
    }
  }

  if (lastAskedField === "pain.location") {
    session.slots.location = text;
  } else if (/(upper|lower|top|bottom|left|right|front|back|molar|wisdom)/i.test(text)) {
    session.slots.location = session.slots.location || text;
  }

  if (lastAskedField === "pain.onset") {
    session.slots.onset = text;
  } else if (
    /(last night|yesterday|today|this morning|few days|couple days|week|awake|kept me)/i.test(
      text
    )
  ) {
    session.slots.onset = session.slots.onset || text;
  }

  if (lastAskedField === "pain.severity") {
    session.slots.severity = text;
  } else if (
    /(awful|severe|terrible|can't sleep|kept me up|kept me awake|can't eat|cannot eat)/i.test(
      text
    )
  ) {
    session.slots.severity = session.slots.severity || text;
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
    return existing;
  }

  const greeting = selectGreeting(config, now);
  const from = (input.from || "").trim();
  const session: LiveCallSession = {
    callSid,
    practiceId: config.practiceId,
    from,
    afterHours: isAfterHours(config, now),
    greeting,
    turns: [
      { speaker: "aly", text: greeting },
      { speaker: "patient", text: utterance },
    ],
    followUpsAsked: 0,
    askedFields: [],
    slots: {},
    startedAt: now.toISOString(),
  };

  applyUtteranceToSlots(session, utterance, null);

  // Caller ID — known callback path; do not re-ask unless missing.
  if (from && /^\+?\d{10,15}$/.test(from.replace(/[\s()-]/g, ""))) {
    session.askedFields.push("caller.phone");
  }

  sessions.set(callSid, session);
  return session;
}

export function sessionToTranscript(session: LiveCallSession): MockCallTranscript {
  // Enrich transcript with slot answers so processCallTranscript sees structured facts.
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

/**
 * Actionable dental pain call — enough for front desk to act without re-interviewing.
 * Not satisfied by: reason + Caller ID + denial of breathing/swallowing alone.
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
    session.slots.name ||
    analysis.understanding.callerName ||
    null;
  const phone =
    analysis.understanding.phone ||
    (session.from ? session.from : null);

  if (!isDentalPainCall(analysis, session)) {
    // Non-pain: name + concern is enough for a callback.
    return Boolean(name && (phone || session.askedFields.includes("caller.phone")));
  }

  if (!name) return false;
  if (!phone && !session.askedFields.includes("caller.phone")) return false;

  const hasLocation = Boolean(
    session.slots.location || analysis.understanding.symptomDetails.location
  );
  const hasOnset = Boolean(
    session.slots.onset ||
      analysis.understanding.symptomDetails.duration ||
      /kept me (up|awake)|last night|yesterday|today|days?/i.test(allPatient)
  );
  const hasSeverity = Boolean(
    session.slots.severity ||
      analysis.understanding.symptomDetails.painLevel ||
      /awful|severe|terrible|sleep|eat|awake/i.test(allPatient)
  );
  const swellingKnown = typeof session.slots.swelling === "boolean";
  const feverKnown = typeof session.slots.fever === "boolean";
  const hasTrauma = session.slots.traumaOrBreak === true;

  // Need swelling status + at least two clinical context signals.
  const contextScore =
    (hasLocation ? 1 : 0) +
    (hasOnset ? 1 : 0) +
    (hasSeverity ? 1 : 0) +
    (hasTrauma ? 1 : 0) +
    (feverKnown ? 1 : 0);

  if (!swellingKnown) return false;
  if (contextScore < 2) return false;

  // Swelling or fever → breathing/swallowing must be screened.
  if (
    (session.slots.swelling === true || session.slots.fever === true) &&
    typeof session.slots.breathingOk !== "boolean" &&
    !hasLifeThreateningLanguage(allPatient)
  ) {
    return false;
  }

  return true;
}

/**
 * Adaptive next question — one at a time; never re-ask known slots.
 * Routine toothache does NOT lead with breathing/swallowing.
 */
export function selectNextAsk(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): NextAsk | null {
  if (session.followUpsAsked >= MAX_FOLLOW_UPS) return null;

  const { understanding, triage } = analysis;
  const allPatient = patientText(session.turns);

  if (
    hasLifeThreateningLanguage(allPatient) ||
    triage.routingAction === "er_or_on_call_immediate" ||
    session.slots.breathingOk === false
  ) {
    return null;
  }

  if (isCallActionable(session, analysis)) {
    return null;
  }

  const name = session.slots.name || understanding.callerName;
  const dentalPain = isDentalPainCall(analysis, session);
  const hasSwellingSignal =
    session.slots.swelling === true ||
    understanding.symptomDetails.swelling === true ||
    /\bswelling\b/i.test(allPatient);
  const hasFeverSignal =
    session.slots.fever === true ||
    understanding.symptomDetails.fever === true ||
    /\bfever\b/i.test(allPatient);
  const elevated =
    hasSwellingSignal ||
    hasFeverSignal ||
    triage.urgency === "emergency" ||
    /worse|worsening|spreading|neck/i.test(allPatient);

  // Elevated path — screen airway early when swelling/fever already known.
  if (
    elevated &&
    typeof session.slots.breathingOk !== "boolean" &&
    !session.askedFields.includes("safety.breathing")
  ) {
    return {
      field: "safety.breathing",
      question:
        "Okay — thank you. Are you having any trouble breathing or swallowing?",
    };
  }

  if (!name && !session.askedFields.includes("caller.name")) {
    return {
      field: "caller.name",
      question: dentalPain
        ? "I'm sorry—you sound uncomfortable. May I have your first and last name?"
        : "May I have your first and last name?",
    };
  }

  if (dentalPain) {
    const hasOnset =
      session.slots.onset ||
      understanding.symptomDetails.duration ||
      /kept me (up|awake)|last night|yesterday/i.test(allPatient);
    const hasSeverity =
      session.slots.severity ||
      understanding.symptomDetails.painLevel ||
      /awful|severe|terrible|kept me/i.test(allPatient);
    const hasLocation =
      session.slots.location || understanding.symptomDetails.location;

    if (!hasLocation && !session.askedFields.includes("pain.location")) {
      return {
        field: "pain.location",
        question: "Okay, thank you. Where in your mouth is the pain?",
      };
    }

    if (!hasOnset && !session.askedFields.includes("pain.onset")) {
      return {
        field: "pain.onset",
        question: "When did this start?",
      };
    }

    if (!hasSeverity && !session.askedFields.includes("pain.severity")) {
      return {
        field: "pain.severity",
        question: "Is it keeping you from sleeping or eating?",
      };
    }

    if (
      typeof session.slots.swelling !== "boolean" &&
      !session.askedFields.includes("pain.swelling")
    ) {
      return {
        field: "pain.swelling",
        question: "Have you noticed any swelling on your face or gums?",
      };
    }

    if (
      (session.slots.swelling === true || elevated) &&
      typeof session.slots.fever !== "boolean" &&
      !session.askedFields.includes("pain.fever")
    ) {
      return {
        field: "pain.fever",
        question: "Have you had a fever?",
      };
    }

    if (
      (session.slots.swelling === true || session.slots.fever === true) &&
      typeof session.slots.breathingOk !== "boolean" &&
      !session.askedFields.includes("safety.breathing")
    ) {
      return {
        field: "safety.breathing",
        question: "And just to be safe — any trouble breathing or swallowing?",
      };
    }

    if (
      session.slots.traumaOrBreak !== true &&
      !session.askedFields.includes("pain.context") &&
      !/broken|crown|filling|cracked|trauma/i.test(allPatient)
    ) {
      return {
        field: "pain.context",
        question:
          "Did a tooth break, or did a crown or filling come out — or is it just the ache?",
      };
    }
  }

  if (
    !understanding.phone &&
    !session.from &&
    !session.askedFields.includes("caller.phone")
  ) {
    return {
      field: "caller.phone",
      question: "What's the best number to reach you back on?",
    };
  }

  // Soft stop if we somehow still aren't actionable after many asks.
  return null;
}

export function appendAlyAsk(session: LiveCallSession, ask: NextAsk): void {
  session.turns.push({ speaker: "aly", text: ask.question });
  if (!session.askedFields.includes(ask.field)) {
    session.askedFields.push(ask.field);
  }
  session.followUpsAsked += 1;
}
