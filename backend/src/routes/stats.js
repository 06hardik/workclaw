import express from "express";
import { ethers } from "ethers";
import {
  getProvider,
  getWorkEscrowContract,
  getAgentLedgerContract,
  JOB_STATUS,
  formatJob,
} from "../config/blockchain.js";

const router = express.Router();

// ── GET /api/stats — platform-wide statistics ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const provider = getProvider();
    const escrow   = getWorkEscrowContract(provider);
    const ledger   = getAgentLedgerContract(provider);

    const counter = await escrow.jobCounter();
    const total   = Number(counter);

    if (total === 0) {
      return res.json({
        success:            true,
        totalJobs:          0,
        totalValueEscrowed: "0.00",
        totalYieldEarned:   "0.00",
        completedJobs:      0,
        activeJobs:         0,
        disputedJobs:       0,
        agentDecisions:     0,
        agentAccuracy:      "100.0",
        network: {
          name:    "Mantle Sepolia",
          chainId: 5003,
          rpc:     "https://rpc.sepolia.mantle.xyz",
          explorer: "https://explorer.sepolia.mantle.xyz",
        },
        contracts: {
          WorkEscrow:  process.env.WORK_ESCROW_ADDRESS,
          AgentLedger: process.env.AGENT_LEDGER_ADDRESS,
        },
      });
    }

    // Load all jobs
    const jobs = [];
    for (let i = 1; i <= total; i++) {
      const raw = await escrow.getJob(i);
      jobs.push(formatJob(raw));
    }

    // Calculate statistics
    const stats = {
      totalJobs:          total,
      completedJobs:      jobs.filter(j => j.status === "COMPLETED").length,
      activeJobs:         jobs.filter(j => j.status === "ACTIVE" || j.status === "SUBMITTED").length,
      openJobs:           jobs.filter(j => j.status === "OPEN").length,
      disputedJobs:       jobs.filter(j => j.status === "DISPUTED" || j.status === "RESOLVED").length,
      totalValueEscrowed: jobs.reduce((sum, j) => sum + parseFloat(j.amount), 0).toFixed(2),
      totalYieldEarned:   jobs.reduce((sum, j) => sum + parseFloat(j.yieldEarned || "0"), 0).toFixed(4),
    };

    // Agent decisions
    const nftId     = parseInt(process.env.AGENT_NFT_ID || "1");
    let decisions   = [];
    let agentAccuracy = "100.0";
    
    try {
      decisions   = await ledger.getDecisions(nftId);
      const total = decisions.length;
      const good  = decisions.filter(d => d.outcome).length;
      agentAccuracy = total > 0 ? ((good / total) * 100).toFixed(1) : "100.0";
    } catch {}

    res.json({
      success: true,
      ...stats,
      agentDecisions: decisions.length,
      agentAccuracy,
      network: {
        name:     "Mantle Sepolia",
        chainId:  5003,
        rpc:      "https://rpc.sepolia.mantle.xyz",
        explorer: "https://explorer.sepolia.mantle.xyz",
      },
      contracts: {
        WorkEscrow:  process.env.WORK_ESCROW_ADDRESS,
        AgentLedger: process.env.AGENT_LEDGER_ADDRESS,
        MockUSDC:    process.env.MOCK_USDC_ADDRESS,
      },
      powered_by: {
        ai:      "Google Gemini 1.5 Flash",
        defi:    "Byreal CLMM (Solana)",
        chain:   "Mantle Sepolia (EVM L2)",
        identity: "ERC-8004 Agent NFT",
      },
    });

  } catch (err) {
    console.error("GET /stats error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
