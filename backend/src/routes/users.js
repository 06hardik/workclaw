const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(req.walletAddress);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: parseUser(user) });
});

router.put("/me", requireAuth, (req, res) => {
  const { name, headline, bio, skills, hourly_rate, role, avatar_seed } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      headline = COALESCE(?, headline),
      bio = COALESCE(?, bio),
      skills = COALESCE(?, skills),
      hourly_rate = COALESCE(?, hourly_rate),
      role = COALESCE(?, role),
      avatar_seed = COALESCE(?, avatar_seed)
    WHERE wallet_address = ?
  `).run(
    name ?? null, headline ?? null, bio ?? null,
    skills ? JSON.stringify(skills) : null,
    hourly_rate ?? null, role ?? null, avatar_seed ?? null,
    req.walletAddress
  );

  const user = db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(req.walletAddress);
  res.json({ user: parseUser(user) });
});

router.get("/stats/:address", (req, res) => {
  const db = getDb();
  const wallet = req.params.address.toLowerCase();

  const totalEarned = db.prepare(
    "SELECT COALESCE(SUM(escrow_amount + yield_freelancer), 0) as total FROM contracts WHERE freelancer_address = ? AND status IN ('COMPLETED','RESOLVED')"
  ).get(wallet);

  const completedJobs = db.prepare(
    "SELECT COUNT(*) as count FROM contracts WHERE freelancer_address = ? AND status IN ('COMPLETED','RESOLVED')"
  ).get(wallet);

  const activeContracts = db.prepare(
    "SELECT COUNT(*) as count FROM contracts WHERE (freelancer_address = ? OR client_address = ?) AND status = 'ACTIVE'"
  ).get(wallet, wallet);

  const postedJobs = db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE client_address = ?").get(wallet);

  res.json({
    totalEarned: totalEarned.total,
    completedJobs: completedJobs.count,
    activeContracts: activeContracts.count,
    postedJobs: postedJobs.count,
  });
});

router.get("/:address", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(req.params.address.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: parseUser(user) });
});

function parseUser(user) {
  return { ...user, skills: JSON.parse(user.skills || "[]") };
}

module.exports = router;
