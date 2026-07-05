/**
 * Reflection Engine — post-interaction learning extraction.
 *
 * After every meaningful interaction, asks: "What did we actually learn?"
 * Consumes Reasoning Engine evidence only. Never writes to Practice Memory.
 *
 * See docs/CONTINUOUS_LEARNING_ENGINE.md §27.
 */

import { assertEvidenceBacked } from "./guards.ts";
import type {
  LearningCandidate,
  LearningCandidateDisposition,
  Reflection,
  ReflectionInput,
  ReflectionObservation,
  ReflectionObservationCategory,
  ReflectionQuestion,
  ReflectionSummary,
  ReasoningEvidence,
  ReasoningFact,
  ReasoningInsuranceSignal,
  ReasoningOpportunitySignal,
  ReasoningSchedulingSignal,
} from "./types.ts";

export const REFLECTION_ENGINE_VERSION = "reflection-engine-v1";

const CANDIDATE_CONFIDENCE_THRESHOLD = 0.75;
const LOW_CONFIDENCE_THRESHOLD = 0.5;

let observationCounter = 0;
let questionCounter = 0;
let candidateCounter = 0;

function nextObservationId(): string {
  observationCounter += 1;
  return `obs_${observationCounter}`;
}

function nextQuestionId(): string {
  questionCounter += 1;
  return `rq_${questionCounter}`;
}

function nextCandidateId(): string {
  candidateCounter += 1;
  return `lc_${candidateCounter}`;
}

/** Reset counters between tests. */
export function resetReflectionCountersForTests(): void {
  observationCounter = 0;
  questionCounter = 0;
  candidateCounter = 0;
}

function dispositionForConfidence(confidence: number): LearningCandidateDisposition {
  if (confidence >= CANDIDATE_CONFIDENCE_THRESHOLD) {
    return "proposed";
  }
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) {
    return "needs_verification";
  }
  return "low_confidence";
}

function createObservation(
  category: ReflectionObservationCategory,
  observation: string,
  evidenceRef: string,
  confidence: number,
  memoryCandidateHint = false
): ReflectionObservation | null {
  const flag = assertEvidenceBacked(observation, evidenceRef);
  if (flag) {
    return null;
  }

  return {
    id: nextObservationId(),
    category,
    observation,
    evidenceRef,
    confidence,
    memoryCandidateHint,
  };
}

function pushObservation(
  target: ReflectionObservation[],
  observation: ReflectionObservation | null
): void {
  if (observation) {
    target.push(observation);
  }
}

function mapFactToObservations(
  fact: ReasoningFact,
  factsLearned: ReflectionObservation[],
  patientPreferences: ReflectionObservation[],
  insuranceConcerns: ReflectionObservation[],
  emotionalObservations: ReflectionObservation[],
  schedulingObservations: ReflectionObservation[],
  operationalObservations: ReflectionObservation[]
): void {
  const obs = createObservation(
    fact.category === "preference"
      ? "preference"
      : fact.category === "insurance"
        ? "insurance"
        : fact.category === "emotional"
          ? "emotional"
          : fact.category === "scheduling"
            ? "scheduling"
            : fact.category === "operational"
              ? "operational"
              : "fact",
    fact.statement,
    fact.evidenceRef,
    fact.confidence,
    fact.category === "preference" || fact.confidence >= CANDIDATE_CONFIDENCE_THRESHOLD
  );

  if (!obs) {
    return;
  }

  switch (fact.category) {
    case "preference":
      patientPreferences.push(obs);
      break;
    case "insurance":
      insuranceConcerns.push(obs);
      break;
    case "emotional":
      emotionalObservations.push(obs);
      break;
    case "scheduling":
      schedulingObservations.push(obs);
      break;
    case "operational":
      operationalObservations.push(obs);
      break;
    default:
      factsLearned.push(obs);
  }
}

function mapInsuranceSignal(
  signal: ReasoningInsuranceSignal,
  insuranceConcerns: ReflectionObservation[]
): void {
  const parts: string[] = [];
  if (signal.program) {
    parts.push(`Insurance program signal: ${signal.program}`);
  }
  if (signal.concern) {
    parts.push(signal.concern);
  }
  if (signal.verificationStatus && signal.verificationStatus !== "verified") {
    parts.push(`Verification status: ${signal.verificationStatus}`);
  }
  if (parts.length === 0) {
    return;
  }

  pushObservation(
    insuranceConcerns,
    createObservation("insurance", parts.join(" — "), signal.evidenceRef, signal.confidence, true)
  );
}

