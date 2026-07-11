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
  "mbGreeting",
  "mbDecisions",
  "mbRemaining",
];

const V1_WIRED_MODULES = [
  "morning-brief",
  "today",
  "my-day",
  "intelligence-inbox",
  "patients",
  "ask",
  "settings",
];

const DEFERRED_PLACEHOLDER_MODULES = ["calls", "opportunities", "analytics"];

describe("Morning Brief preview data", () => {
  test("preview JSON exists and has required brief fields", () => {
    assert.ok(fs.existsSync(previewPath), "data/morning-brief-preview.json missing — run npm run preview:morning-brief");

    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));

    assert.equal(data.previewMode, true);
    assert.equal(data.recipientName, "Dr. Buurma");
    assert.ok(data.practiceName);
    assert.ok(data.date);
    assert.ok(Array.isArray(data.sections) && data.sections.length > 0);
    assert.ok(Array.isArray(data.opportunities) && data.opportunities.length > 0);
    assert.ok(Array.isArray(data.topRecommendations) && data.topRecommendations.length > 0);
    assert.ok(Array.isArray(data.decisionCards) && data.decisionCards.length >= 1);
    const phone = data.decisionCards.find((c) => c.kind === "recoverable_phone_opportunity");
    assert.ok(phone, "expected recoverable_phone_opportunity decision card");
    assert.match(phone.primaryAction, /Call Emily/i);
    const rso = data.decisionCards.find((c) => c.kind === "recoverable_schedule_opportunity");
    assert.ok(rso, "expected recoverable_schedule_opportunity decision card");
    assert.match(rso.primaryAction, /Call Maria/i);
    assert.ok(data.metrics && Array.isArray(data.metrics.departments));
    assert.ok(data.stewardshipNote && data.stewardshipNote.length > 0);

    const sectionIds = data.sections.map((s) => s.id);
    assert.ok(sectionIds.includes("schedule_snapshot"));
    assert.ok(sectionIds.includes("overnight_calls"));
    assert.ok(sectionIds.includes("emergent_followups"));
    assert.ok(sectionIds.includes("new_patients_today"));
  });
});

