/**
 * Replay the sanitized golden routine-pain call through the same decision path
 * as ConversationRelay (executeLiveTurn → planNextTurn). Development only.
 *
 * Usage:
 *   npm run replay:routine-pain
 *   node --experimental-strip-types scripts/replay-routine-pain-call.js
 */

import {
  appendAlyAsk,
  buildConversationOptions,
  composeClosing,
  composePainFactSummary,
  createCallTraceSession,
  executeLiveTurn,
  EXPECTED_LATENCY_MS,
  inferCallStage,
  isCallActionable,
  proposalChoosing,
  resetCallSessionsForTests,
  setArticulatePlanOptions,
} from "../src/telephony/index.ts";
import {
  GOLDEN_ROUTINE_PAIN_CALL_SID,
  GOLDEN_ROUTINE_PAIN_FROM,
  GOLDEN_ROUTINE_PAIN_TURNS,
  ROUTINE_PAIN_MINIMUM_OUTCOME,
} from "../src/telephony/fixtures/routinePainGolden.ts";

/** @param {import("../src/telephony/conversationalPlanner.ts").PlannerContext} ctx */
function goldenPlanFn(ctx) {
  const allowed = ctx.options.allowedActions;
  /**
   * @param {import("../src/telephony/allowedActions.ts").ConversationalAction} action
   * @param {string} spoken
   */
  const pick = (action, spoken) => {
    if (!allowed.includes(action)) {
      throw new Error(
        `golden planFn: ${action} not in allow-list [${allowed.join(",")}]`
      );
    }
    return proposalChoosing(action, spoken, {
      understanding: ctx.latestUtterance.slice(0, 80),
      emotionalResponseNeeded: /worried|pain|awake/i.test(ctx.latestUtterance),
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
    const letters = String(ctx.options.lastNameSpellingHint || "BUURMA")
      .toUpperCase()
      .split("")
      .join("-");
    return pick(
      "confirm_last_name_spelling",
      `${letters}, Buurma. Did I get that right?`
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
      "Thank you—that helps clarify how urgently the team should look at this. I just need one scheduling detail so the team knows how flexible you are. Are you looking for the earliest available appointment, and would you be able to come in on short notice?"
    );
  }
  if (allowed.includes("persist_and_close") && ctx.options.actionable) {
    return pick("persist_and_close", "");
  }
  throw new Error(`golden planFn: no matching action in [${allowed.join(",")}]`);
}

async function main() {
  process.env.PHONE_CALL_TRACE = process.env.PHONE_CALL_TRACE || "1";
  resetCallSessionsForTests();
  setArticulatePlanOptions({ planFn: goldenPlanFn });

  const trace = createCallTraceSession(GOLDEN_ROUTINE_PAIN_CALL_SID);
  /** @type {string[]} */
  const askActions = [];
  /** @type {string[]} */
  const stages = [];
  let lastSession = /** @type {any} */ (null);
  let lastAnalysis = /** @type {any} */ (null);
  let totalDecisionMs = 0;

  console.log("=== FreedomDesk routine-pain golden replay ===");
  console.log(`Minimum outcome: ${ROUTINE_PAIN_MINIMUM_OUTCOME.join(", ")}`);
  console.log(
    `Expected healthy decision latency ≤ ${EXPECTED_LATENCY_MS.totalDecisionHealthy.maxHealthy}ms (planner ≤ ${EXPECTED_LATENCY_MS.plannerOpenAi.maxHealthy}ms)`
  );
  console.log("");

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

    if (!result.session || !result.decision) {
      console.error(`Turn ${i + 1}: empty session/decision`);
      process.exitCode = 1;
      return;
    }

    lastSession = result.session;
    lastAnalysis = result.analysis;
    totalDecisionMs += result.latency.firstSpeechTokenReadyMs;
    stages.push(result.callStage || "?");

    const spoken =
      result.decision.nextAsk?.question ||
      result.decision.proposal?.spokenResponse ||
      "";
    const action = result.decision.selectedAction;

    if (result.decision.kind === "ask" && result.decision.nextAsk) {
      askActions.push(action);
      appendAlyAsk(result.session, result.decision.nextAsk);
    }

    const ok = action === step.expectedAction;
    console.log(
      `Turn ${i + 1} [${result.callStage}] action=${action} ${ok ? "OK" : "FAIL expected " + step.expectedAction}`
    );
    console.log(
      `  latency: extract=${result.latency.factExtractionCompleteMs}ms planner=${result.decision.plannerLatencyMs ?? 0}ms total=${result.latency.firstSpeechTokenReadyMs}ms`
    );
    if (spoken) console.log(`  spoken: ${spoken}`);
    if (!ok) process.exitCode = 1;

    for (const re of step.expectSpokenMatch || []) {
      if (!re.test(spoken)) {
        console.error(`  missing spoken match: ${re}`);
        process.exitCode = 1;
      }
    }
    for (const re of step.forbidSpokenMatch || []) {
      if (re.test(spoken)) {
        console.error(`  forbidden spoken match: ${re}`);
        process.exitCode = 1;
      }
    }
    console.log("");
  }

  if (lastSession && lastAnalysis) {
    const actionable = isCallActionable(lastSession, lastAnalysis);
    const opts = buildConversationOptions(lastSession, lastAnalysis);
    const stage = inferCallStage(lastSession, opts);
    const recap = composePainFactSummary({
      callerName: lastSession.slots.name,
      locationParts: lastSession.slots.locationParts,
      locationRaw: lastSession.slots.location,
      swelling: lastSession.slots.swelling,
      keptAwake: lastSession.slots.keptAwake,
      worried: lastSession.tone === "worried_anxious",
      wantsEarliest: lastSession.slots.wantsEarliest,
      shortNoticeOk: lastSession.slots.shortNoticeOk,
    });
    const closing = composeClosing({
      intent: lastAnalysis.understanding.intent,
      urgency: lastAnalysis.triage.urgency,
      afterHours: lastSession.afterHours,
      tone: lastSession.tone,
      callerName: lastSession.slots.name,
      locationParts: lastSession.slots.locationParts,
      locationRaw: lastSession.slots.location,
      swelling: lastSession.slots.swelling,
      keptAwake: lastSession.slots.keptAwake,
      wantsEarliest: lastSession.slots.wantsEarliest,
      shortNoticeOk: lastSession.slots.shortNoticeOk,
      persisted: true,
    });

    console.log("=== Outcome ===");
    console.log(`actionable=${actionable} finalStage=${stage}`);
    console.log(
      `purposefulQuestions=${askActions.length} [${askActions.join(" → ")}]`
    );
    console.log(`stages=${stages.join(" → ")}`);
    console.log(`totalSimulatedDecisionMs=${totalDecisionMs}`);
    console.log(`recap: ${recap}`);
    console.log(`closing: ${closing}`);
    console.log(`traceTurns=${trace.turns.length}`);

    if (askActions.length !== 4) {
      console.error(
        `Expected 4 purposeful questions after opening, got ${askActions.length}`
      );
      process.exitCode = 1;
    }
    if (!actionable) {
      console.error("Call not actionable at end");
      process.exitCode = 1;
    }
    if (/\btruly\b/i.test(closing) || /\btruly\b/i.test(recap)) {
      console.error('Forbidden word "truly" in closing/recap');
      process.exitCode = 1;
    }
  }

  setArticulatePlanOptions(null);
  resetCallSessionsForTests();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
