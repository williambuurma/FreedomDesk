"use strict";

/**
 * Twilio Voice webhooks — inbound answer + adaptive multi-turn Gather loop.
 * Completes only when the call is actionable (or emergency escalation).
 * Closing claims "shared with the team" only after Today persist succeeds.
 */

const twilio = require("twilio");
const {
  writeLatestActionableCall,
} = require("./latest-call-store");

const VoiceResponse = twilio.twiml.VoiceResponse;

function publicBaseUrl() {
  const raw = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  return raw;
}

function absoluteUrl(req, pathname) {
  const base = publicBaseUrl();
  if (base) return `${base}${pathname}`;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "127.0.0.1";
  return `${proto}://${host}${pathname}`;
}

function twilioAuthToken() {
  return (process.env.TWILIO_AUTH_TOKEN || "").trim();
}

function validateTwilioSignature(req) {
  const authToken = twilioAuthToken();
  if (!authToken) {
    return { ok: true, skipped: true };
  }

  const signature = req.headers["x-twilio-signature"];
  if (!signature) {
    return { ok: false, skipped: false, reason: "missing_signature" };
  }

  const url = absoluteUrl(req, req.originalUrl || req.url);
  const params = req.body && typeof req.body === "object" ? req.body : {};
  const ok = twilio.validateRequest(authToken, signature, url, params);
  return { ok, skipped: false, reason: ok ? undefined : "invalid_signature" };
}

function rejectUnauthorized(res, reason) {
  res.statusCode = 403;
  res.setHeader("Content-Type", "text/plain");
  res.end(`Forbidden: ${reason || "invalid_signature"}`);
}

function sendTwiml(res, twiml) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.end(twiml.toString());
}

function logTwilioWebhook(route, req, turnHint, extra) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const callSid = body.CallSid || "(none)";
  const speech =
    body.SpeechResult !== undefined && body.SpeechResult !== ""
      ? String(body.SpeechResult)
      : "(none)";
  const turn =
    turnHint !== undefined && turnHint !== null
      ? String(turnHint)
      : body.SpeechResult
        ? "gather"
        : "inbound";
  const suffix = extra ? ` ${extra}` : "";
  console.log(
    `[twilio-webhook] ${new Date().toISOString()} route=${route} CallSid=${callSid} SpeechResult=${JSON.stringify(speech)} turn=${turn}${suffix}`
  );
}

function msSince(startHr) {
  const [s, n] = process.hrtime(startHr);
  return Math.round(s * 1000 + n / 1e6);
}

async function loadVoiceHelpers() {
  const telephony = await import("../src/telephony/index.ts");
  return telephony;
}

function sayOpts(helpers) {
  return helpers.alySayOptions();
}

function say(twimlOrGather, helpers, text) {
  const opts = sayOpts(helpers);
  const speech = helpers.wrapAlySpeech(text);
  twimlOrGather.say(opts, speech);
}

function gatherAttrs(helpers, gatherUrl) {
  return {
    input: ["speech", "dtmf"],
    action: gatherUrl,
    method: "POST",
    language: "en-US",
    // Slightly snappier end-of-speech without cutting off dental phrases.
    speechTimeout: "1",
    timeout: 5,
    numDigits: 1,
    actionOnEmptyResult: true,
    bargeIn: true,
    hints: helpers.DENTAL_SPEECH_HINTS,
  };
}

async function handleInboundVoice(req, res) {
  const t0 = process.hrtime();
  logTwilioWebhook("/api/twilio/voice/inbound", req, "inbound", "event=received");

  const auth = validateTwilioSignature(req);
  if (!auth.ok) {
    console.log(
      `[twilio-webhook] ${new Date().toISOString()} route=/api/twilio/voice/inbound REJECTED reason=${auth.reason}`
    );
    rejectUnauthorized(res, auth.reason);
    return;
  }

  const helpers = await loadVoiceHelpers();
  const config = helpers.loadPracticeVoiceConfig();
  const greeting = helpers.selectGreeting(config);
  const gatherUrl = absoluteUrl(req, "/api/twilio/voice/gather");

  const twiml = new VoiceResponse();
  const gather = twiml.gather(gatherAttrs(helpers, gatherUrl));
  say(gather, helpers, greeting);

  const retry = twiml.gather(gatherAttrs(helpers, gatherUrl));
  say(retry, helpers, helpers.composeMissedInputPrompt(config));
  say(twiml, helpers, helpers.composeEmptyHangup());

  sendTwiml(res, twiml);
  console.log(
    `[twilio-timing] route=/api/twilio/voice/inbound twiml_ms=${msSince(t0)}`
  );
}

