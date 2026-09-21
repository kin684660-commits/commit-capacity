#!/usr/bin/env node
/**
 * Staging HTTPS smoke on X Layer testnet 1952.
 * Requires COMMIT_SMOKE_1952=1 and gitignored .local/xlayer-wallets.json.
 * Spends test OKB + tCOM only. Never mainnet 196. Does not enable DEV_SESSION.
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
const timeoutMs = Number(process.env.COMMIT_ATTEMPT_TIMEOUT_MS || 8000);

if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1 to run the 1952 HTTPS smoke");
  process.exit(2);
}

const walletsPath = path.join(root, ".local/xlayer-wallets.json");
if (!fs.existsSync(walletsPath)) throw new Error("missing .local/xlayer-wallets.json");
const wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
const seller = wallets.seller || wallets.deployer;
const buyer = wallets.buyer;
if (!seller?.privateKey || !buyer?.privateKey) throw new Error("seller/buyer keys missing");

const sellerAcct = privateKeyToAccount(pk(seller.privateKey));
const buyerAcct = privateKeyToAccount(pk(buyer.privateKey));

function pk(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

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
const client = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

async function approveSpend(account, spender, amount) {
  const current = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [account.address, spender],
  });
  if (current >= amount) {
    console.log("allowance ok", account.address, current.toString());
    return;
  }
  const w = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const hash = await w.writeContract({
    address: token,
    abi: erc20,
    functionName: "approve",
    args: [spender, amount],
  });
  await client.waitForTransactionReceipt({ hash });
  console.log("approved", account.address, hash);
}

async function preflight() {
  const health = await json("/api/health");
  const config = await json("/api/config");
  if (health.body.chainId !== 1952) throw new Error(`health chainId ${health.body.chainId}`);
  if (config.body.localHardhat) throw new Error("staging still localHardhat");
  if (Number(config.body.chainId) === 196) throw new Error("mainnet 196");
  const gasSeller = await client.getBalance({ address: sellerAcct.address });
  const gasBuyer = await client.getBalance({ address: buyerAcct.address });
  const tcomSeller = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "balanceOf",
    args: [sellerAcct.address],
  });
  const tcomBuyer = await client.readContract({
    address: token,
    abi: erc20,
    functionName: "balanceOf",
    args: [buyerAcct.address],
  });
  const out = {
    health: health.body,
    localHardhat: config.body.localHardhat,
    chainId: config.body.chainId,
    gasSeller: formatEther(gasSeller),
    gasBuyer: formatEther(gasBuyer),
    tcomSeller: tcomSeller.toString(),
    tcomBuyer: tcomBuyer.toString(),
    token: config.body.token,
    registry: config.body.registry,
  };
  console.log("preflight", JSON.stringify(out));
  if (gasSeller === 0n) throw new Error("seller has no test OKB");
  if (tcomSeller < 240000n) throw new Error(`seller tCOM ${tcomSeller} < 0.24`);
  return config.body;
}

async function injectFault() {
  const tokens = [
    process.env.COMMIT_PROVIDER_ADMIN_TOKEN,
    "change-me-on-host",
    "change-me-local-only",
  ].filter(Boolean);
  for (const tokenValue of tokens) {
    const r = await fetch(`${api}/api/admin/demo/fault`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-commit-admin": tokenValue },
      body: JSON.stringify({ delayMs: timeoutMs + 3000 }),
    });
    const body = await r.json();
    if (r.ok) return { ok: true, used: tokenValue === tokens[0] ? "env" : "default" };
    console.log("fault inject refused", r.status, body?.error?.code || body);
  }
  return { ok: false };
}

const config = await preflight();
const registry = config.registry;
if (!registry || !String(registry).startsWith("0x")) throw new Error("config.registry missing");
await approveSpend(sellerAcct, registry, 10_000_000n);
await approveSpend(buyerAcct, registry, 10_000_000n);
const sellerCookie = await login(sellerAcct);
const buyerCookie = await login(buyerAcct);
const startSec = Math.floor(Date.now() / 1000) + 22 * 60;
const endSec = startSec + 10 * 60;
const { body: quote } = await json("/api/capacity/quote", {
  method: "POST",
  body: JSON.stringify({
    quantity: 20,
    query: "okx x layer",
    window: { start: new Date(startSec * 1000).toISOString(), end: new Date(endSec * 1000).toISOString() },
  }),
});
const { body: reserved } = await json("/api/reservations", {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ quoteId: quote.quoteId }),
});
console.log("reserved", reserved.reservationId, "window", quote.window);
const { body: created } = await json(`/api/commitments/${reserved.reservationId}/onchain-create`, {
  method: "POST",
  headers: { cookie: sellerCookie },
});
console.log("created", created);

await waitUntil(quote.window.start, "window start");
await new Promise((r) => setTimeout(r, 2000));

const { body: t05 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "EIP-712", clientRequestId: `t05-${Date.now()}` }),
});
console.log("T05", t05.status, "remaining", t05.remaining);
await json("/api/admin/outbox");
await new Promise((r) => setTimeout(r, 1100));

const fault = await injectFault();
const { body: t06 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "RFC", clientRequestId: `t06-${Date.now()}` }),
});
console.log("T06", t06.status, "remaining", t06.remaining, "fault", fault);
await json("/api/admin/outbox");

const { body: listing } = await json(`/api/commitments/${reserved.reservationId}/prepare-list`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ buyer: buyerAcct.address }),
});
console.log("listed", listing.listingId || listing);
const { body: bought } = await json(`/api/listings/${listing.listingId}/buy`, {
  method: "POST",
  headers: { cookie: buyerCookie },
});
console.log("bought", bought.status || bought);

await new Promise((r) => setTimeout(r, 1100));
const { body: t21 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: buyerCookie },
  body: JSON.stringify({ query: "after-buy", clientRequestId: `t21-${Date.now()}` }),
});
console.log("T21", t21.status, "remaining", t21.remaining);
await json("/api/admin/outbox");

const { body: closed } = await json(`/api/commitments/${reserved.reservationId}/prepare-close`, {
  method: "POST",
  headers: { cookie: buyerCookie },
});
console.log("closed", closed.status || closed);

const { body: t30 } = await json(
  `/api/admin/t30?seller=${encodeURIComponent(sellerAcct.address)}&buyer=${encodeURIComponent(buyerAcct.address)}`,
);
const { body: view } = await json(`/api/commitments/${reserved.reservationId}`);
const { body: evidence } = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({
    reservationId: reserved.reservationId,
    summary: {
      recorded: true,
      play: "1952 HTTPS T05 + T06 + transfer + T21 + close/settle",
      quoteId: quote.quoteId,
      t05: { status: t05.status, remaining: t05.remaining, liveUsed: t05.liveUsed },
      t06: { status: t06.status, remaining: t06.remaining, liveUsed: t06.liveUsed, fault },
      t21: { status: t21.status, remaining: t21.remaining, liveUsed: t21.liveUsed },
      listing: { listingId: listing.listingId },
      bought: { status: bought.status },
      closed,
      t30,
      chain: view.chain,
      note: "X Layer testnet 1952. tCOM has no value.",
    },
  }),
});

const summary = {
  api,
  chainId: 1952,
  quoteId: quote.quoteId,
  reservationId: reserved.reservationId,
  commitmentId: created.commitmentId || created.chain?.commitmentId,
  createTx: created.txHash || created.chain?.txHash,
  remaining: view.remaining ?? t21.remaining,
  used: view.liveUsed ?? t21.liveUsed,
  status: view.status,
  evidenceRunId: evidence.runId,
  t30,
  configToken: config.token,
  configRegistry: config.registry,
};
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
fs.writeFileSync(path.join(root, ".local/smoke-1952.json"), JSON.stringify(summary, null, 2));
console.log("\n=== 1952 HTTPS smoke ===");
console.log(JSON.stringify(summary, null, 2));
if (t30 && t30.ok === false) process.exit(1);
