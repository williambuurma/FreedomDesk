/**
 * Speech Engine transport — Twilio Media Streams bridge + ElevenLabs brain WS.
 *
 * Official path (ElevenLabs docs):
 * Custom LLM Twilio integration via Speech Engine SDK
 * https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/custom-llm-integration
 *
 * Parallel to ConversationRelay. Enabled only when
 * PHONE_VOICE_TRANSPORT=elevenlabs_speech_engine.
 */

"use strict";

const { WebSocket, WebSocketServer } = require("ws");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");
const crypto = require("crypto");
const {
  writeLatestActionableCall,
} = require("./latest-call-store");

const MEDIA_STREAM_PATH = "/api/twilio/voice/media-stream";
const BRAIN_WS_PATH = "/api/speech-engine/ws";
const AMBER_KING_VOICE_ID = "F89WkXaQbUlVyNvtlD3X";
const DEFAULT_TTS_MODEL = "eleven_flash_v2";

/** @type {Map<string, object>} conversationId → session state */
const brainSessions = new Map();
/** @type {Map<string, {callSid: string, from: string}>} */
const pendingCallsByStream = new Map();

let attachment = null;
let mediaWss = null;
let elevenClient = null;

function useSpeechEngine() {
  return (
    String(process.env.PHONE_VOICE_TRANSPORT || "")
      .trim()
      .toLowerCase() === "elevenlabs_speech_engine"
  );
}

function envOrDefault(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  return raw || fallback;
}

function speechEngineId() {
  return String(process.env.ELEVENLABS_SPEECH_ENGINE_ID || "").trim();
}

function elevenApiKey() {
  return String(process.env.ELEVENLABS_API_KEY || "").trim();
}

function sharedSecret() {
  return String(process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET || "").trim();
}

function amberVoiceId() {
  return envOrDefault("ELEVENLABS_VOICE_ID", AMBER_KING_VOICE_ID);
}

function ttsModelId() {
  return envOrDefault("ELEVENLABS_TTS_MODEL", DEFAULT_TTS_MODEL);
}

function publicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
}

function firstHeaderValue(value) {
  if (value == null || value === "") return "";
  return String(value).split(",")[0].trim();
}

function absoluteHost(req) {
  const base = publicBaseUrl();
  if (base) {
    try {
      return new URL(base).host;
    } catch {
      // fall through
    }
  }
  return (
    firstHeaderValue(req.headers["x-forwarded-host"]) ||
    firstHeaderValue(req.headers.host) ||
    "127.0.0.1"
  );
}

function mediaStreamWsUrl(req) {
  const base = publicBaseUrl();
  if (base) {
    return `${base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:")}${MEDIA_STREAM_PATH}`;
  }
  const proto = firstHeaderValue(req.headers["x-forwarded-proto"]) || "https";
  const wsProto = proto === "http" ? "ws" : "wss";
  return `${wsProto}://${absoluteHost(req)}${MEDIA_STREAM_PATH}`;
}

function brainWsUrlFromPublicBase() {
  const base = publicBaseUrl();
  if (!base) return "";
  return `${base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:")}${BRAIN_WS_PATH}`;
}

function getElevenClient() {
  const apiKey = elevenApiKey();
  if (!apiKey) return null;
  if (!elevenClient) {
    elevenClient = new ElevenLabsClient({ apiKey });
  }
  return elevenClient;
}

function safeLog(event, detail) {
  const suffix = detail ? ` ${detail}` : "";
  console.log(
    `[speech-engine] ${new Date().toISOString()} event=${event}${suffix}`
  );
}

/**
 * Official Twilio custom-LLM initiation is type-only.
 * Speech Engine additionally allows agent.first_message when
 * overrides.firstMessage=true on the resource (only permitted client override).
 * Do not send tts/voice/dynamic_variables — those are not enabled overrides.
 */
function buildConversationInitiationMessage(options = {}) {
  const message = { type: "conversation_initiation_client_data" };
  const greeting = String(options.greeting || "").trim();
  if (greeting) {
    message.conversation_config_override = {
      agent: { first_message: greeting },
    };
  }
  return message;
}

/**
 * Official audio shape: JSON text frame with Twilio media.payload left as base64.
 * Do not decode μ-law; do not send binary WebSocket frames.
 */
function buildUserAudioChunkMessage(twilioMediaPayloadBase64) {
  return {
    user_audio_chunk: String(twilioMediaPayloadBase64 || ""),
  };
}

function serializeOutboundJson(message) {
  const text = JSON.stringify(message);
  return {
    text,
    opcode: "text",
    byteLength: Buffer.byteLength(text, "utf8"),
  };
}

/**
 * PHI-safe inbound classification for the conversation WebSocket.
 * Never returns transcript text, audio, or secrets.
 */
function classifyElevenLabsInbound(raw, isBinary) {
  if (isBinary) {
    return {
      type: "binary",
      opcode: "binary",
      byteLength: Buffer.isBuffer(raw)
        ? raw.length
        : Buffer.byteLength(String(raw)),
    };
  }
  const byteLength = Buffer.byteLength(
    Buffer.isBuffer(raw) ? raw : String(raw),
    "utf8"
  );
  try {
    const event = JSON.parse(String(raw));
    if (!event || typeof event !== "object") {
      return { type: "non_object", opcode: "text", byteLength };
    }
    if (typeof event.type === "string" && event.type) {
      const type = event.type;
      const meta = { type, opcode: "text", byteLength, event };
      if (type === "conversation_initiation_metadata") {
        const e = event.conversation_initiation_metadata_event || {};
        meta.userInputAudioFormat = e.user_input_audio_format || null;
        meta.agentOutputAudioFormat = e.agent_output_audio_format || null;
        meta.hasConversationId = Boolean(e.conversation_id);
      } else if (type === "error") {
        const e = event.error_event || {};
        meta.errorCode = e.code != null ? e.code : null;
        meta.errorType = e.error_type || null;
        meta.errorReason = e.reason || null;
      } else if (type === "user_transcript" || type === "tentative_user_transcript") {
        meta.isTranscriptEvent = true;
      }
      return meta;
    }
    if (Object.prototype.hasOwnProperty.call(event, "user_audio_chunk")) {
      return { type: "user_audio_chunk", opcode: "text", byteLength };
    }
    return { type: "unknown", opcode: "text", byteLength };
  } catch {
    return { type: "non_json", opcode: "text", byteLength };
  }
}

