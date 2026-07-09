#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");

const root = path.join(__dirname, "..");
const previewPath = path.join(root, "data/intelligence-inbox-preview.json");
const appRoot = path.join(root, "app");

describe("Intelligence Inbox preview data", () => {
  test("preview JSON exists with decision-first Action cards", () => {
    assert.ok(
      fs.existsSync(previewPath),
      "data/intelligence-inbox-preview.json missing — run npm run preview:intelligence-inbox"
    );

    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));
    assert.equal(data.$schema, "intelligence-inbox/v1");
    assert.ok(data.practiceId);
    assert.ok(Array.isArray(data.actions) && data.actions.length >= 4);

    for (const action of data.actions) {
      assert.ok(action.id);
      assert.ok(action.decision, "decision headline required");
      assert.ok(action.ifIgnored, "ifIgnored required");
      assert.ok(action.whatHappened);
      assert.ok(action.because);
      assert.ok(action.recommendedNextStep);
      assert.ok(action.primaryResponsibility);
      assert.ok(["critical", "important", "informational"].includes(action.urgencyTier));
      assert.ok(
        ["needs_action", "committed", "completed", "dismissed"].includes(action.status)
      );
      assert.ok(Array.isArray(action.sourceEventIds) && action.sourceEventIds.length >= 1);
      assert.ok(Array.isArray(action.evidence));
    }

    const statuses = new Set(data.actions.map((a) => a.status));
    assert.ok(statuses.has("needs_action"));
    assert.match(data.actions[0].decision, /Call Finn Leo/i);
  });

  test("inbox module files remain available but are not primary nav", () => {
    const indexHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");
    assert.match(indexHtml, /modules\/intelligence-inbox\/module\.js/);
    assert.match(indexHtml, /styles\/intelligence-inbox\.css/);
    assert.ok(fs.existsSync(path.join(appRoot, "modules/intelligence-inbox/template.html")));
    assert.ok(
      fs.existsSync(path.join(appRoot, "modules/intelligence-inbox/intelligence-inbox.js"))
    );

    const moduleJs = fs.readFileSync(
      path.join(appRoot, "modules/intelligence-inbox/module.js"),
      "utf8"
    );
    assert.match(moduleJs, /label:\s*"Next"/);
    assert.match(moduleJs, /navVisible:\s*false/);
  });
});

