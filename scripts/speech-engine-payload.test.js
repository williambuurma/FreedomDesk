/**
 * Focused tests for Speech Engine create payload construction (no network).
 */

"use strict";

const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("module");

const serverNodeModules = path.join(__dirname, "..", "server", "node_modules");
module.paths.unshift(serverNodeModules);
process.env.NODE_PATH = [serverNodeModules, process.env.NODE_PATH || ""]
  .filter(Boolean)
  .join(path.delimiter);
if (typeof Module._initPaths === "function") Module._initPaths();

const speechEngine = require("../server/speech-engine");

describe("Speech Engine create payload construction", () => {
  const prev = {
    publicBase: process.env.PUBLIC_BASE_URL,
    wsUrl: process.env.ELEVENLABS_SPEECH_ENGINE_WS_URL,
    secret: process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET,
    voice: process.env.ELEVENLABS_VOICE_ID,
    model: process.env.ELEVENLABS_TTS_MODEL,
  };

  after(() => {
    for (const [key, envKey] of [
      ["publicBase", "PUBLIC_BASE_URL"],
      ["wsUrl", "ELEVENLABS_SPEECH_ENGINE_WS_URL"],
      ["secret", "ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET"],
      ["voice", "ELEVENLABS_VOICE_ID"],
      ["model", "ELEVENLABS_TTS_MODEL"],
    ]) {
      if (prev[key] === undefined) delete process.env[envKey];
      else process.env[envKey] = prev[key];
    }
  });

  it("minimal payload is name + speechEngine.wsUrl only", () => {
    delete process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET;
    const built = speechEngine.buildMinimalSpeechEngineCreatePayload({
      wsUrl: "wss://voice.example.com/api/speech-engine/ws",
    });
    assert.equal(built.ok, true);
    assert.deepEqual(Object.keys(built.payload).sort(), [
      "name",
      "speechEngine",
    ]);
    assert.deepEqual(Object.keys(built.payload.speechEngine), ["wsUrl"]);
    assert.equal(built.payload.asr, undefined);
    assert.equal(built.payload.tts, undefined);
    assert.equal(built.payload.overrides, undefined);
    assert.equal(built.payload.turn, undefined);
    assert.equal(built.payload.conversation, undefined);
  });

  it("minimal payload serializes to official wire speech_engine.ws_url", () => {
    const built = speechEngine.buildMinimalSpeechEngineCreatePayload({
      wsUrl: "wss://voice.example.com/api/speech-engine/ws",
    });
    const wire = speechEngine.serializeCreatePayloadOrThrow(built.payload);
    assert.deepEqual(wire, {
      name: "FreedomDesk Speech Engine Diagnostic",
      speech_engine: {
        ws_url: "wss://voice.example.com/api/speech-engine/ws",
      },
    });
  });

  it("ensure payload includes asr/tts/overrides and valid enum values", () => {
    delete process.env.ELEVENLABS_SPEECH_ENGINE_SHARED_SECRET;
    delete process.env.ELEVENLABS_TTS_MODEL;
    process.env.PUBLIC_BASE_URL = "https://voice.example.com";
    const built = speechEngine.buildEnsureSpeechEngineCreatePayload({});
    assert.equal(built.ok, true);
    assert.equal(built.payload.asr.userInputAudioFormat, "ulaw_8000");
    assert.equal(built.payload.tts.agentOutputAudioFormat, "ulaw_8000");
    assert.equal(built.payload.tts.modelId, "eleven_flash_v2");
    assert.equal(built.payload.tts.voiceId, "F89WkXaQbUlVyNvtlD3X");
    assert.equal(built.payload.overrides.firstMessage, true);
    assert.equal(built.payload.turn.turnEagerness, "eager");
    assert.equal(built.payload.turn.turnTimeout, 7);
    assert.equal(built.payload.turn.silenceEndCallTimeout, -1);
    assert.equal(built.payload.turn.turnModel, "turn_v3");
    assert.equal(built.payload.turn.spellingPatience, "auto");
    assert.equal(built.payload.turn.speculativeTurn, false);
    const wire = speechEngine.serializeCreatePayloadOrThrow(built.payload);
    assert.equal(wire.speech_engine.ws_url.endsWith("/api/speech-engine/ws"), true);
    assert.equal(wire.asr.user_input_audio_format, "ulaw_8000");
    assert.equal(wire.tts.agent_output_audio_format, "ulaw_8000");
    assert.equal(wire.tts.model_id, "eleven_flash_v2");
    assert.equal(wire.tts.voice_id, "F89WkXaQbUlVyNvtlD3X");
    assert.equal(wire.overrides.first_message, true);
    assert.equal(wire.turn.turn_eagerness, "eager");
    assert.equal(wire.turn.turn_timeout, 7);
    assert.equal(wire.turn.silence_end_call_timeout, -1);
  });

  it("sanitize redacts request header secrets and host", () => {
    const sanitized = speechEngine.sanitizeSpeechEnginePayload({
      name: "x",
      speechEngine: {
        wsUrl: "wss://secret-host.example/api/speech-engine/ws",
        requestHeaders: { "x-api-key": "super-secret" },
      },
    });
    assert.equal(sanitized.speechEngine.wsUrl, "wss://<host>/api/speech-engine/ws");
    assert.equal(sanitized.speechEngine.requestHeaders["x-api-key"], "<redacted>");
    assert.equal(JSON.stringify(sanitized).includes("super-secret"), false);
    assert.equal(JSON.stringify(sanitized).includes("secret-host"), false);
  });

  it("rejects missing ws url", () => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.ELEVENLABS_SPEECH_ENGINE_WS_URL;
    const built = speechEngine.buildMinimalSpeechEngineCreatePayload({});
    assert.equal(built.ok, false);
    assert.equal(built.error, "missing_ws_url_or_PUBLIC_BASE_URL");
  });
});
