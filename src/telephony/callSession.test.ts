import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import { analyzeTranscriptTurns } from "../conversation/engine.ts";
import { processCallTranscript } from "../conversation/processCall.ts";
import {
  appendAlyAsk,
  clearCallSession,
  createOrUpdateSession,
  hasLifeThreateningLanguage,
  isCallActionable,
  resetCallSessionsForTests,
  selectNextAsk,
  sessionToTranscript,
} from "./callSession.ts";

function analyze(session: NonNullable<ReturnType<typeof createOrUpdateSession>>) {
  return analyzeTranscriptTurns(sessionToTranscript(session).turns, session.afterHours);
}

describe("telephony — multi-turn dental intake regressions", () => {
  beforeEach(() => {
    resetCallSessionsForTests();
  });

  test("toothache does not close after a single red-flag denial", () => {
    const session = createOrUpdateSession({
      callSid: "CA_reg_1",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
      now: new Date("2026-07-11T14:00:00.000Z"),
    });
    assert.ok(session);

    let analysis = analyze(session!);
    let ask = selectNextAsk(session!, analysis);
    assert.ok(ask, "should continue after reason alone");
    // Routine toothache must NOT open with breathing/swallowing.
    assert.notEqual(ask!.field, "safety.breathing");
    assert.notEqual(ask!.field, "safety.red_flags");

    // Drive through until someone wrongly might close after a "no"
    const deniedBreathingEarly = {
      field: "safety.breathing",
      question: "any trouble breathing?",
    };
    // Simulate wrong old path: if we asked breathing and got no, must still continue
    appendAlyAsk(session!, {
      field: "safety.breathing",
      question: deniedBreathingEarly.question,
    });
    createOrUpdateSession({
      callSid: "CA_reg_1",
      speechResult: "No",
    });
    analysis = analyze(session!);
    ask = selectNextAsk(session!, analysis);
    assert.ok(ask, "must not close after denying breathing alone");
    assert.equal(isCallActionable(session!, analysis), false);
  });

  test("routine toothache collects multiple contextual answers before close", () => {
    const sid = "CA_reg_multi";
    let session = createOrUpdateSession({
      callSid: sid,
      speechResult: "I have a toothache",
      from: "+16155550111",
      now: new Date("2026-07-11T15:00:00.000Z"),
    });

    const answers: Record<string, string> = {
      "caller.name": "Finn Leo",
      "pain.location": "lower left molar",
      "pain.onset": "last night",
      "pain.severity": "it kept me from sleeping",
      "pain.swelling": "No",
      "pain.context": "just the ache",
    };

    let guard = 0;
    while (guard++ < 12) {
      const analysis = analyze(session!);
      if (isCallActionable(session!, analysis)) break;
      const ask = selectNextAsk(session!, analysis);
      assert.ok(ask, `expected another question at step ${guard}`);
      appendAlyAsk(session!, ask!);
      const reply = answers[ask!.field] || "No";
      session = createOrUpdateSession({
        callSid: sid,
        speechResult: reply,
        from: "+16155550111",
      });
    }

    const finalAnalysis = analyze(session!);
    assert.equal(isCallActionable(session!, finalAnalysis), true);
    assert.ok(session!.slots.name || finalAnalysis.understanding.callerName);
    assert.equal(typeof session!.slots.swelling, "boolean");
    assert.ok(session!.followUpsAsked >= 3, "collected multiple answers");
    assert.equal(selectNextAsk(session!, finalAnalysis), null);
  });

  test("caller name is retained and not re-asked", () => {
    const sid = "CA_reg_name";
    let session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Hi my name is Sarah Nguyen and I have tooth pain",
      from: "+16155550999",
    });
    let analysis = analyze(session!);
    let ask = selectNextAsk(session!, analysis);
    // Should not ask for name again
    while (ask && ask.field !== "caller.name" && session!.followUpsAsked < 8) {
      appendAlyAsk(session!, ask);
      session = createOrUpdateSession({
        callSid: sid,
        speechResult:
          ask.field === "pain.swelling"
            ? "No"
            : ask.field === "pain.location"
              ? "upper right"
              : ask.field === "pain.onset"
                ? "today"
                : ask.field === "pain.severity"
                  ? "it's pretty bad"
                  : ask.field === "pain.context"
                    ? "just the ache"
                    : "No",
        from: "+16155550999",
      });
      analysis = analyze(session!);
      ask = selectNextAsk(session!, analysis);
      if (ask) assert.notEqual(ask.field, "caller.name");
    }
  });

  test("routine pain does not begin with highest-level emergency interrogation", () => {
    const session = createOrUpdateSession({
      callSid: "CA_reg_order",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    const ask = selectNextAsk(session!, analyze(session!));
    assert.ok(ask);
    assert.notEqual(ask!.field, "safety.breathing");
    assert.notEqual(ask!.field, "safety.red_flags");
    assert.ok(
      ask!.field === "caller.name" ||
        ask!.field.startsWith("pain.")
    );
  });

  test("swelling plus fever escalates appropriately", () => {
    const sid = "CA_reg_swell";
    const session = createOrUpdateSession({
      callSid: sid,
      speechResult: "My face is swelling and I think I have a fever",
      from: "+16155550111",
    });
    session!.slots.name = "Emily Johnson";
    session!.slots.location = "left side";
    session!.slots.onset = "today";
    session!.slots.severity = "getting worse";
    session!.slots.swelling = true;
    session!.slots.fever = true;

    const analysis = analyze(session!);
    const ask = selectNextAsk(session!, analysis);
    // Either airway screen next, or immediate ER completion path.
    assert.ok(
      ask === null || ask.field === "safety.breathing",
      `expected escalation path, got ${ask && ask.field}`
    );
    if (ask === null) {
      assert.ok(
        analysis.triage.routingAction === "er_or_on_call_immediate" ||
          isCallActionable(session!, analysis)
      );
    }
  });


  test("trouble breathing causes immediate emergency guidance path", () => {
    assert.equal(
      hasLifeThreateningLanguage("I have trouble breathing and facial swelling"),
      true
    );
    const session = createOrUpdateSession({
      callSid: "CA_reg_er",
      speechResult: "My face is swollen and I have trouble breathing",
      from: "+16155550100",
    });
    const analysis = analyze(session!);
    assert.equal(selectNextAsk(session!, analysis), null);
    assert.equal(isCallActionable(session!, analysis), true);
  });

  test("closing gate requires actionable information", () => {
    const session = createOrUpdateSession({
      callSid: "CA_reg_gate",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    // Only reason + caller ID — not actionable
    assert.equal(isCallActionable(session!, analyze(session!)), false);

    appendAlyAsk(session!, {
      field: "safety.breathing",
      question: "trouble breathing?",
    });
    createOrUpdateSession({ callSid: "CA_reg_gate", speechResult: "No" });
    // Still not actionable — denial alone is insufficient
    assert.equal(isCallActionable(session!, analyze(session!)), false);
  });

  test("summary pipeline runs when actionable", () => {
    const sid = "CA_reg_sum";
    let session = createOrUpdateSession({
      callSid: sid,
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    const script: Array<[string, string]> = [
      ["caller.name", "Finn Leo"],
      ["pain.location", "lower left"],
      ["pain.swelling", "No"],
      ["pain.context", "just the ache"],
    ];
    for (const [field, reply] of script) {
      const ask = selectNextAsk(session!, analyze(session!));
      if (!ask) break;
      // Accept whatever adaptive field is next; map reply loosely
      appendAlyAsk(session!, ask);
      const mapped =
        ask.field === "caller.name"
          ? "Finn Leo"
          : ask.field === "pain.location"
            ? "lower left"
            : ask.field === "pain.onset"
              ? "last night"
              : ask.field === "pain.severity"
                ? "kept me awake"
                : ask.field === "pain.swelling"
                  ? "No"
                  : ask.field === "pain.context"
                    ? "just the ache"
                    : reply;
      session = createOrUpdateSession({
        callSid: sid,
        speechResult: mapped,
        from: "+16155550111",
      });
    }

    assert.equal(isCallActionable(session!, analyze(session!)), true);
    const { summary } = processCallTranscript(sessionToTranscript(session!));
    assert.ok(summary.recommendedNextStep);
    assert.ok(summary.caller.name || session!.slots.name);
    clearCallSession(sid);
  });
});
