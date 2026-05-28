require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const path = require("path");
const { handleLeadRequest } = require("./leads-handler");

const app = express();
const PORT = process.env.PORT || 5500;
const root = path.join(__dirname, "..");

app.use(express.json({ limit: "32kb" }));

app.post("/api/leads", (req, res) => handleLeadRequest(req, res));

app.use(express.static(root));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.sendFile(path.join(root, "index.html"));
});

app.listen(PORT, () => {
  console.log(`FreedomDesk running at http://127.0.0.1:${PORT}`);
  console.log("Lead API: POST /api/leads");
});
