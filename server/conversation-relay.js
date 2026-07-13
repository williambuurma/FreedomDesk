"use strict";

/**
 * ConversationRelay transport — Amber King (ElevenLabs) via Twilio.
 * FreedomDesk owns dialogue. Feature-flagged; Gather/Say remains the rollback path.
 */

const twilio = require("twilio");
const { WebSocketServer } = require("ws");
const {
  writeLatestActionableCall,
} = require("./latest-call-store");

/** Canonical Aly voice — Amber King (ElevenLabs). */
const DEFAULT_VOICE_ID = "F89WkXaQbUlVyNvtlD3X";
const DEFAULT_VOICE_NAME = "Amber King";
const DEFAULT_TTS_PROVIDER = "ElevenLabs";
const DEFAULT_VOICE_MODEL = "flash_v2_5";
const DEFAULT_VOICE_SPEED = "0.97";
const DEFAULT_VOICE_STABILITY = "0.40";
const DEFAULT_VOICE_SIMILARITY = "0.88";
/** Conservative low-latency EOT (ms); within Twilio's 600–5000 range. */
const DEFAULT_SPEECH_TIMEOUT_MS = "1200";
const WS_PATH = "/api/twilio/voice/conversation";
const STATUS_PATH = "/api/twilio/voice/conversation-status";

/** @type {Map<string, { persisted: boolean, ended: boolean, from: string }>} */
const relayCallMeta = new Map();

function useConversationRelay() {
  return (
    String(process.env.PHONE_VOICE_TRANSPORT || "")
      .trim()
      .toLowerCase() === "conversation_relay"
  );
}

function envOrDefault(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  return raw || fallback;
}

function conversationRelayVoiceId() {
  return envOrDefault("CONVERSATION_RELAY_VOICE_ID", DEFAULT_VOICE_ID);
}

function conversationRelayVoiceModel() {
  return envOrDefault("CONVERSATION_RELAY_VOICE_MODEL", DEFAULT_VOICE_MODEL);
}

function conversationRelayVoiceSpeed() {
  return envOrDefault("CONVERSATION_RELAY_VOICE_SPEED", DEFAULT_VOICE_SPEED);
}

function conversationRelayVoiceStability() {
  return envOrDefault(
    "CONVERSATION_RELAY_VOICE_STABILITY",
    DEFAULT_VOICE_STABILITY
  );
}

function conversationRelayVoiceSimilarity() {
  return envOrDefault(
    "CONVERSATION_RELAY_VOICE_SIMILARITY",
    DEFAULT_VOICE_SIMILARITY
  );
}

function conversationRelayTtsProvider() {
  return envOrDefault("CONVERSATION_RELAY_TTS_PROVIDER", DEFAULT_TTS_PROVIDER);
}

/**
 * Twilio ConversationRelay voice attribute:
 * {voiceId}-{model}-{speed}_{stability}_{similarity}
 * Example: F89WkXaQbUlVyNvtlD3X-flash_v2_5-0.97_0.40_0.88
 */
function conversationRelayVoiceAttribute() {
  return (
    `${conversationRelayVoiceId()}-${conversationRelayVoiceModel()}-` +
    `${conversationRelayVoiceSpeed()}_${conversationRelayVoiceStability()}_` +
    `${conversationRelayVoiceSimilarity()}`
  );
}

/**
 * Plain spoken text for ElevenLabs Flash — no Polly SSML, no bracketed stage directions.
 * Sends each Aly line as one complete utterance (not word-streamed).
 */
function sanitizeRelaySpeech(text) {
  return String(text || "")
    .replace(/<\/?speak[^>]*>/gi, "")
    .replace(/<\/?prosody[^>]*>/gi, "")
    .replace(/<\/?break[^>]*\/?>/gi, " ")
    .replace(/<\/?phoneme[^>]*>/gi, "")
    .replace(/\[[^\]]{1,40}\]/g, "")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function publicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
}

function absoluteUrl(req, pathname) {
  const base = publicBaseUrl();
  if (base) return `${base}${pathname}`;
  const proto =
    firstHeaderValue(req.headers["x-forwarded-proto"]) ||
    req.protocol ||
    "http";
  const host =
    firstHeaderValue(req.headers["x-forwarded-host"]) ||
    firstHeaderValue(req.headers.host) ||
    "127.0.0.1";
  return `${proto}://${host}${pathname}`;
}

