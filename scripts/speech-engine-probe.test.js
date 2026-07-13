/**
 * Focused tests for the Speech Engine account probe.
 * No live ElevenLabs network calls — inject fake clients.
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

function fakeClient(overrides = {}) {
  return {
    user: {
      get: async () => ({ userId: "user_test" }),
    },
    speechEngine: {
      create: async () => ({ engineId: "seng_new" }),
      get: async (id) => ({ engineId: id }),
      attach: () => ({ close: async () => {} }),
    },
    ...overrides,
  };
}

describe("inspectSpeechEngineSdkSurface", () => {
  it("reports create/get/attach on the real installed SDK client", () => {
    const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");
    const client = new ElevenLabsClient({ apiKey: "xi-test-surface-only" });
    const surface = speechEngine.inspectSpeechEngineSdkSurface(client);
    assert.equal(surface.namespaceExists, true);
    assert.equal(surface.methods.create, true);
    assert.equal(surface.methods.get, true);
    assert.equal(surface.methods.attach, true);
    assert.equal(surface.requiredOk, true);
    // list may exist on some builds — probe must not require it
    assert.equal(typeof client.speechEngine.create, "function");
  });

  it("flags SDK mismatch when speechEngine namespace is missing", () => {
    const surface = speechEngine.inspectSpeechEngineSdkSurface({});
    assert.equal(surface.namespaceExists, false);
    assert.equal(surface.requiredOk, false);
  });
});

describe("probeSpeechEngineAccount", () => {
  const prev = {
    key: process.env.ELEVENLABS_API_KEY,
    engineId: process.env.ELEVENLABS_SPEECH_ENGINE_ID,
  };

  after(() => {
    if (prev.key === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev.key;
    if (prev.engineId === undefined) delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    else process.env.ELEVENLABS_SPEECH_ENGINE_ID = prev.engineId;
  });

  it("status missing_key when ELEVENLABS_API_KEY is absent", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    const result = await speechEngine.probeSpeechEngineAccount();
    assert.equal(result.status, "missing_key");
    assert.equal(result.ok, false);
    assert.equal(result.keyPresent, false);
    assert.equal(result.keyValid, false);
    assert.equal(result.error, "missing_ELEVENLABS_API_KEY");
  });

  it("status invalid_key when benign auth returns 401", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-bad-key";
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    const err = new Error("Invalid API key");
    err.statusCode = 401;
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => fakeClient(),
      userGet: async () => {
        throw err;
      },
    });
    assert.equal(result.status, "invalid_key");
    assert.equal(result.ok, false);
    assert.equal(result.keyPresent, true);
    assert.equal(result.keyValid, false);
    assert.equal(result.sdkSurfaceAvailable, true);
  });

  it("status forbidden_or_unsupported when benign auth returns 403", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-forbidden";
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    const err = new Error("Forbidden");
    err.statusCode = 403;
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => fakeClient(),
      userGet: async () => {
        throw err;
      },
    });
    assert.equal(result.status, "forbidden_or_unsupported");
    assert.equal(result.ok, false);
    assert.equal(result.accountSupport, "unsupported");
  });

  it("status sdk_mismatch when create/get/attach are missing", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-ok";
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => ({
        user: { get: async () => ({}) },
        speechEngine: { list: async () => [] },
      }),
    });
    assert.equal(result.status, "sdk_mismatch");
    assert.equal(result.ok, false);
    assert.equal(result.sdkSurfaceAvailable, false);
    assert.equal(result.error, "speech_engine_sdk_surface_missing");
  });

  it("never calls speechEngine.list even when list exists", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-ok";
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    let listCalls = 0;
    const client = fakeClient({
      speechEngine: {
        create: async () => ({ engineId: "seng_x" }),
        get: async (id) => ({ engineId: id }),
        attach: () => ({}),
        list: async () => {
          listCalls += 1;
          throw new Error("list must not be called");
        },
      },
    });
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => client,
      userGet: async () => ({ userId: "u1" }),
    });
    assert.equal(listCalls, 0);
    assert.equal(result.status, "endpoint_reachable");
    assert.equal(result.keyValid, true);
    assert.equal(result.sdkSurfaceAvailable, true);
    assert.equal(result.accountSupport, "unverified_until_create");
    assert.equal(result.supported, null);
    assert.equal(result.ok, true);
  });

  it("status support_verified when existing engine get() succeeds", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-ok";
    process.env.ELEVENLABS_SPEECH_ENGINE_ID = "seng_existing";
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => fakeClient(),
      userGet: async () => ({ userId: "u1" }),
      speechEngineGet: async (_client, id) => ({ engineId: id }),
    });
    assert.equal(result.status, "support_verified");
    assert.equal(result.ok, true);
    assert.equal(result.keyValid, true);
    assert.equal(result.accountSupport, "verified");
    assert.equal(result.supported, true);
    assert.equal(result.engineId, "seng_existing");
  });

  it("status forbidden_or_unsupported when engine get() returns 403", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-ok";
    process.env.ELEVENLABS_SPEECH_ENGINE_ID = "seng_existing";
    const err = new Error("Speech Engine forbidden");
    err.statusCode = 403;
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => fakeClient(),
      userGet: async () => ({ userId: "u1" }),
      speechEngineGet: async () => {
        throw err;
      },
    });
    assert.equal(result.status, "forbidden_or_unsupported");
    assert.equal(result.keyValid, true);
    assert.equal(result.accountSupport, "unsupported");
    assert.equal(result.supported, false);
  });

  it("does not log or echo the API key in probe results", async () => {
    process.env.ELEVENLABS_API_KEY = "xi-secret-should-never-appear";
    delete process.env.ELEVENLABS_SPEECH_ENGINE_ID;
    const result = await speechEngine.probeSpeechEngineAccount({
      createClient: () => fakeClient(),
      userGet: async () => ({ userId: "u1" }),
    });
    const json = JSON.stringify(result);
    assert.equal(json.includes("xi-secret-should-never-appear"), false);
  });
});
