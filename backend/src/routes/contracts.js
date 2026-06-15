const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../middleware/auth");
const orchestrator = require("../agents/orchestrator");
const byrealAgent = require("../agents/byrealAgent");
const geminiAgent = require("../agents/geminiAgent");

const router = express.Router();

// GET /api/contracts/my-contracts
router.get("/my-contracts", requireAuth, (req, res) => {
  const db = getDb();
  const contracts = db.prepare(`
    SELECT c.*,
           jp.title as job_title, jp.description as job_description, jp.scope as job_scope,
           client.name as client_name,
           fl.name as freelancer_name
    FROM contracts c
    LEFT JOIN job_postings jp ON c.job_id = jp.id
    LEFT JOIN users client ON c.client_address = client.wallet_address
    LEFT JOIN users fl ON c.freelancer_address = fl.wallet_address
    WHERE c.client_address = ? OR c.freelancer_address = ?
    ORDER BY c.created_at DESC
  `).all(req.walletAddress, req.walletAddress);
  res.json({ contracts });
});

// GET /api/contracts/:id
router.get("/:id", requireAuth, (req, res) => {
  const db = getDb();
  const contract = db.prepare(`
    SELECT c.*,
           jp.title as job_title, jp.description as job_description, jp.scope as job_scope,
           client.name as client_name,
           fl.name as freelancer_name, fl.headline as freelancer_headline,
           pr.cover_letter, pr.bid_amount
    FROM contracts c
    LEFT JOIN job_postings jp ON c.job_id = jp.id
    LEFT JOIN users client ON c.client_address = client.wallet_address
    LEFT JOIN users fl ON c.freelancer_address = fl.wallet_address
    LEFT JOIN proposals pr ON c.proposal_id = pr.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }

  const logs = db.prepare("SELECT * FROM agent_logs WHERE contract_id = ? ORDER BY created_at DESC").all(req.params.id);

  let aiReasoning = null;
  if (contract.ai_reasoning) {
    try { aiReasoning = JSON.parse(contract.ai_reasoning); } catch {}
  }

  res.json({ contract: { ...contract, ai_reasoning_parsed: aiReasoning }, logs });
});

// GET /api/contracts/:id/yield
router.get("/:id/yield", requireAuth, async (req, res) => {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }

  if (!contract.byreal_position_id) {
    return res.json({
      yieldClient: 0, yieldFreelancer: 0, totalYield: 0, ageDays: 0,
      apy: byrealAgent.apy * 100, pool: byrealAgent.poolId, demoMode: byrealAgent.demoMode
    });
  }

  try {
    const data = await byrealAgent.getYield(contract.byreal_position_id, contract.id, contract.created_at * 1000, contract.escrow_amount);
    const splitBps = contract.yield_split_bps || 5000;
    const yc = data.yieldUsdc * (splitBps / 10000);
    const yf = data.yieldUsdc - yc;
    res.json({
      yieldClient: yc, yieldFreelancer: yf, totalYield: data.yieldUsdc,
      ageDays: data.ageDays, apy: byrealAgent.apy * 100, pool: byrealAgent.poolId,
      demoMode: byrealAgent.demoMode
    });
  } catch {
    res.json({ yieldClient: 0, yieldFreelancer: 0, totalYield: 0, ageDays: 0, apy: byrealAgent.apy * 100, demoMode: byrealAgent.demoMode });
  }
});

// POST /api/contracts/:id/submit-deliverable
router.post("/:id/submit-deliverable", requireAuth, (req, res) => {
  const { deliverable_content, deliverable_hash } = req.body;
  if (!deliverable_content && !deliverable_hash) {
    return res.status(400).json({ error: "Deliverable content or hash required" });
  }

  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Only the freelancer can submit deliverables" });
  }
  if (!["ACTIVE", "DISPUTED"].includes(contract.status)) {
    return res.status(400).json({ error: "Contract is not in a submittable state" });
  }

  db.prepare(`
    UPDATE contracts SET deliverable_content = ?, deliverable_hash = ?, status = 'SUBMITTED'
    WHERE id = ?
  `).run(deliverable_content || null, deliverable_hash || null, contract.id);

  db.prepare("UPDATE job_postings SET status = 'IN_REVIEW' WHERE id = ?").run(contract.job_id);

  const wss = req.app.get("wss");
  setImmediate(async () => {
    try {
      const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract.id);
      await orchestrator.runVerification(updated, wss);
    } catch (err) {
      console.error("[API] Verification error:", err.message);
    }
  });

  res.json({ success: true, message: "Deliverable submitted. AI verification in progress." });
});

// POST /api/contracts/:id/force-approve (client overrides a DISPUTED contract)
router.post("/:id/force-approve", requireAuth, (req, res) => {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress) {
    return res.status(403).json({ error: "Only the client can force approve" });
  }
  if (contract.status !== "DISPUTED") {
    return res.status(400).json({ error: "Contract must be in DISPUTED status" });
  }

  const wss = req.app.get("wss");
  setImmediate(async () => {
    try {
      const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract.id);
      await orchestrator.releasePayment(updated, wss);
    } catch (err) {
      console.error("[API] Force-approve release error:", err.message);
    }
  });

  res.json({ success: true, message: "Force approved. Payment release initiated." });
});

// POST /api/contracts/:id/raise-dispute - either party formally escalates
router.post("/:id/raise-dispute", requireAuth, (req, res) => {
  const { reason } = req.body;
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }
  if (!["ACTIVE", "SUBMITTED"].includes(contract.status)) {
    return res.status(400).json({ error: "Cannot raise a dispute in this status" });
  }

  db.prepare("UPDATE contracts SET status = 'DISPUTED' WHERE id = ?").run(contract.id);
  db.prepare("UPDATE job_postings SET status = 'IN_REVIEW' WHERE id = ?").run(contract.job_id);

  orchestrator.logAgentAction(contract, 6, // WARN_USER
    `Dispute raised by ${req.walletAddress === contract.client_address ? "client" : "freelancer"}: ${reason || "No reason provided"}`,
    false, req.app.get("wss"));

  res.json({ success: true, message: "Dispute raised. The AI agent will review and propose a resolution." });
});

// POST /api/contracts/:id/resolve-dispute - AI proposes split, agent executes
router.post("/:id/resolve-dispute", requireAuth, async (req, res) => {
  const { client_claim, freelancer_response } = req.body;
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }
  if (contract.status !== "DISPUTED") {
    return res.status(400).json({ error: "Contract must be in DISPUTED status" });
  }

  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(contract.job_id);
  const resolution = await geminiAgent.resolveDispute(
    job.title, job.description, contract.deliverable_content,
    client_claim, freelancer_response
  );

  const wss = req.app.get("wss");
  setImmediate(async () => {
    try {
      const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract.id);
      await orchestrator.resolveDisputeSplit(updated, resolution.clientShareBps, resolution.reasoning, wss);
    } catch (err) {
      console.error("[API] Dispute resolution error:", err.message);
    }
  });

  res.json({ success: true, resolution, message: "AI dispute resolution initiated." });
});

// POST /api/contracts/:id/cancel
router.post("/:id/cancel", requireAuth, (req, res) => {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress) return res.status(403).json({ error: "Not authorized" });
  if (!["DISPUTED"].includes(contract.status)) {
    return res.status(400).json({ error: "Can only cancel disputed contracts (use resolve-dispute for splits)" });
  }

  db.prepare("UPDATE contracts SET status = 'CANCELLED' WHERE id = ?").run(contract.id);
  db.prepare("UPDATE job_postings SET status = 'CANCELLED' WHERE id = ?").run(contract.job_id);

  if (contract.byreal_position_id) {
    byrealAgent.closePosition(contract.byreal_position_id).catch(console.error);
  }

  res.json({ success: true, message: "Contract cancelled." });
});

// GET /api/contracts/:id/logs
router.get("/:id/logs", requireAuth, (req, res) => {
  const db = getDb();
  const logs = db.prepare("SELECT * FROM agent_logs WHERE contract_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ logs });
});

// GET /api/contracts/:id/messages
router.get("/:id/messages", requireAuth, (req, res) => {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m
    LEFT JOIN users u ON m.sender_address = u.wallet_address
    WHERE m.contract_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.id);

  res.json({ messages });
});

// POST /api/contracts/:id/messages
router.post("/:id/messages", requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Message content required" });

  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.client_address !== req.walletAddress && contract.freelancer_address !== req.walletAddress) {
    return res.status(403).json({ error: "Not a party to this contract" });
  }

  const id = require("uuid").v4();
  db.prepare(`
    INSERT INTO messages (id, contract_id, sender_address, content)
    VALUES (?, ?, ?, ?)
  `).run(id, contract.id, req.walletAddress, content.trim());

  const msg = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m
    LEFT JOIN users u ON m.sender_address = u.wallet_address
    WHERE m.id = ?
  `).get(id);

  // Broadcast to WebSockets
  const wss = req.app.get("wss");
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: "CHAT_MESSAGE", contractId: contract.id, message: msg }));
      }
    });
  }

  res.status(201).json({ message: msg });
});

module.exports = router;
