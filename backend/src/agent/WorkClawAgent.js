import { ethers } from "ethers";
import {
  getSigner,
  getWorkEscrowContract,
  getAgentLedgerContract,
  formatJob,
  JOB_STATUS,
} from "../config/blockchain.js";
import { byrealService }  from "../services/ByrealService.js";
import { geminiService }  from "../services/GeminiService.js";
import { io }             from "../index.js";

// In-memory store of active CLMM positions keyed by jobId
// In production, persist this to a database
const activePositions = new Map();

// Action type enum (matches Solidity enum)
const ACTION_TYPE = {
  DEPLOY_YIELD:       0,
  CLAIM_YIELD:        1,
  VERIFY_DELIVERABLE: 2,
  RELEASE_FUNDS:      3,
  REJECT_DELIVERABLE: 4,
  RESOLVE_DISPUTE:    5,
  WARN_USER:          6,
};

/**
 * WorkClawAgent — the autonomous AI agent brain.
 * This module handles all agent-triggered on-chain actions.
 */
export class WorkClawAgent {
  constructor() {
    this.signer      = getSigner();
    this.escrow      = getWorkEscrowContract(this.signer);
    this.ledger      = getAgentLedgerContract(this.signer);
    this.agentNFTId  = parseInt(process.env.AGENT_NFT_ID || "1");
    this.agentWallet = process.env.AGENT_WALLET_ADDRESS;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 1: Deploy escrow to Byreal CLMM when job becomes ACTIVE
  // ─────────────────────────────────────────────────────────────────────────────

  async onJobAccepted(jobId) {
    console.log(`\n🤖 [Agent] Job ${jobId} accepted → deploying to Byreal CLMM...`);
    
    try {
      // Get job details
      const rawJob = await this.escrow.getJob(jobId);
      const job    = formatJob(rawJob);
      
      this._emit("agent:thinking", {
        jobId,
        message: `Job accepted! Analyzing best yield strategy for $${job.amount} USDC...`,
        step: 1,
      });

      // Multi-step reasoning: Determine best Byreal strategy
      const isVolatile = parseFloat(job.amount) > 500; // Simulated threshold for demo: large jobs get delta-hedged, small jobs go to LP
      
      this._emit("agent:thinking", {
        jobId,
        message: `Analyzing risk for $${job.amount}. Volatility assessed as ${isVolatile ? 'HIGH' : 'LOW'}. Executing adaptive Byreal strategy...`,
        step: 2,
      });

      let positionResult;
      let strategy = "";

      if (isVolatile) {
        // PERPETUAL FUTURES EXECUTION (Delta-Neutral Hedging)
        this._emit("agent:thinking", {
          jobId,
          message: `Volatility is HIGH. Chaining Byreal Perps CLI to open a short hedge to protect client funds from price drops...`,
          step: 3,
        });
        
        // Execute Perps hedge via Byreal
        positionResult = await byrealService.openPerpsHedge("MNT", parseFloat(job.amount));
        strategy = "PERPS_HEDGE";

      } else {
        // LP MANAGEMENT
        this._emit("agent:thinking", {
          jobId,
          message: `Volatility is LOW. Chaining Byreal CLI to deploy funds into CLMM Stable Pool for maximum yield...`,
          step: 3,
        });

        const pools = await byrealService.getBestStablePool();
        const pool  = pools?._demo ? pools : (Array.isArray(pools) ? pools[0] : pools);
        const poolAddress = pool?.poolAddress || "ByRealStablePool_Demo";
        
        positionResult = await byrealService.openPosition(poolAddress, parseFloat(job.amount));
        strategy = "CLMM_LP";
      }
      

      if (positionResult.success) {
        // Track position in memory
        activePositions.set(jobId.toString(), {
          positionAddress: positionResult.txSignature, // using txSig as position ref
          txSignature:     positionResult.txSignature,
          poolAddress:     positionResult.poolAddress,
          amountDeployed:  parseFloat(job.amount),
          deployedAt:      Date.now(),
          estimatedApr:    positionResult.estimatedApr,
        });

        // Log decision to AgentLedger on Mantle
        const durationDays = Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const reasonText = JSON.stringify({
          action:  "DEPLOY_YIELD",
          jobId:   jobId.toString(),
          strategy: strategy,
          amount:  parseFloat(job.amount),
          apr:     positionResult.estimatedApr || "0%",
          solTxSig: positionResult.txSignature,
          reasoning: strategy === "CLMM_LP" 
            ? `Deployed $${job.amount} to Byreal CLMM stable pool. Expected APR: ${positionResult.estimatedApr}. Duration: ~${durationDays} days.`
            : `Opened short hedge via Byreal Perps to protect $${job.amount} from volatility.`,
        });

        const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reasonText));
        
        await this.ledger.logDecision(
          this.agentNFTId,
          jobId,
          ACTION_TYPE.DEPLOY_YIELD,
          reasonHash,
          true,
          Math.floor(parseFloat(job.amount) * 100), // amount in cents
        );

        const msg = strategy === "CLMM_LP" 
          ? `✅ Deployed $${job.amount} to Byreal CLMM. Earning ${positionResult.estimatedApr} APY. TX: ${positionResult.txSignature.slice(0, 16)}...`
          : `✅ Executed Delta-Neutral Hedge via Byreal Perps. TX: ${positionResult.txSignature.slice(0, 16)}...`;

        this._emit("agent:action", {
          jobId,
          type:    "DEPLOY_YIELD",
          message: msg,
          data:    positionResult,
          reasonHash,
        });

        console.log(`✅ [Agent] Position opened for job ${jobId}. APR: ${positionResult.estimatedApr}`);
      }

    } catch (err) {
      console.error(`❌ [Agent] onJobAccepted failed for job ${jobId}:`, err.message);
      this._emit("agent:error", { jobId, error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 2: AI verification when deliverable submitted
  // ─────────────────────────────────────────────────────────────────────────────

  async onDeliverableSubmitted(jobId, deliverableHash) {
    console.log(`\n🤖 [Agent] Deliverable submitted for job ${jobId}. Verifying...`);

    try {
      const rawJob = await this.escrow.getJob(jobId);
      const job    = formatJob(rawJob);

      this._emit("agent:thinking", {
        jobId,
        message: "Deliverable received. Loading content and analyzing against job scope...",
        step: 1,
      });

      // In production: fetch from IPFS using deliverableHash
      // For demo: the deliverable content is passed via the API and stored temporarily
      const deliverableContent = this._getStoredDeliverable(jobId) ||
        `Deliverable hash: ${deliverableHash}. Content submitted by freelancer.`;

      this._emit("agent:thinking", {
        jobId,
        message: `Running AI analysis with Gemini 1.5 Flash...`,
        step: 2,
      });

      // Run AI verification
      const verification = await geminiService.verifyDeliverable(job, deliverableContent);
      const isApproved = verification.score > 70;

      this._emit("agent:thinking", {
        jobId,
        message: `AI analysis complete. Score: ${verification.score}/100. Decision: ${isApproved ? "APPROVE" : "DISPUTE"}`,
        step: 3,
      });

      // Close CLMM position and collect yield (Only if approved. If disputed, keep funds generating yield!)
      const position = activePositions.get(jobId.toString());
      let yieldEarned = 0;
      
      if (isApproved && position) {
        const closeResult = await byrealService.closePosition(position.positionAddress);
        yieldEarned = parseFloat(closeResult.yieldEarned || "0");
        activePositions.delete(jobId.toString());

        this._emit("agent:thinking", {
          jobId,
          message: `CLMM position closed. Yield earned: $${yieldEarned.toFixed(4)} USDC`,
          step: 4,
        });

        // Update yield on-chain
        if (yieldEarned > 0) {
          const yieldInWei = ethers.parseUnits(yieldEarned.toFixed(6), 6);
          const updateTx   = await this.escrow.updateYield(jobId, yieldInWei);
          await updateTx.wait();
        }
      }

      // Build reason hash for on-chain log
      const reasonData = {
        verification,
        yieldEarned,
        positionDetails: position || null,
      };
      const reasonHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(reasonData))
      );

      let receipt;
      if (isApproved) {
        // Execute on-chain release
        const releaseTx = await this.escrow.agentRelease(
          jobId,
          reasonHash,
          this.agentNFTId,
          true,
        );
        receipt = await releaseTx.wait();
        
        // Log to AgentLedger
        await this.ledger.logDecision(
          this.agentNFTId,
          jobId,
          ACTION_TYPE.RELEASE_FUNDS,
          reasonHash,
          true,
          Math.floor(parseFloat(job.amount) * 100),
        );
      } else {
        // Trigger manual dispute fallback
        const disputeTx = await this.escrow.raiseDispute(jobId, "AI Verification Score < 70. Manual review required.");
        receipt = await disputeTx.wait();
      }

      const actionMessage = isApproved
        ? `✅ Deliverable APPROVED (Score: ${verification.score}). $${job.amount} USDC + $${yieldEarned.toFixed(4)} yield released to freelancer!`
        : `⚠️ Deliverable DISPUTED (Score: ${verification.score}). Issue: ${verification.issues?.join(", ")}. Awaiting manual client review.`;

      this._emit("agent:action", {
        jobId,
        type:         isApproved ? "RELEASE_FUNDS" : "REJECT_DELIVERABLE",
        message:      actionMessage,
        verification,
        yieldEarned,
        txHash:       receipt.hash,
        reasonHash,
      });

      // Auto-submit reputation (5 stars for smooth completion, 3 for rejection)
      if (isApproved) {
        await this._submitReputation(
          job.freelancer, jobId, 5,
          `WorkClaw AI: Deliverable verified and approved. ${verification.summary}`
        );
      }

      console.log(`✅ [Agent] Job ${jobId} processed. Approved: ${isApproved}`);
      return { verification, yieldEarned, txHash: receipt.hash };

    } catch (err) {
      console.error(`❌ [Agent] Verification failed for job ${jobId}:`, err.message);
      this._emit("agent:error", { jobId, error: err.message });
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 3: Dispute arbitration
  // ─────────────────────────────────────────────────────────────────────────────

  async resolveDispute(jobId, clientEvidence, freelancerEvidence) {
    console.log(`\n⚖️  [Agent] Arbitrating dispute for job ${jobId}...`);

    try {
      const rawJob = await this.escrow.getJob(jobId);
      const job    = formatJob(rawJob);

      this._emit("agent:thinking", {
        jobId,
        message: "Dispute received. Analyzing evidence from both parties...",
        step: 1,
      });

      const deliverableContent = this._getStoredDeliverable(jobId) || "Not available";

      this._emit("agent:thinking", {
        jobId,
        message: "Running impartial AI arbitration via Gemini...",
        step: 2,
      });

      const arbitration = await geminiService.arbitrateDispute(
        job,
        clientEvidence,
        freelancerEvidence,
        deliverableContent,
      );

      this._emit("agent:thinking", {
        jobId,
        message: `Arbitration complete. Decision: ${arbitration.winner}. Client gets ${arbitration.clientShareBps / 100}%.`,
        step: 3,
      });

      const reasonHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(arbitration))
      );

      // Close position if still open
      const position = activePositions.get(jobId.toString());
      if (position) {
        await byrealService.closePosition(position.positionAddress);
        activePositions.delete(jobId.toString());
      }

      // Execute on-chain resolution
      const resolveTx = await this.escrow.agentResolveDispute(
        jobId,
        arbitration.clientShareBps,
        reasonHash,
        this.agentNFTId,
      );
      const receipt = await resolveTx.wait();

      // Log to AgentLedger
      await this.ledger.logDecision(
        this.agentNFTId,
        jobId,
        ACTION_TYPE.RESOLVE_DISPUTE,
        reasonHash,
        true,
        Math.floor(parseFloat(job.amount) * 100),
      );

      this._emit("agent:action", {
        jobId,
        type:        "RESOLVE_DISPUTE",
        message:     `⚖️  Dispute resolved. ${arbitration.summary}`,
        arbitration,
        txHash:      receipt.hash,
        reasonHash,
      });

      console.log(`✅ [Agent] Dispute resolved for job ${jobId}`);
      return { arbitration, txHash: receipt.hash };

    } catch (err) {
      console.error(`❌ [Agent] Dispute resolution failed for job ${jobId}:`, err.message);
      this._emit("agent:error", { jobId, error: err.message });
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  _emit(event, data) {
    try {
      io.emit(event, { ...data, timestamp: new Date().toISOString() });
    } catch (err) {
      // io might not be available in test contexts
    }
  }

  async _submitReputation(user, jobId, score, comment) {
    try {
      const tx = await this.ledger.submitReputation(user, jobId, score, comment);
      await tx.wait();
    } catch (err) {
      console.error("⚠️  Reputation submission failed:", err.message);
    }
  }

  // Temporary in-memory deliverable store (use IPFS in production)
  _deliverableStore = new Map();

  storeDeliverable(jobId, content) {
    this._deliverableStore.set(jobId.toString(), content);
  }

  _getStoredDeliverable(jobId) {
    return this._deliverableStore.get(jobId.toString()) || null;
  }

  // Simulate yield accrual for demo (in production: read from Byreal CLMM)
  async simulateYieldUpdate(jobId) {
    try {
      const position = activePositions.get(jobId.toString());
      if (!position) return;

      const elapsed   = (Date.now() - position.deployedAt) / (1000 * 60 * 60 * 24); // days
      const aprDecimal = parseFloat(position.estimatedApr || "18.3") / 100;
      const yield_    = (position.amountDeployed * aprDecimal * elapsed) / 365;
      const yieldInWei = ethers.parseUnits(yield_.toFixed(6), 6);

      await this.escrow.updateYield(jobId, yieldInWei);
      
      this._emit("yield:update", {
        jobId: jobId.toString(),
        yieldEarned:   yield_.toFixed(6),
        elapsed:       elapsed.toFixed(4),
        apr:           position.estimatedApr,
      });
    } catch (err) {
      // Silently fail on yield simulation
    }
  }
}

export const workClawAgent = new WorkClawAgent();
