/**
 * Fact provenance + semantic merge into live session slots.
 * Confirmed facts are not overwritten by lower-confidence interpretations.
 */

import type { LiveCallSession } from "./callSession.ts";
import type { SemanticTurnInterpretation } from "./semanticTurnTypes.ts";
import {
  normalizeSpokenSpelling,
  spellingToDisplayName,
} from "./spellingNormalize.ts";
import {
  formatLocationForSpeech,
  isLocationComplete,
  mergeLocationParts,
  type ToothLocationParts,
} from "./toothLocation.ts";

export type FactCaptureStatus =
  | "captured"
  | "confirmed"
  | "externally_verified"
  | "corrected"
  | "flagged_uncertain";

export interface FactProvenanceEntry {
  value: unknown;
  confidence: number;
  sourceTurn: number;
  status: FactCaptureStatus;
  previousValue?: unknown;
}

export type FactProvenanceMap = Record<string, FactProvenanceEntry>;

const STATUS_RANK: Record<FactCaptureStatus, number> = {
  captured: 1,
  flagged_uncertain: 1,
  corrected: 2,
  confirmed: 3,
  externally_verified: 4,
};

function patientTurnCount(session: LiveCallSession): number {
  return session.turns.filter(
    (t) => t.speaker === "patient" || t.speaker === "caller"
  ).length;
}

function canOverwrite(
  existing: FactProvenanceEntry | undefined,
  confidence: number,
  status: FactCaptureStatus
): boolean {
  if (!existing) return true;
  if (STATUS_RANK[status] > STATUS_RANK[existing.status]) return true;
  if (
    existing.status === "confirmed" ||
    existing.status === "externally_verified"
  ) {
    // Corrections may update confirmed facts.
    return status === "corrected";
  }
  return confidence >= existing.confidence;
}

function setFact(
  map: FactProvenanceMap,
  key: string,
  value: unknown,
  confidence: number,
  sourceTurn: number,
  status: FactCaptureStatus
): boolean {
  const existing = map[key];
  if (!canOverwrite(existing, confidence, status)) return false;
  map[key] = {
    value,
    confidence,
    sourceTurn,
    status,
    previousValue: existing ? existing.value : undefined,
  };
  return true;
}

function ensureProvenance(session: LiveCallSession): FactProvenanceMap {
  if (!session.factProvenance) session.factProvenance = {};
  return session.factProvenance;
}

function applyLocationMerge(
  session: LiveCallSession,
  parts: ToothLocationParts,
  turn: number,
  confidence: number,
  status: FactCaptureStatus
): void {
  const map = ensureProvenance(session);
  const next = mergeLocationParts(session.slots.locationParts, parts);
  const changed =
    next.vertical !== session.slots.locationParts?.vertical ||
    next.side !== session.slots.locationParts?.side ||
    next.depth !== session.slots.locationParts?.depth;
  if (!changed && session.slots.locationParts) return;

  if (
    !setFact(map, "toothLocation", next, confidence, turn, status) &&
    status !== "corrected"
  ) {
    return;
  }
  if (status === "corrected") {
    setFact(map, "toothLocation", next, Math.max(confidence, 0.9), turn, "corrected");
  }
  session.slots.locationParts = next;
  session.slots.location = formatLocationForSpeech(next);
  if (isLocationComplete(next)) {
    session.slots.locationConfirmed = true;
    setFact(map, "locationConfirmed", true, 0.95, turn, "confirmed");
  }
}

/**
 * Merge semantic interpretation into session slots with provenance.
 * Specialized spelling normalizer runs only when spelling content is identified.
 */
