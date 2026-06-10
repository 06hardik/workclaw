import express from "express";
import { ethers }  from "ethers";
import {
  getProvider,
  getAgentLedgerContract,
  ACTION_TYPE,
} from "../config/blockchain.js";
import { byrealService }  from "../services/ByrealService.js";
import { workClawAgent }  from "../agent/WorkClawAgent.js";

const router = express.Router();

// ── GET /api/agent/decisions — agent's decision log (ERC-8004) ────────────────
router.get("/decisions", async (req, res) => {
  try {
    const ledger   = getAgentLedgerContract();
    const nftId    = parseInt(process.env.AGENT_NFT_ID || "1");
    const decisions = await ledger.getDecisions(nftId);

    const formatted = decisions.map((d, i) => ({
      index:      i,
      jobId:      d.jobId.toString(),
      timestamp:  new Date(Number(d.timestamp) * 1000).toISOString(),
      actionType: ACTION_TYPE[d.actionType] || d.actionType.toString(),
      reasonHash: d.reasonHash,
      outcome:    d.outcome,
      amountUsd:  (Number(d.amountUsd) / 100).toFixed(2),
    }));

    res.json({
      success:       true,
      agentNFTId:    nftId,
      agentWallet:   process.env.AGENT_WALLET_ADDRESS,
      totalDecisions: formatted.length,
      decisions:     formatted.reverse(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agent/reputation/:address — get user reputation ─────────────────
router.get("/reputation/:address", async (req, res) => {
  try {
    const ledger  = getAgentLedgerContract();
    const address = req.params.address;
    
    const [score, entries, jobsDone] = await Promise.all([
      ledger.getTrustScore(address),
      ledger.getReputationEntries(address),
      ledger.jobsCompleted(address),
    ]);

    res.json({
      success:      true,
      address,
      trustScore:   Number(score),  // 0–10000 bps (divide by 100 for %)
      scorePercent: (Number(score) / 100).toFixed(1),
      jobsCompleted: Number(jobsDone),
      entries:       entries.map(e => ({
        jobId:     e.jobId.toString(),
        score:     Number(e.score),
        comment:   e.comment,
        timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agent/byreal/pools — get Byreal pool data ───────────────────────
router.get("/byreal/pools", async (req, res) => {
  try {
    const pool = await byrealService.getBestStablePool();
    res.json({ success: true, pool });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agent/byreal/overview — Byreal DEX stats ────────────────────────
router.get("/byreal/overview", async (req, res) => {
  try {
    const overview = await byrealService.getOverview();
    res.json({ success: true, overview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agent/byreal/balance — agent wallet balance ─────────────────────
router.get("/byreal/balance", async (req, res) => {
  try {
    const balance = await byrealService.getBalance();
    res.json({ success: true, balance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agent/byreal/signals — market signals ───────────────────────────
router.get("/byreal/signals/:coin?", async (req, res) => {
  try {
    const coin    = req.params.coin || "BTC";
    const signals = await byrealService.getSignals(coin);
    res.json({ success: true, coin, signals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/agent/trigger/verify/:jobId — manually trigger verification ─────
// (For demo/testing purposes)
router.post("/trigger/verify/:jobId", async (req, res) => {
  try {
    const { deliverableContent } = req.body;
    
    if (deliverableContent) {
      workClawAgent.storeDeliverable(req.params.jobId, deliverableContent);
    }
    
    // Trigger async - don't await (responds immediately, agent runs in background)
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes(deliverableContent || "trigger"));
    workClawAgent.onDeliverableSubmitted(req.params.jobId, dummyHash)
      .catch(console.error);

    res.json({
      success: true,
      message: "AI verification triggered. Check the activity feed for real-time updates.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
