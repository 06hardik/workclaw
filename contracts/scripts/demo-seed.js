#!/usr/bin/env node
/**
 * demo-seed.js — Seeds the demo with real on-chain jobs and runs a full lifecycle.
 * Run AFTER the Hardhat node is started fresh.
 * 
 * This script:
 * 1. Deploys contracts to a fresh Hardhat network
 * 2. Creates 2 demo jobs
 * 3. Accepts Job #1 (triggers CLMM deployment event)
 * 4. Submits a deliverable for Job #1 (triggers AI verification)
 * 5. Creates a disputed job scenario
 * 
 * Usage: node scripts/demo-seed.js
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";

// Hardhat account private keys (deterministic)
const ACCOUNTS = {
  deployer:   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  agent:      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  freelancer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
};

const provider   = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const client     = new ethers.Wallet(ACCOUNTS.deployer,   provider);
const freelancer = new ethers.Wallet(ACCOUNTS.freelancer, provider);
const agent      = new ethers.Wallet(ACCOUNTS.agent,      provider);

// Read deployment
let deployment;
try {
  deployment = JSON.parse(readFileSync("./deployment.json", "utf8"));
} catch (err) {
  console.error("❌ deployment.json not found. Run: node scripts/deploy-local.js --network localhost first");
  process.exit(1);
}

const WORK_ESCROW_ABI = [
  "function createJob(address paymentToken, uint256 amount, uint256 deadline, uint16 clientYieldBps, string title, string scope) returns (uint256)",
  "function acceptJob(uint256 jobId)",
  "function submitDeliverable(uint256 jobId, bytes32 deliverableHash)",
  "function agentRelease(uint256 jobId, bytes32 reasonHash, uint256 agentNFTId, bool approved)",
  "function jobCounter() view returns (uint256)",
  "event JobCreated(uint256 indexed jobId, address indexed client, address paymentToken, uint256 amount, string title, uint256 deadline)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
];

const escrowAsClient     = new ethers.Contract(deployment.contracts.WorkEscrow,  WORK_ESCROW_ABI, client);
const escrowAsFreelancer = new ethers.Contract(deployment.contracts.WorkEscrow,  WORK_ESCROW_ABI, freelancer);
const escrowAsAgent      = new ethers.Contract(deployment.contracts.WorkEscrow,  WORK_ESCROW_ABI, agent);
const usdcAsClient       = new ethers.Contract(deployment.contracts.MockUSDC,    ERC20_ABI,       client);

const USDC = (n) => ethers.parseUnits(String(n), 6);
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function createJob(title, scope, amount, days, yieldPct) {
  const deadline = Math.floor(Date.now() / 1000) + days * 86400;
  const bps = yieldPct * 100;
  
  // Approve
  await (await usdcAsClient.approve(deployment.contracts.WorkEscrow, USDC(amount))).wait();
  
  // Create
  const tx = await escrowAsClient.createJob(
    deployment.contracts.MockUSDC,
    USDC(amount),
    deadline,
    bps,
    title,
    scope,
  );
  const receipt = await tx.wait();
  
  // Parse jobId
  const iface = escrowAsClient.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "JobCreated") return parsed.args.jobId.toString();
    } catch {}
  }
  return null;
}

async function main() {
  console.log("🌱 WorkClaw Demo Seeder");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contracts:", deployment.contracts);
  console.log("");

  // Check USDC balance
  const bal = await usdcAsClient.balanceOf(client.address);
  console.log(`Client USDC balance: ${ethers.formatUnits(bal, 6)}`);

  // Job 1: Design work
  console.log("\n[1/4] Creating Job #1 — Design work...");
  const j1 = await createJob(
    "Design a DeFi Dashboard UI",
    "Create a Figma design for a DeFi portfolio tracker. Needs: token balances, P&L chart, transaction history, dark mode. Deliver as a Figma file with component library.",
    150,
    7,
    50
  );
  console.log(`✅ Job #1 created (ID: ${j1})`);
  await delay(500);

  // Job 2: Dev work
  console.log("\n[2/4] Creating Job #2 — Dev work...");
  const j2 = await createJob(
    "Write smart contract unit tests",
    "Write comprehensive Hardhat tests for a ERC-20 token contract. Cover: minting, burning, transfer, allowance, ownership. Achieve 100% coverage. Deliver as a GitHub repo link.",
    300,
    14,
    30
  );
  console.log(`✅ Job #2 created (ID: ${j2})`);
  await delay(500);

  // Job 3: Content work  
  console.log("\n[3/4] Creating Job #3 — Content work...");
  const j3 = await createJob(
    "Write 5 technical blog posts",
    "Write 5 technical articles (1500 words each) about: Web3 onboarding, DeFi for beginners, AI+blockchain, Layer 2 scaling, NFT use cases. Deliver as Google Docs links.",
    500,
    21,
    20
  );
  console.log(`✅ Job #3 created (ID: ${j3})`);
  await delay(500);

  // Accept Job 1 (freelancer)
  console.log("\n[4/4] Freelancer accepting Job #1...");
  await (await escrowAsFreelancer.acceptJob(j1)).wait();
  console.log(`✅ Job #1 accepted by freelancer (${freelancer.address.slice(0,8)}...)`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🦀 Demo seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Job #${j1}: ACTIVE (earning yield via Byreal CLMM)`);
  console.log(`Job #${j2}: OPEN  (waiting for freelancer)`);
  console.log(`Job #${j3}: OPEN  (waiting for freelancer)`);
  console.log("");
  console.log("Next demo steps:");
  console.log(`  1. Open the frontend: http://localhost:5173`);
  console.log(`  2. Click 'Accept Job' on Job #2 or #3`);
  console.log(`  3. Submit a deliverable on Job #1 to trigger AI verification`);
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
