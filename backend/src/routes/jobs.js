import express from "express";
import { JobPosting, User } from "../models/index.js";
import { getMockUSDCContract, getClientSigner } from "../config/blockchain.js";

const router = express.Router();

// ── GET /api/jobs — list jobs ───────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status.toUpperCase();
    if (category) whereClause.category = category;

    const jobs = await JobPosting.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ['walletAddress', 'name', 'avatarUrl'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, jobs, total: jobs.length });
  } catch (err) {
    console.error("GET /jobs error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/jobs/:id — get single job ───────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const job = await JobPosting.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['walletAddress', 'name', 'avatarUrl', 'headline'] }]
    });
    
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/jobs — create a new job posting (Off-chain) ────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      clientAddress,
      title,
      description,
      category,
      budget,
      expiresInDays
    } = req.body;

    if (!title || !description || !budget || !clientAddress) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 30));

    const job = await JobPosting.create({
      clientAddress,
      title,
      description,
      category: category || "Programming & Tech",
      budget: String(budget),
      status: 'OPEN',
      expires_at: expiresAt
    });

    res.json({
      success: true,
      job,
      message: `Job posting created! ID: #${job.id}. Waiting for freelancers to submit proposals.`,
    });

  } catch (err) {
    console.error("POST /jobs error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/jobs/faucet/claim — Claim 10,000 mock USDC (Demo only) ─────────
router.post("/faucet/claim", async (req, res) => {
  try {
    const signer = getClientSigner();
    const mockUSDC = getMockUSDCContract(signer);
    
    // Call faucet on the smart contract
    const tx = await mockUSDC.faucet();
    await tx.wait();
    
    res.json({ success: true, message: "10,000 wcUSDC claimed successfully!" });
  } catch (err) {
    console.error("POST /faucet/claim error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
