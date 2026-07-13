/**
 * Deterministic conversation-tone classification for Aly's wording.
 * Does not diagnose; adapts acknowledgment style only.
 */

export type ConversationTone =
  | "routine_friendly"
  | "pain_discomfort"
  | "worried_anxious"
  | "urgent_calm"
  | "emergency_direct";

export function classifyConversationTone(input: {
  patientText: string;
  intent?: string;
  lifeThreatening?: boolean;
  swelling?: boolean | null;
  fever?: boolean | null;
}): ConversationTone {
  const text = String(input.patientText || "").toLowerCase();

  if (
    input.lifeThreatening ||
    /trouble breathing|can't breathe|cannot breathe|difficulty breathing|trouble swallowing|can't swallow|uncontrolled bleeding|knocked out|facial trauma/.test(
      text
    )
  ) {
    return "emergency_direct";
  }

  if (
    input.swelling === true ||
    input.fever === true ||
    /swelling|fever|getting worse|worsening|spreading|rapid/.test(text)
  ) {
    return "urgent_calm";
  }

  if (
    /worried|worry|nervous|scared|anxious|afraid|concerned|freaking out/.test(
      text
    )
  ) {
    return "worried_anxious";
  }

  if (
    /toothache|tooth ache|tooth pain|dental pain|hurts|pain|kept me (up|awake)|can't sleep|cannot sleep|can't eat|cannot eat|awful|throbbing/.test(
      text
    ) ||
    input.intent === "EMERGENCY"
  ) {
    return "pain_discomfort";
  }

  return "routine_friendly";
}
