require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const express = require("express");
const path = require("path");
const { handleLeadRequest } = require("./leads-handler");
const { handleInboundVoice, handleGatherVoice } = require("./twilio-voice");
const { handleTodayRequest } = require("./today-handler");
const {
  attachConversationRelayWebSocket,
  handleConversationStatus,
  useConversationRelay,
} = require("./conversation-relay");
const {
  attachSpeechEngine,
  useSpeechEngine,
} = require("./speech-engine");

const app = express();
const PORT = process.env.PORT || 5500;
const root = path.join(__dirname, "..");

// JSON for app APIs; urlencoded for Twilio form webhooks.
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));

app.post("/api/leads", (req, res) => handleLeadRequest(req, res));

app.get("/api/today", (req, res) => handleTodayRequest(req, res));

app.post("/api/twilio/voice/inbound", (req, res) => {
  handleInboundVoice(req, res).catch((err) => {
    console.error("Inbound voice error:", err && err.message ? err.message : err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Voice handler error");
  });
});

app.post("/api/twilio/voice/gather", (req, res) => {
  handleGatherVoice(req, res).catch((err) => {
    console.error("Gather voice error:", err && err.message ? err.message : err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Gather handler error");
  });
});

app.post("/api/twilio/voice/conversation-status", (req, res) => {
  handleConversationStatus(req, res).catch((err) => {
    console.error(
      "Conversation status error:",
      err && err.message ? err.message : err
    );
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Status handler error");
  });
});

app.use(express.static(root));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.sendFile(path.join(root, "index.html"));
});

const server = http.createServer(app);
attachConversationRelayWebSocket(server);

async function start() {
  await attachSpeechEngine(server);
  server.listen(PORT, () => {
    console.log(`FreedomDesk running at http://127.0.0.1:${PORT}`);
    console.log("Lead API: POST /api/leads");
    console.log("Today API: GET /api/today");
    console.log("Twilio inbound: POST /api/twilio/voice/inbound");
    console.log("Twilio gather:  POST /api/twilio/voice/gather");
    console.log(
      `Twilio ConversationRelay WS: wss://…/api/twilio/voice/conversation (flag=${
        useConversationRelay() ? "on" : "off"
      })`
    );
    console.log(
      `Speech Engine media WS: wss://…/api/twilio/voice/media-stream (flag=${
        useSpeechEngine() ? "on" : "off"
      })`
    );
    console.log(
      `Speech Engine brain WS: wss://…/api/speech-engine/ws (flag=${
        useSpeechEngine() ? "on" : "off"
      })`
    );
    console.log(`Companion UI: http://127.0.0.1:${PORT}/app/#today`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error(
      "Server failed to start:",
      err && err.message ? err.message : err
    );
    process.exit(1);
  });
}

module.exports = { app, server };
