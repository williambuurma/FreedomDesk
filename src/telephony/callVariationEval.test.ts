/**
 * Strict variation evaluation — fails on conversational defects visible in traces.
 * Reports separate metric rates; does not hide failures behind an aggregate ≥90%.
 */

import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";

import {
  appendAlyAsk,
  executeLiveTurn,
  isCallActionable,
  interpretSemanticTurnHeuristic,
  mergeSemanticInterpretation,
  proposalChoosing,
  resetCallSessionsForTests,
  setArticulatePlanOptions,
  analyzeTranscriptTurns,
  sessionToTranscript,
  buildConversationOptions,
  LOOP_RECOVERY_SPEECH,
  SPELLING_ABANDON_ANNOUNCE,
  resolvePlannerModel,
  resolveSemanticModel,
  normalizeSpokenSpelling,
} from "./index.ts";
import {
  ORDINARY_TURN_BUDGET,
  ROUTINE_PAIN_VARIATIONS,
  type VariationScenario,
} from "./fixtures/routinePainVariations.ts";
import { GOLDEN_ROUTINE_PAIN_FROM } from "./fixtures/routinePainGolden.ts";
import type { PlannerContext } from "./conversationalPlanner.ts";
import type { ConversationalAction } from "./allowedActions.ts";
import { ensureLiveCallSession } from "./callSession.ts";
import { SEMANTIC_TURN_JSON_SCHEMA } from "./semanticTurnTypes.ts";
import { hasLifeThreateningLanguage } from "./callSession.ts";
import {
  actionFactSnapshot,
  isNonSafetyAction,
} from "./conversationLoopDetector.ts";

export interface StrictScorecard {
  id: string;
  passed: boolean;
  safetyOk: boolean;
  intentOk: boolean;
  noRepetitionOk: boolean;
  factRetentionOk: boolean;
  metaQuestionOk: boolean;
  completionIntegrityOk: boolean;
  trapped: boolean;
  questionCount: number;
  failures: string[];
  askedActions: string[];
  phoneIntents: string[];
}

/** Behavior planner — picks from allow-list priority; not golden-scripted. */
function behaviorPlanFn(ctx: PlannerContext) {
  const allowed = ctx.options.allowedActions;
  const pick = (action: ConversationalAction) => {
    assert.ok(allowed.includes(action), `${action} must be allowed`);
    const spoken =
      action === "persist_and_close" || action === "emergency_escalation"
        ? ""
        : action === "answer_process_question"
          ? (ctx.semanticFacts as { signals?: { callerAsksIfHasAppointment?: boolean } } | null)
              ?.signals?.callerAsksIfHasAppointment
            ? "Not yet. I'm recording your request so the team can review availability and follow up."
            : "I'm collecting the few details the team needs to understand your concern and contact you about the next available option. I just have one more question."
          : action === "ask_combined_tooth_location" &&
              (ctx.semanticFacts as { uncertainty?: string[] } | null)?.uncertainty?.includes(
                "tooth_location"
              )
            ? "That's okay. You don't need to know the exact tooth. Can you tell me whether it feels more upper or lower?"
            : `Following up: ${action.replace(/_/g, " ")}?`;
    return proposalChoosing(action, spoken, {
      understanding: "behavior_plan",
      emotionalResponseNeeded: (ctx.emotionalCues || []).length > 0,
      whyThisAction: `behavior:${action}`,
    });
  };

  if (allowed.includes("emergency_escalation")) {
    return pick("emergency_escalation");
  }
  if (ctx.options.hardRequiredAction && allowed.includes(ctx.options.hardRequiredAction)) {
    return pick(ctx.options.hardRequiredAction);
  }
  if (allowed.includes("answer_process_question")) {
    return pick("answer_process_question");
  }
  if (allowed.includes("persist_and_close") && ctx.options.actionable) {
    return pick("persist_and_close");
  }

  const priority: ConversationalAction[] = [
    "ask_breathing",
    "ask_name",
    "ask_last_name_spelling",
    "confirm_last_name_spelling",
    "ask_combined_tooth_location",
    "ask_swelling",
    "ask_fever",
    "ask_combined_scheduling_preference",
    "ask_reason_for_calling",
    "ask_callback_phone",
    "acknowledge_and_recap",
  ];
  for (const a of priority) {
    if (allowed.includes(a)) return pick(a);
  }
  if (allowed[0]) return pick(allowed[0]);
  throw new Error(`no allowed actions: ${allowed.join(",")}`);
}

