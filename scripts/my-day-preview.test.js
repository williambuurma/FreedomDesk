#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");

const root = path.join(__dirname, "..");
const appRoot = path.join(root, "app");
const previewPath = path.join(root, "data/my-day-preview.json");

const RECEPTIONIST_SECTIONS = [
  "mdGreeting",
  "mdSinceLastLogin",
  "mdUrgent",
  "mdTodaysTasks",
  "mdComingUp",
  "mdReminders",
  "mdTodaysFocus",
];

const DOCTOR_SECTIONS = [
  "mdDoctorGreeting",
  "mdPriorities",
  "mdPatients",
  "mdOpportunities",
  "mdInsight",
  "mdQuickActions",
  "mdDoctorTodaysFocus",
];

describe("My Day preview data", () => {
  test("preview JSON exists and has role-scoped views", () => {
    assert.ok(fs.existsSync(previewPath), "data/my-day-preview.json missing — run npm run preview:my-day");

    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));

    assert.equal(data.previewMode, true);
    assert.ok(data.practiceName);
    assert.ok(data.date);
    assert.ok(data.roles);

    const doctor = data.roles.dentist;
    assert.ok(doctor);
    assert.ok(doctor.recipientName);
    assert.ok(doctor.morningSummary && doctor.morningSummary.greeting && doctor.morningSummary.body);
    assert.ok(typeof doctor.todaysFocus === "string" && doctor.todaysFocus.length > 0);
    assert.ok(Array.isArray(doctor.priorities));
    assert.ok(Array.isArray(doctor.patientsAttention));
    assert.ok(Array.isArray(doctor.opportunities));
    assert.ok(doctor.insight && doctor.insight.text);
    assert.ok(Array.isArray(doctor.quickActions) && doctor.quickActions.length > 0);

    const receptionist = data.roles.front_desk;
    assert.ok(receptionist);
    assert.ok(receptionist.recipientName);
    assert.ok(receptionist.morningSummary && receptionist.morningSummary.greeting);
    assert.ok(typeof receptionist.todaysFocus === "string" && receptionist.todaysFocus.length > 0);
    assert.ok(Array.isArray(receptionist.sinceLastLogin));
    assert.ok(Array.isArray(receptionist.urgentTasks));
    assert.ok(Array.isArray(receptionist.todaysTasks));
    assert.ok(Array.isArray(receptionist.comingUp));
    assert.ok(Array.isArray(receptionist.reminders));

    if (receptionist.urgentTasks.length > 0) {
      const task = receptionist.urgentTasks[0];
      assert.ok(task.action);
      assert.ok(task.actionLabel);
    }

    assert.ok(data.memorySummary);
    assert.equal(typeof data.memorySummary.openTaskCount, "number");
  });

  test("doctor and receptionist views differ in perspective", () => {
    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));
    const doctor = data.roles.dentist;
    const receptionist = data.roles.front_desk;

    assert.notEqual(doctor.recipientName, receptionist.recipientName);
    assert.ok(receptionist.sinceLastLogin);
    assert.ok(receptionist.urgentTasks);

    const deskOwners = new Set(receptionist.priorities?.map((p) => p.owner) || []);
    assert.ok(
      [...deskOwners].every((o) => o === "front_desk") ||
        (receptionist.priorities || []).every((p) => p.priority === "critical")
    );
  });
});

describe("My Day dashboard module", () => {
  test("core files exist and index.html wires the module", () => {
    const indexHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");

    assert.ok(fs.existsSync(path.join(appRoot, "modules/my-day/module.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/my-day/my-day.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/my-day/template.html")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/labels.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/components/dashboard-ui.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "styles/my-day.css")));

    assert.match(indexHtml, /modules\/my-day\/module\.js/);
    assert.match(indexHtml, /shared\/labels\.js/);
    assert.match(indexHtml, /my-day\.css/);
  });

  test("template has receptionist and doctor section layouts", () => {
    const template = fs.readFileSync(
      path.join(appRoot, "modules/my-day/template.html"),
      "utf8"
    );

    for (const sectionId of RECEPTIONIST_SECTIONS) {
      assert.match(template, new RegExp(`id="${sectionId}"`), `missing receptionist section: ${sectionId}`);
    }

    for (const sectionId of DOCTOR_SECTIONS) {
      assert.match(template, new RegExp(`id="${sectionId}"`), `missing doctor section: ${sectionId}`);
    }

    assert.match(template, /mdReceptionistLayout/);
    assert.match(template, /mdDoctorLayout/);
  });

  test("dashboard defaults to my-day home", () => {
    const dashboard = fs.readFileSync(path.join(appRoot, "dashboard.js"), "utf8");
    assert.match(dashboard, /DEFAULT_MODULE = "my-day"/);
  });
});
