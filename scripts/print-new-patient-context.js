#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const { INTENTS } = require("../src/engine/intents");
const { PromptContextBuilder } = require("../src/engine/prompt-context-builder");

const repoRoot = path.resolve(__dirname, "..");
const practiceConfigPath = path.join(
  repoRoot,
  "config/practices/example-grand-rapids.json"
);

const practiceConfig = JSON.parse(fs.readFileSync(practiceConfigPath, "utf8"));
const builder = new PromptContextBuilder({ repoRoot });

const result = builder.build({
  intent: INTENTS.NEW_PATIENT,
  practiceConfig,
});

console.log(result.compiled);
console.error("");
console.error("---");
console.error(`Sections: ${result.sections.length}`);
console.error(`Characters: ${result.characterCount}`);
console.error(`Budget: ${result.maxCharBudget}`);
console.error(`Within budget: ${result.withinBudget}`);
console.error(
  `Knowledge docs: ${Object.values(result.documentPlan)
    .flat()
    .filter(Boolean).length}`
);
