"use strict";

/**
 * Minimal persistence for the latest actionable call result.
 * One file — enough for Today to load a live Front Desk recommendation.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.join(
  __dirname,
  "..",
  "data",
  "latest-actionable-call.json"
);

function resolveStorePath(overridePath) {
  return overridePath || process.env.FD_LATEST_CALL_PATH || DEFAULT_PATH;
}

function readLatestActionableCall(overridePath) {
  const filePath = resolveStorePath(overridePath);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schema !== "latest-actionable-call/v1") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLatestActionableCall(artifact, overridePath) {
  const filePath = resolveStorePath(overridePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  return filePath;
}

/**
 * Write the latest call unless an existing artifact is newer and for a different call.
 * Prevents a late close of a prior call from overwriting the newest record.
 */
function writeLatestActionableCallIfCurrent(artifact, overridePath) {
  if (!artifact || artifact.schema !== "latest-actionable-call/v1") {
    return { written: false, reason: "invalid_artifact" };
  }
  const existing = readLatestActionableCall(overridePath);
  if (existing && existing.callId && existing.callId !== artifact.callId) {
    const existingTs = Date.parse(String(existing.generatedAt || "")) || 0;
    const nextTs = Date.parse(String(artifact.generatedAt || "")) || 0;
    if (existingTs > nextTs) {
      return {
        written: false,
        reason: "stale_older_than_existing",
        existingCallId: existing.callId,
      };
    }
  }
  const filePath = writeLatestActionableCall(artifact, overridePath);
  return { written: true, filePath, callId: artifact.callId };
}

function clearLatestActionableCall(overridePath) {
  const filePath = resolveStorePath(overridePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  DEFAULT_PATH,
  resolveStorePath,
  readLatestActionableCall,
  writeLatestActionableCall,
  writeLatestActionableCallIfCurrent,
  clearLatestActionableCall,
};
