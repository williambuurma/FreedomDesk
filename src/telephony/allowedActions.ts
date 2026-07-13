/**
 * Deterministic conversation options — safe allow-list for Hybrid Aly.
 * The planner may choose only from allowedActions; it cannot invent actions.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import {
  getIdentityState,
  hasLifeThreateningLanguage,
  isCallActionable,
  isDentalPainCall,
  patientText,
  type LiveCallSession,
} from "./callSession.ts";
import {
  applyLoopSuppression,
  ensureLoopState,
} from "./conversationLoopDetector.ts";
import {
  progressBridgeForAction,
  shouldIncludeProgressLanguage,
} from "./conversationStages.ts";
import { MAX_SPELLING_ATTEMPTS } from "./spellingNormalize.ts";
import { isLocationComplete } from "./toothLocation.ts";

export type ConversationalAction =
  | "ask_name"
  | "ask_last_name_spelling"
  | "confirm_last_name_spelling"
  | "ask_callback_phone"
  | "ask_reason_for_calling"
  | "ask_combined_tooth_location"
  | "ask_swelling"
  | "ask_fever"
  | "ask_breathing"
  | "ask_combined_scheduling_preference"
  | "answer_process_question"
  | "acknowledge_and_recap"
  | "persist_and_close"
  | "emergency_escalation";

export interface ConversationOptions {
  factsCaptured: Record<string, boolean | string | null>;
  factsConfirmed: Record<string, boolean>;
  missingMaterialFacts: string[];
  urgency: string;
  actionable: boolean;
  dentalPain: boolean;
  afterHours: boolean;
  hardRequiredAction: ConversationalAction | null;
  allowedActions: ConversationalAction[];
  /** Preferred fallback order when planner fails */
  fallbackPriority: ConversationalAction[];
  firstNameHint: string | null;
  lastNameSpellingHint: string | null;
  locationHint: string | null;
  spellingLowConfidence: boolean;
}

/** Map allow-list action → session field used by applyUtteranceToSlots / appendAlyAsk */
export const ACTION_TO_FIELD: Record<ConversationalAction, string | null> = {
  ask_name: "caller.name",
  ask_last_name_spelling: "caller.last_name_spell",
  confirm_last_name_spelling: "caller.last_name_confirm",
  ask_callback_phone: "caller.phone",
  ask_reason_for_calling: "caller.reason",
  ask_combined_tooth_location: "pain.location.combined",
  ask_swelling: "pain.swelling",
  ask_fever: "pain.fever",
  ask_breathing: "safety.breathing",
  ask_combined_scheduling_preference: "schedule.combined",
  answer_process_question: "conversation.process",
  acknowledge_and_recap: "conversation.recap",
  persist_and_close: null,
  emergency_escalation: null,
};

export const COMBINED_QUESTION_ACTIONS = new Set<ConversationalAction>([
  "ask_combined_tooth_location",
  "ask_combined_scheduling_preference",
]);

export function hasCallerReason(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): boolean {
  if (session.slots.reasonCaptured === true) return true;
  const intent = analysis.understanding?.intent;
  if (intent && intent !== "OTHER") return true;
  const concern = String(analysis.understanding?.chiefConcern || "").trim();
  if (concern.length >= 4) return true;
  const text = patientText(session.turns).toLowerCase();
  return (
    /toothache|tooth pain|dental pain|pain|swelling|cleaning|checkup|check-up|new patient|appointment|reschedule|cancel|insurance|crown|root canal|extraction|implant|denture|consult|emergency|hurt|hurts/.test(
      text
    ) || Boolean(session.slots.keptAwake)
  );
}

export function hasRequestedOutcome(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): boolean {
  if (session.slots.outcomeCaptured === true) return true;
  if (typeof session.slots.wantsEarliest === "boolean") return true;
  const step = String(analysis.frontDesk?.recommendedNextStep || "").trim();
  if (step.length >= 4) return true;
  const text = patientText(session.turns).toLowerCase();
  return /earliest|asap|as soon|schedule|appoint|come in|short notice|today|tomorrow|this week|need (to )?see|want to (come|be seen)/.test(
    text
  );
}

function firstName(session: LiveCallSession): string | null {
  const name = session.slots.name;
  if (!name) return null;
  return name.trim().split(/\s+/)[0] || null;
}

/**
 * Build the deterministic option set for this turn.
 * Emergency escalation and persist permission are authoritative here.
 */
