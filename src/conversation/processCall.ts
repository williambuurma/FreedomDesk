/**
 * V1 proof loop — mock transcript through conversation intelligence to summary + signal.
 */

import { assessFrontDesk } from "./frontDesk.ts";
import { assessEmotion } from "./psychology.ts";
import { createStateFromTranscript } from "./state.ts";
import { buildCallSummary, applyAnalysisToState } from "./summary.ts";
import { toCallSummarySignal } from "./signal.ts";
import { assessUrgency } from "./triage.ts";
import type { ConversationAnalysis } from "./engine.ts";
import type {
  MockCallTranscript,
  ProcessCallResult,
  TranscriptTurn,
} from "./types.ts";
import { understandTranscript } from "./understanding.ts";

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
): ProcessCallResult & { analysis: ConversationAnalysis; state: ReturnType<typeof applyAnalysisToState> } {
  const understanding = understandTranscript(transcript.turns);
  const urgency = assessUrgency(understanding, understanding.intent);
  const frontDesk = assessFrontDesk(
    understanding,
    urgency,
    understanding.intent,
    transcript.afterHours
  );
  const psychology = assessEmotion(patientUtterances(transcript.turns));

  let state = createStateFromTranscript(transcript);
  state = applyAnalysisToState(state, understanding, urgency, frontDesk, psychology);

  const summary = buildCallSummary({
    transcript,
    understanding,
    urgency,
    frontDesk,
    psychology,
  });

  const signal = toCallSummarySignal(summary);

  const analysis: ConversationAnalysis = {
    understanding,
    psychology,
    triage: urgency,
    frontDesk,
    summary,
  };

  return { summary, signal, analysis, state };
}
