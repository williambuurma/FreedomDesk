"use strict";

/**
 * Twilio Voice webhooks — inbound answer + Gather callback.
 * Phone Experience V1: generative Aly voice, natural greeting, intent-aware close.
 * Completed speech lands in the existing processCallTranscript spine.
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

/**
 * Validate Twilio signature when TWILIO_AUTH_TOKEN is configured.
 * Skips validation in local/dev when token is absent (enables curl tests).
 */
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

async function loadVoiceHelpers() {
  const telephony = await import("../src/telephony/index.ts");
  return telephony;
}

function sayOpts(helpers) {
  return helpers.alySayOptions();
}

/**
 * POST /api/twilio/voice/inbound
 * Aly greets and Gathers the caller's reason for calling.
 */
async function handleInboundVoice(req, res) {
  const auth = validateTwilioSignature(req);
  if (!auth.ok) {
    rejectUnauthorized(res, auth.reason);
    return;
  }

  const helpers = await loadVoiceHelpers();
  const config = helpers.loadPracticeVoiceConfig();
  const greeting = helpers.selectGreeting(config);
  const gatherUrl = absoluteUrl(req, "/api/twilio/voice/gather");
  const voice = sayOpts(helpers);

  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: ["speech", "dtmf"],
    action: gatherUrl,
    method: "POST",
    language: "en-US",
    speechTimeout: "auto",
    timeout: 8,
    numDigits: 1,
    actionOnEmptyResult: true,
    hints: helpers.DENTAL_SPEECH_HINTS,
  });
  gather.say(voice, greeting);

  // Soft retry once — then polite hangup (no robotic "call back" loop).
  const retry = twiml.gather({
    input: ["speech", "dtmf"],
    action: gatherUrl,
    method: "POST",
    language: "en-US",
    speechTimeout: "auto",
    timeout: 7,
    numDigits: 1,
    actionOnEmptyResult: true,
    hints: helpers.DENTAL_SPEECH_HINTS,
  });
  retry.say(voice, helpers.composeMissedInputPrompt(config));
  twiml.say(voice, helpers.composeEmptyHangup());

  sendTwiml(res, twiml);
}

/**
 * POST /api/twilio/voice/gather
 * Build transcript → processCallTranscript → persist latest actionable call.
 */
async function handleGatherVoice(req, res, options = {}) {
  const auth = validateTwilioSignature(req);
  if (!auth.ok) {
    rejectUnauthorized(res, auth.reason);
    return;
  }

  const body = req.body || {};
  const callSid = String(body.CallSid || options.callSid || `local_${Date.now()}`);
  const speechResult = String(body.SpeechResult || options.speechResult || "").trim();
  const digits = String(body.Digits || options.digits || "").trim();
  const from = String(body.From || options.from || "").trim();

  const helpers = await loadVoiceHelpers();
  const voice = sayOpts(helpers);
  const twiml = new VoiceResponse();

  if (!speechResult && !digits) {
    twiml.say(voice, helpers.composeEmptyHangup());
    twiml.hangup();
    sendTwiml(res, twiml);
    return;
  }

  try {
    const transcript = helpers.buildTranscriptFromGather({
      callSid,
      speechResult,
      digits,
      from,
    });

    if (!transcript) {
      twiml.say(voice, helpers.composeEmptyHangup());
      twiml.hangup();
      sendTwiml(res, twiml);
      return;
    }

    const artifact = helpers.completeCallFromTranscript(transcript, {
      source: options.source || "twilio_inbound_gather",
      resetRegistries: options.resetRegistries !== false,
    });

    writeLatestActionableCall(artifact, options.storePath);

    // Log call SID only — never auth tokens or full caller numbers.
    console.log(
      `Inbound call completed: callSid=${callSid} callId=${artifact.callId} intent=${artifact.intent}`
    );

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
    });
    twiml.say(voice, closing);
    twiml.hangup();
    sendTwiml(res, twiml);
  } catch (err) {
    console.error(
      "Gather callback failed:",
      err && err.message ? err.message : "unknown_error"
    );
    twiml.say(
      voice,
      "Thanks for calling. Someone from our office will follow up with you. Take care."
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
