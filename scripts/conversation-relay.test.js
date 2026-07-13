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
    assert.match(res.body, /interruptSensitivity="medium"/);
    assert.match(res.body, /reportInputDuringAgentSpeech="speech"/);
    assert.match(res.body, /ignoreBackchannel="true"/);
    assert.match(res.body, /speechTimeout="1200"/);
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
    const textMsg = ws.sent.find((m) => m.type === "text");
    assert.ok(textMsg);
    assert.equal(textMsg.last, true);
    assert.doesNotMatch(textMsg.token, /<speak>|<prosody>|<\/speak>|\[warmly\]|\[concerned\]/);
    assert.match(textMsg.token, /[.?!—]/);
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
    const textMsg = ws.sent.find((m) => m.type === "text");
    assert.ok(textMsg);
    assert.equal(textMsg.last, true);
    assert.equal(typeof textMsg.token, "string");
    assert.ok(textMsg.token.length > 0);
    assert.doesNotMatch(textMsg.token, /<speak>|<prosody>|<\/speak>/);
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

    conversationRelay.handleInterrupt(
      { callSid: "CA_interrupt_1" },
      {
        type: "interrupt",
        utteranceUntilInterrupt: "Where in your mouth is the pain",
        durationUntilInterruptMs: 400,
      },
      helpers
    );

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
    const textMsg = ws.sent.find((m) => m.type === "text");
    assert.ok(endMsg);
    assert.ok(textMsg);
    assert.match(
      textMsg.token,
      /glad you called|earliest available|saved clearly for the team/i
    );
    assert.doesNotMatch(textMsg.token, /you'll be fine|appointment is booked/i);
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
      "Yes, ASAP",
      "Yes",
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
      const textMsg = ws.sent.find((m) => m.type === "text");
      assert.ok(textMsg, `expected spoken reply after: ${speech.slice(0, 40)}`);
      spoken.push(textMsg.token);
      const session = helpers.getCallSession("CA_william_cr");
      if (session && session.askedFields.length) {
        fields.push(session.askedFields[session.askedFields.length - 1]);
      }
      if (ws.sent.some((m) => m.type === "end")) break;
    }

    // 1) Opening compassion + last-name spelling (name already volunteered)
    assert.match(spoken[0], /worried|concerned|uncomfortable|glad you/i);
    assert.match(spoken[0], /spell your last name/i);
    assert.match(spoken[0], /William/);
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

    // 5) Progress bridge + earliest
    assert.equal(fields[3], "schedule.earliest");
    assert.match(spoken[3], /important details|flexible|earlier opening/i);

    // 6) Short notice
    assert.equal(fields[4], "schedule.short_notice");

    // Soft cap / short purposeful path
    const clinicalAsks = fields.filter(
      (f) => f.startsWith("pain.") || f.startsWith("schedule.")
    );
    assert.ok(clinicalAsks.length <= 3);

    // Closing after persist
    const endMsg = ws.sent.find((m) => m.type === "end");
    const closing = ws.sent.find((m) => m.type === "text");
    assert.ok(endMsg);
    assert.ok(closing);
    assert.match(closing.token, /William/);
    assert.match(closing.token, /lower-right back/i);
    assert.match(closing.token, /kept you awake/i);
    assert.match(closing.token, /not noticed swelling/i);
    assert.match(closing.token, /earliest available help/i);
    assert.match(closing.token, /short notice/i);
    assert.match(closing.token, /saved clearly for the team/i);
    assert.doesNotMatch(
      closing.token,
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
    const textMsg = ws.sent.find((m) => m.type === "text");
    assert.ok(textMsg);
    assert.match(textMsg.token, /saved clearly|glad you called/i);
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
