/**
 * deploy-local.js — Deploy to local hardhat network for immediate demo.
 * Run: npx hardhat run scripts/deploy-local.js --network hardhat
 * 
 * After getting Mantle Sepolia test MNT from the faucet, run:
 * npx hardhat run scripts/deploy.js --network mantle-sepolia
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, agentWallet, client, freelancer] = await ethers.getSigners();

  console.log("🦀 WorkClaw — Local Deployment");
  console.log("Deployer:  ", deployer.address);
  console.log("Agent:     ", agentWallet.address);
  console.log("");

  // Deploy AgentLedger
  const AgentLedger = await ethers.getContractFactory("AgentLedger");
  const agentLedger = await AgentLedger.deploy();
  await agentLedger.waitForDeployment();
  const agentLedgerAddress = await agentLedger.getAddress();
  console.log("✅ AgentLedger:", agentLedgerAddress);

  // Authorize agent
  await (await agentLedger.authorizeAgent(agentWallet.address)).wait();

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC:", mockUSDCAddress);

  // Mint test USDC to client & agent
  await (await mockUSDC.mint(client.address, ethers.parseUnits("10000", 6))).wait();
  await (await mockUSDC.mint(deployer.address, ethers.parseUnits("10000", 6))).wait();
  console.log("✅ Minted 10,000 USDC to client and deployer");

  // Deploy WorkEscrow
  const WorkEscrow = await ethers.getContractFactory("WorkEscrow");
  const workEscrow = await WorkEscrow.deploy(agentWallet.address, agentLedgerAddress);
  await workEscrow.waitForDeployment();
  const workEscrowAddress = await workEscrow.getAddress();
  console.log("✅ WorkEscrow:", workEscrowAddress);

  // Mint agent NFT
  await (await agentLedger.mintAgentIdentity(
    agentWallet.address,
    "ipfs://QmWorkclaw_AgentCard"
  )).wait();
  console.log("✅ Agent NFT minted (Token ID: 1)");

  // Save to deployment.json
  const deploymentInfo = {
    network: "hardhat-local",
    chainId: "31337",
    deployedAt: new Date().toISOString(),
    contracts: {
      WorkEscrow:  workEscrowAddress,
      AgentLedger: agentLedgerAddress,
      MockUSDC:    mockUSDCAddress,
    },
    wallets: {
      deployer:   deployer.address,
      agent:      agentWallet.address,
      client:     client.address,
      freelancer: freelancer.address,
    },
    agentNFTId: 1,
  };

  const outputPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ Local deployment complete!");
  console.log("═══════════════════════════════════════════");
  console.log("\nCopy to backend/.env:");
  console.log(`WORK_ESCROW_ADDRESS=${workEscrowAddress}`);
  console.log(`AGENT_LEDGER_ADDRESS=${agentLedgerAddress}`);
  console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
