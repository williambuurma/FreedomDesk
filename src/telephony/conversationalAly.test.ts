/**
 * Hybrid Conversational Aly — allow-list authority, spelling, golden path.
 */

import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";

import { analyzeTranscriptTurns } from "../conversation/engine.ts";
import {
  articulateClosing,
  planNextTurn,
  setArticulatePlanOptions,
} from "./articulateResponse.ts";
import {
  buildConversationOptions,
} from "./allowedActions.ts";
import { composeClosing } from "./callResponses.ts";
import {
  appendAlyAsk,
  createOrUpdateSession,
  hasLifeThreateningLanguage,
  isCallActionable,
  resetCallSessionsForTests,
  selectNextAsk,
  sessionToTranscript,
} from "./callSession.ts";
import { validatePlannerProposal } from "./conversationalGuardrails.ts";
import {
  parsePlannerProposal,
  proposalChoosing,
} from "./conversationalPlanner.ts";
import { normalizeSpokenSpelling } from "./spellingNormalize.ts";

function analyze(session: NonNullable<ReturnType<typeof createOrUpdateSession>>) {
  return analyzeTranscriptTurns(
    sessionToTranscript(session).turns,
    session.afterHours
  );
}

const GOLDEN_OPEN =
  "Hi, I'm William Buurma. My lower-right back tooth kept me awake last night, and I'm worried.";

