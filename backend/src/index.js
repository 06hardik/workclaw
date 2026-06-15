require("dotenv").config();

// Suppress ethers v6 @TODO "filter not found" spam caused by public RPCs dropping filters
const originalLog = console.log;
console.log = function (...args) {
  const msg = args.map(a => (a && a.message) ? a.message : String(a)).join(' ');
  if (msg.includes('@TODO') && msg.includes('could not coalesce error') && msg.includes('filter not found')) return;
  originalLog.apply(console, args);
};

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

require("./models/migrate");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

app.set("wss", wss);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/proposals", require("./routes/proposals"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/upload", require("./routes/upload"));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  ws.send(JSON.stringify({ type: "CONNECTED", message: "WorkClaw Agent connected" }));
  ws.on("close", () => console.log("[WS] Client disconnected"));
  ws.on("error", (err) => console.error("[WS] Error:", err.message));
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`\n🦀 WorkClaw Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server on ws://localhost:${PORT}/ws`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);

  const orchestrator = require("./agents/orchestrator");
  await orchestrator.initBlockchainListener(wss);
  orchestrator.startYieldPoller(wss);
});

module.exports = { app, server };
