import { describe, expect, it } from "vitest";
import { annotateStoredT30 } from "../src/router.js";

describe("annotateStoredT30", () => {
  it("keeps stored ok:false and adds NOT_APPLICABLE plus per-commitment conservation", () => {
    const out = annotateStoredT30({
      t21: { remaining: 17, liveUsed: 3 },
      t30: { ok: false, sum: "1560000", expected: "590000" },
    });
    const t30 = out.t30 as {
      ok: boolean;
      sum: string;
      expected: string;
      walletLevelSharedRegistry: { ok: boolean; verdict: string };
      thisCommitment: { conserved: boolean; executionEscrow: string; unusedRefund: string; providerPay: string };
    };
    expect(t30.ok).toBe(false);
    expect(t30.sum).toBe("1560000");
    expect(t30.expected).toBe("590000");
    expect(t30.walletLevelSharedRegistry.ok).toBe(false);
    expect(t30.walletLevelSharedRegistry.verdict).toBe("NOT_APPLICABLE");
    expect(t30.thisCommitment.conserved).toBe(true);
    expect(t30.thisCommitment.executionEscrow).toBe("200000");
    expect(t30.thisCommitment.providerPay).toBe("30000");
    expect(t30.thisCommitment.unusedRefund).toBe("170000");
  });
});
