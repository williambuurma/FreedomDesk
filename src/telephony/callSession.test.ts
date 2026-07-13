import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import { analyzeTranscriptTurns } from "../conversation/engine.ts";
import { processCallTranscript } from "../conversation/processCall.ts";
import { composeClosing } from "./callResponses.ts";
import { classifyConversationTone } from "./conversationTone.ts";
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
import {
  isLocationComplete,
  parseToothLocationParts,
} from "./toothLocation.ts";

function analyze(session: NonNullable<ReturnType<typeof createOrUpdateSession>>) {
  return analyzeTranscriptTurns(sessionToTranscript(session).turns, session.afterHours);
}

/** Drive a session with adaptive replies mapped by field. */
function drive(
  sid: string,
  from: string,
  replies: Record<string, string>,
  max = 16
) {
  let session = createOrUpdateSession({
    callSid: sid,
    speechResult: replies.__open || "I have a toothache that kept me awake",
    from,
    now: new Date("2026-07-11T15:00:00.000Z"),
  });
  let guard = 0;
  while (guard++ < max) {
    const analysis = analyze(session!);
    if (isCallActionable(session!, analysis)) break;
    const ask = selectNextAsk(session!, analysis);
    if (!ask) break;
    appendAlyAsk(session!, ask);
    const reply = replies[ask.field] || "Yes";
    session = createOrUpdateSession({
      callSid: sid,
      speechResult: reply,
      from,
    });
  }
  return session!;
}

