/**
 * Phase 7 — replay harness, progressive judgment, latency, golden call.
 */

import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendAlyAsk,
  applyInterruptToSession,
  articulateClosing,
  buildConversationOptions,
  buildPlannerSystemPrompt,
  composeClosing,
  composePainFactSummary,
  createCallTraceSession,
  executeLiveTurn,
  EXPECTED_LATENCY_MS,
  inferCallStage,
  isCallActionable,
  proposalChoosing,
  PROGRESS_SCHEDULING_BRIDGE,
  PROGRESS_URGENCY_CLARIFIED,
  resetCallSessionsForTests,
  setArticulatePlanOptions,
  validatePlannerProposal,
  analyzeTranscriptTurns,
  sessionToTranscript,
} from "./index.ts";
import {
  GOLDEN_ROUTINE_PAIN_CALL_SID,
  GOLDEN_ROUTINE_PAIN_FROM,
  GOLDEN_ROUTINE_PAIN_OPENING,
  GOLDEN_ROUTINE_PAIN_TURNS,
} from "./fixtures/routinePainGolden.ts";
import type { PlannerContext } from "./conversationalPlanner.ts";
import type { ConversationalAction } from "./allowedActions.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function goldenPlanFn(ctx: PlannerContext) {
  const allowed = ctx.options.allowedActions;
  const pick = (action: ConversationalAction, spoken: string) => {
    assert.ok(allowed.includes(action), `${action} must be allowed`);
    return proposalChoosing(action, spoken, {
      understanding: "fixture",
      emotionalResponseNeeded: true,
      whyThisAction: `golden:${action}`,
    });
  };

  if (
    allowed.includes("ask_last_name_spelling") &&
    ctx.callStage === "understand"
  ) {
    return pick(
      "ask_last_name_spelling",
      "I'm sorry that kept you up — I understand why you're worried. I only need a few important details so the team knows how to help. Could you spell your last name for me?"
    );
  }
  if (allowed.includes("confirm_last_name_spelling")) {
    return pick(
      "confirm_last_name_spelling",
      "B-U-U-R-M-A, Buurma. Did I get that right?"
    );
  }
  if (allowed.includes("ask_swelling")) {
    return pick(
      "ask_swelling",
      "Have you noticed any swelling on your face or gums?"
    );
  }
  if (allowed.includes("ask_combined_scheduling_preference")) {
    return pick(
      "ask_combined_scheduling_preference",
      `${PROGRESS_URGENCY_CLARIFIED} ${PROGRESS_SCHEDULING_BRIDGE} Are you looking for the earliest available appointment, and would you be able to come in on short notice?`
    );
  }
  if (allowed.includes("persist_and_close") && ctx.options.actionable) {
    return pick("persist_and_close", "");
  }
  throw new Error(`no action match: ${allowed.join(",")}`);
}

