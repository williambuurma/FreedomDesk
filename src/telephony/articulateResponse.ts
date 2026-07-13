/**
 * Plan the next conversational turn: allow-list → planner select → validate → fallback.
 * Planner chooses the action; deterministic code enforces safety and membership.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import {
  consumeSpellingAbandonAnnounce,
  logSpellingProgress,
  type LiveCallSession,
  type NextAsk,
} from "./callSession.ts";
import {
  ACTION_TO_FIELD,
  buildConversationOptions,
  deterministicSpeechForAction,
  type ConversationalAction,
  type ConversationOptions,
} from "./allowedActions.ts";
import { validatePlannerProposal } from "./conversationalGuardrails.ts";
import {
  buildPlannerContext,
  fallbackProposalForOptions,
  isHybridConversationalEnabled,
  planConversationalResponse,
  type PlanConversationalOptions,
  type PlannerProposal,
} from "./conversationalPlanner.ts";
export type TurnDecisionKind = "ask" | "complete";

export interface TurnDecision {
  kind: TurnDecisionKind;
  /** Present when kind=ask */
  nextAsk?: NextAsk;
  selectedAction: ConversationalAction;
  source: "planner" | "fallback";
  validationReason: string;
  fallbackReason?: string;
  plannerLatencyMs: number | null;
  allowedActionCount: number;
  options: ConversationOptions;
  proposal: PlannerProposal | null;
  /** Relative phase timers inside planNextTurn (ms from function entry). */
  phaseMs?: {
    optionsBuilt: number;
    plannerDone: number | null;
    validated: number;
    firstTokenReady: number;
  };
}

let injectedPlanOptions: PlanConversationalOptions | null = null;

export function setArticulatePlanOptions(
  options: PlanConversationalOptions | null
): void {
  injectedPlanOptions = options;
}

export function getArticulatePlanOptions(): PlanConversationalOptions | null {
  return injectedPlanOptions;
}

function hrMs(start: [number, number]): number {
  const [s, n] = process.hrtime(start);
  return Math.round(s * 1000 + n / 1e6);
}

function logHybridMetric(
  event: string,
  callSid: string,
  extra: Record<string, string | number | boolean | undefined>
): void {
  const parts = [
    `[hybrid-aly]`,
    new Date().toISOString(),
    `event=${event}`,
    `CallSid=${callSid}`,
  ];
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) continue;
    parts.push(`${k}=${v}`);
  }
  console.log(parts.join(" "));
}

function actionToNextAsk(
  action: ConversationalAction,
  spoken: string,
  session: LiveCallSession
): NextAsk | null {
  if (action === "persist_and_close" || action === "emergency_escalation") {
    return null;
  }
  const field = ACTION_TO_FIELD[action];
  if (!field) return null;
  session.lastPolicyReason = `action:${action}`;
  return { field, question: spoken };
}

/**
 * Core authority-corrected turn planner.
 * Does not call selectNextAsk to override a valid planner choice.
 */
