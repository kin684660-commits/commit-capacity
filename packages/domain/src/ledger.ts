import { DEMO } from "./params.js";
import { min, sub } from "./money.js";
import { isProviderAttributable, type ReasonCode } from "./sla.js";

export type Actor = "A" | "C" | "P" | "B";
export type ProviderId = "P" | "B";

export type Ledger = {
  owner: Actor;
  ownerEpoch: number;
  status: "OPEN" | "CLOSED" | "SETTLED";
  listed: boolean;
  totalUnits: number;
  remaining: number;
  inFlight: number;
  successPrimary: number;
  successBackup: number;
  breachPrimary: number;
  breachBackup: number;
  escrow: bigint;
  lockedBondP: bigint;
  lockedBondB: bigint;
  freeBondP: bigint;
  freeBondB: bigint;
  claimable: Record<Actor, bigint>;
  route: "PRIMARY" | "BACKUP" | "UNAVAILABLE";
  unitPrice: bigint;
  penaltyPerAttempt: bigint;
};

export function emptyClaimable(): Record<Actor, bigint> {
  return { A: 0n, C: 0n, P: 0n, B: 0n };
}

export function createCommitment(): Ledger {
  const deposit = DEMO.buyerTotal;
  const fees = DEMO.primaryReservationFee + DEMO.backupReservationFee;
  return {
    owner: "A",
    ownerEpoch: 1,
    status: "OPEN",
    listed: false,
    totalUnits: DEMO.quantity,
    remaining: DEMO.quantity,
    inFlight: 0,
    successPrimary: 0,
    successBackup: 0,
    breachPrimary: 0,
    breachBackup: 0,
    escrow: sub(deposit, fees),
    lockedBondP: DEMO.bondPerProvider,
    lockedBondB: DEMO.bondPerProvider,
    freeBondP: 0n,
    freeBondB: 0n,
    claimable: {
      A: 0n,
      C: 0n,
      P: DEMO.primaryReservationFee,
      B: DEMO.backupReservationFee,
    },
    route: "PRIMARY",
    unitPrice: DEMO.unitPrice,
    penaltyPerAttempt: DEMO.penaltyPerAttempt,
  };
}

export function lockedUnits(s: Ledger): number {
  return s.successPrimary + s.successBackup + s.remaining + s.inFlight;
}

export function contractAssets(s: Ledger): bigint {
  return s.escrow + s.lockedBondP + s.lockedBondB + s.freeBondP + s.freeBondB + totalClaimable(s);
}

export function totalClaimable(s: Ledger): bigint {
  return s.claimable.A + s.claimable.C + s.claimable.P + s.claimable.B;
}

export function liabilities(s: Ledger): bigint {
  return s.escrow + s.lockedBondP + s.lockedBondB + s.freeBondP + s.freeBondB + totalClaimable(s);
}

function assertOpen(s: Ledger) {
  if (s.status !== "OPEN") throw new Error("not OPEN");
}

export function acceptRequest(s: Ledger): Ledger {
  assertOpen(s);
  if (s.listed) throw new Error("LISTING_LOCKED");
  if (s.remaining <= 0) throw new Error("no remaining");
  if (s.route === "UNAVAILABLE") throw new Error("UNAVAILABLE");
  return { ...s, remaining: s.remaining - 1, inFlight: s.inFlight + 1 };
}

function applyPenalty(s: Ledger, provider: ProviderId): Ledger {
  const locked = provider === "P" ? s.lockedBondP : s.lockedBondB;
  const cut = min(s.penaltyPerAttempt, locked);
  const claimable = { ...s.claimable, [s.owner]: s.claimable[s.owner] + cut };
  if (provider === "P") {
    return {
      ...s,
      lockedBondP: sub(s.lockedBondP, cut),
      breachPrimary: s.breachPrimary + 1,
      claimable,
      route: "BACKUP",
    };
  }
  return {
    ...s,
    lockedBondB: sub(s.lockedBondB, cut),
    breachBackup: s.breachBackup + 1,
    claimable,
    route: s.route === "BACKUP" && s.lockedBondB - cut === 0n ? "UNAVAILABLE" : s.route,
  };
}

export function completeSuccess(s: Ledger, provider: ProviderId): Ledger {
  assertOpen(s);
  if (s.inFlight <= 0) throw new Error("no in-flight");
  const incomeKey: Actor = provider;
  return {
    ...s,
    inFlight: s.inFlight - 1,
    successPrimary: s.successPrimary + (provider === "P" ? 1 : 0),
    successBackup: s.successBackup + (provider === "B" ? 1 : 0),
    escrow: sub(s.escrow, s.unitPrice),
    claimable: { ...s.claimable, [incomeKey]: s.claimable[incomeKey] + s.unitPrice },
    route: provider === "P" ? "PRIMARY" : "BACKUP",
  };
}

