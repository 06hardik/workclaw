# 🏆 WorkClaw - The Autonomous Freelancer Escrow Engine

> **"Get paid the second your work is done. Automatically. On-chain."**

[![Mantle](https://img.shields.io/badge/Mantle-Sepolia%20Testnet-00E5CC)](https://explorer.sepolia.mantle.xyz)
[![Byreal](https://img.shields.io/badge/Powered%20by-Byreal%20Agent%20Skills-blue)](https://byreal.io)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-purple)](https://8004scan.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## The Problem
58% of freelancers globally experience non-payment or delayed payment. That's $15B/year lost because clients ghost, delay approvals, or dispute quality to avoid paying. The money that SHOULD be in the freelancer's pocket sits idle in a bank account.

## The Solution: Yield-Generating Escrow
WorkClaw solves two problems at once:
1. **For Freelancers:** You get paid automatically the second AI verifies your work is done. No invoices. No waiting 60 days.
2. **For Clients:** The escrowed payment earns DeFi yield (via Byreal CLMM) while the project is being worked on. Clients actually make money by locking up funds.

Traditional: Client pays -> money sits in bank -> freelancer delivers -> client manually approves -> freelancer paid (60 days later)

**WorkClaw**: Client deposits -> AI deploys to Byreal CLMM (earning yield) -> Freelancer delivers -> AI verifies deliverable -> INSTANT release -> Yield split between client and freelancer. All decisions are permanently logged on-chain.

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      WorkClaw Frontend (React)                      │
│  Post Job - Submit Deliverable - Agent Reasoning Panel -            │
│  Live Yield Tracker - ERC-8004 Trust Score - Dispute Interface      │
└────────┬───────────────────────────────────┬───────────────────────┘
         │                                   │
┌────────▼────────────────┐    ┌─────────────▼──────────────────────┐
│  WorkClaw Agent         │    │  ERC-8004 Registry (Mantle)        │
│                         │    │                                    │
│  Skills modules:        │    │  - Agent Identity NFT              │
│  - byreal-agent-skills  │    │  - Freelancer reputation score     │
│    (CLMM + Swap)        │    │  - Client reputation score         │
│  - deliverable-verifier │    │  - Every decision hash logged      │
│  - escrow-manager       │    │  - Dispute history on-chain        │
│  - yield-optimizer      │    └────────────────────────────────────┘
│  - dispute-arbiter      │
└────────┬────────────────┘
         │  byreal-cli calls / API wrapping
┌────────▼────────────────────────────────────────────────────────────┐
│                    Mantle L2 Smart Contracts                        │
│                                                                     │
│  ┌──────────────────────────┐   ┌───────────────────────────────┐   │
│  │  WorkEscrow.sol          │   │  AgentLedger.sol              │   │
│  │  ─────────────────────   │   │  (ERC-8004 companion)         │   │
│  │  - job creation          │   │  ─────────────────────────    │   │
│  │  - fund deposit          │   │  - logDecision()              │   │
│  │  - yield strategy config │   │  - getReputation()            │   │
│  │  - milestone tracking    │   │  - logDispute()               │   │
│  │  - agent-triggered       │   │  - getTrustScore()            │   │
│  │    release/dispute       │   └───────────────────────────────┘   │
│  └──────────┬───────────────┘                                       │
└─────────────┼───────────────────────────────────────────────────────┘
              │ funds bridged to Solana for yield
┌─────────────▼───────────────────────────────────────────────────────┐
│                    Byreal DEX / Solana                              │
│                                                                     │
│  ┌──────────────────────┐   ┌────────────────────────────────────┐  │
│  │  Byreal CLMM Pool    │   │  Byreal Swap                       │  │
│  │  - Escrow capital    │   │  - Client token -> USDC            │  │
│  │    earns LP yield    │   │  - Yield claimed -> split          │  │
│  │  - APY on USDC       │   │    client / freelancer             │  │
│  └──────────────────────┘   └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## How It Works

### Phase 1: Escrow & Yield Deployment
1. Client creates a job on the frontend and deposits USDC into `WorkEscrow.sol` (Mantle).
2. The Node.js backend listens for the `JobCreated` event.
3. The WorkClaw Agent bridges/deploys the funds via Byreal to a stablecoin CLMM pool to start earning yield immediately.
4. The action is logged to `AgentLedger.sol` on Mantle.

### Phase 2: Autonomous Delivery Verification
1. Freelancer finishes the work and submits an IPFS hash/link of the deliverable.
2. The agent fetches the work and evaluates it against the initial scope using our custom prompts via Gemini.
3. If approved, the agent closes the CLMM position, grabs the principal + yield, and triggers the `agentRelease` function on Mantle.
4. Funds and generated yield are split and distributed instantly in a single transaction.

### Phase 3: Unbiased Dispute Arbitration
If a client or freelancer hits the "Dispute" button, the agent steps in. It reviews the initial scope, the deliverable, and communication logs. It then issues a split decision (e.g., 70% refund to client, 30% partial payment to freelancer) and records the reasoning hash on-chain so everyone knows exactly why the decision was made.

## Tech Stack Deep Dive
- **Smart Contracts:** Solidity, Hardhat, deployed on Mantle Sepolia (Chain ID 5003). `WorkEscrow.sol` locks the funds, and `AgentLedger.sol` handles the strict ERC-8004 identity logging.
- **Backend / Agent Engine:** Node.js, Express, `ethers.js`. Handles real-time blockchain event listening via WebSockets and acts as the brain for the autonomous WorkClaw agent.
- **DeFi Integration:** Byreal CLI/API. Used for swapping and depositing the escrow cash into concentrated liquidity market makers (CLMM) for maximum safe APY.
- **Frontend:** React, Vite. Live yield ticked running via custom hook calculating real-time APY. Responsive, dark-mode glassmorphism design.

## Quick Start

### 1. Contracts
```bash
cd contracts
npm install
npx hardhat run scripts/deploy-local.js --network mantleTestnet
```

### 2. Backend Agent
```bash
cd backend
npm install
# Add your .env vars (RPC URL, Gemini API Key, Contract Addresses)
npm run dev
```

### 3. Frontend UI
```bash
cd frontend
npm install
npm run dev
```

## Hackathon Tracks Targeted
- **Agentic Economy**: Native integration with Byreal for yield generation through autonomous execution.
- **Grand Champion**: Solves a massive real-world problem ($15B lost wages) by utilizing a novel "Yield-Generating Escrow" concept.

---
*Built for the 2026 DoraHacks Web3/AI Turing Test Hackathon.*
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
```

### 5. Deploy Contracts
```bash
cd contracts
npx hardhat run scripts/deploy.js --network mantle-sepolia
```

### 6. Run Backend
```bash
cd backend
npm run dev
```

### 7. Run Frontend
```bash
cd frontend
npm run dev
```

## Deployed Contracts (Mantle Sepolia)

| Contract | Address |
|----------|---------|
| WorkEscrow.sol | TBD after deployment |
| AgentLedger.sol | TBD after deployment |

## Hackathon Track

**Turing Test Hackathon 2026 — Agentic Wallets & Economy (Sponsored by Byreal)**

Built for: RealClaw Real-Life Expansion — taking Byreal Agent Skills beyond DeFi into real-world freelance payment infrastructure.

## One-Line Pitch

*"WorkClaw: The AI agent that holds your payment in yield-bearing escrow and releases it automatically the second your work is done."*
