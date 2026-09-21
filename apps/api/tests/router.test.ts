import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { DEMO, isoFromUnix } from "@commit/domain";
import { openDb, type Db } from "../src/db.js";
import { manualClock } from "../src/clock.js";
import { createQuote, createReservation } from "../src/occupancy.js";
import { issueNonce, siweMessage, verifyLogin } from "../src/auth.js";
import { executeRequest, getLogical, recoverInflight } from "../src/router.js";
import { buyListing, prepareList } from "../src/listing.js";
import { pendingOutbox, processOutbox } from "../src/outbox.js";
import { ApiError } from "../src/errors.js";

const now0 = 1_800_000_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const providerServer = path.join(root, "apps/providers/src/server.mjs");
const ADMIN = "change-me-local-only";

function listenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      if (!addr || typeof addr === "string") {
        s.close();
        reject(new Error("no port"));
        return;
      }
      const port = addr.port;
      s.close(() => resolve(port));
    });
  });
}

async function waitHealth(url: string) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${url}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`no health ${url}`);
}

async function login(db: Db, clock: ReturnType<typeof manualClock>, key = generatePrivateKey()) {
  const account = privateKeyToAccount(key);
  const now = await clock.chainNowSec();
  const { nonce, address } = await issueNonce(db, account.address, now);
  const message = siweMessage({
    domain: "localhost",
    address,
    uri: "http://localhost:3080",
    nonce,
    chainId: 1952,
    issuedAt: isoFromUnix(now),
    expirationTime: isoFromUnix(now + 3600),
  });
  const signature = await account.signMessage({ message });
  const session = await verifyLogin(db, now, { message, signature });
  return { account, ...session };
}

async function heldReservation(db: Db, clock: ReturnType<typeof manualClock>, wallet: string) {
  const quote = await createQuote(db, clock, {}, "router");
  return createReservation(db, clock, wallet, quote.quoteId);
}