export function completeFailure(
  s: Ledger,
  provider: ProviderId,
  reason: ReasonCode,
  opts?: { backupWillRun?: boolean },
): Ledger {
  assertOpen(s);
  if (s.inFlight <= 0) throw new Error("no in-flight");
  let next = s;
  if (isProviderAttributable(reason)) {
    next = applyPenalty(next, provider);
  }
  if (provider === "P" && opts?.backupWillRun) {
    return { ...next, route: "BACKUP" };
  }
  return {
    ...next,
    inFlight: next.inFlight - 1,
    remaining: next.remaining + 1,
  };
}

/** Primary timeout then backup success: one consume, one primary penalty, backup earns unit. */
export function failoverSuccess(s: Ledger): Ledger {
  const accepted = acceptRequest(s);
  const afterPrimary = completeFailure(accepted, "P", "TIMEOUT", { backupWillRun: true });
  return completeSuccess(afterPrimary, "B");
}

export function transferRemaining(s: Ledger, buyer: Actor, price: bigint): Ledger {
  assertOpen(s);
  if (s.inFlight !== 0) throw new Error("in flight");
  if (buyer === s.owner) throw new Error("same owner");
  const seller = s.owner;
  return {
    ...s,
    owner: buyer,
    ownerEpoch: s.ownerEpoch + 1,
    listed: false,
    claimable: { ...s.claimable, [seller]: s.claimable[seller] + price },
  };
}

export function closeAndSettle(s: Ledger): Ledger {
  if (s.status === "SETTLED") return s;
  if (s.inFlight !== 0) throw new Error("in flight");
  const owner = s.owner;
  return {
    ...s,
    status: "SETTLED",
    listed: false,
    escrow: 0n,
    lockedBondP: 0n,
    lockedBondB: 0n,
    freeBondP: s.freeBondP + s.lockedBondP,
    freeBondB: s.freeBondB + s.lockedBondB,
    claimable: { ...s.claimable, [owner]: s.claimable[owner] + s.escrow },
  };
}

export function withdraw(s: Ledger, who: Actor): { state: Ledger; paid: bigint } {
  const paid = s.claimable[who];
  return { state: { ...s, claimable: { ...s.claimable, [who]: 0n } }, paid };
}

export function assertInvariants(s: Ledger) {
  if (lockedUnits(s) !== s.totalUnits) {
    throw new Error(`unit invariant ${lockedUnits(s)} != ${s.totalUnits}`);
  }
  if (s.successPrimary + s.successBackup > s.totalUnits) {
    throw new Error("success overflow");
  }
  if (contractAssets(s) !== liabilities(s)) {
    throw new Error("asset/liability mismatch");
  }
}

/** Chapter 7 unique reconciliation play. External transfer payment is off-contract until buyListing. */
export function standardPlay(): {
  state: Ledger;
  transferInflow: bigint;
  originalInflow: bigint;
} {
  let s = createCommitment();
  assertInvariants(s);
  s = completeSuccess(acceptRequest(s), "P");
  s = completeSuccess(acceptRequest(s), "P");
  s = failoverSuccess(s);
  const remainingBefore = s.remaining;
  if (remainingBefore !== 17) throw new Error(`expected 17 remaining, got ${remainingBefore}`);
  const transferInflow = DEMO.transferPrice;
  s = transferRemaining(s, "C", transferInflow);
  s = completeSuccess(acceptRequest(s), "B");
  s = closeAndSettle(s);
  assertInvariants(s);
  const originalInflow = DEMO.buyerTotal + DEMO.bondPerProvider + DEMO.bondPerProvider;
  return { state: s, transferInflow, originalInflow };
}

export function economicTotals(s: Ledger, transferInflow: bigint) {
  return {
    pIncome: s.claimable.P,
    bIncome: s.claimable.B,
    aCompAndSale: s.claimable.A,
    cRefund: s.claimable.C,
    pUnlock: s.freeBondP,
    bUnlock: s.freeBondB,
    sum:
      s.claimable.P +
      s.claimable.B +
      s.claimable.A +
      s.claimable.C +
      s.freeBondP +
      s.freeBondB,
    originalPlusTransfer: DEMO.buyerTotal + DEMO.bondPerProvider + DEMO.bondPerProvider + transferInflow,
  };
}
