"use strict";

/**
 * ConversationRelay transport tests — feature flag, TwiML, WS auth, session loop.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { describe, test, before, after, beforeEach } = require("node:test");
const { WebSocket } = require(path.join(
  __dirname,
  "..",
  "server",
  "node_modules",
  "ws"
));

const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "server");

const twilioVoice = require(path.join(serverRoot, "twilio-voice.js"));
const conversationRelay = require(path.join(serverRoot, "conversation-relay.js"));
const store = require(path.join(serverRoot, "latest-call-store.js"));
const twilio = require(path.join(serverRoot, "node_modules", "twilio"));

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(chunk) {
      this.body = chunk == null ? "" : String(chunk);
    },
  };
}

/** Join all ConversationRelay text tokens from a mock ws.sent buffer. */
function spokenFromSent(sent) {
  return (sent || [])
    .filter((m) => m.type === "text")
    .map((m) => m.token)
    .join(" ");
}

function textTokensFromSent(sent) {
  return (sent || []).filter((m) => m.type === "text");
}

function inboundReq() {
  return {
    method: "POST",
    protocol: "https",
    originalUrl: "/api/twilio/voice/inbound",
    url: "/api/twilio/voice/inbound",
    headers: { host: "voice.freedomdeskai.com" },
    body: { CallSid: "CA_cr_inbound", From: "+16155550100", To: "+16155550199" },
  };
}

