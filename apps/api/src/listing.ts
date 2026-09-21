import { randomBytes } from "node:crypto";
import { DEMO } from "@commit/domain";
import type { Db } from "./db.js";
import { ApiError } from "./errors.js";

function flag(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

export async function prepareList(
  db: Db,
  owner: string,
  reservationId: string,
  designatedBuyer: string,
  nowSec: number,
) {
  if (!designatedBuyer) throw new ApiError("INVALID_INPUT", "designated buyer required");
  return db.transaction(async (tx) => {
    const res = await tx.query<{
      buyer: string;
      listed: boolean | string;
      remaining: string;
      live_used: string;
      status: string;
    }>(`SELECT buyer, listed, remaining, live_used, status FROM reservations WHERE id = $1 FOR UPDATE`, [reservationId]);
    const r = res.rows[0];
    if (!r) throw new ApiError("INVALID_INPUT", "unknown commitment");
    if (r.buyer.toLowerCase() !== owner.toLowerCase()) throw new ApiError("NOT_OWNER", "not the current owner", 403);
    const inflight = await tx.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM logical_requests
       WHERE reservation_id = $1 AND status IN ('PRIMARY_RUNNING', 'BACKUP_RUNNING')`,
      [reservationId],
    );
    if (Number(inflight.rows[0]?.n ?? 0) > 0) {
      throw new ApiError("LISTING_LOCKED", "wait for in-flight drain before listing", 409, true);
    }
    await tx.query(`UPDATE reservations SET listed = TRUE WHERE id = $1`, [reservationId]);
    const listingId = `lst_${randomBytes(6).toString("hex")}`;
    await tx.query(
      `INSERT INTO listings (id, reservation_id, buyer, price, expiry, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
      [listingId, reservationId, designatedBuyer, DEMO.transferPrice.toString(), nowSec + 3600, nowSec],
    );
    return {
      listingId,
      reservationId,
      designatedBuyer,
      price: DEMO.transferPrice.toString(),
      remaining: Number(r.remaining),
      liveUsed: Number(r.live_used),
      status: "open",
      frozen: true,
    };
  });
}

export async function prepareClose(db: Db, owner: string, reservationId: string) {
  return db.transaction(async (tx) => {
    const res = await tx.query<{ buyer: string }>(
      `SELECT buyer FROM reservations WHERE id = $1 FOR UPDATE`,
      [reservationId],
    );
    const r = res.rows[0];
    if (!r) throw new ApiError("INVALID_INPUT", "unknown commitment");
    if (r.buyer.toLowerCase() !== owner.toLowerCase()) throw new ApiError("NOT_OWNER", "not the current owner", 403);
    const inflight = await tx.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM logical_requests
       WHERE reservation_id = $1 AND status IN ('PRIMARY_RUNNING', 'BACKUP_RUNNING')`,
      [reservationId],
    );
    if (Number(inflight.rows[0]?.n ?? 0) > 0) {
      throw new ApiError("LISTING_LOCKED", "wait for in-flight drain before close", 409, true);
    }
    await tx.query(`UPDATE reservations SET status = 'closed', listed = FALSE WHERE id = $1`, [reservationId]);
    return { reservationId, status: "closed", frozen: true };
  });
}

export async function markSettled(db: Db, reservationId: string) {
  await db.query(`UPDATE reservations SET status = 'settled', listed = FALSE WHERE id = $1`, [reservationId]);
}

export async function getListing(db: Db, listingId: string) {
  const row = await db.query<Record<string, unknown>>(
    `SELECT l.*, r.remaining, r.live_used, r.buyer AS owner, r.listed
     FROM listings l JOIN reservations r ON r.id = l.reservation_id WHERE l.id = $1`,
    [listingId],
  );
  if (!row.rows[0]) throw new ApiError("INVALID_INPUT", "unknown listing");
  const l = row.rows[0];
  return {
    listingId: l.id,
    reservationId: l.reservation_id,
    designatedBuyer: l.buyer,
    owner: l.owner,
    price: String(l.price),
    remaining: Number(l.remaining),
    liveUsed: Number(l.live_used),
    status: l.status,
    listed: flag(l.listed),
  };
}

export async function buyListing(db: Db, buyer: string, listingId: string, nowSec = Math.floor(Date.now() / 1000)) {
  return db.transaction(async (tx) => {
    const row = await tx.query<{
      id: string;
      reservation_id: string;
      buyer: string;
      status: string;
      expiry: string;
    }>(`SELECT id, reservation_id, buyer, status, expiry FROM listings WHERE id = $1 FOR UPDATE`, [listingId]);
    const l = row.rows[0];
    if (!l) throw new ApiError("INVALID_INPUT", "unknown listing");
    if (l.status !== "open") throw new ApiError("NO_CAPACITY", "listing not open", 409);
    if (Number(l.expiry) < nowSec) throw new ApiError("QUOTE_EXPIRED", "listing expired", 409);
    if (l.buyer.toLowerCase() !== buyer.toLowerCase()) {
      throw new ApiError("NOT_OWNER", "not the designated buyer", 403);
    }
    const res = await tx.query<{ remaining: string; live_used: string; owner_epoch: string }>(
      `SELECT remaining, live_used, owner_epoch FROM reservations WHERE id = $1 FOR UPDATE`,
      [l.reservation_id],
    );
    const r = res.rows[0];
    await tx.query(
      `UPDATE reservations SET buyer = $2, listed = FALSE, owner_epoch = owner_epoch + 1 WHERE id = $1`,
      [l.reservation_id, buyer],
    );
    await tx.query(`UPDATE listings SET status = 'sold' WHERE id = $1`, [listingId]);
    return {
      listingId,
      reservationId: l.reservation_id,
      owner: buyer,
      remaining: Number(r.remaining),
      liveUsed: Number(r.live_used),
      ownerEpoch: Number(r.owner_epoch) + 1,
    };
  });
}
