/**
 * V1 proof loop — mock transcript through conversation intelligence to summary + signal.
 */

import { assessFrontDeskWithReasoning } from "./frontDesk.ts";
import { assessEmotionWithReasoning } from "./psychology.ts";
import { createStateFromTranscript } from "./state.ts";
import { buildCallSummaryWithReasoning, applyAnalysisToState } from "./summary.ts";
import { callSummaryToOperationalEvent } from "../events/fromCallSummary.ts";
import { toCallSummarySignalWithReasoning } from "./signal.ts";
import { assessUrgencyWithReasoning } from "./triage.ts";
import type { ConversationAnalysis } from "./engine.ts";
import type { ReasoningTrace } from "./reasoning/types.ts";
import { assembleReasoningTrace } from "./reasoning/assembleTrace.ts";
import type {
  MockCallTranscript,
  ProcessCallResult,
  TranscriptTurn,
} from "./types.ts";
import { understandTranscriptWithReasoning } from "./understanding.ts";

function patientUtterances(turns: TranscriptTurn[]): string {
  return turns
    .filter((t) => t.speaker === "patient" || t.speaker === "caller")
    .map((t) => t.text)
    .join(" ");
}

/**
 * End-to-end conversation intelligence for one completed mock call.
 * No telephony, no LLM — deterministic brains only.
 */
export function processCallTranscript(
  transcript: MockCallTranscript
): ProcessCallResult & {
  analysis: ConversationAnalysis;
  state: ReturnType<typeof applyAnalysisToState>;
  reasoning: ReasoningTrace;
} {
  const understandingResult = understandTranscriptWithReasoning(transcript.turns);
  const understanding = understandingResult.output;

  const urgencyResult = assessUrgencyWithReasoning(understanding, understanding.intent);
  const urgency = urgencyResult.output;

  const frontDeskResult = assessFrontDeskWithReasoning(
    understanding,
    urgency,
    understanding.intent,
    transcript.afterHours
  );
  const frontDesk = frontDeskResult.output;

  const psychologyResult = assessEmotionWithReasoning(patientUtterances(transcript.turns));
  const psychology = psychologyResult.output;

  let state = createStateFromTranscript(transcript);
  state = applyAnalysisToState(state, understanding, urgency, frontDesk, psychology);

  const summaryResult = buildCallSummaryWithReasoning({
    transcript,
    understanding,
    urgency,
    frontDesk,
    psychology,
  });
  const summary = summaryResult.output;

  const signalResult = toCallSummarySignalWithReasoning(summary);
  const signal = signalResult.output;
  const operationalEvent = callSummaryToOperationalEvent(summary);

  const reasoning = assembleReasoningTrace({
    understanding: understandingResult,
    psychology: psychologyResult,
    triage: urgencyResult,
    frontDesk: frontDeskResult,
    summary: summaryResult,
    practiceBrain: signalResult,
  });

  const analysis: ConversationAnalysis = {
    understanding,
    psychology,
    triage: urgency,
    frontDesk,
    summary,
    reasoning,
  };

  return { summary, signal, operationalEvent, analysis, state, reasoning };
}
