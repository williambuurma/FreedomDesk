/**
 * Natural spoken lines for Aly — retry prompts and intent-aware closings.
 * Greeting composition lives in practiceConfig (practice name + hours).
 * Never identifies as AI.
 */

import type { PracticeVoiceConfig } from "./practiceConfig.ts";
import type { ConversationTone } from "./conversationTone.ts";
import type { ToothLocationParts } from "./toothLocation.ts";
import { composeCompassionateClosing } from "./alySpeech.ts";

export function composeMissedInputPrompt(config: PracticeVoiceConfig): string {
  const agent = (config.agentName || "Aly").trim();
  return `Sorry about that—I didn't quite catch it. This is ${agent}. What can I help you with?`;
}

export function composeEmptyHangup(): string {
  return "Thanks for calling. Feel free to call back anytime. Take care.";
}

/**
 * Intent-aware closing after the pipeline runs — empathy + clear next step.
 * Claims the team has details only when persisted=true.
 */
export function composeClosing(input: {
  intent: string;
  urgency: string;
  afterHours: boolean;
  sameDayEmergency?: boolean;
  chiefConcern?: string | null;
  practiceName?: string;
  lifeThreatening?: boolean;
  routingAction?: string;
  tone?: ConversationTone;
  callerName?: string | null;
  locationParts?: ToothLocationParts;
  locationRaw?: string;
  swelling?: boolean | null;
  keptAwake?: boolean;
  wantsEarliest?: boolean | null;
  shortNoticeOk?: boolean | null;
  /** Must be true before claiming the message was shared/captured. */
  persisted?: boolean;
}): string {
  return composeCompassionateClosing({
    tone: input.tone || "routine_friendly",
    intent: input.intent,
    urgency: input.urgency,
    afterHours: input.afterHours,
    sameDayEmergency: input.sameDayEmergency,
    lifeThreatening: input.lifeThreatening,
    routingAction: input.routingAction,
    callerName: input.callerName,
    locationParts: input.locationParts,
    locationRaw: input.locationRaw,
    swelling: input.swelling,
    keptAwake: input.keptAwake,
    wantsEarliest: input.wantsEarliest,
    shortNoticeOk: input.shortNoticeOk,
    persisted: input.persisted !== false,
  });
}

/** Closing when persist failed — do not claim the office received the call. */
export function composePersistFailureClosing(): string {
  return (
    "Thank you for the details. I'm having a little trouble saving this right now—" +
    "please call us back if you don't hear from someone shortly. Take care."
  );
}

/** Dental speech hints for Gather — improves recognition without changing architecture. */
export const DENTAL_SPEECH_HINTS = [
  "toothache",
  "tooth pain",
  "swelling",
  "broken tooth",
  "crown",
  "cleaning",
  "new patient",
  "insurance",
  "reschedule",
  "emergency",
  "root canal",
  "extraction",
  "upper",
  "lower",
  "left",
  "right",
].join(",");
