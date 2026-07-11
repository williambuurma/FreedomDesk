"use strict";

/**
 * Local Twilio voice vertical-slice tests — no purchased number required.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "server");

// Resolve twilio + handlers from server package
const twilioVoice = require(path.join(serverRoot, "twilio-voice.js"));
const todayHandler = require(path.join(serverRoot, "today-handler.js"));
const store = require(path.join(serverRoot, "latest-call-store.js"));

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

describe("Twilio voice webhooks (local)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-twilio-"));
  const storePath = path.join(tmpDir, "latest-actionable-call.json");
  const prevToken = process.env.TWILIO_AUTH_TOKEN;
  const prevBase = process.env.PUBLIC_BASE_URL;

  before(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
    process.env.PUBLIC_BASE_URL = "https://example.test";
  });

  after(() => {
    if (prevToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = prevToken;
    if (prevBase === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = prevBase;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("inbound webhook returns Aly greeting Gather TwiML", async () => {
    const req = {
      method: "POST",
      protocol: "https",
      originalUrl: "/api/twilio/voice/inbound",
      url: "/api/twilio/voice/inbound",
      headers: { host: "example.test" },
      body: { CallSid: "CA_inbound_test", From: "+16155550100", To: "+16155550199" },
    };
    const res = mockRes();
    await twilioVoice.handleInboundVoice(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.headers["Content-Type"], /xml/);
    assert.match(res.body, /<Gather/);
    assert.match(res.body, /Cascade Family Dentistry/);
    assert.match(res.body, /Aly/);
    assert.match(res.body, /\/api\/twilio\/voice\/gather/);
    assert.match(res.body, /Chirp3-HD-Aoede|Neural2|Generative/);
    assert.match(res.body, /How can I help/);
    assert.doesNotMatch(res.body, /Polly\.Joanna"/);
  });

  test("gather callback runs reasoning pipeline and persists actionable call", async () => {
    store.clearLatestActionableCall(storePath);

    const req = {
      method: "POST",
      protocol: "https",
      originalUrl: "/api/twilio/voice/gather",
      url: "/api/twilio/voice/gather",
      headers: { host: "example.test" },
      body: {
        CallSid: "CA_gather_toothache",
        SpeechResult:
          "I have an awful toothache that kept me up all night",
        From: "+16155550111",
        To: "+16155550199",
      },
    };
    const res = mockRes();
    await twilioVoice.handleGatherVoice(req, res, {
      storePath,
      source: "local_test",
      resetRegistries: true,
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<Hangup/);
    assert.match(res.body, /on-call|front desk|follow up|sorry/i);

    const latest = store.readLatestActionableCall(storePath);
    assert.ok(latest, "expected persisted latest-actionable-call");
    assert.equal(latest.schema, "latest-actionable-call/v1");
    assert.equal(latest.intent, "EMERGENCY");
    assert.ok(latest.decisionCard);
    assert.ok(latest.decisionCard.primaryAction);
    assert.ok(latest.decisionCard.situation);
  });

  test("gather with empty speech hangs up without persisting", async () => {
    store.clearLatestActionableCall(storePath);

    const req = {
      method: "POST",
      originalUrl: "/api/twilio/voice/gather",
      url: "/api/twilio/voice/gather",
      headers: { host: "example.test" },
      body: { CallSid: "CA_empty", SpeechResult: "" },
    };
    const res = mockRes();
    await twilioVoice.handleGatherVoice(req, res, { storePath });

    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Take care|call back/i);
    assert.equal(store.readLatestActionableCall(storePath), null);
  });

  test("signature validation rejects when token configured and signature missing", () => {
    process.env.TWILIO_AUTH_TOKEN = "test_token_not_real";
    const req = {
      originalUrl: "/api/twilio/voice/inbound",
      url: "/api/twilio/voice/inbound",
      headers: { host: "example.test" },
      body: {},
    };
    const result = twilioVoice.validateTwilioSignature(req);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_signature");
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test("Today live read overlays persisted decision card", async () => {
    store.clearLatestActionableCall(storePath);

    const gatherReq = {
      method: "POST",
      originalUrl: "/api/twilio/voice/gather",
      url: "/api/twilio/voice/gather",
      headers: { host: "example.test" },
      body: {
        CallSid: "CA_today_overlay",
        SpeechResult: "I have a severe toothache and facial swelling",
      },
    };
    await twilioVoice.handleGatherVoice(gatherReq, mockRes(), {
      storePath,
      source: "local_test",
    });

    const latest = store.readLatestActionableCall(storePath);
    assert.ok(latest);

    const payload = await todayHandler.buildTodayPayload({
      storePath,
      latest,
    });

    assert.equal(payload.liveCallActive, true);
    assert.equal(payload.liveCallId, latest.callId);
    const cards = payload.roles.front_desk.decisionCards;
    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, latest.decisionCard.id);
    assert.ok(cards[0].primaryAction);
  });
});
