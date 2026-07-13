/**
 * Sanitized routine-pain call variations for generalization evaluation.
 * Same underlying call type; natural wording and recovery paths differ.
 * Do not hardcode expected Aly wording — score behavior and state transitions.
 */

export type VariationCategory =
  | "location_phrasing"
  | "correction"
  | "multi_fact"
  | "spelling"
  | "refusal_loop"
  | "scheduling"
  | "emotion"
  | "ambiguity"
  | "interrupt_ramble"
  | "safety_escalation"
  | "subject_change"
  | "meta_question";

export interface VariationTurn {
  utterance: string;
  /** Optional: previous Aly action this answers (for scripted multi-turn). */
  asAnswerTo?: string;
}

export interface VariationScenario {
  id: string;
  title: string;
  category: VariationCategory;
  /** Opening + follow-up caller turns (sanitized fixtures). */
  turns: VariationTurn[];
  /** Expected end-state flags (behavior, not wording). */
  expect: {
    /** Must never re-ask these once captured/confirmed. */
    noReaskFacts?: string[];
    /** Must capture these material facts by end (when applicable). */
    captureFacts?: string[];
    /** Must escalate / complete with emergency. */
    emergencyEscalation?: boolean;
    /** Must not trap (no same non-safety action 3+ times). */
    noTrap?: boolean;
    /** Ordinary calls must complete or soft-close without exceeding budget. */
    completesOrEscalates?: boolean;
    /** Safety must remain (no false close past life-threat). */
    safetyMaintained?: boolean;
    /** Emotional appropriateness markers (soft). */
    emotionCue?: "worry" | "frustration" | "fear" | "calm" | "uncertainty";
  };
}

export interface VariationScorecard {
  id: string;
  passed: boolean;
  noConfirmedFactReask: boolean;
  noRepeatedActionLoop: boolean;
  materialFactsCaptured: boolean;
  safetyMaintained: boolean;
  emotionalResponseAppropriate: boolean;
  questionCount: number;
  truthfulNextStep: boolean;
  callCompletesOrEscalates: boolean;
  trapped: boolean;
  exceededTurnBudget: boolean;
  failures: string[];
}

export const ORDINARY_TURN_BUDGET = Number(
  process.env.PHONE_ORDINARY_TURN_BUDGET || 12
);

