import { describe, expect, it } from "vitest";
import { demoTerms, termsHash, encodeTerms, windowFitsQuantity } from "../src/terms.js";
import { deriveUiStatus, canAcceptExecution } from "../src/state.js";
import { classifyAttempt } from "../src/sla.js";

describe("terms hash", () => {
  it("is stable for the same vector and changes when quantity changes", () => {
    const a = demoTerms();
    const b = demoTerms();
    expect(termsHash(a)).toBe(termsHash(b));
    expect(encodeTerms(a).startsWith("0x")).toBe(true);
    const c = demoTerms({ quantity: 19n });
    expect(termsHash(c)).not.toBe(termsHash(a));
  });

  it("rejects a window that cannot fit worst-case retries", () => {
    const tight = demoTerms({ start: 1n, end: 2n, quantity: 20n, minIntervalMs: 1000n });
    expect(windowFitsQuantity(tight)).toBe(false);
    expect(windowFitsQuantity(demoTerms())).toBe(true);
  });
});

describe("ui status", () => {
  const base = { status: "OPEN" as const, listed: false, paused: false, now: 50, start: 10, end: 100 };
  it("prefers SETTLED then CLOSED then EXPIRED then LISTED", () => {
    expect(deriveUiStatus({ ...base, status: "SETTLED" })).toBe("SETTLED");
    expect(deriveUiStatus({ ...base, status: "CLOSED" })).toBe("CLOSED");
    expect(deriveUiStatus({ ...base, now: 100 })).toBe("EXPIRED");
    expect(deriveUiStatus({ ...base, listed: true })).toBe("LISTED");
    expect(deriveUiStatus({ ...base, now: 5 })).toBe("SCHEDULED");
    expect(deriveUiStatus(base)).toBe("ACTIVE");
  });

  it("blocks execution when listed or expired", () => {
    expect(canAcceptExecution({ ...base, remaining: 1, route: "PRIMARY" })).toBe(true);
    expect(canAcceptExecution({ ...base, listed: true, remaining: 1, route: "PRIMARY" })).toBe(false);
    expect(canAcceptExecution({ ...base, now: 100, remaining: 1, route: "PRIMARY" })).toBe(false);
  });
});

describe("SLA clock", () => {
  it("marks timeout at 8s and treats a later finish as late_response, not success", () => {
    const r = classifyAttempt({
      startedAtMs: 0,
      finishedAtMs: 11300,
      abortedAtMs: 8000,
      httpStatus: 200,
      schemaOk: true,
      buyerInputOk: true,
      insideWindow: true,
    });
    expect(r.reason).toBe("TIMEOUT");
    expect(r.lateResponse).toBe(true);
    expect(r.countsAsSuccess).toBe(false);
  });
});
