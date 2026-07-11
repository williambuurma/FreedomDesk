#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");

const root = path.join(__dirname, "..");
const appRoot = path.join(root, "app");
const previewPath = path.join(root, "data/my-day-preview.json");
const staffPath = path.join(root, "data/practice-staff.json");

const RECEPTIONIST_SECTIONS = [
  "mdGreeting",
  "mdSinceYesterday",
  "mdUrgent",
  "mdToday",
  "mdHeadsUp",
];

const DOCTOR_SECTIONS = [
  "mdDoctorGreeting",
  "mdDoctorTasks",
  "mdClinicalPriorities",
];

describe("Today preview data", () => {
  test("preview JSON exists and has role-scoped views", () => {
    assert.ok(fs.existsSync(previewPath), "data/my-day-preview.json missing — run npm run preview:my-day");
    assert.ok(fs.existsSync(staffPath), "data/practice-staff.json missing");

    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));
    const staff = JSON.parse(fs.readFileSync(staffPath, "utf8"));

    assert.equal(data.previewMode, true);
    assert.ok(data.practiceName);
    assert.ok(data.date);
    assert.ok(data.roles);
    assert.ok(data.staffSettings);

    const doctor = data.roles.dentist;
    assert.ok(doctor);
    assert.ok(doctor.recipientName);
    assert.match(doctor.recipientName, /Dr\./);
    assert.ok(doctor.welcome && doctor.welcome.greeting && doctor.welcome.subline);
    assert.ok(Array.isArray(doctor.schedule));
    assert.ok(doctor.schedule.length >= 5);
    assert.ok(doctor.schedule[0].time && doctor.schedule[0].procedure);
    assert.ok(Array.isArray(doctor.clinicalPriorities));
    assert.ok(doctor.clinicalPriorities.length >= 1);
    assert.ok(Array.isArray(doctor.todaysTasks));
    assert.ok(doctor.todaysTasks.length >= 1);
    assert.ok(doctor.todaysTasks[0].label);

    const receptionist = data.roles.front_desk;
    const defaultRec = staff.receptionists.find((r) => r.id === staff.defaultReceptionistId);
    assert.ok(receptionist);
    assert.equal(receptionist.recipientName, defaultRec.firstName);
    assert.ok(receptionist.welcome && receptionist.welcome.greeting);
    assert.ok(
      receptionist.welcome.subline || receptionist.welcome.priority,
      "welcome subline should reassure before tasks"
    );
    if (receptionist.urgentTasks.length > 0) {
      assert.ok(receptionist.urgentTasks[0].recommendedNextStep);
    }
    assert.ok(Array.isArray(receptionist.attentionCards));
    assert.ok(receptionist.attentionCards.length >= 1);
    const previewCard = receptionist.attentionCards.find((c) => c.type === "call-preview");
    assert.ok(previewCard);
    assert.ok(previewCard.patientName);
    assert.ok(previewCard.preview);
    assert.ok(previewCard.taskId);
    assert.ok(Array.isArray(receptionist.urgentTasks));
    assert.ok(Array.isArray(receptionist.todayTasks));
    assert.ok(Array.isArray(receptionist.scheduleGaps));
    assert.ok(Array.isArray(receptionist.headsUp));

    assert.ok(Array.isArray(receptionist.decisionCards));
    assert.equal(
      receptionist.decisionCards.length,
      1,
      "Decision Arbitration surfaces one primary card"
    );
    const primary = receptionist.decisionCards[0];
    assert.equal(primary.arbitration, "surface");
    assert.equal(primary.kind, "recoverable_phone_opportunity");
    assert.match(primary.situation, /urgent caller|swelling/i);
    assert.match(primary.recommendation, /Emily Johnson/i);
    assert.match(primary.primaryAction, /Call Emily/i);
    assert.ok(primary.recommendationId);

    assert.ok(Array.isArray(receptionist.waitingDecisions));
    const rso = receptionist.waitingDecisions.find(
      (c) => c.kind === "recoverable_schedule_opportunity"
    );
    assert.ok(rso, "schedule opportunity should wait, not compete");
    assert.match(rso.situation, /60-minute opening/i);
    assert.match(rso.recommendation, /Maria Lopez/i);
    assert.match(rso.primaryAction, /Call Maria/i);
    assert.ok(["wait", "escalate"].includes(rso.arbitration));
    assert.ok(rso.recommendationId);

    assert.ok(receptionist.arbitrationSummary);
    assert.equal(receptionist.arbitrationSummary.surfaced, 1);

    if (receptionist.scheduleGaps.length > 0) {
      assert.equal(receptionist.scheduleGaps[0].status, "available");
      assert.match(receptionist.scheduleGaps[0].time, /AM|PM/);
    }

    if (receptionist.urgentTasks.length > 0) {
      const task = receptionist.urgentTasks[0];
      assert.ok(task.label);
      assert.ok(task.instruction);
      assert.ok(task.actionLabel);
      assert.equal(task.actionLabel, "Start callback");
      assert.ok(task.callSummary);
      assert.ok(task.callSummary.patientName);
      assert.ok(task.callSummary.aiSummary);
    }

    const verifyTask = receptionist.urgentTasks.find((t) => t.actionLabel === "Verify benefits");
    if (verifyTask) {
      assert.ok(verifyTask.insurancePanel);
      assert.ok(verifyTask.insurancePanel.company);
    }

    assert.ok(data.memorySummary);
    assert.equal(typeof data.memorySummary.openTaskCount, "number");
  });

  test("doctor and receptionist views differ in perspective", () => {
    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));
    const doctor = data.roles.dentist;
    const receptionist = data.roles.front_desk;

    assert.notEqual(doctor.recipientName, receptionist.recipientName);
    assert.ok(receptionist.attentionCards.length > 0);
    assert.ok(doctor.schedule.length > 0);
    assert.ok(!doctor.urgentTasks, "doctor view should not expose receptionist urgent tasks");
    assert.ok(!receptionist.schedule, "receptionist view should not expose doctor schedule");
  });

  test("reminders exclude duplicate schedule items", () => {
    const data = JSON.parse(fs.readFileSync(previewPath, "utf8"));
    const headsUp = data.roles.front_desk.headsUp;
    const combined = headsUp.map((h) => h.text.toLowerCase()).join(" ");
    assert.ok(!combined.includes("crown #14"), "crown should not duplicate urgent/today");
    assert.ok(!combined.includes("new patient"), "new patient should not duplicate today section");
    assert.ok(!combined.includes("huddle"), "huddle belongs on schedule not reminders");
  });
});

