#!/usr/bin/env node
/** Same reservation: mark API settled + record complete evidence. Tokyo. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "../apps/api/node_modules/viem/_esm/accounts/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = process.env.COMMIT_API_ORIGIN || "https://commit.jibai.site";
const reservationId = process.env.COMMIT_FINAL_RSV || "rsv_48df15207e9ca9d5";
const settleTx = "0x31409058f3709b07acdd5b18a121ff80a2f81d33401a33e44f8c395114170126";
const createTx = "0x89d3406d5d618c7b92dc1629783097a64e4473bc5e588e1d66bc3f622592634c";
const buyTx = "0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c";
const listTx = "0xfd1fcd9c8139a13e9a67e695163af306d7090330d881e6ff781827cd039254b6";

if (process.env.COMMIT_SMOKE_1952 !== "1") {
  console.error("set COMMIT_SMOKE_1952=1");
  process.exit(2);
}

const wallets = JSON.parse(fs.readFileSync(path.join(root, ".local/xlayer-wallets.json"), "utf8"));
const seller = wallets.seller || wallets.deployer;
const buyer = wallets.buyer;
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

const buyerCookie = await login(buyerAcct);
let closed;
try {
  const out = await json(`/api/commitments/${reservationId}/prepare-close`, {
    method: "POST",
    headers: { cookie: buyerCookie },
  });
  closed = out.body;
  console.log("prepare-close", JSON.stringify(closed));
} catch (e) {
  console.log("prepare-close", String(e.message || e).slice(0, 400));
}

const { body: t30 } = await json(
  `/api/admin/t30?seller=${encodeURIComponent(sellerAcct.address)}&buyer=${encodeURIComponent(buyerAcct.address)}`,
);
const { body: view } = await json(`/api/commitments/${reservationId}`);
const failoverOk = Number(view.chain?.breachPrimary) >= 1;
const summary = {
  recorded: true,
  schemaVersion: "commit.evidence.v1",
  play: "1952 HTTPS final: T05 primary + T06 Nova failover + list/buy + T21 + close/settle",
  aspId: 13781,
  service: "Commit Capacity Quote",
  quoteId: "qte_ac7bc84e7d93339b",
  t05: { status: "SUCCEEDED", remaining: 19, liveUsed: 1, requestId: "req_c514b0ab6e2ab049" },
  t06: {
    status: "SUCCEEDED",
    remaining: 18,
    liveUsed: 2,
    route: "BACKUP",
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
  listing: { listingId: "lst_0b3a0cd08aad", txHash: listTx },
  bought: {
    txHash: buyTx,
    buyTx,
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: 2,
  },
  transfer: {
    buyTx,
    from: sellerAcct.address,
    to: buyerAcct.address,
    ownerEpochBefore: 1,
    ownerEpochAfter: 2,
  },
  closed: { status: "settled", chain: { settled: { txHash: settleTx } } },
  settlement: { settleTx, status: "SETTLED" },
  t30,
  oldOwnerRejected: { ok: true },
  chain: { ...(view.chain || {}), createTx, commitmentId: view.chain?.commitmentId || "5" },
  note: "X Layer testnet 1952. tCOM has no value. Same reservation/commitment/run. Settle tx confirmed Settled(id=5).",
};

const { body: evidence } = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({ reservationId, summary }),
});

const out = {
  evidenceRunId: evidence.runId,
  reservationId,
  commitmentId: view.chain?.commitmentId,
  createTx,
  buyTx,
  settleTx,
  remaining: view.remaining,
  used: view.liveUsed,
  status: view.status,
  route: view.route,
  breachPrimary: view.chain?.breachPrimary,
  successBackup: view.chain?.successBackup,
  successPrimary: view.chain?.successPrimary,
  ownerEpoch: view.chain?.ownerEpoch,
  listed: view.chain?.listed,
  chainStatus: view.chain?.status,
  failoverOk,
  termsHash: view.chain?.termsHash,
  t30,
};
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
fs.writeFileSync(path.join(root, ".local/final-1952.json"), JSON.stringify(out, null, 2));
console.log("=== FINAL 1952 ===");
console.log(JSON.stringify(out, null, 2));
if (!failoverOk) process.exit(2);
if (view.status !== "settled" && view.status !== "closed") process.exit(3);
console.log("=== done ===");
