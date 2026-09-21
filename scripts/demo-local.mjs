#!/usr/bin/env node
/**
 * Local standard play: providers + API (+ web if installed), T05 then T06, record evidence.
 * Does not deploy to X Layer. Ctrl+C stops child processes.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = Number(process.env.COMMIT_API_PORT || 3080);
const api = `http://127.0.0.1:${apiPort}`;
const children = [];
const timeoutMs = Number(process.env.COMMIT_ATTEMPT_TIMEOUT_MS || 8000);
const SELLER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const BUYER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function runWait(cmd, args, extraEnv = {}, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("exit", (code) => {
      if (code) reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
      else resolve();
    });
  });
}

function run(cmd, args, extraEnv = {}, cwd = root) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  children.push(child);
  return child;
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {}
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shutdown();
    process.exit(0);
  });
}

async function wait(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`timeout waiting ${url}`);
}

function sessionCookie(res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = list.find((c) => c.startsWith("commit_session=")) || "";
  return raw.split(";")[0];
}

async function json(pathname, opts = {}) {
  const r = await fetch(`${api}${pathname}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`${pathname} ${r.status} ${JSON.stringify(body)}`);
  return body;
}

async function login(address) {
  const r = await fetch(`${api}/api/auth/dev-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const body = await r.json();
  const cookie = sessionCookie(r);
  if (!r.ok || !cookie) throw new Error(`dev-session failed ${JSON.stringify(body)}`);
  return cookie;
}

const pglite = path.join(root, ".local", `demo-${Date.now()}`);
fs.mkdirSync(pglite, { recursive: true });
const contractsDir = path.join(root, "packages/contracts");
const hardhat = path.join(contractsDir, "node_modules/.bin/hardhat");

async function waitRpc() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      const body = await r.json();
      if (body.result) return;
    } catch {}
    await new Promise((res) => setTimeout(res, 200));
  }
  throw new Error("hardhat node did not start on :8545");
}

run(hardhat, ["node", "--hostname", "127.0.0.1", "--port", "8545"], {}, contractsDir);
await waitRpc();
const chainFile = path.join(root, ".local/chain.json");
try {
  fs.unlinkSync(chainFile);
} catch {}
await runWait(hardhat, ["run", "scripts/deploy-local.cjs", "--network", "localhost"], {}, contractsDir);
if (!fs.existsSync(chainFile)) throw new Error("deploy did not write .local/chain.json");
const chain = JSON.parse(fs.readFileSync(chainFile, "utf8"));

const apiEnv = {
  COMMIT_API_PORT: String(apiPort),
  COMMIT_PGLITE_DIR: pglite,
  COMMIT_ALLOW_DEV_SESSION: "1",
  COMMIT_ALLOW_HARDHAT_KEYS: "1",
  COMMIT_ATTEMPT_TIMEOUT_MS: String(timeoutMs),
  COMMIT_RPC_URL: "http://127.0.0.1:8545",
  COMMIT_CHAIN_ID: "31337",
  COMMIT_TOKEN: chain.token,
  COMMIT_REGISTRY: chain.registry,
  COMMIT_PRIMARY: chain.primary,
  COMMIT_BACKUP: chain.backup,
  COMMIT_VERIFIER: chain.verifier,
};

run(process.execPath, [path.join(root, "apps/providers/src/launch.mjs")]);
run(
  process.execPath,
  [
    "--experimental-strip-types",
    "--import",
    path.join(root, "scripts/ts-esm.mjs"),
    path.join(root, "apps/api/src/server.ts"),
  ],
  apiEnv,
);

const nextBin = path.join(root, "apps/web/node_modules/.bin/next");
if (fs.existsSync(nextBin)) {
  run(
    nextBin,
    ["dev", "-p", "3000", "-H", "127.0.0.1"],
    { COMMIT_API_ORIGIN: api, HOSTNAME: "127.0.0.1" },
    path.join(root, "apps/web"),
  );
}

await wait("http://127.0.0.1:3042/health");
await wait("http://127.0.0.1:3043/health");
await wait(`${api}/api/health`);

const sellerCookie = await login(SELLER);
const buyerCookie = await login(BUYER);
const quote = await json("/api/capacity/quote", { method: "POST", body: "{}" });
const reserved = await json("/api/reservations", {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ quoteId: quote.quoteId }),
});
const created = await json(`/api/commitments/${reserved.reservationId}/onchain-create`, {
  method: "POST",
  headers: { cookie: sellerCookie },
});
await json("/api/admin/warp", {
  method: "POST",
  body: JSON.stringify({ seconds: 61 }),
});

const t05 = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "EIP-712", clientRequestId: "demo-t05" }),
});
await json("/api/admin/outbox");
await new Promise((r) => setTimeout(r, 1100));

await fetch(`${api}/api/admin/demo/fault`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-commit-admin": process.env.COMMIT_PROVIDER_ADMIN_TOKEN || "change-me-local-only",
  },
  body: JSON.stringify({ delayMs: timeoutMs + 3000 }),
});
const t06 = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ query: "RFC", clientRequestId: "demo-t06" }),
});
await json("/api/admin/outbox");

const listing = await json(`/api/commitments/${reserved.reservationId}/prepare-list`, {
  method: "POST",
  headers: { cookie: sellerCookie },
  body: JSON.stringify({ buyer: BUYER }),
});
const bought = await json(`/api/listings/${listing.listingId}/buy`, {
  method: "POST",
  headers: { cookie: buyerCookie },
});

await new Promise((r) => setTimeout(r, 1100));
const t21 = await json(`/api/commitments/${reserved.reservationId}/execute`, {
  method: "POST",
  headers: { cookie: buyerCookie },
  body: JSON.stringify({ query: "after-buy", clientRequestId: "demo-t21" }),
});
await json("/api/admin/outbox");

const closed = await json(`/api/commitments/${reserved.reservationId}/prepare-close`, {
  method: "POST",
  headers: { cookie: buyerCookie },
});
const t30 = await json(
  `/api/admin/t30?seller=${SELLER}&buyer=${BUYER}`,
);

const view = await json(`/api/commitments/${reserved.reservationId}`);
const evidence = await json("/api/evidence", {
  method: "POST",
  body: JSON.stringify({
    reservationId: reserved.reservationId,
    summary: {
      recorded: true,
      play: "local T05 + T06 + transfer + T21 + close/settle",
      t05: { status: t05.status, remaining: t05.remaining, liveUsed: t05.liveUsed, attempts: t05.attempts },
      t06: { status: t06.status, remaining: t06.remaining, liveUsed: t06.liveUsed, attempts: t06.attempts },
      t21: { status: t21.status, remaining: t21.remaining, liveUsed: t21.liveUsed, attempts: t21.attempts },
      listing,
      bought,
      closed,
      t30,
      chain: view.chain,
      note: "Local Hardhat 31337. Contest target remains X Layer 1952.",
    },
  }),
});

if (t30 && t30.ok === false) {
  throw new Error(`T30 sum ${t30.sum} != ${t30.expected}`);
}

console.log("\n=== Commit local demo ===");
console.log("API          ", api);
console.log("SearchNode   http://127.0.0.1:3042");
console.log("Nova         http://127.0.0.1:3043");
if (fs.existsSync(nextBin)) console.log("Web          http://127.0.0.1:3000");
console.log("Hardhat     ", chain.rpc, "chainId", chain.chainId);
console.log("tCOM        ", chain.token);
console.log("Registry    ", chain.registry);
console.log("On-chain id ", created.commitmentId, created.txHash || "");
console.log("Commitment  ", reserved.reservationId);
console.log("Remaining    ", view.remaining, "used", view.liveUsed, "owner", view.owner, "status", view.status);
console.log("T30         ", t30.sum, t30.ok ? "OK 0.59 tCOM" : "MISMATCH");
console.log("Evidence     ", `${api}/api/evidence/${evidence.runId}`);
if (fs.existsSync(nextBin)) {
  console.log("Open this    ", `http://127.0.0.1:3000/evidence/local`);
  console.log("Commitment UI", `http://127.0.0.1:3000/commitments/${reserved.reservationId}`);
}
console.log("Ctrl+C to stop.\n");

if (process.env.COMMIT_DEMO_ONCE === "1") {
  shutdown();
  process.exit(0);
}

await new Promise(() => {});
