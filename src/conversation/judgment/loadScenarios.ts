/**
 * Load judgment validation scenarios from fixtures/judgment-scenarios/.
 */

import fs from "node:fs";
import path from "node:path";

import type { JudgmentScenario, MockCallTranscript } from "./types.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const scenariosDir = path.join(repoRoot, "fixtures/judgment-scenarios");

function resolveTranscript(scenario: JudgmentScenario): MockCallTranscript {
  if (scenario.transcript) {
    return scenario.transcript;
  }
  if (scenario.transcriptRef) {
    const filePath = path.join(repoRoot, scenario.transcriptRef);
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as MockCallTranscript;
  }
  throw new Error(
    `Scenario ${scenario.meta.id} must define transcript or transcriptRef`
  );
}

export function loadJudgmentScenarios(): Array<JudgmentScenario & { transcript: MockCallTranscript }> {
  const files = fs
    .readdirSync(scenariosDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  return files.map((file) => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(scenariosDir, file), "utf8")
    ) as JudgmentScenario;
    return {
      ...raw,
      transcript: resolveTranscript(raw),
    };
  });
}
