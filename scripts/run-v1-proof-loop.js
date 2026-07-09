#!/usr/bin/env node
"use strict";

/**
 * V1 proof loop — mock transcript → conversation intelligence → Practice Brain → preview data.
 *
 * Usage: node --experimental-strip-types scripts/run-v1-proof-loop.js [fixture-path]
 * Default fixture: fixtures/calls/toothache-overnight.json
 *
 * Outputs:
 *   data/v1-proof-loop-result.json — summary + ingest artifact
 *   data/morning-brief-preview.json — regenerated from brain cycle
 *   data/my-day-preview.json — regenerated from brain cycle
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const defaultFixture = path.join(repoRoot, "fixtures/calls/toothache-overnight.json");
const resultPath = path.join(repoRoot, "data/v1-proof-loop-result.json");

async function runProofLoop(fixturePath) {
  const { processCallTranscript } = await import("../src/conversation/index.ts");
  const {
    PracticeBrain,
    MOCK_PRACTICE_ID,
    resetPracticeBrainRegistry,
  } = await import("../src/practice-brain/index.ts");
  const { resetDailyAwarenessForTests } = await import(
    "../src/practice-brain/dailyAwareness.ts"
  );
  const { resetPracticeMemoryForTests } = await import(
    "../src/practice-brain/practiceMemory.ts"
  );

  const raw = fs.readFileSync(fixturePath, "utf8");
  const transcript = JSON.parse(raw);

  const { summary, signal, operationalEvent, analysis } = processCallTranscript(transcript);

  resetPracticeBrainRegistry();
  resetDailyAwarenessForTests();
  resetPracticeMemoryForTests();

  const brain = new PracticeBrain(MOCK_PRACTICE_ID);
  brain.refreshAwareness();
  brain.ingestOperationalEvent(operationalEvent);
  const brainResult = brain.runDailyCycle(undefined, { refresh: false });

  const ingestedCall = brainResult.awareness.callStream.find(
    (c) => c.callId === signal.callId
  );

  const result = {
    proofLoopVersion: "v1",
    generatedAt: new Date().toISOString(),
    fixture: path.relative(repoRoot, fixturePath),
    transcript: {
      id: transcript.id,
      scenario: transcript.scenario,
      afterHours: transcript.afterHours,
      turnCount: transcript.turns.length,
    },
    conversationIntelligence: {
      intent: analysis.understanding.intent,
      urgency: analysis.triage.urgency,
      psychologyEmotion: analysis.psychology.emotion,
    },
    callSummary: summary,
    practiceBrainSignal: signal,
    operationalEvent,
    ingested: Boolean(ingestedCall),
    morningBriefSections: brainResult.morningBrief.sections.length,
    recommendationCount: brainResult.recommendations.length,
    opportunityCount: brainResult.opportunities.length,
  };

  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.error(`V1 proof loop complete`);
  console.error(`  Fixture: ${result.fixture}`);
  console.error(`  Summary: ${summary.intent} / ${summary.urgency} — ${summary.caller.name}`);
  console.error(`  Ingested: ${result.ingested}`);
  console.error(`  Morning Brief sections: ${result.morningBriefSections}`);
  console.error(`  Written: ${path.relative(repoRoot, resultPath)}`);

  return result;
}

function regeneratePreviews() {
  for (const script of ["generate-morning-brief-preview.js", "generate-my-day-preview.js"]) {
    const scriptPath = path.join(__dirname, script);
    const proc = spawnSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    if (proc.status !== 0) {
      throw new Error(`${script} failed with exit code ${proc.status}`);
    }
  }
}

async function main() {
  const fixturePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : defaultFixture;

  if (!fs.existsSync(fixturePath)) {
    console.error(`Fixture not found: ${fixturePath}`);
    process.exit(1);
  }

  await runProofLoop(fixturePath);
  regeneratePreviews();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
