/**
 * PHI-safe per-turn Speech Engine latency instrumentation.
 *
 * Logs stage timestamps and elapsed ms only — never transcript text,
 * names, phone numbers, symptoms, insurance, or other PHI.
 *
 * Media-bridge (conversation WS) and brain WS are separate sockets.
 * One logical caller turn must keep a stable turnId across both.
 */

"use strict";

/** @type {Map<string, CallLatencyCoord>} */
const coordsByCallSid = new Map();

let turnSeq = 0;

function nowMs(nowFn) {
  return typeof nowFn === "function" ? nowFn() : Date.now();
}

function createTurnId(nowFn) {
  turnSeq += 1;
  return `t${nowMs(nowFn).toString(36)}_${turnSeq.toString(36)}`;
}

/**
 * Elapsed ms from an origin timestamp, or null when either side is missing.
 * @param {number|null|undefined} from
 * @param {number|null|undefined} to
 */
function elapsedMs(from, to) {
  if (from == null || to == null) return null;
  return to - from;
}

/**
 * Build a PHI-safe detail string from key=value pairs.
 * @param {Record<string, string|number|boolean|null|undefined>} fields
 */
function formatFields(fields) {
  const parts = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    parts.push(`${key}=${value === null ? "(none)" : String(value)}`);
  }
  return parts.join(" ");
}

/**
 * Non-PHI fingerprint of a brain transcript payload (lengths / roles only).
 * @param {Array<{role?: string, content?: string}>|null|undefined} transcript
 */
function transcriptFingerprint(transcript) {
  if (!Array.isArray(transcript)) {
    return { historyTurns: 0, lastUserChars: 0, rolePattern: "" };
  }
  let lastUserChars = 0;
  const roles = [];
  for (const msg of transcript) {
    const role = msg && msg.role === "agent" ? "a" : "u";
    roles.push(role);
    if (role === "u" && msg && typeof msg.content === "string") {
      lastUserChars = msg.content.length;
    }
  }
  return {
    historyTurns: transcript.length,
    lastUserChars,
    rolePattern: roles.join(""),
  };
}

function fingerprintsEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.historyTurns === b.historyTurns &&
    a.lastUserChars === b.lastUserChars &&
    a.rolePattern === b.rolePattern
  );
}

/**
 * @param {object} options
 * @param {string} options.callSid
 * @param {string} options.turnId
 * @param {() => number} [options.now]
 * @param {(event: string, detail?: string) => void} options.log
 */