function actionGoalAlreadyMet(
  session: NonNullable<Awaited<ReturnType<typeof executeLiveTurn>>["session"]>,
  action: string
): boolean {
  const s = session.slots;
  switch (action) {
    case "ask_name":
      return Boolean(s.nameCaptured);
    case "ask_last_name_spelling":
      return Boolean(s.lastNameSpellingCaptured || s.spellingAbandoned);
    case "confirm_last_name_spelling":
      return Boolean(s.lastNameConfirmed || s.spellingAbandoned);
    case "ask_combined_tooth_location":
      return Boolean(
        s.locationParts?.vertical && s.locationParts?.side && s.locationParts?.depth
      );
    case "ask_swelling":
      return typeof s.swelling === "boolean";
    case "ask_fever":
      return typeof s.fever === "boolean";
    case "ask_combined_scheduling_preference":
      return (
        typeof s.wantsEarliest === "boolean" &&
        (s.wantsEarliest === false || typeof s.shortNoticeOk === "boolean")
      );
    case "ask_reason_for_calling":
      return Boolean(s.reasonCaptured);
    case "ask_callback_phone":
      return Boolean(session.from);
    default:
      return false;
  }
}

function factCaptured(
  session: NonNullable<Awaited<ReturnType<typeof executeLiveTurn>>["session"]>,
  key: string
): boolean {
  const s = session.slots;
  switch (key) {
    case "name":
      return Boolean(s.nameCaptured || s.name);
    case "spelling":
      return Boolean(s.lastNameSpellingCaptured || s.spellingAbandoned);
    case "location":
      return Boolean(
        s.locationParts?.vertical && s.locationParts?.side && s.locationParts?.depth
      );
    case "swelling":
      return typeof s.swelling === "boolean";
    case "scheduling":
      return (
        typeof s.wantsEarliest === "boolean" &&
        (s.wantsEarliest === false || typeof s.shortNoticeOk === "boolean")
      );
    case "keptAwake":
      return s.keptAwake === true;
    default:
      return false;
  }
}

function utteranceHasLifeThreat(text: string): boolean {
  return hasLifeThreateningLanguage(text);
}

