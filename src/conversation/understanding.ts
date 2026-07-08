/**
 * Understanding Brain — extract facts and intent from caller speech.
 * Deterministic rules only; no LLM. See docs/CALL_FLOWS.md intent table.
 */

import type { ReasoningFact, ReasoningRuleFire, StageReasoning } from "./reasoning/types.ts";
import type {
  CallIntent,
  InsuranceProgram,
  PatientUnderstanding,
  TranscriptTurn,
} from "./types.ts";

export interface UnderstandingResult {
  output: PatientUnderstanding;
  reasoning: StageReasoning<
    { intent: CallIntent; intentSignals: string[] },
    Pick<
      PatientUnderstanding,
      | "intent"
      | "callerName"
      | "phone"
      | "dateOfBirth"
      | "insuranceProgram"
      | "chiefConcern"
      | "symptoms"
    >
  >;
}

function patientText(turns: TranscriptTurn[]): string {
  return turns
    .filter((t) => t.speaker === "patient" || t.speaker === "caller")
    .map((t) => t.text)
    .join(" ");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function parseName(text: string): string | null {
  const patterns = [
    /(?:my name is|this is|i'm|i am)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+and|\s*[,.]|$)/i,
    /(?:my name is|this is|i'm|i am)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function parsePhone(text: string): string | null {
  const match = text.match(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/);
  return match ? normalizePhone(match[1]) : null;
}

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function formatNamedDate(monthName: string, day: string, year: string): string | null {
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseDateOfBirth(text: string): string | null {
  const named = text.match(
    /(?:birthday is|born on|date of birth is|my birthday is)\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (named) {
    const formatted = formatNamedDate(named[1], named[2], named[3]);
    if (formatted) return formatted;
  }
  // Standalone "March 3, 1988" — common when staff asks "date of birth?"
  const standalone = text.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (standalone) {
    const formatted = formatNamedDate(standalone[1], standalone[2], standalone[3]);
    if (formatted) return formatted;
  }
  const numeric = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numeric) {
    return `${numeric[3]}-${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}`;
  }
  return null;
}

function classifyInsuranceProgram(text: string): InsuranceProgram {
  const lower = text.toLowerCase();
  if (/healthy kids|hkd/.test(lower)) return "healthy_kids_dental";
  if (/medicaid|state insurance/.test(lower)) return "michigan_medicaid";
  if (/delta/.test(lower)) {
    if (/employer|work|through my job/.test(lower)) return "delta_dental_ppo";
    if (/medicaid|state/.test(lower)) return "delta_dental_medicaid";
    return "unknown";
  }
  if (/no insurance|self[- ]?pay|cash/.test(lower)) return "none";
  if (/bcbs|cigna|metlife|ppo/.test(lower)) return "ppo_other";
  return "unknown";
}

function parseInsuranceCarrier(text: string): string | null {
  if (/delta dental|delta/.test(text.toLowerCase())) return "Delta Dental";
  if (/bcbs|blue cross/.test(text.toLowerCase())) return "BCBS Michigan";
  if (/no insurance|self[- ]?pay/.test(text.toLowerCase())) return null;
  return null;
}

interface IntentRule {
  id: string;
  intent: CallIntent;
  weight: number;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    id: "INTENT_EMERGENCY",
    intent: "EMERGENCY",
    weight: 10,
    patterns: [
      /toothache|tooth ache|awful pain|kept me up|keeps? me up|can't sleep.*pain|swelling|bleeding|broken tooth|emergency|severe pain|knocked out/,
      /had an extraction.*pain|post.?op.*pain|after (?:my )?extraction.*pain|pain.*(?:gotten )?worse/,
    ],
  },
  {
    id: "INTENT_GENERAL_INFO",
    intent: "GENERAL_INFO",
    weight: 9,
    patterns: [
      /can i take|should i take|is it ok to take|(?:ibuprofen|aspirin|tylenol|advil).*(?:before|after)/,
      /medication.*(?:before|after|question)/,
    ],
  },
  {
    id: "INTENT_NEW_PATIENT",
    intent: "NEW_PATIENT",
    weight: 8,
    patterns: [
      /new dentist|first visit|never been|new patient|just moved|new to the area/,
    ],
  },
  {
    id: "INTENT_RESCHEDULE",
    intent: "RESCHEDULE",
    weight: 7,
    patterns: [/reschedule|move my appointment|change my appointment|different time/],
  },
  {
    id: "INTENT_CANCEL",
    intent: "CANCEL",
    weight: 7,
    patterns: [/cancel my appointment|can't make it|need to cancel/],
  },
  {
    id: "INTENT_CONFIRM",
    intent: "CONFIRM",
    weight: 6,
    patterns: [
      /confirm my appointment|calling about my appointment/,
      /appointment letter|(?:think i have|not sure).*(?:cleaning|appointment)/,
    ],
  },
  {
    id: "INTENT_TREATMENT",
    intent: "TREATMENT_SCHEDULE",
    weight: 7,
    patterns: [/crown seat|root canal|extraction|implant|denture|filling/],
  },
  {
    id: "INTENT_SCHEDULE",
    intent: "SCHEDULE_EXISTING",
    weight: 5,
    patterns: [/schedule|make an appointment|book an appointment|cleaning|checkup|check-up/],
  },
  {
    id: "INTENT_INSURANCE",
    intent: "INSURANCE",
    weight: 6,
    patterns: [
      /do you take|in network|accept.*(?:insurance|delta|dental)|whether you accept|insurance question/,
      /confused about.*(?:insurance|delta|accept|network)/,
    ],
  },
  {
    id: "INTENT_BILLING",
    intent: "BILLING",
    weight: 6,
    patterns: [/bill|balance|payment|statement|charge/],
  },
];

function classifyIntent(text: string): {
  intent: CallIntent;
  confidence: number;
  signals: string[];
  rulesFired: ReasoningRuleFire[];
} {
  const lower = text.toLowerCase();
  let best: IntentRule | null = null;
  const signals: string[] = [];
  const rulesFired: ReasoningRuleFire[] = [];

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) {
        signals.push(rule.id);
        rulesFired.push({
          ruleId: rule.id,
          description: `Intent pattern matched → ${rule.intent}`,
          weight: rule.weight,
        });
        if (!best || rule.weight > best.weight) {
          best = rule;
        }
        break;
      }
    }
  }

  if (!best) {
    return {
      intent: "OTHER",
      confidence: 0.3,
      signals: [],
      rulesFired: [
        {
          ruleId: "INTENT_DEFAULT_OTHER",
          description: "No intent rule matched — default to OTHER",
        },
      ],
    };
  }

  const confidence = Math.min(0.95, 0.55 + best.weight * 0.04);
  return { intent: best.intent, confidence, signals, rulesFired };
}

function extractSymptoms(text: string): string[] {
  const symptoms: string[] = [];
  const lower = text.toLowerCase();
  if (/toothache|tooth ache/.test(lower)) symptoms.push("toothache");
  if (/pain|hurts?|aching|sore/.test(lower)) symptoms.push("pain");
  if (/swelling/.test(lower)) symptoms.push("swelling");
  if (/fever/.test(lower)) symptoms.push("fever");
  if (/bleeding/.test(lower)) symptoms.push("bleeding");
  if (/broken tooth/.test(lower)) symptoms.push("broken tooth");
  return symptoms;
}

function extractSymptomDetails(text: string): PatientUnderstanding["symptomDetails"] {
  const lower = text.toLowerCase();
  const details: PatientUnderstanding["symptomDetails"] = {};

  if (/swelling/.test(lower)) {
    details.swelling = !/no swelling|don't think so|no, i don't/.test(lower);
  }
  if (/fever/.test(lower)) {
    details.fever = !/no fever|don't think so|no, i don't/.test(lower);
  }
  if (/broken|knocked out|trauma/.test(lower)) {
    details.trauma = true;
  }

  const painScale = text.match(
    /(?:about\s+(?:an?\s+)?|a |it's |at )(\d{1,2})(?:\s*out of|\s*\/)/i
  );
  if (painScale) {
    details.painLevel = painScale[1];
  } else if (/severe|awful|really bad|kept me up/.test(lower)) {
    details.painLevel = "severe";
  }

  const duration = text.match(
    /(?:since|started|noticed it)\s+([^.?!]+(?:ago|last night|yesterday|today|couple days)[^.?!]*)/i
  );
  if (duration) {
    details.duration = duration[1].trim();
  }

  const location = text.match(
    /(?:bottom|top|upper|lower)\s+(?:molar|tooth|left|right)[^.?!]*/i
  );
  if (location) {
    details.location = location[0].trim();
  }

  return details;
}

function inferChiefConcern(
  intent: CallIntent,
  text: string,
  symptoms: string[],
  details: PatientUnderstanding["symptomDetails"]
): string | null {
  if (intent === "EMERGENCY" && symptoms.length > 0) {
    const parts = [...symptoms];
    if (details.location) parts.push(details.location);
    if (details.duration) parts.push(`since ${details.duration}`);
    return parts.join("; ");
  }
  if (intent === "NEW_PATIENT") {
    if (/cleaning|check-?up/.test(text.toLowerCase())) {
      return "New patient exam and cleaning — new to area";
    }
    return "New patient exam — new to area";
  }
  if (/broken tooth/.test(text.toLowerCase())) {
    return "Broken tooth";
  }
  return null;
}

function inferNewPatient(text: string, intent: CallIntent): boolean | null {
  const lower = text.toLowerCase();
  if (/new dentist|first visit|never been|new to the area|just moved/.test(lower)) {
    return true;
  }
  if (
    /current patient|been there before|existing patient|due for my|six-month cleaning|my last visit/.test(
      lower
    )
  ) {
    return false;
  }
  if (intent === "RESCHEDULE" || intent === "CANCEL") {
    return false;
  }
  return null;
}

function fact(
  id: string,
  description: string,
  value: unknown,
  source: string
): ReasoningFact {
  return { id, description, value, source };
}

/**
 * Extract structured understanding from a full mock transcript.
 */
export function understandTranscriptWithReasoning(
  turns: TranscriptTurn[]
): UnderstandingResult {
  const text = patientText(turns);
  const turnCount = turns.filter(
    (t) => t.speaker === "patient" || t.speaker === "caller"
  ).length;

  const { intent, confidence, signals, rulesFired } = classifyIntent(text);
  const symptoms = extractSymptoms(text);
  const symptomDetails = extractSymptomDetails(text);
  const callerName = parseName(text);
  const phone = parsePhone(text);
  const dateOfBirth = parseDateOfBirth(text);
  const insuranceCarrier = parseInsuranceCarrier(text);
  const insuranceProgram = classifyInsuranceProgram(text);
  const isNewPatient = inferNewPatient(text, intent);
  const chiefConcern = inferChiefConcern(intent, text, symptoms, symptomDetails);

  const perFieldConfidence: Record<string, number> = {
    intent: confidence,
    callerName: callerName ? 0.9 : 0,
    phone: phone ? 0.92 : 0,
    dateOfBirth: dateOfBirth ? 0.88 : 0,
    chiefConcern: chiefConcern ? 0.85 : 0,
    insuranceProgram: insuranceProgram !== "unknown" ? 0.8 : 0.4,
  };

  const output: PatientUnderstanding = {
    intent,
    intentConfidence: confidence,
    intentSignals: signals,
    callerName,
    phone,
    dateOfBirth,
    isNewPatient,
    chiefConcern,
    insuranceCarrier,
    insuranceProgram,
    symptoms,
    symptomDetails,
    perFieldConfidence,
  };

  const facts: ReasoningFact[] = [
    fact("FACT_PATIENT_TURNS", "Patient/caller turn count", turnCount, "transcript"),
    fact("FACT_CALLER_NAME", "Parsed caller name", callerName, "parseName"),
    fact("FACT_PHONE", "Parsed phone", phone, "parsePhone"),
    fact("FACT_DOB", "Parsed date of birth", dateOfBirth, "parseDateOfBirth"),
    fact("FACT_SYMPTOMS", "Extracted symptoms", symptoms, "extractSymptoms"),
    fact("FACT_SYMPTOM_DETAILS", "Symptom detail flags", symptomDetails, "extractSymptomDetails"),
    fact("FACT_INSURANCE_PROGRAM", "Insurance program classification", insuranceProgram, "classifyInsuranceProgram"),
    fact("FACT_IS_NEW_PATIENT", "New patient inference", isNewPatient, "inferNewPatient"),
    fact("FACT_CHIEF_CONCERN", "Inferred chief concern", chiefConcern, "inferChiefConcern"),
  ];

  const rationale: string[] = [];
  if (rulesFired.length > 0) {
    const winner = rulesFired.reduce((a, b) =>
      (b.weight ?? 0) > (a.weight ?? 0) ? b : a
    );
    rationale.push(`Intent ${intent} selected — highest-weight rule ${winner.ruleId}`);
  }
  if (insuranceProgram === "unknown" && insuranceCarrier) {
    rationale.push("Carrier named but program not disambiguated");
  }

  const reasoning: UnderstandingResult["reasoning"] = {
    stage: "Understanding",
    inputs: { patientTurnCount: turnCount, afterHours: undefined },
    facts,
    rulesFired,
    decision: { intent, intentSignals: signals },
    confidence,
    rationale,
    output: {
      intent,
      callerName,
      phone,
      dateOfBirth,
      insuranceProgram,
      chiefConcern,
      symptoms,
    },
  };

  return { output, reasoning };
}

export function understandTranscript(turns: TranscriptTurn[]): PatientUnderstanding {
  return understandTranscriptWithReasoning(turns).output;
}

/** Single-utterance entry point used by engine.ts turn loop stub. */
export function understandPatientMessage(message: string): PatientUnderstanding {
  return understandTranscript([{ speaker: "patient", text: message }]);
}