describe("Today dashboard module", () => {
  test("core files exist and index.html wires the module", () => {
    const indexHtml = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");

    assert.ok(fs.existsSync(path.join(appRoot, "modules/today/module.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/today/today.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "modules/today/template.html")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/labels.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/practice-staff.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "shared/components/dashboard-ui.js")));
    assert.ok(fs.existsSync(path.join(appRoot, "styles/my-day.css")));

    assert.match(indexHtml, /modules\/today\/module\.js/);
    assert.match(indexHtml, /shared\/practice-staff\.js/);
    assert.match(indexHtml, /my-day\.css/);
    assert.match(indexHtml, /FreedomDesk%20Icon\.png|FreedomDesk Icon\.png/);
    assert.doesNotMatch(indexHtml, /Freedomdesk-logo-full\.png/, "icon rail uses mark only");
  });

  test("template has receptionist and doctor section layouts", () => {
    const template = fs.readFileSync(
      path.join(appRoot, "modules/today/template.html"),
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
    assert.match(template, /mdRoleBar/);
    assert.match(template, /tdMorning/);
    assert.match(template, /md-workspace--split/);
    assert.match(template, /md-workspace--clinical/);
    assert.doesNotMatch(template, /mdDoctorSchedule/, "PMS owns the schedule — no doctor schedule mirror");
  });

  test("dashboard defaults to today home", () => {
    const dashboard = fs.readFileSync(path.join(appRoot, "dashboard.js"), "utf8");
    assert.match(dashboard, /DEFAULT_MODULE = "today"/);
    assert.match(dashboard, /"my-day":\s*"today"/);
    assert.match(dashboard, /"morning-brief":\s*"today"/);
    assert.match(dashboard, /"intelligence-inbox":\s*"today"/);
  });

  test("primary nav is Today, Patients, Ask only", () => {
    const todayMod = fs.readFileSync(path.join(appRoot, "modules/today/module.js"), "utf8");
    const briefMod = fs.readFileSync(path.join(appRoot, "modules/morning-brief/module.js"), "utf8");
    const inboxMod = fs.readFileSync(
      path.join(appRoot, "modules/intelligence-inbox/module.js"),
      "utf8"
    );
    const patients = fs.readFileSync(path.join(appRoot, "modules/patients/patients.js"), "utf8");
    const ask = fs.readFileSync(path.join(appRoot, "modules/ask/ask.js"), "utf8");

    assert.match(todayMod, /label:\s*"Today"/);
    assert.match(todayMod, /id:\s*"today"/);
    assert.doesNotMatch(todayMod, /navVisible:\s*false/);

    assert.match(briefMod, /navVisible:\s*false/);
    assert.match(inboxMod, /navVisible:\s*false/);
    assert.match(patients, /label:\s*"Patients"/);
    assert.match(ask, /label:\s*"Ask FreedomDesk"/);
  });
});