async function runVariationStrict(
  scenario: VariationScenario
): Promise<StrictScorecard> {
  const callSid = `CA_var_${scenario.id}`;
  const askedActions: string[] = [];
  const actionCounts = new Map<string, number>();
  const failures: string[] = [];
  const phoneIntents: string[] = [];
  let questionCount = 0;
  let lastSession: Awaited<ReturnType<typeof executeLiveTurn>>["session"] = null;
  let lastDecision: Awaited<ReturnType<typeof executeLiveTurn>>["decision"] = null;
  let lastSpoken = "";
  let prevAction: string | null = null;
  let prevActionFailed = false;
  /** Snapshot of each action's target facts at the last time it was asked. */
  const lastAskSnapshot = new Map<string, string>();
  /** Actions re-asked after their target facts already changed (legitimate) vs not. */
  const trappedActions = new Set<string>();
  let metaRequired = false;
  let metaAnswered = false;
  let fabricatedSpelling = false;
  let reasonReaskWithPain = false;
  let nameAskedAfterIdentity = false;
  let spellingWithoutName = false;

  for (let i = 0; i < scenario.turns.length; i += 1) {
    const turn = scenario.turns[i];
    if (
      /what (will happen|happens?) next|do i (already )?have an appointment/i.test(
        turn.utterance
      )
    ) {
      metaRequired = true;
    }

    const result = await executeLiveTurn({
      callSid,
      speechResult: turn.utterance,
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
      turnNumber: i + 1,
    });
    assert.ok(result.decision);
    lastSession = result.session;
    lastDecision = result.decision;

    const phoneIntent = String(result.trace?.latestIntentCategory || "");
    if (phoneIntent) phoneIntents.push(phoneIntent);

    // Intent: routine pain must never be life_threatening_emergency without red flags.
    const lifeThreatInCall = utteranceHasLifeThreat(
      (lastSession?.turns || [])
        .filter((t) => t.speaker === "patient" || t.speaker === "caller")
        .map((t) => t.text)
        .join(" ")
    );
    if (
      phoneIntent === "life_threatening_emergency" &&
      !lifeThreatInCall &&
      !scenario.expect.emergencyEscalation
    ) {
      failures.push("routine_mislabeled_life_threatening");
    }
    // Also reject raw upstream EMERGENCY exposure in traces.
    if (
      phoneIntent === "EMERGENCY" &&
      !scenario.expect.emergencyEscalation &&
      !lifeThreatInCall
    ) {
      failures.push("raw_emergency_intent_exposed");
    }

    // Fabricated spelling from unusable language.
    if (
      /^(huh|what)\??$/i.test(turn.utterance.trim()) &&
      lastSession?.slots.lastNameSpellingCaptured &&
      /HUH|WHAT|HMM/i.test(String(lastSession.slots.lastNameSpelling || ""))
    ) {
      fabricatedSpelling = true;
      failures.push("fabricated_spelling");
    }
    if (
      lastSession &&
      lastSession.slots.lastNameSpellingCaptured &&
      !lastSession.slots.nameCaptured &&
      !lastSession.slots.name
    ) {
      spellingWithoutName = true;
      failures.push("spelling_without_name");
    }

    // Confirmed / known fact still allowed.
    if (result.options) {
      if (
        result.options.factsConfirmed.lastName &&
        result.options.allowedActions.includes("ask_last_name_spelling")
      ) {
        failures.push("reask_confirmed_spelling");
      }
      if (
        result.options.factsCaptured.locationComplete &&
        result.options.allowedActions.includes("ask_combined_tooth_location")
      ) {
        failures.push("reask_known_location");
      }
      if (
        result.options.factsCaptured.swellingKnown &&
        result.options.allowedActions.includes("ask_swelling")
      ) {
        failures.push("reask_known_swelling");
      }
      if (
        typeof result.options.factsCaptured.wantsEarliest === "boolean" &&
        (result.options.factsCaptured.wantsEarliest === false ||
          typeof result.options.factsCaptured.shortNoticeOk === "boolean") &&
        result.options.allowedActions.includes(
          "ask_combined_scheduling_preference"
        )
      ) {
        failures.push("scheduling_still_allowed_after_answer");
      }
    }

    // Reason re-ask when pain/location already known.
    if (
      result.decision!.selectedAction === "ask_reason_for_calling" &&
      lastSession &&
      (factCaptured(lastSession, "location") ||
        /tooth|pain|hurt/i.test(
          lastSession.turns.map((t) => t.text).join(" ")
        ))
    ) {
      reasonReaskWithPain = true;
      failures.push("reason_reask_with_pain_known");
    }

    if (
      result.decision!.selectedAction === "ask_name" &&
      lastSession?.slots.nameCaptured
    ) {
      nameAskedAfterIdentity = true;
      failures.push("ask_name_after_identity");
    }

    const spoken =
      result.decision!.nextAsk?.question ||
      result.decision!.proposal?.spokenResponse ||
      "";
    lastSpoken = spoken;

    if (result.decision!.selectedAction === "answer_process_question") {
      metaAnswered = true;
      if (
        !/collecting|recording|not yet|team|follow up|details/i.test(spoken)
      ) {
        failures.push("meta_response_not_truthful");
      }
    }

    // Repetition: second identical non-safety action without target-fact change.
    // Re-confirm after a spelling correction (letters changed) is allowed.
    if (result.decision!.kind === "ask" && result.decision!.nextAsk) {
      const action = result.decision!.selectedAction;
      const snap = lastSession
        ? actionFactSnapshot(lastSession, action as ConversationalAction)
        : "";
      const priorSnap = lastAskSnapshot.get(action);
      const priorCount = actionCounts.get(action) || 0;

      if (
        priorCount >= 1 &&
        isNonSafetyAction(action) &&
        action !== "answer_process_question"
      ) {
        const goalMet =
          lastSession != null && actionGoalAlreadyMet(lastSession, action);
        // Second+ selection: fail when target facts did not change, OR when
        // the action's goal was already satisfied before this re-ask.
        if (goalMet || (priorSnap !== undefined && priorSnap === snap)) {
          trappedActions.add(action);
          failures.push(`repeated_action_without_state_change:${action}`);
          failures.push(`repeated_non_safety_action:${action}`);
        } else if (
          prevAction === action &&
          prevActionFailed &&
          priorSnap === snap
        ) {
          trappedActions.add(action);
          failures.push(`repeated_action_without_state_change:${action}`);
        }
      }

      questionCount += 1;
      askedActions.push(action);
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      lastAskSnapshot.set(action, snap);
      prevAction = action;
      appendAlyAsk(result.session!, result.decision!.nextAsk);
    }

    // Mark whether the just-answered prior ask failed (target facts unchanged).
    if (prevAction && lastSession && lastAskSnapshot.has(prevAction)) {
      const nowSnap = actionFactSnapshot(
        lastSession,
        prevAction as ConversationalAction
      );
      const askedSnap = lastAskSnapshot.get(prevAction)!;
      prevActionFailed = nowSnap === askedSnap;
      // If the answer changed state, refresh the stored snapshot so a later
      // legitimate re-ask (e.g. confirm after correction) compares correctly.
      if (!prevActionFailed) {
        lastAskSnapshot.set(prevAction, nowSnap);
      }
    }

    if (result.decision!.selectedAction === "emergency_escalation") break;
    if (
      result.decision!.kind === "complete" &&
      result.decision!.selectedAction === "persist_and_close"
    ) {
      break;
    }
  }

  const trappedStrict = trappedActions.size > 0;
  if (trappedStrict) failures.push("trapped_in_loop");

  let factRetentionOk = true;
  for (const f of scenario.expect.captureFacts || []) {
    if (!lastSession || !factCaptured(lastSession, f)) {
      factRetentionOk = false;
      failures.push(`missing_fact:${f}`);
    }
  }

  const emergencyHit =
    lastDecision?.selectedAction === "emergency_escalation";
  if (scenario.expect.emergencyEscalation && !emergencyHit) {
    failures.push("expected_emergency_escalation");
  }
  if (!scenario.expect.emergencyEscalation && emergencyHit) {
    // Only fail if no life-threat language in the call.
    const allText = (lastSession?.turns || [])
      .filter((t) => t.speaker === "patient" || t.speaker === "caller")
      .map((t) => t.text)
      .join(" ");
    if (!utteranceHasLifeThreat(allText)) {
      failures.push("false_emergency_escalation");
    }
  }

  // Meta-question handling
  let metaQuestionOk = true;
  if (metaRequired) {
    metaQuestionOk = metaAnswered || Boolean(lastSession?.metaQuestionAnswered);
    if (!metaQuestionOk) failures.push("meta_question_not_answered");
  }

  // Completion integrity for persist_and_close
  let completionIntegrityOk = true;
  if (lastDecision?.selectedAction === "persist_and_close" && lastSession) {
    const abandoned = lastSession.slots.spellingAbandoned === true;
    const confirmed = lastSession.slots.lastNameConfirmed === true;
    if (!confirmed && abandoned) {
      const flagged = (lastSession.slots.teamFlags || []).some((f) =>
        /spelling|last_name|name_needs/i.test(f)
      );
      const announced =
        lastSession.slots.spellingAbandonNeedsAnnounce === false &&
        (lastSpoken.includes("team to confirm") ||
          askedActions.length > 0); // announce consumed during articulate
      // Require team flag; spoken recovery may have been on an earlier turn.
      const hadAbandonSpeech = (lastSession.turns || []).some(
        (t) =>
          (t.speaker === "aly" || t.speaker === "agent") &&
          /team to confirm|may not have every letter/i.test(t.text)
      );
      if (!flagged) {
        completionIntegrityOk = false;
        failures.push("persist_without_spelling_team_flag");
      }
      if (!hadAbandonSpeech && !announced) {
        // Check LOOP_RECOVERY or SPELLING_ABANDON appeared in any aly turn
        const anyRecovery = (lastSession.turns || []).some(
          (t) =>
            (t.speaker === "aly" || t.speaker === "agent") &&
            (/team to confirm/i.test(t.text) ||
              /getting stuck/i.test(t.text) ||
              /noted that for the team/i.test(t.text))
        );
        if (!anyRecovery) {
          completionIntegrityOk = false;
          failures.push("persist_without_uncertainty_acknowledgment");
        }
      }
    }
    if (
      !isCallActionable(
        lastSession,
        analyzeTranscriptTurns(
          sessionToTranscript(lastSession).turns,
          lastSession.afterHours
        )
      ) &&
      !emergencyHit
    ) {
      completionIntegrityOk = false;
      failures.push("persist_without_actionable");
    }
  }

  const safetyOk =
    scenario.expect.emergencyEscalation
      ? emergencyHit
      : !failures.includes("false_emergency_escalation");

  const intentOk =
    !failures.includes("routine_mislabeled_life_threatening") &&
    !failures.includes("raw_emergency_intent_exposed");

  const noRepetitionOk =
    !trappedStrict &&
    !failures.some((f) => f.startsWith("repeated_non_safety_action:")) &&
    !failures.some((f) => f.startsWith("repeated_action_without_state_change:"));

  if (fabricatedSpelling) factRetentionOk = false;
  if (spellingWithoutName) factRetentionOk = false;
  if (reasonReaskWithPain) factRetentionOk = false;
  if (nameAskedAfterIdentity) noRepetitionOk = false;

  const uniqueFailures = [...new Set(failures)];

  const passed =
    safetyOk &&
    intentOk &&
    noRepetitionOk &&
    factRetentionOk &&
    metaQuestionOk &&
    completionIntegrityOk &&
    !trappedStrict &&
    (scenario.expect.emergencyEscalation ? emergencyHit : true);

  return {
    id: scenario.id,
    passed,
    safetyOk,
    intentOk,
    noRepetitionOk,
    factRetentionOk,
    metaQuestionOk,
    completionIntegrityOk,
    trapped: trappedStrict,
    questionCount,
    failures: uniqueFailures,
    askedActions,
    phoneIntents,
  };
}

