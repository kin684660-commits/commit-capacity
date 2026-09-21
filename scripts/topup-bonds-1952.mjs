#!/usr/bin/env node
/**
 * Top up primary/backup freeBond on 1952 so createCommitment can succeed.
 * COMMIT_ALLOW_XLAYER=1. Uses .local/xlayer-wallets.json. Never mainnet.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";
import { createPublicClient, createWalletClient, http, parseAbi, maxUint256 } from "../apps/api/node_modules/viem/_esm/index.js";
import { xLayerTestnet } from "../apps/api/node_modules/viem/_esm/chains/index.js";

if (process.env.COMMIT_ALLOW_XLAYER !== "1") {
  console.error("set COMMIT_ALLOW_XLAYER=1");
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const token = process.env.COMMIT_TOKEN || "0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E";
const registry = process.env.COMMIT_REGISTRY || "0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64";
const rpcUrl = process.env.COMMIT_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const amount = BigInt(process.env.COMMIT_BOND_TOPUP || "500000"); // 0.50 tCOM each

const chain = { ...xLayerTestnet, rpcUrls: { default: { http: [rpcUrl] } } };
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

const erc20 = parseAbi([
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);
const regAbi = parseAbi([
  "function depositBond(uint256 amount)",
  "function freeBond(address) view returns (uint256)",
]);

function pk(role) {
  const w = wallets[role];
  const raw = w.privateKey.startsWith("0x") ? w.privateKey : `0x${w.privateKey}`;
  return privateKeyToAccount(raw);
}

async function topUp(role) {
  const account = pk(role);
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const before = await publicClient.readContract({
    address: registry,
    abi: regAbi,
    functionName: "freeBond",
    args: [account.address],
  });
  console.log(role, "freeBond_before", before.toString());

  const bal = await publicClient.readContract({
    address: token,
    abi: erc20,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (bal < amount) {
    const deployer = pk("deployer");
    const dw = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
    // gas dust for provider EOAs
    const gasBal = await publicClient.getBalance({ address: account.address });
    if (gasBal < 1_000_000_000_000_000n) {
      const gasHash = await dw.sendTransaction({ to: account.address, value: 20_000_000_000_000_000n });
      await publicClient.waitForTransactionReceipt({ hash: gasHash });
      console.log(role, "gas_funded", gasHash);
    }
    const mintHash = await dw.writeContract({
      address: token,
      abi: erc20,
      functionName: "mint",
      args: [account.address, amount * 2n],
    });
    const mintRc = await publicClient.waitForTransactionReceipt({ hash: mintHash });
    if (mintRc.status !== "success") throw new Error(`mint failed ${mintHash}`);
    console.log(role, "minted", mintHash);
  } else {
    const deployer = pk("deployer");
    const dw = createWalletClient({ account: deployer, chain, transport: http(rpcUrl) });
    const gasBal = await publicClient.getBalance({ address: account.address });
    if (gasBal < 1_000_000_000_000_000n) {
      const gasHash = await dw.sendTransaction({ to: account.address, value: 20_000_000_000_000_000n });
      await publicClient.waitForTransactionReceipt({ hash: gasHash });
      console.log(role, "gas_funded", gasHash);
    }
  }

  const approveHash = await wallet.writeContract({
    address: token,
    abi: erc20,
    functionName: "approve",
    args: [registry, maxUint256],
  });
  const approveRc = await publicClient.waitForTransactionReceipt({ hash: approveHash });
  if (approveRc.status !== "success") throw new Error(`approve failed ${approveHash}`);
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [account.address, registry],
  });
  console.log(role, "approved", approveHash, "allowance", allowance.toString());
  if (allowance < amount) throw new Error(`allowance still ${allowance}`);

  const depHash = await wallet.writeContract({
    address: registry,
    abi: regAbi,
    functionName: "depositBond",
    args: [amount],
  });
  const depRc = await publicClient.waitForTransactionReceipt({ hash: depHash });
  if (depRc.status !== "success") throw new Error(`depositBond failed ${depHash}`);
  const after = await publicClient.readContract({
    address: registry,
    abi: regAbi,
    functionName: "freeBond",
    args: [account.address],
  });
  console.log(role, "freeBond_after", after.toString(), "depositTx", depHash);
}

await topUp("primary");
await topUp("backup");
console.log("ok");