function conversationRelayWsUrl(req) {
  const httpsUrl = absoluteUrl(req, WS_PATH);
  return httpsUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
}

function twilioAuthToken() {
  return String(process.env.TWILIO_AUTH_TOKEN || "").trim();
}

function firstHeaderValue(value) {
  if (value == null || value === "") return "";
  return String(value).split(",")[0].trim();
}

function httpSchemeToWs(scheme) {
  const s = String(scheme || "").toLowerCase();
  if (s === "https") return "wss";
  if (s === "http") return "ws";
  if (s === "wss" || s === "ws") return s;
  return "wss";
}

/**
 * Twilio signs the ConversationRelay WebSocket URL as wss:// (not https://).
 * Query string values are signed as params (empty body), not as a POST form.
 */
function buildWebSocketValidationTarget(req) {
  const rawUrl = String(req.url || WS_PATH);
  const qIdx = rawUrl.indexOf("?");
  const pathOnly = (qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl) || WS_PATH;
  const search = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : "";
  const params = {};
  if (search) {
    const usp = new URLSearchParams(search);
    for (const [key, value] of usp.entries()) {
      if (!(key in params)) params[key] = value;
    }
  }

  const headers = req.headers || {};
  const requestHost = firstHeaderValue(headers.host);
  const forwardedHost = firstHeaderValue(headers["x-forwarded-host"]);
  const forwardedProto = firstHeaderValue(headers["x-forwarded-proto"]);

  const base = publicBaseUrl();
  let validationUrl;
  if (base) {
    // PUBLIC_BASE_URL is https://… — Twilio signed the TwiML wss:// equivalent.
    validationUrl =
      base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:") + pathOnly;
  } else {
    const host = forwardedHost || requestHost || "127.0.0.1";
    const scheme = httpSchemeToWs(forwardedProto || "https");
    validationUrl = `${scheme}://${host}${pathOnly}`;
  }

  return {
    validationUrl,
    params,
    hasQuery: search.length > 0,
    requestHost,
    forwardedHost,
    forwardedProto,
    reqUrl: rawUrl,
  };
}

