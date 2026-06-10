// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WorkEscrow
 * @notice Autonomous freelancer escrow with AI-verified deliverable release.
 *         Deployed on Mantle Sepolia (Chain ID: 5003).
 *         The WorkClaw agent (ERC-8004 identity) is the only authorized caller
 *         for agentRelease() and agentResolveDispute().
 */
contract WorkEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    enum JobStatus {
        OPEN,          // job posted, not yet accepted
        ACTIVE,        // freelancer accepted, funds escrowed
        SUBMITTED,     // freelancer submitted deliverable
        COMPLETED,     // agent verified + funds released
        DISPUTED,      // dispute raised by either party
        RESOLVED,      // dispute resolved by agent
        CANCELLED      // cancelled before acceptance
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        address paymentToken;   // USDC or native MNT (address(0) for native)
        uint256 amount;         // principal amount escrowed
        uint256 yieldEarned;    // yield accumulated by agent (updated off-chain, stored here)
        uint16  clientYieldBps; // basis points of yield going to CLIENT (0–10000). uint16 supports up to 65535.
        uint256 deadline;       // unix timestamp
        uint256 agentNFTId;     // ERC-8004 identity token ID of WorkClaw agent
        JobStatus status;
        string  title;
        string  scope;          // IPFS CID or plain text job description
        bytes32 deliverableHash; // IPFS CID of submitted deliverable
        bytes32 reasonHash;      // IPFS CID of AI reasoning text
        uint256 createdAt;
        uint256 completedAt;
    }

    // ─────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;

    address public agentAddress;        // WorkClaw agent wallet
    address public agentLedger;         // AgentLedger contract for logging

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address paymentToken,
        uint256 amount,
        string  title,
        uint256 deadline
    );
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
    event DeliverableSubmitted(uint256 indexed jobId, bytes32 deliverableHash);
    event YieldUpdated(uint256 indexed jobId, uint256 newYieldEarned);
    event FundsReleased(
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 principalAmount,
        uint256 freelancerYield,
        uint256 clientYield,
        bytes32 reasonHash
    );
    event DisputeRaised(uint256 indexed jobId, address indexed raisedBy, string reason);
    event DisputeResolved(
        uint256 indexed jobId,
        address winner,
        uint256 clientShare,
        uint256 freelancerShare,
        bytes32 reasonHash
    );
    event JobCancelled(uint256 indexed jobId);
    event AgentAddressUpdated(address newAgent);

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "WorkEscrow: caller is not the agent");
        _;
    }

    modifier jobExists(uint256 jobId) {
        require(jobId > 0 && jobId <= jobCounter, "WorkEscrow: job does not exist");
        _;
    }

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address _agentAddress, address _agentLedger) Ownable(msg.sender) {
        require(_agentAddress != address(0), "WorkEscrow: zero agent address");
        agentAddress = _agentAddress;
        agentLedger  = _agentLedger;
    }

    // ─────────────────────────────────────────────
    // Client Actions
    // ─────────────────────────────────────────────

    /**
     * @notice Client creates a job, assigns a freelancer, and deposits payment.
     * @param freelancer    Address of the hired freelancer.
     * @param paymentToken  Address of ERC-20 token (e.g., USDC). Use address(0) for native MNT.
     * @param amount        Amount of tokens to deposit.
     * @param deadline      Unix timestamp of project deadline.
     * @param clientYieldBps Basis points of DeFi yield that stays with the client (0–10000).
     * @param title         Job title.
     * @param scope         Job description or IPFS CID.
     */
    function createJobAndAssign(
        address freelancer,
        address paymentToken,
        uint256 amount,
        uint256 deadline,
        uint16  clientYieldBps,
        string  calldata title,
        string  calldata scope
    ) external payable nonReentrant returns (uint256 jobId) {
        require(freelancer != address(0), "WorkEscrow: zero freelancer address");
        require(freelancer != msg.sender, "WorkEscrow: client cannot be freelancer");
        require(amount > 0, "WorkEscrow: amount must be > 0");
        require(deadline > block.timestamp, "WorkEscrow: deadline must be in future");
        require(clientYieldBps <= 10000, "WorkEscrow: invalid yield split");

        // Transfer funds into escrow
        if (paymentToken == address(0)) {
            require(msg.value == amount, "WorkEscrow: MNT amount mismatch");
        } else {
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }

        jobCounter++;
        jobId = jobCounter;

        jobs[jobId] = Job({
            id:              jobId,
            client:          msg.sender,
            freelancer:      freelancer,
            paymentToken:    paymentToken,
            amount:          amount,
            yieldEarned:     0,
            clientYieldBps:  clientYieldBps,
            deadline:        deadline,
            agentNFTId:      0,
            status:          JobStatus.ACTIVE,
            title:           title,
            scope:           scope,
            deliverableHash: bytes32(0),
            reasonHash:      bytes32(0),
            createdAt:       block.timestamp,
            completedAt:     0
        });

        emit JobCreated(jobId, msg.sender, paymentToken, amount, title, deadline);
        emit JobAccepted(jobId, freelancer);
    }

    /**
     * @notice Client cancels a job before it is accepted by a freelancer.
     *         In Upwork flow, job starts ACTIVE, so this is only if we support OPEN jobs.
     */
    function cancelJob(uint256 jobId) external nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "WorkEscrow: not client");
        require(job.status == JobStatus.OPEN, "WorkEscrow: job not cancellable");

        job.status = JobStatus.CANCELLED;
        _transferFunds(job.paymentToken, job.client, job.amount);

        emit JobCancelled(jobId);
    }

    // ─────────────────────────────────────────────
    // Freelancer Actions
    // ─────────────────────────────────────────────

    /**
     * @notice Freelancer submits a deliverable (IPFS CID encoded as bytes32).
     * @param deliverableHash keccak256 or CID of the deliverable.
     */
    function submitDeliverable(
        uint256 jobId,
        bytes32 deliverableHash
    ) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.freelancer, "WorkEscrow: not freelancer");
        require(job.status == JobStatus.ACTIVE, "WorkEscrow: job not active");
        require(deliverableHash != bytes32(0), "WorkEscrow: empty hash");

        job.deliverableHash = deliverableHash;
        job.status          = JobStatus.SUBMITTED;

        emit DeliverableSubmitted(jobId, deliverableHash);
    }

    // ─────────────────────────────────────────────
    // Agent Actions (only WorkClaw agent can call)
    // ─────────────────────────────────────────────

    /**
     * @notice Agent updates the yield earned on escrowed funds (from Byreal CLMM).
     *         Called periodically as yield accrues.
     */
    function updateYield(
        uint256 jobId,
        uint256 yieldAmount
    ) external onlyAgent jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.ACTIVE || job.status == JobStatus.SUBMITTED,
            "WorkEscrow: job not in yield phase"
        );
        job.yieldEarned = yieldAmount;
        emit YieldUpdated(jobId, yieldAmount);
    }

    /**
     * @notice Agent releases escrow funds after verifying the deliverable.
     * @param jobId         The job ID.
     * @param reasonHash    IPFS CID of the AI verification reasoning (for transparency).
     * @param agentNFTId    ERC-8004 token ID of the agent making this decision.
     * @param approved      true = release to freelancer; false = return to client.
     */
    function agentRelease(
        uint256 jobId,
        bytes32 reasonHash,
        uint256 agentNFTId,
        bool    approved
    ) external onlyAgent nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "WorkEscrow: deliverable not submitted");
        require(reasonHash != bytes32(0), "WorkEscrow: reason hash required");

        job.reasonHash  = reasonHash;
        job.agentNFTId  = agentNFTId;
        job.completedAt = block.timestamp;

        if (approved) {
            job.status = JobStatus.COMPLETED;

            // Calculate yield split
            uint256 clientYield     = (job.yieldEarned * job.clientYieldBps) / 10000;
            uint256 freelancerYield = job.yieldEarned - clientYield;

            // Release principal + freelancer yield to freelancer
            _transferFunds(job.paymentToken, job.freelancer, job.amount + freelancerYield);

            // Return client yield to client (if any)
            if (clientYield > 0) {
                _transferFunds(job.paymentToken, job.client, clientYield);
            }

            emit FundsReleased(
                jobId,
                job.freelancer,
                job.amount,
                freelancerYield,
                clientYield,
                reasonHash
            );
        } else {
            // Return everything to client if deliverable rejected
            job.status = JobStatus.CANCELLED;
            _transferFunds(job.paymentToken, job.client, job.amount + job.yieldEarned);
        }
    }

    /**
     * @notice Either party can raise a dispute.
     */
    function raiseDispute(
        uint256 jobId,
        string calldata reason
    ) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "WorkEscrow: not a party"
        );
        require(
            job.status == JobStatus.ACTIVE || job.status == JobStatus.SUBMITTED,
            "WorkEscrow: cannot dispute at this stage"
        );

        job.status = JobStatus.DISPUTED;
        emit DisputeRaised(jobId, msg.sender, reason);
    }

    /**
     * @notice Agent resolves a dispute and splits funds accordingly.
     * @param clientShareBps  Basis points of total (principal + yield) going to client.
     *                        Freelancer gets remainder.
     */
    function agentResolveDispute(
        uint256 jobId,
        uint256 clientShareBps,
        bytes32 reasonHash,
        uint256 agentNFTId
    ) external onlyAgent nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.DISPUTED, "WorkEscrow: not in dispute");
        require(clientShareBps <= 10000, "WorkEscrow: invalid split");
        require(reasonHash != bytes32(0), "WorkEscrow: reason hash required");

        job.status      = JobStatus.RESOLVED;
        job.reasonHash  = reasonHash;
        job.agentNFTId  = agentNFTId;
        job.completedAt = block.timestamp;

        uint256 total            = job.amount + job.yieldEarned;
        uint256 clientShare      = (total * clientShareBps) / 10000;
        uint256 freelancerShare  = total - clientShare;

        if (clientShare > 0) {
            _transferFunds(job.paymentToken, job.client, clientShare);
        }
        if (freelancerShare > 0) {
            _transferFunds(job.paymentToken, job.freelancer, freelancerShare);
        }

        emit DisputeResolved(jobId, clientShareBps > 5000 ? job.client : job.freelancer, clientShare, freelancerShare, reasonHash);
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setAgentAddress(address newAgent) external onlyOwner {
        require(newAgent != address(0), "WorkEscrow: zero address");
        agentAddress = newAgent;
        emit AgentAddressUpdated(newAgent);
    }

    // ─────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getJobsByStatus(JobStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= jobCounter; i++) {
            if (jobs[i].status == status) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= jobCounter; i++) {
            if (jobs[i].status == status) result[idx++] = i;
        }
        return result;
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _transferFunds(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "WorkEscrow: native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {}
}
