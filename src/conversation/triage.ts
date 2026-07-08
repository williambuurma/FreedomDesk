/**
 * Safety / Triage Brain — urgency ladder and escalation path.
 * L1 deterministic rules; cannot be lowered by fluency. See CALL_FLOWS § decision trees.
 */

import type {
  CallIntent,
  PatientUnderstanding,
  UrgencyAssessment,
  UrgencyLevel,
} from "./types.ts";

interface TriageRule {
  id: string;
  urgency: UrgencyLevel;
  sameDay: boolean;
  weight: number;
  test: (u: PatientUnderstanding) => boolean;
  reason: string;
  routingAction: string;
}

const TRIAGE_RULES: TriageRule[] = [
  {
    id: "TRIAGE_FEVER_SWELLING",
    urgency: "emergency",
    sameDay: true,
    weight: 100,
    test: (u) => u.symptomDetails.fever === true && u.symptomDetails.swelling === true,
    reason: "Fever with facial swelling — emergency escalation per protocol",
    routingAction: "er_or_on_call_immediate",
  },
  {
    id: "TRIAGE_UNCONTROLLED_BLEEDING",
    urgency: "emergency",
    sameDay: true,
    weight: 100,
    test: (u) =>
      u.symptoms.includes("bleeding") &&
      !/controlled|stopped|slowed/.test(u.chiefConcern ?? ""),
    reason: "Uncontrolled bleeding reported",
    routingAction: "er_or_on_call_immediate",
  },
  {
    id: "TRIAGE_SEVERE_PAIN_WORSENING",
    urgency: "urgent",
    sameDay: true,
    weight: 80,
    test: (u) => {
      const pain = u.symptomDetails.painLevel;
      const severe =
        pain === "severe" ||
        (pain !== undefined && parseInt(pain, 10) >= 7);
      const worsening = /worse|worsening|spread|kept me up|can't sleep/.test(
        (u.chiefConcern ?? "") + u.symptoms.join(" ")
      );
      return severe || (u.symptoms.includes("toothache") && worsening);
    },
    reason: "Severe or worsening pain — urgent same-day routing",
    routingAction: "on_call_callback",
  },
  {
    id: "TRIAGE_PAIN_SWELLING",
    urgency: "urgent",
    sameDay: true,
    weight: 75,
    test: (u) => u.symptomDetails.swelling === true,
    reason: "Pain with swelling — urgent evaluation",
    routingAction: "on_call_callback",
  },
  {
    id: "TRIAGE_BROKEN_TOOTH_PAIN",
    urgency: "urgent",
    sameDay: true,
    weight: 70,
    test: (u) =>
      u.symptoms.includes("broken tooth") &&
      /pain|hurt|ache/.test((u.chiefConcern ?? "").toLowerCase()),
    reason: "Broken tooth with pain — urgent scheduling",
    routingAction: "same_day_or_next_available",
  },
  {
    id: "TRIAGE_BROKEN_TOOTH_NO_PAIN",
    urgency: "priority",
    sameDay: false,
    weight: 50,
    test: (u) =>
      u.symptoms.includes("broken tooth") &&
      !/pain|hurt|ache/.test((u.chiefConcern ?? "").toLowerCase()),
    reason: "Broken tooth without active pain — priority scheduling",
    routingAction: "schedule_next_available",
  },
  {
    id: "TRIAGE_MILD_PAIN",
    urgency: "priority",
    sameDay: false,
    weight: 40,
    test: (u) => u.symptoms.includes("pain") || u.symptoms.includes("toothache"),
    reason: "Dental pain reported — priority appointment",
    routingAction: "schedule_next_available",
  },
];

function urgencyRank(level: UrgencyLevel): number {
  return { emergency: 4, urgent: 3, priority: 2, routine: 1 }[level];
}

export function assessUrgency(
  understanding: PatientUnderstanding,
  intent: CallIntent
): UrgencyAssessment {
  if (intent !== "EMERGENCY" && understanding.symptoms.length === 0) {
    return {
      urgency: "routine",
      sameDayEmergency: false,
      matchedRules: [],
      reasons: ["No acute symptoms reported"],
      routingAction: "standard_scheduling",
      confidence: 0.85,
    };
  }

  let best: TriageRule | null = null;
  const matchedRules: string[] = [];
  const reasons: string[] = [];

  for (const rule of TRIAGE_RULES) {
    if (rule.test(understanding)) {
      matchedRules.push(rule.id);
      reasons.push(rule.reason);
      if (!best || rule.weight > best.weight) {
        best = rule;
      }
    }
  }

  if (!best) {
    return {
      urgency: intent === "EMERGENCY" ? "priority" : "routine",
      sameDayEmergency: false,
      matchedRules,
      reasons: reasons.length ? reasons : ["No red-flag rules matched"],
      routingAction: "schedule_next_available",
      confidence: 0.7,
    };
  }

  return {
    urgency: best.urgency,
    sameDayEmergency: best.sameDay,
    matchedRules,
    reasons,
    routingAction: best.routingAction,
    confidence: Math.min(0.98, 0.75 + best.weight * 0.002),
  };
}
