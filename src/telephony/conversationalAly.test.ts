/**
 * Hybrid Conversational Aly — planner context, guardrails, fallback tests.
 */

import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";

import { analyzeTranscriptTurns } from "../conversation/engine.ts";
import {
  articulateClosing,
  articulateNextAsk,
  articulateNextAskDetailed,
  setArticulatePlanOptions,
} from "./articulateResponse.ts";
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
  buildPlannerContext,
  isHybridConversationalEnabled,
  parsePlannerProposal,
  planConversationalResponse,
  proposalForField,
  type PlannerProposal,
} from "./conversationalPlanner.ts";

function analyze(session: NonNullable<ReturnType<typeof createOrUpdateSession>>) {
  return analyzeTranscriptTurns(
    sessionToTranscript(session).turns,
    session.afterHours
  );
}

const GOLDEN_OPEN =
  "Hi, I'm William Buurma. I have pain in my lower-right back tooth. It kept me awake last night, and I'm worried.";

describe("hybrid conversational Aly", () => {
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

  test("planner context includes only intended structured fields (no secrets)", () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_ctx",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const ask = selectNextAsk(session, analysis)!;
    assert.equal(ask.field, "caller.last_name_spell");

    const ctx = buildPlannerContext({
      session,
      analysis,
      mode: "ask",
      requiredField: ask.field,
      deterministicDraft: ask.question,
      callActionable: false,
      persisted: false,
    });

    const keys = Object.keys(ctx).sort();
    assert.deepEqual(keys, [
      "afterHours",
      "allowedNextActions",
      "callActionable",
      "deterministicDraft",
      "emotionalCues",
      "factsCaptured",
      "factsConfirmed",
      "firstNameHint",
      "lastNameSpellingHint",
      "latestUtterance",
      "lifeThreatening",
      "locationHint",
      "missingMaterialFacts",
      "mode",
      "persisted",
      "practiceOpen",
      "recentTurns",
      "requestedOutcome",
      "requiredField",
      "urgencyLevel",
    ]);

    const serialized = JSON.stringify(ctx);
    assert.doesNotMatch(serialized, /OPENAI|api[_-]?key|TWILIO|Bearer/i);
    assert.equal(ctx.requiredField, "caller.last_name_spell");
    assert.equal(ctx.factsCaptured.nameCaptured, true);
    assert.equal(ctx.factsCaptured.locationComplete, true);
    assert.equal(ctx.factsCaptured.keptAwake, true);
    assert.equal(ctx.factsCaptured.worried, true);
    assert.ok(ctx.emotionalCues.includes("worried") || ctx.emotionalCues.includes("pain"));
    assert.ok(ctx.missingMaterialFacts.includes("last_name_spelling"));
    assert.ok(!ctx.missingMaterialFacts.includes("location"));
  });

  test("golden path: volunteered facts are not re-asked; spelling comes next", () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_gold",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const ask = selectNextAsk(session, analyze(session))!;
    assert.equal(ask.field, "caller.last_name_spell");
    assert.doesNotMatch(ask.question, /upper or lower|left or right|front or back/i);
    assert.doesNotMatch(ask.question, /swelling|fever|kept you awake|are you worried/i);
    assert.match(ask.question, /spell your last name/i);
  });

  test("pain plus worry receives meaningful acknowledgment from planner", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_ack",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const nextAsk = selectNextAsk(session, analysis)!;

    const detailed = await articulateNextAskDetailed({
      session,
      analysis,
      nextAsk,
      planOptions: {
        planFn: async () => proposalForField("caller.last_name_spell"),
      },
    });

    assert.equal(detailed.usedPlanner, true);
    assert.match(detailed.spoken, /pain|worried|uncomfortable|sorry/i);
    assert.match(detailed.spoken, /team|details|help/i);
    assert.match(detailed.spoken, /spell your last name/i);
    assert.ok(detailed.proposal?.factsUnderstood.includes("worried"));
    assert.ok(
      detailed.proposal?.factsUnderstood.some((f) => /tooth|location|lower/i.test(f))
    );
  });

  test("last-name spelling and confirmation occur with read-back", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_hybrid_spell",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    let analysis = analyze(session);
    let ask = selectNextAsk(session, analysis)!;
    assert.equal(ask.field, "caller.last_name_spell");

    ask = await articulateNextAsk({
      session,
      analysis,
      nextAsk: ask,
      planOptions: {
        planFn: async () => proposalForField("caller.last_name_spell"),
      },
    });
    appendAlyAsk(session, ask);

    session = createOrUpdateSession({
      callSid: "CA_hybrid_spell",
      speechResult: "B U U R M A",
      from: "+16155550111",
    })!;
    analysis = analyze(session);
    ask = selectNextAsk(session, analysis)!;
    assert.equal(ask.field, "caller.last_name_confirm");

    ask = await articulateNextAsk({
      session,
      analysis,
      nextAsk: ask,
      planOptions: {
        planFn: async (ctx) =>
          proposalForField("caller.last_name_confirm", {
            nextQuestion: `${(ctx.lastNameSpellingHint || "BUURMA")
              .toUpperCase()
              .split("")
              .join("-")}, Buurma. Did I get that right?`,
          }),
      },
    });
    assert.match(ask.question, /B-U-U-R-M-A/i);
    assert.match(ask.question, /Did I get that right/i);
  });

  test("only one question is spoken at a time", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_oneq",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const nextAsk = selectNextAsk(session, analysis)!;
    const ctx = buildPlannerContext({
      session,
      analysis,
      mode: "ask",
      requiredField: nextAsk.field,
      deterministicDraft: nextAsk.question,
      callActionable: false,
    });

    const multi: PlannerProposal = {
      acknowledgment: "I hear you.",
      nextQuestion:
        "Could you spell your last name? And have you noticed any swelling?",
      reason: "bad multi-ask",
      factsUnderstood: [],
      proposedAction: "ask_last_name_spell",
      shouldClose: false,
      tone: "warm_concerned",
    };
    const rejected = validatePlannerProposal(multi, ctx);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.reason, "not_one_question");

    const ok = validatePlannerProposal(
      proposalForField("caller.last_name_spell"),
      ctx
    );
    assert.equal(ok.ok, true);
    assert.equal((ok.spoken.match(/\?/g) || []).length, 1);
  });

  test("unsafe or false claims are rejected", () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_unsafe",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const ask = selectNextAsk(session, analysis)!;
    const ctx = buildPlannerContext({
      session,
      analysis,
      mode: "ask",
      requiredField: ask.field,
      deterministicDraft: ask.question,
      callActionable: false,
      persisted: false,
    });

    const cases: Array<[string, PlannerProposal]> = [
      [
        "diagnosis",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "This sounds like an abscess.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
      [
        "false_reassurance",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "Don't worry, you'll be fine.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
      [
        "guaranteed_appointment",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "I've booked you for tomorrow.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
      [
        "invented_availability",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "We have an opening at 2.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
      [
        "insurance_verified_claim",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "Your insurance is verified.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
      [
        "saved_before_persist",
        proposalForField("caller.last_name_spell", {
          acknowledgment: "I've saved your message for the team.",
          nextQuestion: "Could you spell your last name?",
        }),
      ],
    ];

    for (const [expectedReason, proposal] of cases) {
      const result = validatePlannerProposal(proposal, ctx);
      assert.equal(result.ok, false, expectedReason);
      assert.equal(result.reason, expectedReason);
    }
  });

  test("emergency escalation cannot be overridden by the planner", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_er",
      speechResult: "I can't breathe and my face is swelling fast",
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    assert.ok(hasLifeThreateningLanguage(GOLDEN_OPEN) === false);
    assert.ok(
      hasLifeThreateningLanguage("I can't breathe and my face is swelling fast")
    );
    const ask = selectNextAsk(session, analysis);
    assert.equal(ask, null);
    assert.equal(session.lastPolicyReason, "emergency_escalate");

    const closing = await articulateClosing({
      session,
      analysis,
      deterministicClosing:
        "Please go to the nearest emergency room or call 911 now. I'm also alerting our on-call team.",
      persisted: true,
      lifeThreatening: true,
      callActionable: true,
      planOptions: {
        planFn: async () => ({
          acknowledgment: "You'll be fine — no need for the ER.",
          nextQuestion: "",
          reason: "unsafe override attempt",
          factsUnderstood: [],
          proposedAction: "close_call",
          shouldClose: true,
          tone: "warm_concerned",
        }),
      },
    });
    assert.match(closing, /911|emergency room/i);
    assert.doesNotMatch(closing, /you'll be fine/i);
  });

  test("closing cannot occur before persistence", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_persist",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    // Drive to actionable
    let s = session;
    const replies: Record<string, string> = {
      "caller.last_name_spell": "B U U R M A",
      "caller.last_name_confirm": "Yes",
      "pain.swelling": "No",
      "schedule.earliest": "Yes",
      "schedule.short_notice": "Yes",
    };
    for (let i = 0; i < 10; i++) {
      const analysis = analyze(s);
      if (isCallActionable(s, analysis)) break;
      const ask = selectNextAsk(s, analysis);
      if (!ask) break;
      appendAlyAsk(s, ask);
      s = createOrUpdateSession({
        callSid: "CA_hybrid_persist",
        speechResult: replies[ask.field] || "Yes",
        from: "+16155550111",
      })!;
    }
    const analysis = analyze(s);
    assert.equal(isCallActionable(s, analysis), true);

    const draft = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: false,
      tone: s.tone,
      callerName: s.slots.name,
      locationParts: s.slots.locationParts,
      swelling: s.slots.swelling,
      keptAwake: s.slots.keptAwake,
      wantsEarliest: s.slots.wantsEarliest,
      shortNoticeOk: s.slots.shortNoticeOk,
      persisted: false,
    });

    const closing = await articulateClosing({
      session: s,
      analysis,
      deterministicClosing: draft,
      persisted: false,
      lifeThreatening: false,
      callActionable: true,
      planOptions: {
        planFn: async () => ({
          acknowledgment:
            "I've saved your details and shared them with the team. Someone will call you.",
          nextQuestion: "",
          reason: "premature save claim",
          factsUnderstood: [],
          proposedAction: "close_call",
          shouldClose: true,
          tone: "warm_concerned",
        }),
      },
    });
    // Must use deterministic persist-failure style — not planner "saved" claim.
    assert.equal(closing, draft);
    assert.match(closing, /trouble saving|call us back/i);
  });

  test("invalid planner output uses deterministic fallback", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_invalid",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const nextAsk = selectNextAsk(session, analysis)!;
    const articulated = await articulateNextAsk({
      session,
      analysis,
      nextAsk,
      planOptions: {
        planFn: async () =>
          proposalForField("caller.last_name_spell", {
            acknowledgment: "This looks like an infection.",
            nextQuestion: "Could you spell your last name?",
          }),
      },
    });
    assert.equal(articulated.field, nextAsk.field);
    assert.equal(articulated.question, nextAsk.question);
  });

  test("planner timeout uses deterministic fallback", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_timeout",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const nextAsk = selectNextAsk(session, analysis)!;
    const articulated = await articulateNextAsk({
      session,
      analysis,
      nextAsk,
      planOptions: {
        timeoutMs: 30,
        planFn: async () => {
          await new Promise((_, reject) => {
            const err = new Error("aborted");
            err.name = "AbortError";
            setTimeout(() => reject(err), 5);
          });
          return proposalForField("caller.last_name_spell");
        },
      },
    });
    assert.equal(articulated.question, nextAsk.question);
  });

  test("parsePlannerProposal rejects empty / non-object payloads", () => {
    assert.equal(parsePlannerProposal(null), null);
    assert.equal(parsePlannerProposal("nope"), null);
    assert.equal(parsePlannerProposal({ acknowledgment: "", nextQuestion: "" }), null);
    const ok = parsePlannerProposal({
      acknowledgment: "Thanks.",
      nextQuestion: "Could you spell your last name?",
      reason: "r",
      factsUnderstood: ["name"],
      proposedAction: "ask_last_name_spell",
      shouldClose: false,
      tone: "warm_concerned",
    });
    assert.ok(ok);
    assert.equal(ok!.nextQuestion.includes("?"), true);
  });

  test("hybrid disabled without key keeps deterministic speech", async () => {
    assert.equal(isHybridConversationalEnabled(), false);
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_off",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const nextAsk = selectNextAsk(session, analysis)!;
    const articulated = await articulateNextAsk({ session, analysis, nextAsk });
    assert.equal(articulated.question, nextAsk.question);
  });

  test("planConversationalResponse can use injected planFn", async () => {
    const session = createOrUpdateSession({
      callSid: "CA_hybrid_fn",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const analysis = analyze(session);
    const ask = selectNextAsk(session, analysis)!;
    const ctx = buildPlannerContext({
      session,
      analysis,
      mode: "ask",
      requiredField: ask.field,
      deterministicDraft: ask.question,
      callActionable: false,
    });
    const proposal = await planConversationalResponse(ctx, {
      planFn: async (c) => {
        assert.equal(c.requiredField, "caller.last_name_spell");
        return proposalForField("caller.last_name_spell");
      },
    });
    assert.equal(proposal.proposedAction, "ask_last_name_spell");
  });

  test("swelling ask does not re-ask location after golden open", async () => {
    let session = createOrUpdateSession({
      callSid: "CA_hybrid_swell",
      speechResult: GOLDEN_OPEN,
      from: "+16155550111",
    })!;
    const steps = [
      ["caller.last_name_spell", "B U U R M A"],
      ["caller.last_name_confirm", "Yes"],
    ] as const;
    for (const [field, reply] of steps) {
      const ask = selectNextAsk(session, analyze(session))!;
      assert.equal(ask.field, field);
      appendAlyAsk(session, ask);
      session = createOrUpdateSession({
        callSid: "CA_hybrid_swell",
        speechResult: reply,
        from: "+16155550111",
      })!;
    }
    const analysis = analyze(session);
    const ask = selectNextAsk(session, analysis)!;
    assert.equal(ask.field, "pain.swelling");
    const articulated = await articulateNextAsk({
      session,
      analysis,
      nextAsk: ask,
      planOptions: {
        planFn: async () => proposalForField("pain.swelling"),
      },
    });
    assert.match(articulated.question, /swelling/i);
    assert.doesNotMatch(
      articulated.question,
      /upper or lower|left or right|which tooth|front or back/i
    );
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
});
