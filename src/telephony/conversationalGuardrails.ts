/**
 * Deterministic guardrails for Hybrid Conversational Aly proposals.
 * Reject unsafe / untruthful / multi-ask speech; caller falls back to draft.
 */

import type {
  PlannerContext,
  PlannerProposal,
} from "./conversationalPlanner.ts";
import {
  expectedActionForField,
  renderPlannerSpeech,
} from "./conversationalPlanner.ts";

export interface GuardrailResult {
  ok: boolean;
  reason: string;
  spoken: string;
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

const CONFIRMED_REASK: Array<{
  when: (ctx: PlannerContext) => boolean;
  pattern: RegExp;
  reason: string;
}> = [
  {
    when: (ctx) => ctx.factsConfirmed.lastName,
    pattern: /\bspell(ing)? (your )?last name\b|\blast name\b.*\bspell/i,
    reason: "reask_confirmed_last_name",
  },
  {
    when: (ctx) => ctx.factsConfirmed.location || ctx.factsCaptured.locationComplete,
    pattern:
      /\b(which|what) (tooth|side|area)|upper or lower|left or right|front or back\b/i,
    reason: "reask_confirmed_location",
  },
  {
    when: (ctx) => ctx.factsCaptured.swellingKnown,
    pattern: /\b(any |noticed )?swelling\b/i,
    reason: "reask_known_swelling",
  },
  {
    when: (ctx) => ctx.factsCaptured.keptAwake,
    pattern: /\b(kept you awake|sleep|awake last night)\b/i,
    reason: "reask_kept_awake",
  },
  {
    when: (ctx) => ctx.factsCaptured.worried,
    pattern: /\bare you worried\b|\bhow worried\b/i,
    reason: "reask_worry",
  },
];

function countQuestions(text: string): number {
  return (text.match(/\?/g) || []).length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validatePlannerProposal(
  proposal: PlannerProposal,
  context: PlannerContext
): GuardrailResult {
  const spoken = renderPlannerSpeech(proposal, context.mode);

  if (!spoken) {
    return { ok: false, reason: "empty_speech", spoken: "" };
  }

  if (wordCount(spoken) > 90) {
    return { ok: false, reason: "too_long", spoken };
  }

  if (/\[(?:emotion|tone|pause|laugh|sigh)[^\]]*\]/i.test(spoken)) {
    return { ok: false, reason: "emotion_tags", spoken };
  }

  if (/<\/?speak|<\/?prosody|<say-as/i.test(spoken)) {
    return { ok: false, reason: "ssml_forbidden", spoken };
  }

  if (DIAGNOSIS_RE.test(spoken)) {
    return { ok: false, reason: "diagnosis", spoken };
  }

  if (FALSE_REASSURANCE_RE.test(spoken)) {
    return { ok: false, reason: "false_reassurance", spoken };
  }

  if (GUARANTEED_APPT_RE.test(spoken)) {
    return { ok: false, reason: "guaranteed_appointment", spoken };
  }

  if (INVENTED_AVAILABILITY_RE.test(spoken)) {
    return { ok: false, reason: "invented_availability", spoken };
  }

  if (INSURANCE_VERIFIED_RE.test(spoken)) {
    return { ok: false, reason: "insurance_verified_claim", spoken };
  }

  if (!context.persisted && MESSAGE_SAVED_RE.test(spoken)) {
    return { ok: false, reason: "saved_before_persist", spoken };
  }

  if (context.mode === "ask") {
    if (proposal.shouldClose) {
      return { ok: false, reason: "close_not_allowed_in_ask", spoken };
    }
    if (!proposal.nextQuestion) {
      return { ok: false, reason: "missing_question", spoken };
    }
    if (countQuestions(proposal.nextQuestion) !== 1) {
      return { ok: false, reason: "not_one_question", spoken };
    }
    if (countQuestions(spoken) > 1) {
      return { ok: false, reason: "multiple_questions", spoken };
    }

    const expected = expectedActionForField(context.requiredField);
    if (
      expected &&
      proposal.proposedAction &&
      proposal.proposedAction !== "other" &&
      proposal.proposedAction !== expected &&
      proposal.proposedAction !== "acknowledge"
    ) {
      return { ok: false, reason: "action_mismatch", spoken };
    }

    for (const rule of CONFIRMED_REASK) {
      if (!rule.when(context)) continue;
      // Allow the required field to ask its own topic.
      if (
        context.requiredField === "pain.swelling" &&
        rule.reason === "reask_known_swelling"
      ) {
        continue;
      }
      if (
        (context.requiredField === "caller.last_name_spell" ||
          context.requiredField === "caller.last_name_confirm") &&
        rule.reason === "reask_confirmed_last_name"
      ) {
        continue;
      }
      if (rule.pattern.test(proposal.nextQuestion)) {
        return { ok: false, reason: rule.reason, spoken };
      }
    }
  }

  if (context.mode === "close") {
    if (!context.callActionable && !context.lifeThreatening) {
      return { ok: false, reason: "close_before_actionable", spoken };
    }
    if (!proposal.shouldClose) {
      return { ok: false, reason: "should_close_false", spoken };
    }
    if (countQuestions(spoken) > 0) {
      return { ok: false, reason: "question_on_close", spoken };
    }
    if (context.lifeThreatening) {
      if (!/911|emergency room|\bER\b/i.test(spoken)) {
        return { ok: false, reason: "emergency_guidance_missing", spoken };
      }
    }
    if (!context.persisted && MESSAGE_SAVED_RE.test(spoken)) {
      return { ok: false, reason: "saved_before_persist", spoken };
    }
  }

  return { ok: true, reason: "ok", spoken };
}
