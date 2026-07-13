/**
 * Tone-aware spoken lines for Aly — openings, light acknowledgments, closings.
 * Plain text only (ConversationRelay / Gather). Never diagnoses or promises outcomes.
 */

import type { ConversationTone } from "./conversationTone.ts";
import type { ToothLocationParts } from "./toothLocation.ts";
import { formatLocationForSpeech } from "./toothLocation.ts";

const PAIN_OPENERS = [
  "I'm sorry—you sound really uncomfortable. I'm glad you called. Let me get just a few important details so the team knows how quickly you need help.",
  "I'm sorry that hurts. I'm glad you reached out. I'll get just a few details so the team can see what you need.",
  "That sounds really uncomfortable. Thank you for calling. Let me get a few key details for the team.",
];

const WORRY_OPENERS = [
  "I understand why that would worry you. I'm glad you reached out. Let's get the important details down so the team knows what you need.",
  "I can hear that you're concerned. I'm glad you called. Let's capture the important details for the team.",
];

const ROUTINE_OPENERS = [
  "Absolutely. I'd be happy to help you get started.",
  "Of course—I'd be happy to help.",
];

const URGENT_OPENERS = [
  "Thank you for telling me that. I'm going to get a few important details right away so the team can review this quickly.",
  "I understand. Let me get the key details down so the team knows this needs prompt attention.",
];

const ACKS_PAIN = [
  "Okay, thank you.",
  "Got it.",
  "That helps.",
  "I understand.",
];

const ACKS_ROUTINE = [
  "Perfect.",
  "Got it.",
  "Okay, thank you.",
  "Absolutely.",
];

const UNDERSTANDING_ACK =
  "Okay, thank you. That helps me understand what's going on.";

function pickVariation(options: string[], salt: string): string {
  let hash = 0;
  for (let i = 0; i < salt.length; i += 1) {
    hash = (hash + salt.charCodeAt(i) * (i + 1)) % 997;
  }
  return options[hash % options.length];
}

export function composeToneOpening(input: {
  tone: ConversationTone;
  callSid?: string;
  nextQuestion: string;
}): string {
  const salt = `${input.callSid || ""}:${input.tone}:${input.nextQuestion}`;
  let lead: string;
  if (input.tone === "worried_anxious") {
    lead = pickVariation(WORRY_OPENERS, salt);
  } else if (input.tone === "pain_discomfort") {
    lead = pickVariation(PAIN_OPENERS, salt);
  } else if (input.tone === "urgent_calm") {
    lead = pickVariation(URGENT_OPENERS, salt);
  } else if (input.tone === "emergency_direct") {
    lead = "Thank you for telling me that.";
  } else {
    lead = pickVariation(ROUTINE_OPENERS, salt);
  }
  return `${lead} ${input.nextQuestion}`.replace(/\s+/g, " ").trim();
}

export function maybeAcknowledge(input: {
  tone: ConversationTone;
  lastAck?: string | null;
  forceUnderstanding?: boolean;
  callSid?: string;
  turnIndex?: number;
}): string {
  if (input.forceUnderstanding) {
    return UNDERSTANDING_ACK;
  }

  // Sparse: roughly every other clinical answer, never identical twice in a row.
  const turn = input.turnIndex || 0;
  if (turn % 2 === 0) return "";

  const pool =
    input.tone === "routine_friendly" ? ACKS_ROUTINE : ACKS_PAIN;
  let pick = pickVariation(
    pool,
    `${input.callSid || ""}:${turn}:${input.lastAck || ""}`
  );
  if (input.lastAck && pick === input.lastAck) {
    pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  }
  return pick;
}

export function composeSpokenAsk(input: {
  tone: ConversationTone;
  question: string;
  includeOpening?: boolean;
  ack?: string;
  callSid?: string;
}): string {
  const parts: string[] = [];
  if (input.includeOpening) {
    return composeToneOpening({
      tone: input.tone,
      callSid: input.callSid,
      nextQuestion: input.question,
    });
  }
  if (input.ack) parts.push(input.ack);
  parts.push(input.question);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Spoken letter read-back: "B-U-U-R-M-A". */
export function formatSpellingForSpeech(spelling: string): string {
  const letters = String(spelling || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return letters.split("").join("-");
}

export function spellingToLastName(spelling: string): string {
  const letters = String(spelling || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!letters) return "";
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}

export function firstNameFromFull(full?: string | null): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] || "";
}

