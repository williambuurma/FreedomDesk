/**
 * Shared live-turn decision path used by ConversationRelay and the replay harness.
 * FreedomDesk owns dialogue; this is not a new product framework.
 *
 * Order: session update → semantic interpret → provenance merge →
 * loop note → analyze → plan (allow-list) → emotional judgment → loop record.
 */

import type { ConversationAnalysis } from "../conversation/engine.ts";
import { analyzeTranscriptTurns } from "../conversation/engine.ts";
import {
  buildConversationOptions,
  deterministicSpeechForAction,
  type ConversationOptions,
} from "./allowedActions.ts";
import {
  planNextTurn,
  type TurnDecision,
} from "./articulateResponse.ts";
import {
  appendTurnTrace,
  createCallTraceSession,
  isCallTraceEnabled,
  sanitizeSpokenForTrace,
  snapshotFacts,
  snapshotFactsFromSession,
  type CallTraceSession,
  type CallTurnTrace,
  type TurnLatencyBreakdown,
} from "./callTrace.ts";
import {
  createOrUpdateSession,
  getCallSession,
  getIdentityState,
  sessionToTranscript,
  clearPostInterruptAwait,
  type LiveCallSession,
} from "./callSession.ts";
import {
  noteStateAfterCallerTurn,
  recordSelectedAction,
  pickRecoveryAction,
  softCompleteFailedAction,
  ensureLoopState,
} from "./conversationLoopDetector.ts";
import {
  emotionalCuesFromSession,
  inferCallStage,
  type CallStage,
} from "./conversationStages.ts";
import {
  proposalChoosing,
  type PlanConversationalOptions,
} from "./conversationalPlanner.ts";
import { applyEmotionalJudgment } from "./emotionalJudgment.ts";
import { polishSpokenDelivery } from "./alyDelivery.ts";
import { mergeSemanticInterpretation } from "./factProvenance.ts";
import {
  interpretSemanticTurn,
  type SemanticInterpreterOptions,
} from "./semanticTurnInterpreter.ts";
import type { SemanticTurnInterpretation } from "./semanticTurnTypes.ts";
import { phoneIntentForTrace } from "./phoneIntent.ts";
import { isLocationComplete } from "./toothLocation.ts";
function hrMs(start: [number, number]): number {
  const [s, n] = process.hrtime(start);
  return Math.round(s * 1000 + n / 1e6);
}

export interface LiveTurnInput {
  callSid: string;
  speechResult: string;
  from?: string;
  digits?: string;
  planOptions?: PlanConversationalOptions;
  semanticOptions?: SemanticInterpreterOptions;
  /** Optional shared trace bag for multi-turn replay / live debug. */
  traceSession?: CallTraceSession;
  turnNumber?: number;
  /** Final prompt arrived after a ConversationRelay interrupt. */
  afterInterrupt?: boolean;
}

export interface LiveTurnResult {
  session: LiveCallSession | null;
  analysis: ConversationAnalysis | null;
  options: ConversationOptions | null;
  decision: TurnDecision | null;
  latency: TurnLatencyBreakdown;
  callStage: CallStage | null;
  continueOrCloseReason: string;
  trace: CallTurnTrace | null;
  semantic: SemanticTurnInterpretation | null;
}

/**
 * Same decision path as ConversationRelay handleFinalPrompt:
 * createOrUpdateSession → semantic interpret → merge → planNextTurn.
 */
