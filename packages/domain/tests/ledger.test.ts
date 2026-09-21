import { describe, expect, it } from "vitest";
import { parseTcom, formatTcom } from "../src/money.js";
import { DEMO } from "../src/params.js";
import {
  assertInvariants,
  createCommitment,
  economicTotals,
  standardPlay,
  completeFailure,
  acceptRequest,
  lockedUnits,
  failoverSuccess,
} from "../src/ledger.js";

describe("money", () => {
  it("parses 6 decimal tCOM", () => {
    expect(parseTcom("0.24")).toBe(240_000n);
    expect(parseTcom("0.01")).toBe(10_000n);
    expect(formatTcom(160_000n)).toBe("0.16");
  });
});

describe("T06 failoverSuccess ledger", () => {
  it("primary timeout → backup success: one consume, breachPrimary=1, penalty 0.02", () => {
    const before = createCommitment();
    const s = failoverSuccess(before);
    assertInvariants(s);
    expect(s.successPrimary).toBe(0);
    expect(s.successBackup).toBe(1);
    expect(s.breachPrimary).toBe(1);
    expect(s.breachBackup).toBe(0);
    expect(s.remaining).toBe(DEMO.quantity - 1);
    expect(s.route).toBe("BACKUP");
    expect(s.lockedBondP).toBe(before.lockedBondP - DEMO.penaltyPerAttempt);
    expect(s.claimable.A).toBe(before.claimable.A + DEMO.penaltyPerAttempt);
    expect(s.claimable.B).toBe(before.claimable.B + DEMO.unitPrice);
  });
});

describe("T30 standard play", () => {
  it("conserves 0.59 = 0.44 original + 0.15 transfer", () => {
    const { state, transferInflow, originalInflow } = standardPlay();
    expect(originalInflow).toBe(parseTcom("0.44"));
    expect(transferInflow).toBe(parseTcom("0.15"));
    expect(state.successPrimary).toBe(2);
    expect(state.successBackup).toBe(2);
    expect(state.breachPrimary).toBe(1);
    expect(state.breachBackup).toBe(0);
    expect(state.owner).toBe("C");
    expect(state.ownerEpoch).toBe(2);
    expect(state.status).toBe("SETTLED");
    expect(state.remaining).toBe(16);

    const t = economicTotals(state, transferInflow);
    expect(t.pIncome).toBe(parseTcom("0.04"));
    expect(t.bIncome).toBe(parseTcom("0.04"));
    expect(t.aCompAndSale).toBe(parseTcom("0.17"));
    expect(t.cRefund).toBe(parseTcom("0.16"));
    expect(t.pUnlock).toBe(parseTcom("0.08"));
    expect(t.bUnlock).toBe(parseTcom("0.10"));
    expect(t.sum).toBe(parseTcom("0.59"));
    expect(t.originalPlusTransfer).toBe(parseTcom("0.59"));
    expect(t.sum).toBe(t.originalPlusTransfer);
  });

  it("keeps unit invariant after double failure (no consume)", () => {
    let s = createCommitment();
    s = acceptRequest(s);
    s = completeFailure(s, "P", "TIMEOUT", { backupWillRun: true });
    s = completeFailure(s, "B", "TIMEOUT");
    assertInvariants(s);
    expect(s.successPrimary + s.successBackup).toBe(0);
    expect(s.remaining).toBe(DEMO.quantity);
    expect(s.breachPrimary).toBe(1);
    expect(s.breachBackup).toBe(1);
    expect(lockedUnits(s)).toBe(DEMO.quantity);
  });
});