export function composePainFactSummary(input: {
  callerName?: string | null;
  locationParts?: ToothLocationParts;
  locationRaw?: string;
  swelling?: boolean | null;
  keptAwake?: boolean;
  worried?: boolean;
  wantsEarliest?: boolean | null;
  shortNoticeOk?: boolean | null;
}): string {
  const bits: string[] = [];
  if (input.locationParts && formatLocationForSpeech(input.locationParts)) {
    bits.push(
      `the pain is in the ${formatLocationForSpeech(input.locationParts)}`
    );
  } else if (input.locationRaw) {
    bits.push(`the pain is ${input.locationRaw}`);
  }
  if (input.keptAwake) bits.push("it kept you awake");
  if (input.worried) bits.push("you're worried");
  if (input.swelling === false) bits.push("you have not noticed swelling");
  else if (input.swelling === true) bits.push("you have noticed some swelling");

  const first = firstNameFromFull(input.callerName);
  const thanks = first ? `Thank you, ${first}.` : "Thank you.";

  let body: string;
  if (!bits.length) {
    body = "I have the details you shared.";
  } else if (bits.length === 1) {
    body = `I have that ${bits[0]}.`;
  } else if (bits.length === 2) {
    body = `I have that ${bits[0]}, and ${bits[1]}.`;
  } else {
    const last = bits[bits.length - 1];
    body = `I have that ${bits.slice(0, -1).join(", ")}, and ${last}.`;
  }

  let preference = "";
  if (input.wantsEarliest === true && input.shortNoticeOk === true) {
    preference =
      " You're looking for the earliest available help and can come on short notice.";
  } else if (input.wantsEarliest === true) {
    preference = " You're looking for the earliest available help.";
  }

  return `${thanks} ${body}${preference}`.replace(/\s+/g, " ").trim();
}

export function composeScheduleBridge(): string {
  return (
    "I have the important details. " +
    "I just want to make sure the team knows how flexible you are if an earlier opening becomes available."
  );
}

export function composeCompassionateClosing(input: {
  tone: ConversationTone;
  intent: string;
  urgency: string;
  afterHours: boolean;
  sameDayEmergency?: boolean;
  lifeThreatening?: boolean;
  routingAction?: string;
  callerName?: string | null;
  locationParts?: ToothLocationParts;
  locationRaw?: string;
  swelling?: boolean | null;
  keptAwake?: boolean;
  wantsEarliest?: boolean | null;
  shortNoticeOk?: boolean | null;
  persisted: boolean;
}): string {
  if (!input.persisted) {
    return (
      "Thank you for the details. I'm having a little trouble saving this right now. " +
      "Please call us back if you don't hear from someone shortly. Take care."
    );
  }

  if (
    input.lifeThreatening ||
    input.routingAction === "er_or_on_call_immediate"
  ) {
    return (
      "Thank you for telling me that. " +
      "Please go to the nearest emergency room or call 911 now if you are having trouble breathing, swallowing, or bleeding that will not stop. " +
      "I'm also alerting our on-call team. Take care."
    );
  }

  const isPain =
    input.tone === "pain_discomfort" ||
    input.tone === "worried_anxious" ||
    input.tone === "urgent_calm" ||
    input.urgency === "emergency" ||
    input.urgency === "urgent" ||
    input.sameDayEmergency;

  if (isPain) {
    const summary = composePainFactSummary({
      callerName: input.callerName,
      locationParts: input.locationParts,
      locationRaw: input.locationRaw,
      swelling: input.swelling,
      keptAwake: input.keptAwake,
      worried: input.tone === "worried_anxious",
      wantsEarliest: input.wantsEarliest,
      shortNoticeOk: input.shortNoticeOk,
    });
    return (
      `${summary} ` +
      "I'm glad you called. I'll make sure those details are saved clearly for the team. Take care."
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  if (input.intent === "NEW_PATIENT") {
    return (
      "Wonderful—thanks for reaching out. " +
      "I've shared this with our front desk, and someone will follow up to get you scheduled. " +
      "We look forward to meeting you. Take care."
    );
  }

  return (
    "Thanks for calling. I've shared this with our front desk, " +
    "and someone will follow up with you. Take care."
  );
}