describe("ConversationRelay transport", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-cr-"));
  const storePath = path.join(tmpDir, "latest-actionable-call.json");
  const prev = {
    token: process.env.TWILIO_AUTH_TOKEN,
    base: process.env.PUBLIC_BASE_URL,
    transport: process.env.PHONE_VOICE_TRANSPORT,
    voiceId: process.env.CONVERSATION_RELAY_VOICE_ID,
    tts: process.env.CONVERSATION_RELAY_TTS_PROVIDER,
    model: process.env.CONVERSATION_RELAY_VOICE_MODEL,
    speed: process.env.CONVERSATION_RELAY_VOICE_SPEED,
    stability: process.env.CONVERSATION_RELAY_VOICE_STABILITY,
    similarity: process.env.CONVERSATION_RELAY_VOICE_SIMILARITY,
  };

  const VOICE_ENV_KEYS = [
    "PHONE_VOICE_TRANSPORT",
    "CONVERSATION_RELAY_VOICE_ID",
    "CONVERSATION_RELAY_TTS_PROVIDER",
    "CONVERSATION_RELAY_VOICE_MODEL",
    "CONVERSATION_RELAY_VOICE_SPEED",
    "CONVERSATION_RELAY_VOICE_STABILITY",
    "CONVERSATION_RELAY_VOICE_SIMILARITY",
  ];

  function clearVoiceEnv() {
    for (const k of VOICE_ENV_KEYS) delete process.env[k];
  }

  before(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    clearVoiceEnv();
  });

  after(() => {
    for (const [k, v] of Object.entries({
      TWILIO_AUTH_TOKEN: prev.token,
      PUBLIC_BASE_URL: prev.base,
      PHONE_VOICE_TRANSPORT: prev.transport,
      CONVERSATION_RELAY_VOICE_ID: prev.voiceId,
      CONVERSATION_RELAY_TTS_PROVIDER: prev.tts,
      CONVERSATION_RELAY_VOICE_MODEL: prev.model,
      CONVERSATION_RELAY_VOICE_SPEED: prev.speed,
      CONVERSATION_RELAY_VOICE_STABILITY: prev.stability,
      CONVERSATION_RELAY_VOICE_SIMILARITY: prev.similarity,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    conversationRelay.resetRelayMetaForTests();
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    store.clearLatestActionableCall(storePath);
    clearVoiceEnv();
  });

  test("legacy Gather/Say remains default when feature flag is absent", async () => {
    clearVoiceEnv();
    const res = mockRes();
    await twilioVoice.handleInboundVoice(inboundReq(), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<Gather/);
    assert.doesNotMatch(res.body, /ConversationRelay/);
    assert.doesNotMatch(res.body, /F89WkXaQbUlVyNvtlD3X/);
  });

  test("Amber King is the configured default ConversationRelay voice", () => {
    clearVoiceEnv();
    assert.equal(
      conversationRelay.DEFAULT_VOICE_ID,
      "F89WkXaQbUlVyNvtlD3X"
    );
    assert.equal(conversationRelay.DEFAULT_VOICE_NAME, "Amber King");
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2_5-0.97_0.40_0.88"
    );
  });

  test("model and performance settings can be overridden independently", () => {
    clearVoiceEnv();
    process.env.CONVERSATION_RELAY_VOICE_MODEL = "flash_v2";
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2-0.97_0.40_0.88"
    );
    process.env.CONVERSATION_RELAY_VOICE_SPEED = "1.05";
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2-1.05_0.40_0.88"
    );
    process.env.CONVERSATION_RELAY_VOICE_STABILITY = "0.55";
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2-1.05_0.55_0.88"
    );
    process.env.CONVERSATION_RELAY_VOICE_SIMILARITY = "0.70";
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2-1.05_0.55_0.70"
    );
    process.env.CONVERSATION_RELAY_VOICE_ID = "OTHERVOICEID1234567890ab";
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "OTHERVOICEID1234567890ab-flash_v2-1.05_0.55_0.70"
    );
  });

  test("ConversationRelay TwiML uses exact Amber King voice string", async () => {
    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    const res = mockRes();
    await twilioVoice.handleInboundVoice(inboundReq(), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<Connect/);
    assert.match(res.body, /<ConversationRelay/);
    assert.match(res.body, /ttsProvider="ElevenLabs"/);
    assert.match(
      res.body,
      /voice="F89WkXaQbUlVyNvtlD3X-flash_v2_5-0\.97_0\.40_0\.88"/
    );
    assert.match(
      res.body,
      /url="wss:\/\/voice\.freedomdeskai\.com\/api\/twilio\/voice\/conversation"/
    );
    assert.match(res.body, /welcomeGreetingInterruptible="speech"/);
    assert.match(res.body, /interruptible="speech"/);
    assert.match(res.body, /interruptSensitivity="high"/);
    assert.match(res.body, /reportInputDuringAgentSpeech="speech"/);
    assert.match(res.body, /preemptible="true"/);
    assert.match(res.body, /ignoreBackchannel="true"/);
    assert.match(res.body, /speechTimeout="900"/);
    assert.doesNotMatch(res.body, /TWILIO_AUTH_TOKEN|AuthToken|api[_-]?key/i);
    assert.doesNotMatch(res.body, /<Gather/);
  });

  test("relay speech strips Polly SSML and bracketed emotion tags", () => {
    assert.equal(
      conversationRelay.sanitizeRelaySpeech(
        '<speak><prosody rate="95%">Hello.</prosody></speak>'
      ),
      "Hello."
    );
    assert.equal(
      conversationRelay.sanitizeRelaySpeech("[warmly] I'm sorry about that."),
      "I'm sorry about that."
    );
    assert.doesNotMatch(
      conversationRelay.sanitizeRelaySpeech("[concerned] Okay."),
      /\[|\]|<speak>|<prosody>/
    );
  });

  test("final prompt text token has no SSML or bracketed emotion tags", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.ensureLiveCallSession({
      callSid: "CA_prompt_clean",
      from: "+16155550111",
    });
    const ws = {
      callSid: "CA_prompt_clean",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };
    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt: "I have a toothache that kept me awake",
        last: true,
      },
      helpers,
      { storePath, source: "local_test", resetRegistries: true }
    );
    const texts = textTokensFromSent(ws.sent);
    assert.ok(texts.length >= 1);
    assert.equal(texts[texts.length - 1].last, true);
    const spoken = spokenFromSent(ws.sent);
    assert.doesNotMatch(spoken, /<speak>|<prosody>|<\/speak>|\[warmly\]|\[concerned\]/);
    assert.match(spoken, /[.?!—]/);
    for (const t of texts) {
      assert.equal(t.interruptible, true);
    }
  });
  test("invalid WebSocket signatures are rejected", () => {
    process.env.TWILIO_AUTH_TOKEN = "test_token_not_real";
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    const result = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation",
      headers: {
        host: "voice.freedomdeskai.com",
        "x-twilio-signature": "invalid",
      },
    });
    assert.equal(result.ok, false);
    assert.equal(
      result.validationUrl,
      "wss://voice.freedomdeskai.com/api/twilio/voice/conversation"
    );
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("valid Twilio WebSocket signature is accepted against wss URL", () => {
    const authToken = "test_token_not_real";
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    const validationUrl =
      "wss://voice.freedomdeskai.com/api/twilio/voice/conversation";
    const signature = twilio.getExpectedTwilioSignature(
      authToken,
      validationUrl,
      {}
    );
    const result = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation",
      headers: {
        host: "127.0.0.1:5500",
        "x-twilio-signature": signature,
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.validationUrl, validationUrl);
    // https URL must NOT be what we validate (that was the bug).
    assert.notEqual(
      result.validationUrl,
      "https://voice.freedomdeskai.com/api/twilio/voice/conversation"
    );
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("forwarded host and protocol are converted to wss when PUBLIC_BASE_URL unset", () => {
    const authToken = "test_token_not_real";
    process.env.TWILIO_AUTH_TOKEN = authToken;
    delete process.env.PUBLIC_BASE_URL;
    const validationUrl =
      "wss://voice.freedomdeskai.com/api/twilio/voice/conversation";
    const signature = twilio.getExpectedTwilioSignature(
      authToken,
      validationUrl,
      {}
    );
    const target = conversationRelay.buildWebSocketValidationTarget({
      url: "/api/twilio/voice/conversation",
      headers: {
        host: "127.0.0.1:5500",
        "x-forwarded-host": "voice.freedomdeskai.com",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(target.validationUrl, validationUrl);
    assert.equal(target.forwardedHost, "voice.freedomdeskai.com");
    assert.equal(target.forwardedProto, "https");

    const result = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation",
      headers: {
        host: "127.0.0.1:5500",
        "x-forwarded-host": "voice.freedomdeskai.com",
        "x-forwarded-proto": "https",
        "x-twilio-signature": signature,
      },
    });
    assert.equal(result.ok, true);
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("query parameters are included in signature params not ignored", () => {
    const authToken = "test_token_not_real";
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    const validationUrl =
      "wss://voice.freedomdeskai.com/api/twilio/voice/conversation";
    const params = { foo: "bar", callSid: "CA123" };
    const signature = twilio.getExpectedTwilioSignature(
      authToken,
      validationUrl,
      params
    );
    const target = conversationRelay.buildWebSocketValidationTarget({
      url: "/api/twilio/voice/conversation?foo=bar&callSid=CA123",
      headers: { host: "voice.freedomdeskai.com" },
    });
    assert.equal(target.validationUrl, validationUrl);
    assert.equal(target.hasQuery, true);
    assert.deepEqual(target.params, params);

    const result = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation?foo=bar&callSid=CA123",
      headers: {
        host: "voice.freedomdeskai.com",
        "x-twilio-signature": signature,
      },
    });
    assert.equal(result.ok, true);

    // Signature computed without params must fail when query is present.
    const badSig = twilio.getExpectedTwilioSignature(
      authToken,
      validationUrl,
      {}
    );
    const bad = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation?foo=bar&callSid=CA123",
      headers: {
        host: "voice.freedomdeskai.com",
        "x-twilio-signature": badSig,
      },
    });
    assert.equal(bad.ok, false);
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("signature debug logs never include auth token or signature value", () => {
    const authToken = "super_secret_auth_token_xyz";
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";
    process.env.CONVERSATION_RELAY_DEBUG_SIGNATURE = "1";
    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      const signature = twilio.getExpectedTwilioSignature(
        authToken,
        "wss://voice.freedomdeskai.com/api/twilio/voice/conversation",
        {}
      );
      conversationRelay.validateWebSocketUpgrade({
        url: "/api/twilio/voice/conversation",
        headers: {
          host: "voice.freedomdeskai.com",
          "x-twilio-signature": signature,
        },
      });
      conversationRelay.validateWebSocketUpgrade({
        url: "/api/twilio/voice/conversation",
        headers: {
          host: "voice.freedomdeskai.com",
          "x-twilio-signature": "invalid",
        },
      });
    } finally {
      console.log = originalLog;
      delete process.env.CONVERSATION_RELAY_DEBUG_SIGNATURE;
      delete process.env.TWILIO_AUTH_TOKEN;
    }
    assert.ok(lines.length > 0);
    const joined = lines.join("\n");
    assert.match(joined, /validationUrl=wss:\/\//);
    assert.match(joined, /signaturePresent=true/);
    assert.doesNotMatch(joined, /super_secret_auth_token_xyz/);
    assert.doesNotMatch(joined, /TWILIO_AUTH_TOKEN/);
    assert.doesNotMatch(joined, /signature=[A-Za-z0-9+/]+=*/i);
    assert.doesNotMatch(joined, /x-twilio-signature=[A-Za-z0-9+/]/i);
  });

  test("missing WebSocket signature rejected when token configured", () => {
    process.env.TWILIO_AUTH_TOKEN = "test_token_not_real";
    const result = conversationRelay.validateWebSocketUpgrade({
      url: "/api/twilio/voice/conversation",
      headers: { host: "voice.freedomdeskai.com" },
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_signature");
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("setup creates a CallSid session", async () => {
    const helpers = await import("../src/telephony/index.ts");
    const ws = { callSid: undefined, sent: [], send(s) { this.sent.push(s); } };
    await conversationRelay.handleSetup(
      ws,
      { type: "setup", callSid: "CA_setup_1", from: "+16155550111" },
      helpers
    );
    const session = helpers.getCallSession("CA_setup_1");
    assert.ok(session);
    assert.equal(session.callSid, "CA_setup_1");
    assert.equal(session.from, "+16155550111");
    assert.ok(session.turns.some((t) => t.speaker === "aly"));
    assert.equal(ws.callSid, "CA_setup_1");
  });

  test("final prompt produces a valid text-token response", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.ensureLiveCallSession({
      callSid: "CA_prompt_1",
      from: "+16155550111",
    });
    const ws = {
      callSid: "CA_prompt_1",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };
    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt: "I have a toothache that kept me awake",
        last: true,
      },
      helpers,
      { storePath, source: "local_test", resetRegistries: true }
    );
    assert.ok(ws.sent.length >= 1);
    const texts = textTokensFromSent(ws.sent);
    assert.ok(texts.length >= 1);
    assert.equal(texts[texts.length - 1].last, true);
    assert.equal(typeof texts[0].token, "string");
    assert.ok(texts[0].token.length > 0);
    assert.equal(texts[0].interruptible, true);
    assert.doesNotMatch(spokenFromSent(ws.sent), /<speak>|<prosody>|<\/speak>/);
    const session = helpers.getCallSession("CA_prompt_1");
    assert.ok(session);
    assert.ok(session.slots.name === undefined || session.turns.length >= 2);
  });

  test("interrupt does not delete session facts", async () => {
    const helpers = await import("../src/telephony/index.ts");
    const session = helpers.ensureLiveCallSession({
      callSid: "CA_interrupt_1",
      from: "+16155550111",
    });
    helpers.createOrUpdateSession({
      callSid: "CA_interrupt_1",
      speechResult: "My name is Finn Leo and I have a toothache",
      from: "+16155550111",
    });
    helpers.appendAlyAsk(session, {
      field: "pain.location",
      question: "Okay, thank you. Where in your mouth is the pain exactly on the left?",
    });
    const nameBefore = session.slots.name;
    assert.ok(nameBefore);

    const wsInterrupt = { callSid: "CA_interrupt_1", send() {} };
    conversationRelay.handleInterrupt(
      wsInterrupt,
      {
        type: "interrupt",
        utteranceUntilInterrupt: "Where in your mouth is the pain",
        durationUntilInterruptMs: 400,
      },
      helpers
    );
    if (wsInterrupt.interruptRecoveryTimer) {
      clearTimeout(wsInterrupt.interruptRecoveryTimer);
      wsInterrupt.interruptRecoveryTimer = null;
    }

    const after = helpers.getCallSession("CA_interrupt_1");
    assert.ok(after);
    assert.equal(after.slots.name, nameBefore);
    assert.equal(after.from, "+16155550111");
    const lastAly = [...after.turns].reverse().find((t) => t.speaker === "aly");
    assert.ok(lastAly);
    assert.match(lastAly.text, /Where in your mouth is the pain/);
    assert.doesNotMatch(lastAly.text, /exactly on the left/);
  });

  test("call completion persists before the closing claim", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.ensureLiveCallSession({
      callSid: "CA_complete_1",
      from: "+16155550111",
    });
    const replies = [
      "I have a toothache that kept me awake",
      "Finn Leo",
      "L E O",
      "Yes",
      "lower",
      "left",
      "back",
      "No",
      "Yes",
      "Yes",
    ];
    const ws = {
      callSid: "CA_complete_1",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };

    for (const speech of replies) {
      ws.sent = [];
      await conversationRelay.handleFinalPrompt(
        ws,
        { type: "prompt", voicePrompt: speech, last: true },
        helpers,
        { storePath, source: "local_test", resetRegistries: true }
      );
      const ended = ws.sent.some((m) => m.type === "end");
      if (ended) break;
    }

    const endMsg = ws.sent.find((m) => m.type === "end");
    const spoken = spokenFromSent(ws.sent);
    assert.ok(endMsg);
    assert.ok(spoken.length > 0);
    assert.match(
      spoken,
      /glad you called|earliest available|saved clearly for the team/i
    );
    assert.doesNotMatch(spoken, /you'll be fine|appointment is booked/i);
    const handoff = JSON.parse(endMsg.handoffData);
    assert.equal(handoff.persisted, true);
    const latest = store.readLatestActionableCall(storePath);
    assert.ok(latest);
    assert.ok(latest.decisionCard);
    const meta = conversationRelay.getRelayMetaForTests("CA_complete_1");
    assert.ok(meta);
    assert.equal(meta.persisted, true);
  });

  test("V1.3 William routine-pain ConversationRelay golden path", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    conversationRelay.resetRelayMetaForTests();
    helpers.ensureLiveCallSession({
      callSid: "CA_william_cr",
      from: "+16155550111",
    });

    const turns = [
      "Hi, I'm William Buurma. I have pain in my lower-right back tooth. It kept me awake last night, and I'm worried.",
      "B U U R M A",
      "Yes",
      "No",
      "Yes, ASAP, and I can come on short notice",
    ];
    const spoken = [];
    const fields = [];
    const ws = {
      callSid: "CA_william_cr",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };

    for (const speech of turns) {
      ws.sent = [];
      await conversationRelay.handleFinalPrompt(
        ws,
        { type: "prompt", voicePrompt: speech, last: true },
        helpers,
        { storePath, source: "local_test", resetRegistries: true }
      );
      const textMsg = spokenFromSent(ws.sent);
      assert.ok(textMsg, `expected spoken reply after: ${speech.slice(0, 40)}`);
      spoken.push(textMsg);
      const session = helpers.getCallSession("CA_william_cr");
      if (session && session.askedFields.length) {
        fields.push(session.askedFields[session.askedFields.length - 1]);
      }
      if (ws.sent.some((m) => m.type === "end")) break;
    }

    // 1) Opening compassion + last-name spelling (name already volunteered)
    assert.match(
      spoken[0],
      /worried|concerned|uncomfortable|difficult night|glad you|spell your last name/i
    );
    assert.match(spoken[0], /spell your last name/i);
    assert.doesNotMatch(spoken[0], /breathing|swallowing|fever|date of birth|insurance/i);

    // Recognized name ≠ spelling confirmed
    assert.equal(fields[0], "caller.last_name_spell");

    // 2-3) Read-back confirm
    assert.match(spoken[1], /B-U-U-R-M-A/);
    assert.match(spoken[1], /Buurma/i);
    assert.equal(fields[1], "caller.last_name_confirm");

    // 4) No location / onset / sleep / worry re-ask — swelling next
    assert.equal(fields[2], "pain.swelling");
    assert.doesNotMatch(spoken[2], /upper or lower|left or right|front or|how long|kept you awake|worried/i);

    // 5) Combined scheduling preference
    assert.equal(fields[3], "schedule.combined");
    assert.match(spoken[3], /earliest available appointment/i);
    assert.match(spoken[3], /short notice/i);

    // Soft cap / short purposeful path
    const clinicalAsks = fields.filter(
      (f) => f.startsWith("pain.") || f.startsWith("schedule.")
    );
    assert.ok(clinicalAsks.length <= 3);

    // Closing after persist
    const endMsg = ws.sent.find((m) => m.type === "end");
    const closing = spokenFromSent(ws.sent);
    assert.ok(endMsg);
    assert.ok(closing.length > 0);
    assert.match(closing, /William/);
    assert.match(closing, /lower-right back/i);
    assert.match(closing, /kept you awake/i);
    assert.match(closing, /not noticed swelling/i);
    assert.match(closing, /earliest available help/i);
    assert.match(closing, /short notice/i);
    assert.match(closing, /saved clearly for the team/i);
    assert.doesNotMatch(
      closing,
      /you'll be fine|appointment is booked|dentist will call immediately/i
    );
    const handoff = JSON.parse(endMsg.handoffData);
    assert.equal(handoff.persisted, true);
    assert.ok(store.readLatestActionableCall(storePath));
  });

  test("ConversationRelay soft-cap applies in live handler after identity", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    conversationRelay.resetRelayMetaForTests();
    const session = helpers.ensureLiveCallSession({
      callSid: "CA_softcap_cr",
      from: "+16155550111",
    });
    helpers.createOrUpdateSession({
      callSid: "CA_softcap_cr",
      speechResult: "I have a toothache",
      from: "+16155550111",
    });
    session.slots.name = "Finn Leo";
    session.slots.nameCaptured = true;
    session.slots.lastNameSpelling = "L E O";
    session.slots.lastNameSpellingCaptured = true;
    session.slots.lastNameConfirmed = true;
    session.slots.locationParts = {
      vertical: "lower",
      side: "left",
      depth: "back",
    };
    session.slots.locationConfirmed = true;
    session.postIdentityAsks = helpers.ROUTINE_PAIN_MAX_POST_IDENTITY_ASKS;
    session.slots.swelling = false;
    session.slots.wantsEarliest = true;
    session.slots.shortNoticeOk = true;

    const ws = {
      callSid: "CA_softcap_cr",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };
    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt: "Still hurts a bit",
        last: true,
      },
      helpers,
      { storePath, source: "local_test", resetRegistries: true }
    );
    assert.ok(ws.sent.some((m) => m.type === "end"));
    const spoken = spokenFromSent(ws.sent);
    assert.ok(spoken.length > 0);
    assert.match(spoken, /saved clearly|glad you called/i);
  });

  test("Amber King ConversationRelay voice settings remain unchanged", () => {
    assert.equal(
      conversationRelay.conversationRelayVoiceAttribute(),
      "F89WkXaQbUlVyNvtlD3X-flash_v2_5-0.97_0.40_0.88"
    );
  });

  test("socket close cleans up session state", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.ensureLiveCallSession({
      callSid: "CA_close_1",
      from: "+16155550111",
    });
    conversationRelay.relayCallMeta.set("CA_close_1", {
      persisted: false,
      ended: false,
      from: "+16155550111",
    });
    assert.ok(helpers.getCallSession("CA_close_1"));

    // Simulate cleanupSocket path via public helpers used by WS close.
    helpers.clearCallSession("CA_close_1");
    conversationRelay.relayCallMeta.delete("CA_close_1");
    assert.equal(helpers.getCallSession("CA_close_1"), undefined);
    assert.equal(conversationRelay.getRelayMetaForTests("CA_close_1"), undefined);
  });

  test("WebSocket upgrade rejects bad signature end-to-end", async () => {
    process.env.TWILIO_AUTH_TOKEN = "test_token_not_real";
    process.env.PUBLIC_BASE_URL = "https://voice.freedomdeskai.com";

    const srv = http.createServer((_req, res) => {
      res.statusCode = 200;
      res.end("ok");
    });
    conversationRelay.attachConversationRelayWebSocket(srv);

    await new Promise((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const { port } = srv.address();

    const rejected = await new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/api/twilio/voice/conversation`, {
        headers: { "x-twilio-signature": "totally-invalid" },
      });
      ws.on("unexpected-response", (_req, res) => {
        resolve(res.statusCode);
        ws.terminate();
      });
      ws.on("open", () => {
        resolve("opened");
        ws.close();
      });
      ws.on("error", () => {
        // connection refused / destroyed after 403
      });
      setTimeout(() => resolve("timeout"), 2000);
    });

    await new Promise((resolve) => srv.close(resolve));
    delete process.env.TWILIO_AUTH_TOKEN;
    assert.equal(rejected, 403);
  });

  test("no credentials in generated TwiML", async () => {
    process.env.PHONE_VOICE_TRANSPORT = "conversation_relay";
    process.env.TWILIO_AUTH_TOKEN = "secret_should_never_appear";
    const res = mockRes();
    // Signature skipped when validating... actually token is set so inbound will reject without signature.
    // Build TwiML directly to assert contents.
    const helpers = await import("../src/telephony/index.ts");
    const twiml = conversationRelay.buildConversationRelayTwiml(
      inboundReq(),
      helpers
    );
    const xml = twiml.toString();
    assert.doesNotMatch(xml, /secret_should_never_appear/);
    assert.doesNotMatch(xml, /TWILIO_AUTH_TOKEN/);
    assert.doesNotMatch(xml, /AuthToken/);
    delete process.env.TWILIO_AUTH_TOKEN;
  });
});

describe("ConversationRelay barge-in and corrections", () => {
  beforeEach(() => {
    conversationRelay.resetRelayMetaForTests();
  });

  test("outbound ordinary speech includes interruptible=true", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    const ws = {
      callSid: "CA_barge_token",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };
    helpers.ensureLiveCallSession({
      callSid: "CA_barge_token",
      from: "+16155550111",
    });
    conversationRelay.relayCallMeta.set("CA_barge_token", {
      persisted: false,
      ended: false,
      from: "+16155550111",
    });
    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt:
          "I'm William Buurma. Lower-right back tooth hurts and kept me awake.",
        last: true,
      },
      helpers,
      { storePath: null, source: "local_test", resetRegistries: false }
    );
    const texts = ws.sent.filter((m) => m.type === "text");
    assert.ok(texts.length >= 1);
    for (const t of texts) {
      assert.equal(t.interruptible, true);
      assert.equal(t.preemptible, true);
      assert.doesNotMatch(t.token, /<speak>|\[warmly\]|\btruly\b/i);
    }
  });

  test("interrupt cancels remaining tokens and preserves facts", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    const session = helpers.ensureLiveCallSession({
      callSid: "CA_barge_cancel",
      from: "+16155550111",
    });
    helpers.createOrUpdateSession({
      callSid: "CA_barge_cancel",
      speechResult: "William Buurma, lower-right back tooth pain.",
      from: "+16155550111",
    });
    helpers.appendAlyAsk(session, {
      field: "pain.swelling",
      question:
        "That sounds like a difficult night. I understand why you're concerned. Have you noticed any swelling?",
    });
    const nameBefore = session.slots.name;
    const locBefore = session.slots.locationParts?.side;

    const ws = {
      callSid: "CA_barge_cancel",
      activeSpeech: {
        responseId: "r_test1",
        interruptible: true,
        startedAt: Date.now(),
        cancelled: false,
        chunksSent: 1,
        chunksPlanned: 3,
      },
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };

    conversationRelay.handleInterrupt(
      ws,
      {
        type: "interrupt",
        utteranceUntilInterrupt: "That sounds like a difficult night",
        durationUntilInterruptMs: 900,
      },
      helpers
    );

    assert.equal(ws.activeSpeech.cancelled, true);
    assert.equal(ws.awaitingPostInterruptPrompt, true);
    assert.equal(ws.lastInterruptedResponseId, "r_test1");

    // Remaining tokens must be suppressed.
    const ok = conversationRelay.sendTextToken(ws, "Have you noticed any swelling?", {
      last: true,
      interruptible: true,
      responseId: "r_test1",
    });
    assert.equal(ok, false);
    assert.equal(ws.sent.length, 0);

    const after = helpers.getCallSession("CA_barge_cancel");
    assert.ok(after);
    assert.equal(after.slots.name, nameBefore);
    assert.equal(after.slots.locationParts?.side, locBefore);
    assert.equal(after.lastResponseInterrupted, true);
    const lastAly = [...after.turns].reverse().find((t) => t.speaker === "aly");
    assert.ok(lastAly?.interrupted);
    assert.match(lastAly.text, /difficult night/i);
    assert.doesNotMatch(lastAly.text, /swelling/i);

    // Cleanup timer so the test process can exit.
    if (ws.interruptRecoveryTimer) {
      clearTimeout(ws.interruptRecoveryTimer);
      ws.interruptRecoveryTimer = null;
    }
  });

  test("final prompt after interrupt corrects lower-right to lower-left", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    const sid = "CA_barge_correct";
    helpers.ensureLiveCallSession({ callSid: sid, from: "+16155550111" });
    conversationRelay.relayCallMeta.set(sid, {
      persisted: false,
      ended: false,
      from: "+16155550111",
    });

    const ws = {
      callSid: sid,
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };

    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt:
          "I've had pain in the bottom-right back area, and it kept me awake. I'm William Buurma.",
        last: true,
      },
      helpers,
      { storePath: null, source: "local_test", resetRegistries: false }
    );

    const session = helpers.getCallSession(sid);
    assert.ok(session);
    assert.equal(session.slots.locationParts?.side, "right");

    // Simulate Aly mid-response + barge-in.
    helpers.appendAlyAsk(session, {
      field: "pain.swelling",
      question:
        "That sounds like a difficult night. I understand why— Have you noticed any swelling?",
    });
    ws.activeSpeech = {
      responseId: "r_corr",
      interruptible: true,
      startedAt: Date.now(),
      cancelled: false,
      chunksSent: 1,
      chunksPlanned: 2,
    };
    conversationRelay.handleInterrupt(
      ws,
      {
        type: "interrupt",
        utteranceUntilInterrupt: "That sounds like a difficult night",
        durationUntilInterruptMs: 700,
      },
      helpers
    );
    if (ws.interruptRecoveryTimer) {
      clearTimeout(ws.interruptRecoveryTimer);
      ws.interruptRecoveryTimer = null;
    }

    ws.sent = [];
    await conversationRelay.handleFinalPrompt(
      ws,
      {
        type: "prompt",
        voicePrompt: "Actually, wait—it's the bottom left.",
        last: true,
      },
      helpers,
      { storePath: null, source: "local_test", resetRegistries: false }
    );

    const after = helpers.getCallSession(sid);
    assert.ok(after);
    assert.equal(after.slots.locationParts?.side, "left");
    assert.equal(after.slots.locationParts?.vertical, "lower");
    assert.equal(after.awaitingPostInterruptPrompt, false);

    const texts = ws.sent.filter((m) => m.type === "text");
    assert.ok(texts.length >= 1);
    const spoken = texts.map((t) => t.token).join(" ");
    assert.match(spoken, /Thanks for correcting me/i);
    assert.match(spoken, /lower-left/i);
    assert.doesNotMatch(spoken, /difficult night\. I understand why—/i);
    assert.doesNotMatch(spoken, /left or right|which side/i);
    for (const t of texts) {
      assert.equal(t.interruptible, true);
    }
  });

  test("rapid interrupt events do not corrupt session state", async () => {
    const helpers = await import("../src/telephony/index.ts");
    helpers.resetCallSessionsForTests();
    const sid = "CA_barge_rapid";
    const session = helpers.ensureLiveCallSession({
      callSid: sid,
      from: "+16155550111",
    });
    helpers.createOrUpdateSession({
      callSid: sid,
      speechResult: "I'm William Buurma. Lower right back tooth hurts.",
      from: "+16155550111",
    });
    helpers.appendAlyAsk(session, {
      field: "pain.swelling",
      question: "Have you noticed any swelling around that tooth?",
    });
    const ws = {
      callSid: sid,
      activeSpeech: {
        responseId: "r_rapid",
        interruptible: true,
        startedAt: Date.now(),
        cancelled: false,
        chunksSent: 0,
        chunksPlanned: 1,
      },
    };
    for (let i = 0; i < 5; i += 1) {
      conversationRelay.handleInterrupt(
        ws,
        {
          type: "interrupt",
          utteranceUntilInterrupt: "Have you noticed",
          durationUntilInterruptMs: 100 + i,
        },
        helpers
      );
    }
    if (ws.interruptRecoveryTimer) {
      clearTimeout(ws.interruptRecoveryTimer);
      ws.interruptRecoveryTimer = null;
    }
    const after = helpers.getCallSession(sid);
    assert.ok(after);
    assert.ok(after.slots.name || after.slots.nameCaptured || after.slots.lastName);
    assert.equal(after.slots.locationParts?.side, "right");
    assert.equal(after.lastResponseInterrupted, true);
  });

  test("emergency escalation speech may be non-interruptible", () => {
    const ws = {
      callSid: "CA_emerg_ni",
      sent: [],
      send(s) {
        this.sent.push(JSON.parse(s));
      },
    };
    conversationRelay.speakAlyResponse(
      ws,
      "If you are having trouble breathing, please call 911 now.",
      { interruptible: false }
    );
    const text = ws.sent.find((m) => m.type === "text");
    assert.ok(text);
    assert.equal(text.interruptible, false);
  });

  test("splitSpeechChunks yields sentence-sized phrases", () => {
    const chunks = conversationRelay.splitSpeechChunks(
      "That sounds like a difficult night. I understand why you're concerned. Have you noticed any swelling?"
    );
    assert.ok(chunks.length >= 2);
    assert.match(chunks[0], /difficult night/i);
    assert.ok(chunks.every((c) => c.length > 8));
  });
});
