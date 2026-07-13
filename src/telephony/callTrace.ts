/**
 * Development-only live-call turn trace — sanitized, replayable.
 * Never logs API keys, Twilio credentials, full phones, full names, or raw PHI transcripts.
 */

import type { ConversationalAction, ConversationOptions } from "./allowedActions.ts";
import type { TurnDecision } from "./articulateResponse.ts";
import type { LiveCallSession } from "./callSession.ts";
import {
  emotionalCuesFromSession,
  inferCallStage,
  type CallStage,
} from "./conversationStages.ts";
import type { PlannerProposal } from "./conversationalPlanner.ts";

export interface TurnLatencyBreakdown {
  /** Relative ms from caller-final transcript received (always 0). */
  callerFinalReceivedMs: number;
  semanticInterpretationMs?: number | null;
  stateMergeCompleteMs?: number | null;
  allowedActionsCompleteMs?: number | null;
  factExtractionCompleteMs: number;
  plannerRequestStartedMs: number | null;
  plannerResponseReceivedMs: number | null;
  guardrailValidationCompleteMs: number | null;
  firstSpeechTokenReadyMs: number;
}

/** Expected healthy contributions when the planner is healthy (guidance for debugging). */
export const EXPECTED_LATENCY_MS = {
  factExtraction: { typical: 5, maxHealthy: 40 },
  semanticHeuristic: { typical: 5, maxHealthy: 30 },
  semanticOpenAi: { typical: 400, maxHealthy: 1200 },
  plannerOpenAi: { typical: 600, maxHealthy: 1800 },
  guardrailValidation: { typical: 1, maxHealthy: 5 },
  speechCompose: { typical: 1, maxHealthy: 10 },
  /** Redundant second planner on close — should be 0 after latency fix. */
  closingPlanner: { typical: 0, maxHealthy: 0 },
  totalDecisionHealthy: { typical: 700, maxHealthy: 2000 },
  firstTokenTargetMs: 1500,
  ordinaryTurnMaxHealthyMs: 2500,
} as const;

export interface CallTurnTrace {
  turnNumber: number;
  callStage: CallStage;
  factsKnownBefore: Record<string, boolean | string | null>;
  factsConfirmedBefore: Record<string, boolean>;
  latestIntentCategory: string;
  emotionalCues: string[];
  urgencyClassification: string;
  actionableStatus: boolean;
  allowedActions: ConversationalAction[];
  hardRequiredAction: ConversationalAction | null;
  plannerSelectedAction: string | null;
  plannerAcknowledgment: string | null;
  plannerSpokenResponse: string | null;
  plannerUnderstanding: string | null;
  plannerWhyThisAction: string | null;
  guardrailDecision: string;
  fallbackReason: string | null;
  plannerLatencyMs: number | null;
  latency: TurnLatencyBreakdown;
  factsExtractedAfter: Record<string, boolean | string | null>;
  continueOrCloseReason: string;
  /** Sanitized caller utterance length only — never the raw text in default logs. */
  callerUtteranceChars: number;
}

export interface CallTraceSession {
  callSidToken: string;
  turns: CallTurnTrace[];
  startedAt: string;
}

