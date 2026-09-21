import { describe, expect, it } from "vitest";
import { openDb } from "../src/db.js";
import { buyListing, prepareList } from "../src/listing.js";
import { ApiError } from "../src/errors.js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isoFromUnix } from "@commit/domain";
import { manualClock } from "../src/clock.js";
import { createQuote, createReservation } from "../src/occupancy.js";
import { issueNonce, siweMessage, verifyLogin } from "../src/auth.js";
import type { Db } from "../src/db.js";

const now0 = 1_800_000_000;

async function login(db: Db, clock: ReturnType<typeof manualClock>) {
  const account = privateKeyToAccount(generatePrivateKey());
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
  return verifyLogin(db, now, { message, signature });
}

describe("W11 listing freeze", () => {
  it("T17 refuses to list while a request is in flight", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const a = await login(db, clock);
    const b = await login(db, clock);
    const quote = await createQuote(db, clock, {}, "t");
    const rsv = await createReservation(db, clock, a.wallet, quote.quoteId);
    await db.query(
      `INSERT INTO logical_requests (id, reservation_id, epoch, client_request_id, payload_hash, status, query, locked_unit, created_at)
       VALUES ('req_live', $1, 1, 'live', 'x', 'PRIMARY_RUNNING', 'q', 1, $2)`,
      [rsv.reservationId, now0],
    );
    await expect(prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0)).rejects.toBeInstanceOf(ApiError);
    await expect(prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0)).rejects.toMatchObject({
      code: "LISTING_LOCKED",
    });
  });

  it("T18 freeze survives without further calls", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const a = await login(db, clock);
    const b = await login(db, clock);
    const quote = await createQuote(db, clock, {}, "t");
    const rsv = await createReservation(db, clock, a.wallet, quote.quoteId);
    await prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0);
    const row = await db.query<{ listed: boolean | string }>(`SELECT listed FROM reservations WHERE id = $1`, [
      rsv.reservationId,
    ]);
    expect(row.rows[0].listed === true || row.rows[0].listed === "t").toBe(true);
  });

  it("T20 refuses the wrong buyer and an expired listing", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const a = await login(db, clock);
    const b = await login(db, clock);
    const c = await login(db, clock);
    const quote = await createQuote(db, clock, {}, "t");
    const rsv = await createReservation(db, clock, a.wallet, quote.quoteId);
    const listing = await prepareList(db, a.wallet, rsv.reservationId, b.wallet, now0);
    await expect(buyListing(db, c.wallet, listing.listingId, now0)).rejects.toMatchObject({ code: "NOT_OWNER" });
    await expect(buyListing(db, b.wallet, listing.listingId, now0 + 4000)).rejects.toMatchObject({
      code: "QUOTE_EXPIRED",
    });
  });
});
