const { getDb } = require("../models/db");

function requireAuth(req, res, next) {
  const wallet = req.headers["x-wallet-address"];
  const sessionId = req.headers["x-session-token"];

  if (!wallet || !sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const db = getDb();
  const session = db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND wallet_address = ? AND expires_at > strftime('%s','now')"
  ).get(sessionId, wallet.toLowerCase());

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }

  req.walletAddress = wallet.toLowerCase();
  next();
}

function optionalAuth(req, res, next) {
  const wallet = req.headers["x-wallet-address"];
  const sessionId = req.headers["x-session-token"];
  if (wallet && sessionId) {
    const db = getDb();
    const session = db.prepare(
      "SELECT * FROM sessions WHERE id = ? AND wallet_address = ? AND expires_at > strftime('%s','now')"
    ).get(sessionId, wallet.toLowerCase());
    if (session) req.walletAddress = wallet.toLowerCase();
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