function isBrainUserTranscriptMessage(msg) {
  return Boolean(
    msg &&
      typeof msg === "object" &&
      msg.type === "user_transcript" &&
      Array.isArray(msg.user_transcript)
  );
}

function loadBrainModule() {
  return import("../src/telephony/speechEngineBrain.ts");
}

/**
 * TwiML: Connect → Stream to local Media Streams bridge.
 */
function buildSpeechEngineTwiml(req) {
  const streamUrl = mediaStreamWsUrl(req);
  const callSid = String((req.body && req.body.CallSid) || "").trim();
  const from = String((req.body && req.body.From) || "").trim();
  if (callSid) {
    pendingCallsByStream.set(callSid, { callSid, from });
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    "<Response><Connect>" +
    `<Stream url="${escapeXml(streamUrl)}">` +
    `<Parameter name="callSid" value="${escapeXml(callSid)}" />` +
    `<Parameter name="from" value="${escapeXml(from)}" />` +
    "</Stream>" +
    "</Connect></Response>"
  );
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function signedConversationUrl() {
  const client = getElevenClient();
  const engineId = speechEngineId();
  if (!client || !engineId) {
    throw new Error("speech_engine_missing_credentials");
  }
  const response =
    await client.conversationalAi.conversations.getSignedUrl({
      agentId: engineId,
    });
  return response.signedUrl;
}

async function openElevenLabsConversation(twilioWs, getStreamSid, meta) {
  const signedUrl = await signedConversationUrl();
  let signedHost = "(unknown)";
  let signedPath = "(unknown)";
  let signedQueryKeys = [];
  let signedAgentIdPrefix = "(none)";
  try {
    const u = new URL(signedUrl);
    signedHost = u.host;
    signedPath = u.pathname;
    signedQueryKeys = [...u.searchParams.keys()];
    const agentId = u.searchParams.get("agent_id") || "";
    signedAgentIdPrefix = agentId ? `${agentId.slice(0, 5)}…` : "(none)";
  } catch {
    // ignore URL parse errors — still attempt connect
  }

  const elWs = new WebSocket(signedUrl);
  await new Promise((resolve, reject) => {
    elWs.once("open", () => resolve());
    elWs.once("error", reject);
  });
  safeLog(
    "el_conversation_open",
    `callSid=${(meta && meta.callSid) || "(none)"} host=${signedHost} path=${signedPath} queryKeys=${signedQueryKeys.join(",")} agentIdPrefix=${signedAgentIdPrefix}`
  );

  const greeting =
    meta && meta.greeting
      ? meta.greeting
      : "Thanks for calling Cascade Family Dentistry. This is Aly. How can I help you?";

  const initMessage = buildConversationInitiationMessage({ greeting });
  const initFrame = serializeOutboundJson(initMessage);
  elWs.send(initFrame.text);
  const initSent = true;
  safeLog(
    "el_init_sent",
    `callSid=${(meta && meta.callSid) || "(none)"} initSent=${initSent} opcode=${initFrame.opcode} byteLength=${initFrame.byteLength} hasFirstMessage=${Boolean(
      initMessage.conversation_config_override &&
        initMessage.conversation_config_override.agent &&
        initMessage.conversation_config_override.agent.first_message
    )} hasVoiceOverride=false hasDynamicVariables=false`
  );

  let outboundAudioFrames = 0;
  let transcriptEventCount = 0;
  let inboundElMessageCount = 0;
  elWs.on("message", (raw, isBinary) => {
    const classified = classifyElevenLabsInbound(raw, isBinary);
    inboundElMessageCount += 1;
    if (classified.isTranscriptEvent) {
      transcriptEventCount += 1;
    }
    if (
      inboundElMessageCount <= 8 ||
      inboundElMessageCount % 25 === 0 ||
      classified.type === "error" ||
      classified.type === "conversation_initiation_metadata"
    ) {
      const formatBits =
        classified.type === "conversation_initiation_metadata"
          ? ` userInputAudioFormat=${classified.userInputAudioFormat || "(none)"} agentOutputAudioFormat=${classified.agentOutputAudioFormat || "(none)"} hasConversationId=${Boolean(classified.hasConversationId)}`
          : "";
      const errorBits =
        classified.type === "error"
          ? ` errorCode=${classified.errorCode ?? "(none)"} errorType=${classified.errorType || "(none)"} errorReason=${classified.errorReason || "(none)"}`
          : "";
      safeLog(
        "el_inbound_type",
        `callSid=${(meta && meta.callSid) || "(none)"} type=${classified.type} opcode=${classified.opcode} byteLength=${classified.byteLength} transcriptEvents=${transcriptEventCount}${formatBits}${errorBits}`
      );
    }

    const event = classified.event;
    if (!event) return;
    const streamSid = getStreamSid();
    if (!streamSid) return;

    if (event.type === "audio") {
      const payload =
        (event.audio_event && event.audio_event.audio_base_64) ||
        event.audio_base_64 ||
        "";
      if (!payload) return;
      outboundAudioFrames += 1;
      if (outboundAudioFrames === 1 || outboundAudioFrames % 50 === 0) {
        safeLog(
          "el_audio_to_twilio",
          `callSid=${(meta && meta.callSid) || "(none)"} frames=${outboundAudioFrames}`
        );
      }
      twilioWs.send(
        JSON.stringify({
          event: "media",
          streamSid,
          media: { payload },
        })
      );
    } else if (event.type === "interruption") {
      // Official barge-in: clear Twilio buffered audio immediately.
      twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
      safeLog(
        "el_interruption",
        `callSid=${(meta && meta.callSid) || "(none)"}`
      );
    } else if (event.type === "ping") {
      const pong = serializeOutboundJson({
        type: "pong",
        event_id: event.ping_event && event.ping_event.event_id,
      });
      elWs.send(pong.text);
    }
  });

  elWs.on("close", (code, reasonBuf) => {
    const reason = reasonBuf ? String(reasonBuf) : "";
    safeLog(
      "el_conversation_close",
      `callSid=${(meta && meta.callSid) || "(none)"} code=${code} reasonLen=${reason.length} outboundAudioFrames=${outboundAudioFrames} transcriptEvents=${transcriptEventCount} inboundElMessages=${inboundElMessageCount} initSent=${initSent}`
    );
  });

  elWs.on("error", (err) => {
    safeLog(
      "el_conversation_error",
      `callSid=${(meta && meta.callSid) || "(none)"} error=${err && err.message ? err.message : "unknown"}`
    );
  });

  return elWs;
}

function handleMediaStream(twilioWs, req) {
  let streamSid = null;
  let elReady = null;
  let callSid = "";
  let from = "";
  let inboundAudioFrames = 0;
  let forwardedAudioFrames = 0;

  safeLog("media_ws_open", "path=/api/twilio/voice/media-stream");

  twilioWs.on("message", async (raw) => {
    let event;
    try {
      event = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (event.event === "connected") {
      safeLog("media_connected", `protocol=${event.protocol || "(none)"}`);
      return;
    }

    if (event.event === "start") {
      streamSid = event.start && event.start.streamSid;
      const custom =
        (event.start && event.start.customParameters) || {};
      callSid = String(custom.callSid || custom.callsid || "").trim();
      from = String(custom.from || "").trim();
      if (!callSid && event.start && event.start.callSid) {
        callSid = String(event.start.callSid);
      }
      const pending = callSid ? pendingCallsByStream.get(callSid) : null;
      if (pending && !from) from = pending.from;

      let greeting = "";
      try {
        const brain = await loadBrainModule();
        const state = brain.createSpeechEngineSession({
          callSid: callSid || `stream_${streamSid}`,
          from,
        });
        greeting = state.greeting;
        // Stash until ElevenLabs brain WS init assigns conversationId.
        brainSessions.set(`pending:${callSid || streamSid}`, state);
      } catch (err) {
        safeLog(
          "session_create_failed",
          `error=${err && err.message ? err.message : "unknown"}`
        );
      }

      elReady = openElevenLabsConversation(
        twilioWs,
        () => streamSid,
        { callSid, from, greeting }
      ).catch((err) => {
        safeLog(
          "el_ws_open_failed",
          `error=${err && err.message ? err.message : "unknown"}`
        );
        try {
          twilioWs.close();
        } catch {
          // ignore
        }
        return null;
      });
      safeLog(
        "media_start",
        `callSid=${callSid || "(none)"} streamSid=${streamSid || "(none)"}`
      );
    } else if (event.event === "media" && elReady) {
      inboundAudioFrames += 1;
      const elWs = await elReady;
      if (!elWs) return;
      const payload = event.media && event.media.payload;
      if (!payload) return;
      // Official: leave Twilio μ-law base64 intact; JSON text frame (not binary).
      const audioMessage = buildUserAudioChunkMessage(payload);
      const frame = serializeOutboundJson(audioMessage);
      elWs.send(frame.text);
      forwardedAudioFrames += 1;
      if (
        forwardedAudioFrames === 1 ||
        forwardedAudioFrames === 2 ||
        forwardedAudioFrames % 50 === 0
      ) {
        safeLog(
          "media_audio",
          `callSid=${callSid || "(none)"} inboundFrames=${inboundAudioFrames} forwardedFrames=${forwardedAudioFrames} opcode=${frame.opcode} byteLength=${frame.byteLength} payloadChars=${String(payload).length}`
        );
      }
    } else if (event.event === "stop") {
      safeLog(
        "media_stop",
        `callSid=${callSid || "(none)"} inboundFrames=${inboundAudioFrames} forwardedFrames=${forwardedAudioFrames}`
      );
      try {
        twilioWs.close();
      } catch {
        // ignore
      }
    }
  });

  twilioWs.on("close", async () => {
    const elWs = elReady ? await elReady : null;
    if (elWs && elWs.readyState === WebSocket.OPEN) {
      try {
        elWs.close();
      } catch {
        // ignore
      }
    }
    if (callSid) pendingCallsByStream.delete(callSid);
    safeLog(
      "media_close",
      `callSid=${callSid || "(none)"} inboundFrames=${inboundAudioFrames} forwardedFrames=${forwardedAudioFrames}`
    );
  });
}

/**
 * Attach Media Streams upgrade handler (does not destroy other paths).
 */
function attachMediaStreamWebSocket(server) {
  if (mediaWss) return mediaWss;
  mediaWss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = String(req.url || "").split("?")[0];
    if (pathname !== MEDIA_STREAM_PATH) {
      return;
    }
    mediaWss.handleUpgrade(req, socket, head, (ws) => {
      handleMediaStream(ws, req);
    });
  });

  return mediaWss;
}

