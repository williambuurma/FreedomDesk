/**
 * Sanitized golden routine-pain call fixture for replay / evaluation.
 * No full phone numbers; names are demo fixtures only.
 */

export interface GoldenCallerTurn {
  /** Sanitized caller utterance (fixture — not live PHI). */
  utterance: string;
  /** Expected planner / fallback action after this utterance. */
  expectedAction: string;
  /** Optional substring expectations on Aly's spoken line. */
  expectSpokenMatch?: RegExp[];
  /** Optional forbidden patterns on Aly's spoken line. */
  forbidSpokenMatch?: RegExp[];
}

export const GOLDEN_ROUTINE_PAIN_CALL_SID = "CA_replay_routine_pain";

/** Demo ANI — last-four only meaningful in traces. */
export const GOLDEN_ROUTINE_PAIN_FROM = "+16155550111";

export const GOLDEN_ROUTINE_PAIN_OPENING =
  "Hi, I'm William Buurma. My lower-right back tooth kept me awake last night, and I'm worried.";

/**
 * Exact sanitized golden path from Phone Experience V1 judgment fix.
 * Four purposeful questions after the opening statement.
 */
export const GOLDEN_ROUTINE_PAIN_TURNS: GoldenCallerTurn[] = [
  {
    utterance: GOLDEN_ROUTINE_PAIN_OPENING,
    expectedAction: "ask_last_name_spelling",
    expectSpokenMatch: [
      /uncomfortable|hurts|sorry|worried|concern/i,
      /few (important )?details|important details/i,
      /spell your last name/i,
    ],
    forbidSpokenMatch: [
      /truly/i,
      /pain score|scale of|how bad/i,
      /fever|breathing|insurance|date of birth|DOB/i,
      /upper or lower/i,
    ],
  },
  {
    utterance: "Yeah, it's B-U-U-R-M-A.",
    expectedAction: "confirm_last_name_spelling",
    expectSpokenMatch: [/B-U-U-R-M-A/i, /right\?/i],
    forbidSpokenMatch: [/truly/i, /swelling|fever|earliest/i],
  },
  {
    utterance: "Yes.",
    expectedAction: "ask_swelling",
    expectSpokenMatch: [/swelling/i],
    forbidSpokenMatch: [
      /truly/i,
      /pain score|onset|eating|fever|breathing|insurance|DOB/i,
      /spell/i,
    ],
  },
  {
    utterance: "No.",
    expectedAction: "ask_combined_scheduling_preference",
    expectSpokenMatch: [
      /urgent|urgency|clarify|helps/i,
      /earliest|short notice/i,
    ],
    forbidSpokenMatch: [/truly/i, /fever|breathing|insurance|DOB|pain score/i],
  },
  {
    utterance: "Yes, as soon as possible, and I can come in on short notice.",
    expectedAction: "persist_and_close",
    forbidSpokenMatch: [/truly/i],
  },
];

/** Minimum outcome checklist for this call type. */
export const ROUTINE_PAIN_MINIMUM_OUTCOME = [
  "usable_identity",
  "reliable_callback_path",
  "useful_pain_location",
  "swelling_present",
  "wants_earliest_help",
  "short_notice_availability",
] as const;
