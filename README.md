<div align="center">
  <img src="https://raw.githubusercontent.com/workclaw/workclaw/main/frontend/public/favicon.svg" alt="WorkClaw Logo" width="120" />
  <h1>🦀 WorkClaw</h1>
  <h3>The Autonomous Freelancer Escrow Engine</h3>
  <p><em>Get paid the second your work is done. Automatically. On-chain.</em></p>
  
  [![Mantle](https://img.shields.io/badge/Mantle-Sepolia%20Testnet-00E5CC?style=for-the-badge)](https://explorer.sepolia.mantle.xyz)
  [![Byreal](https://img.shields.io/badge/Powered%20by-Byreal%20Agent%20Skills-blue?style=for-the-badge)](https://byreal.io)
  [![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-purple?style=for-the-badge)](https://8004scan.io)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
</div>

<br/>

## 🚨 The Problem

Over **58% of freelancers globally** experience non-payment, severely delayed payments, or arbitrary disputes. That represents roughly **$15 Billion annually** in lost wages because clients ghost, drag out approvals, or dispute quality simply to avoid paying. Meanwhile, capital meant for freelancers sits idle in traditional bank accounts.

## 💡 The WorkClaw Solution: Yield-Generating Escrow

WorkClaw fundamentally redesigns the freelance economy by solving two problems simultaneously:

1. **For Freelancers (Guaranteed, Instant Pay):** You get paid automatically the second our AI Agent verifies your work meets the agreed-upon criteria. No invoices. No waiting 60 days.
2. **For Clients (Capital Efficiency):** The escrowed payment generates DeFi yield (via Byreal CLMM integration) while the freelancer completes the project. Clients actually earn money by locking up funds securely.

### The Paradigm Shift
* **Traditional Model:** Client pays -> money sits in bank -> freelancer delivers -> client manually approves -> freelancer is paid (60 days later).
* **WorkClaw Model:** Client deposits -> AI deploys to Byreal CLMM (earning yield) -> Freelancer delivers -> AI Agent verifies deliverable -> INSTANT release -> Yield is split between client and freelancer. **All decisions are permanently logged on-chain via ERC-8004.**

---

## 🏗️ System Architecture

WorkClaw operates across an advanced tech stack, utilizing AI agents to bridge DeFi yield generation and real-world gig economy transactions.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WorkClaw Frontend (React/Vite)                        │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │  Client Dashboard    │ │ Freelancer Workspace │ │  AI Agent Reasoning Panel │ │
│ │  - Post Jobs         │ │ - Find Gigs          │ │  - Live Verification Logs │ │
│ │  - Deposit Escrow    │ │ - Submit Deliverables│ │  - Dispute Chat Interface │ │
│ │  - Track Yield (APY) │ │ - Track Reputation   │ │  - Real-time Yield Ticker │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                           WorkClaw Backend (Node.js/Express)                    │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Web2 Job Matchmaking │ │ Chat & Proposal Sys  │ │ Event Listeners / WebSockets│ │
│ │ - Upwork-style algos │ │ - Real-time messaging│ │ - Monitors Blockchain events│ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                     WorkClaw Autonomous AI Agent Core                           │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Deliverable Verifier │ │ Yield Optimizer      │ │ Dispute Arbiter           │ │
│ │ - Gemini-powered     │ │ - Byreal Integration │ │ - Unbiased resolution     │ │
│ │ - Auto-approvals     │ │ - CLMM deployment    │ │ - Transparent reasoning   │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                    On-Chain State & Logic (Mantle L2)                           │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ WorkEscrow.sol       │ │ AgentLedger.sol      │ │ ERC-8004 Registry         │ │
│ │ - Holds Client USDC  │ │ - Logs AI decisions  │ │ - Agent Identity NFT      │ │
│ │ - Agent-triggered pay│ │ - Hashes deliverables│ │ - User Reputation Scores  │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                 Cross-Chain Yield Generation via Byreal (Solana)                │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Byreal Cross-Bridge  │ │ Byreal Swap          │ │ Byreal CLMM Pool          │ │
│ │ - Escrow routed to   │ │ - Token conversion   │ │ - Generates APY on Escrow │ │
│ │   Solana ecosystem   │ │ - Claim & split yield│ │ - Zero-risk stablecoins   │ │
│ └──────────────────────┘ └──────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ How It Works

### Phase 1: Escrow & Yield Deployment
1. A Client creates a job on the frontend and deposits USDC into the `WorkEscrow.sol` smart contract deployed on the Mantle Network.
2. The Node.js backend Agent listens for the on-chain `JobCreated` event.
3. The WorkClaw Agent bridges and deploys the funds via **Byreal** to a stablecoin CLMM pool to begin generating yield immediately.
4. This action is permanently logged to `AgentLedger.sol` via ERC-8004.

### Phase 2: Autonomous Delivery Verification
1. The Freelancer finishes the work and submits an IPFS hash or verifiable link of the deliverable.
2. The WorkClaw Agent evaluates the deliverable against the initial scope using fine-tuned Gemini prompts.
3. Upon approval, the agent automatically closes the CLMM position, retrieves the principal + yield, and executes the `agentRelease` function on Mantle.
4. Funds and generated yield are split and distributed instantly in a single, atomic transaction.

### Phase 3: Unbiased Dispute Arbitration
If a client or freelancer initiates a dispute, the agent reviews the initial scope, the submitted deliverable, and communication logs. It then issues a mathematically unbiased split decision (e.g., 70% refund to client, 30% partial payment to freelancer). The reasoning hash is recorded on-chain, ensuring absolute transparency.

---

## 💻 Tech Stack Deep Dive

* **Smart Contracts:** Solidity, Hardhat, deployed on **Mantle Sepolia** (Chain ID 5003). `WorkEscrow.sol` securely locks funds, while `AgentLedger.sol` handles strict ERC-8004 identity logging.
* **Backend / Agent Engine:** Node.js, Express, `ethers.js`. Handles real-time blockchain event listening via WebSockets and acts as the brain for the autonomous WorkClaw agent.
* **DeFi Integration:** **Byreal CLI/API**. Used for swapping and deploying escrow capital into Concentrated Liquidity Market Makers (CLMM) for optimized, safe APY.
* **Frontend:** React, Vite, Tailwind CSS. Features live yield tracking running via custom hooks calculating real-time APY. Fully responsive, premium dark-mode glassmorphism design.

---

## 🚀 Quick Start Guide

### 1. Smart Contracts
```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network mantle-sepolia
```

### 2. Backend Agent Engine
```bash
cd backend
npm install
# Configure your .env variables (RPC URL, Gemini API Key, Contract Addresses)
npm run dev
```

### 3. Frontend UI
```bash
cd frontend
npm install
npm run dev
```

---

## 🏆 Hackathon Tracks Targeted

* **Agentic Economy:** Native integration with Byreal for yield generation through completely autonomous agent execution.
* **Grand Champion:** Solves a massive, quantifiable real-world problem ($15B lost wages) by pioneering the novel concept of "Yield-Generating Escrow".

**Turing Test Hackathon 2026 — Agentic Wallets & Economy (Sponsored by Byreal)**

*Built for: RealClaw Real-Life Expansion — taking Byreal Agent Skills beyond DeFi into real-world freelance payment infrastructure.*