export function buildConversationOptions(
  session: LiveCallSession,
  analysis: ConversationAnalysis
): ConversationOptions {
  const id = getIdentityState(session);
  const dentalPain = isDentalPainCall(analysis, session);
  const allPatient = patientText(session.turns);
  const actionable = isCallActionable(session, analysis);

  const emergency =
    hasLifeThreateningLanguage(allPatient) ||
    analysis.triage.routingAction === "er_or_on_call_immediate" ||
    session.slots.breathingOk === false;

  const missing: string[] = [];
  const spellingDone =
    id.lastNameConfirmed === true || session.slots.spellingAbandoned === true;

  if (!id.nameCaptured) missing.push("name");
  if (id.nameCaptured && !id.lastNameSpellingCaptured && !spellingDone) {
    missing.push("last_name_spelling");
  }
  if (
    id.lastNameSpellingCaptured &&
    !id.lastNameConfirmed &&
    !session.slots.spellingAbandoned
  ) {
    missing.push("last_name_confirm");
  }
  if (
    !analysis.understanding.phone &&
    !session.from &&
    !session.askedFields.includes("caller.phone")
  ) {
    missing.push("callback_phone");
  }
  if (!hasCallerReason(session, analysis) && !dentalPain) {
    missing.push("reason_for_calling");
  }
  if (dentalPain && !isLocationComplete(session.slots.locationParts)) {
    missing.push("tooth_location");
  }
  if (dentalPain && typeof session.slots.swelling !== "boolean") {
    missing.push("swelling");
  }
  if (
    dentalPain &&
    (typeof session.slots.wantsEarliest !== "boolean" ||
      (session.slots.wantsEarliest === true &&
        typeof session.slots.shortNoticeOk !== "boolean"))
  ) {
    missing.push("scheduling_preference");
  }
  if (!dentalPain && !hasRequestedOutcome(session, analysis)) {
    missing.push("requested_outcome");
  }

  const allowed: ConversationalAction[] = [];
  const fallback: ConversationalAction[] = [];

  let hardRequired: ConversationalAction | null = null;

  if (emergency) {
    hardRequired = "emergency_escalation";
    allowed.push("emergency_escalation");
    fallback.push("emergency_escalation");
  } else {
    // Elevated airway screen is hard-required when indicated.
    const elevatedAirway =
      (session.slots.swelling === true || session.slots.fever === true) &&
      typeof session.slots.breathingOk !== "boolean";
    if (elevatedAirway) {
      hardRequired = "ask_breathing";
      allowed.push("ask_breathing");
      fallback.push("ask_breathing");
    }

    if (!id.nameCaptured) {
      allowed.push("ask_name");
      fallback.push("ask_name");
    }

    // Spelling loop — planner must never re-offer these once confirmed or abandoned.
    if (!spellingDone) {
      const attempts = session.slots.spellingAttemptCount || 0;
      const canRetrySpelling = attempts < MAX_SPELLING_ATTEMPTS;

      if (id.nameCaptured && !id.lastNameSpellingCaptured && canRetrySpelling) {
        allowed.push("ask_last_name_spelling");
        fallback.push("ask_last_name_spelling");
      } else if (
        id.nameCaptured &&
        id.lastNameSpellingCaptured &&
        !id.lastNameConfirmed &&
        session.slots.spellingLowConfidence === true &&
        canRetrySpelling
      ) {
        // Low-confidence parse — one re-ask only; never confirm junk.
        allowed.push("ask_last_name_spelling");
        fallback.push("ask_last_name_spelling");
      }

      if (
        id.lastNameSpellingCaptured &&
        !id.lastNameConfirmed &&
        session.slots.spellingLowConfidence !== true
      ) {
        allowed.push("confirm_last_name_spelling");
        fallback.push("confirm_last_name_spelling");
      }
    }
    if (
      !analysis.understanding.phone &&
      !session.from &&
      !session.askedFields.includes("caller.phone")
    ) {
      allowed.push("ask_callback_phone");
      fallback.push("ask_callback_phone");
    }

    if (!hasCallerReason(session, analysis) && !dentalPain) {
      allowed.push("ask_reason_for_calling");
      fallback.push("ask_reason_for_calling");
    }

    // Meta-questions — answer before continuing the checklist.
    const sem = session.lastSemanticInterpretation;
    if (
      !session.metaQuestionAnswered &&
      (sem?.conversationSignals.callerAsksWhatHappensNext ||
        sem?.conversationSignals.callerAsksIfHasAppointment)
    ) {
      allowed.unshift("answer_process_question");
      fallback.unshift("answer_process_question");
    }

    // Clarify clinical/scheduling only after identity spelling is done (or abandoned).
    // Prevents mid-understand jumps that skip usable identity.
    if (spellingDone) {
      if (dentalPain) {
        if (!isLocationComplete(session.slots.locationParts)) {
          allowed.push("ask_combined_tooth_location");
          fallback.push("ask_combined_tooth_location");
        }
        if (typeof session.slots.swelling !== "boolean") {
          allowed.push("ask_swelling");
          fallback.push("ask_swelling");
        }
        if (
          session.slots.swelling === true &&
          typeof session.slots.fever !== "boolean" &&
          !session.askedFields.includes("pain.fever")
        ) {
          allowed.push("ask_fever");
          fallback.push("ask_fever");
        }
        const schedulingComplete =
          typeof session.slots.wantsEarliest === "boolean" &&
          (session.slots.wantsEarliest === false ||
            typeof session.slots.shortNoticeOk === "boolean");
        if (!schedulingComplete) {
          allowed.push("ask_combined_scheduling_preference");
          fallback.push("ask_combined_scheduling_preference");
        }
      } else if (!hasRequestedOutcome(session, analysis)) {
        // Non-pain: need a usable outcome without inventing a full NP workflow.
        allowed.push("ask_reason_for_calling");
        if (!fallback.includes("ask_reason_for_calling")) {
          fallback.push("ask_reason_for_calling");
        }
      }
    }

    // Recap only in resolve — not as a mid-clarify distraction.
    // Available once actionable, or when material clinical/scheduling gaps are closed.
    const materialGaps = missing.filter((f) =>
      [
        "name",
        "last_name_spelling",
        "last_name_confirm",
        "callback_phone",
        "swelling",
        "scheduling_preference",
        "tooth_location",
        "reason_for_calling",
        "requested_outcome",
      ].includes(f)
    );
    if (
      id.nameCaptured &&
      materialGaps.length === 0 &&
      (dentalPain
        ? isLocationComplete(session.slots.locationParts) ||
          session.slots.keptAwake === true
        : hasCallerReason(session, analysis))
    ) {
      allowed.push("acknowledge_and_recap");
    }

    if (actionable) {
      allowed.push("persist_and_close");
      if (!allowed.includes("acknowledge_and_recap")) {
        allowed.push("acknowledge_and_recap");
      }
      // Prefer close once actionable — still allow planner to ask one more material fact if listed.
      if (!fallback.includes("persist_and_close")) {
        fallback.push("persist_and_close");
      }
    }
  }

  // Deduplicate while preserving order.
  const uniq = (list: ConversationalAction[]) => {
    const seen = new Set<string>();
    const out: ConversationalAction[] = [];
    for (const a of list) {
      if (seen.has(a)) continue;
      seen.add(a);
      out.push(a);
    }
    return out;
  };

  ensureLoopState(session);
  const semSignals = session.lastSemanticInterpretation;
  const allowedDeduped = applyLoopSuppression(session, uniq(allowed), {
    callerSaysAlreadyAnswered:
      semSignals?.conversationSignals.callerSaysAlreadyAnswered === true,
    unclearSafetyAnswer:
      semSignals?.uncertainty.some((u) => /breath|swallow|safety/i.test(u)) ===
      true,
  });

  return {
    factsCaptured: {
      nameCaptured: id.nameCaptured,
      lastNameSpellingCaptured: id.lastNameSpellingCaptured,
      lastNameConfirmed: id.lastNameConfirmed,
      locationComplete: isLocationComplete(session.slots.locationParts),
      swellingKnown: typeof session.slots.swelling === "boolean",
      swelling: typeof session.slots.swelling === "boolean" ? session.slots.swelling : null,
      keptAwake: session.slots.keptAwake === true,
      wantsEarliest:
        typeof session.slots.wantsEarliest === "boolean"
          ? session.slots.wantsEarliest
          : null,
      shortNoticeOk:
        typeof session.slots.shortNoticeOk === "boolean"
          ? session.slots.shortNoticeOk
          : null,
      reasonCaptured: hasCallerReason(session, analysis),
      outcomeCaptured: hasRequestedOutcome(session, analysis),
    },
    factsConfirmed: {
      lastName: id.lastNameConfirmed,
      location: session.slots.locationConfirmed === true,
    },
    missingMaterialFacts: missing,
    urgency: analysis.triage?.urgency || "routine",
    actionable,
    dentalPain,
    afterHours: session.afterHours,
    hardRequiredAction: hardRequired,
    allowedActions: allowedDeduped,
    fallbackPriority: uniq(fallback).filter(
      (a) => allowedDeduped.includes(a) || a === hardRequired
    ),
    firstNameHint: firstName(session),
    lastNameSpellingHint: session.slots.lastNameSpelling
      ? String(session.slots.lastNameSpelling).replace(/[^A-Za-z]/g, "").slice(0, 24)
      : null,
    locationHint: session.slots.location
      ? String(session.slots.location).slice(0, 60)
      : null,
    spellingLowConfidence: session.slots.spellingLowConfidence === true,
  };
}

