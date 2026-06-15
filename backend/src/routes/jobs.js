const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// NOTE: static sub-routes must be declared before "/:id"

// GET /api/jobs/categories
router.get("/categories", (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT c.*, COUNT(jp.id) as job_count
    FROM categories c
    LEFT JOIN job_postings jp ON c.id = jp.category_id AND jp.status = 'OPEN'
    GROUP BY c.id ORDER BY c.id ASC
  `).all();
  res.json({ categories });
});

// GET /api/jobs/my-posted
router.get("/my-posted", requireAuth, (req, res) => {
  const db = getDb();
  const jobs = db.prepare(`
    SELECT jp.*, c.name as category_name, c.icon as category_icon,
           (SELECT COUNT(*) FROM proposals p WHERE p.job_id = jp.id) as proposal_count
    FROM job_postings jp
    LEFT JOIN categories c ON jp.category_id = c.id
    WHERE jp.client_address = ?
    ORDER BY jp.created_at DESC
  `).all(req.walletAddress);
  res.json({ jobs: jobs.map(parseJob) });
});

// GET /api/jobs
router.get("/", optionalAuth, (req, res) => {
  const db = getDb();
  const { category, status = "OPEN", search, min_budget, max_budget, limit = 20, offset = 0 } = req.query;

  let query = `
    SELECT jp.*, u.name as client_name, u.reputation_score as client_reputation,
           u.total_jobs_completed as client_jobs,
           c.name as category_name, c.icon as category_icon,
           (SELECT COUNT(*) FROM proposals p WHERE p.job_id = jp.id) as proposal_count
    FROM job_postings jp
    LEFT JOIN users u ON jp.client_address = u.wallet_address
    LEFT JOIN categories c ON jp.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += " AND jp.status = ?"; params.push(status); }
  if (category) { query += " AND jp.category_id = ?"; params.push(category); }
  if (search) {
    query += " AND (jp.title LIKE ? OR jp.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (min_budget) { query += " AND jp.budget >= ?"; params.push(parseFloat(min_budget)); }
  if (max_budget) { query += " AND jp.budget <= ?"; params.push(parseFloat(max_budget)); }

  query += " ORDER BY jp.created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const jobs = db.prepare(query).all(...params);
  const total = db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = ?").get(status || "OPEN");

  res.json({ jobs: jobs.map(parseJob), total: total.count });
});

// GET /api/jobs/:id
router.get("/:id", optionalAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`
    SELECT jp.*, u.name as client_name, u.headline as client_headline,
           u.reputation_score as client_reputation, u.total_jobs_completed as client_jobs,
           c.name as category_name, c.icon as category_icon,
           (SELECT COUNT(*) FROM proposals p WHERE p.job_id = jp.id) as proposal_count
    FROM job_postings jp
    LEFT JOIN users u ON jp.client_address = u.wallet_address
    LEFT JOIN categories c ON jp.category_id = c.id
    WHERE jp.id = ?
  `).get(req.params.id);

  if (!job) return res.status(404).json({ error: "Job not found" });

  let userProposal = null;
  if (req.walletAddress) {
    userProposal = db.prepare(
      "SELECT * FROM proposals WHERE job_id = ? AND freelancer_address = ?"
    ).get(req.params.id, req.walletAddress);
  }

  res.json({ job: parseJob(job), userProposal });
});

// POST /api/jobs
router.post("/", requireAuth, (req, res) => {
  const { title, description, category_id, budget, budget_token, scope, skills_required, expires_days } = req.body;

  if (!title || !description || !budget) {
    return res.status(400).json({ error: "Title, description, and budget are required" });
  }
  if (parseFloat(budget) <= 0) {
    return res.status(400).json({ error: "Budget must be greater than 0" });
  }

  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE wallet_address = ?").get(req.walletAddress);
  if (user && user.role === "FREELANCER") {
    db.prepare("UPDATE users SET role = 'BOTH' WHERE wallet_address = ?").run(req.walletAddress);
  }

  const id = uuidv4();
  const expiresAt = expires_days ? Math.floor(Date.now() / 1000) + parseInt(expires_days) * 86400 : null;

  db.prepare(`
    INSERT INTO job_postings (id, client_address, title, description, category_id, budget, budget_token, scope, skills_required, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.walletAddress, title, description,
    category_id || null, parseFloat(budget), budget_token || "USDC",
    scope || description, JSON.stringify(skills_required || []), expiresAt
  );

  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(id);
  res.status(201).json({ job: parseJob(job), message: "Job posted successfully" });
});

// PUT /api/jobs/:id/onchain - link a job to its on-chain job ID after createJob() tx
router.put("/:id/onchain", requireAuth, (req, res) => {
  const { on_chain_job_id } = req.body;
  if (on_chain_job_id === undefined) return res.status(400).json({ error: "on_chain_job_id required" });

  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.client_address !== req.walletAddress) return res.status(403).json({ error: "Not your job" });

  db.prepare("UPDATE job_postings SET on_chain_job_id = ? WHERE id = ?").run(on_chain_job_id, req.params.id);
  res.json({ success: true });
});

// DELETE /api/jobs/:id
router.delete("/:id", requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.client_address !== req.walletAddress) return res.status(403).json({ error: "Not your job" });
  if (job.status !== "OPEN") return res.status(400).json({ error: "Cannot delete a job that already has activity" });

  db.prepare("UPDATE job_postings SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

function parseJob(job) {
  return { ...job, skills_required: JSON.parse(job.skills_required || "[]") };
}

module.exports = router;
