require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const path = require("path");
const { handleLeadRequest } = require("./leads-handler");
const { handleInboundVoice, handleGatherVoice } = require("./twilio-voice");
const { handleTodayRequest } = require("./today-handler");

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

app.use(express.static(root));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.sendFile(path.join(root, "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FreedomDesk running at http://127.0.0.1:${PORT}`);
    console.log("Lead API: POST /api/leads");
    console.log("Today API: GET /api/today");
    console.log("Twilio inbound: POST /api/twilio/voice/inbound");
    console.log("Twilio gather:  POST /api/twilio/voice/gather");
    console.log(`Companion UI: http://127.0.0.1:${PORT}/app/#today`);
  });
}

module.exports = { app };
