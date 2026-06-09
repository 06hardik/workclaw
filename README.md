# 🦀 WorkClaw — The Autonomous Freelancer Escrow Engine

> **"Get paid the second your work is done. Automatically. On-chain."**

[![Mantle](https://img.shields.io/badge/Mantle-Sepolia%20Testnet-00E5CC)](https://explorer.sepolia.mantle.xyz)
[![Byreal](https://img.shields.io/badge/Powered%20by-Byreal%20Agent%20Skills-blue)](https://byreal.io)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-purple)](https://8004scan.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is WorkClaw?

WorkClaw is an AI-powered freelancer escrow platform where:
1. **Client** deposits payment into a smart contract escrow on Mantle
2. **WorkClaw Agent** (RealClaw/OpenClaw + Byreal Agent Skills) deploys those funds into a Byreal CLMM LP position — earning yield while the project runs
3. **Freelancer** submits deliverables (IPFS hash)
4. **AI Agent** (Gemini 2.5 Flash) verifies the deliverable matches the job scope
5. **Payment + yield** releases **instantly and automatically** on approval
6. Every AI decision is logged permanently to **ERC-8004** on Mantle (auditable, on-chain)

## The Problem We Solve

- **58% of freelancers** experience non-payment or delayed payment
- **$15B/year** lost globally to late payments
- **40%** wait more than 30 days after delivery

WorkClaw makes "chasing payment" impossible. The AI doesn't sleep, can't be pressured, and executes in seconds.

## Architecture

```
Frontend (React/Vite)
    ↓
Backend API (Node.js / Express)
    ↓
WorkClaw Agent (Byreal CLI + Gemini AI)
    ├── byreal-cli pools/swap/positions (CLMM yield)
    └── Gemini 2.5 Flash (deliverable verification)
    ↓
Mantle Sepolia Testnet
    ├── WorkEscrow.sol (escrow + yield tracking)
    └── AgentLedger.sol (ERC-8004 decision log)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24 + Hardhat |
| Blockchain | Mantle Sepolia (Chain ID: 5003) |
| AI Agent Framework | Byreal Agent Skills CLI |
| DeFi Yield | Byreal CLMM (Solana) |
| AI Verifier | Google Gemini 2.5 Flash (free tier) |
| Backend | Node.js + Express + ethers.js |
| Frontend | React + Vite |
| File Storage | IPFS (via web3.storage / nft.storage) |
| Identity | ERC-8004 Agent NFT |

## Setup Instructions

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Install Byreal CLIs
```bash
npm install -g @byreal-io/byreal-cli
npm install -g @byreal-io/byreal-perps-cli
```

### 2. Setup Byreal Wallet
```bash
byreal-cli setup
```

### 3. Clone & Install Dependencies
```bash
git clone <repo-url>
cd workclaw

# Smart contracts
cd contracts && npm install

# Backend
cd ../backend && npm install

# Frontend  
cd ../frontend && npm install
```

### 4. Configure Environment Variables
```bash
# backend/.env
GEMINI_API_KEY=your_google_ai_studio_key
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
AGENT_PRIVATE_KEY=your_agent_wallet_private_key
WORK_ESCROW_ADDRESS=deployed_contract_address
AGENT_LEDGER_ADDRESS=deployed_contract_address

# contracts/.env
PRIVATE_KEY=your_deployer_private_key
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