export async function executeLiveTurn(
  input: LiveTurnInput
): Promise<LiveTurnResult> {
  const t0 = process.hrtime();
  const latency: TurnLatencyBreakdown = {
    callerFinalReceivedMs: 0,
    semanticInterpretationMs: null,
    stateMergeCompleteMs: null,
    allowedActionsCompleteMs: null,
    factExtractionCompleteMs: 0,
    plannerRequestStartedMs: null,
    plannerResponseReceivedMs: null,
    guardrailValidationCompleteMs: null,
    firstSpeechTokenReadyMs: 0,
  };

  // Snapshot prior facts for the turn trace (before applying this utterance).
  const prior = getCallSession(input.callSid);
  let optionsBefore: ConversationOptions | null = null;
  let emotionalBefore: string[] = [];
  const previousAction = prior?.lastSelectedAction || null;
  const previousQuestion =
    prior?.lastInterruptedAlyText || prior?.lastAlyQuestion || null;

  if (prior) {
    try {
      const priorAnalysis = analyzeTranscriptTurns(
        sessionToTranscript(prior).turns,
        prior.afterHours
      );
      optionsBefore = buildConversationOptions(prior, priorAnalysis);
      emotionalBefore = emotionalCuesFromSession(prior);
    } catch {
      optionsBefore = null;
    }
  }

  const session = createOrUpdateSession({
    callSid: input.callSid,
    speechResult: input.speechResult,
    from: input.from,
    digits: input.digits,
  });

  if (!session) {
    latency.firstSpeechTokenReadyMs = hrMs(t0);
    return {
      session: null,
      analysis: null,
      options: null,
      decision: null,
      latency,
      callStage: null,
      continueOrCloseReason: "empty_session",
      trace: null,
      semantic: null,
    };
  }

  if (input.afterInterrupt || session.awaitingPostInterruptPrompt) {
    clearPostInterruptAwait(session);
  }

  ensureLoopState(session);
  const id = getIdentityState(session);

  // Phase 2 — semantic turn interpreter (before action selection).
  const semanticStarted = hrMs(t0);
  const semantic = await interpretSemanticTurn(
    {
      utterance: input.speechResult,
      previousAction,
      previousQuestion,
      structuredState: {
        nameCaptured: id.nameCaptured,
        lastNameSpellingCaptured: id.lastNameSpellingCaptured,
        lastNameConfirmed: id.lastNameConfirmed,
        locationComplete: isLocationComplete(session.slots.locationParts),
        swellingKnown: typeof session.slots.swelling === "boolean",
        wantsEarliestKnown: typeof session.slots.wantsEarliest === "boolean",
        shortNoticeKnown: typeof session.slots.shortNoticeOk === "boolean",
        locationHint: session.slots.location || null,
      },
      recentTurns: session.turns.slice(-4).map((t) => ({
        speaker:
          t.speaker === "agent" || t.speaker === "aly" ? "aly" : "caller",
        text: t.text,
      })),
    },
    input.semanticOptions
  );
  latency.semanticInterpretationMs = hrMs(t0) - semanticStarted;

  // Phase 3 — provenance merge (multi-fact, corrections, yes/no targeting).
  mergeSemanticInterpretation(session, semantic, { previousAction });
  noteStateAfterCallerTurn(session);
  latency.stateMergeCompleteMs = hrMs(t0);
  latency.factExtractionCompleteMs = hrMs(t0);

  const transcript = sessionToTranscript(session);
  const analysis = analyzeTranscriptTurns(transcript.turns, session.afterHours);
  const optionsNow = buildConversationOptions(session, analysis);
  latency.allowedActionsCompleteMs = hrMs(t0);
  if (!optionsBefore) {
    optionsBefore = optionsNow;
    emotionalBefore = emotionalCuesFromSession(session);
  }

  const callStage = inferCallStage(session, optionsNow);

  latency.plannerRequestStartedMs = hrMs(t0);

  let decision = await planNextTurn({
    session,
    analysis,
    planOptions: input.planOptions,
  });

  // Phase 4 — if the same action would trap, recover to another allowed action.
  const turnNumber =
    input.turnNumber ??
    (input.traceSession ? input.traceSession.turns.length + 1 : 1);
  const loopResult = recordSelectedAction(
    session,
    decision.selectedAction,
    turnNumber
  );
  if (loopResult.shouldRecover && decision.kind === "ask") {
    softCompleteFailedAction(session, decision.selectedAction);
    const refreshed = buildConversationOptions(session, analysis);
    let alt = pickRecoveryAction(
      refreshed.allowedActions,
      decision.selectedAction
    );
    if (!alt && refreshed.actionable) {
      alt = "persist_and_close";
    }
    if (alt && alt !== decision.selectedAction) {
      decision = await planNextTurn({
        session,
        analysis,
        planOptions: {
          ...input.planOptions,
          planFn: async (ctx) => {
            const spoken =
              loopResult.recoverySpeech ||
              "I'll note that for the team, and we'll keep moving.";
            const body =
              alt === "persist_and_close" || alt === "emergency_escalation"
                ? ""
                : deterministicSpeechForAction(alt!, session, ctx.options);
            return proposalChoosing(alt!, `${spoken} ${body}`.trim(), {
              understanding: "loop_recovery",
              whyThisAction: "loop_recovery",
            });
          },
        },
      });
    }
  }

  // Phase 6 — selective emotional judgment on spoken output.
  if (decision.kind === "ask" && decision.nextAsk) {
    const judged = applyEmotionalJudgment(
      session,
      decision.nextAsk.question,
      semantic,
      decision.selectedAction
    );
    decision.nextAsk.question = polishSpokenDelivery(judged);
    if (decision.proposal) {
      decision.proposal.spokenResponse = decision.nextAsk.question;
    }
  }

  latency.plannerResponseReceivedMs =
    decision.plannerLatencyMs != null
      ? (latency.plannerRequestStartedMs || 0) + decision.plannerLatencyMs
      : hrMs(t0);
  latency.guardrailValidationCompleteMs = hrMs(t0);
  latency.firstSpeechTokenReadyMs = hrMs(t0);

  // Persist previous action for the next semantic turn.
  session.lastSelectedAction = decision.selectedAction;
  if (decision.kind === "ask" && decision.nextAsk) {
    session.lastAlyQuestion = decision.nextAsk.question;
  }
  if (
    decision.selectedAction === "answer_process_question" &&
    session.lastSemanticInterpretation
  ) {
    session.lastSemanticInterpretation.conversationSignals.callerAsksWhatHappensNext =
      false;
    session.lastSemanticInterpretation.conversationSignals.callerAsksIfHasAppointment =
      false;
    session.metaQuestionAnswered = true;
  }

  const continueOrCloseReason =
    decision.kind === "complete"
      ? decision.selectedAction === "emergency_escalation"
        ? "emergency_escalation"
        : decision.options.actionable
          ? "persist_and_close_actionable"
          : `complete:${decision.selectedAction}`
      : `continue:${decision.selectedAction}`;

  let trace: CallTurnTrace | null = null;
  if (isCallTraceEnabled() || input.traceSession) {
    const proposal = decision.proposal;
    trace = {
      turnNumber,
      callStage: inferCallStage(session, optionsBefore),
      factsKnownBefore: snapshotFacts(optionsBefore),
      factsConfirmedBefore: { ...optionsBefore.factsConfirmed },
      latestIntentCategory: phoneIntentForTrace(session, analysis),
      emotionalCues: [
        ...emotionalBefore,
        ...(semantic.emotions || []),
      ],
      urgencyClassification: optionsBefore.urgency,
      actionableStatus: optionsBefore.actionable,
      allowedActions: [...decision.options.allowedActions],
      hardRequiredAction: decision.options.hardRequiredAction,
      plannerSelectedAction: decision.selectedAction,
      plannerAcknowledgment: proposal?.acknowledgment
        ? sanitizeSpokenForTrace(proposal.acknowledgment)
        : null,
      plannerSpokenResponse: proposal?.spokenResponse
        ? sanitizeSpokenForTrace(proposal.spokenResponse)
        : decision.nextAsk?.question
          ? sanitizeSpokenForTrace(decision.nextAsk.question)
          : null,
      plannerUnderstanding: proposal?.understanding || null,
      plannerWhyThisAction: proposal?.whyThisAction || proposal?.reason || null,
      guardrailDecision: decision.validationReason,
      fallbackReason: decision.fallbackReason || null,
      plannerLatencyMs: decision.plannerLatencyMs,
      latency,
      factsExtractedAfter: snapshotFactsFromSession(session),
      continueOrCloseReason,
      callerUtteranceChars: String(input.speechResult || "").length,
    };
    if (input.traceSession) {
      appendTurnTrace(input.traceSession, trace);
    } else if (isCallTraceEnabled()) {
      const bag = createCallTraceSession(input.callSid);
      appendTurnTrace(bag, trace);
    }
  }

  return {
    session,
    analysis,
    options: decision.options,
    decision,
    latency,
    callStage,
    continueOrCloseReason,
    trace,
    semantic,
  };
}

export { createCallTraceSession };
