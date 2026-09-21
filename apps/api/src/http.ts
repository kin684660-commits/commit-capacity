import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createQuote, createReservation, labCapacityRace } from "./occupancy.js";
import { issueDevSession, issueNonce, sessionWallet, verifyLogin } from "./auth.js";
import type { Db } from "./db.js";
import type { ChainClock } from "./clock.js";
import { ApiError } from "./errors.js";
import { DEMO } from "@commit/domain";
import {
  executeRequest,
  getEvidence,
  getLogical,
  getReservationView,
  injectPrimaryFault,
  latestEvidence,
  recordEvidence,
  recoverInflight,
} from "./router.js";
import { buyListing, getListing, markSettled, prepareClose, prepareList } from "./listing.js";
import { pendingOutbox, processOutbox } from "./outbox.js";
import {
  buyOnchain,
  chainEnabled,
  chainSender,
  closeOnchain,
  createOnchain,
  listOnchain,
  registryBlock,
  settleOnchain,
  t30Snapshot,
  warp,
} from "./chain.js";

const quoteHits = new Map<string, { n: number; reset: number }>();

function rateLimit(ip: string) {
  const now = Date.now();
  const cur = quoteHits.get(ip);
  if (!cur || cur.reset < now) {
    quoteHits.set(ip, { n: 1, reset: now + 60_000 });
    return;
  }
  cur.n += 1;
  if (cur.n > 60) throw new ApiError("RATE_LIMITED", "too many quotes", 429, true);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => {
      d += c;
      if (d.length > 1_000_000) reject(new ApiError("INVALID_INPUT", "body too large"));
    });
    req.on("end", () => resolve(d));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": webOrigin(),
    "access-control-allow-credentials": "true",
    ...headers,
  });
  res.end(payload);
}

function cookieSession(req: IncomingMessage): string | undefined {
  const raw = req.headers.cookie || "";
  const m = /(?:^|; )commit_session=([^;]+)/.exec(raw);
  return m?.[1];
}

function parseJson(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") throw new Error("not object");
    return v as Record<string, unknown>;
  } catch {
    throw new ApiError("INVALID_INPUT", "invalid json");
  }
}

function webOrigin() {
  return process.env.COMMIT_WEB_ORIGIN || "http://localhost:3000";
}

function sessionCookie(id: string) {
  const secure = process.env.COMMIT_COOKIE_SECURE === "1" ? "; Secure" : "";
  return `commit_session=${id}; HttpOnly; SameSite=Lax; Path=/${secure}`;
}