async function resolvePendingState(conversationId) {
  // Prefer newest pending session.
  for (const [key, state] of brainSessions.entries()) {
    if (String(key).startsWith("pending:")) {
      brainSessions.delete(key);
      state.conversationId = conversationId;
      brainSessions.set(conversationId, state);
      return state;
    }
  }
  const brain = await loadBrainModule();
  const state = brain.createSpeechEngineSession({
    callSid: `conv_${conversationId}`,
    conversationId,
  });
  brainSessions.set(conversationId, state);
  return state;
}

/**
 * Ensure ElevenLabs sends a shared-secret header on brain WS connects.
 * Cloudflare tunnels often strip or block the SDK JWT header; requestHeaders
 * survive and match the official Twilio custom-LLM guidance.
 */
async function ensureBrainSharedSecret(client, engineId) {
  let secret = sharedSecret();
  let generated = false;
  if (!secret) {
    secret = crypto.randomBytes(24).toString("hex");
    process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET = secret;
    generated = true;
  }
  const wsUrl = brainWsUrlFromPublicBase() || process.env.ELEVENLABS_SPEECH_ENGINE_WS_URL;
  if (!wsUrl) {
    return {
      ok: false,
      error: "missing_ws_url_for_shared_secret_update",
      secretConfigured: Boolean(secret),
      generated,
    };
  }
  try {
    await client.speechEngine.update(engineId, {
      speechEngine: {
        wsUrl,
        requestHeaders: { "x-api-key": secret },
      },
    });
    safeLog(
      "brain_shared_secret_configured",
      `generated=${generated} header=x-api-key`
    );
    return { ok: true, generated, secretConfigured: true };
  } catch (err) {
    safeLog(
      "brain_shared_secret_update_failed",
      `error=${err && err.message ? err.message : "unknown"}`
    );
    return {
      ok: false,
      error: err && err.message ? err.message : "shared_secret_update_failed",
      generated,
      secretConfigured: Boolean(secret),
    };
  }
}