describe("telephony — compassionate routine pain intake", () => {
  beforeEach(() => {
    resetCallSessionsForTests();
  });

  test("pain plus worry produces acknowledgment and process reassurance before the first question", () => {
    const session = createOrUpdateSession({
      callSid: "CA_open_worry",
      speechResult:
        "I have an awful toothache and I'm worried something is really wrong",
      from: "+16155550111",
    });
    assert.equal(
      classifyConversationTone({
        patientText: "awful toothache and I'm worried",
      }),
      "worried_anxious"
    );
    const ask = selectNextAsk(session!, analyze(session!));
    assert.ok(ask);
    assert.match(ask!.question, /glad you (called|reached)|understand why/i);
    assert.match(ask!.question, /details|team/i);
    assert.match(ask!.question, /\?/);
    assert.ok(session!.usedOpening);
  });

  test("pain opening uses process reassurance before asking name", () => {
    const session = createOrUpdateSession({
      callSid: "CA_open_pain",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    const ask = selectNextAsk(session!, analyze(session!));
    assert.ok(ask);
    assert.equal(ask!.field, "caller.name");
    assert.match(ask!.question, /uncomfortable|hurts|uncomfortable/i);
    assert.match(ask!.question, /glad you|Thank you for calling|reached/i);
    assert.match(ask!.question, /first and last name/i);
  });

  test("routine new patient tone is welcoming without pain empathy", () => {
    assert.equal(
      classifyConversationTone({
        patientText: "I need a cleaning and I'm a new patient",
      }),
      "routine_friendly"
    );
  });

  test("facts already volunteered are not requested again", () => {
    const session = createOrUpdateSession({
      callSid: "CA_volunteered",
      speechResult:
        "Hi my name is Finn Leo and I have pain in my lower right back tooth with no swelling",
      from: "+16155550111",
    });
    assert.ok(session!.slots.name);
    assert.ok(isLocationComplete(session!.slots.locationParts));
    assert.equal(session!.slots.swelling, false);

    let ask = selectNextAsk(session!, analyze(session!));
    const fields: string[] = [];
    let guard = 0;
    while (ask && guard++ < 10) {
      fields.push(ask.field);
      assert.notEqual(ask.field, "caller.name");
      assert.notEqual(ask.field, "pain.location.vertical");
      assert.notEqual(ask.field, "pain.swelling");
      appendAlyAsk(session!, ask);
      const reply =
        ask.field === "caller.last_name_spell"
          ? "L E O"
          : ask.field === "caller.last_name_confirm"
            ? "Yes"
            : ask.field === "schedule.earliest"
              ? "Yes"
              : ask.field === "schedule.short_notice"
                ? "Yes"
                : "Yes";
      createOrUpdateSession({
        callSid: "CA_volunteered",
        speechResult: reply,
        from: "+16155550111",
      });
      ask = selectNextAsk(session!, analyze(session!));
    }
    assert.ok(fields.includes("caller.last_name_spell"));
  });

  test("full name collected then last name spelled, read back, and confirmed", () => {
    const sid = "CA_spell";
    let session = createOrUpdateSession({
      callSid: sid,
      speechResult: "I have a toothache",
      from: "+16155550111",
    });
    let ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.name");
    appendAlyAsk(session!, ask!);
    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Finn Leo",
      from: "+16155550111",
    });
    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.last_name_spell");
    appendAlyAsk(session!, ask!);
    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "L E O",
      from: "+16155550111",
    });
    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.last_name_confirm");
    assert.match(ask!.question, /L-E-O|L E O/i);
    appendAlyAsk(session!, ask!);
    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Yes",
      from: "+16155550111",
    });
    assert.equal(session!.slots.lastNameConfirmed, true);
  });

  test("tooth location collected in upper/lower left/right front/back language", () => {
    assert.deepEqual(parseToothLocationParts("lower right back tooth"), {
      vertical: "lower",
      side: "right",
      depth: "back",
    });
    const session = drive(
      "CA_loc",
      "+16155550111",
      {
        "caller.name": "Finn Leo",
        "caller.last_name_spell": "L E O",
        "caller.last_name_confirm": "Yes",
        "pain.location.vertical": "lower",
        "pain.location.side": "right",
        "pain.location.depth": "back",
        "pain.location.confirm": "Yes",
        "pain.swelling": "No",
        "schedule.earliest": "Yes",
        "schedule.short_notice": "Yes",
      }
    );
    assert.ok(isLocationComplete(session.slots.locationParts));
    assert.equal(session.slots.locationParts?.vertical, "lower");
    assert.equal(session.slots.locationParts?.side, "right");
    assert.equal(session.slots.locationParts?.depth, "back");
  });

  test("complete volunteered location is not re-asked dimensionally", () => {
    const session = createOrUpdateSession({
      callSid: "CA_loc_done",
      speechResult: "Toothache in my lower-right back tooth",
      from: "+16155550111",
    });
    session!.slots.name = "Finn Leo";
    session!.slots.nameCaptured = true;
    session!.slots.lastNameSpelling = "L E O";
    session!.slots.lastNameSpellingCaptured = true;
    session!.slots.lastNameConfirmed = true;
    const ask = selectNextAsk(session!, analyze(session!));
    assert.ok(ask);
    assert.notEqual(ask!.field, "pain.location.vertical");
    assert.notEqual(ask!.field, "pain.location.side");
    assert.notEqual(ask!.field, "pain.location.depth");
    assert.notEqual(ask!.field, "pain.location.confirm");
    assert.equal(ask!.field, "pain.swelling");
  });

  test("recognized name is not equivalent to confirmed spelling", () => {
    const session = createOrUpdateSession({
      callSid: "CA_name_not_confirm",
      speechResult: "Hi, I'm William Buurma. I have a toothache.",
      from: "+16155550111",
    });
    assert.equal(session!.slots.nameCaptured, true);
    assert.equal(session!.slots.lastNameConfirmed === true, false);
    assert.equal(session!.slots.lastNameSpellingCaptured === true, false);
    const ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.last_name_spell");
  });

  test("william pain worry golden path is short and purposeful", () => {
    const sid = "CA_william_golden";
    let session = createOrUpdateSession({
      callSid: sid,
      speechResult:
        "Hi, I'm William Buurma. I have pain in my lower-right back tooth. It kept me awake last night, and I'm worried.",
      from: "+16155550111",
    });
    assert.equal(session!.slots.keptAwake, true);
    assert.ok(isLocationComplete(session!.slots.locationParts));

    let ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.last_name_spell");
    assert.match(ask!.question, /worried|concerned|uncomfortable|glad you/i);
    assert.match(ask!.question, /spell your last name/i);
    assert.match(ask!.question, /William/);
    appendAlyAsk(session!, ask!);

    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "B U U R M A",
      from: "+16155550111",
    });
    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "caller.last_name_confirm");
    assert.match(ask!.question, /B-U-U-R-M-A/);
    assert.match(ask!.question, /Buurma/i);
    appendAlyAsk(session!, ask!);

    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Yes",
      from: "+16155550111",
    });
    assert.equal(session!.slots.lastNameConfirmed, true);

    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "pain.swelling");
    assert.doesNotMatch(ask!.question, /breathing|swallowing|fever|onset|how bad/i);
    appendAlyAsk(session!, ask!);

    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "No",
      from: "+16155550111",
    });
    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "schedule.earliest");
    assert.match(ask!.question, /important details|flexible|earlier opening/i);
    appendAlyAsk(session!, ask!);

    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Yes, ASAP",
      from: "+16155550111",
    });
    ask = selectNextAsk(session!, analyze(session!));
    assert.equal(ask!.field, "schedule.short_notice");
    appendAlyAsk(session!, ask!);

    session = createOrUpdateSession({
      callSid: sid,
      speechResult: "Yes",
      from: "+16155550111",
    });
    assert.equal(isCallActionable(session!, analyze(session!)), true);
    assert.ok(session!.postIdentityAsks <= 3);
    assert.equal(selectNextAsk(session!, analyze(session!)), null);

    const closing = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: false,
      tone: session!.tone,
      callerName: session!.slots.name,
      locationParts: session!.slots.locationParts,
      swelling: session!.slots.swelling,
      keptAwake: session!.slots.keptAwake,
      wantsEarliest: session!.slots.wantsEarliest,
      shortNoticeOk: session!.slots.shortNoticeOk,
      persisted: true,
    });
    assert.match(closing, /William/);
    assert.match(closing, /lower-right back/i);
    assert.match(closing, /kept you awake/i);
    assert.match(closing, /not noticed swelling/i);
    assert.match(closing, /earliest available help/i);
    assert.match(closing, /short notice/i);
    assert.match(closing, /saved clearly for the team/i);
  });

  test("routine pain does not trigger breathing without indication", () => {
    const session = createOrUpdateSession({
      callSid: "CA_no_breath",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    const fields: string[] = [];
    let guard = 0;
    let s = session!;
    while (guard++ < 14) {
      const analysis = analyze(s);
      if (isCallActionable(s, analysis)) break;
      const ask = selectNextAsk(s, analysis);
      if (!ask) break;
      fields.push(ask.field);
      assert.notEqual(ask.field, "safety.breathing");
      appendAlyAsk(s, ask);
      const reply =
        ask.field === "caller.name"
          ? "Finn Leo"
          : ask.field === "caller.last_name_spell"
            ? "L E O"
            : ask.field === "caller.last_name_confirm"
              ? "Yes"
              : ask.field === "pain.location.vertical"
                ? "lower"
                : ask.field === "pain.location.side"
                  ? "left"
                  : ask.field === "pain.location.depth"
                    ? "back"
                    : ask.field === "pain.location.confirm"
                      ? "Yes"
                      : ask.field === "pain.swelling"
                        ? "No"
                        : ask.field === "schedule.earliest"
                          ? "Yes"
                          : ask.field === "schedule.short_notice"
                            ? "Yes"
                            : "No";
      s = createOrUpdateSession({
        callSid: "CA_no_breath",
        speechResult: reply,
        from: "+16155550111",
      })!;
    }
    assert.ok(!fields.includes("safety.breathing"));
    assert.ok(!fields.includes("pain.fever"));
    assert.ok(!fields.includes("pain.onset"));
    assert.ok(!fields.includes("pain.severity"));
    assert.ok(!fields.includes("pain.context"));
  });

  test("swelling still activates appropriate safety screening", () => {
    const sid = "CA_swell";
    const session = createOrUpdateSession({
      callSid: sid,
      speechResult: "My face is swelling and I have tooth pain",
      from: "+16155550111",
    });
    session!.slots.name = "Emily Johnson";
    session!.slots.nameCaptured = true;
    session!.slots.lastNameSpelling = "J O H N S O N";
    session!.slots.lastNameSpellingCaptured = true;
    session!.slots.lastNameConfirmed = true;
    session!.slots.locationParts = {
      vertical: "lower",
      side: "left",
      depth: "back",
    };
    session!.slots.locationConfirmed = true;
    session!.slots.swelling = true;

    const ask = selectNextAsk(session!, analyze(session!));
    assert.ok(
      ask === null || ask.field === "safety.breathing",
      `expected airway screen, got ${ask && ask.field}`
    );
  });

  test("ASAP preference results in a short-notice availability question", () => {
    const session = drive("CA_asap", "+16155550111", {
      "caller.name": "Finn Leo",
      "caller.last_name_spell": "L E O",
      "caller.last_name_confirm": "Yes",
      "pain.location.vertical": "lower",
      "pain.location.side": "right",
      "pain.location.depth": "back",
      "pain.location.confirm": "Yes",
      "pain.swelling": "No",
      "schedule.earliest": "Yes",
      "schedule.short_notice": "Yes",
    });
    assert.equal(session.slots.wantsEarliest, true);
    assert.equal(session.slots.shortNoticeOk, true);
    assert.equal(isCallActionable(session, analyze(session)), true);
  });

  test("routine pain call stays shorter than legacy clinical interview", () => {
    const session = drive("CA_short", "+16155550111", {
      "caller.name": "Finn Leo",
      "caller.last_name_spell": "L E O",
      "caller.last_name_confirm": "Yes",
      "pain.location.vertical": "lower",
      "pain.location.side": "left",
      "pain.location.depth": "back",
      "pain.location.confirm": "Yes",
      "pain.swelling": "No",
      "schedule.earliest": "Yes",
      "schedule.short_notice": "No",
    });
    assert.equal(isCallActionable(session, analyze(session)), true);
    // Identity (3) + location dims/confirm + swelling + earliest + short notice
    // should stay well under the old sprawling interview.
    assert.ok(session.followUpsAsked <= 10);
    assert.ok(session.postIdentityAsks <= 8);
  });

  test("closing summarizes concern and gives an honest next step", () => {
    const closing = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: true,
      tone: "pain_discomfort",
      callerName: "William Buurma",
      locationParts: { vertical: "lower", side: "right", depth: "back" },
      swelling: false,
      keptAwake: true,
      wantsEarliest: true,
      shortNoticeOk: true,
      persisted: true,
    });
    assert.match(closing, /William/);
    assert.match(closing, /lower-right back/i);
    assert.match(closing, /kept you awake|have not noticed swelling/i);
    assert.match(closing, /earliest available help/i);
    assert.match(closing, /glad you called/i);
    assert.match(closing, /saved clearly for the team/i);
    assert.doesNotMatch(closing, /you'll be fine|guaranteed|booked your appointment/i);
    assert.doesNotMatch(closing, /dentist will call immediately/i);
  });

  test("closing does not claim capture when not persisted", () => {
    const closing = composeClosing({
      intent: "EMERGENCY",
      urgency: "urgent",
      afterHours: false,
      tone: "pain_discomfort",
      persisted: false,
    });
    assert.match(closing, /trouble saving/i);
    assert.doesNotMatch(closing, /saved clearly for the team/i);
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

  test("summary pipeline runs when actionable", () => {
    const session = drive("CA_reg_sum", "+16155550111", {
      "caller.name": "Finn Leo",
      "caller.last_name_spell": "L E O",
      "caller.last_name_confirm": "Yes",
      "pain.location.vertical": "lower",
      "pain.location.side": "left",
      "pain.location.depth": "back",
      "pain.location.confirm": "Yes",
      "pain.swelling": "No",
      "schedule.earliest": "Yes",
      "schedule.short_notice": "Yes",
    });
    assert.equal(isCallActionable(session, analyze(session)), true);
    const { summary } = processCallTranscript(sessionToTranscript(session));
    assert.ok(summary.recommendedNextStep);
    assert.ok(summary.caller.name || session.slots.name);
    clearCallSession("CA_reg_sum");
  });

  test("closing gate requires actionable information", () => {
    const session = createOrUpdateSession({
      callSid: "CA_reg_gate",
      speechResult: "I have a toothache that kept me awake",
      from: "+16155550111",
    });
    assert.equal(isCallActionable(session!, analyze(session!)), false);
  });
});
