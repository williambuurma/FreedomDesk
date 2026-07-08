/**
 * Assemble full reasoning trace from stage results.
 */

import type { ReasoningTrace } from "./types.ts";
import type { PracticeBrainSignalResult } from "../signal.ts";
import type { SummaryResult } from "../summary.ts";
import type { FrontDeskResult } from "../frontDesk.ts";
import type { TriageResult } from "../triage.ts";
import type { PsychologyResult } from "../psychology.ts";
import type { UnderstandingResult } from "../understanding.ts";

export function assembleReasoningTrace(stages: {
  understanding: UnderstandingResult;
  psychology: PsychologyResult;
  triage: TriageResult;
  frontDesk: FrontDeskResult;
  summary?: SummaryResult;
  practiceBrain?: PracticeBrainSignalResult;
}): ReasoningTrace {
  const trace: ReasoningTrace = {
    understanding: stages.understanding.reasoning,
    psychology: stages.psychology.reasoning,
    triage: stages.triage.reasoning,
    frontDesk: stages.frontDesk.reasoning,
  };
  if (stages.summary) {
    trace.summary = stages.summary.reasoning;
  }
  if (stages.practiceBrain) {
    trace.practiceBrain = stages.practiceBrain.reasoning;
  }
  return trace;
}
