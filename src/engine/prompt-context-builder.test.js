"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const { test } = require("node:test");
const path = require("path");

const { INTENTS } = require("./intents");
const { KnowledgeStore } = require("./knowledge-store");
const { validatePracticeConfig } = require("./validate-practice-config");
const {
  PromptContextBuilder,
  PromptContextBudgetError,
  DEFAULT_MAX_CHAR_BUDGET,
} = require("./prompt-context-builder");

const repoRoot = path.resolve(__dirname, "../..");
const examplePracticePath = path.join(
  repoRoot,
  "config/practices/example-grand-rapids.json"
);

test("valid practice config passes validation", () => {
  const practiceConfig = require(examplePracticePath);
  const errors = validatePracticeConfig(practiceConfig);

  assert.deepEqual(errors, {});
});

test("missing required practice config fields fail clearly", () => {
  const errors = validatePracticeConfig({
    practiceId: "test-practice",
    name: "Test Practice",
  });

  assert.ok(errors.timezone);
  assert.ok(errors.address);
  assert.ok(errors["greeting.businessHours"]);

  const builder = new PromptContextBuilder({ repoRoot });
  assert.throws(
    () =>
      builder.build({
        intent: INTENTS.NEW_PATIENT,
        practiceConfig: { practiceId: "x", name: "X" },
      }),
    /Invalid practice config/
  );
  assert.throws(
    () =>
      builder.build({
        intent: INTENTS.NEW_PATIENT,
        practiceConfig: { practiceId: "x", name: "X" },
      }),
    /timezone: This field is required/
  );
});

test("builds deterministic new-patient prompt context", () => {
  const practiceConfig = require(examplePracticePath);
  const builder = new PromptContextBuilder({ repoRoot });

  const first = builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });
  const second = builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });

  assert.equal(first.compiled, second.compiled);
  assert.equal(first.intent, INTENTS.NEW_PATIENT);
  assert.equal(first.practiceId, "example-grand-rapids");
});

test("includes required prompt layers for new patient", () => {
  const practiceConfig = require(examplePracticePath);
  const builder = new PromptContextBuilder({ repoRoot });
  const result = builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });

  const roles = result.sections.map((section) => section.role);
  assert.deepEqual(roles, [
    "guardrails",
    "persona",
    "regional",
    "practice",
    "call-flow",
  ]);

  const compiled = result.compiled;
  assert.match(compiled, /## Global Guardrails/);
  assert.match(compiled, /## Aly Persona and Conversation Style/);
  assert.match(compiled, /## Michigan Regional Knowledge/);
  assert.match(compiled, /## Practice Configuration/);
  assert.match(compiled, /Cascade Family Dentistry/);
  assert.match(compiled, /## Call Flow/);
  assert.match(compiled, /NEW_PATIENT/);
  assert.match(compiled, /never identify as AI/i);
  assert.doesNotMatch(compiled, /## Intent-Specific Knowledge/);
});

test("uses prompt excerpts instead of full knowledge documents", () => {
  const practiceConfig = require(examplePracticePath);
  const builder = new PromptContextBuilder({ repoRoot });
  const result = builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });

  const guardrailsSection = result.sections.find(
    (section) => section.role === "guardrails"
  );
  assert.ok(
    guardrailsSection.sourcePaths.includes(
      "knowledge/ai/guardrails-prompt-excerpt.md"
    )
  );
  assert.ok(
    !guardrailsSection.sourcePaths.includes("knowledge/ai/guardrails.md")
  );

  const personaSection = result.sections.find(
    (section) => section.role === "persona"
  );
  assert.ok(
    personaSection.sourcePaths.includes(
      "knowledge/ai/conversation-style-prompt-excerpt.md"
    )
  );

  assert.deepEqual(result.documentPlan.regional, [
    "michigan.new-patient-regional",
  ]);
  assert.deepEqual(result.documentPlan.supplemental, []);
  assert.deepEqual(result.documentPlan["call-flow"], ["call-flows.new-patient"]);
});

test("NEW_PATIENT stays within the configured character budget", () => {
  const practiceConfig = require(examplePracticePath);
  const builder = new PromptContextBuilder({ repoRoot });
  const result = builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });

  assert.equal(result.maxCharBudget, DEFAULT_MAX_CHAR_BUDGET);
  assert.equal(result.maxCharBudget, 12000);
  assert.ok(result.withinBudget);
  assert.ok(result.characterCount <= result.maxCharBudget);
  assert.equal(result.characterCount, result.compiled.length);
});

test("intentionally tiny budget fails clearly", () => {
  const practiceConfig = require(examplePracticePath);
  const builder = new PromptContextBuilder({ repoRoot });
  const manifest = structuredClone(builder.manifest);
  manifest.promptContextBudget = { maxCharacters: 100 };

  const tinyBudgetBuilder = new PromptContextBuilder({
    repoRoot,
    manifest,
    knowledgeStore: builder.knowledgeStore,
  });

  assert.throws(
    () =>
      tinyBudgetBuilder.build({
        intent: INTENTS.NEW_PATIENT,
        practiceConfig,
      }),
    (error) => {
      assert.equal(error.name, "PromptContextBudgetError");
      assert.match(error.message, /exceeds character budget/);
      assert.match(error.message, /max 100/);
      assert.ok(error.characterCount > 100);
      return true;
    }
  );
});

test("repeated builds use cached knowledge", () => {
  const practiceConfig = require(examplePracticePath);
  let readCount = 0;
  const knowledgeStore = new KnowledgeStore({
    repoRoot,
    readFile: (filePath, encoding) => {
      readCount += 1;
      return fs.readFileSync(filePath, encoding);
    },
  });

  const builder = new PromptContextBuilder({ repoRoot, knowledgeStore });

  builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });
  const readsAfterFirstBuild = readCount;

  builder.build({
    intent: INTENTS.NEW_PATIENT,
    practiceConfig,
  });

  assert.equal(readCount, readsAfterFirstBuild);
  assert.ok(knowledgeStore.getCachedPathCount() > 0);
});

test("requires intent and practice config", () => {
  const builder = new PromptContextBuilder({ repoRoot });
  const practiceConfig = require(examplePracticePath);

  assert.throws(
    () => builder.build({ practiceConfig }),
    /intent is required/
  );
  assert.throws(
    () => builder.build({ intent: INTENTS.NEW_PATIENT }),
    /practiceConfig is required/
  );
});
