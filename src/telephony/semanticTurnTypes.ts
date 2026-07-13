/**
 * Structured semantic turn interpretation — what the caller communicated.
 * Used before action selection; does not decide the next conversational move.
 */

export type SemanticIntent =
  | "dental_pain"
  | "emergency"
  | "scheduling"
  | "identity"
  | "correction"
  | "refusal"
  | "question"
  | "other";

export type SemanticEmotion =
  | "worried"
  | "frustrated"
  | "scared"
  | "calm"
  | "in_pain"
  | "impatient";

export interface SemanticToothLocation {
  upperLower: "upper" | "lower" | null;
  leftRight: "left" | "right" | null;
  frontBack: "front" | "back" | null;
}

export interface SemanticFacts {
  firstName: string | null;
  lastName: string | null;
  spelledLastName: string | null;
  toothLocation: SemanticToothLocation;
  swelling: boolean | null;
  fever: boolean | null;
  duration: string | null;
  sleepDisruption: boolean | null;
  wantsEarliest: boolean | null;
  shortNoticeAvailable: boolean | null;
  breathingTrouble: boolean | null;
  swallowingTrouble: boolean | null;
  /** True when the utterance contains explicit letter-spelling content. */
  containsSpellingContent: boolean;
}

export interface SemanticConfirmation {
  yes: boolean;
  no: boolean;
  target: string | null;
}

export interface SemanticCorrection {
  field: string;
  previousHint: string | null;
  newValue: string;
}

export interface ConversationSignals {
  callerIsFrustrated: boolean;
  callerSaysAlreadyAnswered: boolean;
  callerChangedSubject: boolean;
  callerAsksWhatHappensNext: boolean;
  callerAsksIfHasAppointment: boolean;
}

export interface SemanticTurnInterpretation {
  intent: SemanticIntent;
  emotions: SemanticEmotion[];
  facts: SemanticFacts;
  confirmation: SemanticConfirmation;
  corrections: SemanticCorrection[];
  uncertainty: string[];
  refusals: string[];
  conversationSignals: ConversationSignals;
  /** Interpreter source for traces. */
  source: "openai" | "heuristic" | "injected";
}

export function emptySemanticFacts(): SemanticFacts {
  return {
    firstName: null,
    lastName: null,
    spelledLastName: null,
    toothLocation: {
      upperLower: null,
      leftRight: null,
      frontBack: null,
    },
    swelling: null,
    fever: null,
    duration: null,
    sleepDisruption: null,
    wantsEarliest: null,
    shortNoticeAvailable: null,
    breathingTrouble: null,
    swallowingTrouble: null,
    containsSpellingContent: false,
  };
}

export function emptySemanticInterpretation(
  source: SemanticTurnInterpretation["source"] = "heuristic"
): SemanticTurnInterpretation {
  return {
    intent: "other",
    emotions: [],
    facts: emptySemanticFacts(),
    confirmation: { yes: false, no: false, target: null },
    corrections: [],
    uncertainty: [],
    refusals: [],
    conversationSignals: {
      callerIsFrustrated: false,
      callerSaysAlreadyAnswered: false,
      callerChangedSubject: false,
      callerAsksWhatHappensNext: false,
      callerAsksIfHasAppointment: false,
    },
    source,
  };
}

/** JSON Schema for OpenAI Structured Outputs (strict). */
export const SEMANTIC_TURN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "emotions",
    "facts",
    "confirmation",
    "corrections",
    "uncertainty",
    "refusals",
    "conversationSignals",
  ],
  properties: {
    intent: {
      type: "string",
      enum: [
        "dental_pain",
        "emergency",
        "scheduling",
        "identity",
        "correction",
        "refusal",
        "question",
        "other",
      ],
    },
    emotions: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "worried",
          "frustrated",
          "scared",
          "calm",
          "in_pain",
          "impatient",
        ],
      },
    },
    facts: {
      type: "object",
      additionalProperties: false,
      required: [
        "firstName",
        "lastName",
        "spelledLastName",
        "toothLocation",
        "swelling",
        "fever",
        "duration",
        "sleepDisruption",
        "wantsEarliest",
        "shortNoticeAvailable",
        "breathingTrouble",
        "swallowingTrouble",
        "containsSpellingContent",
      ],
      properties: {
        firstName: { type: ["string", "null"] },
        lastName: { type: ["string", "null"] },
        spelledLastName: { type: ["string", "null"] },
        toothLocation: {
          type: "object",
          additionalProperties: false,
          required: ["upperLower", "leftRight", "frontBack"],
          properties: {
            upperLower: { type: ["string", "null"], enum: ["upper", "lower", null] },
            leftRight: { type: ["string", "null"], enum: ["left", "right", null] },
            frontBack: { type: ["string", "null"], enum: ["front", "back", null] },
          },
        },
        swelling: { type: ["boolean", "null"] },
        fever: { type: ["boolean", "null"] },
        duration: { type: ["string", "null"] },
        sleepDisruption: { type: ["boolean", "null"] },
        wantsEarliest: { type: ["boolean", "null"] },
        shortNoticeAvailable: { type: ["boolean", "null"] },
        breathingTrouble: { type: ["boolean", "null"] },
        swallowingTrouble: { type: ["boolean", "null"] },
        containsSpellingContent: { type: "boolean" },
      },
    },
    confirmation: {
      type: "object",
      additionalProperties: false,
      required: ["yes", "no", "target"],
      properties: {
        yes: { type: "boolean" },
        no: { type: "boolean" },
        target: { type: ["string", "null"] },
      },
    },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "previousHint", "newValue"],
        properties: {
          field: { type: "string" },
          previousHint: { type: ["string", "null"] },
          newValue: { type: "string" },
        },
      },
    },
    uncertainty: { type: "array", items: { type: "string" } },
    refusals: { type: "array", items: { type: "string" } },
    conversationSignals: {
      type: "object",
      additionalProperties: false,
      required: [
        "callerIsFrustrated",
        "callerSaysAlreadyAnswered",
        "callerChangedSubject",
        "callerAsksWhatHappensNext",
        "callerAsksIfHasAppointment",
      ],
      properties: {
        callerIsFrustrated: { type: "boolean" },
        callerSaysAlreadyAnswered: { type: "boolean" },
        callerChangedSubject: { type: "boolean" },
        callerAsksWhatHappensNext: { type: "boolean" },
        callerAsksIfHasAppointment: { type: "boolean" },
      },
    },
  },
} as const;