function mapSchedulingSignal(
  signal: ReasoningSchedulingSignal,
  schedulingObservations: ReflectionObservation[],
  followUpOpportunities: ReflectionObservation[]
): void {
  const parts: string[] = [];
  if (signal.appointmentType) {
    parts.push(`Appointment type discussed: ${signal.appointmentType}`);
  }
  if (signal.preferredTimes?.length) {
    parts.push(`Preferred times: ${signal.preferredTimes.join(", ")}`);
  }
  if (signal.constraint) {
    parts.push(signal.constraint);
  }
  if (parts.length === 0) {
    return;
  }

  const obs = createObservation(
    "scheduling",
    parts.join(" — "),
    signal.evidenceRef,
    signal.confidence,
    true
  );
  pushObservation(schedulingObservations, obs);

  if (signal.constraint?.toLowerCase().includes("waitlist")) {
    pushObservation(
      followUpOpportunities,
      createObservation(
        "follow_up",
        `Scheduling follow-up: ${signal.constraint}`,
        signal.evidenceRef,
        signal.confidence,
        true
      )
    );
  }
}

function mapOpportunitySignal(
  signal: ReasoningOpportunitySignal,
  opportunities: ReflectionObservation[],
  followUpOpportunities: ReflectionObservation[]
): void {
  const obs = createObservation(
    "opportunity",
    signal.description,
    signal.evidenceRef,
    signal.confidence,
    true
  );
  pushObservation(opportunities, obs);
  pushObservation(
    followUpOpportunities,
    createObservation(
      "follow_up",
      `Opportunity follow-up (${signal.type}): ${signal.description}`,
      signal.evidenceRef,
      signal.confidence,
      true
    )
  );
}

function buildQuestions(evidence: ReasoningEvidence): ReflectionQuestion[] {
  const questions: ReflectionQuestion[] = [];

  for (const slot of evidence.unresolvedSlots ?? []) {
    questions.push({
      id: nextQuestionId(),
      question: `Unresolved: ${slot.field}${slot.reason ? ` — ${slot.reason}` : ""}`,
      domain: domainForField(slot.field),
      evidenceRef: slot.evidenceRef,
      blocksMemoryWrite: true,
    });
  }

  for (const field of evidence.missingSummaryFields ?? []) {
    questions.push({
      id: nextQuestionId(),
      question: `Summary incomplete — missing ${field}`,
      domain: domainForField(field),
      evidenceRef: `reasoning.missingSummaryFields.${field}`,
      blocksMemoryWrite: true,
    });
  }

  return questions;
}

function domainForField(field: string): ReflectionQuestion["domain"] {
  const normalized = field.toLowerCase();
  if (normalized.includes("insurance") || normalized.includes("delta") || normalized.includes("medicaid")) {
    return "insurance";
  }
  if (normalized.includes("schedule") || normalized.includes("appointment") || normalized.includes("time")) {
    return "scheduling";
  }
  if (normalized.includes("dob") || normalized.includes("name") || normalized.includes("phone")) {
    return "demographics";
  }
  if (normalized.includes("symptom") || normalized.includes("complaint") || normalized.includes("pain")) {
    return "clinical_intake";
  }
  if (normalized.includes("summary") || normalized.includes("handoff")) {
    return "operational";
  }
  return "other";
}

function buildCandidates(
  input: ReflectionInput,
  observations: ReflectionObservation[],
  questions: ReflectionQuestion[]
): LearningCandidate[] {
  const blocked = questions.some((q) => q.blocksMemoryWrite);
  if (blocked && (input.reasoning.completenessScore ?? 1) < 0.85) {
    return observations
      .filter((o) => o.memoryCandidateHint && o.confidence >= LOW_CONFIDENCE_THRESHOLD)
      .map((o) => toCandidate(o, input, "needs_verification"));
  }

  return observations
    .filter((o) => o.memoryCandidateHint && o.confidence >= LOW_CONFIDENCE_THRESHOLD)
    .map((o) => toCandidate(o, input, dispositionForConfidence(o.confidence)));
}

