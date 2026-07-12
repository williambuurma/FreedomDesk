"use strict";

/**
 * Local Twilio voice vertical-slice tests — multi-turn adaptive intake.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "server");

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
    assert.match(res.body, /Joanna-Generative|Chirp3-HD|Neural2/);
  });

  test("toothache gather does not hang up after first denial", async () => {
    store.clearLatestActionableCall(storePath);
    const sid = "CA_pain_live";

    const res1 = mockRes();
    await twilioVoice.handleGatherVoice(
      {
        method: "POST",
        originalUrl: "/api/twilio/voice/gather",
        url: "/api/twilio/voice/gather",
        headers: { host: "example.test" },
        body: {
          CallSid: sid,
          SpeechResult: "I have a toothache that kept me awake",
          From: "+16155550111",
        },
      },
      res1,
      { storePath, source: "local_test" }
    );
    assert.match(res1.body, /<Gather/);
    assert.doesNotMatch(res1.body, /trouble breathing/i);
    assert.equal(store.readLatestActionableCall(storePath), null);

    // Answer first follow-up with a denial-style answer — must continue
    const res2 = mockRes();
    await twilioVoice.handleGatherVoice(
      {
        method: "POST",
        originalUrl: "/api/twilio/voice/gather",
        url: "/api/twilio/voice/gather",
        headers: { host: "example.test" },
        body: { CallSid: sid, SpeechResult: "No", From: "+16155550111" },
      },
      res2,
      { storePath, source: "local_test" }
    );
    assert.match(res2.body, /<Gather/);
    assert.doesNotMatch(res2.body, /<Hangup/);
    assert.equal(store.readLatestActionableCall(storePath), null);
  });

  test("gather completes only after actionable intake then persists Today", async () => {
    store.clearLatestActionableCall(storePath);
    const sid = "CA_pain_complete";
    const replies = [
      "I have a toothache that kept me awake",
      "Finn Leo",
      "lower left",
      "No",
      "just the ache",
    ];

    let last = mockRes();
    for (const speech of replies) {
      last = mockRes();
      await twilioVoice.handleGatherVoice(
        {
          method: "POST",
          originalUrl: "/api/twilio/voice/gather",
          url: "/api/twilio/voice/gather",
          headers: { host: "example.test" },
          body: { CallSid: sid, SpeechResult: speech, From: "+16155550111" },
        },
        last,
        { storePath, source: "local_test", resetRegistries: true }
      );
      if (last.body.includes("<Hangup")) break;
    }

    assert.match(last.body, /<Hangup/);
    assert.match(last.body, /shared what you told me|shared this with/i);
    const latest = store.readLatestActionableCall(storePath);
    assert.ok(latest);
    assert.ok(latest.decisionCard);

    const payload = await todayHandler.buildTodayPayload({ storePath, latest });
    assert.equal(payload.liveCallActive, true);
  });

  test("gather with empty speech hangs up without persisting", async () => {
    store.clearLatestActionableCall(storePath);
    const res = mockRes();
    await twilioVoice.handleGatherVoice(
      {
        method: "POST",
        originalUrl: "/api/twilio/voice/gather",
        url: "/api/twilio/voice/gather",
        headers: { host: "example.test" },
        body: { CallSid: "CA_empty", SpeechResult: "" },
      },
      res,
      { storePath }
    );
    assert.match(res.body, /Take care|call back/i);
    assert.equal(store.readLatestActionableCall(storePath), null);
  });

  test("signature validation rejects when token configured and signature missing", () => {
    process.env.TWILIO_AUTH_TOKEN = "test_token_not_real";
    const result = twilioVoice.validateTwilioSignature({
      originalUrl: "/api/twilio/voice/inbound",
      url: "/api/twilio/voice/inbound",
      headers: { host: "example.test" },
      body: {},
    });
    assert.equal(result.ok, false);
    delete process.env.TWILIO_AUTH_TOKEN;
  });
});