/**
 * Authorize a brain WebSocket upgrade.
 * Accept JWT (SDK default) OR shared-secret x-api-key (Cloudflare-safe).
 */
async function authorizeBrainUpgrade(req, engine) {
  const authHeaderRaw =
    req.headers["x-elevenlabs-speech-engine-authorization"];
  const authHeaderPresent = Boolean(
    Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw
  );
  let jwtOk = false;
  let jwtReason = "not_checked";
  try {
    jwtOk = await engine.verifyRequest(req);
    jwtReason = jwtOk ? "ok" : "verify_returned_false";
  } catch (err) {
    jwtReason = err && err.message ? err.message : "verify_threw";
  }

  const secret = sharedSecret();
  const provided =
    req.headers["x-api-key"] || req.headers["x-speech-engine-key"];
  const providedValue = Array.isArray(provided) ? provided[0] : provided;
  const secretOk = Boolean(secret) && providedValue === secret;

  return {
    ok: jwtOk || secretOk,
    jwtOk,
    jwtReason,
    authHeaderPresent,
    secretOk,
    secretConfigured: Boolean(secret),
  };
}

function rejectBrainUpgrade(socket, reason) {
  safeLog("brain_upgrade_reject", `reason=${reason}`);
  try {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  } catch {
    // ignore
  }
  try {
    socket.destroy();
  } catch {
    // ignore
  }
}

function wireBrainSession(session, brain) {
  session.on("init", async (conversationId) => {
    const state = await resolvePendingState(conversationId);
    session._fdState = state;
    safeLog(
      "brain_init",
      `conversationId=${conversationId} callSid=${state.callSid}`
    );
  });

  session.on("user_transcript", (transcript, signal) => {
    Promise.resolve(
      (async () => {
        let state = session._fdState;
        if (!state) {
          state = await resolvePendingState(
            session.conversationId || `anon_${Date.now()}`
          );
          session._fdState = state;
        }

        const turnCount = Array.isArray(transcript) ? transcript.length : 0;
        safeLog(
          "brain_transcript",
          `callSid=${state.callSid} historyTurns=${turnCount} transcriptReceived=true`
        );

        try {
          safeLog("brain_model_start", `callSid=${state.callSid}`);
          let chunkCount = 0;
          await session.sendResponse(
            (async function* () {
              for await (const chunk of brain.streamBrainTurn(
                state,
                transcript,
                signal,
                {}
              )) {
                if (signal.aborted) return;
                chunkCount += 1;
                yield chunk;
              }
              if (state.persisted && state.persistArtifact) {
                try {
                  writeLatestActionableCall(state.persistArtifact);
                  safeLog("persisted", `callSid=${state.callSid}`);
                } catch (err) {
                  safeLog(
                    "persist_store_failed",
                    `error=${err && err.message ? err.message : "unknown"}`
                  );
                }
              }
            })()
          );
          safeLog(
            "brain_model_complete",
            `callSid=${state.callSid} responseChunks=${chunkCount} aborted=${Boolean(signal.aborted)}`
          );
        } catch (err) {
          if (signal.aborted) {
            safeLog("brain_aborted", `callSid=${state.callSid}`);
            return;
          }
          safeLog(
            "brain_error",
            `error=${err && err.message ? err.message : "unknown"}`
          );
          if (!signal.aborted) {
            await session.sendResponse(brain.fallbackReply(state, ""));
          }
        }
      })()
    ).catch((err) => {
      safeLog(
        "brain_transcript_handler_error",
        `error=${err && err.message ? err.message : "unknown"}`
      );
    });
  });

  session.on("close", () => {
    const id = session.conversationId;
    if (id) brainSessions.delete(id);
    safeLog("brain_close", `conversationId=${id || "(none)"}`);
  });

  session.on("disconnected", () => {
    const id = session.conversationId;
    if (id) brainSessions.delete(id);
    safeLog("brain_disconnect", `conversationId=${id || "(none)"}`);
  });

  session.on("error", (err) => {
    safeLog(
      "brain_ws_error",
      `error=${err && err.message ? err.message : "unknown"}`
    );
  });
}