function toCandidate(
  observation: ReflectionObservation,
  input: ReflectionInput,
  disposition: LearningCandidateDisposition
): LearningCandidate {
  return {
    id: nextCandidateId(),
    type: candidateTypeForCategory(observation.category),
    summary: observation.observation,
    evidenceRef: observation.evidenceRef,
    confidence: observation.confidence,
    disposition,
    suggestedMemoryKind: memoryKindForCategory(observation.category),
    patientReferenceId: input.patientReferenceId,
  };
}

function candidateTypeForCategory(
  category: ReflectionObservationCategory
): LearningCandidate["type"] {
  switch (category) {
    case "preference":
      return "preference";
    case "insurance":
      return "insurance";
    case "scheduling":
      return "scheduling";
    case "emotional":
      return "communication";
    case "operational":
      return "operational";
    case "opportunity":
      return "opportunity";
    case "follow_up":
      return "unresolved_issue";
    default:
      return "clinical_context";
  }
}

function memoryKindForCategory(
  category: ReflectionObservationCategory
): LearningCandidate["suggestedMemoryKind"] {
  switch (category) {
    case "preference":
      return "preference";
    case "insurance":
      return "insurance";
    case "scheduling":
      return "communication_note";
    case "emotional":
      return "communication_note";
    case "operational":
      return "task";
    case "opportunity":
      return "opportunity";
    case "follow_up":
      return "unresolved_issue";
    default:
      return "call_memory";
  }
}

function assessTeamReworkRisk(evidence: ReasoningEvidence): ReflectionSummary["teamReworkRisk"] {
  const missing = evidence.missingSummaryFields?.length ?? 0;
  const unresolved = evidence.unresolvedSlots?.length ?? 0;
  const completeness = evidence.completenessScore ?? 1;
  const hasReworkSignal = (evidence.operationalSignals ?? []).some(
    (s) => s.type === "rework_risk"
  );

  if (hasReworkSignal || completeness < 0.7 || missing >= 3 || unresolved >= 3) {
    return "high";
  }
  if (completeness < 0.9 || missing > 0 || unresolved > 0) {
    return "medium";
  }
  return "low";
}

function assessAnxietyImpact(
  emotionalCount: number,
  evidence: ReasoningEvidence
): ReflectionSummary["anxietyImpact"] {
  const flags = evidence.emotionalSignals ?? [];
  const highBurden = flags.some((f) =>
    /anxiety|fear|distress|frustrat/i.test(`${f.flag} ${f.description}`)
  );

  if (highBurden && emotionalCount > 0) {
    return "elevated";
  }
  if (flags.some((f) => /reassur|calm|relief/i.test(f.description))) {
    return "reduced";
  }
  if (emotionalCount > 0) {
    return "stable";
  }
  return "unknown";
}

function learningYield(totalObservations: number): ReflectionSummary["learningYield"] {
  if (totalObservations === 0) {
    return "none";
  }
  if (totalObservations <= 2) {
    return "low";
  }
  if (totalObservations <= 5) {
    return "moderate";
  }
  return "high";
}

function buildSummary(
  input: ReflectionInput,
  factsLearned: ReflectionObservation[],
  allObservations: ReflectionObservation[],
  questions: ReflectionQuestion[],
  candidates: LearningCandidate[],
  emotionalObservations: ReflectionObservation[]
): ReflectionSummary {
  const keyLearnings = [
    ...factsLearned,
    ...allObservations.filter((o) => o.category !== "fact"),
  ]
    .slice(0, 5)
    .map((o) => o.observation);

  return {
    headline: keyLearnings[0] ?? "No new learning surfaced — routine interaction.",
    intent: input.reasoning.intent,
    urgency: input.reasoning.urgency,
    learningYield: learningYield(allObservations.length + factsLearned.length),
    factCount: factsLearned.length,
    unresolvedCount: questions.length,
    candidateCount: candidates.length,
    teamReworkRisk: assessTeamReworkRisk(input.reasoning),
    anxietyImpact: assessAnxietyImpact(emotionalObservations.length, input.reasoning),
    keyLearnings,
    openQuestions: questions.map((q) => q.question),
  };
}