async function handleGatherVoice(req, res, options = {}) {
  const t0 = process.hrtime();
  const body = req.body || {};
  const callSid = String(body.CallSid || options.callSid || `local_${Date.now()}`);

  let helpers;
  try {
    helpers = await loadVoiceHelpers();
  } catch (err) {
    console.error("Failed to load voice helpers:", err && err.message);
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Joanna-Generative", language: "en-US" },
      "Thanks for calling. Please try us again in a moment."
    );
    twiml.hangup();
    sendTwiml(res, twiml);
    return;
  }

  const existing = helpers.getCallSession(callSid);
  const turn = existing ? existing.followUpsAsked + 1 : 1;
  logTwilioWebhook(
    "/api/twilio/voice/gather",
    req,
    turn,
    `event=speech_received`
  );

  const auth = validateTwilioSignature(req);
  if (!auth.ok) {
    console.log(
      `[twilio-webhook] ${new Date().toISOString()} route=/api/twilio/voice/gather REJECTED reason=${auth.reason}`
    );
    rejectUnauthorized(res, auth.reason);
    return;
  }

  const speechResult = String(body.SpeechResult || options.speechResult || "").trim();
  const digits = String(body.Digits || options.digits || "").trim();
  const from = String(body.From || options.from || "").trim();
  const gatherUrl = absoluteUrl(req, "/api/twilio/voice/gather");
  const twiml = new VoiceResponse();

  if (!speechResult && !digits) {
    helpers.clearCallSession(callSid);
    say(twiml, helpers, helpers.composeEmptyHangup());
    twiml.hangup();
    sendTwiml(res, twiml);
    return;
  }

  try {
    const session = helpers.createOrUpdateSession({
      callSid,
      speechResult,
      digits,
      from,
    });

    if (!session) {
      say(twiml, helpers, helpers.composeEmptyHangup());
      twiml.hangup();
      sendTwiml(res, twiml);
      return;
    }

    const transcript = helpers.sessionToTranscript(session);

    // Mid-turn: light analysis only (no Practice Brain / PIE) — major latency win.
    const tAnalyze = process.hrtime();
    const analysis = helpers.analyzeTranscriptTurns(
      transcript.turns,
      session.afterHours
    );
    console.log(
      `[twilio-timing] CallSid=${callSid} analysis_ms=${msSince(tAnalyze)} turn=${turn}`
    );

    const nextAsk = helpers.selectNextAsk(session, analysis);

    if (nextAsk) {
      helpers.appendAlyAsk(session, nextAsk);
      const gather = twiml.gather(gatherAttrs(helpers, gatherUrl));
      say(gather, helpers, nextAsk.question);
      sendTwiml(res, twiml);
      console.log(
        `[twilio-timing] CallSid=${callSid} twiml_ms=${msSince(t0)} phase=ask field=${nextAsk.field}`
      );
      return;
    }

    // Complete only when actionable (or emergency). Persist BEFORE claiming handoff.
    const tComplete = process.hrtime();
    let artifact;
    try {
      artifact = helpers.completeCallFromTranscript(transcript, {
        source: options.source || "twilio_inbound_gather",
        resetRegistries: options.resetRegistries !== false,
      });
      writeLatestActionableCall(artifact, options.storePath);
    } catch (persistErr) {
      console.error(
        "Call persist failed:",
        persistErr && persistErr.message ? persistErr.message : persistErr
      );
      say(twiml, helpers, helpers.composePersistFailureClosing());
      twiml.hangup();
      sendTwiml(res, twiml);
      helpers.clearCallSession(callSid);
      console.log(
        `[twilio-timing] CallSid=${callSid} twiml_ms=${msSince(t0)} phase=persist_failed`
      );
      return;
    }

    console.log(
      `[twilio-timing] CallSid=${callSid} complete_ms=${msSince(tComplete)}`
    );

    helpers.clearCallSession(callSid);

    console.log(
      `Inbound call completed: callSid=${callSid} callId=${artifact.callId} intent=${artifact.intent} turns=${session.turns.length}`
    );

    const lifeThreatening =
      helpers.hasLifeThreateningLanguage(
        session.turns
          .filter((t) => t.speaker === "patient" || t.speaker === "caller")
          .map((t) => t.text)
          .join(" ")
      ) || session.slots.breathingOk === false;

    const closing = helpers.composeClosing({
      intent: artifact.intent,
      urgency: artifact.urgency,
      afterHours: Boolean(artifact.callSummary && artifact.callSummary.afterHours),
      sameDayEmergency: Boolean(
        artifact.callSummary && artifact.callSummary.sameDayEmergency
      ),
      chiefConcern:
        artifact.operatingIntelligence &&
        artifact.operatingIntelligence.chiefConcern,
      lifeThreatening,
      routingAction: analysis.triage.routingAction,
    });
    say(twiml, helpers, closing);
    twiml.hangup();
    sendTwiml(res, twiml);
    console.log(
      `[twilio-timing] CallSid=${callSid} twiml_ms=${msSince(t0)} phase=complete`
    );
  } catch (err) {
    console.error(
      "Gather callback failed:",
      err && err.message ? err.message : "unknown_error"
    );
    say(
      twiml,
      helpers,
      "Thanks for calling. Please try us again if you need help. Take care."
    );
    twiml.hangup();
    sendTwiml(res, twiml);
  }
}

module.exports = {
  absoluteUrl,
  validateTwilioSignature,
  handleInboundVoice,
  handleGatherVoice,
};