export async function planNextTurn(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  planOptions?: PlanConversationalOptions;
}): Promise<TurnDecision> {
  const turnT0 = process.hrtime();
  const { session, analysis } = input;
  const options = buildConversationOptions(session, analysis);
  const optionsBuiltMs = hrMs(turnT0);
  const allowedActionCount = options.allowedActions.length;

  // Deterministic hard exits — planner cannot override.
  if (options.hardRequiredAction === "emergency_escalation") {
    session.lastPolicyReason = "emergency_escalate";
    const firstTokenReady = hrMs(turnT0);
    logHybridMetric("first_token_ready", session.callSid, {
      source: "fallback",
      selectedAction: "emergency_escalation",
      allowedActionCount,
      validation: "ok",
      ms: firstTokenReady,
    });
    return {
      kind: "complete",
      selectedAction: "emergency_escalation",
      source: "fallback",
      validationReason: "ok",
      plannerLatencyMs: null,
      allowedActionCount,
      options,
      proposal: null,
      phaseMs: {
        optionsBuilt: optionsBuiltMs,
        plannerDone: null,
        validated: firstTokenReady,
        firstTokenReady,
      },
    };
  }

  const enabled =
    isHybridConversationalEnabled() ||
    Boolean(input.planOptions?.planFn || injectedPlanOptions?.planFn);

  const planOpts: PlanConversationalOptions = {
    ...injectedPlanOptions,
    ...input.planOptions,
  };

  let proposal: PlannerProposal | null = null;
  let source: "planner" | "fallback" = "fallback";
  let fallbackReason: string | undefined;
  let plannerLatencyMs: number | null = null;
  let validationReason = "ok";
  let plannerDoneMs: number | null = null;
  let validatedMs = optionsBuiltMs;

  if (!enabled) {
    proposal = fallbackProposalForOptions(session, options);
    fallbackReason = "hybrid_disabled";
    validatedMs = hrMs(turnT0);
  } else if (
    options.allowedActions.length === 1 &&
    !planOpts.planFn &&
    options.hardRequiredAction !== "emergency_escalation"
  ) {
    // Single allow-list member — skip OpenAI planner RTT (~0.5–2s).
    // Still honor injected planFn (tests / overrides).
    proposal = fallbackProposalForOptions(session, options);
    fallbackReason = "single_allowed_action";
    source = "fallback";
    validatedMs = hrMs(turnT0);
    logHybridMetric("planner_done", session.callSid, {
      ms: 0,
      ok: true,
      selectedAction: String(proposal.selectedAction),
      reason: "single_allowed_action",
    });
  } else {
    const context = buildPlannerContext(session, analysis, options);
    const t0 = process.hrtime();
    logHybridMetric("planner_start", session.callSid, {
      allowedActionCount,
      hardRequired: options.hardRequiredAction || "(none)",
      actionable: options.actionable,
      stage: context.callStage,
    });
    try {
      proposal = await planConversationalResponse(context, planOpts);
      plannerLatencyMs = hrMs(t0);
      plannerDoneMs = hrMs(turnT0);
      logHybridMetric("planner_done", session.callSid, {
        ms: plannerLatencyMs,
        ok: true,
        selectedAction: String(proposal.selectedAction),
      });
    } catch (err) {
      plannerLatencyMs = hrMs(t0);
      plannerDoneMs = hrMs(turnT0);
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "planner_error";
      fallbackReason =
        name === "AbortError" || /aborted/i.test(message)
          ? "planner_timeout"
          : message.startsWith("planner_")
            ? message
            : "planner_error";
      logHybridMetric("planner_done", session.callSid, {
        ms: plannerLatencyMs,
        ok: false,
        reason: fallbackReason,
      });
      proposal = fallbackProposalForOptions(session, options);
    }

    if (!fallbackReason) {
      const validation = validatePlannerProposal(proposal, options, {
        persisted: false,
      });
      validationReason = validation.reason;
      validatedMs = hrMs(turnT0);
      logHybridMetric("validation_done", session.callSid, {
        ok: validation.ok,
        reason: validation.reason,
        selectedAction: String(proposal.selectedAction),
        allowedActionCount,
        ms: plannerLatencyMs ?? 0,
      });
      if (!validation.ok) {
        fallbackReason = validation.reason;
        source = "fallback";
        proposal = fallbackProposalForOptions(session, options);
      } else {
        source = "planner";
        proposal = {
          ...proposal,
          spokenResponse: validation.spoken || proposal.spokenResponse,
          selectedAction: validation.selectedAction || proposal.selectedAction,
        };
      }
    } else {
      source = "fallback";
      validationReason = fallbackReason;
      validatedMs = hrMs(turnT0);
    }
  }

  const selectedAction = String(
    proposal!.selectedAction
  ) as ConversationalAction;

  // Ensure fallback speech is populated.
  let spoken = String(proposal!.spokenResponse || "").trim();
  if (!spoken && selectedAction !== "persist_and_close" && selectedAction !== "emergency_escalation") {
    spoken = deterministicSpeechForAction(selectedAction, session, options);
  }
  if (/\btruly\b/i.test(spoken)) {
    spoken = spoken.replace(/\btruly\b/gi, "").replace(/\s+/g, " ").trim();
  }

  const abandonLine = consumeSpellingAbandonAnnounce(session);
  if (abandonLine && spoken) {
    spoken = `${abandonLine} ${spoken}`.trim();
  } else if (abandonLine) {
    spoken = abandonLine;
  }

  logSpellingProgress(session, { selectedAction });

  const phaseMs = {
    optionsBuilt: optionsBuiltMs,
    plannerDone: plannerDoneMs,
    validated: validatedMs,
    firstTokenReady: 0,
  };

  if (
    selectedAction === "persist_and_close" ||
    selectedAction === "emergency_escalation"
  ) {
    session.lastPolicyReason =
      selectedAction === "emergency_escalation"
        ? "emergency_escalate"
        : "actionable";
    phaseMs.firstTokenReady = hrMs(turnT0);
    logHybridMetric("first_token_ready", session.callSid, {
      source,
      selectedAction,
      allowedActionCount,
      validation: validationReason,
      fallbackReason,
      ms: phaseMs.firstTokenReady,
      plannerMs: plannerLatencyMs ?? 0,
    });
    return {
      kind: "complete",
      selectedAction,
      source,
      validationReason,
      fallbackReason,
      plannerLatencyMs,
      allowedActionCount,
      options,
      proposal,
      phaseMs,
    };
  }

  // Hard-required breathing ask path.
  if (options.hardRequiredAction === "ask_breathing" && selectedAction !== "ask_breathing") {
    const forced = "ask_breathing" as ConversationalAction;
    spoken = deterministicSpeechForAction(forced, session, options);
    const nextAsk = actionToNextAsk(forced, spoken, session)!;
    phaseMs.firstTokenReady = hrMs(turnT0);
    logHybridMetric("first_token_ready", session.callSid, {
      source: "fallback",
      selectedAction: forced,
      allowedActionCount,
      validation: "hard_required_forced",
      ms: phaseMs.firstTokenReady,
    });
    return {
      kind: "ask",
      nextAsk,
      selectedAction: forced,
      source: "fallback",
      validationReason: "hard_required_forced",
      fallbackReason: "hard_required_forced",
      plannerLatencyMs,
      allowedActionCount,
      options,
      proposal,
      phaseMs,
    };
  }

  const nextAsk = actionToNextAsk(selectedAction, spoken, session);
  if (!nextAsk) {
    session.lastPolicyReason = "no_further_asks";
    phaseMs.firstTokenReady = hrMs(turnT0);
    return {
      kind: "complete",
      selectedAction: "persist_and_close",
      source: "fallback",
      validationReason: "missing_field_map",
      fallbackReason: "missing_field_map",
      plannerLatencyMs,
      allowedActionCount,
      options,
      proposal,
      phaseMs,
    };
  }

  phaseMs.firstTokenReady = hrMs(turnT0);
  logHybridMetric("first_token_ready", session.callSid, {
    source,
    selectedAction,
    allowedActionCount,
    validation: validationReason,
    fallbackReason,
    ms: phaseMs.firstTokenReady,
    plannerMs: plannerLatencyMs ?? 0,
  });

  return {
    kind: "ask",
    nextAsk,
    selectedAction,
    source,
    validationReason,
    fallbackReason,
    plannerLatencyMs,
    allowedActionCount,
    options,
    proposal,
    phaseMs,
  };
}