export function isCallTraceEnabled(): boolean {
  const flag = (process.env.PHONE_CALL_TRACE || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return process.env.NODE_ENV !== "production";
}

/** Opaque CallSid token — keep prefix only. */
export function sanitizeCallSid(callSid: string): string {
  const s = String(callSid || "");
  if (s.length <= 8) return "CA_****";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***-***-${digits.slice(-4)}`;
}

/** Redact likely names / spelling letters from spoken lines for trace storage. */
export function sanitizeSpokenForTrace(text: string): string {
  let t = String(text || "");
  // Letter read-backs like B-U-U-R-M-A
  t = t.replace(/\b(?:[A-Za-z]-){2,}[A-Za-z]\b/g, "[SPELLING]");
  // First-name vocatives: "Thank you, William."
  t = t.replace(
    /\b(Thank you|Thanks),\s+[A-Z][a-z]{1,20}\b/g,
    "$1, [NAME]"
  );
  return t.slice(0, 280);
}

export function snapshotFacts(options: ConversationOptions): Record<
  string,
  boolean | string | null
> {
  return { ...options.factsCaptured };
}

export function snapshotFactsFromSession(
  session: LiveCallSession
): Record<string, boolean | string | null> {
  return {
    nameCaptured: session.slots.nameCaptured === true,
    lastNameSpellingCaptured: session.slots.lastNameSpellingCaptured === true,
    lastNameConfirmed: session.slots.lastNameConfirmed === true,
    locationComplete: Boolean(
      session.slots.locationParts?.vertical &&
        session.slots.locationParts?.side &&
        session.slots.locationParts?.depth
    ),
    swellingKnown: typeof session.slots.swelling === "boolean",
    swelling:
      typeof session.slots.swelling === "boolean" ? session.slots.swelling : null,
    keptAwake: session.slots.keptAwake === true,
    wantsEarliest:
      typeof session.slots.wantsEarliest === "boolean"
        ? session.slots.wantsEarliest
        : null,
    shortNoticeOk:
      typeof session.slots.shortNoticeOk === "boolean"
        ? session.slots.shortNoticeOk
        : null,
    spellingAbandoned: session.slots.spellingAbandoned === true,
  };
}

export function buildTurnTrace(input: {
  turnNumber: number;
  sessionBefore: LiveCallSession;
  optionsBefore: ConversationOptions;
  intentCategory: string;
  decision: TurnDecision;
  latency: TurnLatencyBreakdown;
  sessionAfter: LiveCallSession;
  callerUtteranceChars: number;
  continueOrCloseReason: string;
}): CallTurnTrace {
  const proposal: PlannerProposal | null = input.decision.proposal;
  const stage = inferCallStage(input.sessionBefore, input.optionsBefore);
  return {
    turnNumber: input.turnNumber,
    callStage: stage,
    factsKnownBefore: snapshotFacts(input.optionsBefore),
    factsConfirmedBefore: { ...input.optionsBefore.factsConfirmed },
    latestIntentCategory: input.intentCategory,
    emotionalCues: emotionalCuesFromSession(input.sessionBefore),
    urgencyClassification: input.optionsBefore.urgency,
    actionableStatus: input.optionsBefore.actionable,
    allowedActions: [...input.optionsBefore.allowedActions],
    hardRequiredAction: input.optionsBefore.hardRequiredAction,
    plannerSelectedAction: input.decision.selectedAction,
    plannerAcknowledgment: proposal?.acknowledgment
      ? sanitizeSpokenForTrace(proposal.acknowledgment)
      : null,
    plannerSpokenResponse: proposal?.spokenResponse
      ? sanitizeSpokenForTrace(proposal.spokenResponse)
      : input.decision.nextAsk?.question
        ? sanitizeSpokenForTrace(input.decision.nextAsk.question)
        : null,
    plannerUnderstanding: proposal?.understanding || null,
    plannerWhyThisAction: proposal?.whyThisAction || proposal?.reason || null,
    guardrailDecision: input.decision.validationReason,
    fallbackReason: input.decision.fallbackReason || null,
    plannerLatencyMs: input.decision.plannerLatencyMs,
    latency: input.latency,
    factsExtractedAfter: snapshotFactsFromSession(input.sessionAfter),
    continueOrCloseReason: input.continueOrCloseReason,
    callerUtteranceChars: input.callerUtteranceChars,
  };
}

export function logTurnTrace(trace: CallTurnTrace, callSidToken: string): void {
  if (!isCallTraceEnabled()) return;
  const compact = {
    turn: trace.turnNumber,
    stage: trace.callStage,
    intent: trace.latestIntentCategory,
    emotion: trace.emotionalCues,
    urgency: trace.urgencyClassification,
    actionable: trace.actionableStatus,
    allowed: trace.allowedActions,
    hard: trace.hardRequiredAction,
    selected: trace.plannerSelectedAction,
    guardrail: trace.guardrailDecision,
    fallback: trace.fallbackReason,
    plannerMs: trace.plannerLatencyMs,
    totalMs: trace.latency.firstSpeechTokenReadyMs,
    continue: trace.continueOrCloseReason,
    factsAfter: trace.factsExtractedAfter,
  };
  console.log(
    `[call-trace] ${new Date().toISOString()} CallSid=${callSidToken} ${JSON.stringify(compact)}`
  );
}

export function createCallTraceSession(callSid: string): CallTraceSession {
  return {
    callSidToken: sanitizeCallSid(callSid),
    turns: [],
    startedAt: new Date().toISOString(),
  };
}

export function appendTurnTrace(
  traceSession: CallTraceSession,
  trace: CallTurnTrace
): void {
  traceSession.turns.push(trace);
  logTurnTrace(trace, traceSession.callSidToken);
}
