/**
 * Articulate Aly's next spoken turn: planner → guardrails → deterministic fallback.
 * Shared by ConversationRelay and Gather/Say — does not change field selection.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import type { LiveCallSession, NextAsk } from "./callSession.ts";
import { isCallActionable } from "./callSession.ts";
import {
  buildPlannerContext,
  isHybridConversationalEnabled,
  planConversationalResponse,
  type PlanConversationalOptions,
  type PlannerContext,
  type PlannerProposal,
} from "./conversationalPlanner.ts";
import { validatePlannerProposal } from "./conversationalGuardrails.ts";

export interface ArticulateMetrics {
  plannerStartMs: number;
  plannerDoneMs: number | null;
  validationDoneMs: number | null;
  firstTokenReadyMs: number | null;
  source: "planner" | "fallback" | "disabled";
  fallbackReason?: string;
}

export interface ArticulateResult {
  spoken: string;
  usedPlanner: boolean;
  proposal: PlannerProposal | null;
  context: PlannerContext | null;
  metrics: ArticulateMetrics;
  validationReason: string;
}

let injectedPlanOptions: PlanConversationalOptions | null = null;

/** Test seam — inject planFn / fetch / timeouts without env. */
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

async function runPlannerSafe(
  context: PlannerContext,
  callSid: string,
  options: PlanConversationalOptions
): Promise<{ proposal: PlannerProposal | null; reason: string; ms: number }> {
  const t0 = process.hrtime();
  logHybridMetric("planner_start", callSid, {
    mode: context.mode,
    field: context.requiredField || "(none)",
  });
  try {
    const proposal = await planConversationalResponse(context, options);
    const ms = hrMs(t0);
    logHybridMetric("planner_done", callSid, {
      ms,
      ok: true,
    });
    return { proposal, reason: "ok", ms };
  } catch (err) {
    const ms = hrMs(t0);
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name?: string }).name)
        : "";
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "planner_error";
    const reason =
      name === "AbortError" || /aborted/i.test(message)
        ? "planner_timeout"
        : message.startsWith("planner_")
          ? message
          : "planner_error";
    logHybridMetric("planner_done", callSid, {
      ms,
      ok: false,
      reason,
    });
    return { proposal: null, reason, ms };
  }
}

/**
 * Rewrite a continuation ask's spoken text. Field from selectNextAsk is preserved.
 */
export async function articulateNextAsk(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  nextAsk: NextAsk;
  planOptions?: PlanConversationalOptions;
}): Promise<NextAsk> {
  const { session, analysis, nextAsk } = input;
  const tAll = process.hrtime();

  const enabled =
    isHybridConversationalEnabled() ||
    Boolean(input.planOptions?.planFn || injectedPlanOptions?.planFn);

  if (!enabled) {
    return nextAsk;
  }

  const metrics: ArticulateMetrics = {
    plannerStartMs: 0,
    plannerDoneMs: null,
    validationDoneMs: null,
    firstTokenReadyMs: null,
    source: "disabled",
  };

  const options: PlanConversationalOptions = {
    ...injectedPlanOptions,
    ...input.planOptions,
  };

  const context = buildPlannerContext({
    session,
    analysis,
    mode: "ask",
    requiredField: nextAsk.field,
    deterministicDraft: nextAsk.question,
    callActionable: isCallActionable(session, analysis),
    persisted: false,
    lifeThreatening: false,
  });

  metrics.plannerStartMs = 0;
  const planned = await runPlannerSafe(context, session.callSid, options);
  metrics.plannerDoneMs = planned.ms;

  if (!planned.proposal) {
    metrics.source = "fallback";
    metrics.fallbackReason = planned.reason;
    metrics.firstTokenReadyMs = hrMs(tAll);
    logHybridMetric("validation_done", session.callSid, {
      ms: 0,
      ok: false,
      reason: planned.reason,
    });
    logHybridMetric("first_token_ready", session.callSid, {
      ms: metrics.firstTokenReadyMs,
      source: "fallback",
      field: nextAsk.field,
    });
    return nextAsk;
  }

  const tVal = process.hrtime();
  const validation = validatePlannerProposal(planned.proposal, context);
  metrics.validationDoneMs = hrMs(tVal);
  logHybridMetric("validation_done", session.callSid, {
    ms: metrics.validationDoneMs,
    ok: validation.ok,
    reason: validation.reason,
  });

  if (!validation.ok) {
    metrics.source = "fallback";
    metrics.fallbackReason = validation.reason;
    metrics.firstTokenReadyMs = hrMs(tAll);
    logHybridMetric("first_token_ready", session.callSid, {
      ms: metrics.firstTokenReadyMs,
      source: "fallback",
      field: nextAsk.field,
    });
    return nextAsk;
  }

  metrics.source = "planner";
  metrics.firstTokenReadyMs = hrMs(tAll);
  logHybridMetric("first_token_ready", session.callSid, {
    ms: metrics.firstTokenReadyMs,
    source: "planner",
    field: nextAsk.field,
  });

  return { field: nextAsk.field, question: validation.spoken };
}

