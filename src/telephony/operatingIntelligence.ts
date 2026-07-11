/**
 * Front-desk operating intelligence projection from a CallSummary.
 * Today shows recommendations — not raw transcripts.
 */

import type { CallSummary } from "../conversation/types.ts";

export interface CallOperatingIntelligence {
  executiveSummary: string;
  chiefConcern: string;
  urgency: string;
  sameDayEmergency: boolean;
  recommendedNextAction: string;
  suggestedAppointmentType: string | null;
  followUpTasks: Array<{
    type: string;
    assignee: string;
    priority: string;
    notes: string;
  }>;
  immediateAttention: boolean;
  immediateAttentionReason: string | null;
  missingForGoodDecision: string[];
  patientName: string;
  phone: string;
  intent: string;
  afterHours: boolean;
  insuranceProgram: string | null;
  openDentalCommLogNote: string;
  actionItems: CallSummary["actionItems"];
}

function urgencyNeedsImmediate(summary: CallSummary): boolean {
  return (
    summary.sameDayEmergency ||
    summary.urgency === "emergency" ||
    summary.urgency === "urgent"
  );
}

function buildExecutiveSummary(summary: CallSummary): string {
  const name = summary.caller.name || "A caller";
  const when = summary.afterHours ? "after hours" : "during office hours";
  const concern =
    summary.chiefConcern ||
    summary.intent.replace(/_/g, " ").toLowerCase();
  const urgencyBit =
    summary.urgency === "routine"
      ? "routine follow-up"
      : `${summary.urgency} priority`;

  if (urgencyNeedsImmediate(summary)) {
    return `${name} called ${when} about ${concern}. Marked ${urgencyBit} — needs front-desk action now.`;
  }

  return `${name} called ${when} about ${concern}. ${urgencyBit}. Next: ${summary.recommendedNextStep}`;
}

function immediateReason(summary: CallSummary): string | null {
  if (!urgencyNeedsImmediate(summary)) return null;
  if (summary.sameDayEmergency) {
    return "Same-day emergency flag — offer urgent evaluation path";
  }
  if (summary.afterHours && summary.urgency !== "routine") {
    return "After-hours urgent intake — on-call callback SLA";
  }
  return `Urgency is ${summary.urgency} — do not leave in the queue`;
}

/**
 * Map CallSummary → structured operating intelligence for Today / work panel.
 */
export function buildCallOperatingIntelligence(
  summary: CallSummary,
  appointmentType?: string | null
): CallOperatingIntelligence {
  const immediate = urgencyNeedsImmediate(summary);
  return {
    executiveSummary: buildExecutiveSummary(summary),
    chiefConcern: summary.chiefConcern || "Not stated clearly on the call",
    urgency: summary.urgency,
    sameDayEmergency: summary.sameDayEmergency,
    recommendedNextAction: summary.recommendedNextStep,
    suggestedAppointmentType: appointmentType ?? null,
    followUpTasks: (summary.actionItems || []).map((item) => ({
      type: item.type,
      assignee: item.assignee,
      priority: item.priority,
      notes: item.notes,
    })),
    immediateAttention: immediate,
    immediateAttentionReason: immediateReason(summary),
    missingForGoodDecision: summary.missingInformation || [],
    patientName: summary.caller.name || "Caller",
    phone: summary.caller.phone || "",
    intent: summary.intent,
    afterHours: summary.afterHours,
    insuranceProgram: summary.insurance?.program || null,
    openDentalCommLogNote: summary.openDentalCommLogNote,
    actionItems: summary.actionItems,
  };
}
