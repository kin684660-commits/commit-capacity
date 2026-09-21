#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = path.join(root, "apps/providers/src/server.mjs");
const ADMIN = "change-me-local-only";

function start(role, port) {
  return spawn(process.execPath, [server, role], {
    env: { ...process.env, SEARCHNODE_PORT: "3042", NOVA_PORT: "3043", COMMIT_PROVIDER_ADMIN_TOKEN: ADMIN },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitHealth(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`no health ${url}`);
}

async function post(url, body, headers = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}

const p = start("search-node", 3042);
const n = start("nova", 3043);

process.on("exit", () => {
  p.kill("SIGTERM");
  n.kill("SIGTERM");
});

await waitHealth("http://127.0.0.1:3042/health");
await waitHealth("http://127.0.0.1:3043/health");

await test("corpus search returns schema v1 hits", async () => {
  const { json } = await post("http://127.0.0.1:3042/execute", { attemptId: "a1", query: "EIP-712" });
  assert.equal(json.status, "SUCCEEDED");
  assert.equal(json.response.schemaVersion, "search.v1");
  assert.ok(json.response.results.length >= 1);
  assert.equal(json.response.results[0].recordId, "eip-712");
});

await test("same attemptId is idempotent", async () => {
  const first = await post("http://127.0.0.1:3043/execute", { attemptId: "same", query: "SIWE" });
  const second = await post("http://127.0.0.1:3043/execute", { attemptId: "same", query: "DIFFERENT" });
  assert.deepEqual(first.json.response, second.json.response);
});

await test("fault delay is per-process and consumed once", async () => {
  const deny = await post("http://127.0.0.1:3042/admin/fault", { delayMs: 250 }, {});
  assert.equal(deny.status, 403);

  await post("http://127.0.0.1:3042/admin/fault", { delayMs: 250 }, { "x-commit-admin": ADMIN });
  const t0 = Date.now();
  await post("http://127.0.0.1:3042/execute", { attemptId: "slow", query: "RFC" });
  const primaryMs = Date.now() - t0;
  assert.ok(primaryMs >= 200, `primary delay ${primaryMs}`);

  const t1 = Date.now();
  await post("http://127.0.0.1:3043/execute", { attemptId: "fast", query: "RFC" });
  const backupMs = Date.now() - t1;
  assert.ok(backupMs < 200, `nova should not share delay, took ${backupMs}`);

  const t2 = Date.now();
  await post("http://127.0.0.1:3042/execute", { attemptId: "after", query: "RFC" });
  assert.ok(Date.now() - t2 < 200, "delay is one-shot");
});

p.kill("SIGTERM");
n.kill("SIGTERM");