describe("hybrid conversational Aly — authority correction", () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevFlag = process.env.HYBRID_CONVERSATIONAL_ALY;

  beforeEach(() => {
    resetCallSessionsForTests();
    setArticulatePlanOptions(null);
    delete process.env.OPENAI_API_KEY;
    delete process.env.HYBRID_CONVERSATIONAL_ALY;
  });

  afterEach(() => {
    setArticulatePlanOptions(null);
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevFlag === undefined) delete process.env.HYBRID_CONVERSATIONAL_ALY;
    else process.env.HYBRID_CONVERSATIONAL_ALY = prevFlag;
  });

  test("planner receives multiple safe action choices", () => {
    const session = createOrUpdateSession({
      callSid: "CA_allow_multi",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const opts = buildConversationOptions(session, analyze(session));
    assert.ok(opts.allowedActions.length >= 1);
    assert.ok(opts.allowedActions.includes("ask_last_name_spelling"));
    // Understand stage: clinical asks gated until spelling confirmed/abandoned.
    assert.ok(!opts.allowedActions.includes("ask_swelling"));
    assert.ok(!opts.allowedActions.includes("acknowledge_and_recap"));
    assert.ok(!opts.allowedActions.includes("ask_combined_tooth_location"));
    assert.ok(!opts.actionable);
  });

  test("planner can choose among allowed actions and reduce question count", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_choose",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const decision = await planNextTurn({
      session,
      analysis,
      planOptions: {
        planFn: async (ctx) => {
          assert.ok(ctx.options.allowedActions.includes("ask_last_name_spelling"));
          assert.equal(ctx.callStage, "understand");
          return proposalChoosing(
            "ask_last_name_spelling",
            "That sounds like a very uncomfortable night, and I understand why you're worried. Could you spell your last name for me?",
            {
              acknowledgment:
                "That sounds like a very uncomfortable night, and I understand why you're worried.",
              factsUnderstood: [
                "lower-right back tooth",
                "sleep disruption",
                "caller is worried",
              ],
            }
          );
        },
      },
    });
    assert.equal(decision.kind, "ask");
    assert.equal(decision.source, "planner");
    assert.equal(decision.selectedAction, "ask_last_name_spelling");
    assert.equal(decision.nextAsk!.field, "caller.last_name_spell");
    assert.match(decision.nextAsk!.question, /spell your last name/i);
    assert.match(decision.nextAsk!.question, /uncomfortable|worried/i);
    assert.doesNotMatch(decision.nextAsk!.question, /upper or lower|swelling|DOB|pain score/i);
  });

  test("planner can choose combined-location and combined scheduling actions", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_combined",
      speechResult: "I have tooth pain",
      from: "+16155550111",
    })!;
    // Force identity complete without location
    session.slots.name = "Alex Riv";
    session.slots.nameCaptured = true;
    session.slots.lastName = "Riv";
    session.slots.lastNameSpelling = "RIV";
    session.slots.lastNameSpellingCaptured = true;
    session.slots.lastNameConfirmed = true;

    let opts = buildConversationOptions(session, analyze(session));
    assert.ok(opts.allowedActions.includes("ask_combined_tooth_location"));

    let decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_combined_tooth_location",
            "Can you tell me where it is—upper or lower, left or right, and more toward the front or the back?"
          ),
      },
    });
    assert.equal(decision.selectedAction, "ask_combined_tooth_location");
    assert.equal(decision.nextAsk!.field, "pain.location.combined");

    appendAlyAsk(session, decision.nextAsk!);
    session = createOrUpdateSession({
      callSid: "CA_combined",
      speechResult: "lower right back",
      from: "+16155550111",
    })!;
    session.slots.swelling = false;

    opts = buildConversationOptions(session, analyze(session));
    assert.ok(opts.allowedActions.includes("ask_combined_scheduling_preference"));

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_combined_scheduling_preference",
            "Are you looking for the earliest available appointment, and would you be able to come in on short notice?"
          ),
      },
    });
    assert.equal(
      decision.selectedAction,
      "ask_combined_scheduling_preference"
    );
  });

  test("action membership replaces brittle forced-field equality", () => {
    const session = createOrUpdateSession({
      callSid: "CA_membership",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const opts = buildConversationOptions(session, analyze(session));
    const ok = validatePlannerProposal(
      proposalChoosing(
        "ask_last_name_spelling",
        "I hear how rough last night was. Could you spell your last name for me?"
      ),
      opts
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.reason, "ok");
  });

  test("invalid actions and unsafe language are rejected", () => {
    const session = createOrUpdateSession({
      callSid: "CA_reject",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const opts = buildConversationOptions(session, analyze(session));

    const notAllowed = validatePlannerProposal(
      proposalChoosing(
        "ask_fever",
        "Have you had a fever?"
      ),
      opts
    );
    assert.equal(notAllowed.ok, false);
    assert.equal(notAllowed.reason, "action_not_allowed");

    const unsafe = validatePlannerProposal(
      proposalChoosing(
        "ask_last_name_spelling",
        "This looks like an infection. Could you spell your last name?"
      ),
      opts
    );
    assert.equal(unsafe.ok, false);
    assert.equal(unsafe.reason, "diagnosis");
  });

  test("emergency rules cannot be overridden by the planner", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_er",
      speechResult: "I can't breathe and my face is swelling",
      from: "+16155550111",
    })!;
    assert.ok(hasLifeThreateningLanguage("I can't breathe"));
    const decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_swelling",
            "You'll be fine. Any swelling?"
          ),
      },
    });
    assert.equal(decision.kind, "complete");
    assert.equal(decision.selectedAction, "emergency_escalation");
  });

  test("spelling examples parse to BUURMA", () => {
    const r = normalizeSpokenSpelling(
      "B as in boy, U, U, R, M as in man, A"
    );
    assert.equal(r.spelling, "BUURMA");
    assert.equal(r.lowConfidence, false);

    const nato = normalizeSpokenSpelling("Bravo Uniform Uniform Romeo Mike Alpha");
    assert.equal(nato.spelling, "BUURMA");

    const doubles = normalizeSpokenSpelling("B double U R M A");
    assert.ok(doubles.spelling.includes("U"));
  });

  test("complete location is not re-asked", () => {
    const session = createOrUpdateSession({
      callSid: "CA_loc_done",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const opts = buildConversationOptions(session, analyze(session));
    assert.equal(opts.factsCaptured.locationComplete, true);
    assert.ok(!opts.allowedActions.includes("ask_combined_tooth_location"));
    assert.ok(!opts.missingMaterialFacts.includes("tooth_location"));
  });

  test("non-pain calls do not close before requested outcome is understood", () => {
    const session = createOrUpdateSession({
      callSid: "CA_nonpain",
      speechResult: "Hi, I'm Alex Riv calling",
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    assert.equal(isCallActionable(session, analysis), false);
    const opts = buildConversationOptions(session, analysis);
    assert.ok(!opts.allowedActions.includes("persist_and_close"));
    assert.ok(opts.allowedActions.includes("ask_reason_for_calling"));
  });

  test("timeout falls back safely and records latency", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_timeout",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        timeoutMs: 30,
        planFn: async () => {
          await new Promise((_, reject) => {
            const err = new Error("aborted");
            err.name = "AbortError";
            setTimeout(() => reject(err), 5);
          });
          return proposalChoosing("ask_last_name_spelling", "Spell please?");
        },
      },
    });
    assert.equal(decision.source, "fallback");
    assert.equal(decision.fallbackReason, "planner_timeout");
    assert.equal(decision.kind, "ask");
    assert.equal(decision.selectedAction, "ask_last_name_spelling");
    assert.ok(decision.plannerLatencyMs !== null);
  });

  test("closing requires actionable state and persistence", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_close_gate",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const draft = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: false,
      persisted: false,
      tone: session.tone,
    });
    const closing = await articulateClosing({
      session,
      analysis,
      deterministicClosing: draft,
      persisted: false,
      lifeThreatening: false,
      callActionable: false,
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "acknowledge_and_recap",
            "I've saved your details for the team."
          ),
      },
    });
    assert.equal(closing, draft);
  });

  test("golden path: spelling confirm swelling then combined schedule", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_gold",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;

    let decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_last_name_spelling",
            "I'm sorry that kept you up — I'll get this to the team clearly. Could you spell your last name for me?",
            {
              factsUnderstood: [
                "lower-right back tooth",
                "sleep disruption",
                "worried",
              ],
            }
          ),
      },
    });
    assert.equal(decision.selectedAction, "ask_last_name_spelling");
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_gold",
      speechResult: "B as in boy, U, U, R, M as in man, A",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.lastNameSpelling, "BUURMA");
    assert.equal(session.slots.lastNameSpellingCaptured, true);
    assert.equal(session.slots.lastNameConfirmed, false);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async (ctx) =>
          proposalChoosing(
            "confirm_last_name_spelling",
            `${String(ctx.options.lastNameSpellingHint || "BUURMA")
              .split("")
              .join("-")}, Buurma. Did I get that right?`
          ),
      },
    });
    assert.equal(decision.selectedAction, "confirm_last_name_spelling");
    assert.match(decision.nextAsk!.question, /B-U-U-R-M-A/i);
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_gold",
      speechResult: "Yes",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.lastNameConfirmed, true);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async (ctx) => {
          assert.ok(ctx.options.allowedActions.includes("ask_swelling"));
          assert.ok(
            !ctx.options.allowedActions.includes("ask_combined_tooth_location")
          );
          return proposalChoosing(
            "ask_swelling",
            "Thank you. Have you noticed any swelling on your face or gums?"
          );
        },
      },
    });
    assert.equal(decision.selectedAction, "ask_swelling");
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_gold",
      speechResult: "No",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.swelling, false);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_combined_scheduling_preference",
            "Thank you—that helps clarify how urgently the team should look at this. I just need one scheduling detail so the team knows how flexible you are. Are you looking for the earliest available appointment, and would you be able to come in on short notice?"
          ),
      },
    });
    assert.equal(
      decision.selectedAction,
      "ask_combined_scheduling_preference"
    );
    assert.match(decision.nextAsk!.question, /scheduling detail|flexible/i);
    assert.doesNotMatch(decision.nextAsk!.question, /\btruly\b/i);
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_gold",
      speechResult: "As soon as possible, and yes, I can come on short notice.",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.wantsEarliest, true);
    assert.equal(session.slots.shortNoticeOk, true);
    assert.equal(isCallActionable(session, analyze(session)), true);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing("persist_and_close", "", {
            reason: "call is actionable",
          }),
      },
    });
    assert.equal(decision.kind, "complete");
    assert.equal(decision.selectedAction, "persist_and_close");
  });

  test("parsePlannerProposal accepts judgment schema", () => {
    const p = parsePlannerProposal({
      understanding: "Caller has lower-right pain and is worried.",
      emotionalResponseNeeded: true,
      selectedAction: "ask_swelling",
      spokenResponse: "Have you noticed any swelling?",
      whyThisAction: "Swelling changes urgency routing.",
      shouldRecapProgress: false,
      shouldClose: false,
    });
    assert.ok(p);
    assert.equal(p!.selectedAction, "ask_swelling");
    assert.equal(p!.emotionalResponseNeeded, true);
    assert.match(p!.understanding, /worried/i);
  });

  test("ConversationRelay Amber King defaults remain unchanged", async () => {
    const relay = await import("../../server/conversation-relay.js");
    assert.equal(relay.DEFAULT_VOICE_ID, "F89WkXaQbUlVyNvtlD3X");
    assert.equal(relay.DEFAULT_VOICE_NAME, "Amber King");
    assert.equal(
      relay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2_5-0.97_0.40_0.88"
    );
  });

  test("Gather/Say rollback remains available when ConversationRelay is off", async () => {
    const prev = process.env.PHONE_VOICE_TRANSPORT;
    delete process.env.PHONE_VOICE_TRANSPORT;
    try {
      const twilioVoice = await import("../../server/twilio-voice.js");
      assert.equal(typeof twilioVoice.handleInboundVoice, "function");
      assert.equal(typeof twilioVoice.handleGatherVoice, "function");
      assert.notEqual(process.env.PHONE_VOICE_TRANSPORT, "conversation_relay");
    } finally {
      if (prev === undefined) delete process.env.PHONE_VOICE_TRANSPORT;
      else process.env.PHONE_VOICE_TRANSPORT = prev;
    }
  });

  test("deterministic selectNextAsk still works as fallback compiler", () => {
    const session = createOrUpdateSession({
      callSid: "CA_det",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const ask = selectNextAsk(session, analyze(session));
    assert.ok(ask);
    assert.equal(ask!.field, "caller.last_name_spell");
  });
});