/**
 * Attach Speech Engine brain WebSocket.
 *
 * Does not use SDK attach()'s default JWT-only gate: behind Cloudflare Tunnel
 * that gate destroyed upgrades (EOF) before onTranscript could run.
 * Auth = SDK JWT OR shared-secret x-api-key (official custom-LLM pattern).
 */
async function attachSpeechEngineBrain(server) {
  const apiKey = elevenApiKey();
  const engineId = speechEngineId();
  if (!apiKey || !engineId) {
    safeLog(
      "brain_attach_skipped",
      "missing ELEVENLABS_API_KEY or ELEVENLABS_SPEECH_ENGINE_ID"
    );
    return null;
  }

  const client = getElevenClient();
  const engine = await client.speechEngine.get(engineId);
  const brain = await loadBrainModule();

  const secretSetup = await ensureBrainSharedSecret(client, engineId);
  if (!secretSetup.ok) {
    safeLog(
      "brain_attach_warning",
      `shared_secret_update_failed=${secretSetup.error || "unknown"}`
    );
  }

  const brainWss = new WebSocketServer({ noServer: true });
  const upgradeListener = async (req, socket, head) => {
    const pathname = String(req.url || "").split("?")[0];
    if (pathname !== BRAIN_WS_PATH) return;

    safeLog("brain_upgrade", "path=/api/speech-engine/ws");
    const auth = await authorizeBrainUpgrade(req, engine);
    safeLog(
      "brain_upgrade_auth",
      `authHeaderPresent=${auth.authHeaderPresent} jwtOk=${auth.jwtOk} secretOk=${auth.secretOk} secretConfigured=${auth.secretConfigured} jwtReason=${auth.jwtReason}`
    );
    if (!auth.ok) {
      rejectBrainUpgrade(
        socket,
        auth.authHeaderPresent
          ? `jwt_failed:${auth.jwtReason}`
          : "missing_jwt_and_shared_secret_mismatch"
      );
      return;
    }

    brainWss.handleUpgrade(req, socket, head, (ws) => {
      safeLog("brain_ws_upgraded", "ok=true");
      const session = engine.createSession(ws, {
        debug: String(process.env.SPEECH_ENGINE_DEBUG || "").trim() === "1",
      });
      wireBrainSession(session, brain);
    });
  };

  server.on("upgrade", upgradeListener);
  attachment = {
    close: async () => {
      server.removeListener("upgrade", upgradeListener);
      await new Promise((resolve) => brainWss.close(() => resolve()));
    },
    wss: brainWss,
  };

  safeLog(
    "brain_attached",
    `path=${BRAIN_WS_PATH} engineId=${engineId} voice=${amberVoiceId()} auth=jwt_or_shared_secret`
  );
  return attachment;
}

/**
 * Attach both Media Streams bridge and Speech Engine brain.
 */
async function attachSpeechEngine(server) {
  attachMediaStreamWebSocket(server);
  if (!useSpeechEngine()) {
    safeLog("transport_off", "PHONE_VOICE_TRANSPORT!=elevenlabs_speech_engine");
    return { mediaWss, attachment: null };
  }
  const brainAttachment = await attachSpeechEngineBrain(server);
  return { mediaWss, attachment: brainAttachment };
}

/**
 * Create or update Speech Engine resource for telephony (ulaw + Amber King).
 * Requires ELEVENLABS_API_KEY. Does not change Twilio routing.
 */
function resolveSpeechEngineWsUrl(options = {}) {
  return (
    options.wsUrl ||
    process.env.ELEVENLABS_SPEECH_ENGINE_WS_URL ||
    brainWsUrlFromPublicBase()
  );
}

/**
 * Current ensure() create/update payload (SDK camelCase shape).
 * Serializes to speech_engine.ws_url + optional asr/tts/overrides.
 */
function buildEnsureSpeechEngineCreatePayload(options = {}) {
  const wsUrl = resolveSpeechEngineWsUrl(options);
  if (!wsUrl) {
    return { ok: false, error: "missing_ws_url_or_PUBLIC_BASE_URL" };
  }
  const secret =
    options.sharedSecret !== undefined
      ? String(options.sharedSecret || "").trim()
      : sharedSecret();
  const payload = {
    name: options.name || "FreedomDesk Aly Phone Spike",
    speechEngine: {
      wsUrl,
      ...(secret ? { requestHeaders: { "x-api-key": secret } } : {}),
    },
    overrides: { firstMessage: true },
    asr: { userInputAudioFormat: "ulaw_8000" },
    tts: {
      modelId: options.modelId || ttsModelId(),
      voiceId: options.voiceId || amberVoiceId(),
      agentOutputAudioFormat: "ulaw_8000",
    },
  };
  return { ok: true, payload, wsUrl };
}

/**
 * Official minimal create: name + speechEngine.wsUrl only.
 */
function buildMinimalSpeechEngineCreatePayload(options = {}) {
  const wsUrl = resolveSpeechEngineWsUrl(options);
  if (!wsUrl) {
    return { ok: false, error: "missing_ws_url_or_PUBLIC_BASE_URL" };
  }
  return {
    ok: true,
    wsUrl,
    payload: {
      name: options.name || "FreedomDesk Speech Engine Diagnostic",
      speechEngine: { wsUrl },
    },
  };
}

