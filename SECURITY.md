# Security Policy

## Supported Versions

This is a hackathon submission. Only the latest version on the `main` branch is actively maintained.

## Reporting a Vulnerability

If you discover a security vulnerability in WorkClaw, please **do not** open a public GitHub issue.

Instead, contact the maintainer directly via the contact information in the project submission. We will respond within 48 hours and coordinate a fix before any public disclosure.

## Known Scope Limitations (Hackathon Build)

- **MockUSDC** is a test token with a public faucet. It has **no real monetary value**.
- The Byreal CLMM integration runs in `DEMO_MODE=true` by default, which simulates yield in-memory rather than interacting with live Solana pools.
- The `AGENT_PRIVATE_KEY` must be stored securely in a `.env` file that is **never committed to version control**.
- All `.env` files are listed in `.gitignore`. Never commit private keys or API secrets.

## Environment Variables Security Checklist

- [ ] `AGENT_PRIVATE_KEY` stored only in `.env`, never in source code
- [ ] `GEMINI_API_KEY` stored only in `.env`, never in source code
- [ ] `DEPLOYER_PRIVATE_KEY` stored only in `.env`, never in source code
- [ ] `.env` is listed in `.gitignore` at every level (root, backend, contracts, frontend)
- [ ] Only `.env.example` with placeholder values is committed
