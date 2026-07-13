#!/usr/bin/env node
/**
 * Diagnose Speech Engine create 500 — one minimal create, then incremental updates.
 *
 * Usage:
 *   node scripts/diagnose-speech-engine-create.js
 *
 * Does not change Twilio routing or brain architecture.
 * Stops immediately if minimal create returns 500.
 */

"use strict";

const path = require("path");
const Module = require("module");

const serverNodeModules = path.join(__dirname, "..", "server", "node_modules");
module.paths.unshift(serverNodeModules);
process.env.NODE_PATH = [serverNodeModules, process.env.NODE_PATH || ""]
  .filter(Boolean)
  .join(path.delimiter);
if (typeof Module._initPaths === "function") Module._initPaths();

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const speechEngine = require("../server/speech-engine");

async function main() {
  console.log("Diagnosing Speech Engine create (minimal payload first)…");
  const report = await speechEngine.diagnoseSpeechEngineCreate();
  console.log(JSON.stringify(report, null, 2));

  if (report.engineId) {
    console.log(
      `\nIf successful, set ELEVENLABS_SPEECH_ENGINE_ID=${report.engineId} in .env`
    );
  }

  if (!report.ok) process.exitCode = 3;
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