/** Redact secrets / hosts for safe logging. Never logs API keys. */
function sanitizeSpeechEnginePayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const out = JSON.parse(JSON.stringify(payload));
  if (out.speechEngine && out.speechEngine.wsUrl) {
    try {
      const u = new URL(out.speechEngine.wsUrl);
      out.speechEngine.wsUrl = `${u.protocol}//<host>${u.pathname}`;
    } catch {
      out.speechEngine.wsUrl = "<invalid-ws-url>";
    }
  }
  if (out.speechEngine && out.speechEngine.requestHeaders) {
    const headers = {};
    for (const [k, v] of Object.entries(out.speechEngine.requestHeaders)) {
      headers[k] = typeof v === "string" && v ? "<redacted>" : v;
    }
    out.speechEngine.requestHeaders = headers;
  }
  if (out.tts && out.tts.voiceId) {
    // Keep Amber King id — it is the non-secret public voice identity.
    out.tts.voiceId = String(out.tts.voiceId);
  }
  return out;
}

function serializeCreatePayloadOrThrow(payload) {
  const serializers = require("@elevenlabs/elevenlabs-js/serialization");
  return serializers.CreateSpeechEngineRequest.jsonOrThrow(payload, {
    unrecognizedObjectKeys: "strip",
  });
}

function extractErrorMeta(err) {
  const statusCode = probeErrorStatus(err);
  const raw = err && err.rawResponse;
  const headers = (raw && raw.headers) || (err && err.headers) || {};
  const headerGet = (name) => {
    if (!headers) return undefined;
    if (typeof headers.get === "function") return headers.get(name);
    return (
      headers[name] ||
      headers[name.toLowerCase()] ||
      headers[name.toUpperCase()]
    );
  };
  return {
    statusCode: statusCode || undefined,
    body: err && err.body,
    message: err && err.message ? err.message : "speech_engine_api_error",
    requestId:
      headerGet("request-id") ||
      headerGet("x-request-id") ||
      headerGet("elevenlabs-request-id") ||
      null,
    rawStatus: raw && raw.status,
  };
}

async function ensureSpeechEngineResource(options = {}) {
  const client = getElevenClient();
  if (!client) {
    return { ok: false, error: "missing_ELEVENLABS_API_KEY" };
  }

  const built = buildEnsureSpeechEngineCreatePayload(options);
  if (!built.ok) return built;
  const { payload, wsUrl } = built;

  const existingId = speechEngineId();
  try {
    if (existingId) {
      const updated = await client.speechEngine.update(existingId, payload);
      return {
        ok: true,
        action: "updated",
        engineId: updated.engineId || existingId,
        wsUrl,
        sanitizedPayload: sanitizeSpeechEnginePayload(payload),
      };
    }
    const created = await client.speechEngine.create(payload);
    return {
      ok: true,
      action: "created",
      engineId: created.engineId,
      wsUrl,
      sanitizedPayload: sanitizeSpeechEnginePayload(payload),
    };
  } catch (err) {
    const meta = extractErrorMeta(err);
    return {
      ok: false,
      error: meta.message,
      statusCode: meta.statusCode,
      body: meta.body,
      requestId: meta.requestId,
      sanitizedPayload: sanitizeSpeechEnginePayload(payload),
      wirePayload: (() => {
        try {
          const wire = serializeCreatePayloadOrThrow({
            ...payload,
            speechEngine: {
              ...payload.speechEngine,
              wsUrl: "wss://example.invalid/api/speech-engine/ws",
              requestHeaders: payload.speechEngine.requestHeaders
                ? { "x-api-key": "redacted" }
                : undefined,
            },
          });
          if (wire.speech_engine && wire.speech_engine.ws_url) {
            wire.speech_engine.ws_url = "wss://<host>/api/speech-engine/ws";
          }
          if (
            wire.speech_engine &&
            wire.speech_engine.request_headers &&
            wire.speech_engine.request_headers["x-api-key"]
          ) {
            wire.speech_engine.request_headers["x-api-key"] = "<redacted>";
          }
          return wire;
        } catch {
          return null;
        }
      })(),
    };
  }
}

/**
 * One-shot diagnostic: minimal create, then incremental updates.
 * Stops immediately on first 500. Does not create a second resource.
 */
