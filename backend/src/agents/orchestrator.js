const { ethers } = require("ethers");
const { getDb } = require("../models/db");
const byrealAgent = require("./byrealAgent");
const geminiAgent = require("./geminiAgent");
const {
  getProvider, getAgentSigner, getWorkEscrowContract, getAgentLedgerContract, getMockUSDCContract,
  isBlockchainConfigured, getAgentNFTId, ACTION_TYPE, toUsdc, fromUsdc,
} = require("../config/blockchain");

let escrowContract = null;
let listenerActive = false;

// ─────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────

async function initBlockchainListener(wss) {
  if (!isBlockchainConfigured()) {
    console.warn("[Agent] Blockchain not configured (missing WORK_ESCROW_ADDRESS or AGENT_PRIVATE_KEY). Running in off-chain demo mode.");
    return;
  }

  try {
    const signer = getAgentSigner();
    escrowContract = getWorkEscrowContract(signer);

    escrowContract.on("JobCreated", async (jobId, client, paymentToken, amount, title, deadline) => {
      console.log(`[Agent] JobCreated event: on_chain_job_id=${jobId}`);
      await handleJobCreated(jobId.toString(), amount, wss).catch((e) => console.error("[Agent] handleJobCreated:", e.message));
    });

    escrowContract.on("DeliverableSubmitted", async (jobId, deliverableHash) => {
      console.log(`[Agent] DeliverableSubmitted event: on_chain_job_id=${jobId}`);
      await handleDeliverableSubmitted(jobId.toString(), wss).catch((e) => console.error("[Agent] handleDeliverableSubmitted:", e.message));
    });

    listenerActive = true;
    console.log("[Agent] Blockchain event listener active on WorkEscrow:", await escrowContract.getAddress());

    // Avoid unhandled promise rejections if the RPC is unreachable
    getProvider().on("error", (err) => {
      console.error("[Agent] Provider error (non-fatal):", err.shortMessage || err.message);
    });
  } catch (err) {
    console.error("[Agent] Blockchain init error:", err.shortMessage || err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Event handlers
// ─────────────────────────────────────────────────────────────────────────

async function handleJobCreated(onChainJobId, amountWei, wss) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE on_chain_job_id = ?").get(onChainJobId);
  if (!contract) return; // contract not yet linked from our DB

  const amountUsdc = fromUsdc(amountWei);
  await deployToByreal(contract, amountUsdc, wss);
}

async function handleDeliverableSubmitted(onChainJobId, wss) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE on_chain_job_id = ?").get(onChainJobId);
  if (!contract) return;

  // Only auto-run if not already submitted via API (avoid double verification)
  if (contract.status === "ACTIVE") {
    db.prepare("UPDATE contracts SET status = 'SUBMITTED' WHERE id = ?").run(contract.id);
  }
  const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract.id);
  await runVerification(updated, wss);
}

// ─────────────────────────────────────────────────────────────────────────
// Core agent flow
// ─────────────────────────────────────────────────────────────────────────

/** Step 1: Deploy escrowed funds to Byreal CLMM pool, log DEPLOY_YIELD */
async function deployToByreal(contract, amountUsdc, wss) {
  const db = getDb();
  const result = await byrealAgent.openPosition(contract.id, amountUsdc, Date.now());

  if (result.success) {
    db.prepare("UPDATE contracts SET byreal_position_id = ? WHERE id = ?").run(result.positionId, contract.id);

    await logAgentAction(contract, ACTION_TYPE.DEPLOY_YIELD,
      `Deployed ${amountUsdc} USDC to Byreal pool ${result.pool} (${byrealAgent.apy * 100}% APY)`,
      true, wss);

    broadcastToClients(wss, {
      type: "YIELD_DEPLOYED",
      contractId: contract.id,
      positionId: result.positionId,
      amountUsdc,
      pool: result.pool,
      apy: byrealAgent.apy * 100,
    });
  }
  return result;
}

/** Step 2: Run Gemini verification on a submitted deliverable */
async function runVerification(contract, wss) {
  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(contract.job_id);
  const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(contract.proposal_id);
  const deliverable = contract.deliverable_content || contract.deliverable_hash || "No content provided";

  broadcastToClients(wss, { type: "VERIFICATION_STARTED", contractId: contract.id });

  const result = await geminiAgent.verifyDeliverable(
    job.title, job.description, job.scope, proposal.cover_letter, deliverable
  );

  db.prepare("UPDATE contracts SET ai_score = ?, ai_reasoning = ? WHERE id = ?")
    .run(result.score, JSON.stringify(result), contract.id);

  await logAgentAction(contract, ACTION_TYPE.VERIFY_DELIVERABLE,
    `Score: ${result.score}/100. ${result.verdict}. ${result.reasoning}`,
    result.approved, wss);

  broadcastToClients(wss, {
    type: "VERIFICATION_COMPLETE",
    contractId: contract.id,
    score: result.score,
    approved: result.approved,
    reasoning: result.reasoning,
    strengths: result.strengths,
    concerns: result.concerns,
  });

  if (result.approved) {
    await releasePayment(contract, wss);
  } else {
    db.prepare("UPDATE contracts SET status = 'DISPUTED' WHERE id = ?").run(contract.id);
    db.prepare("UPDATE job_postings SET status = 'IN_REVIEW' WHERE id = ?").run(contract.job_id);

    broadcastToClients(wss, {
      type: "DISPUTE_RAISED",
      contractId: contract.id,
      score: result.score,
      reasoning: result.reasoning,
    });
  }

  return result;
}