describe("semantic turn interpreter", () => {
  test("schema is strict structured-output shaped", () => {
    assert.equal(SEMANTIC_TURN_JSON_SCHEMA.type, "object");
    assert.equal(SEMANTIC_TURN_JSON_SCHEMA.additionalProperties, false);
    assert.ok(SEMANTIC_TURN_JSON_SCHEMA.required.includes("facts"));
  });

  test("heuristic extracts multi-fact opening and spelling prefixes", () => {
    const multi = interpretSemanticTurnHeuristic({
      utterance:
        "I'm William Buurma, lower-right back tooth, no swelling, earliest and short notice.",
      previousAction: null,
      previousQuestion: null,
      structuredState: {
        nameCaptured: false,
        lastNameSpellingCaptured: false,
        lastNameConfirmed: false,
        locationComplete: false,
        swellingKnown: false,
        wantsEarliestKnown: false,
        shortNoticeKnown: false,
        locationHint: null,
      },
      recentTurns: [],
    });
    assert.equal(multi.facts.firstName, "William");
    assert.equal(multi.facts.toothLocation.upperLower, "lower");
    assert.equal(multi.facts.swelling, false);
  });

  test("ordinary words never become high-confidence spelling", () => {
    for (const u of ["Huh?", "What?", "maybe", "I already told you", "can we move on"]) {
      const r = normalizeSpokenSpelling(u);
      assert.ok(
        r.confidence === "none" || r.letters.length < 2 || r.confidence === "low",
        `${u} → ${r.letters}/${r.confidence}`
      );
      assert.notEqual(r.confidence, "high");
      assert.notEqual(r.confidence, "medium");
    }
  });

  test("corrections and refusals are detected", () => {
    const corr = interpretSemanticTurnHeuristic({
      utterance: "Actually, sorry—it's the left side.",
      previousAction: "ask_swelling",
      previousQuestion: "Any swelling?",
      structuredState: {
        nameCaptured: true,
        lastNameSpellingCaptured: true,
        lastNameConfirmed: true,
        locationComplete: true,
        swellingKnown: false,
        wantsEarliestKnown: false,
        shortNoticeKnown: false,
        locationHint: "lower-right back area",
      },
      recentTurns: [],
    });
    assert.ok(corr.corrections.some((c) => c.field === "toothLocation.leftRight"));
  });

  test("merge does not overwrite confirmed with lower confidence", () => {
    const session = ensureLiveCallSession({
      callSid: "CA_prov",
      from: GOLDEN_ROUTINE_PAIN_FROM,
    });
    session.slots.name = "William Buurma";
    session.slots.nameCaptured = true;
    session.slots.lastNameSpelling = "BUURMA";
    session.slots.lastNameSpellingCaptured = true;
    session.slots.lastNameConfirmed = true;
    session.factProvenance = {
      lastNameConfirmed: {
        value: true,
        confidence: 0.98,
        sourceTurn: 1,
        status: "confirmed",
      },
    };
    session.turns.push({ speaker: "patient", text: "maybe" });
    const sem = interpretSemanticTurnHeuristic({
      utterance: "maybe",
      previousAction: "confirm_last_name_spelling",
      previousQuestion: "Right?",
      structuredState: {
        nameCaptured: true,
        lastNameSpellingCaptured: true,
        lastNameConfirmed: true,
        locationComplete: false,
        swellingKnown: false,
        wantsEarliestKnown: false,
        shortNoticeKnown: false,
        locationHint: null,
      },
      recentTurns: [],
    });
    mergeSemanticInterpretation(session, sem, {
      previousAction: "ask_swelling",
    });
    assert.equal(session.slots.lastNameConfirmed, true);
  });
});

