/**
 * Focused Speech Engine Media Streams bridge protocol tests.
 * No live Twilio / ElevenLabs network required.
 */

"use strict";

const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const Module = require("module");
const { EventEmitter } = require("node:events");

const serverNodeModules = path.join(__dirname, "..", "server", "node_modules");
module.paths.unshift(serverNodeModules);
process.env.NODE_PATH = [serverNodeModules, process.env.NODE_PATH || ""]
  .filter(Boolean)
  .join(path.delimiter);
if (typeof Module._initPaths === "function") Module._initPaths();

const { WebSocket, WebSocketServer } = require("ws");
const {
  SpeechEngineSession,
} = require("@elevenlabs/elevenlabs-js/wrapper/speech-engine");
const speechEngine = require("../server/speech-engine");
const conversationRelay = require("../server/conversation-relay");

describe("Speech Engine conversation bridge protocol", () => {
  const prev = {
    transport: process.env.PHONE_VOICE_TRANSPORT,
    secret: process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET,
  };

  after(() => {
    if (prev.transport === undefined) delete process.env.PHONE_VOICE_TRANSPORT;
    else process.env.PHONE_VOICE_TRANSPORT = prev.transport;
    if (prev.secret === undefined) {
      delete process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET;
    } else {
      process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET = prev.secret;
    }
  });

  it("ConversationRelay rollback remains untouched by Speech Engine flag", () => {
    process.env.PHONE_VOICE_TRANSPORT = "elevenlabs_speech_engine";
    assert.equal(speechEngine.useSpeechEngine(), true);
    assert.equal(conversationRelay.useConversationRelay(), false);
    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    assert.equal(speechEngine.useSpeechEngine(), false);
    assert.equal(conversationRelay.useConversationRelay(), true);
  });

  it("1. official initiation message: type-only or allowed first_message only", () => {
    const minimal = speechEngine.buildConversationInitiationMessage({});
    assert.deepEqual(minimal, {
      type: "conversation_initiation_client_data",
    });

    const withGreeting = speechEngine.buildConversationInitiationMessage({
      greeting: "Thanks for calling. This is Aly.",
    });
    assert.equal(withGreeting.type, "conversation_initiation_client_data");
    assert.deepEqual(withGreeting.conversation_config_override, {
      agent: { first_message: "Thanks for calling. This is Aly." },
    });
    assert.equal(withGreeting.dynamic_variables, undefined);
    assert.equal(
      withGreeting.conversation_config_override.tts,
      undefined
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(withGreeting, "dynamic_variables"),
      false
    );
  });

  it("2-3. Twilio media frames become JSON text user_audio_chunk (base64 intact)", () => {
    const twilioPayload = "AAECAwQFBgc="; // opaque base64 stand-in, not audio content assert
    const message = speechEngine.buildUserAudioChunkMessage(twilioPayload);
    assert.deepEqual(message, { user_audio_chunk: twilioPayload });

    const frame = speechEngine.serializeOutboundJson(message);
    assert.equal(frame.opcode, "text");
    assert.equal(typeof frame.text, "string");
    assert.equal(frame.byteLength, Buffer.byteLength(frame.text, "utf8"));
    assert.equal(JSON.parse(frame.text).user_audio_chunk, twilioPayload);
    // Must remain base64 string — never a Buffer / binary opcode path.
    assert.equal(typeof JSON.parse(frame.text).user_audio_chunk, "string");
  });

  it("4. ElevenLabs transcript events are recognized and forwarded to brain session", async () => {
    const fakeWs = new EventEmitter();
    fakeWs.readyState = 1; // OPEN
    fakeWs.send = () => {};
    fakeWs.close = () => {
      fakeWs.emit("close");
    };

    const session = new SpeechEngineSession(fakeWs);
    let forwarded = null;
    session.on("user_transcript", (transcript, signal) => {
      forwarded = { transcript, hasSignal: Boolean(signal) };
    });

    const brainMsg = {
      type: "user_transcript",
      event_id: 1,
      user_transcript: [{ role: "user", content: "placeholder" }],
    };
    assert.equal(speechEngine.isBrainUserTranscriptMessage(brainMsg), true);
    // Deliver through the same WS message path the SDK uses (not a fabricated emit).
    fakeWs.emit("message", Buffer.from(JSON.stringify(brainMsg), "utf8"));

    await new Promise((r) => setImmediate(r));
    assert.ok(forwarded);
    assert.equal(Array.isArray(forwarded.transcript), true);
    assert.equal(forwarded.transcript.length, 1);
    assert.equal(forwarded.hasSignal, true);
    session.close();

    // Conversation-side transcript event classification (type only).
    const classified = speechEngine.classifyElevenLabsInbound(
      JSON.stringify({
        type: "user_transcript",
        user_transcription_event: { user_transcript: "x", event_id: 1 },
      }),
      false
    );
    assert.equal(classified.type, "user_transcript");
    assert.equal(classified.isTranscriptEvent, true);
    assert.equal(classified.opcode, "text");
  });

  it("5. close/error events are logged safely (type/code/reason only)", () => {
    const err = speechEngine.classifyElevenLabsInbound(
      JSON.stringify({
        type: "error",
        error_event: {
          code: 1008,
          error_type: "invalid_message",
          reason: "contract",
          debug_message: "SECRET_SHOULD_NOT_BE_REQUIRED",
        },
      }),
      false
    );
    assert.equal(err.type, "error");
    assert.equal(err.errorCode, 1008);
    assert.equal(err.errorType, "invalid_message");
    assert.equal(err.errorReason, "contract");
    // Classification exposes only safe fields we choose — not debug_message.
    assert.equal(err.debug_message, undefined);

    const meta = speechEngine.classifyElevenLabsInbound(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "conv_test",
          user_input_audio_format: "ulaw_8000",
          agent_output_audio_format: "ulaw_8000",
        },
      }),
      false
    );
    assert.equal(meta.userInputAudioFormat, "ulaw_8000");
    assert.equal(meta.agentOutputAudioFormat, "ulaw_8000");
    assert.equal(meta.hasConversationId, true);
  });

  it("6. media bridge upgrade path still works; ConversationRelay unchanged", async () => {
    process.env.PHONE_VOICE_TRANSPORT = "elevenlabs_speech_engine";
    process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET = "bridge-test-secret";

    const events = [];
    const server = http.createServer((_req, res) => {
      res.statusCode = 404;
      res.end();
    });
    speechEngine.attachMediaStreamWebSocket(server);

    const brainWss = new WebSocketServer({ noServer: true });
    const fakeEngine = { verifyRequest: async () => false };
    server.on("upgrade", async (req, socket, head) => {
      const pathname = String(req.url || "").split("?")[0];
      if (pathname !== speechEngine.BRAIN_WS_PATH) return;
      const auth = await speechEngine.authorizeBrainUpgrade(req, fakeEngine);
      events.push(`brain_auth:ok=${auth.ok}:secretOk=${auth.secretOk}`);
      if (!auth.ok) {
        speechEngine.rejectBrainUpgrade(socket, "test_reject");
        events.push("brain_reject");
        return;
      }
      brainWss.handleUpgrade(req, socket, head, (ws) => {
        events.push("brain_upgraded");
        ws.close();
      });
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    const mediaWs = new WebSocket(
      `ws://127.0.0.1:${port}${speechEngine.MEDIA_STREAM_PATH}`
    );
    await new Promise((resolve, reject) => {
      mediaWs.once("open", resolve);
      mediaWs.once("error", reject);
    });
    events.push("media_open");
    mediaWs.send(
      JSON.stringify({
        event: "start",
        start: {
          streamSid: "MZ_test",
          customParameters: { callSid: "CA_test" },
        },
      })
    );
    mediaWs.send(
      JSON.stringify({
        event: "media",
        media: { payload: "AAAA" },
      })
    );
    await new Promise((r) => setTimeout(r, 30));

    const brainWs = new WebSocket(
      `ws://127.0.0.1:${port}${speechEngine.BRAIN_WS_PATH}`,
      { headers: { "x-api-key": "bridge-test-secret" } }
    );
    await new Promise((resolve, reject) => {
      brainWs.once("open", resolve);
      brainWs.once("error", reject);
    });
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(events.includes("media_open"), true);
    assert.equal(events.includes("brain_upgraded"), true);
    assert.match(
      events.find((e) => e.startsWith("brain_auth:")) || "",
      /secretOk=true/
    );
    assert.equal(JSON.stringify(events).includes("AAAA"), false);

    // ConversationRelay module behavior unchanged.
    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    assert.equal(conversationRelay.useConversationRelay(), true);

    mediaWs.close();
    brainWs.close();
    await new Promise((resolve) => server.close(resolve));
  });
});
