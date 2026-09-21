#!/usr/bin/env node
/**
 * Create five X Layer testnet role wallets. Writes gitignored .local/xlayer-wallets.json.
 * Does not print private keys. Re-run with --force to rotate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, ".local/xlayer-wallets.json");
const force = process.argv.includes("--force");

function publicOnly(w) {
  return {
    deployer: w.deployer.address,
    seller: (w.seller || w.deployer).address,
    buyer: w.buyer.address,
    primary: w.primary.address,
    backup: w.backup.address,
    verifier: w.verifier.address,
  };
}

if (fs.existsSync(dest) && !force) {
  const existing = JSON.parse(fs.readFileSync(dest, "utf8"));
  console.log(JSON.stringify({ reused: true, file: dest, addresses: publicOnly(existing) }, null, 2));
  process.exit(0);
}

function role() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

const deployer = role();
const wallets = {
  chainId: 1952,
  createdAt: new Date().toISOString(),
  note: "Testnet only. tCOM has no value. Never use these keys on mainnet 196.",
  deployer,
  seller: deployer,
  buyer: role(),
  primary: role(),
  backup: role(),
  verifier: role(),
};

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(wallets, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ created: true, file: dest, addresses: publicOnly(wallets) }, null, 2));
