import express from "express";
import { Proposal, JobPosting, User, Contract } from "../models/index.js";
import { getClientSigner, getWorkEscrowContract, getMockUSDCContract } from "../config/blockchain.js";
import { ethers } from "ethers";

const router = express.Router();

// Get all proposals for a specific job (Client view)
router.get("/job/:jobId", async (req, res) => {
  try {
    const proposals = await Proposal.findAll({
      where: { jobId: req.params.jobId },
      include: [
        { model: User, attributes: ['walletAddress', 'name', 'headline', 'avatarUrl', 'skills'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, proposals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Freelancer submits a new proposal
router.post("/job/:jobId", async (req, res) => {
  try {
    const { freelancerAddress, coverLetter, bidAmount } = req.body;
    
    // Ensure job exists and is OPEN
    const job = await JobPosting.findByPk(req.params.jobId);
    if (!job || job.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: "Job is not open for proposals" });
    }

    const proposal = await Proposal.create({
      jobId: job.id,
      freelancerAddress,
      coverLetter,
      bidAmount,
      status: 'PENDING'
    });

    res.json({ success: true, proposal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Client Hires a Freelancer (Accepts Proposal)
router.post("/:proposalId/hire", async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { clientYieldPercent } = req.body;

    const proposal = await Proposal.findByPk(proposalId, {
      include: [JobPosting]
    });

    if (!proposal || proposal.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: "Invalid proposal or already processed" });
    }

    const job = proposal.JobPosting;
    if (job.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: "Job is no longer open" });
    }

    // ON-CHAIN EXECUTION
    const signer = getClientSigner();
    const escrow = getWorkEscrowContract(signer);
    const usdcAddress = process.env.MOCK_USDC_ADDRESS;
    const amountWei = ethers.parseUnits(String(proposal.bidAmount), 6); // USDC = 6 decimals
    const deadline = Math.floor(Date.now() / 1000) + (7 * 86400); // 7 days from now
    const clientYieldBps = Math.floor((Number(clientYieldPercent || 50)) * 100); // 50% → 5000bps

    // Approve USDC
    const usdc = getMockUSDCContract(signer);
    const approveTx = await usdc.approve(await escrow.getAddress(), amountWei);
    await approveTx.wait();

    // Create Job and Assign
    const tx = await escrow.createJobAndAssign(
      proposal.freelancerAddress,
      usdcAddress,
      amountWei,
      deadline,
      clientYieldBps,
      job.title,
      job.description
    );
    const receipt = await tx.wait();

    // Extract on-chain Job ID
    const iface = escrow.interface;
    let onChainJobId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JobCreated") {
          onChainJobId = parsed.args.jobId.toString();
          break;
        }
      } catch {}
    }

    // UPDATE DATABASE
    proposal.status = 'ACCEPTED';
    await proposal.save();

    job.status = 'IN_PROGRESS';
    await job.save();

    const contract = await Contract.create({
      jobId: job.id,
      proposalId: proposal.id,
      clientAddress: job.clientAddress,
      freelancerAddress: proposal.freelancerAddress,
      onChainJobId: onChainJobId,
      yieldSplitBps: clientYieldBps,
      status: 'ACTIVE'
    });

    res.json({
      success: true,
      contract,
      txHash: receipt.hash,
      message: "Freelancer hired successfully! Escrow funded and active."
    });

  } catch (err) {
    console.error("Hire error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