async function diagnoseSpeechEngineCreate(options = {}) {
  const apiKey = elevenApiKey();
  if (!apiKey) {
    return { ok: false, error: "missing_ELEVENLABS_API_KEY" };
  }

  const client =
    typeof options.createClient === "function"
      ? options.createClient(apiKey)
      : new ElevenLabsClient({ apiKey });

  const minimal = buildMinimalSpeechEngineCreatePayload(options);
  if (!minimal.ok) return minimal;

  let wireMinimal;
  try {
    wireMinimal = serializeCreatePayloadOrThrow(minimal.payload);
  } catch (err) {
    return {
      ok: false,
      error: "payload_serialize_failed",
      message: err && err.message ? err.message : "serialize_failed",
      sanitizedPayload: sanitizeSpeechEnginePayload(minimal.payload),
    };
  }

  const ensureBuilt = buildEnsureSpeechEngineCreatePayload(options);
  const report = {
    ok: false,
    sdkVersion: inspectSpeechEngineSdkSurface(client).sdkVersion,
    endpoint: "POST /v1/speech-engine",
    minimalSdkPayload: sanitizeSpeechEnginePayload(minimal.payload),
    minimalWirePayload: (() => {
      const copy = JSON.parse(JSON.stringify(wireMinimal));
      if (copy.speech_engine && copy.speech_engine.ws_url) {
        try {
          const u = new URL(copy.speech_engine.ws_url);
          copy.speech_engine.ws_url = `${u.protocol}//<host>${u.pathname}`;
        } catch {
          copy.speech_engine.ws_url = "<invalid-ws-url>";
        }
      }
      return copy;
    })(),
    ensureSdkPayload: ensureBuilt.ok
      ? sanitizeSpeechEnginePayload(ensureBuilt.payload)
      : null,
    steps: [],
  };

  let engineId = null;
  try {
    const created = await client.speechEngine.create(minimal.payload);
    engineId = created.engineId || created.speechEngineId;
    report.steps.push({
      step: "minimal_create",
      ok: true,
      engineId,
    });
  } catch (err) {
    const meta = extractErrorMeta(err);
    report.steps.push({
      step: "minimal_create",
      ok: false,
      ...meta,
    });
    report.statusCode = meta.statusCode;
    report.requestId = meta.requestId;
    report.body = meta.body;
    report.message = meta.message;
    if (meta.statusCode === 500) {
      report.accountSupport = "blocked_or_server_error";
      report.error = "internal_server_error";
    }
    return report;
  }

  report.engineId = engineId;

  const updates = [
    {
      step: "update_asr_ulaw_8000",
      patch: { asr: { userInputAudioFormat: "ulaw_8000" } },
    },
    {
      step: "update_tts_ulaw_8000",
      patch: { tts: { agentOutputAudioFormat: "ulaw_8000" } },
    },
    {
      step: "update_amber_king_voice",
      patch: { tts: { voiceId: amberVoiceId() } },
    },
    {
      step: "update_tts_model",
      patch: { tts: { modelId: ttsModelId() } },
    },
  ];

  for (const item of updates) {
    try {
      await client.speechEngine.update(engineId, item.patch);
      report.steps.push({ step: item.step, ok: true, patch: item.patch });
    } catch (err) {
      const meta = extractErrorMeta(err);
      report.steps.push({
        step: item.step,
        ok: false,
        patch: item.patch,
        ...meta,
      });
      report.ok = false;
      report.failedStep = item.step;
      report.statusCode = meta.statusCode;
      report.requestId = meta.requestId;
      report.body = meta.body;
      report.message = meta.message;
      if (meta.statusCode === 500) {
        report.accountSupport = "blocked_or_server_error";
        report.error = "internal_server_error";
      }
      return report;
    }
  }

  report.ok = true;
  report.accountSupport = "verified_via_create";
  report.message =
    "Minimal create and incremental μ-law / Amber King / model updates succeeded.";
  return report;
}

/**
 * Inspect the installed SDK Speech Engine surface without network I/O.
 * Official spike path uses create / get / attach — never assume list exists.
 */
function inspectSpeechEngineSdkSurface(client) {
  const speechEngine = client && client.speechEngine;
  const namespaceExists = Boolean(speechEngine);
  const methods = {
    create: typeof (speechEngine && speechEngine.create) === "function",
    get: typeof (speechEngine && speechEngine.get) === "function",
    attach: typeof (speechEngine && speechEngine.attach) === "function",
  };
  const requiredOk = methods.create && methods.get && methods.attach;
  return {
    namespaceExists,
    methods,
    requiredOk,
    sdkVersion: (() => {
      try {
        return require("@elevenlabs/elevenlabs-js/package.json").version;
      } catch {
        return null;
      }
    })(),
  };
}

function probeErrorStatus(err) {
  if (!err || typeof err !== "object") return 0;
  const status = err.statusCode || err.status || err.status_code;
  return typeof status === "number" ? status : 0;
}

/**
 * Non-destructive Speech Engine account probe.
 *
 * Does NOT call speechEngine.list (unavailable / unsafe on some SDK builds).
 * Does NOT create a Speech Engine resource.
 *
 * Validates separately:
 * 1) API key present
 * 2) benign authenticated request (user.get)
 * 3) speechEngine namespace + create/get/attach
 * 4) optional get(existingId) when ELEVENLABS_SPEECH_ENGINE_ID is set
 */