describe("last-name spelling loop — live handler", () => {
  beforeEach(() => {
    resetCallSessionsForTests();
    setArticulatePlanOptions(null);
    delete process.env.OPENAI_API_KEY;
    delete process.env.HYBRID_CONVERSATIONAL_ALY;
  });

  afterEach(() => {
    setArticulatePlanOptions(null);
  });

  test("A: Yeah it's hyphenated spelling → BUURMA", () => {
    const r = normalizeSpokenSpelling("Yeah, it's B-U-U-R-M-A.");
    assert.equal(r.letters, "BUURMA");
    assert.equal(r.confidence, "high");
    assert.match(r.ignoredPrefix.toLowerCase(), /yeah/);
    assert.ok(!/^YEI/i.test(r.letters));
  });

  test("B: Yes, space-separated letters → BUURMA", () => {
    const r = normalizeSpokenSpelling("Yes, B U U R M A.");
    assert.equal(r.letters, "BUURMA");
    assert.ok(r.confidence === "high" || r.confidence === "medium");
  });

  test("C: as-in phonetic spelling → BUURMA", () => {
    const r = normalizeSpokenSpelling(
      "B as in boy, U, U, R, M as in man, A."
    );
    assert.equal(r.letters, "BUURMA");
    assert.equal(r.confidence, "high");
  });

  test("D: Yes after high-confidence confirm advances (no re-spell)", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_spell_d",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    let decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_last_name_spelling",
            "Could you spell your last name for me?"
          ),
      },
    });
    assert.equal(decision.selectedAction, "ask_last_name_spelling");
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_spell_d",
      speechResult: "Yeah, it's B-U-U-R-M-A.",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.lastNameSpelling, "BUURMA");
    assert.equal(session.slots.lastNameSpellingCaptured, true);
    assert.equal(session.slots.lastNameConfirmed, false);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async (ctx) => {
          assert.ok(
            ctx.options.allowedActions.includes("confirm_last_name_spelling")
          );
          assert.ok(
            !ctx.options.allowedActions.includes("ask_last_name_spelling")
          );
          return proposalChoosing(
            "confirm_last_name_spelling",
            "B-U-U-R-M-A, Buurma. Did I get that right?"
          );
        },
      },
    });
    assert.equal(decision.selectedAction, "confirm_last_name_spelling");
    appendAlyAsk(session, decision.nextAsk!);

    session = createOrUpdateSession({
      callSid: "CA_spell_d",
      speechResult: "Yes.",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.lastNameConfirmed, true);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async (ctx) => {
          assert.ok(
            !ctx.options.allowedActions.includes("ask_last_name_spelling")
          );
          assert.ok(
            !ctx.options.allowedActions.includes("confirm_last_name_spelling")
          );
          return proposalChoosing(
            "ask_swelling",
            "Have you noticed any swelling on your face or gums?"
          );
        },
      },
    });
    assert.notEqual(decision.selectedAction, "ask_last_name_spelling");
    assert.notEqual(decision.selectedAction, "confirm_last_name_spelling");
  });

  test("E: two failed spelling attempts → uncertainty flag, no third ask", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_spell_e",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;

    let decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_last_name_spelling",
            "Could you spell your last name for me?"
          ),
      },
    });
    appendAlyAsk(session, decision.nextAsk!);
    assert.equal(session.slots.spellingAttemptCount, 1);

    session = createOrUpdateSession({
      callSid: "CA_spell_e",
      speechResult: "Yeah, it is my last name.",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.lastNameSpellingCaptured === true, false);

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "ask_last_name_spelling",
            "Could you spell that once more, letter by letter?"
          ),
      },
    });
    assert.equal(decision.selectedAction, "ask_last_name_spelling");
    appendAlyAsk(session, decision.nextAsk!);
    assert.equal(session.slots.spellingAttemptCount, 2);

    session = createOrUpdateSession({
      callSid: "CA_spell_e",
      speechResult: "I already told you.",
      from: "+16155550111",
    })!;
    assert.equal(session.slots.spellingAbandoned, true);
    assert.equal(session.slots.lastNameConfirmed, false);
    assert.ok(
      (session.slots.teamFlags || []).includes(
        "last_name_spelling_needs_confirmation"
      )
    );

    decision = await planNextTurn({
      session,
      analysis: analyze(session),
      planOptions: {
        planFn: async (ctx) => {
          assert.ok(
            !ctx.options.allowedActions.includes("ask_last_name_spelling")
          );
          assert.ok(
            !ctx.options.allowedActions.includes("confirm_last_name_spelling")
          );
          return proposalChoosing(
            "ask_swelling",
            "Have you noticed any swelling on your face or gums?"
          );
        },
      },
    });
    assert.notEqual(decision.selectedAction, "ask_last_name_spelling");
    assert.notEqual(decision.selectedAction, "confirm_last_name_spelling");
    assert.match(
      decision.nextAsk!.question,
      /may not have every letter exactly right/i
    );
  });

  test("F: ordinary sentence does not fabricate letters", () => {
    const r = normalizeSpokenSpelling("Yeah, it is my last name.");
    assert.equal(r.letters, "");
    assert.equal(r.confidence, "none");
    assert.deepEqual(r.evidenceTokens, []);
  });

  test("G: hyphenated lowercase with punctuation → uppercase", () => {
    const r = normalizeSpokenSpelling("b-u-u-r-m-a");
    assert.equal(r.letters, "BUURMA");
    assert.equal(r.confidence, "high");

    const dashed = normalizeSpokenSpelling(
      "Yeah, it's B dash U dash U dash R dash M dash A"
    );
    assert.equal(dashed.letters, "BUURMA");
    assert.match(dashed.ignoredPrefix.toLowerCase(), /yeah/);
    assert.ok(!/B dash/i.test(dashed.ignoredPrefix));
  });
});