/** Step 3: Close Byreal position, split yield, release on-chain funds, log RELEASE/REJECT */
async function releasePayment(contract, wss) {
  const db = getDb();

  let yieldData = { yieldUsdc: 0, ageDays: 0 };
  if (contract.byreal_position_id) {
    yieldData = await byrealAgent.closePosition(contract.byreal_position_id);
    await logAgentAction(contract, ACTION_TYPE.CLAIM_YIELD,
      `Closed Byreal position ${contract.byreal_position_id}: claimed ${yieldData.yieldUsdc.toFixed(6)} USDC yield over ${yieldData.ageDays.toFixed(4)} days`,
      true, wss);
  }

  const splitBps = contract.yield_split_bps || 5000;
  const yieldClient = yieldData.yieldUsdc * (splitBps / 10000);
  const yieldFreelancer = yieldData.yieldUsdc - yieldClient;

  db.prepare(`
    UPDATE contracts SET
      status = 'COMPLETED',
      yield_client = ?,
      yield_freelancer = ?,
      completed_at = strftime('%s','now')
    WHERE id = ?
  `).run(yieldClient, yieldFreelancer, contract.id);

  db.prepare("UPDATE job_postings SET status = 'COMPLETED' WHERE id = ?").run(contract.job_id);

  db.prepare(`
    UPDATE users SET
      total_earned = total_earned + ?,
      total_jobs_completed = total_jobs_completed + 1,
      reputation_score = MIN(5.0, reputation_score + 0.1)
    WHERE wallet_address = ?
  `).run(contract.escrow_amount + yieldFreelancer, contract.freelancer_address);

  // On-chain release
  let txHash = null;
  if (escrowContract && contract.on_chain_job_id) {
    try {
      const yieldWei = toUsdc(yieldData.yieldUsdc.toFixed(6));

      // Deposit claimed yield (USDC) into the escrow contract so agentRelease can pay it out.
      // In production this represents Byreal returning principal+yield from the CLMM pool
      // back to the agent wallet, which then forwards the yield portion to WorkEscrow.
      if (yieldData.yieldUsdc > 0) {
        const usdc = getMockUSDCContract(getAgentSigner());
        const depositTx = await usdc.transfer(await escrowContract.getAddress(), yieldWei);
        await depositTx.wait();
      }

      // Update yield on-chain first (so split is computed from correct value)
      let tx = await escrowContract.updateYield(contract.on_chain_job_id, yieldWei);
      await tx.wait();

      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(`workclaw://verification/${contract.id}/${Date.now()}`));
      tx = await escrowContract.agentRelease(contract.on_chain_job_id, reasonHash, getAgentNFTId(), true);
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch (err) {
      console.error("[Agent] On-chain release error:", err.message);
    }
  }

  await logAgentAction(contract, ACTION_TYPE.RELEASE_FUNDS,
    `Released ${contract.escrow_amount} USDC principal + ${yieldFreelancer.toFixed(6)} USDC yield to freelancer; ${yieldClient.toFixed(6)} USDC yield returned to client`,
    true, wss, txHash);

  broadcastToClients(wss, {
    type: "PAYMENT_RELEASED",
    contractId: contract.id,
    escrowAmount: contract.escrow_amount,
    yieldFreelancer,
    yieldClient,
    totalYield: yieldData.yieldUsdc,
    txHash,
  });
}

