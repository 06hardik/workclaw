// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentLedger {
    function logDecision(
        uint256 nftId,
        uint256 jobId,
        uint8 actionType,
        bytes32 reasonHash,
        bool outcome,
        uint256 amountUsd
    ) external;
}

contract WorkEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;
    address public agent;
    IAgentLedger public agentLedger;

    enum JobStatus { OPEN, ACTIVE, SUBMITTED, COMPLETED, DISPUTED, RESOLVED, CANCELLED }

    // Action types mirror AgentLedger
    uint8 constant ACTION_DEPLOY_YIELD     = 0;
    uint8 constant ACTION_CLAIM_YIELD      = 1;
    uint8 constant ACTION_VERIFY           = 2;
    uint8 constant ACTION_RELEASE          = 3;
    uint8 constant ACTION_REJECT           = 4;
    uint8 constant ACTION_RESOLVE_DISPUTE  = 5;

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        address paymentToken;
        uint256 amount;
        uint256 yieldEarned;
        uint256 clientYieldBps;   // basis points client gets from yield (e.g. 5000 = 50%)
        uint256 deadline;
        uint256 agentNFTId;
        JobStatus status;
        string title;
        string scope;
        bytes32 deliverableHash;
        bytes32 reasonHash;
        uint256 createdAt;
        uint256 completedAt;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;

    event JobCreated(uint256 indexed jobId, address indexed client, address paymentToken, uint256 amount, string title, uint256 deadline);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
    event DeliverableSubmitted(uint256 indexed jobId, bytes32 deliverableHash);
    event YieldUpdated(uint256 indexed jobId, uint256 newYieldEarned);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 principalAmount, uint256 freelancerYield, uint256 clientYield, bytes32 reasonHash);
    event DisputeRaised(uint256 indexed jobId, address indexed raisedBy, string reason);
    event DisputeResolved(uint256 indexed jobId, address winner, uint256 clientShare, uint256 freelancerShare, bytes32 reasonHash);
    event JobCancelled(uint256 indexed jobId);

    modifier onlyOwner()  { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyAgent()  { require(msg.sender == agent, "Not agent"); _; }
    modifier jobExists(uint256 jobId) { require(jobs[jobId].id != 0, "Job not found"); _; }

    constructor(address _agent, address _agentLedger) {
        owner = msg.sender;
        agent = _agent;
        agentLedger = IAgentLedger(_agentLedger);
    }

    function setAgent(address _agent) external onlyOwner { agent = _agent; }
    function setAgentLedger(address _ledger) external onlyOwner { agentLedger = IAgentLedger(_ledger); }

    // ─── Client: Create Job ───────────────────────────────────────────────────
    function createJob(
        address paymentToken,
        uint256 amount,
        uint256 deadline,
        uint16 clientYieldBps,
        string calldata title,
        string calldata scope
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(clientYieldBps <= 10000, "Invalid bps");
        require(bytes(title).length > 0, "Title required");

        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);

        jobCounter++;
        jobs[jobCounter] = Job({
            id: jobCounter,
            client: msg.sender,
            freelancer: address(0),
            paymentToken: paymentToken,
            amount: amount,
            yieldEarned: 0,
            clientYieldBps: clientYieldBps,
            deadline: deadline,
            agentNFTId: 0,
            status: JobStatus.OPEN,
            title: title,
            scope: scope,
            deliverableHash: bytes32(0),
            reasonHash: bytes32(0),
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit JobCreated(jobCounter, msg.sender, paymentToken, amount, title, deadline);
        return jobCounter;
    }

    // ─── Freelancer: Accept Job (after off-chain hire) ────────────────────────
    function acceptJob(uint256 jobId) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.OPEN, "Not open");
        require(job.freelancer == msg.sender, "Not assigned freelancer");
        job.status = JobStatus.ACTIVE;
        emit JobAccepted(jobId, msg.sender);
    }

    // ─── Client: Assign Freelancer (after proposal acceptance) ───────────────
    function assignFreelancer(uint256 jobId, address freelancer) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Not client");
        require(job.status == JobStatus.OPEN, "Not open");
        require(freelancer != address(0), "Invalid address");
        job.freelancer = freelancer;
        job.status = JobStatus.ACTIVE;
        emit JobAccepted(jobId, freelancer);
    }

    // ─── Freelancer: Submit Deliverable ──────────────────────────────────────
    function submitDeliverable(uint256 jobId, bytes32 deliverableHash) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.freelancer, "Not freelancer");
        require(job.status == JobStatus.ACTIVE || job.status == JobStatus.DISPUTED, "Invalid status");
        job.deliverableHash = deliverableHash;
        job.status = JobStatus.SUBMITTED;
        emit DeliverableSubmitted(jobId, deliverableHash);
    }

    // ─── Agent: Update Yield ──────────────────────────────────────────────────
    function updateYield(uint256 jobId, uint256 yieldAmount) external onlyAgent jobExists(jobId) {
        jobs[jobId].yieldEarned = yieldAmount;
        emit YieldUpdated(jobId, yieldAmount);
    }

    // ─── Agent: Release Funds ─────────────────────────────────────────────────
    function agentRelease(
        uint256 jobId,
        bytes32 reasonHash,
        uint256 agentNFTId,
        bool approved
    ) external onlyAgent jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.SUBMITTED || job.status == JobStatus.DISPUTED,
            "Invalid status"
        );

        job.agentNFTId = agentNFTId;
        job.reasonHash = reasonHash;
        job.completedAt = block.timestamp;

        IERC20 token = IERC20(job.paymentToken);
        uint256 totalYield = job.yieldEarned;
        uint256 clientYield = (totalYield * job.clientYieldBps) / 10000;
        uint256 freelancerYield = totalYield - clientYield;

        if (approved) {
            job.status = JobStatus.COMPLETED;
            // Pay freelancer: principal + their yield share
            token.safeTransfer(job.freelancer, job.amount + freelancerYield);
            // Return client yield
            if (clientYield > 0) token.safeTransfer(job.client, clientYield);
        } else {
            // Dispute - refund client principal, keep yield pending
            job.status = JobStatus.DISPUTED;
        }

        // Log to AgentLedger
        if (address(agentLedger) != address(0)) {
            agentLedger.logDecision(
                agentNFTId, jobId,
                approved ? ACTION_RELEASE : ACTION_REJECT,
                reasonHash, approved,
                job.amount / 1e4 // approximate USD
            );
        }

        emit FundsReleased(jobId, job.freelancer, job.amount, freelancerYield, clientYield, reasonHash);
    }

    // ─── Dispute Flow ─────────────────────────────────────────────────────────
    function raiseDispute(uint256 jobId, string calldata reason) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Not a party"
        );
        require(job.status == JobStatus.SUBMITTED || job.status == JobStatus.ACTIVE, "Invalid status");
        job.status = JobStatus.DISPUTED;
        emit DisputeRaised(jobId, msg.sender, reason);
    }

    function agentResolveDispute(
        uint256 jobId,
        uint256 clientShareBps,
        bytes32 reasonHash,
        uint256 agentNFTId
    ) external onlyAgent jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.DISPUTED, "Not disputed");
        require(clientShareBps <= 10000, "Invalid bps");

        job.status = JobStatus.RESOLVED;
        job.reasonHash = reasonHash;
        job.completedAt = block.timestamp;

        IERC20 token = IERC20(job.paymentToken);
        uint256 total = job.amount + job.yieldEarned;
        uint256 clientAmount = (total * clientShareBps) / 10000;
        uint256 freelancerAmount = total - clientAmount;

        if (clientAmount > 0) token.safeTransfer(job.client, clientAmount);
        if (freelancerAmount > 0) token.safeTransfer(job.freelancer, freelancerAmount);

        if (address(agentLedger) != address(0)) {
            agentLedger.logDecision(agentNFTId, jobId, ACTION_RESOLVE_DISPUTE, reasonHash, true, total / 1e4);
        }

        emit DisputeResolved(jobId, clientShareBps > 5000 ? job.client : job.freelancer, clientAmount, freelancerAmount, reasonHash);
    }

    // ─── Client: Cancel (only OPEN jobs) ─────────────────────────────────────
    function cancelJob(uint256 jobId) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Not client");
        require(job.status == JobStatus.OPEN, "Can only cancel open jobs");
        job.status = JobStatus.CANCELLED;
        IERC20(job.paymentToken).safeTransfer(job.client, job.amount);
        emit JobCancelled(jobId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getJobsByStatus(uint8 status) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= jobCounter; i++) {
            if (uint8(jobs[i].status) == status) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= jobCounter; i++) {
            if (uint8(jobs[i].status) == status) result[idx++] = i;
        }
        return result;
    }
}
