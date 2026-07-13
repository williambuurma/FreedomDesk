/**
 * Phone-facing intent / urgency categories for live calls and eval.
 * Separates routine dental pain from life-threatening emergency.
 * Does not redefine the upstream conversation engine vocabulary.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import {
  hasLifeThreateningLanguage,
  isDentalPainCall,
  patientText,
  type LiveCallSession,
} from "./callSession.ts";

export type PhoneIntentCategory =
  | "life_threatening_emergency"
  | "urgent_dental_concern"
  | "priority_pain"
  | "routine_pain"
  | "scheduling"
  | "identity"
  | "other";

/** True only for Constitution-level life-threatening signals. */
export function hasLifeThreateningEmergencySignal(
  session: LiveCallSession,
  analysis?: ConversationAnalysis | null
): boolean {
  const text = patientText(session.turns);
  if (hasLifeThreateningLanguage(text)) return true;
  if (session.slots.breathingOk === false) return true;
  if (analysis?.triage?.routingAction === "er_or_on_call_immediate") return true;
  return false;
}

/**
 * Map session + analysis to a phone-facing category.
 * Pain / worry / sleep / swelling alone never become life_threatening_emergency.
 */
export function classifyPhoneIntentCategory(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): PhoneIntentCategory {
  if (hasLifeThreateningEmergencySignal(session, analysis)) {
    return "life_threatening_emergency";
  }

  const dentalPain = isDentalPainCall(analysis, session);
  const elevated =
    session.slots.swelling === true ||
    session.slots.fever === true ||
    analysis.understanding?.symptomDetails?.swelling === true ||
    analysis.understanding?.symptomDetails?.fever === true;

  if (dentalPain && elevated) return "urgent_dental_concern";

  if (
    dentalPain &&
    (session.slots.keptAwake === true ||
      session.tone === "worried_anxious" ||
      session.tone === "pain_discomfort" ||
      /kept me (up|awake)|woke me|worried|awful|severe/i.test(
        patientText(session.turns)
      ))
  ) {
    return "priority_pain";
  }

  if (dentalPain) return "routine_pain";

  const intent = analysis.understanding?.intent;
  if (
    intent === "SCHEDULE_EXISTING" ||
    intent === "RESCHEDULE" ||
    intent === "CONFIRM" ||
    intent === "CANCEL"
  ) {
    return "scheduling";
  }

  if (session.slots.nameCaptured && !session.slots.lastNameConfirmed) {
    return "identity";
  }

  return "other";
}

/** Trace-safe label — never emit raw upstream EMERGENCY for ordinary pain. */
export function phoneIntentForTrace(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): string {
  return classifyPhoneIntentCategory(session, analysis);
}
