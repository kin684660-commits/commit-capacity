require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const path = require("path");

const allowXlayer = process.env.COMMIT_ALLOW_XLAYER === "1";

function xlayerAccounts() {
  if (process.env.DEPLOYER_KEY) return [process.env.DEPLOYER_KEY];
  const dest = path.resolve(__dirname, "../../.local/xlayer-wallets.json");
  try {
    const w = JSON.parse(fs.readFileSync(dest, "utf8"));
    if (w?.deployer?.privateKey) return [w.deployer.privateKey];
  } catch {}
  return [];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", viaIR: true },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    ...(allowXlayer
      ? {
          xlayerTest: {
            url: process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech/terigon",
            chainId: 1952,
            accounts: xlayerAccounts(),
          },
        }
      : {}),
  },
};