function collectConstitutionalFlags(evidence: ReasoningEvidence): string[] {
  const flags: string[] = [];
  const texts = [
    ...evidence.facts.map((f) => f.statement),
    ...(evidence.emotionalSignals ?? []).map((s) => s.description),
    ...(evidence.insuranceSignals ?? []).map((s) => s.concern ?? ""),
    ...(evidence.schedulingSignals ?? []).map((s) => s.constraint ?? ""),
    ...(evidence.operationalSignals ?? []).map((s) => s.description),
    ...(evidence.opportunitySignals ?? []).map((s) => s.description),
  ];

  for (const text of texts) {
    const violation = assertEvidenceBacked(text, "reasoning");
    if (violation === "diagnostic_language") {
      flags.push("diagnostic_language_in_evidence");
    }
    if (violation === "invented_certainty") {
      flags.push("invented_certainty_in_evidence");
    }
  }

  return [...new Set(flags)];
}

/**
 * Reflect on a completed interaction.
 * Produces Memory Candidates only — never writes to Practice Memory.
 */
export function reflect(input: ReflectionInput): Reflection {
  const evidence = input.reasoning;

  const factsLearned: ReflectionObservation[] = [];
  const unresolvedQuestions = buildQuestions(evidence);
  const followUpOpportunities: ReflectionObservation[] = [];
  const patientPreferences: ReflectionObservation[] = [];
  const insuranceConcerns: ReflectionObservation[] = [];
  const emotionalObservations: ReflectionObservation[] = [];
  const schedulingObservations: ReflectionObservation[] = [];
  const operationalObservations: ReflectionObservation[] = [];
  const opportunities: ReflectionObservation[] = [];

  for (const fact of evidence.facts) {
    mapFactToObservations(
      fact,
      factsLearned,
      patientPreferences,
      insuranceConcerns,
      emotionalObservations,
      schedulingObservations,
      operationalObservations
    );
  }

  for (const signal of evidence.emotionalSignals ?? []) {
    pushObservation(
      emotionalObservations,
      createObservation(
        "emotional",
        signal.description,
        signal.evidenceRef,
        signal.confidence,
        signal.confidence >= CANDIDATE_CONFIDENCE_THRESHOLD
      )
    );
  }

  for (const signal of evidence.insuranceSignals ?? []) {
    mapInsuranceSignal(signal, insuranceConcerns);
  }

  for (const signal of evidence.schedulingSignals ?? []) {
    mapSchedulingSignal(signal, schedulingObservations, followUpOpportunities);
  }

  for (const signal of evidence.operationalSignals ?? []) {
    pushObservation(
      operationalObservations,
      createObservation(
        "operational",
        signal.description,
        signal.evidenceRef,
        signal.confidence,
        false
      )
    );
  }

  for (const signal of evidence.opportunitySignals ?? []) {
    mapOpportunitySignal(signal, opportunities, followUpOpportunities);
  }

  const allObservations = [
    ...factsLearned,
    ...patientPreferences,
    ...insuranceConcerns,
    ...emotionalObservations,
    ...schedulingObservations,
    ...operationalObservations,
    ...opportunities,
    ...followUpOpportunities,
  ];

  const memoryCandidates = buildCandidates(input, allObservations, unresolvedQuestions);
  const constitutionalFlags = collectConstitutionalFlags(evidence);

  const summary = buildSummary(
    input,
    factsLearned,
    allObservations,
    unresolvedQuestions,
    memoryCandidates,
    emotionalObservations
  );

  return {
    practiceId: input.practiceId,
    callId: input.callId,
    interactionId: input.interactionId,
    reflectedAt: new Date().toISOString(),
    version: REFLECTION_ENGINE_VERSION,
    intent: evidence.intent,
    summary,
    factsLearned,
    unresolvedQuestions,
    followUpOpportunities,
    patientPreferences,
    insuranceConcerns,
    emotionalObservations,
    schedulingObservations,
    operationalObservations,
    opportunities,
    memoryCandidates,
    hadLearning: allObservations.length > 0 || unresolvedQuestions.length > 0,
    constitutionalFlags,
  };
}
