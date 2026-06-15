const hre = require("hardhat");
const config = require("../../backend/config/contracts.json");

async function main() {
  const [deployer, agent, client, freelancer] = await hre.ethers.getSigners();

  const usdc = await hre.ethers.getContractAt("MockUSDC", config.MockUSDC);
  const escrow = await hre.ethers.getContractAt("WorkEscrow", config.WorkEscrow);

  console.log("Funding client with USDC...");
  await usdc.transfer(client.address, hre.ethers.parseUnits("5000", 6));

  console.log("Client approving WorkEscrow...");
  await usdc.connect(client).approve(config.WorkEscrow, hre.ethers.parseUnits("5000", 6));

  console.log("Creating demo job...");
  const deadline = Math.floor(Date.now() / 1000) + 30 * 86400;
  const tx = await escrow.connect(client).createJob(
    config.MockUSDC,
    hre.ethers.parseUnits("500", 6),
    deadline,
    5000, // 50% yield to client
    "Build a React landing page",
    "Responsive landing page with hero, features, and signup form built in React + Tailwind."
  );
  const receipt = await tx.wait();
  console.log("Demo job created, tx:", receipt.hash);

  console.log("\nDemo accounts:");
  console.log("Client:     ", client.address);
  console.log("Freelancer: ", freelancer.address);
  console.log("Agent:      ", agent.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
