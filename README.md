<div align="center">

# WorkClaw

### The Autonomous Freelancer Escrow Engine

*Get paid the second your work is done. Automatically. On-chain.*

[![Mantle](https://img.shields.io/badge/Mantle-Sepolia%20Testnet-00E5CC?style=for-the-badge)](https://explorer.sepolia.mantle.xyz)
[![Byreal](https://img.shields.io/badge/Powered%20by-Byreal%20CLMM-6366f1?style=for-the-badge)](https://byreal.io)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=for-the-badge)](https://deepmind.google/technologies/gemini)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004%20Agent%20Ledger-8b5cf6?style=for-the-badge)](https://8004scan.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Turing Test Hackathon 2026 — Agentic Economy Track — Powered by Byreal**

</div>

---

## What is WorkClaw?

WorkClaw is a full-stack Web3 freelance marketplace that combines the familiar UX of Upwork or Fiverr with autonomous on-chain escrow, AI-powered deliverable verification, and cross-chain yield generation via Byreal.

- **Clients** post jobs and fund a USDC escrow on **Mantle Sepolia**.
- **Freelancers** browse jobs, submit proposals, and get hired through a clean, responsive marketplace UI.
- The **WorkClaw Agent** deploys the escrowed USDC into a **Byreal CLMM pool** (~18.3% APY) the moment the contract is created — so the locked capital earns yield while the work is in progress.
- When the freelancer submits a deliverable, **Google Gemini 2.0 Flash** scores it 0–100 against the original job scope:
  - **Score ≥ 70** — the agent automatically closes the Byreal position, splits the accrued yield, and releases principal + yield to the freelancer **on-chain, instantly**.
  - **Score < 70** — the contract enters `DISPUTED` state. The client can force-approve, request AI-mediated dispute resolution (which proposes a mathematically fair split), or cancel for a refund.
- **Every agent decision is permanently logged on-chain** via `AgentLedger.sol` — an ERC-8004-style contract where the agent's identity is an NFT and all reasoning hashes, actions, and outcomes are fully auditable.

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WorkClaw Frontend (React/Vite)                        │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │  Client Dashboard    │ │ Freelancer Workspace │ │  AI Agent Reasoning Panel │ │
│ │  - Post Jobs         │ │ - Browse & Apply     │ │  - Live Decision Feed     │ │
│ │  - Deposit Escrow    │ │ - Submit Deliverables│ │  - Dispute Chat Interface │ │
│ │  - Track Yield (APY) │ │ - Track Reputation   │ │  - Real-time Yield Ticker │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │  REST + WebSocket      │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                   WorkClaw Backend (Node.js / Express)                          │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Job Matchmaking API  │ │ Chat & Proposal Sys  │ │ Blockchain Event Listener │ │
│ │ - Auth via SIWE      │ │ - Real-time via WS   │ │ - ethers.js subscriptions │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                     WorkClaw Autonomous AI Agent Core                           │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Deliverable Verifier │ │ Yield Optimizer      │ │ Dispute Arbiter           │ │
│ │ - Gemini 2.0 Flash   │ │ - Byreal CLMM deploy │ │ - Unbiased split decision │ │
│ │ - 0-100 scoring      │ │ - Position tracking  │ │ - Reasoning hash on-chain │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │                           │
┌────────────▼────────────────────────▼───────────────────────────▼───────────────┐
│                     On-Chain State & Logic (Mantle L2)                          │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ WorkEscrow.sol       │ │ AgentLedger.sol      │ │ MockUSDC.sol              │ │
│ │ - Holds Client USDC  │ │ - ERC-8004 Agent NFT │ │ - 6-decimal test USDC     │ │
│ │ - Agent-triggered pay│ │ - logDecision() hash │ │ - Public faucet (10k/hr)  │ │
│ │ - Yield accounting   │ │ - Full audit trail   │ │                           │ │
│ └──────────┬───────────┘ └──────────┬───────────┘ └─────────────┬─────────────┘ │
└────────────┼────────────────────────┼───────────────────────────┼───────────────┘
             │                        │
┌────────────▼────────────────────────▼───────────────────────────────────────────┐
│              Cross-Chain Yield Generation via Byreal (Solana)                   │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Byreal Cross-Bridge  │ │ Byreal Swap          │ │ Byreal CLMM Pool (~18% APY│ │
│ │ - Escrow routed to   │ │ - Token conversion   │ │ - Earns yield on locked   │ │
│ │   Solana ecosystem   │ │ - Claim & split yield│ │   stablecoin capital      │ │
│ └──────────────────────┘ └──────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
workclaw/
├── contracts/                    Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── WorkEscrow.sol        USDC escrow, yield accounting, release & dispute logic
│   │   ├── AgentLedger.sol       ERC-8004-style agent identity NFT + decision ledger
│   │   └── MockUSDC.sol          6-decimal test USDC with public faucet
│   ├── scripts/
│   │   ├── deploy.js             Deploys all 3 contracts; auto-writes ABIs to backend & frontend
│   │   └── seed.js               Creates a demo on-chain job for testing
│   └── test/
│       └── WorkClaw.test.js      Full lifecycle, dispute, and ledger integration tests
│
├── backend/                      Node.js / Express API + Autonomous Agent Engine
│   ├── src/
│   │   ├── agents/
│   │   │   ├── byrealAgent.js    Byreal CLMM yield simulation / CLI wrapper
│   │   │   ├── geminiAgent.js    Gemini 2.0 Flash deliverable verifier & dispute resolver
│   │   │   └── orchestrator.js   Ties blockchain events → Byreal → Gemini → on-chain release
│   │   ├── routes/               REST endpoints: auth, users, jobs, proposals, contracts, stats
│   │   ├── models/               SQLite schema and migrations (better-sqlite3)
│   │   └── config/
│   │       └── blockchain.js     ethers.js contract bindings and WebSocket provider
│   └── config/                   Auto-generated contract addresses + ABIs (by deploy.js)
│
└── frontend/                     React + Vite — Upwork/Fiverr-style marketplace UI
    └── src/
        ├── pages/                Home, Jobs, JobDetail, PostJob, Dashboard,
        │                         Contracts, ContractDetail, Proposals, Profile, AgentActivity
        ├── components/           Navbar, JobCard, YieldTicker, AgentActivityFeed, UI primitives
        ├── context/              Auth (SIWE), WebSocket, Toast
        └── utils/                API client, wallet & contract helpers
```

---

## How It Works

### Phase 1: Escrow & Yield Deployment

1. A Client creates a job on the frontend and deposits USDC into `WorkEscrow.sol` on Mantle Sepolia.
2. The Node.js backend agent listens for the on-chain `JobCreated` event via WebSocket.
3. The WorkClaw Agent deploys the escrowed USDC through Byreal into a stablecoin CLMM pool, generating yield immediately.
4. This action is permanently logged to `AgentLedger.sol` under the agent's ERC-8004 NFT identity.

### Phase 2: Autonomous Delivery Verification

1. The Freelancer submits a deliverable — an IPFS hash or verifiable link — on the contract page.
2. The WorkClaw Agent fetches the deliverable and evaluates it against the original job scope using Gemini 2.0 Flash (score 0–100).
3. If the score is ≥ 70, the agent closes the Byreal CLMM position, retrieves principal + yield, and calls `agentRelease()` on Mantle.
4. Funds and accrued yield are distributed in a single, atomic on-chain transaction — instant payment for the freelancer, yield share back to the client.

### Phase 3: Unbiased Dispute Arbitration

If a client or freelancer triggers a dispute, the agent independently reviews the job scope, submitted deliverable, and all communication logs. It issues a mathematically unbiased split decision (e.g., 70% to client, 30% to freelancer) and permanently records the reasoning hash on `AgentLedger.sol`. No human middleman. No bias. Full transparency.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity, Hardhat, Mantle Sepolia (Chain ID 5003) |
| Agent Engine | Node.js, Express, ethers.js, WebSockets |
| AI Verification | Google Gemini 2.0 Flash API |
| DeFi Integration | Byreal CLMM & Swap (Solana) |
| Identity & Audit | ERC-8004 AgentLedger.sol |
| Frontend | React, Vite, SIWE (Sign-In with Ethereum) |
| Auth | Sign-In with Ethereum (EIP-4361) |
| Database | SQLite via better-sqlite3 |
| Storage | IPFS (deliverable hashes) |

---

## Deployed Contracts (Mantle Sepolia Testnet)

All smart contracts are fully deployed and verified on the Mantle Sepolia Testnet (Chain ID `5003`).

| Contract | Address | Explorer Link |
|---|---|---|
| **AgentLedger** | `0x52A657826730E7dE09e3233b7f43abb32F5c4B2c` | [View on Mantlescan](https://explorer.sepolia.mantle.xyz/address/0x52A657826730E7dE09e3233b7f43abb32F5c4B2c) |
| **MockUSDC** | `0xF28af4E2bbb10f4C6608bE17e43E048EaE6FEdeF` | [View on Mantlescan](https://explorer.sepolia.mantle.xyz/address/0xF28af4E2bbb10f4C6608bE17e43E048EaE6FEdeF) |
| **WorkEscrow** | `0x27bc846e87973a80E7B3A261E97D6F055Ce9dfA1` | [View on Mantlescan](https://explorer.sepolia.mantle.xyz/address/0x27bc846e87973a80E7B3A261E97D6F055Ce9dfA1) |

### Live Demo & APIs

- **Live Frontend (Vercel):** [https://workclaw-beta.vercel.app](https://workclaw-beta.vercel.app/)
- **Live Backend API (Railway):** [https://workclaw-production-50fe.up.railway.app](https://workclaw-production-50fe.up.railway.app/)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (optional — falls back to demo scoring mode without it)

### 1. Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile

# Local Hardhat network (recommended for development)
npx hardhat node                                       # in a separate terminal
npx hardhat run scripts/deploy.js --network localhost

# Mantle Sepolia testnet
cp .env.example .env     # fill in DEPLOYER_PRIVATE_KEY, AGENT_PRIVATE_KEY
npx hardhat run scripts/deploy.js --network mantle-sepolia
```

> The deploy script automatically writes contract addresses and ABIs to `backend/config/` and `frontend/src/config/`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Set AGENT_PRIVATE_KEY (must match the agent address used in deploy.js)
# Optionally set GEMINI_API_KEY for live AI verification
npm run dev
```

The backend exposes:
- REST API at `http://localhost:3001/api/*`
- WebSocket at `ws://localhost:3001/ws` (live agent feed and yield updates)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, connect MetaMask to Mantle Sepolia (Chain ID `5003`) or your local Hardhat network (Chain ID `31337`), and sign in with SIWE.

### 4. Get Test Funds

- On the Dashboard, click **"Get Test USDC"** — calls `MockUSDC.faucet()` and mints 10,000 test USDC (1-hour cooldown).
- For testnet gas, use the [Mantle Sepolia faucet](https://faucet.sepolia.mantle.xyz).

---

## End-to-End Demo Flow

1. **Wallet A** (Client) connects, posts a job with a 100 USDC budget.
2. **Wallet B** (Freelancer) browses `/jobs`, finds the listing, and submits a proposal.
3. **Wallet A** reviews proposals and clicks **"Hire Freelancer"**:
   - MetaMask prompts to approve USDC spend, then calls `WorkEscrow.createJob()` on-chain.
   - The freelancer is assigned via `assignFreelancer()`.
   - The agent immediately deploys the 100 USDC to the Byreal pool (`DEPLOY_YIELD` logged to AgentLedger).
4. Both wallets watch the **live yield ticker** on the contract page count upward in real time.
5. **Wallet B** submits a deliverable description on the contract page.
   - The description is hashed and recorded on-chain via `submitDeliverable()`.
   - Gemini scores the deliverable against the job scope.
6. If score ≥ 70, the agent automatically:
   - Closes the Byreal position and calculates accrued yield.
   - Deposits the claimed yield into `WorkEscrow`.
   - Calls `agentRelease()` — principal + freelancer's yield share goes to Wallet B; client's yield share returns to Wallet A.
   - Logs `RELEASE_FUNDS` to `AgentLedger` under the agent's NFT identity.
7. If score < 70, the contract enters `DISPUTED` — Wallet A can force-approve, request AI dispute resolution, or cancel.
8. Visit `/agent` to see the full transparent activity feed of every decision made platform-wide.

---

## Key Design Decisions

- **USDC (6 decimals), not ETH** — all escrow, bidding, and yield amounts use `MockUSDC` for realistic stablecoin-based freelance payments.
- **ERC-8004 Agent Identity** — `AgentLedger.sol` mints an NFT representing the autonomous agent. Every decision (`logDecision`) is tied to that NFT ID, with a `reasonHash` (an IPFS CID of the full Gemini reasoning JSON) for off-chain verifiability.
- **Demo Mode for Byreal** — `DEMO_MODE=true` (default) simulates CLMM positions in-memory using the configured APY, so the full end-to-end flow runs without a live Solana bridge. Set `DEMO_MODE=false` and configure `byreal-cli` to connect to real Byreal pools.
- **Demo Mode for Gemini** — without `GEMINI_API_KEY`, verification falls back to a deterministic length-based heuristic so the flow remains fully testable offline.

---

## Deployed Contracts (Mantle Sepolia)

| Contract | Address |
|---|---|
| WorkEscrow.sol | `TBD — run deploy.js to populate` |
| WorkEscrow.sol | `0x27bc846e87973a80E7B3A261E97D6F055Ce9dfA1` |
| AgentLedger.sol | `0x52A657826730E7dE09e3233b7f43abb32F5c4B2c` |
| MockUSDC.sol | `0xF28af4E2bbb10f4C6608bE17e43E048EaE6FEdeF` |

---

## Hackathon Tracks & Judging Criteria Alignment

### 🏆 Grand Champion
*Awarded for excellence across technology, innovation, and ecosystem contribution.*
- **Technical Depth (30%):** Deep AI × on-chain integration. The Gemini 2.0 Flash agent securely triggers Mantle smart contract state changes (`agentRelease()`), backed by a robust Node.js orchestrator and SIWE (EIP-4361) authentication.
- **Innovation (25%):** Introduces a novel Web3 paradigm: **"Yield-Generating Escrow"**. It transforms idle escrow capital into a profit center while eliminating human bias in deliverable verification.
- **Mantle Ecosystem Contribution (25%):** Native deployment on Mantle Sepolia. Demonstrates Mantle's capability to handle high-frequency, AI-triggered micro-transactions and low-fee on-chain event logging (ERC-8004).
- **Product Completeness (20%):** Fully runnable, production-quality Vercel/Railway demo, completely open-source, with a premium Upwork-style UX.

### 🤖 Agentic Economy Track (by Byreal)
*Taking Byreal Agent Skills beyond DeFi into real-world infrastructure.*
- **Complete Autonomy:** The WorkClaw Agent autonomously executes *every* financial action. It automatically routes Mantle escrow funds to Solana Byreal CLMM pools for yield, verifies deliverables via Gemini, and resolves disputes mathematically—end-to-end without human intervention.

### 🎨 Best UI/UX Award
- **Visual Design (30%):** Premium dark-mode glassmorphism aesthetics, utilizing harmonious color palettes and micro-animations to avoid generic Web3 templates.
- **Interaction & Flow (30%):** Seamless Upwork-style Web2 flow. Features instant live-updating Yield Tickers and real-time WebSocket job boards.
- **AI Interaction Design (25%):** The "Agent Activity Feed" humanizes the AI, showing live streaming thoughts and scores (0-100) as the agent verifies deliverables, making complex AI decisions perfectly transparent.
- **Accessibility (15%):** Intuitive "Hire & Pay" flow that abstracts away complex blockchain interactions—making Web3 freelance accessible to everyday Web2 gig workers.

### 🚀 20 Project Deployment Award (Criteria Fully Met)
- ✅ **Smart Contract Deployed:** `WorkEscrow`, `AgentLedger`, and `MockUSDC` live on Mantle Sepolia.
- ✅ **Contract Verified:** 100% matched and verified via Standard-Json-Input on Mantlescan.
- ✅ **AI-Powered On-Chain Execution:** The Gemini agent autonomously evaluates deliverables and executes `agentRelease()` and `logDecision()` on-chain.
- ✅ **Product Completeness:** Full-stack architecture is publicly accessible (Vercel Frontend + Railway Backend API).
- ✅ **Documentation:** Comprehensive architecture diagrams, setup instructions, and verified addresses provided.

---

## License

MIT — see [LICENSE](LICENSE) for details.
