# WorkClaw Smart Contracts

Hardhat project containing the three contracts that power WorkClaw's on-chain escrow and agent transparency layer.

## Contracts

### `WorkEscrow.sol`
The core escrow contract.

- `createJob(paymentToken, amount, deadline, clientYieldBps, title, scope)` — client deposits USDC, creates a job in `OPEN` status.
- `assignFreelancer(jobId, freelancer)` — client assigns the hired freelancer; job moves to `ACTIVE`.
- `submitDeliverable(jobId, deliverableHash)` — freelancer submits a keccak256 hash of their deliverable; job moves to `SUBMITTED`.
- `updateYield(jobId, yieldAmount)` — **agent-only**. Records the current Byreal-accrued yield (in USDC units) for a job.
- `agentRelease(jobId, reasonHash, agentNFTId, approved)` — **agent-only**. If `approved`, pays the freelancer `principal + their yield share` and returns the client's yield share; job moves to `COMPLETED`. If not approved, job moves to `DISPUTED`. Logs the decision to `AgentLedger`.
- `agentResolveDispute(jobId, clientShareBps, reasonHash, agentNFTId)` — **agent-only**. Splits `principal + yield` between client and freelancer per `clientShareBps` (basis points); job moves to `RESOLVED`.
- `raiseDispute(jobId, reason)` — either party can flag a dispute while `ACTIVE` or `SUBMITTED`.
- `cancelJob(jobId)` — client can cancel while still `OPEN`, refunding their principal.

**Important**: yield is paid out of the contract's own USDC balance. The off-chain agent must transfer the claimed yield amount into `WorkEscrow` (simulating Byreal returning principal+yield to the agent wallet) **before** calling `agentRelease` / `agentResolveDispute`. The backend orchestrator does this automatically (see `backend/src/agents/orchestrator.js`).

### `AgentLedger.sol`
An ERC-8004-style agent identity & transparency contract.

- Each autonomous agent is represented by an ERC-721 NFT (`mintAgent`).
- `logDecision(nftId, jobId, actionType, reasonHash, outcome, amountUsd)` — append-only log of every agent action, tagged with the agent's NFT identity.
- `submitReputation(user, jobId, score, comment)` — records a 0–100 reputation score for a user after a job, maintaining a running average (`getTrustScore`).
- Action types: `0=DEPLOY_YIELD, 1=CLAIM_YIELD, 2=VERIFY_DELIVERABLE, 3=RELEASE_FUNDS, 4=REJECT_DELIVERABLE, 5=RESOLVE_DISPUTE, 6=WARN_USER`.

### `MockUSDC.sol`
A 6-decimal ERC-20 test stablecoin with a public `faucet()` (10,000 USDC per claim, 1-hour cooldown) for hackathon demo purposes.

## Commands

```bash
npm install
npx hardhat compile
npx hardhat test                 # 4 tests covering full lifecycle, disputes, and ledger logging

# Local development
npx hardhat node                 # run a local chain in one terminal
npx hardhat run scripts/deploy.js --network localhost

# In-process ephemeral network (no separate node needed)
npx hardhat run scripts/deploy.js --network hardhat

# Mantle Sepolia
cp .env.example .env             # fill in private keys
npx hardhat run scripts/deploy.js --network mantle-sepolia
```

`scripts/deploy.js` deploys `AgentLedger` → `MockUSDC` → `WorkEscrow`, wires `WorkEscrow` as an authorized caller on `AgentLedger`, mints Agent Identity NFT #1 to the agent address, and writes:

- `backend/config/contracts.json`, `WorkEscrowABI.json`, `AgentLedgerABI.json`, `MockUSDCABI.json`
- `frontend/src/config/contracts.json`, `WorkEscrowABI.json`, `MockUSDCABI.json`

## Deployer / Agent Accounts

On the `hardhat`/`localhost` networks, the deploy script uses the built-in Hardhat accounts:
- Account 0 — deployer / default client
- Account 1 — **agent** (the address authorized to call `updateYield`, `agentRelease`, `agentResolveDispute`)
- Account 2 — example freelancer
- Account 3 — spare

On `mantle-sepolia`, set `DEPLOYER_PRIVATE_KEY`, `AGENT_PRIVATE_KEY`, `CLIENT_PRIVATE_KEY`, `FREELANCER_PRIVATE_KEY` in `.env`. The **agent** key must match `AGENT_PRIVATE_KEY` in `backend/.env` so the orchestrator can sign `updateYield`/`agentRelease` transactions.

## Notes on `viaIR`

The contracts compile with `viaIR: true` enabled in `hardhat.config.js` — `WorkEscrow.sol`'s `agentRelease`/`agentResolveDispute` functions have enough local variables to trigger "stack too deep" without it.
