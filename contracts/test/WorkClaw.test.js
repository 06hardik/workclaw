const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WorkClaw Contracts", function () {
  let agentLedger, workEscrow, usdc;
  let owner, agent, client, freelancer;

  beforeEach(async function () {
    [owner, agent, client, freelancer] = await ethers.getSigners();

    const AgentLedger = await ethers.getContractFactory("AgentLedger");
    agentLedger = await AgentLedger.deploy();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const WorkEscrow = await ethers.getContractFactory("WorkEscrow");
    workEscrow = await WorkEscrow.deploy(agent.address, await agentLedger.getAddress());

    await agentLedger.authorizeCaller(await workEscrow.getAddress());
    await agentLedger.mintAgent(agent.address); // NFT #1

    // Fund client
    await usdc.transfer(client.address, ethers.parseUnits("1000", 6));
    await usdc.connect(client).approve(await workEscrow.getAddress(), ethers.parseUnits("1000", 6));
  });

  it("creates a job and locks USDC in escrow", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    await expect(
      workEscrow.connect(client).createJob(
        await usdc.getAddress(),
        ethers.parseUnits("100", 6),
        deadline,
        5000,
        "Test Job",
        "Test scope"
      )
    ).to.emit(workEscrow, "JobCreated");

    const job = await workEscrow.getJob(1);
    expect(job.amount).to.equal(ethers.parseUnits("100", 6));
    expect(job.status).to.equal(0); // OPEN
  });

  it("full lifecycle: assign, submit, verify, release with yield split", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    await workEscrow.connect(client).createJob(
      await usdc.getAddress(), ethers.parseUnits("100", 6), deadline, 5000, "Job", "Scope"
    );

    await workEscrow.connect(client).assignFreelancer(1, freelancer.address);
    let job = await workEscrow.getJob(1);
    expect(job.status).to.equal(1); // ACTIVE

    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://deliverable"));
    await workEscrow.connect(freelancer).submitDeliverable(1, deliverableHash);
    job = await workEscrow.getJob(1);
    expect(job.status).to.equal(2); // SUBMITTED

    // Agent updates yield (simulating Byreal yield accrual)
    await workEscrow.connect(agent).updateYield(1, ethers.parseUnits("2", 6)); // 2 USDC yield

    // Simulate Byreal returning the claimed yield to the escrow contract
    await usdc.transfer(await workEscrow.getAddress(), ethers.parseUnits("2", 6));

    const freelancerBalBefore = await usdc.balanceOf(freelancer.address);
    const clientBalBefore = await usdc.balanceOf(client.address);

    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://reasoning"));
    await workEscrow.connect(agent).agentRelease(1, reasonHash, 1, true);

    job = await workEscrow.getJob(1);
    expect(job.status).to.equal(3); // COMPLETED

    const freelancerBalAfter = await usdc.balanceOf(freelancer.address);
    const clientBalAfter = await usdc.balanceOf(client.address);

    // freelancer gets principal (100) + 50% yield (1)
    expect(freelancerBalAfter - freelancerBalBefore).to.equal(ethers.parseUnits("101", 6));
    // client gets back 50% yield (1)
    expect(clientBalAfter - clientBalBefore).to.equal(ethers.parseUnits("1", 6));
  });

  it("handles disputes via agentResolveDispute", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    await workEscrow.connect(client).createJob(
      await usdc.getAddress(), ethers.parseUnits("100", 6), deadline, 5000, "Job", "Scope"
    );
    await workEscrow.connect(client).assignFreelancer(1, freelancer.address);

    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://bad-deliverable"));
    await workEscrow.connect(freelancer).submitDeliverable(1, deliverableHash);

    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://low-score"));
    // Agent rejects -> goes to DISPUTED
    await workEscrow.connect(agent).agentRelease(1, reasonHash, 1, false);
    let job = await workEscrow.getJob(1);
    expect(job.status).to.equal(4); // DISPUTED

    // Agent resolves dispute: 30% client, 70% freelancer
    const resolveHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://resolution"));
    await workEscrow.connect(agent).agentResolveDispute(1, 3000, resolveHash, 1);

    job = await workEscrow.getJob(1);
    expect(job.status).to.equal(5); // RESOLVED
  });

  it("logs decisions to AgentLedger with agent NFT identity", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    await workEscrow.connect(client).createJob(
      await usdc.getAddress(), ethers.parseUnits("100", 6), deadline, 5000, "Job", "Scope"
    );
    await workEscrow.connect(client).assignFreelancer(1, freelancer.address);
    await workEscrow.connect(freelancer).submitDeliverable(1, ethers.ZeroHash);

    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://reasoning"));
    await workEscrow.connect(agent).agentRelease(1, reasonHash, 1, true);

    const decisions = await agentLedger.getDecisions(1);
    expect(decisions.length).to.equal(1);
    expect(decisions[0].outcome).to.equal(true);
  });
});
