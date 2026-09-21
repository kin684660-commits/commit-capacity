import { randomBytes } from "node:crypto";
import {
  DEMO,
  buildQuoteTerms,
  isoFromUnix,
  publicQuoteBody,
  termsHash,
  windowsOverlap,
  type Terms,
} from "@commit/domain";
import type { ChainClock } from "./clock.js";
import type { Db } from "./db.js";
import { BACKUP_ID, PRIMARY_ID } from "./db.js";
import { ApiError } from "./errors.js";

const MAX_HELD_PER_BUYER = 2;

function id(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function termsFromJson(raw: string): Terms {
  const t = JSON.parse(raw) as Record<string, string>;
  return {
    schemaVersion: t.schemaVersion,
    serviceClass: t.serviceClass,
    quantity: BigInt(t.quantity),
    start: BigInt(t.start),
    end: BigInt(t.end),
    maxConcurrency: BigInt(t.maxConcurrency),
    minIntervalMs: BigInt(t.minIntervalMs),
    attemptTimeoutMs: BigInt(t.attemptTimeoutMs),
    maxAttempts: BigInt(t.maxAttempts),
    primaryName: t.primaryName,
    backupName: t.backupName,
    chainId: BigInt(t.chainId),
    asset: t.asset as `0x${string}`,
    unitPrice: BigInt(t.unitPrice),
    primaryReservationFee: BigInt(t.primaryReservationFee),
    backupReservationFee: BigInt(t.backupReservationFee),
    bondPerProvider: BigInt(t.bondPerProvider),
    penaltyPerAttempt: BigInt(t.penaltyPerAttempt),
    termsVersion: t.termsVersion,
  };
}

function termsToJson(terms: Terms): string {
  return JSON.stringify({
    schemaVersion: terms.schemaVersion,
    serviceClass: terms.serviceClass,
    quantity: terms.quantity.toString(),
    start: terms.start.toString(),
    end: terms.end.toString(),
    maxConcurrency: terms.maxConcurrency.toString(),
    minIntervalMs: terms.minIntervalMs.toString(),
    attemptTimeoutMs: terms.attemptTimeoutMs.toString(),
    maxAttempts: terms.maxAttempts.toString(),
    primaryName: terms.primaryName,
    backupName: terms.backupName,
    chainId: terms.chainId.toString(),
    asset: terms.asset,
    unitPrice: terms.unitPrice.toString(),
    primaryReservationFee: terms.primaryReservationFee.toString(),
    backupReservationFee: terms.backupReservationFee.toString(),
    bondPerProvider: terms.bondPerProvider.toString(),
    penaltyPerAttempt: terms.penaltyPerAttempt.toString(),
    termsVersion: terms.termsVersion,
  });
}

export async function windowIsFree(db: Db, start: number, end: number): Promise<boolean> {
  const held = await db.query<{ provider_id: string; start_ts: string; end_ts: string }>(
    `SELECT provider_id, start_ts, end_ts FROM provider_windows WHERE status = 'held'`,
  );
  return !held.rows.some((row) => windowsOverlap(start, end, Number(row.start_ts), Number(row.end_ts)));
}

export async function createQuote(
  db: Db,
  clock: ChainClock,
  input: Record<string, unknown>,
  traceId: string,
) {
  await releaseExpired(db, clock);
  const now = await clock.chainNowSec();
  const minLeadRaw = process.env.COMMIT_MIN_LEAD_SECONDS;
  const minLeadSeconds = minLeadRaw === undefined ? undefined : Number(minLeadRaw);
  const built = buildQuoteTerms(
    {
      serviceClass: typeof input.serviceClass === "string" ? input.serviceClass : undefined,
      quantity: typeof input.quantity === "number" ? input.quantity : undefined,
      window:
        input.window && typeof input.window === "object"
          ? (input.window as { start: string; end: string })
          : undefined,
      minLeadSeconds: Number.isFinite(minLeadSeconds) ? minLeadSeconds : undefined,
      asset: process.env.COMMIT_TOKEN && process.env.COMMIT_TOKEN.startsWith("0x")
        ? (process.env.COMMIT_TOKEN as `0x${string}`)
        : undefined,
      chainId: process.env.COMMIT_CHAIN_ID ? Number(process.env.COMMIT_CHAIN_ID) : undefined,
    },
    now,
  );
  if ("error" in built) {
    throw new ApiError(built.error, built.message, built.error === "OUTSIDE_WINDOW" ? 400 : 400);
  }
  const available = await windowIsFree(db, Number(built.start), Number(built.end));
  if (!available) {
    throw new ApiError("NO_CAPACITY", "that window is already reserved", 409);
  }
  const quoteId = id("qte");
  const expiresAt = now + DEMO.quoteTtlSeconds;
  const hash = termsHash(built);
  await db.query(
    `INSERT INTO quotes (id, request_hash, terms_json, terms_hash, expires_at, source_trace_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [quoteId, hash, termsToJson(built), hash, expiresAt, traceId, now],
  );
  return publicQuoteBody({ quoteId, terms: built, expiresAt, traceId, available: true });
}

export async function releaseExpired(db: Db, clock: ChainClock): Promise<number> {
  let now: number;
  try {
    now = await clock.chainNowSec();
  } catch {
    return 0;
  }
  const expired = await db.query<{ id: string }>(
    `SELECT id FROM reservations WHERE status = 'held' AND deadline < $1`,
    [now],
  );
  for (const row of expired.rows) {
    await db.transaction(async (tx) => {
      await tx.query(`UPDATE reservations SET status = 'expired' WHERE id = $1 AND status = 'held'`, [row.id]);
      await tx.query(`UPDATE provider_windows SET status = 'released' WHERE reservation_id = $1 AND status = 'held'`, [
        row.id,
      ]);
    });
  }
  return expired.rows.length;
}

export async function createReservation(db: Db, clock: ChainClock, buyer: string, quoteId: string) {
  if (!quoteId) throw new ApiError("INVALID_INPUT", "quoteId required");
  let now: number;
  try {
    now = await clock.chainNowSec();
  } catch {
    throw new ApiError("CHAIN_UNAVAILABLE", "chain time unavailable; holding occupancy", 503, true);
  }
  await releaseExpired(db, clock);

  return db.transaction(async (tx) => {
    await tx.query(`SELECT id FROM occupancy_lock WHERE id = 1 FOR UPDATE`);

    const quote = await tx.query<{
      id: string;
      terms_json: string;
      terms_hash: string;
      expires_at: string;
    }>(`SELECT id, terms_json, terms_hash, expires_at FROM quotes WHERE id = $1`, [quoteId]);
    if (!quote.rows[0]) throw new ApiError("INVALID_INPUT", "unknown quote");
    const q = quote.rows[0];
    if (Number(q.expires_at) <= now) throw new ApiError("QUOTE_EXPIRED", "quote expired");
    const terms = termsFromJson(q.terms_json);
    if (termsHash(terms) !== q.terms_hash) throw new ApiError("INVALID_INPUT", "terms hash mismatch");

    const heldByBuyer = await tx.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM reservations WHERE buyer = $1 AND status = 'held'`,
      [buyer],
    );
    if (Number(heldByBuyer.rows[0]?.n ?? 0) >= MAX_HELD_PER_BUYER) {
      throw new ApiError("NO_CAPACITY", "buyer reservation quota exceeded", 409);
    }

    const start = Number(terms.start);
    const end = Number(terms.end);
    const held = await tx.query<{ start_ts: string; end_ts: string }>(
      `SELECT start_ts, end_ts FROM provider_windows WHERE status = 'held'`,
    );
    if (held.rows.some((row) => windowsOverlap(start, end, Number(row.start_ts), Number(row.end_ts)))) {
      throw new ApiError("NO_CAPACITY", "window already reserved", 409);
    }

    const reservationId = id("rsv");
    const deadline =
      start > now
        ? Math.min(now + DEMO.reservationTtlSeconds, start - 1)
        : now + DEMO.reservationTtlSeconds;
    if (deadline <= now) throw new ApiError("OUTSIDE_WINDOW", "reservation would expire before use");

    await tx.query(
      `INSERT INTO reservations (id, quote_id, buyer, terms_hash, start_ts, end_ts, deadline, status, created_at, remaining, live_used, route)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'held', $8, $9, 0, 'PRIMARY')`,
      [reservationId, quoteId, buyer, q.terms_hash, start, end, deadline, now, Number(terms.quantity)],
    );
    await tx.query(
      `INSERT INTO provider_windows (id, provider_id, start_ts, end_ts, reservation_id, status)
       VALUES ($1, $2, $3, $4, $5, 'held')`,
      [id("win"), PRIMARY_ID, start, end, reservationId],
    );
    await tx.query(
      `INSERT INTO provider_windows (id, provider_id, start_ts, end_ts, reservation_id, status)
       VALUES ($1, $2, $3, $4, $5, 'held')`,
      [id("win"), BACKUP_ID, start, end, reservationId],
    );

    return {
      reservationId,
      quoteId,
      buyer,
      termsHash: q.terms_hash,
      deadline: isoFromUnix(deadline),
      window: { start: isoFromUnix(start), end: isoFromUnix(end) },
      providers: { primary: terms.primaryName, backup: terms.backupName },
      status: "held",
      remaining: Number(terms.quantity),
      liveUsed: 0,
      reservationRequired: true,
    };
  });
}

