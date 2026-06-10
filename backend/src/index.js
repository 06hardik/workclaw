import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIO } from "socket.io";
import { ethers } from "ethers";

import jobsRouter from "./routes/jobs.js";
import agentRouter from "./routes/agent.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import messagesRouter from "./routes/messages.js";
import proposalsRouter from "./routes/proposals.js";
import contractsRouter from "./routes/contracts.js";
import { startEventListener } from "./agent/eventListener.js";
import { WorkClawAgent } from "./agent/WorkClawAgent.js";
import { connectDB } from "./config/database.js";
// Ignore ethers "filter not found" errors that happen when polling Hardhat local node
function isEthersFilterError(err) {
  if (!err) return false;
  const msg = typeof err === "string" ? err : (err.message || err.shortMessage || String(err));
  return msg.includes("filter not found") || msg.includes("could not coalesce error");
}

process.on("unhandledRejection", (reason) => {
  if (isEthersFilterError(reason)) return;
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  if (isEthersFilterError(err)) return;
  console.error("Uncaught Exception:", err);
});

// Ethers v6 sometimes logs these @TODO errors directly to console
const origError = console.error;
console.error = function (...args) {
  if (args.some(arg => isEthersFilterError(arg))) return;
  origError.apply(console, args);
};

const origLog = console.log;
console.log = function (...args) {
  if (args.some(arg => isEthersFilterError(arg))) return;
  origLog.apply(console, args);
};

const origWarn = console.warn;
console.warn = function (...args) {
  if (args.some(arg => isEthersFilterError(arg))) return;
  origWarn.apply(console, args);
};

const app = express();
const httpServer = createServer(app);

// ── WebSocket (for real-time frontend updates) ────────────────────────────────
export const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Frontend connected:", socket.id);
  
  socket.on("joinJobRoom", (jobId) => {
    socket.join(`job_${jobId}`);
    console.log(`🔌 Socket ${socket.id} joined room job_${jobId}`);
  });

  socket.on("leaveJobRoom", (jobId) => {
    socket.leave(`job_${jobId}`);
    console.log(`🔌 Socket ${socket.id} left room job_${jobId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Frontend disconnected:", socket.id);
  });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/stats", statsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: `Mantle Sepolia (${process.env.MANTLE_CHAIN_ID})`,
    agent: process.env.AGENT_WALLET_ADDRESS,
  });
});

// ── Agent init ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);

httpServer.listen(PORT, async () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  🦀 WorkClaw Backend                  ║
  ║  Port: ${PORT}                           ║
  ║  Network: Mantle Sepolia              ║
  ║  Chain ID: ${process.env.MANTLE_CHAIN_ID || "5003"}                        ║
  ╚════════════════════════════════════════╝
  `);

  // Start database and blockchain listener
  try {
    await connectDB();
    await startEventListener(io);
    console.log("✅ Blockchain event listener started");
  } catch (err) {
    console.error("❌ Event listener failed to start:", err.message);
  }
});

export default app;