function createTurnLatencyTracker(options) {
  const callSid = String(options.callSid || "").trim() || "(none)";
  const turnId = String(options.turnId || "").trim() || createTurnId(options.now);
  const now = () => nowMs(options.now);
  const log = typeof options.log === "function" ? options.log : () => {};

  /** @type {Record<string, number|null>} */
  const marks = {
    firstCallerAudioAt: null,
    finalElTranscriptAt: null,
    brainAcceptedAt: null,
    modelStartedAt: null,
    firstModelTokenAt: null,
    modelCompletedAt: null,
    responseSentToElAt: null,
    firstElAudioAt: null,
    firstTwilioAudioAt: null,
    endedAt: null,
  };

  /** Frozen when first stage is marked — never reset after model starts. */
  let turnStartAt = null;
  let ended = false;
  let endStatus = null;
  let abortReason = null;
  let supersededByTurnId = null;
  let supersededByStage = null;
  let interruptedByLaterTranscript = false;
  let responseChunkCount = 0;
  let transcriptIsFinal = null;
  let duplicateTranscript = false;
  let elEventId = null;
  let historyTurns = null;
  let elFinalLateRelativeToBrain = false;

  function ensureTurnStart(at) {
    if (turnStartAt == null) turnStartAt = at;
  }

  function logStage(stage, extra = {}) {
    const at = now();
    ensureTurnStart(at);
    log(
      "turn_latency",
      formatFields({
        callSid,
        turnId,
        stage,
        atMs: at,
        turnStartAtMs: turnStartAt,
        sinceTurnStartMs: elapsedMs(turnStartAt, at),
        sinceFirstAudioMs: elapsedMs(marks.firstCallerAudioAt, at),
        sinceFinalTranscriptMs: elapsedMs(marks.finalElTranscriptAt, at),
        sinceBrainAcceptedMs: elapsedMs(marks.brainAcceptedAt, at),
        sinceModelStartMs: elapsedMs(marks.modelStartedAt, at),
        sinceFirstTokenMs: elapsedMs(marks.firstModelTokenAt, at),
        sinceModelCompleteMs: elapsedMs(marks.modelCompletedAt, at),
        sinceResponseSentMs: elapsedMs(marks.responseSentToElAt, at),
        sinceFirstElAudioMs: elapsedMs(marks.firstElAudioAt, at),
        ...extra,
      })
    );
  }

  function markOnce(key, stage, extra = {}) {
    if (marks[key] != null) return false;
    const at = now();
    ensureTurnStart(at);
    marks[key] = at;
    logStage(stage, extra);
    return true;
  }

  function summaryFields() {
    const end = marks.endedAt || now();
    const finalBeforeBrain =
      marks.finalElTranscriptAt != null &&
      marks.brainAcceptedAt != null &&
      marks.finalElTranscriptAt <= marks.brainAcceptedAt;
    return {
      callSid,
      turnId,
      status: endStatus || "(open)",
      abortReason: abortReason || "(none)",
      supersededByTurnId: supersededByTurnId || "(none)",
      supersededByStage: supersededByStage || "(none)",
      interruptedByLaterTranscript,
      duplicateTranscript,
      transcriptIsFinal,
      elFinalLateRelativeToBrain,
      responseChunkCount,
      elEventId: elEventId == null ? "(none)" : elEventId,
      historyTurns: historyTurns == null ? "(none)" : historyTurns,
      turnStartAtMs: turnStartAt,
      audioToFinalTranscriptMs: elapsedMs(
        marks.firstCallerAudioAt,
        marks.finalElTranscriptAt
      ),
      finalTranscriptToBrainMs: finalBeforeBrain
        ? elapsedMs(marks.finalElTranscriptAt, marks.brainAcceptedAt)
        : null,
      elFinalLateByMs: elFinalLateRelativeToBrain
        ? elapsedMs(marks.brainAcceptedAt, marks.finalElTranscriptAt)
        : null,
      brainToModelStartMs: elapsedMs(marks.brainAcceptedAt, marks.modelStartedAt),
      modelStartToFirstTokenMs: elapsedMs(
        marks.modelStartedAt,
        marks.firstModelTokenAt
      ),
      firstTokenToModelCompleteMs: elapsedMs(
        marks.firstModelTokenAt,
        marks.modelCompletedAt
      ),
      modelCompleteToResponseSentMs: elapsedMs(
        marks.modelCompletedAt,
        marks.responseSentToElAt
      ),
      responseSentToFirstElAudioMs: elapsedMs(
        marks.responseSentToElAt,
        marks.firstElAudioAt
      ),
      firstElAudioToTwilioMs: elapsedMs(
        marks.firstElAudioAt,
        marks.firstTwilioAudioAt
      ),
      audioToFirstTwilioMs: elapsedMs(
        marks.firstCallerAudioAt,
        marks.firstTwilioAudioAt
      ),
      finalTranscriptToFirstTwilioMs: finalBeforeBrain
        ? elapsedMs(marks.finalElTranscriptAt, marks.firstTwilioAudioAt)
        : null,
      brainAcceptedToFirstTwilioMs: elapsedMs(
        marks.brainAcceptedAt,
        marks.firstTwilioAudioAt
      ),
      modelStartToFirstTwilioMs: elapsedMs(
        marks.modelStartedAt,
        marks.firstTwilioAudioAt
      ),
      totalTurnMs: elapsedMs(turnStartAt, end),
    };
  }

  return {
    callSid,
    turnId,
    get ended() {
      return ended;
    },
    get marks() {
      return { ...marks };
    },
    get turnStartAt() {
      return turnStartAt;
    },
    get responseChunkCount() {
      return responseChunkCount;
    },
    get abortReason() {
      return abortReason;
    },
    get supersededByTurnId() {
      return supersededByTurnId;
    },
    get interruptedByLaterTranscript() {
      return interruptedByLaterTranscript;
    },
    get duplicateTranscript() {
      return duplicateTranscript;
    },
    get elEventId() {
      return elEventId;
    },
    get elFinalLateRelativeToBrain() {
      return elFinalLateRelativeToBrain;
    },

    markFirstCallerAudio() {
      return markOnce("firstCallerAudioAt", "first_caller_audio", {
        reliablyDetectable: true,
      });
    },

    /**
     * @param {{
     *   isFinal: boolean,
     *   eventId?: string|number|null,
     *   duplicate?: boolean,
     * }} info
     */
    markElTranscript(info) {
      const isFinal = Boolean(info && info.isFinal);
      if (info && info.duplicate) duplicateTranscript = true;
      // Interim and final may use different EL event IDs; keep the latest
      // until a final is sealed, then ignore foreign IDs on this turn.
      if (info && info.eventId != null) {
        if (
          marks.finalElTranscriptAt != null &&
          elEventId != null &&
          String(info.eventId) !== String(elEventId)
        ) {
          logStage("el_transcript_ignored_wrong_event", {
            transcriptKind: isFinal ? "final" : "interim",
            boundElEventId: elEventId,
            ignoredElEventId: info.eventId,
          });
          return false;
        }
        elEventId = info.eventId;
      }

      if (!isFinal) {
        transcriptIsFinal = transcriptIsFinal === true ? true : false;
        logStage("el_transcript_interim", {
          transcriptKind: "interim",
          duplicateTranscript,
          elEventId: elEventId == null ? "(none)" : elEventId,
        });
        return false;
      }

      transcriptIsFinal = true;
      if (marks.finalElTranscriptAt != null) {
        duplicateTranscript = true;
        logStage("el_transcript_final_duplicate", {
          transcriptKind: "final",
          duplicateTranscript: true,
          elEventId: elEventId == null ? "(none)" : elEventId,
        });
        return false;
      }

      const late =
        marks.brainAcceptedAt != null &&
        marks.finalElTranscriptAt == null;
      elFinalLateRelativeToBrain = late;
      return markOnce("finalElTranscriptAt", "final_el_transcript", {
        transcriptKind: "final",
        duplicateTranscript,
        lateRelativeToBrain: late,
        elEventId: elEventId == null ? "(none)" : elEventId,
      });
    },

    /**
     * @param {{
     *   historyTurns?: number,
     *   duplicate?: boolean,
     *   interruptedActiveModel?: boolean,
     *   elEventId?: string|number|null,
     * }} info
     */
    markBrainAccepted(info = {}) {
      if (typeof info.historyTurns === "number") historyTurns = info.historyTurns;
      if (info.duplicate) duplicateTranscript = true;
      if (info.interruptedActiveModel) interruptedByLaterTranscript = true;
      if (info.elEventId != null && elEventId == null) {
        elEventId = info.elEventId;
      }
      transcriptIsFinal = true;
      return markOnce("brainAcceptedAt", "brain_accepted", {
        transcriptKind: "final",
        duplicateTranscript,
        interruptedByLaterTranscript,
        historyTurns: historyTurns == null ? "(none)" : historyTurns,
        elEventId: elEventId == null ? "(none)" : elEventId,
        hadElFinal: marks.finalElTranscriptAt != null,
      });
    },

    markModelStarted() {
      return markOnce("modelStartedAt", "model_started");
    },

    markFirstModelToken() {
      return markOnce("firstModelTokenAt", "first_model_token", {
        responseChunkCount: responseChunkCount + 1,
      });
    },

    noteResponseChunk() {
      responseChunkCount += 1;
      if (responseChunkCount === 1) this.markFirstModelToken();
    },

    markModelCompleted() {
      return markOnce("modelCompletedAt", "model_completed", {
        responseChunkCount,
        aborted: false,
      });
    },

    markResponseSentToEl() {
      return markOnce("responseSentToElAt", "response_sent_to_el", {
        responseChunkCount,
      });
    },

    markFirstElAudio() {
      return markOnce("firstElAudioAt", "first_el_audio");
    },

    markFirstTwilioAudio() {
      return markOnce("firstTwilioAudioAt", "first_twilio_audio");
    },

    /**
     * @param {"completed"|"aborted"} status
     * @param {string|null} [reason]
     * @param {{ supersededByTurnId?: string|null, supersededByStage?: string|null }} [extra]
     */
    markEnded(status, reason = null, extra = {}) {
      if (ended) return false;
      ended = true;
      endStatus = status === "aborted" ? "aborted" : "completed";
      if (reason) abortReason = String(reason);
      if (extra.supersededByTurnId) {
        supersededByTurnId = String(extra.supersededByTurnId);
      }
      if (extra.supersededByStage) {
        supersededByStage = String(extra.supersededByStage);
      }
      marks.endedAt = now();
      log(
        "turn_latency",
        formatFields({
          ...summaryFields(),
          stage: endStatus === "aborted" ? "turn_aborted" : "turn_completed",
          atMs: marks.endedAt,
        })
      );
      return true;
    },

    markAborted(reason, extra = {}) {
      return this.markEnded("aborted", reason || "aborted", extra);
    },

    markCompleted() {
      return this.markEnded("completed");
    },

    /** Snapshot for tests — never includes transcript text. */
    toSafeSummary() {
      return summaryFields();
    },
  };
}

