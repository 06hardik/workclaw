const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, agentSigner] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  const agentAddress = agentSigner ? agentSigner.address : deployer.address;
  console.log("Agent address:", agentAddress);

  // 1. AgentLedger (ERC-8004 style)
  console.log("\n[1/4] Deploying AgentLedger...");
  const AgentLedger = await hre.ethers.getContractFactory("AgentLedger");
  const agentLedger = await AgentLedger.deploy();
  await agentLedger.waitForDeployment();
  const agentLedgerAddress = await agentLedger.getAddress();
  console.log("AgentLedger:", agentLedgerAddress);

  // 2. MockUSDC
  console.log("\n[2/4] Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC:", mockUSDCAddress);

  // 3. WorkEscrow
  console.log("\n[3/4] Deploying WorkEscrow...");
  const WorkEscrow = await hre.ethers.getContractFactory("WorkEscrow");
  const workEscrow = await WorkEscrow.deploy(agentAddress, agentLedgerAddress);
  await workEscrow.waitForDeployment();
  const workEscrowAddress = await workEscrow.getAddress();
  console.log("WorkEscrow:", workEscrowAddress);

  // 4. Authorize WorkEscrow on AgentLedger + mint agent NFT
  console.log("\n[4/4] Wiring contracts...");
  await agentLedger.authorizeCaller(workEscrowAddress);
  console.log(" - WorkEscrow authorized on AgentLedger");

  const mintTx = await agentLedger.mintAgent(agentAddress);
  const mintReceipt = await mintTx.wait();
  console.log(" - Agent Identity NFT minted (#1) to", agentAddress);

  // Fund agent wallet with some USDC for gas-free demo operations isn't needed (USDC isn't gas)
  // but fund deployer/client demo accounts with mock USDC
  if (deployer.address !== agentAddress) {
    await mockUSDC.transfer(agentAddress, hre.ethers.parseUnits("1000", 6));
  }

  // Save addresses + ABIs
  const artifacts = {
    AgentLedger: await hre.artifacts.readArtifact("AgentLedger"),
    WorkEscrow: await hre.artifacts.readArtifact("WorkEscrow"),
    MockUSDC: await hre.artifacts.readArtifact("MockUSDC"),
  };

  const network = await hre.ethers.provider.getNetwork();
  const config = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    AgentLedger: agentLedgerAddress,
    WorkEscrow: workEscrowAddress,
    MockUSDC: mockUSDCAddress,
    agentAddress,
    agentNFTId: 1,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  // Backend config
  const backendConfigDir = path.join(__dirname, "../../backend/config");
  fs.mkdirSync(backendConfigDir, { recursive: true });
  fs.writeFileSync(path.join(backendConfigDir, "contracts.json"), JSON.stringify(config, null, 2));
  fs.writeFileSync(path.join(backendConfigDir, "WorkEscrowABI.json"), JSON.stringify(artifacts.WorkEscrow.abi, null, 2));
  fs.writeFileSync(path.join(backendConfigDir, "AgentLedgerABI.json"), JSON.stringify(artifacts.AgentLedger.abi, null, 2));
  fs.writeFileSync(path.join(backendConfigDir, "MockUSDCABI.json"), JSON.stringify(artifacts.MockUSDC.abi, null, 2));
  console.log("\n✅ Backend config written to backend/config/");

  // Frontend config
  const frontendConfigDir = path.join(__dirname, "../../frontend/src/config");
  fs.mkdirSync(frontendConfigDir, { recursive: true });
  fs.writeFileSync(path.join(frontendConfigDir, "contracts.json"), JSON.stringify(config, null, 2));
  fs.writeFileSync(path.join(frontendConfigDir, "WorkEscrowABI.json"), JSON.stringify(artifacts.WorkEscrow.abi, null, 2));
  fs.writeFileSync(path.join(frontendConfigDir, "MockUSDCABI.json"), JSON.stringify(artifacts.MockUSDC.abi, null, 2));
  console.log("✅ Frontend config written to frontend/src/config/");

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
