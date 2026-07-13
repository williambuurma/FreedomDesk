/**
 * Guardrails for Hybrid Aly — allow-list membership + safety/truth.
 * Does not require equality to a previously forced field.
 */

import {
  COMBINED_QUESTION_ACTIONS,
  type ConversationalAction,
  type ConversationOptions,
} from "./allowedActions.ts";
import type { PlannerProposal } from "./conversationalPlanner.ts";

export interface GuardrailResult {
  ok: boolean;
  reason: string;
  spoken: string;
  selectedAction: ConversationalAction | null;
}

const DIAGNOSIS_RE =
  /\b(you have|you've got|this is|sounds like|looks like)\b.{0,40}\b(infection|abscess|cavity|decay|pulpitis|fracture|broken root)\b/i;

const FALSE_REASSURANCE_RE =
  /\b(you('ll| will) be fine|nothing (serious|to worry)|no need to worry|it's (probably )?nothing|don't worry)\b/i;

const GUARANTEED_APPT_RE =
  /\b(you('re| are) (all )?set|booked you|scheduled you|appointment (is|has been) (confirmed|booked)|see you (at|on) \d)\b/i;

const INVENTED_AVAILABILITY_RE =
  /\b(we have an opening|come in at|slot at|available at \d|tomorrow at)\b/i;

const INSURANCE_VERIFIED_RE =
  /\b(insurance (is |was )?(verified|confirmed|checked)|benefits (are|were) (verified|confirmed)|coverage (is|was) confirmed)\b/i;

const MESSAGE_SAVED_RE =
  /\b(I('ve| have) (saved|shared|sent|logged)|message (is|was) (saved|shared)|team (already )?has (your |the )?(details|message))\b/i;

function countQuestions(text: string): number {
  return (text.match(/\?/g) || []).length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isAllowedAction(
  action: string,
  options: ConversationOptions
): action is ConversationalAction {
  return options.allowedActions.includes(action as ConversationalAction);
}

export function validatePlannerProposal(
  proposal: PlannerProposal,
  options: ConversationOptions,
  meta: { persisted?: boolean } = {}
): GuardrailResult {
  const spoken = String(proposal.spokenResponse || "").trim();
  const actionRaw = String(proposal.selectedAction || "").trim();

  if (!isAllowedAction(actionRaw, options)) {
    return {
      ok: false,
      reason: "action_not_allowed",
      spoken,
      selectedAction: null,
    };
  }
  const selectedAction = actionRaw;

  // Hard-required must be obeyed.
  if (
    options.hardRequiredAction &&
    selectedAction !== options.hardRequiredAction
  ) {
    return {
      ok: false,
      reason: "hard_required_bypass",
      spoken,
      selectedAction,
    };
  }

  if (selectedAction === "emergency_escalation") {
    return { ok: true, reason: "ok", spoken: spoken || "", selectedAction };
  }

  if (selectedAction === "persist_and_close") {
    if (!options.actionable) {
      return {
        ok: false,
        reason: "close_before_actionable",
        spoken,
        selectedAction,
      };
    }
    // Closing speech is composed after persistence; empty spoken is ok here.
    return { ok: true, reason: "ok", spoken, selectedAction };
  }

  if (!spoken) {
    return { ok: false, reason: "empty_speech", spoken: "", selectedAction };
  }

  if (wordCount(spoken) > 95) {
    return { ok: false, reason: "too_long", spoken, selectedAction };
  }

  if (/\[(?:emotion|tone|pause|laugh|sigh)[^\]]*\]/i.test(spoken)) {
    return { ok: false, reason: "emotion_tags", spoken, selectedAction };
  }

  if (/<\/?speak|<\/?prosody|<say-as/i.test(spoken)) {
    return { ok: false, reason: "ssml_forbidden", spoken, selectedAction };
  }

  if (DIAGNOSIS_RE.test(spoken)) {
    return { ok: false, reason: "diagnosis", spoken, selectedAction };
  }
  if (FALSE_REASSURANCE_RE.test(spoken)) {
    return { ok: false, reason: "false_reassurance", spoken, selectedAction };
  }
  if (GUARANTEED_APPT_RE.test(spoken)) {
    return { ok: false, reason: "guaranteed_appointment", spoken, selectedAction };
  }
  if (INVENTED_AVAILABILITY_RE.test(spoken)) {
    return { ok: false, reason: "invented_availability", spoken, selectedAction };
  }
  if (INSURANCE_VERIFIED_RE.test(spoken)) {
    return { ok: false, reason: "insurance_verified_claim", spoken, selectedAction };
  }
  if (!meta.persisted && MESSAGE_SAVED_RE.test(spoken)) {
    return { ok: false, reason: "saved_before_persist", spoken, selectedAction };
  }

  const qCount = countQuestions(spoken);
  const combined = COMBINED_QUESTION_ACTIONS.has(selectedAction);
  if (selectedAction === "acknowledge_and_recap") {
    if (qCount > 0) {
      return { ok: false, reason: "question_on_recap", spoken, selectedAction };
    }
  } else if (combined) {
    // Combined conceptual questions may contain one '?' only (one spoken turn).
    if (qCount !== 1) {
      return { ok: false, reason: "not_one_question", spoken, selectedAction };
    }
  } else if (qCount !== 1) {
    return { ok: false, reason: "not_one_question", spoken, selectedAction };
  }

  // Confirmed-fact re-ask checks (skip when the selected action intentionally asks that topic).
  if (
    options.factsConfirmed.lastName &&
    selectedAction !== "ask_last_name_spelling" &&
    selectedAction !== "confirm_last_name_spelling" &&
    /\bspell(ing)? (your )?last name\b/i.test(spoken)
  ) {
    return { ok: false, reason: "reask_confirmed_last_name", spoken, selectedAction };
  }

  if (
    (options.factsConfirmed.location || options.factsCaptured.locationComplete) &&
    selectedAction !== "ask_combined_tooth_location" &&
    /\b(which|what) (tooth|side|area)|upper or lower|left or right|front or back\b/i.test(
      spoken
    )
  ) {
    return { ok: false, reason: "reask_confirmed_location", spoken, selectedAction };
  }

  if (
    options.factsCaptured.swellingKnown &&
    selectedAction !== "ask_swelling" &&
    /\b(any |noticed )?swelling\b/i.test(spoken)
  ) {
    return { ok: false, reason: "reask_known_swelling", spoken, selectedAction };
  }

  return { ok: true, reason: "ok", spoken, selectedAction };
}
