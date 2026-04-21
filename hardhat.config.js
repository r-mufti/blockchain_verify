// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY  = process.env.PRIVATE_KEY  || "0x" + "0".repeat(64);
const INFURA_KEY   = process.env.INFURA_KEY   || "";
const ETHERSCAN_KEY= process.env.ETHERSCAN_KEY|| "";
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // ── Local ───────────────────────────────────────────────────────────────
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ── Testnets ────────────────────────────────────────────────────────────
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
    },

    // ── Mainnets ────────────────────────────────────────────────────────────
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    },
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 137,
      gasPrice: 50_000_000_000, // 50 gwei
    },
  },

  etherscan: {
    apiKey: {
      mainnet:        ETHERSCAN_KEY,
      sepolia:        ETHERSCAN_KEY,
      polygon:        POLYGONSCAN_KEY,
      polygonMumbai:  POLYGONSCAN_KEY,
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.CMC_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
