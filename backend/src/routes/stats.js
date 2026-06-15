const express = require("express");
const { getDb } = require("../models/db");
const byrealAgent = require("../agents/byrealAgent");
const { getWorkEscrowAddress, getAgentLedgerAddress, getMockUSDCAddress, isBlockchainConfigured, getAgentNFTId } = require("../config/blockchain");

const router = express.Router();

// GET /api/stats/platform
router.get("/platform", (req, res) => {
  const db = getDb();
  const totalJobs = db.prepare("SELECT COUNT(*) as count FROM job_postings").get();
  const openJobs = db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = 'OPEN'").get();
  const completedJobs = db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = 'COMPLETED'").get();
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const totalEscrow = db.prepare(
    "SELECT COALESCE(SUM(escrow_amount), 0) as total FROM contracts WHERE status IN ('ACTIVE','SUBMITTED','DISPUTED')"
  ).get();
  const totalYield = db.prepare(
    "SELECT COALESCE(SUM(yield_client + yield_freelancer), 0) as total FROM contracts WHERE status IN ('COMPLETED','RESOLVED')"
  ).get();
  const activeContracts = db.prepare("SELECT COUNT(*) as count FROM contracts WHERE status = 'ACTIVE'").get();

  res.json({
    totalJobs: totalJobs.count,
    openJobs: openJobs.count,
    completedJobs: completedJobs.count,
    totalUsers: totalUsers.count,
    totalEscrow: totalEscrow.total,
    totalYield: totalYield.total,
    activeContracts: activeContracts.count,
    byreal: byrealAgent.getPoolInfo(),
    contracts: {
      workEscrow: getWorkEscrowAddress() || null,
      agentLedger: getAgentLedgerAddress() || null,
      mockUSDC: getMockUSDCAddress() || null,
      agentNFTId: getAgentNFTId(),
      onChainEnabled: isBlockchainConfigured(),
    },
  });
});

// GET /api/stats/agent-logs
router.get("/agent-logs", (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT al.*, jp.title as job_title
    FROM agent_logs al
    LEFT JOIN contracts c ON al.contract_id = c.id
    LEFT JOIN job_postings jp ON c.job_id = jp.id
    ORDER BY al.created_at DESC LIMIT 50
  `).all();
  res.json({ logs });
});

module.exports = router;
