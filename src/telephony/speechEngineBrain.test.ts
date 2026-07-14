/**
 * Speech Engine brain — data fidelity, identity confirmation, hangup persist,
 * and structured staff handoff.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AMBER_KING_VOICE_ID,
  SPEECH_ENGINE_TRANSPORT,
  applyLastNameSpelling,
  buildStructuredStaffHandoff,
  checkEmergencySafety,
  confirmIdentityReadback,
  createSpeechEngineSession,
  executeTool,
  fallbackReply,
  nextIdentityPrompt,
  persistCompletedCall,
  persistOnCallClose,
  processCallerUtteranceForFacts,
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
    assert.notEqual(state.facts.name?.confidence, "confirmed");
    assert.equal(state.identity.lastNameConfirmed, false);
    assert.equal(state.facts.swelling?.value, false);
    assert.match(String(state.facts.painLocation?.value), /lower/i);
    assert.equal(state.facts.availability?.value, "tomorrow afternoon");
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
      confidence: "high",
    });
    applyLastNameSpelling(state, "KIM");
    confirmIdentityReadback(state);
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
      confidence: "high",
    });
    applyLastNameSpelling(state, "BROOKS");
    confirmIdentityReadback(state);
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
      /Taylor Brooks/i
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

describe("Speech Engine identity confirmation", () => {
  test("1. ASR Burma without spelling remains unconfirmed", () => {
    const state = createSpeechEngineSession({ callSid: "CA_asr" });
    processCallerUtteranceForFacts(
      state,
      "Yeah, it's William Burma."
    );
    assert.equal(state.identity.firstName, "William");
    assert.equal(state.identity.lastNameAsr, "Burma");
    assert.equal(state.identity.nameCaptured, true);
    assert.equal(state.identity.lastNameSpellingCaptured, false);
    assert.equal(state.identity.lastNameConfirmed, false);
    assert.notEqual(state.facts.name?.confidence, "confirmed");
  });

  test("2. Aly asks for surname spelling", () => {
    const state = createSpeechEngineSession({ callSid: "CA_ask_spell" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    const ask = nextIdentityPrompt(state) || fallbackReply(state, "William Burma");
    assert.match(ask, /spell your last name/i);
  });

  test("3. B-U-U-R-M-A becomes exactly Buurma", () => {
    const state = createSpeechEngineSession({ callSid: "CA_spell" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    assert.equal(state.identity.lastNameSpelling, "BUURMA");
    assert.equal(state.identity.lastName, "Buurma");
    assert.equal(state.facts.name?.value, "William Buurma");
    assert.equal(state.identity.lastNameConfirmed, false);
  });

  test("3b. spoken-letter and spaced variants parse exactly as Buurma", () => {
    for (const variant of [
      "B, U, U, R, M, A",
      "B U U R M A",
      "bee, you, you, are, em, ay",
    ]) {
      const state = createSpeechEngineSession({ callSid: `CA_var_${variant.length}` });
      processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
      processCallerUtteranceForFacts(state, variant);
      assert.equal(state.identity.lastNameSpelling, "BUURMA", variant);
      assert.equal(state.identity.lastName, "Buurma", variant);
    }
  });

  test("3c. live ASR E-U-U-R-M-A after Burma does not become Euurma", () => {
    const state = createSpeechEngineSession({ callSid: "CA_live_e" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "E-U-U-R-M-A.");
    assert.equal(state.identity.lastNameSpellingCaptured, false);
    assert.equal(state.identity.spellingAmbiguous, true);
    assert.notEqual(state.identity.lastName, "Euurma");
    assert.doesNotMatch(String(state.facts.name?.value || ""), /Euurma/);
    const ask = nextIdentityPrompt(state)!;
    assert.match(ask, /spell it again|spell your last name/i);
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    assert.equal(state.identity.lastName, "Buurma");
  });

  test("3d. no parser path turns the first B into E", () => {
    const state = createSpeechEngineSession({ callSid: "CA_no_e" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    assert.equal(state.identity.lastNameSpelling?.charAt(0), "B");
    assert.notEqual(state.identity.lastNameSpelling?.charAt(0), "E");
  });

  test("4. incomplete/ambiguous sequence remains unconfirmed", () => {
    const state = createSpeechEngineSession({ callSid: "CA_amb" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "Euurma");
    assert.equal(state.identity.lastNameConfirmed, false);
    assert.notEqual(state.identity.lastName, "Euurma");
  });

  test("5. full-name readback creates pending confirmation; Yeah that's correct confirms", () => {
    const state = createSpeechEngineSession({ callSid: "CA_readback" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    const readback = nextIdentityPrompt(state)!;
    assert.match(readback, /William Buurma/i);
    assert.match(readback, /B-U-U-R-M-A/);
    assert.match(readback, /Is that correct/i);
    assert.equal(state.identity.readbackPending, true);
    assert.equal(state.identity.lastNameConfirmed, false);
    // Exact live confirmation string
    processCallerUtteranceForFacts(state, "Yeah, that's correct.");
    assert.equal(state.identity.lastNameConfirmed, true);
    assert.equal(state.identity.readbackPending, false);
    assert.equal(state.facts.name?.confidence, "confirmed");
    assert.equal(state.facts.name?.value, "William Buurma");
  });

  test("6. unrelated yes does not confirm identity", () => {
    const state = createSpeechEngineSession({ callSid: "CA_unrelated_yes" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    // Clear pending without confirming — swelling answer with yeah before readback pending consumed
    state.identity.readbackPending = false;
    processCallerUtteranceForFacts(
      state,
      "Yeah, my cheek is swollen, and I'm not sure about the fever."
    );
    assert.equal(state.identity.lastNameConfirmed, false);
  });

  test("7. No keeps confirmation false and allows correction", () => {
    const state = createSpeechEngineSession({ callSid: "CA_no" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    nextIdentityPrompt(state);
    processCallerUtteranceForFacts(state, "No, it is B-U-U-R-M-A");
    assert.equal(state.identity.lastNameConfirmed, false);
    assert.equal(state.identity.lastName, "Buurma");
    assert.equal(state.identity.readbackPending, true);
  });

  test("8. confirmed Buurma persists exactly; no name_confirmation missing", () => {
    const state = createSpeechEngineSession({ callSid: "CA_persist_name" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    processCallerUtteranceForFacts(state, "Yeah, that's correct.");
    updateCallFacts(state, {
      facts: { chiefConcern: "toothache", swelling: true },
      confidence: "high",
    });
    state.turns = [
      { speaker: "patient", text: "Toothache with swelling, callback please." },
    ];
    const result = persistCompletedCall(state);
    assert.equal(result.ok, true);
    assert.equal(result.artifact?.callSummary?.patientName, "William Buurma");
    assert.equal(state.identity.lastName, "Buurma");
    assert.equal(JSON.stringify(result.artifact).includes("Euurma"), false);
    assert.equal(JSON.stringify(result.artifact).includes("Burma"), false);
    assert.equal(
      (result.artifact?.operatingIntelligence?.missingForGoodDecision || []).includes(
        "caller.name_confirmation"
      ),
      false
    );
    assert.match(
      String(result.artifact?.operatingIntelligence?.executiveSummary || ""),
      /William Buurma \(confirmed/
    );
  });

  test("9. confirmed Buurma cannot be overwritten by Burma, Euurma, or tool updates", () => {
    const state = createSpeechEngineSession({ callSid: "CA_protect" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    processCallerUtteranceForFacts(state, "Yeah, that's correct.");
    processCallerUtteranceForFacts(state, "William, um, Burma.");
    processCallerUtteranceForFacts(state, "E-U-U-R-M-A.");
    updateCallFacts(state, {
      facts: { name: "William Burma", lastNameSpelling: "EUURMA" },
      confidence: "confirmed",
    });
    assert.equal(state.facts.name?.value, "William Buurma");
    assert.equal(state.identity.lastName, "Buurma");
    assert.equal(state.identity.lastNameSpelling, "BUURMA");
    assert.equal(state.identity.lastNameConfirmed, true);
  });

  test("10. Aly does not re-ask after confirmation", () => {
    const state = createSpeechEngineSession({ callSid: "CA_noreask" });
    processCallerUtteranceForFacts(state, "Yeah, it's William Burma.");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    processCallerUtteranceForFacts(state, "Yeah, that's correct.");
    assert.equal(nextIdentityPrompt(state), null);
    const reply = fallbackReply(state, "ok thanks");
    assert.doesNotMatch(reply, /spell your last name/i);
    assert.doesNotMatch(reply, /first and last name/i);
  });
});

describe("Speech Engine authoritative corrections", () => {
  test("8. phone correction 0147 → 0148 stores only 0148", () => {
    const state = createSpeechEngineSession({ callSid: "CA_phone" });
    processCallerUtteranceForFacts(
      state,
      "My number is 616-555-0147."
    );
    assert.equal(state.facts.phone?.value, "+16165550147");
    processCallerUtteranceForFacts(
      state,
      "Sorry, the last four are 0148. So 616-555-0148."
    );
    assert.equal(state.facts.phone?.value, "+16165550148");
    assert.equal(state.facts.phone?.corrected, true);
    const handoff = buildStructuredStaffHandoff(state);
    assert.equal(handoff.caller.phone, "+16165550148");
    assert.doesNotMatch(handoff.executiveSummary, /0147/);
  });
});

describe("Speech Engine hangup persistence", () => {
  function seedMeaningfulCall(callSid: string) {
    const state = createSpeechEngineSession({ callSid });
    state.conversationId = `conv_${callSid}`;
    processCallerUtteranceForFacts(state, "William Burma");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    processCallerUtteranceForFacts(state, "Yes");
    processCallerUtteranceForFacts(state, "My number is 616-555-0148.");
    updateCallFacts(state, {
      facts: {
        chiefConcern: "toothache",
        painLocation: "upper left",
        swelling: true,
        availability: "tomorrow",
      },
      confidence: "high",
    });
    executeTool(
      state,
      "request_office_followup",
      JSON.stringify({
        requestedOutcome: "office callback for evaluation",
        availability: "tomorrow",
      })
    );
    state.turns = [
      { speaker: "aly", text: "How can I help?" },
      {
        speaker: "patient",
        text: "Toothache upper left with swelling, need a callback tomorrow.",
      },
    ];
    return state;
  }

  test("9. hangup during final model response still persists exactly once", () => {
    const state = seedMeaningfulCall("CA_hangup_once");
    const first = persistOnCallClose(state);
    const second = persistOnCallClose(state);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.alreadyPersisted, true);
    assert.equal(first.artifact?.callId, "CA_hangup_once");
    assert.equal(second.artifact?.callId, "CA_hangup_once");
    assert.equal(state.persisted, true);
  });

  test("10. call_closed abort does not prevent persistence", async () => {
    const state = seedMeaningfulCall("CA_call_closed");
    const controller = new AbortController();
    controller.abort("call_closed");
    const turn = await runBrainTurn(
      state,
      [{ role: "user", content: "Thanks, bye" }],
      controller.signal,
      {
        generateFn: async function* () {
          yield "I've shared these details";
        },
      }
    );
    assert.equal(turn.aborted, true);
    const persisted = persistOnCallClose(state);
    assert.equal(persisted.ok, true);
    assert.equal(persisted.artifact?.callId, "CA_call_closed");
  });

  test("11. persisted artifact belongs to latest callId not a stale prior call", () => {
    const prior = seedMeaningfulCall("CA_stale_prior");
    persistOnCallClose(prior);
    const latest = seedMeaningfulCall("CA_latest_live");
    const result = persistOnCallClose(latest);
    assert.equal(result.ok, true);
    assert.equal(result.artifact?.callId, "CA_latest_live");
    assert.notEqual(result.artifact?.callId, "CA_stale_prior");
  });
});

describe("Speech Engine structured staff handoff", () => {
  test("12–14. clean structured summary; unknown fever/insurance; request not booked", () => {
    const state = createSpeechEngineSession({ callSid: "CA_handoff" });
    processCallerUtteranceForFacts(state, "William Burma");
    processCallerUtteranceForFacts(state, "B-U-U-R-M-A");
    processCallerUtteranceForFacts(state, "Yes");
    processCallerUtteranceForFacts(state, "616-555-0148");
    updateCallFacts(state, {
      facts: {
        chiefConcern: "toothache",
        painLocation: "upper left",
        swelling: true,
        worsening: true,
        availability: "tomorrow, needs notice for work",
      },
      confidence: "high",
    });
    // Contradictory sleep → needs clarification
    processCallerUtteranceForFacts(state, "It kept me awake last night.");
    processCallerUtteranceForFacts(state, "It hasn't kept me up though.");
    executeTool(
      state,
      "request_office_followup",
      JSON.stringify({
        requestedOutcome: "office callback",
        availability: "tomorrow",
      })
    );
    state.turns = [
      {
        speaker: "patient",
        text: "Toothache upper left swelling, callback tomorrow.",
      },
    ];

    const handoff = buildStructuredStaffHandoff(state);
    assert.equal(handoff.caller.displayName, "William Buurma");
    assert.equal(handoff.caller.phone, "+16165550148");
    assert.equal(handoff.safety.fever, null);
    assert.equal(handoff.preferences.insurance, null);
    assert.match(handoff.executiveSummary, /fever: unknown/i);
    assert.match(String(handoff.missing.join(" ")), /insurance \(unknown\)/i);
    assert.equal(handoff.nextStep.booked, false);
    assert.match(handoff.nextStep.text, /Not booked/i);
    assert.doesNotMatch(handoff.executiveSummary, /My name is/i);
    assert.doesNotMatch(handoff.commLogNote, /I'm available/i);
    assert.match(String(handoff.safety.sleepDisruption), /clarification/i);

    const persisted = persistCompletedCall(state);
    assert.equal(persisted.ok, true);
    const summary = String(
      persisted.artifact?.operatingIntelligence?.executiveSummary || ""
    );
    const note = String(
      persisted.artifact?.operatingIntelligence?.openDentalCommLogNote || ""
    );
    assert.match(summary, /William Buurma/);
    assert.match(summary, /\+16165550148|16165550148/);
    assert.doesNotMatch(summary, /My name is/);
    assert.doesNotMatch(note, /My name is/);
    assert.match(
      String(persisted.artifact?.recommendedNextStep || ""),
      /Not booked/i
    );
    assert.equal(persisted.artifact?.callSummary?.patientName, "William Buurma");
  });

  test("scheduling language is not accepted as a patient name", () => {
    const state = createSpeechEngineSession({ callSid: "CA_sched_name" });
    updateCallFacts(state, {
      facts: { name: "available today" },
      confidence: "confirmed",
    });
    assert.equal(state.identity.nameCaptured, false);
    assert.notEqual(state.facts.name?.value, "available today");
  });
});
