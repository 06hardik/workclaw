// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentLedger
 * @notice ERC-8004 companion contract for WorkClaw.
 *         Mints an ERC-721 identity NFT for the WorkClaw agent and
 *         logs every AI decision permanently on-chain.
 *
 *         This provides the on-chain benchmarking of AI decisions required
 *         by the Turing Test Hackathon specification.
 */
contract AgentLedger is ERC721URIStorage, Ownable {

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    enum ActionType {
        DEPLOY_YIELD,           // agent deployed escrow to Byreal CLMM
        CLAIM_YIELD,            // agent claimed yield from Byreal CLMM
        VERIFY_DELIVERABLE,     // agent verified freelancer deliverable
        RELEASE_FUNDS,          // agent released escrowed funds
        REJECT_DELIVERABLE,     // agent rejected deliverable
        RESOLVE_DISPUTE,        // agent resolved a dispute
        WARN_USER               // agent issued a proactive warning
    }

    struct Decision {
        uint256   jobId;
        uint256   timestamp;
        ActionType actionType;
        bytes32   reasonHash;   // IPFS CID → full LLM reasoning text
        bool      outcome;      // true = success/approved, false = rejected/failed
        uint256   amountUsd;    // value involved (in USD cents, 0 if N/A)
    }

    struct ReputationEntry {
        address   user;
        uint256   jobId;
        uint8     score;        // 1–5 rating
        string    comment;
        uint256   timestamp;
    }

    // ─────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────

    uint256 public nextTokenId = 1;

    // NFT ID → decisions made by that agent
    mapping(uint256 => Decision[]) public agentDecisions;

    // Address → reputation entries received
    mapping(address => ReputationEntry[]) public userReputation;

    // Address → overall reputation score (0–10000 basis points)
    mapping(address => uint256) public reputationScore;

    // Address → total jobs completed
    mapping(address => uint256) public jobsCompleted;

    // Address → total disputes lost
    mapping(address => uint256) public disputesLost;

    // Authorized agent addresses that can log decisions
    mapping(address => bool) public authorizedAgents;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event AgentIdentityMinted(uint256 indexed tokenId, address indexed agentAddress, string metadataURI);
    event DecisionLogged(uint256 indexed nftId, uint256 indexed jobId, ActionType actionType, bytes32 reasonHash, bool outcome);
    event ReputationUpdated(address indexed user, uint256 newScore, uint8 rating, uint256 jobId);
    event AgentAuthorized(address indexed agentAddress);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor() ERC721("WorkClaw Agent Identity", "WCAI") Ownable(msg.sender) {}

    // ─────────────────────────────────────────────
    // Minting (ERC-8004 Identity)
    // ─────────────────────────────────────────────

    /**
     * @notice Mint an ERC-8004 identity NFT for an agent.
     * @param to          Address of the agent/wallet to receive the NFT.
     * @param metadataURI IPFS URI of the Agent Card JSON (ERC-8004 spec).
     */
    function mintAgentIdentity(
        address to,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        authorizedAgents[to] = true;
        emit AgentIdentityMinted(tokenId, to, metadataURI);
    }

    /**
     * @notice Authorize an address to log decisions without minting an NFT.
     *         Used for the backend agent wallet.
     */
    function authorizeAgent(address agentAddress) external onlyOwner {
        authorizedAgents[agentAddress] = true;
        emit AgentAuthorized(agentAddress);
    }

    // ─────────────────────────────────────────────
    // Decision Logging (ERC-8004 Reputation Registry)
    // ─────────────────────────────────────────────

    /**
     * @notice Log an AI agent decision on-chain.
     * @param nftId       ERC-8004 token ID (0 if agent doesn't have one yet).
     * @param jobId       Related job ID in WorkEscrow.
     * @param actionType  Type of action taken.
     * @param reasonHash  IPFS CID of full LLM reasoning text.
     * @param outcome     Whether the action succeeded/approved.
     * @param amountUsd   Value involved in USD cents.
     */
    function logDecision(
        uint256    nftId,
        uint256    jobId,
        ActionType actionType,
        bytes32    reasonHash,
        bool       outcome,
        uint256    amountUsd
    ) external {
        require(authorizedAgents[msg.sender], "AgentLedger: not authorized agent");

        agentDecisions[nftId].push(Decision({
            jobId:      jobId,
            timestamp:  block.timestamp,
            actionType: actionType,
            reasonHash: reasonHash,
            outcome:    outcome,
            amountUsd:  amountUsd
        }));

        emit DecisionLogged(nftId, jobId, actionType, reasonHash, outcome);
    }

    // ─────────────────────────────────────────────
    // Reputation (ERC-8004 Reputation Registry)
    // ─────────────────────────────────────────────

    /**
     * @notice Submit reputation feedback for a user (freelancer or client).
     * @param user    Address to rate.
     * @param jobId   Job this feedback relates to.
     * @param score   Rating from 1–5.
     * @param comment Short feedback text.
     */
    function submitReputation(
        address user,
        uint256 jobId,
        uint8   score,
        string  calldata comment
    ) external {
        require(score >= 1 && score <= 5, "AgentLedger: invalid score");

        userReputation[user].push(ReputationEntry({
            user:      user,
            jobId:     jobId,
            score:     score,
            comment:   comment,
            timestamp: block.timestamp
        }));

        // Recalculate reputation score (simple moving average, scaled to 10000 bps)
        uint256 total = 0;
        ReputationEntry[] storage entries = userReputation[user];
        for (uint256 i = 0; i < entries.length; i++) {
            total += entries[i].score;
        }
        reputationScore[user] = (total * 10000) / (entries.length * 5);

        if (score >= 4) {
            jobsCompleted[user]++;
        } else if (score <= 2) {
            disputesLost[user]++;
        }

        emit ReputationUpdated(user, reputationScore[user], score, jobId);
    }

    // ─────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────

    function getDecisionCount(uint256 nftId) external view returns (uint256) {
        return agentDecisions[nftId].length;
    }

    function getDecisions(uint256 nftId) external view returns (Decision[] memory) {
        return agentDecisions[nftId];
    }

    function getReputationEntries(address user) external view returns (ReputationEntry[] memory) {
        return userReputation[user];
    }

    function getTrustScore(address user) external view returns (uint256) {
        return reputationScore[user];
    }
}
