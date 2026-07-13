/**
 * Progressive conversation stages for Hybrid Aly.
 * Understand → Clarify → Resolve. Not a rigid script — guides sequencing.
 */

import type { ConversationOptions } from "./allowedActions.ts";
import { getIdentityState, type LiveCallSession } from "./callSession.ts";

export type CallStage = "understand" | "clarify" | "resolve";

/** Selective progress bridges — used sparingly at stage transitions. */
export const PROGRESS_CLINICAL_BRIDGE =
  "Thank you—that gives me the important clinical details.";

export const PROGRESS_URGENCY_CLARIFIED =
  "Thank you—that helps clarify how urgently the team should look at this.";

export const PROGRESS_SCHEDULING_BRIDGE =
  "I just need one scheduling detail so the team knows how flexible you are.";

export const PROGRESS_FEW_DETAILS =
  "I only need a few important details so the team knows how to help.";
/**
 * Infer the conversational stage from deterministic state.
 * - understand: acknowledge problem + secure usable identity
 * - clarify: only material facts that change the next practice action
 * - resolve: recap, confirm next step, close after persistence
 */
export function inferCallStage(
  session: LiveCallSession,
  options: ConversationOptions
): CallStage {
  if (options.actionable || options.hardRequiredAction === "emergency_escalation") {
    return "resolve";
  }

  const id = getIdentityState(session);
  const spellingDone =
    id.lastNameConfirmed === true || session.slots.spellingAbandoned === true;
  const identityReady = id.nameCaptured && spellingDone;

  if (!identityReady) return "understand";

  // Identity ready but still collecting material clinical / scheduling facts.
  const stillClarifying =
    options.missingMaterialFacts.some((f) =>
      ["swelling", "scheduling_preference", "tooth_location", "callback_phone"].includes(
        f
      )
    ) ||
    (options.dentalPain &&
      (typeof session.slots.swelling !== "boolean" ||
        typeof session.slots.wantsEarliest !== "boolean"));

  if (stillClarifying) return "clarify";
  return "resolve";
}

/**
 * Whether this turn should include a progress bridge (selective, not every turn).
 */
export function shouldIncludeProgressLanguage(
  session: LiveCallSession,
  options: ConversationOptions,
  selectedAction: string
): boolean {
  if (
    selectedAction === "ask_last_name_spelling" &&
    !session.usedOpening &&
    inferCallStage(session, options) === "understand"
  ) {
    return true;
  }
  // After swelling is known, bridge into the single scheduling ask.
  if (
    selectedAction === "ask_combined_scheduling_preference" &&
    typeof session.slots.swelling === "boolean"
  ) {
    return true;
  }
  return false;
}

/**
 * Deterministic progress line(s) for fallback speech.
 * Planner may phrase equivalently; guardrails do not require exact match.
 */
export function progressBridgeForAction(
  selectedAction: string,
  session: LiveCallSession
): string {
  if (selectedAction === "ask_combined_scheduling_preference") {
    const parts: string[] = [];
    if (typeof session.slots.swelling === "boolean") {
      parts.push(PROGRESS_URGENCY_CLARIFIED);
    }
    parts.push(PROGRESS_SCHEDULING_BRIDGE);
    return parts.join(" ");
  }
  if (selectedAction === "ask_last_name_spelling" && !session.usedOpening) {
    return PROGRESS_FEW_DETAILS;
  }
  return "";
}

/** Emotional cue labels for traces — no PHI. */
export function emotionalCuesFromSession(session: LiveCallSession): string[] {
  const cues: string[] = [];
  if (session.tone === "worried_anxious") cues.push("worried");
  if (session.tone === "pain_discomfort") cues.push("pain_discomfort");
  if (session.tone === "urgent_calm") cues.push("urgent");
  if (session.tone === "emergency_direct") cues.push("emergency");
  if (session.slots.keptAwake) cues.push("sleep_disruption");
  return cues;
}
