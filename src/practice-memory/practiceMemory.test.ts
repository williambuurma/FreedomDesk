import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createMockPracticeMemory,
  generateMorningMemorySummary,
  getPatientMemoryById,
  getPatientMemoryByName,
  listOpenTasks,
  listOpportunities,
  listUnresolvedIssues,
  MOCK_PRACTICE_ID,
} from "./index.ts";

describe("Practice Memory", () => {
  const memory = createMockPracticeMemory();

  test("mock dataset includes three realistic patients", () => {
    assert.equal(memory.practiceId, MOCK_PRACTICE_ID);
    assert.equal(memory.patients.length, 3);
    assert.ok(memory.patients.some((p) => p.identity.lastName === "Mitchell"));
    assert.ok(memory.patients.some((p) => p.identity.lastName === "Nguyen"));
    assert.ok(memory.patients.some((p) => p.identity.lastName === "Chen"));
  });

  test("getPatientMemoryById returns patient record", () => {
    const patient = getPatientMemoryById(memory, "pat_sarah_mitchell");
    assert.ok(patient);
    assert.equal(patient.identity.firstName, "Sarah");
    assert.ok(patient.preferences.length > 0);
    assert.ok(patient.insurance.some((ins) => ins.program === "delta_dental_ppo"));
  });

  test("getPatientMemoryByName matches full and partial names", () => {
    assert.equal(getPatientMemoryByName(memory, "Sarah Mitchell")?.patientId, "pat_sarah_mitchell");
    assert.equal(getPatientMemoryByName(memory, "emma")?.patientId, "pat_emma_nguyen");
    assert.equal(getPatientMemoryByName(memory, "Chen")?.patientId, "pat_robert_chen");
    assert.equal(getPatientMemoryByName(memory, "   "), undefined);
  });

  test("listOpenTasks returns only open or in-progress tasks", () => {
    const tasks = listOpenTasks(memory);
    assert.ok(tasks.length >= 4);
    assert.ok(tasks.every((task) => task.status === "open" || task.status === "in_progress"));
    assert.ok(tasks.some((task) => task.owner === "billing"));
  });

  test("listUnresolvedIssues returns open and escalated issues", () => {
    const issues = listUnresolvedIssues(memory);
    assert.ok(issues.length >= 3);
    assert.ok(issues.every((issue) => issue.status === "open" || issue.status === "escalated"));
    assert.ok(issues.some((issue) => issue.category === "billing"));
  });

  test("listOpportunities returns open opportunities across patients", () => {
    const opportunities = listOpportunities(memory);
    assert.ok(opportunities.length >= 4);
    assert.ok(opportunities.every((opp) => opp.status === "open"));
    assert.ok(opportunities.some((opp) => opp.type === "household"));
  });

  test("generateMorningMemorySummary produces actionable highlights", () => {
    const summary = generateMorningMemorySummary(memory);

    assert.equal(summary.practiceId, MOCK_PRACTICE_ID);
    assert.equal(summary.patientCount, 3);
    assert.ok(summary.openTaskCount >= 4);
    assert.ok(summary.unresolvedIssueCount >= 3);
    assert.ok(summary.opportunityCount >= 4);
    assert.ok(summary.highlights.length > 0);
    assert.ok(summary.highlights.some((line) => line.includes("Mitchell")));
    assert.ok(summary.openTasks[0].priority === "critical" || summary.openTasks[0].priority === "high");
  });
});