describe("routine-pain variation suite — strict gate", () => {
  beforeEach(() => {
    resetCallSessionsForTests();
    setArticulatePlanOptions(null);
    delete process.env.OPENAI_API_KEY;
    delete process.env.HYBRID_CONVERSATIONAL_ALY;
    process.env.PHONE_CALL_TRACE = "1";
  });

  afterEach(() => {
    setArticulatePlanOptions(null);
    resetCallSessionsForTests();
    delete process.env.PHONE_CALL_TRACE;
  });

  test("at least 25 sanitized variations are defined", () => {
    assert.ok(ROUTINE_PAIN_VARIATIONS.length >= 25);
  });

  test("planner and semantic models are independently configurable", () => {
    process.env.OPENAI_PLANNER_MODEL = "gpt-planner-test";
    process.env.OPENAI_SEMANTIC_MODEL = "gpt-semantic-test";
    assert.equal(resolvePlannerModel(), "gpt-planner-test");
    assert.equal(resolveSemanticModel(), "gpt-semantic-test");
    delete process.env.OPENAI_PLANNER_MODEL;
    delete process.env.OPENAI_SEMANTIC_MODEL;
  });

  test("strict suite reports separate metrics and fails conversational defects", async () => {
    const scorecards: StrictScorecard[] = [];
    for (const scenario of ROUTINE_PAIN_VARIATIONS) {
      resetCallSessionsForTests();
      scorecards.push(await runVariationStrict(scenario));
    }

    const n = scorecards.length;
    const rate = (pred: (c: StrictScorecard) => boolean) =>
      scorecards.filter(pred).length / n;

    const safetyRate = rate((c) => c.safetyOk);
    const intentRate = rate((c) => c.intentOk);
    const noRepRate = rate((c) => c.noRepetitionOk);
    const factRate = rate((c) => c.factRetentionOk);
    const metaRate = rate((c) => c.metaQuestionOk);
    const completionRate = rate((c) => c.completionIntegrityOk);
    const trappedCount = scorecards.filter((c) => c.trapped).length;
    const failedIds = scorecards.filter((c) => !c.passed).map((c) => c.id);

    console.log(
      JSON.stringify(
        {
          safetyPassRate: safetyRate,
          intentClassificationPassRate: intentRate,
          noRepetitionPassRate: noRepRate,
          factRetentionPassRate: factRate,
          metaQuestionHandlingPassRate: metaRate,
          completionIntegrityPassRate: completionRate,
          trappedScenarios: trappedCount,
          failedScenarioIds: failedIds,
          failureDetails: scorecards
            .filter((c) => !c.passed)
            .map((c) => ({ id: c.id, failures: c.failures, asked: c.askedActions })),
        },
        null,
        2
      )
    );

    assert.equal(safetyRate, 1, `safety failures: ${failedIds.join(",")}`);
    assert.equal(intentRate, 1, `intent failures`);
    assert.equal(trappedCount, 0, `trapped: ${scorecards.filter((c) => c.trapped).map((c) => c.id)}`);
    assert.equal(noRepRate, 1, `repetition failures: ${scorecards.filter((c) => !c.noRepetitionOk).map((c) => c.id)}`);
    assert.equal(factRate, 1, `fact failures: ${scorecards.filter((c) => !c.factRetentionOk).map((c) => c.id)}`);
    assert.equal(metaRate, 1, `meta failures`);
    assert.equal(completionRate, 1, `completion failures`);
    assert.equal(failedIds.length, 0, `failed: ${failedIds.join(",")}`);

    assert.doesNotMatch(LOOP_RECOVERY_SPEECH, /\btruly\b/i);
    assert.doesNotMatch(SPELLING_ABANDON_ANNOUNCE, /\btruly\b/i);
  });

  test("explicit: no fabricated spelling from Huh/What", async () => {
    const r = await executeLiveTurn({
      callSid: "CA_fab_spell",
      speechResult: "William Buurma, lower-right back tooth.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    appendAlyAsk(r.session!, r.decision!.nextAsk!);
    const r2 = await executeLiveTurn({
      callSid: "CA_fab_spell",
      speechResult: "Huh?",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    assert.ok(!r2.session!.slots.lastNameSpellingCaptured);
    assert.ok(
      !r2.decision!.selectedAction.includes("confirm_last_name_spelling")
    );
  });

  test("explicit: meta-question answered before continuing", async () => {
    const r = await executeLiveTurn({
      callSid: "CA_meta",
      speechResult:
        "I'm William Buurma. Lower-right back tooth. What will happen next?",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    assert.equal(r.decision!.selectedAction, "answer_process_question");
    assert.match(
      r.decision!.nextAsk!.question,
      /collecting|details the team needs/i
    );
  });

  test("explicit: second repeated ask_name triggers recovery path", async () => {
    const sid = "CA_loop_name";
    const r1 = await executeLiveTurn({
      callSid: sid,
      speechResult: "Lower-right back tooth hurts.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    assert.equal(r1.decision!.selectedAction, "ask_name");
    appendAlyAsk(r1.session!, r1.decision!.nextAsk!);
    const r2 = await executeLiveTurn({
      callSid: sid,
      speechResult: "um",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    // Second ask_name without name capture must not be selected (recovery).
    assert.notEqual(r2.decision!.selectedAction, "ask_name");
  });

  test("bottom/right/back phrasing completes location without golden wording", async () => {
    const result = await executeLiveTurn({
      callSid: "CA_loc_phrase",
      speechResult:
        "William Buurma. It's on the bottom on my right, one of the back ones.",
      from: GOLDEN_ROUTINE_PAIN_FROM,
      planOptions: { planFn: behaviorPlanFn },
      semanticOptions: { forceHeuristic: true },
    });
    assert.equal(result.session!.slots.locationParts?.vertical, "lower");
    assert.equal(result.session!.slots.locationParts?.side, "right");
    assert.equal(result.session!.slots.locationParts?.depth, "back");
    const opts = buildConversationOptions(
      result.session!,
      analyzeTranscriptTurns(
        sessionToTranscript(result.session!).turns,
        result.session!.afterHours
      )
    );
    assert.ok(!opts.allowedActions.includes("ask_combined_tooth_location"));
  });
});
