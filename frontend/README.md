# WorkClaw Frontend

React + Vite single-page app, styled as an Upwork/Fiverr-style marketplace with a dark "agentic" accent theme for the Byreal/agent transparency surfaces.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api and /ws to localhost:3001
npm run build    # production build
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, platform stats, categories, latest jobs, "how it works" |
| `/jobs` | Job listings with category/budget filters (Upwork-style sidebar) |
| `/jobs/:id` | Job detail — description, scope, skills, client info; proposal form for freelancers, proposal review + "Hire" for clients |
| `/post-job` | Create a new job posting |
| `/dashboard` | Overview: stats, USDC balance + faucet, active contracts with live yield, posted jobs, proposals |
| `/contracts` | All contracts (client or freelancer side), filterable by status |
| `/contracts/:id` | The core agentic workflow UI — yield ticker, AI verification result, deliverable submission, dispute resolution actions, live agent activity feed |
| `/proposals` | Freelancer's submitted proposals and their status |
| `/profile` | Edit display name, role, headline, bio, skills, hourly rate |
| `/agent` | Global, public agent transparency feed — every decision made platform-wide, plus Byreal pool stats |

## Key Components

- **`Navbar`** — wallet connect/SIWE sign-in, role-aware nav links, "Byreal Yield Active" badge.
- **`JobCard`** — Upwork-style job summary card used in listings.
- **`YieldTicker`** — fetches real yield from `/api/contracts/:id/yield` every 30s and animates a per-second micro-increment locally for a "live" feel; shows pool, APY, age, and a "Simulated Bridge · Demo Mode" disclosure.
- **`AgentActivityFeed`** — renders `agent_logs` entries with icons/colors per action type, agent NFT badge, and on-chain tx hash links.
- **`ScoreRing`** — color-coded 0–100 AI score display (green ≥70, yellow 50–69, red <50).

## Wallet & Contract Integration (`src/utils/wallet.js`)

- `signIn()` — SIWE flow: connects MetaMask, fetches a nonce, signs a SIWE message, posts to `/api/auth/verify`, stores `wc_wallet`/`wc_session` in `localStorage`.
- `ON_CHAIN_ENABLED` — `true` only if `frontend/src/config/contracts.json` has been populated by `contracts/scripts/deploy.js`. When `false`, the app runs in **off-chain demo mode**: hiring/escrow happens entirely in the backend database without any MetaMask transactions, which is useful for UI development without a deployed chain.
- `claimUsdcFaucet()` / `getUsdcBalance()` — `MockUSDC.faucet()` / `balanceOf()`.
- `createOnChainEscrow({amount, title, scope, deadlineDays, clientYieldBps})` — approves USDC then calls `WorkEscrow.createJob`, parses the `JobCreated` event to extract the new `onChainJobId`.
- `assignFreelancerOnChain(onChainJobId, freelancerAddress)` — called right after escrow creation during the "Hire" flow.
- `submitDeliverableOnChain(onChainJobId, deliverableText)` — hashes the deliverable text with keccak256 and calls `submitDeliverable`.

## Real-time Updates (`src/context/WsContext.jsx`)

Connects to `/ws` once at app root. `ContractDetail` and `AgentActivity` subscribe to messages and refetch / toast on: `VERIFICATION_STARTED`, `VERIFICATION_COMPLETE`, `PAYMENT_RELEASED`, `DISPUTE_RAISED`, `DISPUTE_RESOLVED`, `YIELD_DEPLOYED`, `AGENT_LOG`.

## Styling

Plain CSS (`src/index.css`) — no Tailwind/component library, intentionally Upwork/Fiverr-inspired: green primary (`--green: #1dbf73`), light neutral backgrounds, pill-shaped buttons and badges, card-based layouts. The "agentic" surfaces (yield ticker, Byreal callouts, agent activity) use a dark navy gradient with cyan/green accents to visually distinguish the AI/DeFi layer from the marketplace layer.