/** Deterministic spoken template for an allowed action (fallback path). */
export function deterministicSpeechForAction(
  action: ConversationalAction,
  session: LiveCallSession,
  options: ConversationOptions
): string {
  const first = options.firstNameHint;
  const painTone =
    session.tone === "worried_anxious" ||
    session.tone === "pain_discomfort" ||
    session.tone === "urgent_calm";
  const needsOpening = painTone && !session.usedOpening;

  switch (action) {
    case "ask_name": {
      const q = "May I have your first and last name?";
      if (needsOpening) {
        session.usedOpening = true;
        return (
          "I'm sorry—you sound really uncomfortable. I'm glad you called. " +
          "I only need a few important details so the team knows how to help. " +
          q
        );
      }
      return q;
    }
    case "ask_last_name_spelling": {
      const q = first
        ? `Thank you, ${first}. Could you spell your last name for me?`
        : "Could you spell your last name for me?";
      if (needsOpening) {
        session.usedOpening = true;
        return (
          "I'm sorry that kept you up — I understand why you'd be worried. " +
          "I only need a few important details so the team knows how to help. " +
          q
        );
      }
      if (shouldIncludeProgressLanguage(session, options, action)) {
        const bridge = progressBridgeForAction(action, session);
        return bridge ? `${bridge} ${q}` : q;
      }
      return q;
    }
    case "confirm_last_name_spelling": {
      const letters = String(options.lastNameSpellingHint || "")
        .toUpperCase()
        .split("")
        .join("-");
      const name =
        session.slots.lastName ||
        (options.lastNameSpellingHint
          ? options.lastNameSpellingHint.charAt(0).toUpperCase() +
            options.lastNameSpellingHint.slice(1).toLowerCase()
          : "");
      if (options.spellingLowConfidence) {
        return "I may have missed one letter. Could you spell that once more, a little slowly?";
      }
      return `${letters}, ${name}. Did I get that right?`;
    }
    case "ask_callback_phone":
      return "What's the best number to reach you back on?";
    case "ask_reason_for_calling":
      return "How can I help you today?";
    case "ask_combined_tooth_location":
      return "Can you tell me where it is—upper or lower, left or right, and more toward the front or the back?";
    case "ask_swelling":
      return "Have you noticed any swelling on your face or gums?";
    case "ask_fever":
      return "Have you had a fever?";
    case "ask_breathing":
      return "Are you having any trouble breathing or swallowing?";
    case "ask_combined_scheduling_preference": {
      const q =
        "Are you looking for the earliest available appointment, and would you be able to come in on short notice?";
      if (shouldIncludeProgressLanguage(session, options, action)) {
        const bridge = progressBridgeForAction(action, session);
        return bridge ? `${bridge} ${q}` : q;
      }
      return q;
    }
    case "answer_process_question": {
      const sig = session.lastSemanticInterpretation?.conversationSignals;
      if (sig?.callerAsksIfHasAppointment) {
        return "Not yet. I'm recording your request so the team can review availability and follow up. I just have one more question for the team.";
      }
      return "I'm collecting the few details the team needs to understand your concern and contact you about the next available option. I just have one more question.";
    }
    case "acknowledge_and_recap": {
      const bits: string[] = [];
      if (options.locationHint) bits.push(`the pain is in the ${options.locationHint}`);
      if (session.slots.keptAwake) bits.push("it kept you awake");
      if (session.slots.swelling === false) bits.push("no swelling noted");
      if (session.slots.swelling === true) bits.push("some swelling");
      if (session.slots.wantsEarliest === true) bits.push("you want the earliest help");
      if (session.slots.shortNoticeOk === true) bits.push("you can come on short notice");
      const body = bits.length
        ? `I have that ${bits.join(", and ")}.`
        : "I have the details you shared.";
      return first ? `Thank you, ${first}. ${body}` : `Thank you. ${body}`;
    }
    case "persist_and_close":
      return ""; // Closing composed after persistence.
    case "emergency_escalation":
      return "";
    default:
      return "Could you tell me a little more?";
  }
}
