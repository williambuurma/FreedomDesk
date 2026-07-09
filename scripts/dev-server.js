#!/usr/bin/env node
"use strict";

/**
 * Local product UI server — zero dependencies.
 * Serves the repo root so app/ can fetch ../data/*-preview.json.
 *
 * Usage: npm run dev
 * Opens: http://127.0.0.1:5500/app/#intelligence-inbox
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 5500;
const HOST = process.env.HOST || "127.0.0.1";
const OPEN_PATH = "/app/#intelligence-inbox";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function refreshPreviews() {
  const generators = [
    ["preview:intelligence-inbox", "node", ["--experimental-strip-types", "scripts/generate-intelligence-inbox-preview.js"]],
    ["preview:my-day", "node", ["scripts/generate-my-day-preview.js"]],
    ["preview:morning-brief", "node", ["scripts/generate-morning-brief-preview.js"]],
  ];

  console.log("Refreshing preview data…");
  for (const [label, cmd, args] of generators) {
    const result = spawnSync(cmd, args, {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
    });
    if (result.status !== 0) {
      console.warn(`  ⚠ ${label} failed — continuing with existing data`);
      if (result.stderr) console.warn(result.stderr.trim());
    } else {
      const line = (result.stdout || result.stderr || "").trim().split("\n").pop();
      console.log(`  ✓ ${label}${line ? " — " + line : ""}`);
    }
  }
}

function safeJoin(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, relative || ".");
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

function send(res, status, body, headers) {
  res.writeHead(status, headers || {});
  res.end(body);
}

function serveFile(filePath, res) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    send(res, 200, data, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
  });
}

function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const urlPath = req.url || "/";
  let filePath = safeJoin(urlPath);
  if (!filePath) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.stat(filePath, function (err, stat) {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    } else if (err) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    if (req.method === "HEAD") {
      fs.stat(filePath, function (headErr, headStat) {
        if (headErr || !headStat.isFile()) {
          send(res, 404, "", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, "", {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Length": headStat.size,
          "Cache-Control": "no-store",
        });
      });
      return;
    }

    serveFile(filePath, res);
  });
}

function openBrowser(url) {
  if (process.env.FD_NO_OPEN === "1") return;
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      spawnSync("open", [url], { stdio: "ignore" });
    } else if (platform === "win32") {
      spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore" });
    } else {
      spawnSync("xdg-open", [url], { stdio: "ignore" });
    }
  } catch (_e) {
    /* browser open is best-effort */
  }
}

function main() {
  const skipRefresh = process.env.FD_SKIP_PREVIEW === "1";
  if (!skipRefresh) {
    refreshPreviews();
  }

  const server = http.createServer(handler);
  server.listen(PORT, HOST, function () {
    const base = `http://${HOST}:${PORT}`;
    const productUrl = `${base}${OPEN_PATH}`;
    console.log("");
    console.log("FreedomDesk local UI");
    console.log(`  Product UI:  ${productUrl}`);
    console.log(`  My Day:      ${base}/app/#my-day`);
    console.log(`  Morning Brief: ${base}/app/#morning-brief`);
    console.log(`  Marketing:   ${base}/`);
    console.log("");
    console.log("Press Ctrl+C to stop.");
    openBrowser(productUrl);
  });

  server.on("error", function (err) {
    if (err && err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Try: PORT=5501 npm run dev`);
      process.exit(1);
    }
    throw err;
  });
}

main();
