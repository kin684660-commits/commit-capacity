#!/usr/bin/env node
/**
 * Controlled Search v1 provider. One process = one provider.
 * Usage: node src/server.mjs search-node|nova
 * Fault injection affects only this process (Nova does not share SearchNode's switch).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROLE = process.argv[2] === "nova" ? "nova" : "search-node";
const PROVIDER_ID = ROLE === "nova" ? "nova" : "search-node";
const PORT = Number(process.env[ROLE === "nova" ? "NOVA_PORT" : "SEARCHNODE_PORT"] || (ROLE === "nova" ? 3043 : 3042));
const ADMIN = process.env.COMMIT_PROVIDER_ADMIN_TOKEN || "change-me-local-only";

const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, "../corpus.json"), "utf8"));
/** @type {Map<string, object>} */
const attempts = new Map();
let pendingDelayMs = 0;
let pendingInvalidSchema = false;
let pendingHttp5xx = false;

function validateSearchV1(body) {
  if (!body || body.schemaVersion !== "search.v1") return { ok: false, error: "schemaVersion" };
  if (typeof body.query !== "string") return { ok: false, error: "query" };
  if (!Array.isArray(body.results) || body.results.length > 8) return { ok: false, error: "results" };
  return { ok: true };
}

function search(query) {
  const q = String(query || "").toLowerCase();
  const hits = corpus.filter(
    (row) =>
      !q ||
      row.title.toLowerCase().includes(q) ||
      row.snippet.toLowerCase().includes(q) ||
      row.recordId.toLowerCase().includes(q),
  );
  return hits.slice(0, 8);
}

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(obj));
}

function read(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function authorized(req) {
  const hdr = req.headers["x-commit-admin"] || "";
  return hdr === ADMIN;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, x-commit-admin");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const bodyRaw = await read(req);
  let body = {};
  if (bodyRaw) {
    try {
      body = JSON.parse(bodyRaw);
    } catch {
      json(res, 400, { error: { code: "INVALID_INPUT", message: "invalid json", retryable: false } });
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true, providerId: PROVIDER_ID, pendingDelayMs });
    return;
  }

  if (req.method === "POST" && url.pathname === "/admin/fault") {
    if (!authorized(req)) {
      json(res, 403, { error: { code: "NOT_OWNER", message: "admin token required", retryable: false } });
      return;
    }
    pendingDelayMs = Number(body.delayMs || 0);
    pendingInvalidSchema = Boolean(body.invalidSchema);
    pendingHttp5xx = Boolean(body.http5xx);
    if (!pendingDelayMs && !pendingInvalidSchema && !pendingHttp5xx) pendingDelayMs = 11000;
    json(res, 200, { ok: true, pendingDelayMs, pendingInvalidSchema, pendingHttp5xx, note: "next execute only" });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/attempts/")) {
    const id = url.pathname.slice("/attempts/".length);
    const found = attempts.get(id);
    if (!found) {
      json(res, 404, { error: { code: "INVALID_INPUT", message: "unknown attempt", retryable: false } });
      return;
    }
    json(res, 200, found);
    return;
  }

  if (req.method === "POST" && url.pathname === "/execute") {
    const attemptId = String(body.attemptId || "");
    const query = String(body.query || "");
    if (!attemptId) {
      json(res, 400, { error: { code: "INVALID_INPUT", message: "attemptId required", retryable: false } });
      return;
    }
    if (attempts.has(attemptId)) {
      json(res, 200, attempts.get(attemptId));
      return;
    }
    const delay = pendingDelayMs;
    const badSchema = pendingInvalidSchema;
    const http5xx = pendingHttp5xx;
    pendingDelayMs = 0;
    pendingInvalidSchema = false;
    pendingHttp5xx = false;
    if (delay > 0) await sleep(delay);
    if (http5xx) {
      json(res, 503, { error: { code: "PROVIDER_FAILED", message: "injected 5xx", retryable: true } });
      return;
    }
    const payload = badSchema
      ? { schemaVersion: "search.v0", query: 1, results: "nope", providerId: PROVIDER_ID, requestId: attemptId }
      : {
          schemaVersion: "search.v1",
          query,
          results: search(query),
          providerId: PROVIDER_ID,
          requestId: attemptId,
        };
    if (!badSchema) {
      const check = validateSearchV1(payload);
      if (!check.ok) {
        json(res, 500, { error: { code: "PROVIDER_FAILED", message: check.error, retryable: false } });
        return;
      }
    }
    const stored = {
      status: badSchema ? "INVALID_SCHEMA" : "SUCCEEDED",
      providerId: PROVIDER_ID,
      delayAppliedMs: delay,
      response: payload,
    };
    attempts.set(attemptId, stored);
    json(res, 200, stored);
    return;
  }

  json(res, 404, { error: { code: "INVALID_INPUT", message: "not found", retryable: false } });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`${PROVIDER_ID} listening 127.0.0.1:${PORT}`);
});
