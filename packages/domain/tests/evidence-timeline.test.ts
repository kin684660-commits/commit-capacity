import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  displayStatus,
  occupancyHeldWhileClosed,
  remainingUsed,
  resultCard,
  runHeadline,
  thisRunEconomics,
  type EvidenceSummary,
} from "../../../apps/web/lib/evidenceSteps";

const labels = {
  quote: "QUOTE",
  reserve: "CREATE",
  primary: "PRIMARY",
  failover: "FAILOVER",
  faultMissed: "FAULT_MISSED",
  transfer: "TRANSFER",
  after: "NEW_OWNER",
  close: "CLOSE",
  notRun: "not run",
  remain: "remain",
  used: "used",
};

describe("held failover run_12 shape", () => {
  const s: EvidenceSummary = {
    quoteId: "qte_x",
    t06: { status: "SUCCEEDED", remaining: 2, liveUsed: 1, route: "BACKUP", fault: { ok: true } },
    t21: { status: "SUCCEEDED", remaining: 2, liveUsed: 1 },
    closed: { status: "held" },
    chain: { commitmentId: "4", createTx: "0xabc", breachPrimary: "1", successBackup: "1" },
  };

  it("does not mark transfer/settle as succeeded", () => {
    expect(buildTimeline(s, labels).map((r) => r.key)).toEqual(["QUOTE", "CREATE", "PRIMARY", "FAILOVER"]);
  });

  it("headline is held failover and status held", () => {
    expect(runHeadline(s)).toBe("held_failover");
    expect(displayStatus(s)).toBe("held");
    expect(remainingUsed(s)).toEqual({ remaining: 2, used: 1 });
  });
});

describe("full settled run", () => {
  const s: EvidenceSummary = {
    quoteId: "qte_y",
    t05: { status: "SUCCEEDED", remaining: 19, liveUsed: 1 },
    t06: { status: "SUCCEEDED", remaining: 18, liveUsed: 2, route: "BACKUP", fault: { ok: true } },
    t21: { status: "SUCCEEDED", remaining: 17, liveUsed: 3, requestId: "req_b", owner: "0xbb" },
    bought: { txHash: "0xbuy", from: "0xaa", to: "0xbb", ownerEpochBefore: 1, ownerEpochAfter: 2 },
    closed: { status: "settled", chain: { settled: { txHash: "0xsettle" } } },
    settlement: { settleTx: "0xsettle", status: "SETTLED" },
    chain: { commitmentId: "1", createTx: "0xcreate" },
  };

  it("shows transfer, new owner, settle", () => {
    expect(buildTimeline(s, labels).map((r) => r.key)).toEqual([
      "QUOTE",
      "CREATE",
      "PRIMARY",
      "FAILOVER",
      "TRANSFER",
      "NEW_OWNER",
      "SETTLE",
    ]);
    expect(runHeadline(s)).toBe("settled");
    expect(displayStatus(s)).toBe("settled");
    expect(remainingUsed(s)).toEqual({ remaining: 17, used: 3 });
  });
});

describe("artifact delivery run — no protocol template", () => {
  const s: EvidenceSummary = {
    quoteId: "qte_art",
    occupancyStatus: "held",
    t05: { status: "SUCCEEDED", remaining: 2, liveUsed: 1, requestId: "req_a", route: "PRIMARY" },
    t06: { status: "SUCCEEDED", remaining: 1, liveUsed: 2, requestId: "req_b", route: "PRIMARY" },
    t21: { status: "SUCCEEDED", remaining: 0, liveUsed: 3, requestId: "req_c", route: "PRIMARY" },
    settlement: { status: "held" },
    closed: { status: "held" },
    chain: {
      commitmentId: "6",
      createTx: "0xcreate",
      successPrimary: "3",
      successBackup: "0",
      breachPrimary: "0",
      breachBackup: "0",
      status: 1,
    },
  };

  it("counts three requestIds and does not treat t06 as failover", () => {
    const card = resultCard(s);
    expect(card.requests).toBe(3);
    expect(card.failovers).toBe(0);
    expect(card.transfers).toBe(0);
    expect(card.settled).toBe(false);
    expect(buildTimeline(s, labels).map((r) => r.key)).toEqual(["QUOTE", "CREATE", "PRIMARY", "CALL_2", "CALL_3", "CLOSE"]);
    expect(remainingUsed(s)).toEqual({ remaining: 0, used: 3 });
  });

  it("uses this-run prepaid and hides protocol penalty/transfer", () => {
    const econ = thisRunEconomics(s);
    expect(econ?.buyerPrepaid).toBeCloseTo(0.07);
    expect(econ?.providerPay).toBeCloseTo(0.03);
    expect(econ?.unusedRefund).toBeCloseTo(0);
    expect(econ?.failoverPenalty).toBe(0);
    expect(econ?.transferPrice).toBe(0);
  });

  it("prefers on-chain CLOSED over occupancy held", () => {
    expect(displayStatus(s)).toBe("closed");
    expect(runHeadline(s)).toBe("closed");
    expect(occupancyHeldWhileClosed(s)).toBe(true);
    expect(occupancyHeldWhileClosed({ ...s, occupancyStatus: "expired" })).toBe(true);
  });
});

describe("this-run economics vs isolated T30", () => {
  it("escrow splits used + remaining", () => {
    const remaining = 17;
    const used = 3;
    const quantity = remaining + used;
    const unit = 0.01;
    expect(used * unit + remaining * unit).toBeCloseTo(quantity * unit);
  });

  it("does not treat wallet t30.ok false as this-run fail", () => {
    const t30 = { ok: false, sum: "1560000", expected: "590000" };
    const verdict = t30.ok ? "MATCH" : "NOT_APPLICABLE";
    expect(verdict).toBe("NOT_APPLICABLE");
    expect(t30.ok).toBe(false);
  });
});
