/**
 * Format reasoning evidence for validation failures and audit logs.
 * No PHI — callers should pass redacted traces in aggregate logs.
 */

import type { ReasoningTrace, StageReasoning } from "./types.ts";

export function formatStageReasoning(stage: StageReasoning): string {
  const lines: string[] = [`[${stage.stage}]`];

  const factSummary = stage.facts
    .slice(0, 8)
    .map((f) => `${f.id}${f.value !== undefined ? `=${JSON.stringify(f.value)}` : ""}`)
    .join(", ");
  if (factSummary) {
    lines.push(`  facts: ${factSummary}${stage.facts.length > 8 ? " …" : ""}`);
  }

  if (stage.rulesFired.length > 0) {
    lines.push(
      `  rules: ${stage.rulesFired.map((r) => r.ruleId).join(", ")}`
    );
  }

  if (stage.rationale.length > 0) {
    lines.push(`  why: ${stage.rationale.join("; ")}`);
  }

  lines.push(`  confidence: ${stage.confidence}`);

  return lines.join("\n");
}

export function formatReasoningTrace(trace: ReasoningTrace): string {
  const stages = [
    trace.understanding,
    trace.psychology,
    trace.triage,
    trace.frontDesk,
    trace.summary,
    trace.practiceBrain,
  ].filter((stage): stage is StageReasoning => stage !== undefined);

  return stages.map(formatStageReasoning).join("\n");
}
