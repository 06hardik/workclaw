# Ensure no .env files are tracked
git rm -r --cached .env 2>$null
git rm -r --cached backend/.env 2>$null
git rm -r --cached frontend/.env 2>$null
git rm -r --cached contracts/.env 2>$null

git add README.md
git commit -m "docs: comprehensive update to project architecture and vision for hackathon"

git add .gitignore backend/.gitignore frontend/.gitignore contracts/.gitignore
git commit -m "chore: add comprehensive gitignore configurations to protect environment variables"

git add contracts/package.json contracts/package-lock.json contracts/hardhat.config.js contracts/.env.example
git commit -m "build(contracts): initialize hardhat environment with dependencies"

git add contracts/contracts/MockUSDC.sol
git commit -m "test(contracts): add MockUSDC for local and testnet deployments"

git add contracts/contracts/WorkEscrow.sol
git commit -m "feat(contracts): implement WorkEscrow core logic for yield-bearing escrows"

git add contracts/contracts/AgentLedger.sol
git commit -m "feat(contracts): integrate ERC-8004 identity logging via AgentLedger"

git add contracts/scripts
git commit -m "chore(contracts): add deployment, demo seeding, and local testnet scripts"

git add backend/package.json backend/package-lock.json backend/.env.example backend/src/index.js
git commit -m "build(backend): bootstrap express server and node dependencies"

git add backend/src/config
git commit -m "feat(backend): configure database schema and blockchain provider connections"

git add backend/src/models
git commit -m "feat(backend): implement data models for escrow state tracking"

git add backend/src/services/ByrealService.js
git commit -m "feat(backend): implement Byreal service integration for yield generation"

git add backend/src/services/GeminiService.js
git commit -m "feat(backend): implement Gemini service for AI agent reasoning"

git add backend/src/agent
git commit -m "feat(backend): core WorkClaw Agent logic and blockchain event listeners"

git add backend/src/routes
git commit -m "feat(backend): REST API endpoints for frontend-agent communication"

git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/eslint.config.js frontend/index.html frontend/README.md
git commit -m "build(frontend): initialize Vite + React workspace with dependencies"

git add frontend/src/main.jsx frontend/src/App.jsx frontend/src/App.css frontend/src/index.css
git commit -m "style(frontend): define global CSS variables and base layout for glassmorphism UI"

git add frontend/src/contexts frontend/src/components/Navbar.jsx frontend/src/components/Toast.jsx
git commit -m "feat(frontend): implement authentication context and global navigation elements"

git add frontend/src/components
git commit -m "feat(frontend): build reusable UI components for agent feed and dashboard"

git add frontend/src/pages frontend/public frontend/src/assets
git commit -m "feat(frontend): assemble main pages and routing, add static assets"

git add .
git commit -m "chore: final polish and bugfixes for hackathon submission"