function shouldLogSignatureDebug() {
  if (process.env.CONVERSATION_RELAY_DEBUG_SIGNATURE === "0") return false;
  if (process.env.CONVERSATION_RELAY_DEBUG_SIGNATURE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * Validate X-Twilio-Signature for HTTP webhooks or WebSocket upgrade.
 */
function validateTwilioSignatureForUrl(signature, url, params) {
  const authToken = twilioAuthToken();
  if (!authToken) {
    return { ok: true, skipped: true };
  }
  if (!signature) {
    return { ok: false, skipped: false, reason: "missing_signature" };
  }
  const ok = twilio.validateRequest(
    authToken,
    signature,
    url,
    params && typeof params === "object" ? params : {}
  );
  return { ok, skipped: false, reason: ok ? undefined : "invalid_signature" };
}

function validateWebSocketUpgrade(req) {
  const headers = req.headers || {};
  const signature =
    headers["x-twilio-signature"] || headers["X-Twilio-Signature"] || "";
  const target = buildWebSocketValidationTarget(req);

  if (shouldLogSignatureDebug()) {
    safeRelayLog(
      "ws_sig_debug",
      "(none)",
      `validationUrl=${target.validationUrl} host=${target.requestHost || "(none)"} forwardedHost=${target.forwardedHost || "(none)"} forwardedProto=${target.forwardedProto || "(none)"} reqUrl=${JSON.stringify(target.reqUrl)} hasQuery=${target.hasQuery} signaturePresent=${Boolean(signature)}`
    );
  }

  const result = validateTwilioSignatureForUrl(
    signature,
    target.validationUrl,
    target.params
  );
  if (!result.ok && shouldLogSignatureDebug()) {
    safeRelayLog(
      "ws_sig_debug",
      "(none)",
      `result=reject reason=${result.reason || "invalid_signature"} validationUrl=${target.validationUrl}`
    );
  }
  return Object.assign(result, { validationUrl: target.validationUrl });
}

function safeRelayLog(event, callSid, extra) {
  const sid = callSid || "(none)";
  const suffix = extra ? ` ${extra}` : "";
  console.log(
    `[conversation-relay] ${new Date().toISOString()} event=${event} CallSid=${sid}${suffix}`
  );
}

function buildConversationRelayTwiml(req, helpers) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const config = helpers.loadPracticeVoiceConfig();
  const greeting = helpers.selectGreeting(config);
  const wsUrl = conversationRelayWsUrl(req);
  const statusUrl = absoluteUrl(req, STATUS_PATH);
  const voice = conversationRelayVoiceAttribute();
  const ttsProvider = conversationRelayTtsProvider();

  const twiml = new VoiceResponse();
  const connect = twiml.connect({
    action: statusUrl,
    method: "POST",
  });
  connect.conversationRelay({
    url: wsUrl,
    ttsProvider,
    voice,
    language: "en-US",
    welcomeGreeting: greeting,
    welcomeGreetingInterruptible: "speech",
    interruptible: "speech",
    interruptSensitivity: "medium",
    reportInputDuringAgentSpeech: "speech",
    ignoreBackchannel: "true",
    speechTimeout: DEFAULT_SPEECH_TIMEOUT_MS,
    hints: helpers.DENTAL_SPEECH_HINTS,
  });

  return twiml;
}

function sendTextToken(ws, token, options = {}) {
  const last = options.last !== false;
  // One complete utterance per message — never word-stream fragments.
  ws.send(
    JSON.stringify({
      type: "text",
      token: sanitizeRelaySpeech(token),
      last,
    })
  );
}

function sendEnd(ws, handoffData) {
  const payload = { type: "end" };
  if (handoffData != null) {
    payload.handoffData =
      typeof handoffData === "string"
        ? handoffData
        : JSON.stringify(handoffData);
  }
  ws.send(JSON.stringify(payload));
}

async function loadVoiceHelpers() {
  return import("../src/telephony/index.ts");
}

async function handleSetup(ws, msg, helpers) {
  const callSid = String(msg.callSid || "").trim();
  const from = String(msg.from || "").trim();
  if (!callSid) {
    safeRelayLog("setup_missing_callsid", "(none)");
    return;
  }
  ws.callSid = callSid;
  helpers.ensureLiveCallSession({ callSid, from });
  relayCallMeta.set(callSid, { persisted: false, ended: false, from });
  safeRelayLog("setup", callSid, "session=ready");
}

async function handleFinalPrompt(ws, msg, helpers, options = {}) {
  const callSid = ws.callSid || String(msg.callSid || "").trim();
  if (!callSid) {
    safeRelayLog("prompt_missing_callsid", "(none)");
    return;
  }

  const voicePrompt = String(msg.voicePrompt || "").trim();
  if (!voicePrompt) {
    safeRelayLog("prompt_empty", callSid);
    return;
  }

  const meta = relayCallMeta.get(callSid) || {
    persisted: false,
    ended: false,
    from: "",
  };
  const from = meta.from || "";

  const session = helpers.createOrUpdateSession({
    callSid,
    speechResult: voicePrompt,
    from,
  });

  if (!session) {
    sendTextToken(ws, helpers.composeEmptyHangup(), { last: true });
    sendEnd(ws, { reason: "empty_session", persisted: false });
    meta.ended = true;
    relayCallMeta.set(callSid, meta);
    return;
  }

  const transcript = helpers.sessionToTranscript(session);
  const analysis = helpers.analyzeTranscriptTurns(
    transcript.turns,
    session.afterHours
  );
  const nextAskRaw = helpers.selectNextAsk(session, analysis);

  if (nextAskRaw) {
    // Hybrid Conversational Aly — planner rephrases; field stays deterministic.
    const nextAsk = helpers.articulateNextAsk
      ? await helpers.articulateNextAsk({
          session,
          analysis,
          nextAsk: nextAskRaw,
        })
      : nextAskRaw;
    helpers.appendAlyAsk(session, nextAsk);
    // Plain spoken text only — no Polly SSML.
    sendTextToken(ws, nextAsk.question, { last: true });
    safeRelayLog(
      "ask",
      callSid,
      `field=${nextAsk.field} tone=${session.tone} postIdentity=${session.postIdentityAsks} reason=${session.lastPolicyReason || "(none)"}`
    );
    return;
  }

  safeRelayLog(
    "completing",
    callSid,
    `tone=${session.tone} postIdentity=${session.postIdentityAsks} softCap=${Boolean(session.routineSoftCapReached)} reason=${session.lastPolicyReason || "(none)"}`
  );
  let artifact = null;
  try {
    artifact = helpers.completeCallFromTranscript(transcript, {
      source: options.source || "twilio_conversation_relay",
      resetRegistries: options.resetRegistries !== false,
    });
    writeLatestActionableCall(artifact, options.storePath);
    meta.persisted = true;
    relayCallMeta.set(callSid, meta);
  } catch (persistErr) {
    safeRelayLog(
      "persist_failed",
      callSid,
      `error=${persistErr && persistErr.message ? persistErr.message : "unknown"}`
    );
    sendTextToken(ws, helpers.composePersistFailureClosing(), { last: true });
    sendEnd(ws, { reason: "persist_failed", persisted: false });
    meta.ended = true;
    relayCallMeta.set(callSid, meta);
    helpers.clearCallSession(callSid);
    return;
  }

  const lifeThreatening =
    helpers.hasLifeThreateningLanguage(
      session.turns
        .filter((t) => t.speaker === "patient" || t.speaker === "caller")
        .map((t) => t.text)
        .join(" ")
    ) || session.slots.breathingOk === false;

  const closingDraft = helpers.composeClosing({
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
    tone: session.tone,
    callerName: session.slots.name,
    locationParts: session.slots.locationParts,
    locationRaw: session.slots.location,
    swelling: session.slots.swelling,
    keptAwake: session.slots.keptAwake,
    wantsEarliest: session.slots.wantsEarliest,
    shortNoticeOk: session.slots.shortNoticeOk,
    persisted: true,
  });

  const closing = helpers.articulateClosing
    ? await helpers.articulateClosing({
        session,
        analysis,
        deterministicClosing: closingDraft,
        persisted: true,
        lifeThreatening,
        callActionable: true,
      })
    : closingDraft;

  sendTextToken(ws, closing, { last: true });
  sendEnd(ws, {
    reason: "completed",
    persisted: true,
    callId: artifact.callId,
    intent: artifact.intent,
  });
  meta.ended = true;
  relayCallMeta.set(callSid, meta);
  helpers.clearCallSession(callSid);
  safeRelayLog(
    "complete",
    callSid,
    `intent=${artifact.intent} persisted=true`
  );
}

function handleInterrupt(ws, msg, helpers) {
  const callSid = ws.callSid || "(none)";
  const duration =
    msg.durationUntilInterruptMs != null
      ? String(msg.durationUntilInterruptMs)
      : "(none)";
  safeRelayLog("interrupt", callSid, `durationMs=${duration}`);

  const session = helpers.getCallSession(callSid);
  if (!session) return;

  const until = String(msg.utteranceUntilInterrupt || "");
  helpers.applyInterruptToSession(session, until || undefined);
  // Slots / facts intentionally retained — do not clear or restart intake.
}

function handleErrorMessage(ws, msg) {
  const callSid = ws.callSid || "(none)";
  const description = String(msg.description || "unknown").slice(0, 120);
  safeRelayLog("error", callSid, `description=${JSON.stringify(description)}`);
}

async function handleRelayMessage(ws, raw, helpers, options = {}) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    safeRelayLog("malformed_json", ws.callSid || "(none)");
    return;
  }

  const type = String(msg.type || "");
  switch (type) {
    case "setup":
      await handleSetup(ws, msg, helpers);
      break;
    case "prompt":
      if (msg.last === false) {
        // Partial / non-final — wait for final prompt.
        safeRelayLog("prompt_partial", ws.callSid || "(none)");
        return;
      }
      await handleFinalPrompt(ws, msg, helpers, options);
      break;
    case "interrupt":
      handleInterrupt(ws, msg, helpers);
      break;
    case "error":
      handleErrorMessage(ws, msg);
      break;
    default:
      safeRelayLog("ignored_type", ws.callSid || "(none)", `type=${type}`);
  }
}