export async function countHeldWindows(db: Db): Promise<number> {
  const r = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM provider_windows WHERE status = 'held'`);
  return Number(r.rows[0]?.n ?? 0);
}

const LAB_BUYER = "0x000000000000000000000000000000000000bEEF";

/** Occupancy-only race: quote ≠ lock; second overlapping create is 409. Far window, 120s hold. */
export async function labCapacityRace(db: Db, clock: ChainClock) {
  await releaseExpired(db, clock);
  const now = await clock.chainNowSec();
  const start = now + 30 * 24 * 3600;
  const end = start + 600;
  const window = { start: isoFromUnix(start), end: isoFromUnix(end) };
  let held = {
    alreadyHeld: false,
    reservationId: "",
    quoteId: "",
  };
  try {
    const quoteA = await createQuote(db, clock, { quantity: 1, serviceClass: "search", window }, "lab-a");
    const rsv = await createReservation(db, clock, LAB_BUYER, quoteA.quoteId);
    held = { alreadyHeld: false, reservationId: rsv.reservationId, quoteId: quoteA.quoteId };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "COMMIT_BUG";
    if (code !== "NO_CAPACITY") throw err;
    held = { alreadyHeld: true, reservationId: "", quoteId: "" };
  }
  let oversell: { code: string; message: string; http: number } | { unexpected: string };
  try {
    await createQuote(db, clock, { quantity: 1, serviceClass: "search", window }, "lab-b");
    oversell = { unexpected: "overlapping quote succeeded — occupancy did not reject" };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "COMMIT_BUG";
    oversell = {
      code,
      message: err instanceof Error ? err.message : String(err),
      http: err instanceof ApiError ? err.http : 500,
    };
  }
  return {
    experiment: "capacity-race",
    note: "API occupancy only. No 1952 transaction. Lab hold expires with reservation TTL (~120s). Execute still requires that reservation, its owner, remaining units, and the window to be open.",
    seats: 1,
    window,
    agentA: held,
    agentB: oversell,
    oversellRejected: "code" in oversell && oversell.code === "NO_CAPACITY",
    executeGatedByReservation: true,
    heldWindows: await countHeldWindows(db),
  };
}