/**
 * Per-callSid coordinator so media-bridge and brain WS share one turn ID.
 * @param {string} callSid
 * @param {{ now?: () => number, log?: (event: string, detail?: string) => void }} [options]
 */
function getCallLatencyCoord(callSid, options = {}) {
  const key = String(callSid || "").trim() || "(none)";
  let coord = coordsByCallSid.get(key);
  if (coord) {
    if (options.log) coord.log = options.log;
    if (options.now) coord.now = options.now;
    return coord;
  }

  coord = {
    callSid: key,
    log: typeof options.log === "function" ? options.log : () => {},
    now: typeof options.now === "function" ? options.now : () => Date.now(),
    listeningForCallerAudio: false,
    activeTurn: null,
    lastFingerprint: null,
    lastElEventId: null,
    /** @type {Map<string, object>} */
    turnsByElEventId: new Map(),
    turnCount: 0,

    armCallerAudio() {
      this.listeningForCallerAudio = true;
    },

    /**
     * Best-effort: first Twilio media frame after arming.
     * Continuous μ-law includes silence; this marks frame receipt, not VAD.
     */
    onInboundCallerAudio() {
      if (!this.listeningForCallerAudio) return this.activeTurn;
      this.listeningForCallerAudio = false;
      const turn = this.ensureActiveTurn();
      turn.markFirstCallerAudio();
      return turn;
    },

    ensureActiveTurn() {
      if (this.activeTurn && !this.activeTurn.ended) return this.activeTurn;
      return this.startNewTurn();
    },

    startNewTurn() {
      this.turnCount += 1;
      this.activeTurn = createTurnLatencyTracker({
        callSid: this.callSid,
        turnId: createTurnId(this.now),
        now: this.now,
        log: this.log,
      });
      return this.activeTurn;
    },

    bindElEventId(turn, eventId) {
      if (eventId == null || !turn) return;
      const key = String(eventId);
      const existing = this.turnsByElEventId.get(key);
      if (existing && existing.turnId !== turn.turnId) {
        this.log(
          "turn_latency",
          formatFields({
            callSid: this.callSid,
            stage: "el_event_id_collision",
            elEventId: key,
            existingTurnId: existing.turnId,
            ignoredTurnId: turn.turnId,
          })
        );
        return;
      }
      this.turnsByElEventId.set(key, turn);
    },

    /**
     * Resolve which turn an EL conversation-WS transcript belongs to.
     * Never attaches a known eventId to a different turn.
     * @param {{ isFinal: boolean, eventId?: string|number|null }} info
     */
    onElTranscript(info) {
      const eventId = info && info.eventId != null ? info.eventId : null;
      const eventKey = eventId == null ? null : String(eventId);
      const duplicate =
        eventKey != null &&
        this.lastElEventId != null &&
        eventKey === String(this.lastElEventId);

      if (eventKey != null) {
        const bound = this.turnsByElEventId.get(eventKey);
        if (bound) {
          if (eventId != null) this.lastElEventId = eventId;
          bound.markElTranscript({
            isFinal: Boolean(info && info.isFinal),
            eventId,
            duplicate: true,
          });
          return bound;
        }
      }

      // Prefer the open turn that already accepted this utterance on the brain
      // path (conversation-WS final often arrives after brain_accepted).
      let turn = null;
      if (
        this.activeTurn &&
        !this.activeTurn.ended &&
        this.activeTurn.marks.brainAcceptedAt != null &&
        this.activeTurn.marks.finalElTranscriptAt == null &&
        (this.activeTurn.elEventId == null ||
          eventKey == null ||
          String(this.activeTurn.elEventId) === eventKey)
      ) {
        turn = this.activeTurn;
      } else if (
        this.activeTurn &&
        !this.activeTurn.ended &&
        this.activeTurn.marks.brainAcceptedAt == null
      ) {
        turn = this.activeTurn;
      } else if (
        this.activeTurn &&
        !this.activeTurn.ended &&
        this.activeTurn.elEventId != null &&
        eventKey != null &&
        String(this.activeTurn.elEventId) === eventKey
      ) {
        turn = this.activeTurn;
      } else {
        // Do not invent a new turn for a late/orphan conversation-WS final when
        // the active turn already finished — log against a detached tracker.
        if (
          Boolean(info && info.isFinal) &&
          this.activeTurn &&
          this.activeTurn.ended
        ) {
          const orphan = createTurnLatencyTracker({
            callSid: this.callSid,
            turnId: createTurnId(this.now),
            now: this.now,
            log: this.log,
          });
          orphan.markElTranscript({
            isFinal: true,
            eventId,
            duplicate,
          });
          orphan.markAborted("orphan_el_transcript_after_turn_ended", {
            supersededByTurnId: this.activeTurn.turnId,
            supersededByStage: "prior_turn_already_ended",
          });
          if (eventKey != null) this.turnsByElEventId.set(eventKey, orphan);
          if (eventId != null) this.lastElEventId = eventId;
          return orphan;
        }
        turn = this.ensureActiveTurn();
      }

      if (eventId != null) this.lastElEventId = eventId;
      this.bindElEventId(turn, eventId);
      turn.markElTranscript({
        isFinal: Boolean(info && info.isFinal),
        eventId,
        duplicate,
      });
      return turn;
    },

    /**
     * Brain WS final transcript. Continues the open media-side turn when that
     * turn has not yet been brain-accepted (same utterance).
     * @param {Array<{role?: string, content?: string}>} transcript
     * @param {{ elEventId?: string|number|null }} [meta]
     */
    onBrainTranscript(transcript, meta = {}) {
      const fp = transcriptFingerprint(transcript);
      const duplicate = fingerprintsEqual(this.lastFingerprint, fp);
      this.lastFingerprint = fp;
      const prior = this.activeTurn;
      const metaEventId = meta.elEventId;

      // Same EL event ID always continues its bound turn when still open.
      if (metaEventId != null) {
        const bound = this.turnsByElEventId.get(String(metaEventId));
        if (bound && !bound.ended) {
          this.activeTurn = bound;
          bound.markBrainAccepted({
            historyTurns: fp.historyTurns,
            duplicate,
            interruptedActiveModel: false,
            elEventId: metaEventId,
          });
          return bound;
        }
      }

      const priorOpen = Boolean(prior && !prior.ended);
      const priorAwaitingBrain =
        priorOpen && prior.marks.brainAcceptedAt == null;
      const priorGenerating =
        priorOpen &&
        prior.marks.modelStartedAt != null &&
        prior.marks.modelCompletedAt == null;
      const priorAlreadyAccepted =
        priorOpen && prior.marks.brainAcceptedAt != null;

      // Continue the media-started turn for this same utterance.
      if (priorAwaitingBrain) {
        prior.markBrainAccepted({
          historyTurns: fp.historyTurns,
          duplicate,
          interruptedActiveModel: false,
          elEventId: metaEventId,
        });
        if (metaEventId != null) this.bindElEventId(prior, metaEventId);
        return prior;
      }

      // New brain transcript while model is in flight → interrupt.
      if (priorGenerating) {
        const next = this.startNewTurn();
        prior.markAborted("interrupted_by_later_transcript", {
          supersededByTurnId: next.turnId,
          supersededByStage: "brain_accepted",
        });
        this.activeTurn = next;
        next.markBrainAccepted({
          historyTurns: fp.historyTurns,
          duplicate,
          interruptedActiveModel: true,
          elEventId: metaEventId,
        });
        if (metaEventId != null) this.bindElEventId(next, metaEventId);
        return next;
      }

      // New utterance after brain already accepted (or prior ended).
      if (priorAlreadyAccepted) {
        const next = this.startNewTurn();
        prior.markAborted("superseded", {
          supersededByTurnId: next.turnId,
          supersededByStage: "brain_accepted",
        });
        this.activeTurn = next;
        next.markBrainAccepted({
          historyTurns: fp.historyTurns,
          duplicate,
          interruptedActiveModel: false,
          elEventId: metaEventId,
        });
        if (metaEventId != null) this.bindElEventId(next, metaEventId);
        return next;
      }

      if (prior && prior.ended) {
        this.activeTurn = null;
      }

      const turn = this.ensureActiveTurn();
      turn.markBrainAccepted({
        historyTurns: fp.historyTurns,
        duplicate,
        interruptedActiveModel: false,
        elEventId: metaEventId,
      });
      if (metaEventId != null) this.bindElEventId(turn, metaEventId);
      return turn;
    },

    getActiveTurn() {
      if (this.activeTurn && !this.activeTurn.ended) return this.activeTurn;
      return null;
    },

    /**
     * Outbound agent audio belongs to the active turn only after a response
     * was sent (skips greeting TTS before any caller turn).
     */
    onOutboundElAudio() {
      const turn = this.getActiveTurn();
      if (!turn) return null;
      if (
        turn.marks.responseSentToElAt == null &&
        turn.marks.modelStartedAt == null
      ) {
        return null;
      }
      turn.markFirstElAudio();
      return turn;
    },

    onTwilioAudioForwarded() {
      const turn = this.getActiveTurn();
      if (!turn) return null;
      if (
        turn.marks.firstElAudioAt == null &&
        turn.marks.responseSentToElAt == null
      ) {
        return null;
      }
      const first = turn.markFirstTwilioAudio();
      if (first && turn.marks.modelCompletedAt != null) {
        turn.markCompleted();
        this.armCallerAudio();
      }
      return turn;
    },

    clear() {
      if (this.activeTurn && !this.activeTurn.ended) {
        this.activeTurn.markAborted("call_closed");
      }
      coordsByCallSid.delete(this.callSid);
    },
  };

  coordsByCallSid.set(key, coord);
  return coord;
}

function clearAllCallLatencyCoords() {
  coordsByCallSid.clear();
  turnSeq = 0;
}

module.exports = {
  createTurnId,
  createTurnLatencyTracker,
  getCallLatencyCoord,
  clearAllCallLatencyCoords,
  transcriptFingerprint,
  fingerprintsEqual,
  elapsedMs,
  formatFields,
};