function cleanupSocket(ws, helpers) {
  const callSid = ws.callSid;
  if (!callSid) return;
  const meta = relayCallMeta.get(callSid);
  if (meta && !meta.persisted) {
    safeRelayLog("socket_close_unpersisted", callSid);
  } else {
    safeRelayLog("socket_close", callSid);
  }
  helpers.clearCallSession(callSid);
  relayCallMeta.delete(callSid);
}

/**
 * Attach ConversationRelay WebSocket upgrade handler to an http.Server.
 */
function attachConversationRelayWebSocket(server, options = {}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = String(req.url || "").split("?")[0];
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    const auth = validateWebSocketUpgrade(req);
    if (!auth.ok) {
      safeRelayLog(
        "ws_reject",
        "(none)",
        `reason=${auth.reason || "invalid_signature"}`
      );
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws) => {
    let helpers;
    try {
      helpers = await loadVoiceHelpers();
    } catch (err) {
      safeRelayLog(
        "helpers_load_failed",
        "(none)",
        `error=${err && err.message ? err.message : "unknown"}`
      );
      ws.close();
      return;
    }

    ws.on("message", (data) => {
      handleRelayMessage(ws, data, helpers, options).catch((err) => {
        safeRelayLog(
          "handler_error",
          ws.callSid || "(none)",
          `error=${err && err.message ? err.message : "unknown"}`
        );
      });
    });

    ws.on("close", () => {
      cleanupSocket(ws, helpers);
    });

    ws.on("error", () => {
      safeRelayLog("ws_error", ws.callSid || "(none)");
    });
  });

  return wss;
}

