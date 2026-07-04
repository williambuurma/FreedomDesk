#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");

const root = path.join(__dirname, "..");
const appRoot = path.join(root, "app");
const previewPath = path.join(root, "data/morning-brief-preview.json");

const MORNING_BRIEF_SECTIONS = [
  "mbFocus",
  "mbMetrics",
  "mbSchedule",
  "mbOvernight",
  "mbEmergency",
  "mbNewPatients",
  "mbOpportunities",
  "mbRecommendations",
  "mbStewardship",
];

const PLACEHOLDER_MODULES = [
  "calls",
  "patients",
  "opportunities",
  "analytics",
  "settings",
];

describe("Morning Brief preview data", () => {
  test("preview JSON exists and has required dashboard fields", () => {
    assert.ok(fs.existsSync(previewPath), "data/morning-brief-preview.json missing — run npm run preview:morning-brief");

    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));

    assert.equal(data.previewMode, true);
    assert.equal(data.recipientName, "Dr. Buurma");
    assert.ok(data.practiceName);
    assert.ok(data.date);
    assert.ok(Array.isArray(data.sections) && data.sections.length > 0);
    assert.ok(Array.isArray(data.opportunities) && data.opportunities.length > 0);
    assert.ok(Array.isArray(data.topRecommendations) && data.topRecommendations.length > 0);
    assert.ok(data.metrics && Array.isArray(data.metrics.departments));
    assert.ok(data.stewardshipNote && data.stewardshipNote.length > 0);

    const sectionIds = data.sections.map((s) => s.id);
    assert.ok(sectionIds.includes("schedule_snapshot"));
    assert.ok(sectionIds.includes("overnight_calls"));
    assert.ok(sectionIds.includes("emergent_followups"));
    assert.ok(sectionIds.includes("new_patients_today"));
  });
});

describe("FreedomDesk dashboard shell", () => {
  test("core shell files exist and wire all modules", () => {
    const indexHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");

    assert.ok(fs.existsSync(path.join(appRoot, "index.html")));
    assert.ok(fs.existsSync(path.join(appRoot, "dashboard.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/registry.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/placeholder-module.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "styles/dashboard.css")));
    assert.ok(fs.existsSync(path.join(root, "morning-brief.html")), "legacy redirect should remain");

    assert.match(indexHtml, /dashboard\.js/);
    assert.match(indexHtml, /modules\/morning-brief\/module\.js/);

    for (const mod of PLACEHOLDER_MODULES) {
      assert.ok(
        fs.existsSync(path.join(appRoot, "modules", mod, mod + ".js")),
        `placeholder module missing: ${mod}`
      );
      assert.match(indexHtml, new RegExp(`modules/${mod}/${mod}\\.js`));
    }
  });

  test("morning brief template has all required sections", () => {
    const template = fs.readFileSync(
      path.join(appRoot, "modules/morning-brief/template.html"),
      "utf8"
    );

    assert.ok(fs.existsSync(path.join(appRoot, "modules/morning-brief/morning-brief.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/morning-brief/module.js")));

    for (const sectionId of MORNING_BRIEF_SECTIONS) {
      assert.match(template, new RegExp(`id="${sectionId}"`), `missing section: ${sectionId}`);
    }

    assert.match(template, /Today's Focus/);
    assert.match(template, /Practice Snapshot/);
    assert.match(template, /Stewardship/);
  });

  test("placeholder modules declare Practice Brain integration features", () => {
    for (const mod of PLACEHOLDER_MODULES) {
      const source = fs.readFileSync(path.join(appRoot, "modules", mod, mod + ".js"), "utf8");
      assert.match(source, /features:\s*\[/, `${mod} should declare feature list`);
      assert.match(source, /FreedomDeskPlaceholder/, `${mod} should use placeholder factory`);
    }
  });
});