/**
 * Backward-compatible ask articulator — prefers planNextTurn when possible.
 * @deprecated Prefer planNextTurn for authority-corrected flow.
 */
export async function articulateNextAsk(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  nextAsk: NextAsk;
  planOptions?: PlanConversationalOptions;
}): Promise<NextAsk> {
  const decision = await planNextTurn({
    session: input.session,
    analysis: input.analysis,
    planOptions: input.planOptions,
  });
  if (decision.kind === "ask" && decision.nextAsk) {
    return decision.nextAsk;
  }
  return input.nextAsk;
}

export async function articulateClosing(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  deterministicClosing: string;
  persisted: boolean;
  lifeThreatening: boolean;
  callActionable?: boolean;
  planOptions?: PlanConversationalOptions;
}): Promise<string> {
  const { deterministicClosing } = input;

  if (input.lifeThreatening) return deterministicClosing;
  if (!input.persisted) return deterministicClosing;

  // Latency: skip a second OpenAI round-trip on close by default.
  // Deterministic compassionate closing already recaps material pain facts.
  // Opt in with HYBRID_ALY_CLOSE_PLANNER=1 only for experiments.
  const closePlanner =
    (process.env.HYBRID_ALY_CLOSE_PLANNER || "").trim().toLowerCase() === "1" ||
    (process.env.HYBRID_ALY_CLOSE_PLANNER || "").trim().toLowerCase() === "true";
  if (!closePlanner) {
    logHybridMetric("first_token_ready", input.session.callSid, {
      source: "fallback",
      field: "closing",
      reason: "deterministic_close_no_second_planner",
      ms: 0,
    });
    return deterministicClosing;
  }

  const enabled =
    isHybridConversationalEnabled() ||
    Boolean(input.planOptions?.planFn || injectedPlanOptions?.planFn);
  if (!enabled) return deterministicClosing;

  const options = buildConversationOptions(input.session, input.analysis);
  const closeOptions: ConversationOptions = {
    ...options,
    actionable: true,
    allowedActions: ["acknowledge_and_recap"],
    fallbackPriority: ["acknowledge_and_recap"],
    hardRequiredAction: null,
  };

  const planOpts: PlanConversationalOptions = {
    ...injectedPlanOptions,
    ...input.planOptions,
  };
  const context = buildPlannerContext(input.session, input.analysis, closeOptions);
  const t0 = process.hrtime();
  try {
    logHybridMetric("planner_start", input.session.callSid, {
      mode: "close",
      allowedActionCount: 1,
    });
    const proposal = await planConversationalResponse(context, planOpts);
    const ms = hrMs(t0);
    const normalized: PlannerProposal = {
      ...proposal,
      selectedAction: "acknowledge_and_recap",
      spokenResponse: proposal.spokenResponse || deterministicClosing,
    };
    const validation = validatePlannerProposal(normalized, closeOptions, {
      persisted: true,
    });
    logHybridMetric("planner_done", input.session.callSid, {
      ms,
      ok: true,
      selectedAction: "acknowledge_and_recap",
    });
    logHybridMetric("validation_done", input.session.callSid, {
      ok: validation.ok,
      reason: validation.reason,
      ms,
    });
    if (!validation.ok || !validation.spoken) {
      logHybridMetric("first_token_ready", input.session.callSid, {
        source: "fallback",
        reason: validation.reason,
        field: "closing",
        ms,
      });
      return deterministicClosing;
    }
    logHybridMetric("first_token_ready", input.session.callSid, {
      source: "planner",
      field: "closing",
      ms,
    });
    return validation.spoken.replace(/\btruly\b/gi, "").replace(/\s+/g, " ").trim();
  } catch (err) {
    const ms = hrMs(t0);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "planner_error";
    logHybridMetric("planner_done", input.session.callSid, {
      ms,
      ok: false,
      reason: message,
    });
    logHybridMetric("first_token_ready", input.session.callSid, {
      source: "fallback",
      reason: message,
      field: "closing",
      ms,
    });
    return deterministicClosing;
  }
}

/** Detailed helper for tests */
export async function articulateNextAskDetailed(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  planOptions?: PlanConversationalOptions;
}): Promise<TurnDecision> {
  return planNextTurn(input);
}
