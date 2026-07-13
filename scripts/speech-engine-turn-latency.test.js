/**
 * PHI-safe Speech Engine turn-latency helper tests.
 */

"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  createTurnLatencyTracker,
  getCallLatencyCoord,
  clearAllCallLatencyCoords,
  transcriptFingerprint,
  fingerprintsEqual,
  elapsedMs,
  formatFields,
} = require("../server/speech-engine-turn-latency");

describe("speech-engine-turn-latency helper", () => {
  beforeEach(() => {
    clearAllCallLatencyCoords();
  });

  it("elapsedMs and formatFields stay PHI-safe", () => {
    assert.equal(elapsedMs(100, 150), 50);
    assert.equal(elapsedMs(null, 150), null);
    const line = formatFields({
      callSid: "CA123",
      turnId: "t1",
      stage: "model_started",
      secret: undefined,
    });
    assert.match(line, /callSid=CA123/);
    assert.match(line, /stage=model_started/);
    assert.doesNotMatch(line, /secret=/);
  });

  it("fingerprint uses lengths/roles only — never content", () => {
    const messages = [
      { role: "user", content: "My name is Pat and I have tooth pain" },
      { role: "agent", content: "Thanks — where is the pain?" },
      { role: "user", content: "Upper left" },
    ];
    const fp = transcriptFingerprint(messages);
    assert.deepEqual(Object.keys(fp).sort(), [
      "historyTurns",
      "lastUserChars",
      "rolePattern",
    ]);
    assert.equal(fp.historyTurns, 3);
    assert.equal(fp.lastUserChars, messages[2].content.length);
    assert.equal(fp.rolePattern, "uau");
    assert.equal(
      fingerprintsEqual(
        fp,
        transcriptFingerprint([
          { role: "user", content: "short" },
          { role: "agent", content: "x" },
        ])
      ),
      false
    );
    assert.equal(
      fingerprintsEqual(
        fp,
        transcriptFingerprint([
          { role: "user", content: "x".repeat(messages[0].content.length) },
          { role: "agent", content: "y".repeat(messages[1].content.length) },
          { role: "user", content: "z".repeat(messages[2].content.length) },
        ])
      ),
      true
    );
  });

  it("tracks major stage marks and elapsed summary without PHI", () => {
    let clock = 1_000;
    const events = [];
    const turn = createTurnLatencyTracker({
      callSid: "CA_lat",
      turnId: "t_test_1",
      now: () => clock,
      log: (event, detail) => events.push({ event, detail }),
    });

    turn.markFirstCallerAudio();
    clock = 1_400;
    turn.markElTranscript({ isFinal: false, eventId: 1 });
    clock = 1_800;
    turn.markElTranscript({ isFinal: true, eventId: 2 });
    clock = 1_850;
    turn.markBrainAccepted({ historyTurns: 1 });
    clock = 1_900;
    turn.markModelStarted();
    clock = 2_200;
    turn.noteResponseChunk();
    turn.noteResponseChunk();
    clock = 2_500;
    turn.markModelCompleted();
    clock = 2_510;
    turn.markResponseSentToEl();
    clock = 2_800;
    turn.markFirstElAudio();
    clock = 2_820;
    turn.markFirstTwilioAudio();
    clock = 2_830;
    turn.markCompleted();

    const summary = turn.toSafeSummary();
    assert.equal(summary.turnId, "t_test_1");
    assert.equal(summary.status, "completed");
    assert.equal(summary.responseChunkCount, 2);
    assert.equal(summary.audioToFinalTranscriptMs, 800);
    assert.equal(summary.modelStartToFirstTokenMs, 300);
    assert.equal(summary.finalTranscriptToFirstTwilioMs, 1020);
    assert.equal(summary.totalTurnMs, 1830);
    assert.equal(summary.elFinalLateRelativeToBrain, false);

    const joined = events.map((e) => e.detail).join("\n");
    assert.match(joined, /stage=first_caller_audio/);
    assert.match(joined, /stage=el_transcript_interim/);
    assert.match(joined, /stage=final_el_transcript/);
    assert.match(joined, /stage=brain_accepted/);
    assert.match(joined, /stage=turn_completed/);
    assert.doesNotMatch(joined, /tooth|pain|name|Pat|\+1/i);
  });

  it("call coordinator shares one turn across audio → brain → TTS", () => {
    let clock = 5_000;
    const events = [];
    const log = (event, detail) => events.push({ event, detail });
    const coord = getCallLatencyCoord("CA_share", {
      now: () => clock,
      log,
    });

    coord.armCallerAudio();
    clock = 5_010;
    const audioTurn = coord.onInboundCallerAudio();
    clock = 5_100;
    coord.onElTranscript({ isFinal: true, eventId: 9 });
    clock = 5_120;
    const turn = coord.onBrainTranscript([
      { role: "user", content: "placeholder-not-logged" },
    ]);
    assert.equal(turn.turnId, audioTurn.turnId);
    const turnId = turn.turnId;
    const turnStart = turn.turnStartAt;
    clock = 5_130;
    turn.markModelStarted();
    assert.equal(turn.turnStartAt, turnStart);
    clock = 5_400;
    turn.noteResponseChunk();
    clock = 5_500;
    turn.markModelCompleted();
    turn.markResponseSentToEl();
    clock = 5_700;
    coord.onOutboundElAudio();
    clock = 5_720;
    coord.onTwilioAudioForwarded();

    assert.equal(turn.ended, true);
    assert.equal(turn.toSafeSummary().status, "completed");
    assert.doesNotMatch(
      events.map((e) => e.detail).join("\n"),
      /placeholder/
    );
    assert.equal(
      events.filter((e) => e.detail.includes(`turnId=${turnId}`)).length > 5,
      true
    );
  });

  it("reproduces live bug: brain-first must not supersede; late EL final stays on same turn", () => {
    let clock = 10_000;
    const stages = [];
    const coord = getCallLatencyCoord("CA_live_order", {
      now: () => clock,
      log: (_event, detail) => {
        const match = /stage=([^\s]+)/.exec(detail || "");
        const turnMatch = /turnId=([^\s]+)/.exec(detail || "");
        if (match) {
          stages.push({
            stage: match[1],
            turnId: turnMatch ? turnMatch[1] : null,
            detail,
          });
        }
      },
    });

    // Media path starts the turn (first audio / interim) before brain WS.
    coord.armCallerAudio();
    clock = 10_050;
    const mediaTurn = coord.onInboundCallerAudio();
    clock = 10_100;
    coord.onElTranscript({ isFinal: false, eventId: 41 });

    // Brain WS final arrives before conversation-WS final (live race).
    clock = 10_200;
    const brainTurn = coord.onBrainTranscript([
      { role: "user", content: "x".repeat(24) },
    ]);
    assert.equal(
      brainTurn.turnId,
      mediaTurn.turnId,
      "brain accept must continue media turn (old bug superseded here)"
    );
    assert.equal(brainTurn.abortReason, null);

    const turnStart = brainTurn.turnStartAt;
    clock = 10_210;
    brainTurn.markModelStarted();
    clock = 11_458; // ~1248 ms to first token
    brainTurn.noteResponseChunk();
    clock = 11_500;
    brainTurn.markModelCompleted();
    brainTurn.markResponseSentToEl();
    assert.equal(brainTurn.turnStartAt, turnStart, "turnStart must not reset");

    // Conversation-WS final arrives after model/response stages (live suspicion).
    clock = 11_600;
    const lateEl = coord.onElTranscript({ isFinal: true, eventId: 42 });
    assert.equal(lateEl.turnId, brainTurn.turnId);
    assert.equal(lateEl.elFinalLateRelativeToBrain, true);
    assert.equal(lateEl.marks.brainAcceptedAt < lateEl.marks.finalElTranscriptAt, true);

    clock = 11_781; // ~181 ms TTS
    coord.onOutboundElAudio();
    clock = 11_782;
    coord.onTwilioAudioForwarded();

    const summary = brainTurn.toSafeSummary();
    assert.equal(summary.status, "completed");
    assert.equal(summary.elFinalLateRelativeToBrain, true);
    assert.equal(summary.finalTranscriptToBrainMs, null);
    assert.equal(summary.elFinalLateByMs, 1400);
    assert.equal(summary.modelStartToFirstTokenMs, 1248);
    assert.equal(summary.responseSentToFirstElAudioMs, 281);
    assert.equal(summary.firstElAudioToTwilioMs, 1);

    // No bogus superseded abort of the media-started turn.
    assert.equal(
      stages.some(
        (s) =>
          s.stage === "turn_aborted" &&
          s.detail.includes("abortReason=superseded") &&
          s.turnId === mediaTurn.turnId
      ),
      false
    );

    // Stage order in logs may show final_el after model, but same turnId.
    const finalIdx = stages.findIndex((s) => s.stage === "final_el_transcript");
    const brainIdx = stages.findIndex((s) => s.stage === "brain_accepted");
    const modelIdx = stages.findIndex((s) => s.stage === "model_completed");
    assert.ok(brainIdx >= 0 && modelIdx >= 0 && finalIdx >= 0);
    assert.ok(finalIdx > modelIdx, "late EL final still logs after model");
    assert.equal(stages[finalIdx].turnId, stages[brainIdx].turnId);
    assert.match(stages[finalIdx].detail, /lateRelativeToBrain=true/);
    assert.doesNotMatch(stages.map((s) => s.detail).join("\n"), /tooth|pain|\+1/);
  });

  it("one EL event ID maps to one stable turn ID across duplicate finals", () => {
    let clock = 20_000;
    const coord = getCallLatencyCoord("CA_el_id", {
      now: () => clock,
      log: () => {},
    });
    coord.armCallerAudio();
    clock = 20_010;
    const turn = coord.onInboundCallerAudio();
    clock = 20_020;
    coord.onElTranscript({ isFinal: true, eventId: "evt_7" });
    clock = 20_030;
    const again = coord.onElTranscript({ isFinal: true, eventId: "evt_7" });
    assert.equal(again.turnId, turn.turnId);
    assert.equal(again.duplicateTranscript, true);
    clock = 20_040;
    const brain = coord.onBrainTranscript(
      [{ role: "user", content: "hi" }],
      { elEventId: "evt_7" }
    );
    assert.equal(brain.turnId, turn.turnId);
  });

  it("model interruption reports supersededByTurnId on the aborted turn", () => {
    let clock = 9_000;
    const coord = getCallLatencyCoord("CA_dup", {
      now: () => clock,
      log: () => {},
    });

    const transcript = [{ role: "user", content: "hello there" }];
    const first = coord.onBrainTranscript(transcript);
    first.markModelStarted();
    clock = 9_200;

    const second = coord.onBrainTranscript(transcript);
    assert.notEqual(first.turnId, second.turnId);
    assert.equal(first.ended, true);
    assert.equal(first.abortReason, "interrupted_by_later_transcript");
    assert.equal(first.supersededByTurnId, second.turnId);
    assert.equal(second.interruptedByLaterTranscript, true);
    assert.equal(second.duplicateTranscript, true);
    assert.equal(first.turnStartAt != null, true);
  });

  it("does not reset turnStart after model generation begins", () => {
    let clock = 30_000;
    const coord = getCallLatencyCoord("CA_start", {
      now: () => clock,
      log: () => {},
    });
    coord.armCallerAudio();
    clock = 30_100;
    const turn = coord.onInboundCallerAudio();
    const start = turn.turnStartAt;
    clock = 30_200;
    coord.onBrainTranscript([{ role: "user", content: "abc" }]);
    clock = 30_300;
    turn.markModelStarted();
    clock = 31_000;
    turn.noteResponseChunk();
    assert.equal(turn.turnStartAt, start);
    assert.equal(turn.turnId, coord.getActiveTurn().turnId);
  });

  it("ignores greeting TTS before any model response", () => {
    const coord = getCallLatencyCoord("CA_greet", {
      now: () => 100,
      log: () => {},
    });
    coord.armCallerAudio();
    assert.equal(coord.onOutboundElAudio(), null);
    assert.equal(coord.onTwilioAudioForwarded(), null);
  });
});
