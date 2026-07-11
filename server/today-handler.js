"use strict";

/**
 * GET /api/today — preview JSON with live latest-call overlay when present.
 */

const fs = require("fs");
const path = require("path");
const { readLatestActionableCall } = require("./latest-call-store");

const PREVIEW_PATH = path.join(__dirname, "..", "data", "my-day-preview.json");

async function mergeTodayWithLatestCall(preview, latest) {
  const { mergeTodayWithLatestCall: merge } = await import(
    "../src/telephony/todayMerge.ts"
  );
  return merge(preview, latest);
}

function loadPreview() {
  const raw = fs.readFileSync(PREVIEW_PATH, "utf8");
  return JSON.parse(raw);
}

async function buildTodayPayload(options = {}) {
  const preview = options.preview || loadPreview();
  const latest =
    options.latest !== undefined
      ? options.latest
      : readLatestActionableCall(options.storePath);
  return mergeTodayWithLatestCall(preview, latest);
}

async function handleTodayRequest(req, res, options = {}) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }

  try {
    const payload = await buildTodayPayload(options);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error("Today live read failed:", err && err.message ? err.message : err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to load Today." }));
  }
}

module.exports = {
  PREVIEW_PATH,
  buildTodayPayload,
  handleTodayRequest,
};