describe("call replay + progressive judgment", () => {
  beforeEach(() => {
    resetCallSessionsForTests();
    setArticulatePlanOptions(null);
    delete process.env.OPENAI_API_KEY;
    delete process.env.HYBRID_CONVERSATIONAL_ALY;
    delete process.env.HYBRID_ALY_CLOSE_PLANNER;
    process.env.PHONE_CALL_TRACE = "1";
  });

  afterEach(() => {
    setArticulatePlanOptions(null);
    resetCallSessionsForTests();
    delete process.env.PHONE_CALL_TRACE;
  });

  test("replay uses executeLiveTurn → planNextTurn (same as ConversationRelay)", async () => {
    const relaySrc = fs.readFileSync(
      path.join(__dirname, "../../server/conversation-relay.js"),
      "utf8"
    );
    assert.match(relaySrc, /executeLiveTurn/);
    assert.match(relaySrc, /planNextTurn/);

    const result = await executeLiveTurn({
      callSid: "CA_same_path",
      speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.ok(result.decision);
    assert.equal(result.decision!.selectedAction, "ask_last_name_spelling");
    assert.ok(result.latency.firstSpeechTokenReadyMs >= 0);
  });

  test("already-known facts are not re-asked", async () => {
    const result = await executeLiveTurn({
      callSid: "CA_known",
      speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.ok(result.options);
    assert.equal(result.options!.factsCaptured.locationComplete, true);
    assert.ok(
      !result.options!.allowedActions.includes("ask_combined_tooth_location")
    );
    assert.ok(!result.options!.missingMaterialFacts.includes("tooth_location"));
  });

  test("planner can decide another clinical question is unnecessary", async () => {
    let session = (
      await executeLiveTurn({
        callSid: "CA_no_extra",
        speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
        from: GOLDEN_ROUTINE_PAIN_FROM,
        planOptions: { planFn: goldenPlanFn },
      })
    ).session!;
    appendAlyAsk(session, {
      field: "caller.last_name_spell",
      question: "Spell?",
    });

    session = (
      await executeLiveTurn({
        callSid: "CA_no_extra",
        speechResult: "Yeah, it's B-U-U-R-M-A.",
        from: GOLDEN_ROUTINE_PAIN_FROM,
        planOptions: { planFn: goldenPlanFn },
      })
    ).session!;
    appendAlyAsk(session, {
      field: "caller.last_name_confirm",
      question: "Confirm?",
    });

    session = (
      await executeLiveTurn({
        callSid: "CA_no_extra",
        speechResult: "Yes.",
        from: GOLDEN_ROUTINE_PAIN_FROM,
        planOptions: { planFn: goldenPlanFn },
      })
    ).session!;
    const opts = buildConversationOptions(
      session,
      analyzeTranscriptTurns(sessionToTranscript(session).turns, session.afterHours)
    );
    assert.ok(!opts.allowedActions.includes("ask_fever"));
    assert.ok(!opts.allowedActions.includes("ask_breathing"));
    assert.ok(!opts.allowedActions.includes("ask_combined_tooth_location"));
  });

  test("golden call: four purposeful questions, stages, recap, no truly", async () => {
    const trace = createCallTraceSession(GOLDEN_ROUTINE_PAIN_CALL_SID);
    const asks: string[] = [];
    const stages: string[] = [];
    let totalMs = 0;
    let lastSession = null as Awaited<
      ReturnType<typeof executeLiveTurn>
    >["session"];
    let lastAnalysis = null as Awaited<
      ReturnType<typeof executeLiveTurn>
    >["analysis"];

    for (let i = 0; i < GOLDEN_ROUTINE_PAIN_TURNS.length; i += 1) {
      const step = GOLDEN_ROUTINE_PAIN_TURNS[i];
      const result = await executeLiveTurn({
        callSid: GOLDEN_ROUTINE_PAIN_CALL_SID,
        speechResult: step.utterance,
        from: GOLDEN_ROUTINE_PAIN_FROM,
        planOptions: { planFn: goldenPlanFn },
        traceSession: trace,
        turnNumber: i + 1,
      });
      assert.ok(result.decision);
      assert.equal(result.decision!.selectedAction, step.expectedAction);
      assert.ok(result.trace);
      assert.ok(typeof result.latency.factExtractionCompleteMs === "number");
      assert.ok(typeof result.latency.firstSpeechTokenReadyMs === "number");
      totalMs += result.latency.firstSpeechTokenReadyMs;
      stages.push(result.callStage || "");
      lastSession = result.session;
      lastAnalysis = result.analysis;

      const spoken =
        result.decision!.nextAsk?.question ||
        result.decision!.proposal?.spokenResponse ||
        "";
      assert.doesNotMatch(spoken, /\btruly\b/i);
      for (const re of step.expectSpokenMatch || []) {
        assert.match(spoken, re);
      }
      for (const re of step.forbidSpokenMatch || []) {
        assert.doesNotMatch(spoken, re);
      }

      if (result.decision!.kind === "ask" && result.decision!.nextAsk) {
        asks.push(result.decision!.selectedAction);
        appendAlyAsk(result.session!, result.decision!.nextAsk);
      }
    }

    assert.equal(asks.length, 4);
    assert.deepEqual(asks, [
      "ask_last_name_spelling",
      "confirm_last_name_spelling",
      "ask_swelling",
      "ask_combined_scheduling_preference",
    ]);
    assert.ok(stages.includes("understand"));
    assert.ok(stages.includes("clarify"));
    assert.ok(stages.includes("resolve") || stages.at(-1) === "resolve");

    assert.ok(lastSession && lastAnalysis);
    assert.equal(isCallActionable(lastSession!, lastAnalysis!), true);

    const recap = composePainFactSummary({
      callerName: lastSession!.slots.name,
      locationParts: lastSession!.slots.locationParts,
      locationRaw: lastSession!.slots.location,
      swelling: lastSession!.slots.swelling,
      keptAwake: lastSession!.slots.keptAwake,
      worried: lastSession!.tone === "worried_anxious",
      wantsEarliest: lastSession!.slots.wantsEarliest,
      shortNoticeOk: lastSession!.slots.shortNoticeOk,
    });
    assert.match(recap, /lower|back/i);
    assert.match(recap, /awake/i);
    assert.match(recap, /worried/i);
    assert.match(recap, /swelling/i);
    assert.match(recap, /earliest/i);
    assert.match(recap, /short notice/i);
    assert.doesNotMatch(recap, /\btruly\b/i);

    const progressTurn = trace.turns.find(
      (t) => t.plannerSelectedAction === "ask_combined_scheduling_preference"
    );
    assert.ok(progressTurn);
    assert.match(
      String(progressTurn!.plannerSpokenResponse || ""),
      /scheduling detail|flexible|urgently/i
    );

    assert.ok(totalMs < 5000, `simulated decision latency ${totalMs}ms`);
    assert.equal(trace.turns.length, GOLDEN_ROUTINE_PAIN_TURNS.length);
  });

  test("cannot close before persistence; emergency cannot be overridden", async () => {
    const draft = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: false,
      persisted: false,
      tone: "pain_discomfort",
    });
    const session = (
      await executeLiveTurn({
        callSid: "CA_persist_gate",
        speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
        from: GOLDEN_ROUTINE_PAIN_FROM,
        planOptions: { planFn: goldenPlanFn },
      })
    ).session!;
    const analysis = analyzeTranscriptTurns(
      sessionToTranscript(session).turns,
      session.afterHours
    );
    const closing = await articulateClosing({
      session,
      analysis,
      deterministicClosing: draft,
      persisted: false,
      lifeThreatening: false,
      planOptions: {
        planFn: async () =>
          proposalChoosing(
            "acknowledge_and_recap",
            "I've saved your details for the team."
          ),
      },
    });
    assert.equal(closing, draft);

    const er = await executeLiveTurn({
      callSid: "CA_er2",
      speechResult: "I can't breathe and my face is swelling badly",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: {
        planFn: async () =>
          proposalChoosing("ask_swelling", "Any swelling?"),
      },
    });
    assert.equal(er.decision!.selectedAction, "emergency_escalation");
    assert.equal(er.decision!.kind, "complete");
  });

  test("planner failure uses safe fallback; truly rejected by guardrails", async () => {
    const turn = await executeLiveTurn({
      callSid: "CA_fail3",
      speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: {
        planFn: async () => {
          throw new Error("planner_error");
        },
      },
    });
    assert.equal(turn.decision!.source, "fallback");
    assert.equal(turn.decision!.fallbackReason, "planner_error");
    assert.equal(turn.decision!.selectedAction, "ask_last_name_spelling");
    assert.doesNotMatch(turn.decision!.nextAsk!.question, /\btruly\b/i);

    const opts = turn.decision!.options;
    const bad = validatePlannerProposal(
      proposalChoosing(
        "ask_last_name_spelling",
        "I truly understand. Could you spell your last name?"
      ),
      opts
    );
    assert.equal(bad.ok, false);
    assert.equal(bad.reason, "forbidden_truly");
  });

  test("planner schema requires conversational judgment fields", () => {
    const prompt = buildPlannerSystemPrompt();
    assert.match(prompt, /What did the patient just communicate/);
    assert.match(prompt, /emotion/i);
    assert.match(prompt, /materially missing/i);
    assert.match(prompt, /Never say the word truly/);
    assert.match(prompt, /understand/);
    assert.match(prompt, /clarify/);
    assert.match(prompt, /resolve/);
  });

  test("expected latency contributions are documented", () => {
    assert.ok(EXPECTED_LATENCY_MS.factExtraction.maxHealthy <= 40);
    assert.ok(EXPECTED_LATENCY_MS.plannerOpenAi.maxHealthy <= 1800);
    assert.equal(EXPECTED_LATENCY_MS.closingPlanner.typical, 0);
    assert.ok(EXPECTED_LATENCY_MS.totalDecisionHealthy.maxHealthy <= 2000);
  });

  test("Amber King and ConversationRelay voice defaults stay unchanged", async () => {
    const relay = await import("../../server/conversation-relay.js");
    assert.equal(relay.DEFAULT_VOICE_ID, "F89WkXaQbUlVyNvtlD3X");
    assert.equal(relay.DEFAULT_VOICE_NAME, "Amber King");
    assert.equal(
      relay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2_5-0.97_0.40_0.88"
    );
    assert.equal(relay.useConversationRelay.toString().includes("conversation_relay"), true);
  });

  test("stage transitions understand → clarify → resolve", async () => {
    const r1 = await executeLiveTurn({
      callSid: "CA_stages",
      speechResult: GOLDEN_ROUTINE_PAIN_OPENING,
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.equal(r1.callStage, "understand");
    appendAlyAsk(r1.session!, r1.decision!.nextAsk!);

    const r2 = await executeLiveTurn({
      callSid: "CA_stages",
      speechResult: "Yeah, it's B-U-U-R-M-A.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    appendAlyAsk(r2.session!, r2.decision!.nextAsk!);

    const r3 = await executeLiveTurn({
      callSid: "CA_stages",
      speechResult: "Yes.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.equal(r3.callStage, "clarify");
    appendAlyAsk(r3.session!, r3.decision!.nextAsk!);

    const r4 = await executeLiveTurn({
      callSid: "CA_stages",
      speechResult: "No.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.equal(r4.callStage, "clarify");
    appendAlyAsk(r4.session!, r4.decision!.nextAsk!);

    const r5 = await executeLiveTurn({
      callSid: "CA_stages",
      speechResult: "Yes, as soon as possible, and I can come in on short notice.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
    });
    assert.equal(r5.callStage, "resolve");
    assert.equal(
      inferCallStage(r5.session!, r5.decision!.options),
      "resolve"
    );
  });

  test("natural interruption replay: bottom-right corrected to bottom-left", async () => {
    const sid = "CA_interrupt_replay";
    const r1 = await executeLiveTurn({
      callSid: sid,
      speechResult:
        "I've had pain in the bottom-right back area, and it kept me awake. I'm William Buurma.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    assert.ok(r1.session);
    assert.equal(r1.session!.slots.locationParts?.side, "right");
    appendAlyAsk(r1.session!, {
      field: "pain.swelling",
      question:
        "That sounds like a difficult night. I understand why— Have you noticed any swelling?",
    });
    applyInterruptToSession(
      r1.session!,
      "That sounds like a difficult night"
    );
    assert.equal(r1.session!.lastResponseInterrupted, true);

    const r2 = await executeLiveTurn({
      callSid: sid,
      speechResult: "Actually, wait—it's the bottom left.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: goldenPlanFn },
      semanticOptions: { forceHeuristic: true },
      afterInterrupt: true,
    });
    assert.equal(r2.session!.slots.locationParts?.side, "left");
    assert.equal(r2.session!.slots.locationParts?.vertical, "lower");
    assert.ok(r2.semantic?.intent === "correction" || r2.semantic?.corrections?.length);
    assert.ok(r2.decision?.nextAsk?.question);
    assert.match(r2.decision!.nextAsk!.question, /Thanks for correcting me/i);
    assert.match(r2.decision!.nextAsk!.question, /lower-left/i);
    assert.doesNotMatch(
      r2.decision!.nextAsk!.question,
      /I understand why—/
    );
    assert.doesNotMatch(
      r2.decision!.nextAsk!.question,
      /left or right|which side|upper or lower/i
    );
    assert.notEqual(r2.decision!.selectedAction, "ask_combined_tooth_location");
  });
});
