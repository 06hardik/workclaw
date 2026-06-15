require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the locally installed npm `solc` package directly instead of downloading
// a compiler binary from binaries.soliditylang.org (blocked in sandboxed envs).
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }) => {
  const solcJsPath = require.resolve("solc/soljson.js");
  return {
    compilerPath: solcJsPath,
    isSolcJs: true,
    version: solcVersion,
    longVersion: `${solcVersion}+commit.local`,
  };
});

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const CLIENT_PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;
const FREELANCER_PRIVATE_KEY = process.env.FREELANCER_PRIVATE_KEY;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || AGENT_PRIVATE_KEY;

const mantleAccounts = [DEPLOYER_PRIVATE_KEY, AGENT_PRIVATE_KEY, CLIENT_PRIVATE_KEY, FREELANCER_PRIVATE_KEY]
  .filter((k) => k && (k.length === 64 || k.length === 66))
  .map((k) => k.startsWith('0x') ? k : `0x${k}`);

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun"
    },
  },
  networks: {
    "mantle-sepolia": {
      url: process.env.MANTLE_RPC_URL || "https://rpc.sepolia.mantle.xyz",
      accounts: mantleAccounts,
      chainId: 5003,
    },
    hardhat: {
      chainId: 31337,
      // Use the same accounts the backend expects in demo mode
      accounts: {
        accountsBalance: "10000000000000000000000",
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
  },
};
