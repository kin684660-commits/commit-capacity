import { describe, expect, it, beforeEach } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { DEMO, isoFromUnix } from "@commit/domain";
import { openDb, type Db } from "../src/db.js";
import { manualClock } from "../src/clock.js";
import { countHeldWindows, createQuote, createReservation, releaseExpired } from "../src/occupancy.js";
import { ApiError } from "../src/errors.js";
import { issueNonce, siweMessage, verifyLogin } from "../src/auth.js";

const now0 = 1_800_000_000;

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

describe("W05 occupancy", () => {
  let db: Db;
  let clock: ReturnType<typeof manualClock>;

  beforeEach(async () => {
    db = await openDb();
    clock = manualClock(now0);
  });

  it("quote does not occupy a window", async () => {
    const q1 = await createQuote(db, clock, {}, "t1");
    const q2 = await createQuote(db, clock, {}, "t2");
    expect(q1.quoteId).not.toBe(q2.quoteId);
    expect(q1.reservationRequired).toBe(true);
    expect(await countHeldWindows(db)).toBe(0);
  });

  it("T01 concurrent reservations of the same window: only one succeeds", async () => {
    const a = await login(db, clock);
    const b = await login(db, clock);
    const quoteA = await createQuote(db, clock, {}, "ta");
    const quoteB = await createQuote(db, clock, {}, "tb");
    const results = await Promise.allSettled([
      createReservation(db, clock, a.wallet, quoteA.quoteId),
      createReservation(db, clock, b.wallet, quoteB.quoteId),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    expect((bad[0] as PromiseRejectedResult).reason).toBeInstanceOf(ApiError);
    expect(((bad[0] as PromiseRejectedResult).reason as ApiError).code).toBe("NO_CAPACITY");
    expect(await countHeldWindows(db)).toBe(2);
  });

  it("T02 expired quote is rejected and does not occupy", async () => {
    const a = await login(db, clock);
    const quote = await createQuote(db, clock, {}, "t");
    clock.set(now0 + DEMO.quoteTtlSeconds + 1);
    await expect(createReservation(db, clock, a.wallet, quote.quoteId)).rejects.toMatchObject({
      code: "QUOTE_EXPIRED",
    });
    expect(await countHeldWindows(db)).toBe(0);
  });

  it("T02 occupancy releases only after chain time exceeds deadline", async () => {
    const a = await login(db, clock);
    const b = await login(db, clock);
    const firstQuote = await createQuote(db, clock, {}, "t1");
    await createReservation(db, clock, a.wallet, firstQuote.quoteId);
    clock.fail(true);
    expect(await releaseExpired(db, clock)).toBe(0);
    expect(await countHeldWindows(db)).toBe(2);
    clock.fail(false);
    clock.set(now0 + DEMO.reservationTtlSeconds + 5);
    expect(await releaseExpired(db, clock)).toBe(1);
    expect(await countHeldWindows(db)).toBe(0);
    const second = await createQuote(db, clock, {}, "t2");
    await createReservation(db, clock, b.wallet, second.quoteId);
    expect(await countHeldWindows(db)).toBe(2);
  });

  it("overlapping quote after reserve is NO_CAPACITY (occupancy gates admission)", async () => {
    const a = await login(db, clock);
    const quote = await createQuote(db, clock, {}, "hold");
    await createReservation(db, clock, a.wallet, quote.quoteId);
    await expect(createQuote(db, clock, {}, "late")).rejects.toMatchObject({ code: "NO_CAPACITY" });
  });

  it("lab capacity race rejects the second overlapping quote", async () => {
    const { labCapacityRace } = await import("../src/occupancy.js");
    const out = await labCapacityRace(db, clock);
    expect(out.oversellRejected).toBe(true);
    expect(out.seats).toBe(1);
    expect(out.executeGatedByReservation).toBe(true);
  });

  it("non-overlapping windows can both be held", async () => {
    const a = await login(db, clock);
    const start1 = isoFromUnix(now0 + 60);
    const end1 = isoFromUnix(now0 + 60 + 600);
    const start2 = isoFromUnix(now0 + 60 + 600);
    const end2 = isoFromUnix(now0 + 60 + 1200);
    const q1 = await createQuote(db, clock, { window: { start: start1, end: end1 } }, "w1");
    const q2 = await createQuote(db, clock, { window: { start: start2, end: end2 } }, "w2");
    await createReservation(db, clock, a.wallet, q1.quoteId);
    await createReservation(db, clock, a.wallet, q2.quoteId);
    expect(await countHeldWindows(db)).toBe(4);
  });
});
