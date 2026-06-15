// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title AgentLedger - ERC-8004 style Agent Identity & Decision Ledger
/// @notice Each autonomous agent is represented by an NFT. All agent decisions
///         (yield deployment, verification, fund release, dispute resolution)
///         are permanently logged on-chain and linked to the agent's NFT,
///         providing transparent, auditable reasoning history.
contract AgentLedger is ERC721 {
    address public owner;
    mapping(address => bool) public authorizedCallers;

    uint256 public nextNFTId = 1;

    struct Decision {
        uint256 jobId;
        uint256 timestamp;
        uint8 actionType; // 0=DEPLOY_YIELD,1=CLAIM_YIELD,2=VERIFY,3=RELEASE,4=REJECT,5=RESOLVE_DISPUTE,6=WARN_USER
        bytes32 reasonHash; // IPFS CID or hash of full AI reasoning JSON
        bool outcome;
        uint256 amountUsd;
    }

    struct ReputationEntry {
        address user;
        uint256 jobId;
        uint8 score; // 0-100
        string comment;
        uint256 timestamp;
    }

    mapping(uint256 => Decision[]) public decisions; // nftId => decisions
    mapping(address => uint256) public reputationScore; // running average * 100
    mapping(address => uint256) public jobsCompleted;
    mapping(address => ReputationEntry[]) public reputationEntries;

    event DecisionLogged(uint256 indexed nftId, uint256 indexed jobId, uint8 actionType, bytes32 reasonHash, bool outcome);
    event ReputationUpdated(address indexed user, uint256 newScore, uint8 rating, uint256 jobId);
    event AgentMinted(uint256 indexed nftId, address indexed to);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() ERC721("WorkClaw Agent Identity", "WCAGENT") {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
    }

    function authorizeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    function revokeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    /// @notice Mint a new Agent Identity NFT (ERC-8004 style agent registration)
    function mintAgent(address to) external onlyOwner returns (uint256) {
        uint256 nftId = nextNFTId++;
        _mint(to, nftId);
        emit AgentMinted(nftId, to);
        return nftId;
    }

    /// @notice Log an autonomous agent decision, linked to its NFT identity
    function logDecision(
        uint256 nftId,
        uint256 jobId,
        uint8 actionType,
        bytes32 reasonHash,
        bool outcome,
        uint256 amountUsd
    ) external onlyAuthorized {
        decisions[nftId].push(Decision({
            jobId: jobId,
            timestamp: block.timestamp,
            actionType: actionType,
            reasonHash: reasonHash,
            outcome: outcome,
            amountUsd: amountUsd
        }));
        emit DecisionLogged(nftId, jobId, actionType, reasonHash, outcome);
    }

    /// @notice Submit a reputation rating for a user after job completion
    function submitReputation(address user, uint256 jobId, uint8 score, string calldata comment) external onlyAuthorized {
        require(score <= 100, "Score must be 0-100");

        reputationEntries[user].push(ReputationEntry({
            user: user,
            jobId: jobId,
            score: score,
            comment: comment,
            timestamp: block.timestamp
        }));

        uint256 prevTotal = reputationScore[user] * jobsCompleted[user];
        jobsCompleted[user] += 1;
        reputationScore[user] = (prevTotal + score) / jobsCompleted[user];

        emit ReputationUpdated(user, reputationScore[user], score, jobId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getDecisions(uint256 nftId) external view returns (Decision[] memory) {
        return decisions[nftId];
    }

    function getTrustScore(address user) external view returns (uint256) {
        return reputationScore[user];
    }

    function getReputationEntries(address user) external view returns (ReputationEntry[] memory) {
        return reputationEntries[user];
    }
}
