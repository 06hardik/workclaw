import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Load ABIs ─────────────────────────────────────────────────────────────────
const loadABI = (name) => {
  try {
    const artifactPath = join(
      __dirname,
      "../../contracts/artifacts/contracts",
      `${name}.sol/${name}.json`
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    return artifact.abi;
  } catch (err) {
    // Fallback: return minimal ABI if artifacts not compiled yet
    console.warn(`⚠️  Could not load ${name} ABI from artifacts. Using minimal ABI.`);
    return [];
  }
};

// ── Provider + Signer ─────────────────────────────────────────────────────────
let _provider = null;

export function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(
      process.env.MANTLE_RPC_URL || "https://rpc.sepolia.mantle.xyz"
    );
  }
  return _provider;
}

// Always create fresh signer to avoid stale nonce cache
export function getSigner() {
  const pk = process.env.AGENT_PRIVATE_KEY || HARDHAT_ACCOUNTS[1];
  return new ethers.Wallet(pk, getProvider());
}

// ── Demo signers (Hardhat local dev accounts) ─────────────────────────────────
const HARDHAT_ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // account 0 — client (has USDC)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // account 1 — agent
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // account 2 — freelancer
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // account 3
];

export function getClientSigner() {
  const key = process.env.CLIENT_PRIVATE_KEY || HARDHAT_ACCOUNTS[0];
  return new ethers.Wallet(key, getProvider());
}

export function getFreelancerSigner() {
  const key = process.env.FREELANCER_PRIVATE_KEY || HARDHAT_ACCOUNTS[2];
  return new ethers.Wallet(key, getProvider());
}

// ── Minimal ABIs (for runtime without compiled artifacts) ─────────────────────
export const WORK_ESCROW_ABI = [
  "event JobCreated(uint256 indexed jobId, address indexed client, address paymentToken, uint256 amount, string title, uint256 deadline)",
  "event JobAccepted(uint256 indexed jobId, address indexed freelancer)",
  "event DeliverableSubmitted(uint256 indexed jobId, bytes32 deliverableHash)",
  "event YieldUpdated(uint256 indexed jobId, uint256 newYieldEarned)",
  "event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 principalAmount, uint256 freelancerYield, uint256 clientYield, bytes32 reasonHash)",
  "event DisputeRaised(uint256 indexed jobId, address indexed raisedBy, string reason)",
  "event DisputeResolved(uint256 indexed jobId, address winner, uint256 clientShare, uint256 freelancerShare, bytes32 reasonHash)",
  "event JobCancelled(uint256 indexed jobId)",

  "function jobCounter() view returns (uint256)",
  "function getJob(uint256 jobId) view returns (tuple(uint256 id, address client, address freelancer, address paymentToken, uint256 amount, uint256 yieldEarned, uint256 clientYieldBps, uint256 deadline, uint256 agentNFTId, uint8 status, string title, string scope, bytes32 deliverableHash, bytes32 reasonHash, uint256 createdAt, uint256 completedAt))",
  "function getJobsByStatus(uint8 status) view returns (uint256[])",
  "function createJob(address paymentToken, uint256 amount, uint256 deadline, uint16 clientYieldBps, string title, string scope) returns (uint256)",
  "function acceptJob(uint256 jobId)",
  "function submitDeliverable(uint256 jobId, bytes32 deliverableHash)",
  "function updateYield(uint256 jobId, uint256 yieldAmount)",
  "function agentRelease(uint256 jobId, bytes32 reasonHash, uint256 agentNFTId, bool approved)",
  "function raiseDispute(uint256 jobId, string reason)",
  "function agentResolveDispute(uint256 jobId, uint256 clientShareBps, bytes32 reasonHash, uint256 agentNFTId)",
];

export const AGENT_LEDGER_ABI = [
  "event DecisionLogged(uint256 indexed nftId, uint256 indexed jobId, uint8 actionType, bytes32 reasonHash, bool outcome)",
  "event ReputationUpdated(address indexed user, uint256 newScore, uint8 rating, uint256 jobId)",
  "function logDecision(uint256 nftId, uint256 jobId, uint8 actionType, bytes32 reasonHash, bool outcome, uint256 amountUsd)",
  "function submitReputation(address user, uint256 jobId, uint8 score, string comment)",
  "function getDecisions(uint256 nftId) view returns (tuple(uint256 jobId, uint256 timestamp, uint8 actionType, bytes32 reasonHash, bool outcome, uint256 amountUsd)[])",
  "function getTrustScore(address user) view returns (uint256)",
  "function getReputationEntries(address user) view returns (tuple(address user, uint256 jobId, uint8 score, string comment, uint256 timestamp)[])",
  "function reputationScore(address) view returns (uint256)",
  "function jobsCompleted(address) view returns (uint256)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function faucet()",
];

// ── Contract instances ────────────────────────────────────────────────────────
export function getWorkEscrowContract(signerOrProvider) {
  const sp = signerOrProvider || getProvider();
  return new ethers.Contract(
    process.env.WORK_ESCROW_ADDRESS,
    WORK_ESCROW_ABI,
    sp
  );
}

export function getAgentLedgerContract(signerOrProvider) {
  const sp = signerOrProvider || getProvider();
  return new ethers.Contract(
    process.env.AGENT_LEDGER_ADDRESS,
    AGENT_LEDGER_ABI,
    sp
  );
}

export function getMockUSDCContract(signerOrProvider) {
  const sp = signerOrProvider || getProvider();
  return new ethers.Contract(
    process.env.MOCK_USDC_ADDRESS,
    ERC20_ABI,
    sp
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const JOB_STATUS = {
  0: "OPEN",
  1: "ACTIVE",
  2: "SUBMITTED",
  3: "COMPLETED",
  4: "DISPUTED",
  5: "RESOLVED",
  6: "CANCELLED",
};

export const ACTION_TYPE = {
  0: "DEPLOY_YIELD",
  1: "CLAIM_YIELD",
  2: "VERIFY_DELIVERABLE",
  3: "RELEASE_FUNDS",
  4: "REJECT_DELIVERABLE",
  5: "RESOLVE_DISPUTE",
  6: "WARN_USER",
};

export function formatJob(rawJob) {
  return {
    id:              rawJob.id.toString(),
    client:          rawJob.client,
    freelancer:      rawJob.freelancer,
    paymentToken:    rawJob.paymentToken,
    amount:          ethers.formatUnits(rawJob.amount, 6), // USDC has 6 decimals
    yieldEarned:     ethers.formatUnits(rawJob.yieldEarned, 6),
    clientYieldBps:  rawJob.clientYieldBps.toString(),
    deadline:        new Date(Number(rawJob.deadline) * 1000).toISOString(),
    agentNFTId:      rawJob.agentNFTId.toString(),
    status:          JOB_STATUS[rawJob.status] || rawJob.status.toString(),
    title:           rawJob.title,
    scope:           rawJob.scope,
    deliverableHash: rawJob.deliverableHash !== ethers.ZeroHash ? rawJob.deliverableHash : null,
    reasonHash:      rawJob.reasonHash !== ethers.ZeroHash ? rawJob.reasonHash : null,
    createdAt:       new Date(Number(rawJob.createdAt) * 1000).toISOString(),
    completedAt:     rawJob.completedAt > 0n
                       ? new Date(Number(rawJob.completedAt) * 1000).toISOString()
                       : null,
  };
}
