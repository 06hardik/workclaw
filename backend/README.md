# WorkClaw Backend

Node.js + Express API server and autonomous agent orchestrator.

## Setup

```bash
npm install
cp .env.example .env
# edit .env (see below)
npm run dev      # nodemon, auto-restart
npm start        # production
```

The server runs migrations automatically on boot (`src/models/migrate.js`) and creates `data/workclaw.db` (SQLite).

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | API port (default `3001`) |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |
| `GEMINI_API_KEY` | Google AI Studio key for live deliverable verification. Omit for demo scoring mode. |
| `MANTLE_RPC_URL` | Mantle Sepolia RPC endpoint |
| `AGENT_PRIVATE_KEY` | Private key for the agent wallet — must be authorized as `agent` on `WorkEscrow` and hold the Agent Identity NFT on `AgentLedger` |
| `AGENT_NFT_ID` | The agent's ERC-8004 NFT ID (default `1`, matches `deploy.js`) |
| `WORK_ESCROW_ADDRESS`, `AGENT_LEDGER_ADDRESS`, `MOCK_USDC_ADDRESS` | Contract addresses — auto-populated in `config/contracts.json` by `contracts/scripts/deploy.js`, but can be overridden here |
| `BYREAL_POOL_ID` | Pool identifier shown in the UI (default `ByRealUSDC_USDT_Demo_Pool`) |
| `BYREAL_APY` | Annual percentage yield used for simulation/calculation (default `18.3`) |
| `DEMO_MODE` | `true` (default) simulates Byreal CLMM positions in-memory; `false` shells out to `byreal-cli` |
| `SESSION_SECRET` | Currently unused placeholder for future session signing |

## Architecture

### `src/agents/byrealAgent.js`
Wraps Byreal CLMM interactions.

- **Demo mode**: tracks open positions in memory (`positionId -> {amountUsdc, openedAt}`), computes yield as `amount * APY * (ageDays/365)`.
- **Live mode**: shells out to `byreal-cli positions open|list|close --pool <id> ... -o json`.

### `src/agents/geminiAgent.js`
Wraps Gemini 2.0 Flash for two tasks:

1. `verifyDeliverable(...)` — scores a submission 0–100 against the job's title/description/scope/proposal, returns `{score, approved, verdict, reasoning, strengths, concerns}`. Score ≥ 70 ⇒ `approved=true`.
2. `resolveDispute(...)` — given a disputed deliverable and optional client/freelancer statements, proposes a `clientShareBps` / `freelancerShareBps` split (basis points summing to 10000).

Without `GEMINI_API_KEY`, both fall back to deterministic demo heuristics so the full flow remains testable offline.

### `src/agents/orchestrator.js`
The core agent loop. Responsibilities:

- **Blockchain listener**: subscribes to `JobCreated` and `DeliverableSubmitted` events on `WorkEscrow` (only active if `WORK_ESCROW_ADDRESS` + `AGENT_PRIVATE_KEY` are set and the RPC is reachable).
- **`deployToByreal(contract, amountUsdc, wss)`** — opens a Byreal position for a newly-funded contract, logs `DEPLOY_YIELD`.
- **`runVerification(contract, wss)`** — calls Gemini, stores the score/reasoning, logs `VERIFY_DELIVERABLE`, and either calls `releasePayment` or marks the contract `DISPUTED`.
- **`releasePayment(contract, wss)`** — closes the Byreal position (`CLAIM_YIELD`), computes the client/freelancer yield split, updates SQLite, **transfers the claimed yield USDC into `WorkEscrow`**, calls `updateYield` then `agentRelease(..., approved=true)` on-chain, logs `RELEASE_FUNDS`.
- **`resolveDisputeSplit(contract, clientShareBps, reasoning, wss)`** — same yield-deposit pattern, then calls `agentResolveDispute`, logs `RESOLVE_DISPUTE`.
- **`startYieldPoller(wss)`** — every 5 minutes, refreshes yield for all `ACTIVE` contracts with an open Byreal position, mirrors it on-chain via `updateYield`, and broadcasts `YIELD_UPDATE` over WebSocket (drives the live yield ticker).
- All actions are recorded in the `agent_logs` SQLite table and broadcast over WebSocket as `AGENT_LOG` messages for the real-time activity feed.

### `src/config/blockchain.js`
Centralizes ethers.js setup: provider, agent signer, contract factories, USDC unit conversion helpers (6 decimals), and fallback minimal ABIs (used if `contracts/scripts/deploy.js` hasn't been run yet, so the server still boots).

## REST API

All authenticated routes expect headers `x-wallet-address` and `x-session-token` (obtained via `/api/auth/verify` after a SIWE signature).

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/nonce` | Get a SIWE nonce |
| POST | `/api/auth/verify` | Verify SIWE signature, create session, upsert user |
| POST | `/api/auth/logout` | Delete session |
| GET/PUT | `/api/users/me` | Get/update own profile |
| GET | `/api/users/:address` | Public profile |
| GET | `/api/users/stats/:address` | Earnings/job stats |
| GET | `/api/jobs` | List jobs (filters: `category`, `status`, `search`, `min_budget`, `max_budget`) |
| GET | `/api/jobs/categories` | List categories with open-job counts |
| GET | `/api/jobs/my-posted` | Client's posted jobs |
| GET/POST | `/api/jobs/:id` / `/api/jobs` | Get / create a job |
| PUT | `/api/jobs/:id/onchain` | Link a job to its on-chain job ID |
| DELETE | `/api/jobs/:id` | Cancel an `OPEN` job |
| GET | `/api/proposals/job/:jobId` | Client views proposals for their job |
| GET | `/api/proposals/my-proposals` | Freelancer's submitted proposals |
| POST | `/api/proposals` | Submit a proposal |
| POST | `/api/proposals/:id/accept` | Hire — creates a `contracts` row, optionally links `on_chain_job_id`, triggers Byreal deployment |
| POST | `/api/proposals/:id/reject` | Reject a proposal |
| GET | `/api/contracts/my-contracts` | All contracts for the current wallet |
| GET | `/api/contracts/:id` | Contract detail + agent logs |
| GET | `/api/contracts/:id/yield` | Live yield snapshot |
| POST | `/api/contracts/:id/submit-deliverable` | Freelancer submits work → triggers AI verification |
| POST | `/api/contracts/:id/force-approve` | Client overrides a `DISPUTED` contract → full release |
| POST | `/api/contracts/:id/raise-dispute` | Either party flags a dispute |
| POST | `/api/contracts/:id/resolve-dispute` | Requests AI-mediated split resolution |
| POST | `/api/contracts/:id/cancel` | Cancel a `DISPUTED` contract (refund) |
| GET | `/api/stats/platform` | Platform-wide stats + Byreal pool info + contract addresses |
| GET | `/api/stats/agent-logs` | Recent agent decisions (global feed) |

## WebSocket (`/ws`)

Broadcasts JSON messages for: `YIELD_DEPLOYED`, `VERIFICATION_STARTED`, `VERIFICATION_COMPLETE`, `DISPUTE_RAISED`, `DISPUTE_RESOLVED`, `PAYMENT_RELEASED`, `YIELD_UPDATE`, `AGENT_LOG`. The frontend's `WsContext` consumes these to drive live UI updates without polling.

## Database

SQLite via `better-sqlite3`, schema in `src/models/migrate.js`. Tables: `users`, `categories`, `job_postings`, `proposals`, `contracts`, `agent_logs`, `sessions`.