async function probeSpeechEngineAccount(options = {}) {
  const apiKey = elevenApiKey();
  const keyPresent = Boolean(apiKey);
  if (!keyPresent) {
    return {
      ok: false,
      status: "missing_key",
      keyPresent: false,
      keyValid: false,
      endpointReachable: false,
      sdkSurfaceAvailable: false,
      accountSupport: "unknown",
      supported: null,
      error: "missing_ELEVENLABS_API_KEY",
      message:
        "No ELEVENLABS_API_KEY in environment — cannot verify Speech Engine account access.",
    };
  }

  let client;
  try {
    client =
      typeof options.createClient === "function"
        ? options.createClient(apiKey)
        : new ElevenLabsClient({ apiKey });
  } catch (err) {
    return {
      ok: false,
      status: "invalid_key",
      keyPresent: true,
      keyValid: false,
      endpointReachable: false,
      sdkSurfaceAvailable: false,
      accountSupport: "unknown",
      supported: false,
      error: "client_init_failed",
      message: err && err.message ? err.message : "Failed to construct ElevenLabs client.",
    };
  }

  const surface = inspectSpeechEngineSdkSurface(client);
  if (!surface.namespaceExists || !surface.requiredOk) {
    return {
      ok: false,
      status: "sdk_mismatch",
      keyPresent: true,
      keyValid: null,
      endpointReachable: false,
      sdkSurfaceAvailable: false,
      accountSupport: "unknown",
      supported: false,
      error: "speech_engine_sdk_surface_missing",
      message:
        "Installed @elevenlabs/elevenlabs-js is missing speechEngine.create/get/attach required by this spike.",
      sdk: surface,
    };
  }

  // Benign authenticated request — proves the key is accepted without touching Speech Engine resources.
  try {
    if (typeof options.userGet === "function") {
      await options.userGet(client);
    } else if (client.user && typeof client.user.get === "function") {
      await client.user.get();
    } else {
      throw new Error("benign_user_get_unavailable");
    }
  } catch (err) {
    const httpStatus = probeErrorStatus(err);
    const msg = err && err.message ? err.message : "auth_probe_failed";
    if (httpStatus === 401 || /invalid.?api.?key|unauthorized/i.test(msg)) {
      return {
        ok: false,
        status: "invalid_key",
        keyPresent: true,
        keyValid: false,
        endpointReachable: true,
        sdkSurfaceAvailable: true,
        accountSupport: "unknown",
        supported: false,
        error: "invalid_ELEVENLABS_API_KEY",
        statusCode: httpStatus || 401,
        message: "ElevenLabs rejected the API key on a benign authenticated request.",
        sdk: surface,
      };
    }
    if (httpStatus === 403) {
      return {
        ok: false,
        status: "forbidden_or_unsupported",
        keyPresent: true,
        keyValid: null,
        endpointReachable: true,
        sdkSurfaceAvailable: true,
        accountSupport: "unsupported",
        supported: false,
        error: "forbidden",
        statusCode: 403,
        message: "ElevenLabs forbade the authenticated probe request.",
        sdk: surface,
      };
    }
    if (msg === "benign_user_get_unavailable") {
      return {
        ok: false,
        status: "sdk_mismatch",
        keyPresent: true,
        keyValid: null,
        endpointReachable: false,
        sdkSurfaceAvailable: true,
        accountSupport: "unknown",
        supported: false,
        error: "benign_auth_endpoint_missing",
        message:
          "SDK missing user.get for a benign auth check; cannot validate the API key safely.",
        sdk: surface,
      };
    }
    return {
      ok: false,
      status: "endpoint_unreachable",
      keyPresent: true,
      keyValid: null,
      endpointReachable: false,
      sdkSurfaceAvailable: true,
      accountSupport: "unknown",
      supported: null,
      error: "auth_probe_failed",
      statusCode: httpStatus || 0,
      message: msg,
      sdk: surface,
    };
  }

  const existingId = speechEngineId();
  if (existingId) {
    try {
      const engine =
        typeof options.speechEngineGet === "function"
          ? await options.speechEngineGet(client, existingId)
          : await client.speechEngine.get(existingId);
      return {
        ok: true,
        status: "support_verified",
        keyPresent: true,
        keyValid: true,
        endpointReachable: true,
        sdkSurfaceAvailable: true,
        accountSupport: "verified",
        supported: true,
        engineId: (engine && (engine.engineId || engine.speechEngineId)) || existingId,
        message:
          "API key accepted; Speech Engine SDK surface present; existing engine get() succeeded.",
        sdk: surface,
      };
    } catch (err) {
      const httpStatus = probeErrorStatus(err);
      const msg = err && err.message ? err.message : "speech_engine_get_failed";
      if (httpStatus === 401) {
        return {
          ok: false,
          status: "invalid_key",
          keyPresent: true,
          keyValid: false,
          endpointReachable: true,
          sdkSurfaceAvailable: true,
          accountSupport: "unknown",
          supported: false,
          error: "invalid_ELEVENLABS_API_KEY",
          statusCode: 401,
          message: "Speech Engine get() rejected the API key.",
          sdk: surface,
        };
      }
      if (httpStatus === 403) {
        return {
          ok: false,
          status: "forbidden_or_unsupported",
          keyPresent: true,
          keyValid: true,
          endpointReachable: true,
          sdkSurfaceAvailable: true,
          accountSupport: "unsupported",
          supported: false,
          error: "speech_engine_forbidden",
          statusCode: 403,
          message:
            "API key is valid but Speech Engine get() is forbidden — account may lack Speech Engine entitlement.",
          sdk: surface,
        };
      }
      if (httpStatus === 404) {
        return {
          ok: false,
          status: "endpoint_reachable",
          keyPresent: true,
          keyValid: true,
          endpointReachable: true,
          sdkSurfaceAvailable: true,
          accountSupport: "unverified_until_create",
          supported: null,
          error: "speech_engine_id_not_found",
          statusCode: 404,
          message:
            "API key and SDK surface are OK, but ELEVENLABS_SPEECH_ENGINE_ID was not found. Re-run ensure or clear the stale id.",
          sdk: surface,
        };
      }
      return {
        ok: false,
        status: "endpoint_reachable",
        keyPresent: true,
        keyValid: true,
        endpointReachable: true,
        sdkSurfaceAvailable: true,
        accountSupport: "unverified_until_create",
        supported: null,
        error: "speech_engine_get_failed",
        statusCode: httpStatus || 0,
        message: msg,
        sdk: surface,
      };
    }
  }

  // Key + SDK surface OK, but entitlement cannot be proven without create().
  return {
    ok: true,
    status: "endpoint_reachable",
    keyPresent: true,
    keyValid: true,
    endpointReachable: true,
    sdkSurfaceAvailable: true,
    accountSupport: "unverified_until_create",
    supported: null,
    message:
      "API key accepted and Speech Engine create/get/attach are present. Account entitlement is unverified until a Speech Engine is created (npm run ensure:speech-engine).",
    sdk: surface,
  };
}

module.exports = {
  MEDIA_STREAM_PATH,
  BRAIN_WS_PATH,
  AMBER_KING_VOICE_ID,
  useSpeechEngine,
  buildSpeechEngineTwiml,
  attachSpeechEngine,
  attachMediaStreamWebSocket,
  attachSpeechEngineBrain,
  ensureSpeechEngineResource,
  diagnoseSpeechEngineCreate,
  buildEnsureSpeechEngineCreatePayload,
  buildMinimalSpeechEngineCreatePayload,
  sanitizeSpeechEnginePayload,
  serializeCreatePayloadOrThrow,
  probeSpeechEngineAccount,
  inspectSpeechEngineSdkSurface,
  authorizeBrainUpgrade,
  rejectBrainUpgrade,
  ensureBrainSharedSecret,
  buildConversationInitiationMessage,
  buildUserAudioChunkMessage,
  serializeOutboundJson,
  classifyElevenLabsInbound,
  isBrainUserTranscriptMessage,
  amberVoiceId,
  ttsModelId,
  speechEngineId,
};
