const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "../../config", file), "utf8"));
  } catch {
    return null;
  }
}

const contractsConfig = loadJSON("contracts.json");
const WorkEscrowABI = loadJSON("WorkEscrowABI.json");
const AgentLedgerABI = loadJSON("AgentLedgerABI.json");
const MockUSDCABI = loadJSON("MockUSDCABI.json");

// ── Demo signers (Hardhat local dev accounts) ──
// Account 0: client (has USDC) | Account 1: agent | Account 2: freelancer | Account 3: spare
const HARDHAT_ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
];

let _provider = null;

function getProvider() {
  if (!_provider) {
    const rpcUrl = process.env.MANTLE_RPC_URL || "https://rpc.sepolia.mantle.xyz";
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getAgentSigner() {
  const pk = process.env.AGENT_PRIVATE_KEY || HARDHAT_ACCOUNTS[1];
  return new ethers.Wallet(pk, getProvider());
}

function getWorkEscrowAddress() {
  return process.env.WORK_ESCROW_ADDRESS || contractsConfig?.WorkEscrow;
}
function getAgentLedgerAddress() {
  return process.env.AGENT_LEDGER_ADDRESS || contractsConfig?.AgentLedger;
}
function getMockUSDCAddress() {
  return process.env.MOCK_USDC_ADDRESS || contractsConfig?.MockUSDC;
}
function getAgentNFTId() {
  return parseInt(process.env.AGENT_NFT_ID || contractsConfig?.agentNFTId || "1");
}

function isBlockchainConfigured() {
  return !!(getWorkEscrowAddress() && WorkEscrowABI && process.env.AGENT_PRIVATE_KEY);
}

function getWorkEscrowContract(signerOrProvider) {
  const sp = signerOrProvider || getAgentSigner();
  const address = getWorkEscrowAddress();
  const abi = WorkEscrowABI || MINIMAL_WORK_ESCROW_ABI;
  if (!address) throw new Error("WorkEscrow address not configured");
  return new ethers.Contract(address, abi, sp);
}

function getAgentLedgerContract(signerOrProvider) {
  const sp = signerOrProvider || getAgentSigner();
  const address = getAgentLedgerAddress();
  const abi = AgentLedgerABI || MINIMAL_AGENT_LEDGER_ABI;
  if (!address) throw new Error("AgentLedger address not configured");
  return new ethers.Contract(address, abi, sp);
}

function getMockUSDCContract(signerOrProvider) {
  const sp = signerOrProvider || getAgentSigner();
  const address = getMockUSDCAddress();
  const abi = MockUSDCABI || MINIMAL_ERC20_ABI;
  if (!address) throw new Error("MockUSDC address not configured");
  return new ethers.Contract(address, abi, sp);
}

// ── Minimal fallback ABIs (used if artifacts haven't been compiled yet) ──
const MINIMAL_WORK_ESCROW_ABI = [
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
  "function createJob(address paymentToken, uint256 amount, uint256 deadline, uint16 clientYieldBps, string title, string scope) returns (uint256)",
  "function assignFreelancer(uint256 jobId, address freelancer)",
  "function acceptJob(uint256 jobId)",
  "function submitDeliverable(uint256 jobId, bytes32 deliverableHash)",
  "function updateYield(uint256 jobId, uint256 yieldAmount)",
  "function agentRelease(uint256 jobId, bytes32 reasonHash, uint256 agentNFTId, bool approved)",
  "function raiseDispute(uint256 jobId, string reason)",
  "function agentResolveDispute(uint256 jobId, uint256 clientShareBps, bytes32 reasonHash, uint256 agentNFTId)",
  "function cancelJob(uint256 jobId)",
];

const MINIMAL_AGENT_LEDGER_ABI = [
  "event DecisionLogged(uint256 indexed nftId, uint256 indexed jobId, uint8 actionType, bytes32 reasonHash, bool outcome)",
  "event ReputationUpdated(address indexed user, uint256 newScore, uint8 rating, uint256 jobId)",
  "function logDecision(uint256 nftId, uint256 jobId, uint8 actionType, bytes32 reasonHash, bool outcome, uint256 amountUsd)",
  "function submitReputation(address user, uint256 jobId, uint8 score, string comment)",
  "function getDecisions(uint256 nftId) view returns (tuple(uint256 jobId, uint256 timestamp, uint8 actionType, bytes32 reasonHash, bool outcome, uint256 amountUsd)[])",
  "function getTrustScore(address user) view returns (uint256)",
];

const MINIMAL_ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function faucet()",
];

// ── Helpers ──
const JOB_STATUS = {
  0: "OPEN", 1: "ACTIVE", 2: "SUBMITTED", 3: "COMPLETED", 4: "DISPUTED", 5: "RESOLVED", 6: "CANCELLED",
};

const ACTION_TYPE = {
  DEPLOY_YIELD: 0, CLAIM_YIELD: 1, VERIFY_DELIVERABLE: 2, RELEASE_FUNDS: 3,
  REJECT_DELIVERABLE: 4, RESOLVE_DISPUTE: 5, WARN_USER: 6,
};

/** USDC has 6 decimals */
function toUsdc(amount) {
  return ethers.parseUnits(amount.toString(), 6);
}
function fromUsdc(amount) {
  return parseFloat(ethers.formatUnits(amount, 6));
}

module.exports = {
  getProvider,
  getAgentSigner,
  getWorkEscrowContract,
  getAgentLedgerContract,
  getMockUSDCContract,
  getWorkEscrowAddress,
  getAgentLedgerAddress,
  getMockUSDCAddress,
  getAgentNFTId,
  isBlockchainConfigured,
  HARDHAT_ACCOUNTS,
  JOB_STATUS,
  ACTION_TYPE,
  toUsdc,
  fromUsdc,
};
