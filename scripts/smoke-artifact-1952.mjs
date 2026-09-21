#!/usr/bin/env node
/**
 * Independent 1952 delivery run: store search.v1 bodies.
 * Not spliced with run_510deba24b1d (protocol evidence).
 * Run from Mac against live API after body-persistence is deployed.
 * COMMIT_SMOKE_1952=1. Never prints keys. Never mainnet 196.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";
import { createPublicClient, createWalletClient, http, formatEther } from "../apps/api/node_modules/viem/_esm/index.js";
import { xLayerTestnet } from "../apps/api/node_modules/viem/_esm/chains/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = process.env.COMMIT_API_ORIGIN || "https://commit.jibai.site";
const rpcUrl = process.env.COMMIT_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const token = "0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E";
const leadSec = Math.max(75, Number(process.env.COMMIT_ARTIFACT_LEAD || 90));
const quantity = Number(process.env.COMMIT_ARTIFACT_QTY || 3);
const windowSec = Math.max(180, Number(process.env.COMMIT_ARTIFACT_WINDOW || 180));
const queries = ["EIP-712", "RFC 2119", "X Layer"];

if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1");
  process.exit(2);
}

const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const seller = wallets.seller || wallets.deployer;
if (!seller?.privateKey) throw new Error("seller key missing");

function pk(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

const sellerAcct = privateKeyToAccount(pk(seller.privateKey));

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
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${pathname} ${r.status} ${text.slice(0, 240)}`);
  }
  if (!r.ok) throw new Error(`${pathname} ${r.status} ${JSON.stringify(body)}`);
  return { body, cookie: cookieFrom(r), status: r.status };
}

function siweMessage({ domain, address, uri, nonce, chainId, issuedAt, expirationTime }) {
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nCommit reservation login.\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expirationTime}`;
}

async function login(account) {
  const { body: nonceBody } = await json("/api/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address: account.address }),
  });
  const now = Math.floor(Date.now() / 1000);
  const message = siweMessage({
    domain: "commit.jibai.site",
    address: account.address,
    uri: api,
    nonce: nonceBody.nonce,
    chainId: Number(nonceBody.chainId || 1952),
    issuedAt: new Date(now * 1000).toISOString(),
    expirationTime: new Date((now + 3600) * 1000).toISOString(),
  });
  const signature = await account.signMessage({ message });
  const verified = await json("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ message, signature }),
  });
  if (!verified.cookie) throw new Error(`no session cookie for ${account.address}`);
  return verified.cookie;
}

async function waitUntil(iso, label) {
  const target = Date.parse(iso);
  for (;;) {
    const left = target - Date.now();
    if (left <= 500) return;
    console.log(`waiting ${label} ${Math.ceil(left / 1000)}s`);
    await new Promise((r) => setTimeout(r, Math.min(left, 10_000)));
  }
}

const erc20 = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
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

const chain = { ...xLayerTestnet, rpcUrls: { default: { http: [rpcUrl] } } };
const client = createPublicClient({ chain, transport: http(rpcUrl) });

async function approveSpend(account, spender, amount) {
  const current = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [account.address, spender],
  });
  if (current >= amount) return;
  const w = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const hash = await w.writeContract({
    address: token,
    abi: erc20,
    functionName: "approve",
    args: [spender, amount],
  });
  await client.waitForTransactionReceipt({ hash });
}

const health = await json("/api/health");
const config = await json("/api/config");
if (health.body.chainId !== 1952) throw new Error(`health chainId ${health.body.chainId}`);
if (config.body.localHardhat) throw new Error("staging still localHardhat");
if (Number(config.body.chainId) === 196) throw new Error("mainnet 196");
const gasSeller = await client.getBalance({ address: sellerAcct.address });
const tcomSeller = await client.readContract({
  address: token,
  abi: erc20,
  functionName: "balanceOf",
  args: [sellerAcct.address],
});
console.log(
  "preflight",
  JSON.stringify({
    chainId: health.body.chainId,
    gasSeller: formatEther(gasSeller),
    tcomSeller: tcomSeller.toString(),
    quantity,
    leadSec,
    windowSec,
  }),
);
if (gasSeller === 0n) throw new Error("missing test OKB");
if (tcomSeller < 70_000n) throw new Error(`seller tCOM ${tcomSeller} < 0.07`);

const registry = config.body.registry;
await approveSpend(sellerAcct, registry, 10_000_000n);
const sellerCookie = await login(sellerAcct);

const startSec = Math.floor(Date.now() / 1000) + leadSec;
const endSec = startSec + windowSec;
const { body: quote } = await json("/api/capacity/quote", {
  method: "POST",
  body: JSON.stringify({
    quantity,
    serviceClass: "search",
    query: "artifact delivery",
    window: { start: new Date(startSec * 1000).toISOString(), end: new Date(endSec * 1000).toISOString() },
  }),
});
console.log("quote", quote.quoteId, quote.window);

const { body: reserved } = await json("/api/reservations", {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ quoteId: quote.quoteId }),
});
console.log("reserved", reserved.reservationId);

const { body: created } = await json(`/api/commitments/${reserved.reservationId}/onchain-create`, {
  method: "POST",
  headers: { cookie: sellerCookie },
});
console.log("created", created.commitmentId || created.chain?.commitmentId, created.txHash || created.chain?.createTx);

await waitUntil(quote.window.start, "window start");
await new Promise((r) => setTimeout(r, 1500));

const executed = [];
for (const query of queries) {
  const { body } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
    method: "POST",
    headers: { cookie: sellerCookie },
    body: JSON.stringify({ query, clientRequestId: `art-${query.replace(/\s+/g, "-")}-${Date.now()}` }),
  });
  const requestId = body.requestId || body.id;
  const { body: logical } = await json(`/api/requests/${requestId}`);
  const n = logical.output?.results?.length || 0;
  console.log("execute", query, body.status, requestId, "hits", n);
  if (n < 1) throw new Error(`no stored body for ${query}`);
  executed.push({
    query,
    status: body.status,
    requestId,
    remaining: body.remaining,
    liveUsed: body.liveUsed,
    hits: n,
    title: logical.output.results[0].title,
  });
  await json("/api/admin/outbox");
  await new Promise((r) => setTimeout(r, 1200));
}

await waitUntil(quote.window.end, "window end");
await new Promise((r) => setTimeout(r, 2500));

let closed = { status: "open", chain: {} };
let lastCloseErr = null;
for (let i = 0; i < 4; i++) {
  try {
    const out = await json(`/api/commitments/${reserved.reservationId}/prepare-close`, {
      method: "POST",
      headers: { cookie: sellerCookie },
    });
    closed = out.body;
    lastCloseErr = null;
    break;
  } catch (e) {
    lastCloseErr = e;
    console.log("prepare-close retry", i, String(e.message || e).slice(0, 240));
    await new Promise((r) => setTimeout(r, 8000));
  }
}
if (lastCloseErr) console.log("prepare-close deferred", String(lastCloseErr.message || lastCloseErr).slice(0, 240));
console.log("closed", closed.status, closed.chain?.settled?.txHash || closed.chain?.settleTx);

const { body: view } = await json(`/api/commitments/${reserved.reservationId}`);
const summary = {
  recorded: true,
  schemaVersion: "commit.evidence.v1",
  play: "artifact delivery: stored search.v1 bodies. Separate from run_510deba24b1d.",
  quoteId: quote.quoteId,
  aspId: 13781,
  service: "Commit Capacity Quote",
  t05: executed[0],
  t06: executed[1] ? { ...executed[1], route: "PRIMARY" } : undefined,
  t21: executed[2],
  settlement: {
    settleTx: closed.chain?.settled?.txHash || closed.chain?.settleTx,
    status: view.status,
  },
  chain: { ...(view.chain || {}), createTx: created.txHash || created.chain?.createTx || created.chain?.txHash },
  note: "X Layer testnet 1952. tCOM has no value. Delivery artifact run. Not spliced with protocol evidence.",
};

const { body: evidence } = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({ reservationId: reserved.reservationId, summary }),
});

const out = {
  evidenceRunId: evidence.runId,
  reservationId: reserved.reservationId,
  window: quote.window,
  quoteId: quote.quoteId,
  createTx: summary.chain.createTx,
  settleTx: summary.settlement.settleTx,
  remaining: view.remaining,
  used: view.liveUsed,
  status: view.status,
  executed,
};
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
fs.writeFileSync(path.join(root, ".local/artifact-1952.json"), JSON.stringify(out, null, 2));
console.log("=== ARTIFACT 1952 ===");
console.log(JSON.stringify(out, null, 2));
console.log("=== done ===");
