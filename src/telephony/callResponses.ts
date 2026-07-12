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
 * Keeps Gather architecture; improves what the caller hears before hangup.
 */
export function composeClosing(input: {
  intent: string;
  urgency: string;
  afterHours: boolean;
  sameDayEmergency?: boolean;
  chiefConcern?: string | null;
  practiceName?: string;
  /** Stronger ER guidance when life-threatening language or fever+swelling. */
  lifeThreatening?: boolean;
  routingAction?: string;
}): string {
  const lifeThreat =
    input.lifeThreatening ||
    input.routingAction === "er_or_on_call_immediate";

  if (lifeThreat) {
    return (
      "Thank you for telling me that. " +
      "Please go to the nearest emergency room or call 911 now if you are having trouble breathing, " +
      "swallowing, or bleeding that will not stop. " +
      "I am also alerting our on-call team. Take care."
    );
  }

  const urgent =
    input.urgency === "emergency" ||
    input.urgency === "urgent" ||
    input.sameDayEmergency;

  if (urgent) {
    if (input.afterHours) {
      return (
        "I'm sorry you're dealing with that. " +
        "I've shared what you told me with our on-call team, and someone will call you back as soon as they can. " +
        "If things get much worse — especially trouble breathing or swallowing — please go to the emergency room. Take care."
      );
    }
    return (
      "I'm sorry you're dealing with that. " +
      "I've shared what you told me with our front desk so we can help you today. " +
      "Someone will follow up with you shortly. Take care."
    );
  }

  if (input.intent === "NEW_PATIENT") {
    return (
      "Wonderful — thanks for reaching out. " +
      "I've shared this with our front desk, and someone will follow up to get you scheduled. " +
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
      "Thanks for calling about that. I've shared the details with our team, " +
      "and someone will follow up with clear next steps. Take care."
    );
  }

  return (
    "Thanks for calling. I've shared this with our front desk, " +
    "and someone will follow up with you. Take care."
  );
}

/** Closing when persist failed — do not claim the office received the call. */
export function composePersistFailureClosing(): string {
  return (
    "Thank you for the details. I'm having a little trouble saving this right now — " +
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
].join(",");