describe("FreedomDesk companion shell", () => {
  test("core shell files exist and wire companion workspace modules", () => {
    const indexHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");
    const dashboardJs = fs.readFileSync(path.join(appRoot, "dashboard.js"), "utf8");
    const shellCss = fs.readFileSync(path.join(appRoot, "styles/dashboard.css"), "utf8");

    assert.ok(fs.existsSync(path.join(appRoot, "index.html")));
    assert.ok(fs.existsSync(path.join(appRoot, "dashboard.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/registry.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/placeholder-module.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "styles/dashboard.css")));
    assert.ok(fs.existsSync(path.join(root, "morning-brief.html")), "legacy redirect should remain");

    assert.match(indexHtml, /dashboard\.js/);
    assert.match(indexHtml, /modules\/morning-brief\/module\.js/);
    assert.match(indexHtml, /modules\/today\/module\.js/);
    assert.match(indexHtml, /modules\/intelligence-inbox\/module\.js/);
    assert.match(indexHtml, /modules\/patients\/patients\.js/);
    assert.match(indexHtml, /modules\/ask\/ask\.js/);
    assert.match(indexHtml, /Companion workspaces:/);
    assert.match(indexHtml, /fdProfileTrigger/);
    assert.match(indexHtml, /fd-companion-panel/);
    assert.match(indexHtml, /fd-pms-stage/);
    assert.match(indexHtml, /fdSidebar/);
    assert.match(indexHtml, /fd-app-shell/);
    assert.doesNotMatch(indexHtml, /\.\.\/styles\.css/, "app must not load marketing styles.css");
    assert.doesNotMatch(indexHtml, /Marketing site/, "app must not link to the marketing site from the shell");
    assert.doesNotMatch(indexHtml, /fdSidebarToggle/, "expand toggle removed from permanent icon rail");
    assert.match(dashboardJs, /getNavModules/);
    assert.match(dashboardJs, /companion/, "shell should describe companion product");
    assert.match(dashboardJs, /buildCompanionNav/);
    assert.doesNotMatch(dashboardJs, /setSidebarCollapsed/, "icon rail is permanent — no expand/collapse");
    assert.match(shellCss, /--fd-companion-w/);
    assert.match(shellCss, /\.fd-companion-panel/);
    assert.match(shellCss, /\.fd-sidebar/);
    assert.match(shellCss, /--fd-sidebar-w/);
    assert.doesNotMatch(shellCss, /fd-dashboard-layout/, "full-page app layout should not be the product shell");
    assert.doesNotMatch(shellCss, /--fd-companion-w-expanded/, "companion width is fixed");

    for (const mod of V1_WIRED_MODULES) {
      assert.match(indexHtml, new RegExp(`modules/${mod}/`));
    }

    for (const mod of DEFERRED_PLACEHOLDER_MODULES) {
      assert.ok(
        fs.existsSync(path.join(appRoot, "modules", mod, mod + ".js")),
        `deferred placeholder module file should remain: ${mod}`
      );
      assert.doesNotMatch(
        indexHtml,
        new RegExp(`modules/${mod}/${mod}\\.js`),
        `${mod} should not be wired in primary workflow index.html`
      );
    }
  });

  test("morning brief shows completed judgment, not raw information", () => {
    const template = fs.readFileSync(
      path.join(appRoot, "modules/morning-brief/template.html"),
      "utf8"
    );
    const renderer = fs.readFileSync(
      path.join(appRoot, "modules/morning-brief/morning-brief.js"),
      "utf8"
    );

    assert.ok(fs.existsSync(path.join(appRoot, "modules/morning-brief/morning-brief.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/morning-brief/module.js")));

    for (const sectionId of MORNING_BRIEF_SECTIONS) {
      assert.match(template, new RegExp(`id="${sectionId}"`), `missing section: ${sectionId}`);
    }

    assert.match(template, /Good morning/);
    assert.match(template, /mb-layout/);
    assert.match(template, /Later/);
    assert.doesNotMatch(template, /Practice Snapshot/);
    assert.doesNotMatch(template, /Today's Focus/);
    assert.doesNotMatch(template, /Before doors open/);
    assert.doesNotMatch(template, /More context/);

    assert.match(renderer, /Possible dental infection/);
    assert.match(renderer, /Liam Johnson/);
    assert.match(renderer, /Same-day limited exam/);
    assert.match(renderer, /Call before first patient/);
    assert.match(renderer, /FreedomDeskUI/);
    assert.match(renderer, /renderDecisionCard/);
    assert.match(renderer, /Why\?/);
    assert.match(renderer, /Verify benefits/);
    assert.match(renderer, /Call candidates/);
    assert.match(renderer, /renderInto/);
    assert.match(renderer, /#today/);
    assert.match(renderer, /mb-secondary-row/);
    assert.doesNotMatch(renderer, /#my-day/);
    assert.doesNotMatch(renderer, /#intelligence-inbox/);
    assert.doesNotMatch(renderer, /Recommendation<\/span>/);
    assert.doesNotMatch(renderer, /Mary Johnson/);
    assert.doesNotMatch(renderer, /humanizeSummary/);
    assert.doesNotMatch(renderer, /% sure|confidenceLabel/);
    assert.doesNotMatch(renderer, /Do this first/);
  });

  test("placeholder modules declare Practice Brain integration features", () => {
    const allPlaceholders = DEFERRED_PLACEHOLDER_MODULES.concat(["settings", "patients", "ask"]);
    for (const mod of allPlaceholders) {
      const source = fs.readFileSync(path.join(appRoot, "modules", mod, mod + ".js"), "utf8");
      assert.match(source, /features:\s*\[/, `${mod} should declare feature list`);
      assert.match(source, /FreedomDeskPlaceholder/, `${mod} should use placeholder factory`);
    }

    const settings = fs.readFileSync(path.join(appRoot, "modules/settings/settings.js"), "utf8");
    assert.match(settings, /navVisible:\s*false/, "settings should stay out of primary nav");
  });
});
