/**
 * Speech Engine brain spike acceptance tests — five natural-call behaviors.
 * No live Twilio / ElevenLabs required.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AMBER_KING_VOICE_ID,
  SPEECH_ENGINE_TRANSPORT,
  checkEmergencySafety,
  createSpeechEngineSession,
  executeTool,
  fallbackReply,
  persistCompletedCall,
  runBrainTurn,
  updateCallFacts,
  useSpeechEngineTransport,
} from "./speechEngineBrain.ts";

describe("Speech Engine transport flag", () => {
  test("elevenlabs_speech_engine flag is distinct from conversation_relay", () => {
    assert.equal(
      useSpeechEngineTransport({
        PHONE_VOICE_TRANSPORT: "elevenlabs_speech_engine",
      }),
      true
    );
    assert.equal(
      useSpeechEngineTransport({
        PHONE_VOICE_TRANSPORT: "conversation_relay",
      }),
      false
    );
    assert.equal(SPEECH_ENGINE_TRANSPORT, "elevenlabs_speech_engine");
    assert.equal(AMBER_KING_VOICE_ID, "F89WkXaQbUlVyNvtlD3X");
  });
});

describe("Speech Engine spike acceptance", () => {
  test("1. caller speaking first aborts in-flight greeting/response", async () => {
    const state = createSpeechEngineSession({ callSid: "CA_early" });
    const controller = new AbortController();
    const generateFn = async function* (
      _state: unknown,
      _transcript: unknown,
      signal: AbortSignal
    ) {
      yield "Thanks for calling Cascade Family Dentistry. This is Aly. ";
      await new Promise((r) => setTimeout(r, 20));
      if (signal.aborted) return;
      yield "How can I help you today with a long remaining greeting?";
    };

    const pending = runBrainTurn(
      state,
      [{ role: "user", content: "Hi I need help with tooth pain" }],
      controller.signal,
      { generateFn }
    );
    setTimeout(() => controller.abort(), 5);
    const result = await pending;
    assert.equal(result.aborted, true);
  });

  test("2. random-order facts update without fixed field order", () => {
    const state = createSpeechEngineSession({ callSid: "CA_random" });
    updateCallFacts(state, {
      facts: { availability: "tomorrow afternoon" },
      confidence: "high",
    });
    updateCallFacts(state, {
      facts: { swelling: false, painLocation: "lower right molar" },
      confidence: "high",
    });
    updateCallFacts(state, {
      facts: { name: "Jordan Lee", chiefConcern: "tooth pain" },
      confidence: "confirmed",
    });

    assert.equal(state.facts.name?.value, "Jordan Lee");
    assert.equal(state.facts.swelling?.value, false);
    assert.match(String(state.facts.painLocation?.value), /lower/i);
    assert.equal(state.facts.availability?.value, "tomorrow afternoon");
    // No prescribed ask order — facts accepted as supplied.
    assert.equal(Object.keys(state.facts).length >= 4, true);
  });

  test("3. what happens next gets a truthful non-booking answer", () => {
    const state = createSpeechEngineSession({ callSid: "CA_next" });
    updateCallFacts(state, {
      facts: { name: "Sam Rivera", chiefConcern: "toothache" },
      confidence: "high",
    });
    const reply = fallbackReply(state, "What happens next?");
    assert.match(reply, /follow up/i);
    assert.doesNotMatch(reply, /booked|scheduled you|confirmed your appointment/i);
    assert.match(reply, /won'?t book|haven'?t booked|not book/i);
  });

  test("4. interruption correction updates location facts", () => {
    const state = createSpeechEngineSession({ callSid: "CA_correct" });
    updateCallFacts(state, {
      facts: { painLocation: "lower right" },
      confidence: "high",
    });
    executeTool(
      state,
      "update_call_facts",
      JSON.stringify({
        facts: { painLocation: "lower left" },
        corrected: true,
        confidence: "confirmed",
      })
    );
    assert.match(String(state.facts.painLocation?.value), /left/i);
    assert.equal(state.facts.painLocation?.corrected, true);
    assert.doesNotMatch(String(state.facts.painLocation?.value), /right/i);
  });

  test("5. already-answered / move-on does not re-ask and progresses", () => {
    const state = createSpeechEngineSession({ callSid: "CA_moveon" });
    updateCallFacts(state, {
      facts: {
        name: "Alex Kim",
        chiefConcern: "molar pain",
        painLocation: "upper left",
        swelling: false,
      },
      confidence: "confirmed",
    });
    const reply = fallbackReply(
      state,
      "I already answered that. Can we move on?"
    );
    assert.match(reply, /won'?t ask that again|you'?re right/i);
    assert.doesNotMatch(reply, /what(?:'s| is) your name\??/i);
    assert.doesNotMatch(reply, /where (?:in the mouth )?is the pain\??/i);
  });

  test("emergency safety preempts ordinary conversation", () => {
    const state = createSpeechEngineSession({ callSid: "CA_er" });
    const result = checkEmergencySafety(
      state,
      "I can't breathe and my face is swelling"
    );
    assert.equal(result.lifeThreatening, true);
    assert.ok(result.speech);
    assert.match(String(result.speech), /911|emergency room/i);
    assert.equal(state.emergencyPreempted, true);
  });

  test("persist_completed_call runs existing completed-call pipeline", () => {
    const state = createSpeechEngineSession({ callSid: "CA_persist" });
    updateCallFacts(state, {
      facts: {
        name: "Taylor Brooks",
        chiefConcern: "lower left tooth pain",
        painLocation: "lower left",
        swelling: false,
        availability: "Friday morning",
        wantsEarliest: true,
      },
      confidence: "confirmed",
    });
    state.turns = [
      { speaker: "aly", text: state.greeting },
      {
        speaker: "patient",
        text: "Taylor Brooks, lower left tooth pain, no swelling, Friday morning works.",
      },
    ];
    const result = persistCompletedCall(state);
    assert.equal(result.ok, true);
    assert.equal(state.persisted, true);
    assert.equal(state.persistArtifact?.source, "twilio_speech_engine");
    assert.ok(state.persistArtifact?.operatingIntelligence?.executiveSummary);
    assert.match(
      String(state.persistArtifact?.callSummary?.patientName || ""),
      /Taylor|Brooks|Caller/i
    );
  });

  test("model may not claim booking via request_office_followup", () => {
    const state = createSpeechEngineSession({ callSid: "CA_follow" });
    const out = executeTool(
      state,
      "request_office_followup",
      JSON.stringify({
        requestedOutcome: "same-day evaluation",
        availability: "after 3pm",
        wantsEarliest: true,
      })
    );
    assert.equal(out.booked, false);
    assert.equal(state.followupRequested, true);
    assert.equal(state.facts.requestedOutcome?.value, "same-day evaluation");
  });
});
