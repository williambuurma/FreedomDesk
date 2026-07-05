/**
 * Practice Memory query helpers — read-only accessors over in-memory store.
 */

import type {
  MorningMemorySummary,
  OpportunityMemory,
  PatientId,
  PatientMemory,
  PracticeMemory,
  TaskMemory,
  UnresolvedIssue,
} from "./types.ts";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function patientDisplayName(patient: PatientMemory): string {
  const { firstName, lastName, preferredName } = patient.identity;
  return [preferredName ?? firstName, lastName].filter(Boolean).join(" ");
}

function matchesPatientName(patient: PatientMemory, query: string): boolean {
  const normalized = normalizeName(query);
  const { firstName, lastName, preferredName, guardianName } = patient.identity;

  const candidates = [
    patientDisplayName(patient),
    `${firstName} ${lastName}`,
    firstName,
    lastName,
    preferredName,
    guardianName,
  ].filter((part): part is string => Boolean(part));

  return candidates.some((candidate) => normalizeName(candidate).includes(normalized));
}

export function getPatientMemoryById(
  memory: PracticeMemory,
  patientId: PatientId
): PatientMemory | undefined {
  return memory.patients.find((patient) => patient.patientId === patientId);
}

export function getPatientMemoryByName(
  memory: PracticeMemory,
  name: string
): PatientMemory | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  return memory.patients.find((patient) => matchesPatientName(patient, name));
}

export function listOpenTasks(memory: PracticeMemory): TaskMemory[] {
  return memory.patients.flatMap((patient) =>
    patient.openTasks.filter((task) => task.status === "open" || task.status === "in_progress")
  );
}

export function listUnresolvedIssues(memory: PracticeMemory): UnresolvedIssue[] {
  return memory.patients.flatMap((patient) =>
    patient.unresolvedIssues.filter(
      (issue) => issue.status === "open" || issue.status === "escalated"
    )
  );
}

export function listOpportunities(memory: PracticeMemory): OpportunityMemory[] {
  return memory.patients.flatMap((patient) =>
    patient.opportunities.filter((opportunity) => opportunity.status === "open")
  );
}

const PRIORITY_RANK: Record<TaskMemory["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortTasksByPriority(tasks: TaskMemory[]): TaskMemory[] {
  return [...tasks].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );
}

/**
 * Scannable morning summary for front desk and clinical leads.
 * Surfaces counts, prioritized tasks, and human-readable highlights.
 */
export function generateMorningMemorySummary(
  memory: PracticeMemory
): MorningMemorySummary {
  const openTasks = sortTasksByPriority(listOpenTasks(memory));
  const unresolvedIssues = listUnresolvedIssues(memory);
  const opportunities = listOpportunities(memory);

  const highlights: string[] = [];

  for (const issue of unresolvedIssues) {
    const patient = getPatientMemoryById(memory, issue.patientId);
    const name = patient ? patientDisplayName(patient) : issue.patientId;
    highlights.push(`${name}: ${issue.title}`);
  }

  for (const task of openTasks.slice(0, 5)) {
    const patient = getPatientMemoryById(memory, task.patientId);
    const name = patient ? patientDisplayName(patient) : task.patientId;
    highlights.push(`Task (${task.owner}): ${name} — ${task.title}`);
  }

  for (const opportunity of opportunities.slice(0, 3)) {
    const patient = getPatientMemoryById(memory, opportunity.patientId);
    const name = patient ? patientDisplayName(patient) : opportunity.patientId;
    highlights.push(`Opportunity: ${name} — ${opportunity.title}`);
  }

  return {
    practiceId: memory.practiceId,
    practiceName: memory.practiceName,
    generatedAt: new Date().toISOString(),
    patientCount: memory.patients.length,
    openTaskCount: openTasks.length,
    unresolvedIssueCount: unresolvedIssues.length,
    opportunityCount: opportunities.length,
    highlights,
    openTasks,
    unresolvedIssues,
    opportunities,
  };
}
