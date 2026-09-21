#!/usr/bin/env node
/**
 * 1952 T06 only: short lead window, inject primary delay, expect backup success.
 * COMMIT_SMOKE_1952=1. Does not enable DEV_SESSION.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";
import { createPublicClient, createWalletClient, http } from "../apps/api/node_modules/viem/_esm/index.js";
import { xLayerTestnet } from "../apps/api/node_modules/viem/_esm/chains/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = process.env.COMMIT_API_ORIGIN || "https://commit.jibai.site";
if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1");
  process.exit(2);
}

const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const seller = wallets.seller || wallets.deployer;
const pk = seller.privateKey.startsWith("0x") ? seller.privateKey : `0x${seller.privateKey}`;
const sellerAcct = privateKeyToAccount(pk);
const token = "0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E";
const rpcUrl = process.env.COMMIT_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const chain = { ...xLayerTestnet, rpcUrls: { default: { http: [rpcUrl] } } };
const client = createPublicClient({ chain, transport: http(rpcUrl) });
const erc20 = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

function cookieFrom(res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = list.find((c) => c.startsWith("commit_session=")) || res.headers.get("set-cookie") || "";
  return String(raw).split(";")[0];
}

async function json(pathname, opts = {}) {
  const r = await fetch(`${api}${pathname}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`${pathname} ${r.status} ${JSON.stringify(body)}`);
  return { body, cookie: cookieFrom(r) };
}

async function login(account) {
  const { body: nonceBody } = await json("/api/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address: account.address }),
  });
  const now = Math.floor(Date.now() / 1000);
  const message = `commit.jibai.site wants you to sign in with your Ethereum account:\n${account.address}\n\nCommit reservation login.\n\nURI: ${api}\nVersion: 1\nChain ID: ${Number(nonceBody.chainId || 1952)}\nNonce: ${nonceBody.nonce}\nIssued At: ${new Date(now * 1000).toISOString()}\nExpiration Time: ${new Date((now + 3600) * 1000).toISOString()}`;
  const signature = await account.signMessage({ message });
  const verified = await json("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ message, signature }),
  });
  return verified.cookie;
}

const startSec = Math.floor(Date.now() / 1000) + Math.max(180, Number(process.env.COMMIT_T06_LEAD || 900));
const endSec = startSec + 10 * 60;
const { body: cfg } = await json("/api/config");
const registry = cfg.registry;
if (!registry) throw new Error("config.registry missing");
const allowance = await client.readContract({
  address: token,
  abi: erc20,
  functionName: "allowance",
  args: [sellerAcct.address, registry],
});
if (allowance < 10_000_000n) {
  const w = createWalletClient({ account: sellerAcct, chain, transport: http(rpcUrl) });
  const hash = await w.writeContract({
    address: token,
    abi: erc20,
    functionName: "approve",
    args: [registry, 10_000_000n],
  });
  await client.waitForTransactionReceipt({ hash });
  console.log("approved", hash);
} else {
  console.log("allowance ok");
}
const sellerCookie = await login(sellerAcct);
const { body: quote } = await json("/api/capacity/quote", {
  method: "POST",
  body: JSON.stringify({
    quantity: 3,
    query: "t06 failover",
    window: { start: new Date(startSec * 1000).toISOString(), end: new Date(endSec * 1000).toISOString() },
  }),
});
const { body: reserved } = await json("/api/reservations", {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ quoteId: quote.quoteId }),
});
const { body: created } = await json(`/api/commitments/${reserved.reservationId}/onchain-create`, {
  method: "POST",
  headers: { cookie: sellerCookie },
});
console.log("created", created.chain?.commitmentId || created, "wait", quote.window.start);

const inject = await fetch(`${api}/api/admin/demo/fault`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-commit-admin": process.env.COMMIT_T06_ADMIN || "from-host",
  },
  body: JSON.stringify({ delayMs: 11000 }),
});
const injectBody = await inject.json().catch(() => ({}));
console.log("mac inject", inject.status, injectBody?.error?.code || injectBody);

while (Date.now() < Date.parse(quote.window.start) - 500) {
  const left = Date.parse(quote.window.start) - Date.now();
  console.log("waiting", Math.ceil(left / 1000), "s");
  await new Promise((r) => setTimeout(r, Math.min(left, 10_000)));
}
await new Promise((r) => setTimeout(r, 2000));

const { body: t06 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "T06", clientRequestId: `t06-${Date.now()}` }),
});
console.log(
  JSON.stringify({
    reservationId: reserved.reservationId,
    status: t06.status,
    remaining: t06.remaining,
    liveUsed: t06.liveUsed,
    route: t06.route,
    macInject: inject.ok,
  }),
);
