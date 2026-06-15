const express = require("express");
const { SiweMessage } = require("siwe");
const { getDb } = require("../models/db");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// In-memory nonce store (short-lived, fine for a hackathon demo)
const nonces = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000;

function pruneNonces() {
  const now = Date.now();
  for (const [nonce, ts] of nonces.entries()) {
    if (now - ts > NONCE_TTL_MS) nonces.delete(nonce);
  }
}

// GET /api/auth/nonce
router.get("/nonce", (req, res) => {
  pruneNonces();
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  nonces.set(nonce, Date.now());
  res.json({ nonce });
});

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const { message, signature } = req.body;
    if (!message || !signature) {
      return res.status(400).json({ error: "Message and signature required" });
    }

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    if (!nonces.has(fields.nonce)) {
      return res.status(400).json({ error: "Invalid or expired nonce" });
    }
    nonces.delete(fields.nonce);

    const wallet = fields.address.toLowerCase();
    const db = getDb();

    db.prepare(`
      INSERT INTO users (wallet_address, role, name)
      VALUES (?, 'FREELANCER', ?)
      ON CONFLICT(wallet_address) DO NOTHING
    `).run(wallet, `User_${wallet.slice(2, 8)}`);

    const sessionId = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    db.prepare("INSERT INTO sessions (id, wallet_address, nonce, expires_at) VALUES (?, ?, ?, ?)")
      .run(sessionId, wallet, fields.nonce, expiresAt);

    const user = db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(wallet);

    res.json({ success: true, sessionId, user: { ...user, skills: JSON.parse(user.skills || "[]") } });
  } catch (err) {
    console.error("[Auth] verify error:", err.message);
    res.status(400).json({ error: err.message || "Verification failed" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const sessionId = req.headers["x-session-token"];
  if (sessionId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  res.json({ success: true });
});

module.exports = router;
