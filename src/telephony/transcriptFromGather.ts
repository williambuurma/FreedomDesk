/**
 * Build a MockCallTranscript from a Twilio Gather speech/DTMF result.
 */

import type { MockCallTranscript } from "../conversation/types.ts";
import {
  isAfterHours,
  loadPracticeVoiceConfig,
  selectGreeting,
  type PracticeVoiceConfig,
} from "./practiceConfig.ts";

export interface GatherTranscriptInput {
  callSid: string;
  speechResult?: string;
  digits?: string;
  /** E.164 From — used only inside the transcript for pipeline slots; never logged. */
  from?: string;
  practiceId?: string;
  now?: Date;
  config?: PracticeVoiceConfig;
}

function callerUtterance(speechResult?: string, digits?: string): string {
  const speech = (speechResult || "").trim();
  if (speech) return speech;
  const dig = (digits || "").trim();
  if (dig) return `Caller pressed ${dig} on the keypad.`;
  return "";
}

/**
 * Minimal two-turn transcript: Aly greeting + caller reason.
 * Matches fixtures/calls shape expected by processCallTranscript().
 */
export function buildTranscriptFromGather(
  input: GatherTranscriptInput
): MockCallTranscript | null {
  const reason = callerUtterance(input.speechResult, input.digits);
  if (!reason) return null;

  const now = input.now || new Date();
  const config = input.config || loadPracticeVoiceConfig();
  const greeting = selectGreeting(config, now);
  const afterHours = isAfterHours(config, now);
  const callId = `call_twilio_${(input.callSid || "local").replace(/\W/g, "_")}`;

  const turns: MockCallTranscript["turns"] = [
    { speaker: "aly", text: greeting },
    { speaker: "patient", text: reason },
  ];

  // Optional callback number for front-desk slots — synthetic phrasing, not logged.
  const from = (input.from || "").trim();
  if (from && /^\+?\d{10,15}$/.test(from.replace(/[\s()-]/g, ""))) {
    turns.push({
      speaker: "aly",
      text: "What is a good phone number to reach you at?",
    });
    turns.push({
      speaker: "patient",
      text: from,
    });
  }

  return {
    id: callId,
    practiceId: input.practiceId || config.practiceId,
    scenario: "twilio-inbound-gather",
    afterHours,
    receivedAt: now.toISOString(),
    turns,
  };
}