describe("W09 router T04–T14", () => {
  let db: Db;
  let clock: ReturnType<typeof manualClock>;
  let children: ChildProcess[] = [];

  beforeAll(async () => {
    process.env.COMMIT_ATTEMPT_TIMEOUT_MS = "200";
    process.env.COMMIT_PROVIDER_ADMIN_TOKEN = ADMIN;
    const pPort = await listenPort();
    const nPort = await listenPort();
    process.env.SEARCHNODE_URL = `http://127.0.0.1:${pPort}`;
    process.env.NOVA_URL = `http://127.0.0.1:${nPort}`;
    const spawnOne = (role: string, port: number) =>
      spawn(process.execPath, [providerServer, role], {
        env: {
          ...process.env,
          SEARCHNODE_PORT: String(role === "search-node" ? port : pPort),
          NOVA_PORT: String(role === "nova" ? port : nPort),
          COMMIT_PROVIDER_ADMIN_TOKEN: ADMIN,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    children = [spawnOne("search-node", pPort), spawnOne("nova", nPort)];
    await waitHealth(process.env.SEARCHNODE_URL);
    await waitHealth(process.env.NOVA_URL);
  });

  afterAll(() => {
    for (const c of children) c.kill("SIGTERM");
  });

  beforeEach(async () => {
    db = await openDb();
    clock = manualClock(now0);
    delete process.env.COMMIT_SKIP_BACKUP;
  });

  it("T04 rejects execute before the window", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    await expect(
      executeRequest(db, clock, a.wallet, rsv.reservationId, "EIP-712", "c1"),
    ).rejects.toMatchObject({ code: "OUTSIDE_WINDOW" });
    const rem = await db.query<{ remaining: string }>(`SELECT remaining FROM reservations WHERE id = $1`, [
      rsv.reservationId,
    ]);
    expect(Number(rem.rows[0].remaining)).toBe(20);
  });

  it("T05 success burns one unit", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "EIP-712", "ok-1");
    expect(out.status).toBe("SUCCEEDED");
    expect(out.remaining).toBe(19);
    expect(out.liveUsed).toBe(1);
    expect(out.attempts[0].reason).toBe("OK");
    expect(out.output?.query).toBe("EIP-712");
    expect(Array.isArray(out.output?.results) && out.output.results.length > 0).toBe(true);
    expect(String(out.output?.results?.[0]?.title || "")).toMatch(/EIP-712/i);
  });

  it("T06 primary timeout then backup success burns one unit", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await fetch(`${process.env.SEARCHNODE_URL}/admin/fault`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-commit-admin": ADMIN },
      body: JSON.stringify({ delayMs: 400 }),
    });
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "RFC", "fail-over");
    expect(out.status).toBe("SUCCEEDED");
    expect(out.remaining).toBe(19);
    expect(out.liveUsed).toBe(1);
    expect(out.attempts[0].provider_id).toBe("search-node");
    expect(out.attempts[0].reason).toBe("TIMEOUT");
    expect(out.attempts[1].reason).toBe("OK");
    expect(out.attempts[1].provider_id).toBe("nova");
    // One unit burned; primary breach is ledgered on-chain via checkpoint (domain: failoverSuccess).
    expect(out.attempts).toHaveLength(2);
  });

  it("T07 late primary success does not add extra usage", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    process.env.COMMIT_SKIP_BACKUP = "1";
    await fetch(`${process.env.SEARCHNODE_URL}/admin/fault`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-commit-admin": ADMIN },
      body: JSON.stringify({ delayMs: 400 }),
    });
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "late", "late-1");
    expect(out.status).toBe("FAILED");
    expect(out.remaining).toBe(20);
    expect(out.liveUsed).toBe(0);
    await new Promise((r) => setTimeout(r, 500));
    const again = await getLogical(db, out.requestId);
    expect(again.liveUsed).toBe(0);
    expect(again.remaining).toBe(20);
    const late = await db.query<{ late_response: boolean | string }>(
      `SELECT late_response FROM provider_attempts WHERE logical_id = $1`,
      [out.requestId],
    );
    expect(late.rows.some((row) => row.late_response === true || row.late_response === "t")).toBe(true);
  });

  it("T08 both providers fail restores remaining", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    for (const url of [process.env.SEARCHNODE_URL, process.env.NOVA_URL]) {
      await fetch(`${url}/admin/fault`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-commit-admin": ADMIN },
        body: JSON.stringify({ http5xx: true }),
      });
    }
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "down", "both-fail");
    expect(out.status).toBe("FAILED");
    expect(out.remaining).toBe(20);
    expect(out.liveUsed).toBe(0);
    expect(out.attempts.every((x) => String(x.reason) === "HTTP_5XX")).toBe(true);
  });

  it("T09 same clientRequestId is idempotent", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    const first = await executeRequest(db, clock, a.wallet, rsv.reservationId, "SIWE", "same-key");
    await new Promise((r) => setTimeout(r, 1100));
    const second = await executeRequest(db, clock, a.wallet, rsv.reservationId, "SIWE", "same-key");
    expect(second.requestId).toBe(first.requestId);
    expect(second.remaining).toBe(19);
    expect(second.liveUsed).toBe(1);
  });

  it("T10 same key different payload is 409", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await executeRequest(db, clock, a.wallet, rsv.reservationId, "SIWE", "payload-key");
    await expect(
      executeRequest(db, clock, a.wallet, rsv.reservationId, "OTHER", "payload-key"),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("T11 second request inside 1s is rate limited", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await executeRequest(db, clock, a.wallet, rsv.reservationId, "one", "r1");
    await expect(executeRequest(db, clock, a.wallet, rsv.reservationId, "two", "r2")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("T12 invalid schema fails over to backup", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await fetch(`${process.env.SEARCHNODE_URL}/admin/fault`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-commit-admin": ADMIN },
      body: JSON.stringify({ invalidSchema: true }),
    });
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "schema", "schema-1");
    expect(out.status).toBe("SUCCEEDED");
    expect(out.attempts[0].reason).toBe("INVALID_SCHEMA");
    expect(out.attempts[1].reason).toBe("OK");
    expect(out.liveUsed).toBe(1);
  });

  it("T13 client can re-read the same request", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    const out = await executeRequest(db, clock, a.wallet, rsv.reservationId, "poll", "poll-1");
    const again = await getLogical(db, out.requestId);
    expect(again.status).toBe("SUCCEEDED");
    expect(again.requestId).toBe(out.requestId);
  });

  it("T14 recover inflight restores remaining without extra usage", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    await db.query(
      `INSERT INTO logical_requests (id, reservation_id, epoch, client_request_id, payload_hash, status, query, locked_unit, created_at)
       VALUES ('req_crash', $1, 1, 'crash', 'abc', 'PRIMARY_RUNNING', 'q', 1, $2)`,
      [rsv.reservationId, now0],
    );
    await db.query(`UPDATE reservations SET remaining = remaining - 1 WHERE id = $1`, [rsv.reservationId]);
    const n = await recoverInflight(db);
    expect(n).toBe(1);
    const rem = await db.query<{ remaining: string; live_used: string }>(
      `SELECT remaining, live_used FROM reservations WHERE id = $1`,
      [rsv.reservationId],
    );
    expect(Number(rem.rows[0].remaining)).toBe(20);
    expect(Number(rem.rows[0].live_used)).toBe(0);
    const req = await getLogical(db, "req_crash");
    expect(req.status).toBe("UNCERTAIN");
  });

  it("T27 outbox stays pending when chain send fails", async () => {
    const a = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await executeRequest(db, clock, a.wallet, rsv.reservationId, "outbox", "ob-1");
    const pending = await pendingOutbox(db);
    expect(pending.length).toBeGreaterThan(0);
    const processed = await processOutbox(db, {
      sendCheckpoint: async () => {
        throw new Error("rpc down");
      },
    });
    expect(processed[0].state).toBe("pending");
    expect((await pendingOutbox(db)).length).toBe(pending.length);
  });

  it("T19 listed reservation rejects execute", async () => {
    const a = await login(db, clock);
    const b = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    await prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0 + DEMO.minLeadSeconds);
    await expect(executeRequest(db, clock, a.wallet, rsv.reservationId, "listed", "listed-1")).rejects.toMatchObject({
      code: "LISTING_LOCKED",
    });
  });

  it("T21 old owner cannot execute after buy", async () => {
    const a = await login(db, clock);
    const b = await login(db, clock);
    const rsv = await heldReservation(db, clock, a.wallet);
    clock.set(now0 + DEMO.minLeadSeconds);
    const listing = await prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0 + DEMO.minLeadSeconds);
    const bought = await buyListing(db, b.wallet, listing.listingId);
    expect(bought.remaining).toBe(20);
    await expect(executeRequest(db, clock, a.wallet, rsv.reservationId, "old", "old-1")).rejects.toMatchObject({
      code: "NOT_OWNER",
    });
    await new Promise((r) => setTimeout(r, 1100));
    const out = await executeRequest(db, clock, b.wallet, rsv.reservationId, "new", "new-1");
    expect(out.status).toBe("SUCCEEDED");
  });
});