async function handleConversationStatus(req, res) {
  const body = req.body || {};
  const callSid = String(body.CallSid || "").trim();
  const sessionStatus = String(body.SessionStatus || "").trim();
  const meta = callSid ? relayCallMeta.get(callSid) : null;
  const persisted = Boolean(meta && meta.persisted);

  safeRelayLog(
    "status_callback",
    callSid || "(none)",
    `SessionStatus=${sessionStatus || "(none)"} persisted=${persisted}`
  );

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Dropped WS / failed session must not claim completion.
  if (!persisted && /fail|error/i.test(sessionStatus)) {
    twiml.say(
      { voice: "Polly.Joanna-Generative", language: "en-US" },
      "Thank you for calling. Please try us again in a moment if you still need help."
    );
    twiml.hangup();
  }
  // Otherwise Connect completed (or ended after our `end` message) — empty response.

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.end(twiml.toString());

  if (callSid) {
    relayCallMeta.delete(callSid);
  }
}

function resetRelayMetaForTests() {
  relayCallMeta.clear();
}

function getRelayMetaForTests(callSid) {
  return relayCallMeta.get(callSid);
}

module.exports = {
  WS_PATH,
  STATUS_PATH,
  DEFAULT_VOICE_ID,
  DEFAULT_VOICE_NAME,
  DEFAULT_VOICE_MODEL,
  DEFAULT_VOICE_SPEED,
  DEFAULT_VOICE_STABILITY,
  DEFAULT_VOICE_SIMILARITY,
  DEFAULT_SPEECH_TIMEOUT_MS,
  useConversationRelay,
  conversationRelayVoiceId,
  conversationRelayVoiceModel,
  conversationRelayVoiceSpeed,
  conversationRelayVoiceStability,
  conversationRelayVoiceSimilarity,
  conversationRelayVoiceAttribute,
  conversationRelayTtsProvider,
  sanitizeRelaySpeech,
  conversationRelayWsUrl,
  buildWebSocketValidationTarget,
  validateTwilioSignatureForUrl,
  validateWebSocketUpgrade,
  buildConversationRelayTwiml,
  attachConversationRelayWebSocket,
  handleConversationStatus,
  handleRelayMessage,
  handleSetup,
  handleFinalPrompt,
  handleInterrupt,
  sendTextToken,
  sendEnd,
  resetRelayMetaForTests,
  getRelayMetaForTests,
  relayCallMeta,
};