export function createHandler(db: Db, clock: ChainClock) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const traceId = randomBytes(6).toString("hex");
    res.setHeader("access-control-allow-origin", webOrigin());
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader("access-control-allow-headers", "content-type, cookie, x-commit-admin");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        const ping = async (base: string) => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1500);
          try {
            const r = await fetch(`${base.replace(/\/$/, "")}/health`, { signal: ctrl.signal });
            return r.ok;
          } catch {
            return false;
          } finally {
            clearTimeout(timer);
          }
        };
        const primaryUrl = process.env.SEARCHNODE_URL || "http://127.0.0.1:3042";
        const backupUrl = process.env.NOVA_URL || "http://127.0.0.1:3043";
        const [primaryOk, backupOk, block] = await Promise.all([
          ping(primaryUrl),
          ping(backupUrl),
          registryBlock().catch(() => null),
        ]);
        send(res, 200, {
          ok: true,
          service: "commit-api",
          chainId: Number(process.env.COMMIT_CHAIN_ID || DEMO.chainId),
          providers: {
            primary: { name: DEMO.primaryName, ok: primaryOk },
            backup: { name: DEMO.backupName, ok: backupOk },
          },
          registryBlock: block,
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/ready") {
        await db.query("SELECT 1");
        const outbox = await pendingOutbox(db);
        send(res, 200, { ok: true, db: true, outboxPending: outbox.length });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/config") {
        send(res, 200, {
          chainId: Number(process.env.COMMIT_CHAIN_ID || DEMO.chainId),
          contestChainId: 1952,
          assetDecimals: 6,
          token: process.env.COMMIT_TOKEN || null,
          registry: process.env.COMMIT_REGISTRY || null,
          rpc: process.env.COMMIT_RPC_URL || null,
          providers: { primary: DEMO.primaryName, backup: DEMO.backupName },
          quoteTtlSeconds: DEMO.quoteTtlSeconds,
          reservationTtlSeconds: DEMO.reservationTtlSeconds,
          verifier: "Commit-operated centralized verifier (disclosed). Roadmap: docs/verifier-roadmap.md",
          prototype: true,
          localHardhat: Number(process.env.COMMIT_CHAIN_ID || DEMO.chainId) === 31337,
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/demo/latest") {
        send(res, 200, await latestEvidence(db));
        return;
      }
      const now = await clock.chainNowSec().catch(() => {
        throw new ApiError("CHAIN_UNAVAILABLE", "chain time unavailable", 503, true);
      });
      if (req.method === "POST" && url.pathname === "/api/auth/nonce") {
        const body = parseJson(await readBody(req));
        const out = await issueNonce(db, String(body.address || ""), now);
        send(res, 200, { ...out, traceId });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/auth/verify") {
        const body = parseJson(await readBody(req));
        const out = await verifyLogin(db, now, body);
        send(res, 200, { wallet: out.wallet, expiresAt: out.expiresAt, traceId }, {
          "set-cookie": sessionCookie(out.sessionId),
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/auth/dev-session") {
        const body = parseJson(await readBody(req));
        const out = await issueDevSession(db, String(body.address || ""), now);
        send(res, 200, { wallet: out.wallet, expiresAt: out.expiresAt, traceId, demo: true }, {
          "set-cookie": sessionCookie(out.sessionId),
        });
        return;
      }
      if ((req.method === "POST" || req.method === "GET") && url.pathname === "/api/capacity/quote") {
        rateLimit(req.socket.remoteAddress || "local");
        const body = req.method === "GET" ? Object.fromEntries(url.searchParams) : parseJson(await readBody(req));
        if (typeof body.quantity === "string") body.quantity = Number(body.quantity);
        const quote = await createQuote(db, clock, body, traceId);
        send(res, 200, quote);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/search") {
        throw new ApiError(
          "NO_CAPACITY",
          "search.v1 is not an open queue. Execute only against a reserved commitment you own, inside its window, with remaining units.",
          409,
        );
      }
      if (req.method === "POST" && url.pathname === "/api/lab/capacity-race") {
        rateLimit(req.socket.remoteAddress || "local");
        const race = await labCapacityRace(db, clock);
        send(res, 200, { ...race, traceId });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/reservations") {
        const body = parseJson(await readBody(req));
        const wallet = await sessionWallet(db, cookieSession(req), now);
        const reservation = await createReservation(db, clock, wallet, String(body.quoteId || ""));
        send(res, 200, { ...reservation, traceId });
        return;
      }

      const onchainCreate = /^\/api\/commitments\/([^/]+)\/onchain-create$/.exec(url.pathname);
      if (req.method === "POST" && onchainCreate) {
        const wallet = await sessionWallet(db, cookieSession(req), now);
        const out = await createOnchain(db, wallet, onchainCreate[1]);
        send(res, 200, { ...out, traceId });
        return;
      }
      const commitmentGet = /^\/api\/commitments\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && commitmentGet) {
        send(res, 200, await getReservationView(db, commitmentGet[1], now));
        return;
      }
      const commitmentExec = /^\/api\/commitments\/([^/]+)\/execute$/.exec(url.pathname);
      if (req.method === "POST" && commitmentExec) {
        const body = parseJson(await readBody(req));
        const wallet = await sessionWallet(db, cookieSession(req), now);
        const out = await executeRequest(
          db,
          clock,
          wallet,
          commitmentExec[1],
          String(body.query || ""),
          String(body.clientRequestId || ""),
        );
        send(res, 200, { ...out, traceId });
        return;
      }
      const prepareListPath = /^\/api\/commitments\/([^/]+)\/prepare-list$/.exec(url.pathname);
      if (req.method === "POST" && prepareListPath) {
        const body = parseJson(await readBody(req));
        const wallet = await sessionWallet(db, cookieSession(req), now);
        if (chainEnabled()) {
          await processOutbox(db, await chainSender(db));
        }
        const out = await prepareList(db, wallet, prepareListPath[1], String(body.buyer || ""), now);
        if (chainEnabled()) {
          const listed = await listOnchain(db, wallet, prepareListPath[1], String(body.buyer || ""));
          send(res, 200, { ...out, chain: listed, traceId });
          return;
        }
        send(res, 200, { ...out, traceId });
        return;
      }
      const prepareClosePath = /^\/api\/commitments\/([^/]+)\/prepare-close$/.exec(url.pathname);
      if (req.method === "POST" && prepareClosePath) {
        const wallet = await sessionWallet(db, cookieSession(req), now);
        const id = prepareClosePath[1];
        let chainTx: unknown = null;
        if (chainEnabled()) {
          await processOutbox(db, await chainSender(db));
          const closed = await closeOnchain(db, wallet, id);
          const settled = await settleOnchain(id, db);
          chainTx = { closed, settled };
        }
        const out = await prepareClose(db, wallet, id);
        if (chainEnabled()) await markSettled(db, id);
        send(res, 200, { ...out, chain: chainTx, traceId });
        return;
      }
      const requestGet = /^\/api\/requests\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && requestGet) {
        send(res, 200, await getLogical(db, requestGet[1]));
        return;
      }
      const listingGet = /^\/api\/listings\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && listingGet) {
        send(res, 200, await getListing(db, listingGet[1]));
        return;
      }
      const listingBuy = /^\/api\/listings\/([^/]+)\/buy$/.exec(url.pathname);
      if (req.method === "POST" && listingBuy) {
        const wallet = await sessionWallet(db, cookieSession(req), now);
        let chainTx: unknown = null;
        if (chainEnabled()) {
          const listing = await getListing(db, listingBuy[1]);
          const link = await db.query<{ commitment_id: string }>(
            `SELECT commitment_id FROM chain_links WHERE reservation_id = $1`,
            [listing.reservationId],
          );
          if (link.rows[0]) chainTx = await buyOnchain(wallet, link.rows[0].commitment_id);
        }
        send(res, 200, { ...(await buyListing(db, wallet, listingBuy[1], now)), chain: chainTx, traceId });
        return;
      }
      const evidenceGet = /^\/api\/evidence\/([^/]+)$/.exec(url.pathname);
      if (req.method === "GET" && evidenceGet) {
        send(res, 200, await getEvidence(db, evidenceGet[1]));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/evidence") {
        const body = parseJson(await readBody(req));
        const runId = await recordEvidence(db, body.reservationId ? String(body.reservationId) : null, body.summary ?? body);
        send(res, 200, { runId, traceId });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/admin/demo/fault") {
        const token = String(req.headers["x-commit-admin"] || "");
        const body = parseJson(await readBody(req));
        const out = await injectPrimaryFault(token, {
          delayMs: typeof body.delayMs === "number" ? body.delayMs : undefined,
          invalidSchema: Boolean(body.invalidSchema),
          http5xx: Boolean(body.http5xx),
        });
        send(res, 200, { ...out, traceId });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/admin/recover") {
        const n = await recoverInflight(db);
        send(res, 200, { recovered: n, traceId });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/admin/outbox") {
        const sender = chainEnabled() ? await chainSender(db) : undefined;
        send(res, 200, { jobs: await pendingOutbox(db), processed: await processOutbox(db, sender) });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/admin/warp") {
        if (process.env.COMMIT_ALLOW_DEV_SESSION !== "1") throw new ApiError("NOT_OWNER", "warp disabled", 403);
        const body = parseJson(await readBody(req));
        const seconds = Number(body.seconds || 61);
        const block = await warp(seconds);
        send(res, 200, { timestamp: Number(block.timestamp), traceId });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/admin/t30") {
        send(
          res,
          200,
          await t30Snapshot({
            seller: String(url.searchParams.get("seller") || ""),
            buyer: String(url.searchParams.get("buyer") || ""),
            primary: process.env.COMMIT_PRIMARY || "",
            backup: process.env.COMMIT_BACKUP || "",
          }),
        );
        return;
      }
      send(res, 404, { error: { code: "INVALID_INPUT", message: "not found", retryable: false, traceId } });
    } catch (err) {
      if (err instanceof ApiError) {
        send(res, err.http, err.body(traceId));
        return;
      }
      console.error(err);
      const message = err instanceof Error ? err.message : "internal error";
      send(res, 500, { error: { code: "COMMIT_BUG", message, retryable: false, traceId } });
    }
  };
}
