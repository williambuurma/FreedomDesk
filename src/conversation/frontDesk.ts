/**
 * Front Desk / Business Logic — required fields and operational next steps.
 * See CALL_FLOWS.md required summary fields per intent.
 */

import type {
  CallIntent,
  FrontDeskAssessment,
  InsuranceProgram,
  PatientUnderstanding,
  UrgencyAssessment,
} from "./types.ts";

const REQUIRED_BY_INTENT: Record<CallIntent, string[]> = {
  NEW_PATIENT: [
    "caller.name",
    "caller.phone",
    "caller.dateOfBirth",
    "insurance.program",
    "chiefComplaint",
    "appointment.preference",
  ],
  EMERGENCY: ["caller.name", "caller.phone", "emergency.symptoms", "urgency.routing"],
  SCHEDULE_EXISTING: ["caller.name", "caller.dateOfBirth", "appointment.type"],
  TREATMENT_SCHEDULE: ["caller.name", "caller.dateOfBirth", "appointment.type"],
  RESCHEDULE: ["caller.name", "caller.dateOfBirth", "appointment.existing"],
  CANCEL: ["caller.name", "caller.dateOfBirth"],
  CONFIRM: ["caller.name", "caller.dateOfBirth"],
  INSURANCE: ["caller.name", "insurance.program"],
  BILLING: ["caller.name", "caller.phone"],
  GENERAL_INFO: [],
  OTHER: ["caller.name"],
};

function fieldPresent(
  field: string,
  understanding: PatientUnderstanding,
  urgency: UrgencyAssessment
): boolean {
  switch (field) {
    case "caller.name":
      return understanding.callerName !== null;
    case "caller.phone":
      return understanding.phone !== null;
    case "caller.dateOfBirth":
      return understanding.dateOfBirth !== null;
    case "insurance.program":
      return understanding.insuranceProgram !== "unknown";
    case "chiefComplaint":
      return understanding.chiefConcern !== null;
    case "appointment.preference":
      return false; // not collected in V1 proof fixtures unless present in transcript
    case "emergency.symptoms":
      return understanding.symptoms.length > 0;
    case "urgency.routing":
      return urgency.routingAction.length > 0;
    case "appointment.type":
      return false;
    case "appointment.existing":
      return false;
    default:
      return false;
  }
}

function appointmentTypeForIntent(
  intent: CallIntent,
  understanding: PatientUnderstanding
): string | null {
  if (intent === "NEW_PATIENT") return "New Patient Exam";
  if (intent === "EMERGENCY") return "Emergency Eval";
  if (intent === "TREATMENT_SCHEDULE" && understanding.symptoms.includes("broken tooth")) {
    return "Emergency Eval";
  }
  if (intent === "SCHEDULE_EXISTING") return "Prophy + Periodic Exam";
  return null;
}

function recommendedNextStep(
  intent: CallIntent,
  urgency: UrgencyAssessment,
  afterHours: boolean,
  missing: string[]
): string {
  if (urgency.urgency === "emergency") {
    return "Escalate to on-call dentist immediately; provide ER/911 guidance if symptoms worsen";
  }
  if (urgency.urgency === "urgent" && afterHours) {
    return "Flag for on-call callback within practice SLA; keep caller phone nearby";
  }
  if (urgency.urgency === "urgent") {
    return "Offer same-day emergency evaluation slot or urgent callback";
  }
  if (intent === "NEW_PATIENT") {
    if (missing.includes("appointment.preference")) {
      return "Submit new patient appointment request; confirm preferred times when office opens";
    }
    return "Confirm new patient exam in PMS; send forms; verify insurance program before visit";
  }
  if (intent === "BILLING") {
    return "Route billing callback to team during business hours";
  }
  return "Review summary and complete any missing fields before next patient contact";
}

export function assessFrontDesk(
  understanding: PatientUnderstanding,
  urgency: UrgencyAssessment,
  intent: CallIntent,
  afterHours: boolean
): FrontDeskAssessment {
  const required = REQUIRED_BY_INTENT[intent] ?? REQUIRED_BY_INTENT.OTHER;
  const missingFields = required.filter(
    (field) => !fieldPresent(field, understanding, urgency)
  );

  if (
    understanding.insuranceCarrier &&
    understanding.insuranceProgram === "unknown" &&
    !missingFields.includes("insurance.program")
  ) {
    missingFields.push("insurance.program");
  }

  return {
    missingFields,
    appointmentType: appointmentTypeForIntent(intent, understanding),
    recommendedNextStep: recommendedNextStep(
      intent,
      urgency,
      afterHours,
      missingFields
    ),
  };
}

export function insuranceProgramLabel(program: InsuranceProgram): string {
  const labels: Record<InsuranceProgram, string> = {
    delta_dental_ppo: "Delta Dental PPO",
    delta_dental_medicaid: "Delta Dental Medicaid",
    healthy_kids_dental: "Healthy Kids Dental",
    michigan_medicaid: "Michigan Medicaid",
    ppo_other: "Other PPO",
    none: "Cash-pay / no insurance",
    unknown: "Unknown — verify at visit",
  };
  return labels[program];
}