export function mergeSemanticInterpretation(
  session: LiveCallSession,
  interpretation: SemanticTurnInterpretation,
  opts: { previousAction?: string | null } = {}
): { factsChanged: string[]; appliedSpellingTool: boolean } {
  const turn = patientTurnCount(session);
  const map = ensureProvenance(session);
  const factsChanged: string[] = [];
  let appliedSpellingTool = false;
  const f = interpretation.facts;

  const note = (key: string) => {
    if (!factsChanged.includes(key)) factsChanged.push(key);
  };

  // Name
  if (f.firstName && f.lastName) {
    const full = `${f.firstName} ${f.lastName}`.trim();
    if (
      setFact(map, "name", full, 0.85, turn, "captured") ||
      !session.slots.name
    ) {
      session.slots.name = full;
      session.slots.lastName = f.lastName;
      session.slots.nameCaptured = true;
      note("name");
      // Apply pending spelling once identity exists.
      if (session.slots.pendingLastNameSpelling) {
        const letters = session.slots.pendingLastNameSpelling;
        session.slots.lastNameSpelling = letters;
        session.slots.lastNameSpellingCaptured = true;
        session.slots.lastName =
          spellingToDisplayName(letters) || session.slots.lastName;
        session.slots.lastNameConfirmed = false;
        session.slots.pendingLastNameSpelling = undefined;
        setFact(map, "lastNameSpelling", letters, 0.85, turn, "captured");
        note("lastNameSpelling");
      }
    }
  }

  // Spelling — specialized tool only when interpreter marks spelling content
  if (f.containsSpellingContent || f.spelledLastName) {
    const utterance = [...session.turns]
      .reverse()
      .find((t) => t.speaker === "patient" || t.speaker === "caller")?.text;
    const applyLetters = (letters: string, conf: number, low: boolean) => {
      if (letters.length < 2) return;
      if (!session.slots.nameCaptured) {
        // Do not mark spelling captured without usable name identity.
        // Record last name from letters explicitly; keep pending until name exists.
        session.slots.pendingLastNameSpelling = letters;
        session.slots.lastName =
          spellingToDisplayName(letters) || session.slots.lastName;
        setFact(
          map,
          "pendingLastNameSpelling",
          letters,
          conf,
          turn,
          "captured"
        );
        setFact(map, "lastNameFromSpelling", letters, conf, turn, "captured");
        note("pendingLastNameSpelling");
        return;
      }
      if (setFact(map, "lastNameSpelling", letters, conf, turn, "captured")) {
        session.slots.lastNameSpelling = letters;
        session.slots.lastNameSpellingCaptured = true;
        session.slots.spellingLowConfidence = low;
        session.slots.lastName =
          spellingToDisplayName(letters) || session.slots.lastName;
        session.slots.lastNameConfirmed = false;
        session.slots.pendingLastNameSpelling = undefined;
        note("lastNameSpelling");
      }
    };

    if (utterance && f.containsSpellingContent) {
      const normalized = normalizeSpokenSpelling(utterance);
      if (
        normalized.letters.length >= 2 &&
        normalized.confidence !== "none" &&
        !(
          normalized.confidence === "low" &&
          normalized.evidenceTokens.every((t) => t.startsWith("compact:"))
        )
      ) {
        // Reject low-confidence compact-only fabrications.
        if (
          normalized.confidence === "high" ||
          normalized.confidence === "medium" ||
          normalized.evidenceTokens.some(
            (t) => /^[A-Z]$/.test(t) || t.includes("-") || /as in|double-/i.test(t)
          )
        ) {
          appliedSpellingTool = true;
          const conf =
            normalized.confidence === "high"
              ? 0.95
              : normalized.confidence === "medium"
                ? 0.75
                : 0.45;
          applyLetters(
            normalized.letters,
            conf,
            normalized.confidence === "low" || normalized.confidence === "none"
          );
        }
      }
    } else if (f.spelledLastName && f.spelledLastName.length >= 2) {
      const letters = f.spelledLastName.replace(/[^A-Za-z]/g, "").toUpperCase();
      applyLetters(letters, 0.8, false);
    }
  }

  // Spelling confirmation — only when yes/no is explicit for that target.
  if (
    interpretation.confirmation.target === "last_name_spelling" &&
    (interpretation.confirmation.yes || interpretation.confirmation.no)
  ) {
    if (interpretation.confirmation.yes) {
      if (setFact(map, "lastNameConfirmed", true, 0.98, turn, "confirmed")) {
        session.slots.lastNameConfirmed = true;
        session.slots.spellingLowConfidence = false;
        note("lastNameConfirmed");
      }
    } else if (interpretation.confirmation.no) {
      session.slots.lastNameConfirmed = false;
      note("lastNameConfirmed");
    }
  }

  // Corrections
  for (const c of interpretation.corrections) {
    if (c.field === "toothLocation.leftRight") {
      const side = c.newValue === "left" || c.newValue === "right" ? c.newValue : null;
      if (side) {
        applyLocationMerge(
          session,
          { side },
          turn,
          0.92,
          "corrected"
        );
        note("toothLocation");
      }
    }
    if (c.field === "spelledLastName" && f.containsSpellingContent) {
      // Handled by spelling tool above; mark corrected status.
      if (session.slots.lastNameSpelling) {
        setFact(
          map,
          "lastNameSpelling",
          session.slots.lastNameSpelling,
          0.9,
          turn,
          "corrected"
        );
        note("lastNameSpelling");
      }
    }
  }

  // Location facts (non-correction) — side flips vs known side are corrections.
  const locParts: ToothLocationParts = {};
  if (f.toothLocation.upperLower) {
    locParts.vertical = f.toothLocation.upperLower;
  }
  if (f.toothLocation.leftRight) {
    locParts.side = f.toothLocation.leftRight;
  }
  if (f.toothLocation.frontBack) {
    locParts.depth = f.toothLocation.frontBack;
  }
  if (locParts.vertical || locParts.side || locParts.depth) {
    const existingSide = session.slots.locationParts?.side;
    const sideFlip =
      Boolean(locParts.side) &&
      Boolean(existingSide) &&
      locParts.side !== existingSide;
    const status: FactCaptureStatus =
      sideFlip || interpretation.intent === "correction"
        ? "corrected"
        : "captured";
    const conf = status === "corrected" ? 0.95 : 0.85;
    const before = JSON.stringify(session.slots.locationParts || {});
    applyLocationMerge(session, locParts, turn, conf, status);
    if (JSON.stringify(session.slots.locationParts || {}) !== before) {
      note("toothLocation");
    }
  }

  if (typeof f.swelling === "boolean") {
    if (setFact(map, "swelling", f.swelling, 0.9, turn, "captured")) {
      session.slots.swelling = f.swelling;
      note("swelling");
    }
  }
  if (typeof f.fever === "boolean") {
    if (setFact(map, "fever", f.fever, 0.9, turn, "captured")) {
      session.slots.fever = f.fever;
      note("fever");
    }
  }
  if (f.sleepDisruption === true) {
    if (setFact(map, "keptAwake", true, 0.9, turn, "captured")) {
      session.slots.keptAwake = true;
      note("keptAwake");
    }
  }
  if (f.duration) {
    if (setFact(map, "onset", f.duration, 0.7, turn, "captured")) {
      session.slots.onset = session.slots.onset || f.duration;
      note("onset");
    }
  }
  if (typeof f.wantsEarliest === "boolean") {
    if (setFact(map, "wantsEarliest", f.wantsEarliest, 0.88, turn, "captured")) {
      session.slots.wantsEarliest = f.wantsEarliest;
      session.slots.outcomeCaptured = true;
      note("wantsEarliest");
    }
  }
  if (typeof f.shortNoticeAvailable === "boolean") {
    if (
      setFact(
        map,
        "shortNoticeOk",
        f.shortNoticeAvailable,
        0.88,
        turn,
        "captured"
      )
    ) {
      session.slots.shortNoticeOk = f.shortNoticeAvailable;
      session.slots.outcomeCaptured = true;
      note("shortNoticeOk");
    }
  }

  if (f.breathingTrouble === true || f.swallowingTrouble === true) {
    session.slots.breathingOk = false;
    note("breathingOk");
  } else if (f.breathingTrouble === false) {
    session.slots.breathingOk = true;
    note("breathingOk");
  }

  // Refusals / already-answered → team flags + abandon spelling loops
  if (
    interpretation.refusals.includes("spelling") ||
    interpretation.refusals.includes("move_on") ||
    (interpretation.conversationSignals.callerSaysAlreadyAnswered &&
      (opts.previousAction === "ask_last_name_spelling" ||
        opts.previousAction === "confirm_last_name_spelling"))
  ) {
    if (!session.slots.teamFlags) session.slots.teamFlags = [];
    if (!session.slots.teamFlags.includes("last_name_spelling_needs_confirmation")) {
      session.slots.teamFlags.push("last_name_spelling_needs_confirmation");
    }
    session.slots.spellingAbandoned = true;
    session.slots.spellingAbandonNeedsAnnounce = true;
    note("spellingAbandoned");
  }

  // Ambiguous "no" to compound scheduling — do not invent; flag for clarify.
  if (
    interpretation.uncertainty.includes("scheduling_ambiguous_no") &&
    typeof session.slots.wantsEarliest !== "boolean"
  ) {
    if (!session.slots.teamFlags) session.slots.teamFlags = [];
    if (!session.slots.teamFlags.includes("scheduling_preference_needs_clarify")) {
      session.slots.teamFlags.push("scheduling_preference_needs_clarify");
    }
  }

  // Uncertainty flags
  for (const u of interpretation.uncertainty) {
    if (!session.slots.teamFlags) session.slots.teamFlags = [];
    const flag = `uncertain_${u}`;
    if (!session.slots.teamFlags.includes(flag)) {
      session.slots.teamFlags.push(flag);
    }
    setFact(map, flag, true, 0.5, turn, "flagged_uncertain");
  }

  session.lastSemanticInterpretation = interpretation;
  return { factsChanged, appliedSpellingTool };
}

/** Compact snapshot for loop detection / planner. */
export function provenanceSnapshot(
  session: LiveCallSession
): Record<string, unknown> {
  const map = session.factProvenance || {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = { status: v.status, confidence: v.confidence };
  }
  return out;
}
