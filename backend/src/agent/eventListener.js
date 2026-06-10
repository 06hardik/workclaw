import { ethers } from "ethers";
import { getProvider, getWorkEscrowContract, WORK_ESCROW_ABI } from "../config/blockchain.js";
import { workClawAgent } from "./WorkClawAgent.js";
import cron from "node-cron";

/**
 * eventListener.js — listens to WorkEscrow contract events on Mantle Sepolia
 * and triggers the appropriate agent action.
 */
export async function startEventListener(io) {
  const provider = getProvider();
  const escrow   = getWorkEscrowContract(provider);

  console.log("👂 [EventListener] Listening to WorkEscrow events...");
  console.log("   Contract:", process.env.WORK_ESCROW_ADDRESS);
  console.log("   Network:  Mantle Sepolia (Chain ID 5003)");

  // ── JobAccepted → Deploy to Byreal CLMM ────────────────────────────────────
  escrow.on("JobAccepted", async (jobId, freelancer, event) => {
    console.log(`\n📡 [Event] JobAccepted: Job #${jobId} accepted by ${freelancer}`);
    io.emit("event:JobAccepted", {
      jobId:      jobId.toString(),
      freelancer,
      txHash:     event.log.transactionHash,
      timestamp:  new Date().toISOString(),
    });

    // Trigger agent to deploy escrow to Byreal CLMM
    // Small delay to ensure Mantle state is settled
    setTimeout(() => {
      workClawAgent.onJobAccepted(jobId).catch(console.error);
    }, 3000);
  });

  // ── DeliverableSubmitted → AI Verification ─────────────────────────────────
  escrow.on("DeliverableSubmitted", async (jobId, deliverableHash, event) => {
    console.log(`\n📡 [Event] DeliverableSubmitted: Job #${jobId}`);
    io.emit("event:DeliverableSubmitted", {
      jobId:          jobId.toString(),
      deliverableHash,
      txHash:         event.log.transactionHash,
      timestamp:      new Date().toISOString(),
    });

    // Trigger AI verification (with delay for UX effect)
    setTimeout(() => {
      workClawAgent.onDeliverableSubmitted(jobId, deliverableHash).catch(console.error);
    }, 2000);
  });

  // ── FundsReleased ──────────────────────────────────────────────────────────
  escrow.on("FundsReleased", async (jobId, freelancer, principal, freelancerYield, clientYield, reasonHash, event) => {
    console.log(`\n📡 [Event] FundsReleased: Job #${jobId}. Principal: ${ethers.formatUnits(principal, 6)} USDC`);
    io.emit("event:FundsReleased", {
      jobId:         jobId.toString(),
      freelancer,
      principal:     ethers.formatUnits(principal, 6),
      freelancerYield: ethers.formatUnits(freelancerYield, 6),
      clientYield:   ethers.formatUnits(clientYield, 6),
      reasonHash,
      txHash:        event.log.transactionHash,
      timestamp:     new Date().toISOString(),
    });
  });

  // ── DisputeRaised ──────────────────────────────────────────────────────────
  escrow.on("DisputeRaised", async (jobId, raisedBy, reason, event) => {
    console.log(`\n📡 [Event] DisputeRaised: Job #${jobId} by ${raisedBy}`);
    io.emit("event:DisputeRaised", {
      jobId:    jobId.toString(),
      raisedBy,
      reason,
      txHash:   event.log.transactionHash,
      timestamp: new Date().toISOString(),
    });
  });

  // ── JobCreated ────────────────────────────────────────────────────────────
  escrow.on("JobCreated", async (jobId, client, paymentToken, amount, title, deadline, event) => {
    console.log(`\n📡 [Event] JobCreated: Job #${jobId} — "${title}"`);
    io.emit("event:JobCreated", {
      jobId:       jobId.toString(),
      client,
      paymentToken,
      amount:      ethers.formatUnits(amount, 6),
      title,
      deadline:    new Date(Number(deadline) * 1000).toISOString(),
      txHash:      event.log.transactionHash,
      timestamp:   new Date().toISOString(),
    });
  });

  // ── YieldUpdated ──────────────────────────────────────────────────────────
  escrow.on("YieldUpdated", async (jobId, yieldAmount, event) => {
    io.emit("event:YieldUpdated", {
      jobId:       jobId.toString(),
      yieldAmount: ethers.formatUnits(yieldAmount, 6),
      timestamp:   new Date().toISOString(),
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  provider.on("error", (err) => {
    if (err.message && err.message.includes("could not coalesce error")) return;
    if (err.message && err.message.includes("filter not found")) return;
    console.error("⚠️  Provider error:", err.message);
  });

  // ── Periodic yield simulation (every 30 seconds in demo) ──────────────────
  // In production: this would read actual Byreal CLMM position state
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const escrowProvider = getWorkEscrowContract(provider);
      const counter = await escrowProvider.jobCounter();
      for (let i = 1; i <= Number(counter); i++) {
        await workClawAgent.simulateYieldUpdate(i);
      }
    } catch (err) {
      // Silently fail
    }
  });

  console.log("✅ [EventListener] All event listeners registered");
  console.log("✅ [EventListener] Yield simulation cron: every 30 seconds");
}
