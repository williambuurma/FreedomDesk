/**
 * Natural spoken lines for Aly — retry prompts and intent-aware closings.
 * Greeting composition lives in practiceConfig (practice name + hours).
 * Never identifies as AI.
 */

import type { PracticeVoiceConfig } from "./practiceConfig.ts";

export function composeMissedInputPrompt(config: PracticeVoiceConfig): string {
  const agent = (config.agentName || "Aly").trim();
  return `Sorry about that — I didn't quite catch it. This is ${agent}. What can I help you with?`;
}

export function composeEmptyHangup(): string {
  return "Thanks for calling. Feel free to call back anytime. Take care.";
}

/**
 * Intent-aware closing after the pipeline runs — empathy + clear next step.
 * Keeps the single-Gather architecture; improves what the caller hears before hangup.
 */
export function composeClosing(input: {
  intent: string;
  urgency: string;
  afterHours: boolean;
  sameDayEmergency?: boolean;
  chiefConcern?: string | null;
  practiceName?: string;
}): string {
  const urgent =
    input.urgency === "emergency" ||
    input.urgency === "urgent" ||
    input.sameDayEmergency;

  if (urgent) {
    if (input.afterHours) {
      return (
        "I'm sorry you're dealing with that. " +
        "I've flagged this for our on-call team, and someone will call you back as soon as they can. " +
        "If your symptoms get much worse, or you have trouble breathing or swelling that affects your breathing, " +
        "please go to the emergency room. Take care."
      );
    }
    return (
      "I'm sorry you're dealing with that. " +
      "I've shared this with our front desk so we can get you help today. " +
      "Someone will follow up with you shortly. Take care."
    );
  }

  if (input.intent === "NEW_PATIENT") {
    return (
      "Wonderful — thanks for reaching out. " +
      "I've passed this to our front desk, and someone will follow up to get you scheduled. " +
      "We look forward to meeting you. Take care."
    );
  }

  if (
    input.intent === "SCHEDULE_EXISTING" ||
    input.intent === "TREATMENT_SCHEDULE" ||
    input.intent === "RESCHEDULE"
  ) {
    return (
      "Got it. I've shared this with our front desk, and someone will follow up to get you on the schedule. " +
      "Take care."
    );
  }

  if (input.intent === "INSURANCE" || input.intent === "BILLING") {
    return (
      "Thanks for calling about that. I've passed the details to our team, " +
      "and someone will follow up with clear next steps. Take care."
    );
  }

  return (
    "Thanks for calling. I've shared this with our front desk, " +
    "and someone will follow up with you. Take care."
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
].join(",");
