/**
 * Speech Engine transport tests — feature flag + TwiML + rollback intact.
 */

"use strict";

const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

module.paths.unshift(path.join(__dirname, "..", "server", "node_modules"));

const speechEngine = require("../server/speech-engine");
const conversationRelay = require("../server/conversation-relay");

describe("Speech Engine transport wiring", () => {
  const prev = {
    transport: process.env.PHONE_VOICE_TRANSPORT,
    publicBase: process.env.PUBLIC_BASE_URL,
  };

  after(() => {
    if (prev.transport === undefined) delete process.env.PHONE_VOICE_TRANSPORT;
    else process.env.PHONE_VOICE_TRANSPORT = prev.transport;
    if (prev.publicBase === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = prev.publicBase;
  });

  it("flag elevenlabs_speech_engine is separate from conversation_relay", () => {
    process.env.PHONE_VOICE_TRANSPORT = "elevenlabs_speech_engine";
    assert.equal(speechEngine.useSpeechEngine(), true);
    assert.equal(conversationRelay.useConversationRelay(), false);

    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    assert.equal(speechEngine.useSpeechEngine(), false);
    assert.equal(conversationRelay.useConversationRelay(), true);
  });

  it("Amber King remains the Speech Engine default voice", () => {
    assert.equal(speechEngine.AMBER_KING_VOICE_ID, "F89WkXaQbUlVyNvtlD3X");
    assert.equal(speechEngine.amberVoiceId(), "F89WkXaQbUlVyNvtlD3X");
  });

  it("builds Connect/Stream TwiML to media-stream path", () => {
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    process.env.PHONE_VOICE_TRANSPORT = "elevenlabs_speech_engine";
    const twiml = speechEngine.buildSpeechEngineTwiml({
      headers: {},
      body: { CallSid: "CA123", From: "+16165550100" },
    });
    assert.match(twiml, /<Connect>/);
    assert.match(twiml, /<Stream /);
    assert.match(
      twiml,
      /wss:\/\/voice\.freedomdeskai\.com\/api\/twilio\/voice\/media-stream/
    );
    assert.doesNotMatch(twiml, /ConversationRelay/);
  });

  it("ConversationRelay TwiML still available as rollback", () => {
    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    const twiml = conversationRelay.buildConversationRelayTwiml(
      {
        headers: {},
        body: { CallSid: "CA999", From: "+16165550100" },
      },
      {
        selectGreeting: () => "Thanks for calling.",
        loadPracticeVoiceConfig: () => ({ agentName: "Aly" }),
      }
    );
    assert.match(String(twiml), /ConversationRelay/);
  });

  it("media-stream upgrade does not claim conversation relay path", () => {
    assert.equal(
      speechEngine.MEDIA_STREAM_PATH,
      "/api/twilio/voice/media-stream"
    );
    assert.equal(speechEngine.BRAIN_WS_PATH, "/api/speech-engine/ws");
  });
});

describe("Speech Engine account probe (non-destructive)", () => {
  it("reports missing API key clearly", async () => {
    const prevKey = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    const result = await speechEngine.probeSpeechEngineAccount();
    if (prevKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevKey;
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing_key");
    assert.equal(result.error, "missing_ELEVENLABS_API_KEY");
  });
});
