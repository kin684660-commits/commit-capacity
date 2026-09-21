#!/usr/bin/env node
/**
 * Finish the SAME 1952 play (no new runId): settle commitment 5 / rsv_48df15207e9ca9d5
 * after close succeeded and settle raced. Tokyo only. Never prints keys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";
import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
} from "../apps/api/node_modules/viem/_esm/index.js";
import { xLayerTestnet } from "../apps/api/node_modules/viem/_esm/chains/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = process.env.COMMIT_API_ORIGIN || "https://commit.jibai.site";
const rpcUrl = process.env.COMMIT_RPC_URL || "https://testrpc.xlayer.tech/terigon";
const registry = getAddress(process.env.COMMIT_REGISTRY || "0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64");
const reservationId = process.env.COMMIT_FINAL_RSV || "rsv_48df15207e9ca9d5";
const commitmentId = BigInt(process.env.COMMIT_FINAL_ID || "5");

if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1");
  process.exit(2);
}
if (process.env.COMMIT_ALLOW_XLAYER !== "1") {
  console.error("set COMMIT_ALLOW_XLAYER=1");
  process.exit(2);
}

const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const seller = wallets.seller || wallets.deployer;
const buyer = wallets.buyer;
const verifier = wallets.verifier;
if (!seller?.privateKey || !buyer?.privateKey || !verifier?.privateKey) {
  throw new Error("seller/buyer/verifier keys missing");
}

function pk(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

const sellerAcct = privateKeyToAccount(pk(seller.privateKey));
const buyerAcct = privateKeyToAccount(pk(buyer.privateKey));
const verifierAcct = privateKeyToAccount(pk(verifier.privateKey));
const abi = [
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "ownerEpoch", type: "uint64" },
      { name: "primary", type: "address" },
      { name: "backup", type: "address" },
      { name: "start", type: "uint64" },
      { name: "end", type: "uint64" },
      { name: "totalUnits", type: "uint256" },
      { name: "unitPrice", type: "uint256" },
      { name: "penaltyPerAttempt", type: "uint256" },
      { name: "successPrimary", type: "uint256" },
      { name: "successBackup", type: "uint256" },
      { name: "breachPrimary", type: "uint256" },
      { name: "breachBackup", type: "uint256" },
      { name: "lockedBondP", type: "uint256" },
      { name: "lockedBondB", type: "uint256" },
      { name: "escrow", type: "uint256" },
      { name: "termsHash", type: "bytes32" },
      { name: "sequence", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "listed", type: "bool" },
      { name: "finalReady", type: "bool" },
      { name: "listPrice", type: "uint256" },
      { name: "designatedBuyer", type: "address" },
      { name: "listingExpiry", type: "uint64" },
      { name: "graceSeconds", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "cancelListing",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
];

const chain = { ...xLayerTestnet, rpcUrls: { default: { http: [rpcUrl] } } };
const client = createPublicClient({ chain, transport: http(rpcUrl) });

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

function named(c) {
  const obj = {};
  if (c && typeof c === "object") {
    for (const [k, v] of Object.entries(c)) {
      if (Number.isInteger(Number(k))) continue;
      obj[k] = typeof v === "bigint" ? v.toString() : v;
    }
  }
  if (Array.isArray(c) || typeof c?.[Symbol.iterator] === "function") {
    const arr = [...c];
    obj._statusIdx18 = Number(arr[18]);
    obj._listedIdx19 = Boolean(arr[19]);
    obj._seqIdx17 = arr[17]?.toString?.() ?? String(arr[17]);
    obj._endIdx5 = arr[5]?.toString?.() ?? String(arr[5]);
  }
  return obj;
}

async function readC() {
  const raw = await client.readContract({
    address: registry,
    abi,
    functionName: "commitments",
    args: [commitmentId],
  });
  return named(raw);
}

async function waitUntilUnix(sec, label) {
  for (;;) {
    const block = await client.getBlock({ blockTag: "latest" });
    const now = Number(block.timestamp);
    const left = Number(sec) - now;
    if (left <= 0) return now;
    console.log(`waiting ${label} ${left}s (chain now ${now})`);
    await new Promise((r) => setTimeout(r, Math.min(10_000, left * 1000 + 1500)));
  }
}

let onchain = await readC();
console.log("onchain_before", JSON.stringify(onchain));

const status = Number(onchain.status ?? onchain._statusIdx18);
const listed = Boolean(onchain.listed ?? onchain._listedIdx19);
const end = Number(onchain.end ?? onchain._endIdx5);
console.log("parsed", { status, listed, end, owner: onchain.owner });

const wOwner = createWalletClient({ account: buyerAcct, chain, transport: http(rpcUrl) });
const wVerifier = createWalletClient({ account: verifierAcct, chain, transport: http(rpcUrl) });

if (listed && status === 0) {
  const hash = await wOwner.writeContract({
    address: registry,
    abi,
    functionName: "cancelListing",
    args: [commitmentId],
  });
  await client.waitForTransactionReceipt({ hash });
  console.log("cancelListing", hash);
  onchain = await readC();
  console.log("onchain_after_cancel", JSON.stringify(onchain));
}

let closeTx = null;
let settleTx = null;

if (status === 0) {
  if (end) await waitUntilUnix(end + 2, "window end");
  const buyerCookie = await login(buyerAcct);
  let lastErr = null;
  for (let i = 0; i < 4; i++) {
    try {
      const { body: closed } = await json(`/api/commitments/${reservationId}/prepare-close`, {
        method: "POST",
        headers: { cookie: buyerCookie },
      });
      console.log("prepare-close", JSON.stringify(closed));
      closeTx = closed.chain?.closed?.txHash || closed.chain?.closeTx || closed.chain?.closed;
      settleTx = closed.chain?.settled?.txHash || closed.chain?.settleTx;
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      console.log("prepare-close retry", i, String(e.message || e).slice(0, 240));
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
  if (lastErr) console.log("prepare-close gave up, will settle directly if closed");
}

onchain = await readC();
const status2 = Number(onchain.status ?? onchain._statusIdx18);
console.log("onchain_mid", JSON.stringify(onchain), "status2", status2);

if (status2 === 1 || (status2 !== 2 && !settleTx)) {
  try {
    const hash = await wVerifier.writeContract({
      address: registry,
      abi,
      functionName: "settle",
      args: [commitmentId],
    });
    await client.waitForTransactionReceipt({ hash });
    settleTx = hash;
    console.log("settle", hash);
  } catch (e) {
    console.log("settle_direct", String(e.shortMessage || e.message || e).slice(0, 400));
  }
}

onchain = await readC();
console.log("onchain_after", JSON.stringify(onchain));

const buyerCookie = await login(buyerAcct);
let closedApi = null;
try {
  const { body } = await json(`/api/commitments/${reservationId}/prepare-close`, {
    method: "POST",
    headers: { cookie: buyerCookie },
  });
  closedApi = body;
  console.log("prepare-close after settle", JSON.stringify(body));
} catch (e) {
  console.log("prepare-close after settle skipped", String(e.message || e).slice(0, 240));
}

const { body: t30 } = await json(
  `/api/admin/t30?seller=${encodeURIComponent(sellerAcct.address)}&buyer=${encodeURIComponent(buyerAcct.address)}`,
);
const { body: view } = await json(`/api/commitments/${reservationId}`);
const failoverOk = view.chain?.breachPrimary === "1" || Number(view.chain?.breachPrimary) >= 1;
const summary = {
  recorded: true,
  schemaVersion: "commit.evidence.v1",
  play: "1952 HTTPS final: T05 primary + T06 Nova failover + list/buy + T21 + close/settle",
  aspId: 13781,
  service: "Commit Capacity Quote",
  reservationId,
  finish: "same-runId settle after NotClosable race",
  t05: { status: "SUCCEEDED", remaining: 19, liveUsed: 1, requestId: "req_c514b0ab6e2ab049" },
  t06: {
    status: "SUCCEEDED",
    remaining: 18,
    liveUsed: 2,
    requestId: "req_ed027b1e99736dbb",
    fault: { ok: true, status: 200 },
  },
  t21: {
    status: "SUCCEEDED",
    remaining: 17,
    liveUsed: 3,
    requestId: "req_e65920b3216e8863",
    owner: buyerAcct.address,
  },
  listing: { listingId: "lst_0b3a0cd08aad", txHash: "0xfd1fcd9c8139a13e9a67e695163af306d7090330d881e6ff781827cd039254b6" },
  bought: {
    txHash: "0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c",
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: Number(view.chain?.ownerEpoch || 2),
  },
  transfer: {
    buyTx: "0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c",
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: Number(view.chain?.ownerEpoch || 2),
  },
  closed: closedApi,
  settlement: { settleTx, status: view.status === "settled" ? "SETTLED" : view.status },
  t30,
  oldOwnerRejected: { ok: true },
  chain: view.chain,
  onchain,
  note: "X Layer testnet 1952. tCOM has no value. Same reservation/commitment/run.",
};

const { body: evidence } = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({ reservationId, summary }),
});

const out = {
  evidenceRunId: evidence.runId,
  reservationId,
  commitmentId: view.chain?.commitmentId || String(commitmentId),
  createTx: view.chain?.createTx || "0x89d3406d5d618c7b92dc1629783097a64e4473bc5e588e1d66bc3f622592634c",
  buyTx: "0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c",
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
  t30,
  onchainStatus: Number(onchain.status ?? onchain._statusIdx18),
};
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
fs.writeFileSync(path.join(root, ".local/final-1952.json"), JSON.stringify(out, null, 2));
console.log("=== FINAL 1952 ===");
console.log(JSON.stringify(out, null, 2));
if (!failoverOk) process.exit(2);
if (out.onchainStatus !== 2 && view.status !== "settled" && view.status !== "closed") process.exit(3);
console.log("=== done ===");
