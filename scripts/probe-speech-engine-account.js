#!/usr/bin/env node
/**
 * Probe whether the configured ElevenLabs account can use Speech Engine.
 * Non-destructive when ELEVENLABS_SPEECH_ENGINE_ID is set (get only).
 *
 * Usage:
 *   node scripts/probe-speech-engine-account.js
 *   node scripts/probe-speech-engine-account.js --ensure
 */

"use strict";

const path = require("path");
const Module = require("module");

const serverNodeModules = path.join(__dirname, "..", "server", "node_modules");
module.paths.unshift(serverNodeModules);
const originalNodePath = process.env.NODE_PATH || "";
process.env.NODE_PATH = [serverNodeModules, originalNodePath]
  .filter(Boolean)
  .join(path.delimiter);
if (typeof Module._initPaths === "function") {
  Module._initPaths();
}

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const speechEngine = require("../server/speech-engine");

async function main() {
  const ensure = process.argv.includes("--ensure");
  console.log("Probing ElevenLabs Speech Engine account support…");
  const probe = await speechEngine.probeSpeechEngineAccount();
  console.log(JSON.stringify(probe, null, 2));

  if (!probe.ok) {
    process.exitCode = 2;
    return;
  }

  if (ensure) {
    console.log("Ensuring Speech Engine resource (ulaw + Amber King)…");
    const ensured = await speechEngine.ensureSpeechEngineResource();
    console.log(JSON.stringify(ensured, null, 2));
    if (!ensured.ok) process.exitCode = 3;
    else if (ensured.engineId) {
      console.log(
        `\nSet ELEVENLABS_SPEECH_ENGINE_ID=${ensured.engineId} in .env`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
