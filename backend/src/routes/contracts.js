import express from "express";
import { Contract, JobPosting, User, Proposal } from "../models/index.js";
import { getFreelancerSigner, getWorkEscrowContract } from "../config/blockchain.js";
import { ethers } from "ethers";
import { workClawAgent } from "../agent/WorkClawAgent.js";

const router = express.Router();

// Get all contracts for a user (Client or Freelancer)
router.get("/user/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const contracts = await Contract.findAll({
      where: {
        $or: [
          { clientAddress: walletAddress },
          { freelancerAddress: walletAddress }
        ]
      },
      include: [
        { model: JobPosting },
        { model: Proposal }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, contracts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Freelancer submits a deliverable
router.post("/:id/submit", async (req, res) => {
  try {
    const { deliverableContent } = req.body;
    
    if (!deliverableContent) {
      return res.status(400).json({ success: false, error: "deliverableContent required" });
    }

    const contract = await Contract.findByPk(req.params.id);
    if (!contract || contract.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: "Contract not active" });
    }

    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes(deliverableContent));

    // Update DB
    contract.deliverableContent = deliverableContent;
    contract.status = 'SUBMITTED';
    await contract.save();

    // Store in agent
    workClawAgent.storeDeliverable(contract.onChainJobId, deliverableContent);

    // Freelancer signs the submission on-chain
    const signer = getFreelancerSigner();
    const escrow = getWorkEscrowContract(signer);
    
    const tx = await escrow.submitDeliverable(contract.onChainJobId, deliverableHash);
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: receipt.hash,
      message: "Deliverable submitted! WorkClaw AI agent is verifying...",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Live Yield Ticker Endpoint (Poll every 30s)
router.get("/:id/yield", async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ success: false, error: "Contract not found" });

    res.json({
      success: true,
      yieldClient: contract.yieldClient,
      yieldFreelancer: contract.yieldFreelancer,
      totalYield: (parseFloat(contract.yieldClient) + parseFloat(contract.yieldFreelancer)).toString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
