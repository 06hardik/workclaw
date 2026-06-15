const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const orchestrator = require("../agents/orchestrator");

const router = express.Router();

// GET /api/proposals/job/:jobId - client views proposals for their job
router.get("/job/:jobId", requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.client_address !== req.walletAddress) {
    return res.status(403).json({ error: "Only the client can view proposals" });
  }

  const proposals = db.prepare(`
    SELECT p.*, u.name as freelancer_name, u.headline as freelancer_headline, u.bio as freelancer_bio,
           u.reputation_score, u.total_jobs_completed, u.skills, u.hourly_rate, u.avatar_seed
    FROM proposals p
    LEFT JOIN users u ON p.freelancer_address = u.wallet_address
    WHERE p.job_id = ?
    ORDER BY p.submitted_at DESC
  `).all(req.params.jobId);

  res.json({ proposals: proposals.map(parseProposal) });
});

// GET /api/proposals/my-proposals
router.get("/my-proposals", requireAuth, (req, res) => {
  const db = getDb();
  const proposals = db.prepare(`
    SELECT p.*, jp.title as job_title, jp.description as job_description,
           jp.budget as job_budget, jp.status as job_status, jp.budget_token as job_budget_token,
           u.name as client_name
    FROM proposals p
    LEFT JOIN job_postings jp ON p.job_id = jp.id
    LEFT JOIN users u ON jp.client_address = u.wallet_address
    WHERE p.freelancer_address = ?
    ORDER BY p.submitted_at DESC
  `).all(req.walletAddress);

  res.json({ proposals: proposals.map(parseProposal) });
});

// POST /api/proposals - submit a proposal
router.post("/", requireAuth, (req, res) => {
  const { job_id, cover_letter, bid_amount, bid_token, estimated_days } = req.body;

  if (!job_id || !cover_letter || !bid_amount) {
    return res.status(400).json({ error: "Job ID, cover letter, and bid amount are required" });
  }
  if (parseFloat(bid_amount) <= 0) {
    return res.status(400).json({ error: "Bid amount must be greater than 0" });
  }

  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(job_id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "OPEN") return res.status(400).json({ error: "Job is not accepting proposals" });
  if (job.client_address === req.walletAddress) {
    return res.status(400).json({ error: "You cannot propose on your own job" });
  }

  const existing = db.prepare(
    "SELECT id FROM proposals WHERE job_id = ? AND freelancer_address = ?"
  ).get(job_id, req.walletAddress);
  if (existing) return res.status(400).json({ error: "You have already submitted a proposal for this job" });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO proposals (id, job_id, freelancer_address, cover_letter, bid_amount, bid_token, estimated_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, job_id, req.walletAddress, cover_letter, parseFloat(bid_amount), bid_token || "USDC", estimated_days || null);

  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(id);
  res.status(201).json({ proposal: parseProposal(proposal), message: "Proposal submitted successfully" });
});

// POST /api/proposals/:id/accept - client hires freelancer -> creates contract
// Body: { on_chain_job_id?: number, yield_split_bps?: number }
// on_chain_job_id should be the ID returned by WorkEscrow.createJob() after the
// client's wallet signs & funds the escrow transaction in USDC on the frontend.
router.post("/:id/accept", requireAuth, async (req, res) => {
  const db = getDb();
  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.id);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });

  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(proposal.job_id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.client_address !== req.walletAddress) {
    return res.status(403).json({ error: "Only the client can accept proposals" });
  }
  if (job.status !== "OPEN") return res.status(400).json({ error: "Job already has an active contract" });

  db.prepare("UPDATE proposals SET status = 'ACCEPTED' WHERE id = ?").run(proposal.id);
  db.prepare("UPDATE proposals SET status = 'REJECTED' WHERE job_id = ? AND id != ?").run(proposal.job_id, proposal.id);
  db.prepare("UPDATE job_postings SET status = 'IN_PROGRESS' WHERE id = ?").run(proposal.job_id);

  const { yield_split_bps = 5000, on_chain_job_id } = req.body;

  const contractId = uuidv4();
  db.prepare(`
    INSERT INTO contracts (id, job_id, proposal_id, client_address, freelancer_address, escrow_amount, escrow_token, on_chain_job_id, yield_split_bps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contractId, proposal.job_id, proposal.id,
    req.walletAddress, proposal.freelancer_address,
    proposal.bid_amount, proposal.bid_token,
    on_chain_job_id ?? null, yield_split_bps
  );

  if (on_chain_job_id !== undefined && on_chain_job_id !== null) {
    db.prepare("UPDATE job_postings SET on_chain_job_id = ? WHERE id = ?").run(on_chain_job_id, proposal.job_id);

    // Immediately deploy escrow to Byreal (DEPLOY_YIELD step)
    const wss = req.app.get("wss");
    const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
    orchestrator.deployToByreal(contract, proposal.bid_amount, wss).catch((e) =>
      console.error("[Proposals] deployToByreal error:", e.message)
    );
  }

  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
  res.json({
    contract,
    proposal: parseProposal(db.prepare("SELECT * FROM proposals WHERE id = ?").get(proposal.id)),
    message: "Freelancer hired successfully. Escrow funds are being deployed to Byreal for yield generation.",
  });
});

// POST /api/proposals/:id/reject
router.post("/:id/reject", requireAuth, (req, res) => {
  const db = getDb();
  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.id);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });

  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(proposal.job_id);
  if (job.client_address !== req.walletAddress) return res.status(403).json({ error: "Not authorized" });

  db.prepare("UPDATE proposals SET status = 'REJECTED' WHERE id = ?").run(proposal.id);
  res.json({ success: true });
});

function parseProposal(p) {
  return { ...p, skills: p.skills ? JSON.parse(p.skills) : undefined };
}

module.exports = router;
