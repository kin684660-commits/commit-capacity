#!/usr/bin/env node
/**
 * Wrap a read-only HTTP JSON endpoint as Commit search.v1 POST /execute.
 * Occupancy in Commit is admission for a window — not a lock on upstream machines.
 *
 *   UPSTREAM_URL=https://example.invalid/search PORT=3042 PROVIDER_ID=adapter \
 *     node packages/provider-sdk/examples/readonly-http-adapter.mjs
 */
import http from "node:http";

const UPSTREAM = process.env.UPSTREAM_URL || "https://example.invalid/search";
const PORT = Number(process.env.PORT || 3042);
const PROVIDER_ID = process.env.PROVIDER_ID || "adapter";

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" });
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/execute") {
    res.writeHead(404).end();
    return;
  }
  const raw = await new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
  });
  let body = {};
  try {
    body = JSON.parse(String(raw || "{}"));
  } catch {
    body = {};
  }
  const attemptId = String(body.attemptId || "");
  const query = String(body.query || "");
  if (!attemptId) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: "INVALID_INPUT", message: "attemptId required" } }));
    return;
  }
  let results = [];
  try {
    const upstream = await fetch(`${UPSTREAM}${UPSTREAM.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`);
    const data = await upstream.json();
    const rows = Array.isArray(data) ? data : data.results || [];
    results = rows.slice(0, 8).map((row, i) => ({
      title: String(row.title || row.name || "result"),
      sourceUrl: String(row.url || row.sourceUrl || ""),
      snippet: String(row.snippet || row.text || "").slice(0, 280),
      recordId: String(row.id || `row-${i}`),
    })).filter((hit) => /^https?:\/\//.test(hit.sourceUrl));
  } catch {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: "PROVIDER_FAILED", message: "upstream", retryable: true } }));
    return;
  }
  const payload = { schemaVersion: "search.v1", query, results, providerId: PROVIDER_ID, requestId: attemptId };
  res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify({ status: "SUCCEEDED", providerId: PROVIDER_ID, response: payload }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`adapter ${PROVIDER_ID} 127.0.0.1:${PORT} -> ${UPSTREAM}`);
});
