#!/usr/bin/env node
/**
 * Same-runId 1952 final play: quote → create → T05 (primary ok) → localhost
 * inject → T06 (Nova) → list/buy → T21 new owner → close/settle → evidence.
 *
 * Run ON TOKYO only (fault inject is localhost). COMMIT_SMOKE_1952=1.
 * Never prints admin token. Never enables DEV_SESSION. Never mainnet 196.
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
const leadSec = Math.max(180, Number(process.env.COMMIT_FINAL_LEAD || 900));
const quantity = Number(process.env.COMMIT_FINAL_QTY || 20);

if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1");
  process.exit(2);
}

const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const seller = wallets.seller || wallets.deployer;
const buyer = wallets.buyer;
if (!seller?.privateKey || !buyer?.privateKey) throw new Error("seller/buyer keys missing");

function pk(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

const sellerAcct = privateKeyToAccount(pk(seller.privateKey));
const buyerAcct = privateKeyToAccount(pk(buyer.privateKey));

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
  if (current >= amount) {
    console.log("allowance ok", account.address);
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

async function drain(reservationId) {
  for (let i = 0; i < 8; i++) {
    await json("/api/admin/outbox");
    const { body: view } = await json(`/api/commitments/${reservationId}`);
    const inflight = (view.requests || []).filter((r) =>
      /RUNNING|PRIMARY_RUNNING|BACKUP_RUNNING/i.test(String(r.status)),
    );
    if (inflight.length === 0) return view;
    console.log("drain inflight", inflight.length);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return (await json(`/api/commitments/${reservationId}`)).body;
}

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
console.log(
  "preflight",
  JSON.stringify({
    chainId: health.body.chainId,
    localHardhat: config.body.localHardhat,
    gasSeller: formatEther(gasSeller),
    gasBuyer: formatEther(gasBuyer),
    tcomSeller: tcomSeller.toString(),
    tcomBuyer: tcomBuyer.toString(),
    quantity,
    leadSec,
  }),
);
if (gasSeller === 0n || gasBuyer === 0n) throw new Error("missing test OKB");
if (tcomSeller < 240_000n) throw new Error(`seller tCOM ${tcomSeller} < 0.24`);

const registry = config.body.registry;
if (!registry || !String(registry).startsWith("0x")) throw new Error("config.registry missing");
await approveSpend(sellerAcct, registry, 10_000_000n);
await approveSpend(buyerAcct, registry, 10_000_000n);
const sellerCookie = await login(sellerAcct);
const buyerCookie = await login(buyerAcct);

const startSec = Math.floor(Date.now() / 1000) + leadSec;
const endSec = startSec + 10 * 60;
const { body: quote } = await json("/api/capacity/quote", {
  method: "POST",
  body: JSON.stringify({
    quantity,
    serviceClass: "search",
    query: "okx x layer final",
    window: { start: new Date(startSec * 1000).toISOString(), end: new Date(endSec * 1000).toISOString() },
  }),
});
console.log("quote", quote.quoteId, "termsHash", quote.termsHash || quote.terms?.hash);

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
console.log("created", {
  commitmentId: created.commitmentId || created.chain?.commitmentId,
  txHash: created.txHash || created.chain?.txHash || created.chain?.createTx,
});

await waitUntil(quote.window.start, "window start");
await new Promise((r) => setTimeout(r, 2500));

const { body: t05 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "EIP-712", clientRequestId: `t05-${Date.now()}` }),
});
console.log("T05", { status: t05.status, remaining: t05.remaining, liveUsed: t05.liveUsed, route: t05.route, requestId: t05.requestId || t05.id });
await json("/api/admin/outbox");
await new Promise((r) => setTimeout(r, 1200));

const admin = process.env.COMMIT_T06_ADMIN || "";
const injectUrl = process.env.COMMIT_INJECT_URL || `${api}/api/admin/demo/fault`;
const injectRes = await fetch(injectUrl, {
  method: "POST",
  headers: { "content-type": "application/json", "x-commit-admin": admin },
  body: JSON.stringify({ delayMs: timeoutMs + 3000 }),
});
const injectBody = await injectRes.json().catch(() => ({}));
const fault = { ok: injectRes.ok, status: injectRes.status, pendingDelayMs: injectBody.pendingDelayMs };
console.log("inject", fault.ok ? "ok" : "FAIL", injectRes.status, injectBody.note || injectBody.error?.code || "");
if (!injectRes.ok) throw new Error("fault inject failed — abort before T06 so we do not record a fake failover");

const { body: t06 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "RFC failover", clientRequestId: `t06-${Date.now()}` }),
});
console.log("T06", {
  status: t06.status,
  remaining: t06.remaining,
  liveUsed: t06.liveUsed,
  route: t06.route,
  requestId: t06.requestId || t06.id,
});
await json("/api/admin/outbox");
await drain(reserved.reservationId);

if (t06.route !== "BACKUP" && Number(t06.liveUsed) !== Number(t05.liveUsed) + 1) {
  console.warn("WARN: T06 may not have failed over; continuing to record honest evidence");
}

const { body: listing } = await json(`/api/commitments/${reserved.reservationId}/prepare-list`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ buyer: buyerAcct.address }),
});
console.log("listed", listing.listingId, listing.chain?.txHash || listing.chain);

const { body: bought } = await json(`/api/listings/${listing.listingId}/buy`, {
  method: "POST",
  headers: { cookie: buyerCookie },
});
console.log("bought", bought.status || bought, bought.chain?.txHash || bought.chain);

let sellerRejected = null;
try {
  await json(`/api/commitments/${reserved.reservationId}/execute`, {
    method: "POST",
    headers: { cookie: sellerCookie },
    body: JSON.stringify({ query: "old-owner", clientRequestId: `old-${Date.now()}` }),
  });
  sellerRejected = { ok: false, note: "old owner execute unexpectedly succeeded" };
} catch (e) {
  sellerRejected = { ok: true, error: String(e.message || e).slice(0, 240) };
}
console.log("oldOwnerRejected", sellerRejected.ok);

await new Promise((r) => setTimeout(r, 1200));
const { body: t21 } = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: buyerCookie },
  body: JSON.stringify({ query: "after-buy", clientRequestId: `t21-${Date.now()}` }),
});
console.log("T21", { status: t21.status, remaining: t21.remaining, liveUsed: t21.liveUsed, requestId: t21.requestId || t21.id });
await json("/api/admin/outbox");
await drain(reserved.reservationId);

await waitUntil(quote.window.end, "window end");
await new Promise((r) => setTimeout(r, 2500));

let closed;
let lastCloseErr = null;
for (let i = 0; i < 4; i++) {
  try {
    closed = await json(`/api/commitments/${reserved.reservationId}/prepare-close`, {
      method: "POST",
      headers: { cookie: buyerCookie },
    });
    lastCloseErr = null;
    break;
  } catch (e) {
    lastCloseErr = e;
    console.log("prepare-close retry", i, String(e.message || e).slice(0, 240));
    await new Promise((r) => setTimeout(r, 8000));
  }
}
if (lastCloseErr) throw lastCloseErr;
closed = closed.body;
console.log("closed", closed.status, closed.chain);

const { body: t30 } = await json(
  `/api/admin/t30?seller=${encodeURIComponent(sellerAcct.address)}&buyer=${encodeURIComponent(buyerAcct.address)}`,
);
const { body: view } = await json(`/api/commitments/${reserved.reservationId}`);

const createTx = created.txHash || created.chain?.txHash || created.chain?.createTx || view.chain?.createTx;
const buyTx = bought.chain?.txHash || bought.chain?.buyTx || bought.txHash;
const settleTx = closed.chain?.settled?.txHash || closed.chain?.settleTx;
const closeTx = closed.chain?.closed?.txHash || closed.chain?.closeTx;

const failoverOk = view.chain?.breachPrimary === "1" || Number(view.chain?.breachPrimary) >= 1;
const summary = {
  recorded: true,
  schemaVersion: "commit.evidence.v1",
  play: "1952 HTTPS final: T05 primary + T06 Nova failover + list/buy + T21 + close/settle",
  quoteId: quote.quoteId,
  aspId: 13781,
  service: "Commit Capacity Quote",
  t05: {
    status: t05.status,
    remaining: t05.remaining,
    liveUsed: t05.liveUsed,
    route: t05.route,
    requestId: t05.requestId || t05.id,
  },
  t06: {
    status: t06.status,
    remaining: t06.remaining,
    liveUsed: t06.liveUsed,
    route: t06.route,
    requestId: t06.requestId || t06.id,
    fault,
  },
  t21: {
    status: t21.status,
    remaining: t21.remaining,
    liveUsed: t21.liveUsed,
    requestId: t21.requestId || t21.id,
    owner: buyerAcct.address,
  },
  listing: { listingId: listing.listingId, txHash: listing.chain?.txHash },
  bought: {
    txHash: buyTx,
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: Number(view.chain?.ownerEpoch || view.ownerEpoch || 2),
    status: bought.status,
  },
  transfer: {
    buyTx,
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: Number(view.chain?.ownerEpoch || view.ownerEpoch || 2),
  },
  closed: { ...closed, status: view.status || closed.status },
  settlement: { settleTx, status: view.status === "settled" ? "SETTLED" : view.status },
  t30,
  oldOwnerRejected: sellerRejected,
  chain: view.chain,
  note: "X Layer testnet 1952. tCOM has no value. Same reservation/commitment/run.",
};

const { body: evidence } = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({ reservationId: reserved.reservationId, summary }),
});

const out = {
  evidenceRunId: evidence.runId,
  reservationId: reserved.reservationId,
  commitmentId: view.chain?.commitmentId,
  createTx,
  buyTx,
  closeTx,
  settleTx,
  remaining: view.remaining,
  used: view.liveUsed,
  status: view.status,
  route: view.route,
  breachPrimary: view.chain?.breachPrimary,
  successBackup: view.chain?.successBackup,
  successPrimary: view.chain?.successPrimary,
  ownerEpoch: view.chain?.ownerEpoch,
  failoverOk,
  termsHash: view.chain?.termsHash,
  quoteTermsHash: quote.termsHash || quote.terms?.hash,
  t30,
};
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
fs.writeFileSync(path.join(root, ".local/final-1952.json"), JSON.stringify(out, null, 2));
console.log("=== FINAL 1952 ===");
console.log(JSON.stringify(out, null, 2));
if (!failoverOk) process.exit(2);
if (view.status !== "settled" && view.status !== "closed") process.exit(3);
console.log("=== done ===");