/** Reject path: client + agent decide on a dispute split */
async function resolveDisputeSplit(contract, clientShareBps, reasoning, wss) {
  const db = getDb();
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(contract.job_id);

  let yieldData = { yieldUsdc: 0, ageDays: 0 };
  if (contract.byreal_position_id) {
    yieldData = await byrealAgent.closePosition(contract.byreal_position_id);
  }

  const total = contract.escrow_amount + yieldData.yieldUsdc;
  const clientAmount = total * (clientShareBps / 10000);
  const freelancerAmount = total - clientAmount;

  db.prepare(`
    UPDATE contracts SET
      status = 'RESOLVED',
      yield_client = ?,
      yield_freelancer = ?,
      completed_at = strftime('%s','now')
    WHERE id = ?
  `).run(yieldData.yieldUsdc * (clientShareBps / 10000), yieldData.yieldUsdc * (1 - clientShareBps / 10000), contract.id);

  db.prepare("UPDATE job_postings SET status = 'COMPLETED' WHERE id = ?").run(contract.job_id);

  let txHash = null;
  if (escrowContract && contract.on_chain_job_id) {
    try {
      const yieldWei = toUsdc(yieldData.yieldUsdc.toFixed(6));

      if (yieldData.yieldUsdc > 0) {
        const usdc = getMockUSDCContract(getAgentSigner());
        const depositTx = await usdc.transfer(await escrowContract.getAddress(), yieldWei);
        await depositTx.wait();
      }

      let tx = await escrowContract.updateYield(contract.on_chain_job_id, yieldWei);
      await tx.wait();

      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(`workclaw://dispute-resolution/${contract.id}/${Date.now()}`));
      tx = await escrowContract.agentResolveDispute(contract.on_chain_job_id, clientShareBps, reasonHash, getAgentNFTId());
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch (err) {
      console.error("[Agent] On-chain dispute resolution error:", err.message);
    }
  }

  await logAgentAction(contract, ACTION_TYPE.RESOLVE_DISPUTE,
    `Dispute resolved: ${(clientShareBps / 100).toFixed(1)}% to client (${clientAmount.toFixed(6)} USDC), ${((10000 - clientShareBps) / 100).toFixed(1)}% to freelancer (${freelancerAmount.toFixed(6)} USDC). ${reasoning || ""}`,
    true, wss, txHash);

  broadcastToClients(wss, {
    type: "DISPUTE_RESOLVED",
    contractId: contract.id,
    clientAmount, freelancerAmount, clientShareBps, txHash,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Manual triggers (called from API routes)
// ─────────────────────────────────────────────────────────────────────────

async function triggerVerification(contractId, wss) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
  if (!contract) throw new Error("Contract not found");
  return runVerification(contract, wss);
}

async function triggerRelease(contractId, wss) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
  if (!contract) throw new Error("Contract not found");
  return releasePayment(contract, wss);
}

async function triggerDisputeResolution(contractId, clientShareBps, reasoning, wss) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
  if (!contract) throw new Error("Contract not found");
  return resolveDisputeSplit(contract, clientShareBps, reasoning, wss);
}

// ─────────────────────────────────────────────────────────────────────────
// Yield polling (every 5 minutes, drives the live yield ticker)
// ─────────────────────────────────────────────────────────────────────────

let pollerStarted = false;
function startYieldPoller(wss) {
  if (pollerStarted) return;
  pollerStarted = true;

  const poll = async () => {
    const db = getDb();
    const active = db.prepare(
      "SELECT * FROM contracts WHERE status = 'ACTIVE' AND byreal_position_id IS NOT NULL"
    ).all();

    for (const contract of active) {
      const yieldData = await byrealAgent.getYield(contract.byreal_position_id, contract.id, contract.created_at * 1000);
      const splitBps = contract.yield_split_bps || 5000;
      const yieldClient = yieldData.yieldUsdc * (splitBps / 10000);
      const yieldFreelancer = yieldData.yieldUsdc - yieldClient;

      db.prepare("UPDATE contracts SET yield_client = ?, yield_freelancer = ? WHERE id = ?")
        .run(yieldClient, yieldFreelancer, contract.id);

      // Mirror to chain if configured
      if (escrowContract && contract.on_chain_job_id) {
        try {
          const yieldWei = toUsdc(yieldData.yieldUsdc.toFixed(6));
          const tx = await escrowContract.updateYield(contract.on_chain_job_id, yieldWei);
          await tx.wait();
        } catch (err) {
          // Non-fatal; on-chain mirroring is best-effort
        }
      }

      broadcastToClients(wss, {
        type: "YIELD_UPDATE",
        contractId: contract.id,
        yieldClient,
        yieldFreelancer,
        totalYield: yieldData.yieldUsdc,
        ageDays: yieldData.ageDays,
      });
    }
  };

  poll().catch(console.error);
  setInterval(() => poll().catch(console.error), 5 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────
// Logging + broadcast helpers
// ─────────────────────────────────────────────────────────────────────────

async function logAgentAction(contract, actionType, reason, outcome, wss, txHash = null) {
  const db = getDb();
  const actionName = Object.keys(ACTION_TYPE).find((k) => ACTION_TYPE[k] === actionType) || `ACTION_${actionType}`;

  db.prepare(`
    INSERT INTO agent_logs (contract_id, job_id, action_type, reason, on_chain_tx_hash, agent_nft_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(contract.id, contract.on_chain_job_id?.toString() || null, actionName, reason, txHash, getAgentNFTId());

  console.log(`[Agent][${actionName}] ${reason}`);

  broadcastToClients(wss, {
    type: "AGENT_LOG",
    contractId: contract.id,
    actionType: actionName,
    reason,
    outcome,
    txHash,
    timestamp: Date.now(),
  });
}

function broadcastToClients(wss, data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

module.exports = {
  initBlockchainListener,
  startYieldPoller,
  deployToByreal,
  runVerification,
  releasePayment,
  resolveDisputeSplit,
  triggerVerification,
  triggerRelease,
  triggerDisputeResolution,
  logAgentAction,
  broadcastToClients,
  isListenerActive: () => listenerActive,
};