/**
 * Optionally rewrite the closing. Never speaks a "saved" claim before persist.
 * Emergency deterministic closing wins if planner softens safety language.
 */
export async function articulateClosing(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  deterministicClosing: string;
  persisted: boolean;
  lifeThreatening: boolean;
  callActionable?: boolean;
  planOptions?: PlanConversationalOptions;
}): Promise<string> {
  const { session, analysis, deterministicClosing } = input;
  const tAll = process.hrtime();

  const enabled =
    isHybridConversationalEnabled() ||
    Boolean(input.planOptions?.planFn || injectedPlanOptions?.planFn);

  if (!enabled) {
    return deterministicClosing;
  }

  // Life-threatening: keep deterministic ER/911 wording — planner must not override.
  if (input.lifeThreatening) {
    logHybridMetric("first_token_ready", session.callSid, {
      ms: hrMs(tAll),
      source: "fallback",
      reason: "emergency_deterministic",
      field: "closing",
    });
    return deterministicClosing;
  }

  const options: PlanConversationalOptions = {
    ...injectedPlanOptions,
    ...input.planOptions,
  };

  const actionable =
    input.callActionable ?? isCallActionable(session, analysis);

  // Closing before the call is actionable is not allowed.
  if (!actionable && !input.lifeThreatening) {
    logHybridMetric("first_token_ready", session.callSid, {
      ms: hrMs(tAll),
      source: "fallback",
      reason: "close_before_actionable",
      field: "closing",
    });
    return deterministicClosing;
  }

  // Persistence must succeed before any "saved/shared" closing.
  if (!input.persisted) {
    logHybridMetric("first_token_ready", session.callSid, {
      ms: hrMs(tAll),
      source: "fallback",
      reason: "close_before_persist",
      field: "closing",
    });
    return deterministicClosing;
  }

  const context = buildPlannerContext({
    session,
    analysis,
    mode: "close",
    requiredField: null,
    deterministicDraft: deterministicClosing,
    callActionable: actionable,
    persisted: input.persisted,
    lifeThreatening: input.lifeThreatening,
  });

  const planned = await runPlannerSafe(context, session.callSid, options);
  if (!planned.proposal) {
    logHybridMetric("first_token_ready", session.callSid, {
      ms: hrMs(tAll),
      source: "fallback",
      reason: planned.reason,
      field: "closing",
    });
    return deterministicClosing;
  }

  const validation = validatePlannerProposal(planned.proposal, context);
  logHybridMetric("validation_done", session.callSid, {
    ms: 0,
    ok: validation.ok,
    reason: validation.reason,
  });

  if (!validation.ok) {
    logHybridMetric("first_token_ready", session.callSid, {
      ms: hrMs(tAll),
      source: "fallback",
      reason: validation.reason,
      field: "closing",
    });
    return deterministicClosing;
  }

  logHybridMetric("first_token_ready", session.callSid, {
    ms: hrMs(tAll),
    source: "planner",
    field: "closing",
  });
  return validation.spoken;
}

/** Debug/test helper that returns full articulate trace for an ask. */
export async function articulateNextAskDetailed(input: {
  session: LiveCallSession;
  analysis: ConversationAnalysis;
  nextAsk: NextAsk;
  planOptions?: PlanConversationalOptions;
}): Promise<ArticulateResult & { nextAsk: NextAsk }> {
  const { session, analysis, nextAsk } = input;
  const options: PlanConversationalOptions = {
    ...injectedPlanOptions,
    ...input.planOptions,
  };

  const context = buildPlannerContext({
    session,
    analysis,
    mode: "ask",
    requiredField: nextAsk.field,
    deterministicDraft: nextAsk.question,
    callActionable: isCallActionable(session, analysis),
    persisted: false,
    lifeThreatening: false,
  });

  const tAll = process.hrtime();
  const metrics: ArticulateMetrics = {
    plannerStartMs: 0,
    plannerDoneMs: null,
    validationDoneMs: null,
    firstTokenReadyMs: null,
    source: "fallback",
  };

  try {
    const proposal = await planConversationalResponse(context, options);
    metrics.plannerDoneMs = hrMs(tAll);
    const validation = validatePlannerProposal(proposal, context);
    metrics.validationDoneMs = hrMs(tAll);
    metrics.firstTokenReadyMs = hrMs(tAll);
    if (!validation.ok) {
      metrics.fallbackReason = validation.reason;
      return {
        spoken: nextAsk.question,
        usedPlanner: false,
        proposal,
        context,
        metrics,
        validationReason: validation.reason,
        nextAsk,
      };
    }
    metrics.source = "planner";
    return {
      spoken: validation.spoken,
      usedPlanner: true,
      proposal,
      context,
      metrics,
      validationReason: "ok",
      nextAsk: { field: nextAsk.field, question: validation.spoken },
    };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "planner_error";
    metrics.fallbackReason = message;
    metrics.firstTokenReadyMs = hrMs(tAll);
    return {
      spoken: nextAsk.question,
      usedPlanner: false,
      proposal: null,
      context,
      metrics,
      validationReason: message,
      nextAsk,
    };
  }
}