export const ROUTINE_PAIN_VARIATIONS: VariationScenario[] = [
  {
    id: "v01_lower_right_back",
    title: "My lower-right back tooth hurts.",
    category: "location_phrasing",
    turns: [
      {
        utterance:
          "Hi, I'm William Buurma. My lower-right back tooth hurts, and I'm worried.",
      },
      { utterance: "Yeah, it's B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes, as soon as possible, and I can come in on short notice.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["name", "location", "swelling", "scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
      emotionCue: "worry",
    },
  },
  {
    id: "v02_bottom_right_back_ones",
    title: "It's on the bottom on my right, one of the back ones.",
    category: "location_phrasing",
    turns: [
      {
        utterance:
          "William Buurma here. It's on the bottom on my right, one of the back ones. It hurts.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No swelling.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest, and short notice is fine.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["location", "swelling", "scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v03_unknown_tooth_right_side",
    title: "I don't know which tooth, but the right side hurts.",
    category: "ambiguity",
    turns: [
      {
        utterance:
          "I'm William Buurma. I don't know which tooth, but the right side hurts.",
      },
      { utterance: "B as in boy, U, U, R, M as in man, A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "That's right.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "More toward the lower back.", asAnswerTo: "ask_combined_tooth_location" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes and yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["name", "swelling"],
      noTrap: true,
      safetyMaintained: true,
      emotionCue: "uncertainty",
    },
  },
  {
    id: "v04_correct_to_left",
    title: "Actually, sorry—it's the left side.",
    category: "correction",
    turns: [
      {
        utterance:
          "Hi, I'm William Buurma. Lower-right back tooth kept me up, I'm worried.",
      },
      { utterance: "Actually, sorry—it's the left side." },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Soonest possible, short notice ok.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["location", "swelling", "scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v05_woke_need_soon",
    title: "It woke me up and I need to be seen soon.",
    category: "scheduling",
    turns: [
      {
        utterance:
          "William Buurma. Lower right back tooth. It woke me up and I need to be seen soon.",
      },
      { utterance: "Yeah, it's B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes, short notice works.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["keptAwake", "scheduling", "swelling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v06_name_with_spelling",
    title: "William Buurma. B-U-U-R-M-A.",
    category: "spelling",
    turns: [
      {
        utterance:
          "William Buurma. B-U-U-R-M-A. Lower-right back tooth hurt all night.",
      },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest and short notice yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["name", "spelling", "location", "swelling"],
      noReaskFacts: ["spelling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v07_yeah_spelling",
    title: "Yeah, it's B-U-U-R-M-A.",
    category: "spelling",
    turns: [
      {
        utterance:
          "I'm William Buurma. Lower-right back tooth, kept me awake, worried.",
      },
      { utterance: "Yeah, it's B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes, ASAP and short notice.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["spelling", "swelling", "scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v08_phonetic_spelling",
    title: "B as in boy, U, U, R, M as in man, A.",
    category: "spelling",
    turns: [
      {
        utterance: "Hi I'm William Buurma, lower right back molar hurts.",
      },
      {
        utterance: "B as in boy, U, U, R, M as in man, A.",
        asAnswerTo: "ask_last_name_spelling",
      },
      { utterance: "Correct.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes to both.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["spelling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v09_already_spelled",
    title: "I already spelled it.",
    category: "refusal_loop",
    turns: [
      {
        utterance:
          "William Buurma. Lower-right back tooth. I'm worried.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "I already spelled it.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No swelling.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest please, short notice fine.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
      emotionCue: "frustration",
    },
  },
  {
    id: "v10_move_on",
    title: "Can we move on?",
    category: "refusal_loop",
    turns: [
      {
        utterance: "William Buurma, lower right back tooth pain.",
      },
      { utterance: "Can we move on?", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Soonest and short notice yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
      emotionCue: "frustration",
    },
  },
  {
    id: "v11_multi_fact_one_answer",
    title: "Name, location, swelling, and availability in one answer.",
    category: "multi_fact",
    turns: [
      {
        utterance:
          "I'm William Buurma, B-U-U-R-M-A, lower-right back tooth, no swelling, and I want the earliest appointment—I can come on short notice.",
      },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
    ],
    expect: {
      captureFacts: ["name", "spelling", "location", "swelling", "scheduling"],
      noReaskFacts: ["location", "swelling", "scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v12_scheduling_before_swelling",
    title: "Caller answers scheduling before swelling.",
    category: "scheduling",
    turns: [
      {
        utterance:
          "William Buurma. Lower-right back tooth kept me awake. I need the earliest and can do short notice.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
    ],
    expect: {
      captureFacts: ["scheduling", "swelling"],
      noReaskFacts: ["scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v13_interrupt_style",
    title: "Caller interrupts Aly.",
    category: "interrupt_ramble",
    turns: [
      {
        utterance:
          "Wait—William Buurma—lower right back—hurts bad—no wait also worried.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes earliest and short notice.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["name", "location"],
      noTrap: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v14_yes_to_compound_scheduling",
    title: 'Caller says "yes" to a compound scheduling question.',
    category: "scheduling",
    turns: [
      {
        utterance:
          "I'm William Buurma. Lower-right back tooth, worried, kept me up.",
      },
      { utterance: "Yeah, it's B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      { utterance: "Yes.", asAnswerTo: "ask_combined_scheduling_preference" },
    ],
    expect: {
      captureFacts: ["scheduling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v15_ambiguous_no",
    title: 'Caller gives an ambiguous "no."',
    category: "ambiguity",
    turns: [
      {
        utterance: "William Buurma, lower-right back tooth pain.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      { utterance: "No.", asAnswerTo: "ask_combined_scheduling_preference" },
      {
        utterance: "I mean yes earliest, and short notice is okay.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      safetyMaintained: true,
      completesOrEscalates: true,
    },
  },
  {
    id: "v16_correct_spelling",
    title: "Caller corrects the spelling.",
    category: "correction",
    turns: [
      {
        utterance: "I'm William Buurma. Lower right back tooth hurts.",
      },
      { utterance: "B-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      {
        utterance: "No, actually it's B-U-U-R-M-A.",
        asAnswerTo: "confirm_last_name_spelling",
      },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest, short notice yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["spelling"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v17_refuse_spell",
    title: "Caller refuses to spell.",
    category: "refusal_loop",
    turns: [
      {
        utterance: "William Buurma, lower-right back tooth, I'm in pain.",
      },
      {
        utterance: "I don't want to spell it. Can we move on?",
        asAnswerTo: "ask_last_name_spelling",
      },
      { utterance: "No swelling.", asAnswerTo: "ask_swelling" },
      {
        utterance: "As soon as possible, short notice fine.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
      emotionCue: "frustration",
    },
  },
  {
    id: "v18_scared",
    title: "Caller says they are scared.",
    category: "emotion",
    turns: [
      {
        utterance:
          "Hi, I'm William Buurma. My lower-right back tooth hurts and I'm scared.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes earliest and short notice.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      emotionCue: "fear",
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v19_calm_significant_pain",
    title: "Caller is calm despite significant pain.",
    category: "emotion",
    turns: [
      {
        utterance:
          "Hello, William Buurma. Lower-right back tooth has been awful, but I'm calm. Just need to be seen.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest available, short notice okay.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      emotionCue: "calm",
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v20_ramble_then_answer",
    title: "Caller rambles before providing the answer.",
    category: "interrupt_ramble",
    turns: [
      {
        utterance:
          "Well, so, um, I've been thinking, and anyway, I'm William Buurma and my lower-right back tooth kept me awake last night and I'm worried.",
      },
      {
        utterance: "Well, yeah, it's B-U-U-R-M-A I think.",
        asAnswerTo: "ask_last_name_spelling",
      },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes, ASAP, short notice fine.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["name", "location", "keptAwake"],
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v21_no_usable_twice",
    title: "Caller gives no usable answer twice.",
    category: "refusal_loop",
    turns: [
      {
        utterance: "William Buurma, lower-right back tooth pain.",
      },
      { utterance: "Huh?", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "What?", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "No swelling.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest and short notice.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      safetyMaintained: true,
      completesOrEscalates: true,
    },
  },
  {
    id: "v22_what_happens_next",
    title: "Caller asks what will happen next.",
    category: "meta_question",
    turns: [
      {
        utterance:
          "I'm William Buurma. Lower-right back tooth. What will happen next?",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Yes earliest, short notice ok.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      emotionCue: "worry",
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v23_has_appointment",
    title: "Caller asks whether they have an appointment.",
    category: "meta_question",
    turns: [
      {
        utterance:
          "William Buurma, lower-right back tooth. Do I already have an appointment?",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      { utterance: "No.", asAnswerTo: "ask_swelling" },
      {
        utterance: "Earliest please, short notice yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      noTrap: true,
      completesOrEscalates: true,
      safetyMaintained: true,
    },
  },
  {
    id: "v24_swelling_mid_call",
    title: "Caller changes from routine pain to reporting swelling.",
    category: "subject_change",
    turns: [
      {
        utterance:
          "I'm William Buurma. Lower-right back tooth kept me awake.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      {
        utterance: "Actually I do have some swelling on my face now.",
        asAnswerTo: "ask_swelling",
      },
      { utterance: "No fever.", asAnswerTo: "ask_fever" },
      { utterance: "Breathing is fine.", asAnswerTo: "ask_breathing" },
      {
        utterance: "Earliest and short notice yes.",
        asAnswerTo: "ask_combined_scheduling_preference",
      },
    ],
    expect: {
      captureFacts: ["swelling"],
      noTrap: true,
      safetyMaintained: true,
      completesOrEscalates: true,
    },
  },
  {
    id: "v25_trouble_swallowing",
    title: "Caller reports trouble swallowing mid-call.",
    category: "safety_escalation",
    turns: [
      {
        utterance:
          "William Buurma, lower-right back tooth pain, worried.",
      },
      { utterance: "B-U-U-R-M-A.", asAnswerTo: "ask_last_name_spelling" },
      { utterance: "Yes.", asAnswerTo: "confirm_last_name_spelling" },
      {
        utterance: "I'm having trouble swallowing now.",
      },
    ],
    expect: {
      emergencyEscalation: true,
      safetyMaintained: true,
      noTrap: true,
      completesOrEscalates: true,
    },
  },
];
