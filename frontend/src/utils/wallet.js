import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { getAuthNonce, verifySignature } from "./api";
import contractsConfig from "../config/contracts.json";
import WorkEscrowABI from "../config/WorkEscrowABI.json";
import MockUSDCABI from "../config/MockUSDCABI.json";

export const CONTRACTS = contractsConfig;
export const ON_CHAIN_ENABLED = !!(contractsConfig.WorkEscrow && contractsConfig.MockUSDC);

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not found. Please install MetaMask to continue.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts.length) throw new Error("No accounts found");
  return { provider, address: ethers.getAddress(accounts[0]) };
}

export async function signIn() {
  const { provider, address } = await connectWallet();
  const signer = await provider.getSigner();
  const { nonce } = await getAuthNonce();
  const network = await provider.getNetwork();

  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Sign in to WorkClaw - Web3 Freelance Marketplace",
    uri: window.location.origin,
    version: "1",
    chainId: Number(network.chainId),
    nonce,
  });

  const messageStr = message.prepareMessage();
  const signature = await signer.signMessage(messageStr);
  const { sessionId, user } = await verifySignature(messageStr, signature);

  localStorage.setItem("wc_wallet", address);
  localStorage.setItem("wc_session", sessionId);

  return { address, user, sessionId };
}

async function getSigner() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function getWorkEscrowContract() {
  if (!ON_CHAIN_ENABLED) throw new Error("WorkEscrow contract address not configured");
  const signer = await getSigner();
  return new ethers.Contract(CONTRACTS.WorkEscrow, WorkEscrowABI, signer);
}

export async function getUSDCContract() {
  if (!ON_CHAIN_ENABLED) throw new Error("MockUSDC contract address not configured");
  const signer = await getSigner();
  return new ethers.Contract(CONTRACTS.MockUSDC, MockUSDCABI, signer);
}

/** USDC has 6 decimals */
export function toUsdcUnits(amount) {
  return ethers.parseUnits(amount.toString(), 6);
}
export function fromUsdcUnits(amount) {
  return parseFloat(ethers.formatUnits(amount, 6));
}

/**
 * Claim test USDC from the faucet (1 hour cooldown, 10,000 USDC per claim)
 */
export async function claimUsdcFaucet() {
  const usdc = await getUSDCContract();
  const tx = await usdc.faucet();
  await tx.wait();
  return tx.hash;
}

export async function getUsdcBalance(address) {
  const usdc = await getUSDCContract();
  const bal = await usdc.balanceOf(address);
  return fromUsdcUnits(bal);
}

/**
 * Approve + create an on-chain escrow job.
 * @returns {Promise<{onChainJobId: number, txHash: string}>}
 */
export async function createOnChainEscrow({ amount, deadlineDays = 30, clientYieldBps = 5000, title, scope }) {
  const usdc = await getUSDCContract();
  const escrow = await getWorkEscrowContract();
  const amountUnits = toUsdcUnits(amount);

  const signer = await getSigner();
  const owner = await signer.getAddress();

  const allowance = await usdc.allowance(owner, CONTRACTS.WorkEscrow);
  if (allowance < amountUnits) {
    const approveTx = await usdc.approve(CONTRACTS.WorkEscrow, amountUnits);
    await approveTx.wait();
  }

  const deadline = Math.floor(Date.now() / 1000) + deadlineDays * 86400;
  const tx = await escrow.createJob(CONTRACTS.MockUSDC, amountUnits, deadline, clientYieldBps, title, scope || title);
  const receipt = await tx.wait();

  // Parse JobCreated event to get the on-chain job ID
  let onChainJobId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = escrow.interface.parseLog(log);
      if (parsed?.name === "JobCreated") {
        onChainJobId = Number(parsed.args.jobId);
        break;
      }
    } catch {}
  }

  return { onChainJobId, txHash: receipt.hash };
}

/**
 * Client assigns the hired freelancer's wallet to the on-chain job.
 */
export async function assignFreelancerOnChain(onChainJobId, freelancerAddress) {
  const escrow = await getWorkEscrowContract();
  const tx = await escrow.assignFreelancer(onChainJobId, freelancerAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Freelancer submits a deliverable hash on-chain.
 */
export async function submitDeliverableOnChain(onChainJobId, deliverableText) {
  const escrow = await getWorkEscrowContract();
  const hash = ethers.keccak256(ethers.toUtf8Bytes(deliverableText || ""));
  const tx = await escrow.submitDeliverable(onChainJobId, hash);
  const receipt = await tx.wait();
  return { hash, txHash: receipt.hash };
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUsdc(val, decimals = 6) {
  if (val === null || val === undefined || isNaN(val)) return "0";
  const fixed = parseFloat(val).toFixed(decimals);
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
