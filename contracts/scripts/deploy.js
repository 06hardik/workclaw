const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const agentWallet = process.env.AGENT_WALLET_ADDRESS || deployer.address;

  console.log("🦀 Deploying WorkClaw contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Agent wallet:", agentWallet);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("");

  // 1. Deploy AgentLedger
  console.log("📋 Deploying AgentLedger (ERC-8004)...");
  const AgentLedger = await ethers.getContractFactory("AgentLedger");
  const agentLedger = await AgentLedger.deploy();
  await agentLedger.waitForDeployment();
  const agentLedgerAddress = await agentLedger.getAddress();
  console.log("✅ AgentLedger deployed to:", agentLedgerAddress);

  // 2. Authorize the agent wallet in AgentLedger
  console.log("🔑 Authorizing agent wallet in AgentLedger...");
  const authTx = await agentLedger.authorizeAgent(agentWallet);
  await authTx.wait();
  console.log("✅ Agent wallet authorized");

  // 3. Deploy MockUSDC (testnet only)
  let mockUSDCAddress = "";
  const network = await ethers.provider.getNetwork();
  if (network.chainId === 5003n || network.chainId === 31337n) {
    console.log("🪙 Deploying MockUSDC (testnet)...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    mockUSDCAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

    // Mint some tokens for deployer
    const mintTx = await mockUSDC.faucet();
    await mintTx.wait();
    console.log("✅ Minted 10,000 wcUSDC to deployer");
  }

  // 4. Deploy WorkEscrow
  console.log("🔒 Deploying WorkEscrow...");
  const WorkEscrow = await ethers.getContractFactory("WorkEscrow");
  const workEscrow = await WorkEscrow.deploy(agentWallet, agentLedgerAddress);
  await workEscrow.waitForDeployment();
  const workEscrowAddress = await workEscrow.getAddress();
  console.log("✅ WorkEscrow deployed to:", workEscrowAddress);

  // 5. Mint agent identity NFT for agent wallet
  console.log("🎫 Minting ERC-8004 agent identity NFT...");
  const agentCardURI = `ipfs://QmWorkclaw_AgentCard_${agentWallet.toLowerCase()}`;
  const mintNFTTx = await agentLedger.mintAgentIdentity(agentWallet, agentCardURI);
  const mintNFTReceipt = await mintNFTTx.wait();
  console.log("✅ Agent identity NFT minted (Token ID: 1)");

  // 6. Save deployment info
  const deploymentInfo = {
    network: network.chainId === 5003n ? "mantle-sepolia" : network.chainId === 5000n ? "mantle-mainnet" : "hardhat",
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    contracts: {
      WorkEscrow: workEscrowAddress,
      AgentLedger: agentLedgerAddress,
      MockUSDC: mockUSDCAddress || "N/A (mainnet — use real USDC)",
    },
    agentWallet: agentWallet,
    agentNFTId: 1,
  };

  const outputPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("");
  console.log("📄 Deployment info saved to deployment.json");
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("🦀 WorkClaw Deployment Complete!");
  console.log("═══════════════════════════════════════════");
  console.log("WorkEscrow:  ", workEscrowAddress);
  console.log("AgentLedger: ", agentLedgerAddress);
  if (mockUSDCAddress) {
    console.log("MockUSDC:    ", mockUSDCAddress);
  }
  console.log("");
  console.log("📌 Add these to your backend/.env:");
  console.log(`WORK_ESCROW_ADDRESS=${workEscrowAddress}`);
  console.log(`AGENT_LEDGER_ADDRESS=${agentLedgerAddress}`);
  if (mockUSDCAddress) {
    console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  }
  console.log("");
  console.log("🔍 Verify on Mantle Explorer:");
  console.log(`https://explorer.sepolia.mantle.xyz/address/${workEscrowAddress}`);
  console.log(`https://explorer.sepolia.mantle.xyz/address/${agentLedgerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
