export type StepTone = "ok" | "warn" | "bad" | "idle";

export type EvidenceStepStatus = "NOT_STARTED" | "PENDING" | "SUCCEEDED" | "FAILED" | "SKIPPED";

/** On-chain Commitment.status: 0 OPEN, 1 CLOSED, 2 SETTLED */
export const CHAIN_STATUS = { OPEN: 0, CLOSED: 1, SETTLED: 2 } as const;

export type ChainLike = {
  commitmentId?: string;
  createTx?: string;
  owner?: string;
  successPrimary?: string;
  successBackup?: string;
  breachPrimary?: string;
  breachBackup?: string;
  status?: number;
  claimable?: { owner?: string; primary?: string; backup?: string; buyer?: string };
  closed?: { txHash?: string };
  settled?: { txHash?: string };
};

export type TransferLike = {
  buyTx?: string;
  txHash?: string;
  from?: string;
  to?: string;
  ownerEpochBefore?: number;
  ownerEpochAfter?: number;
};

export type ExecuteLike = {
  status?: string;
  remaining?: number;
  liveUsed?: number;
  route?: string;
  requestId?: string;
  owner?: string;
  fault?: { ok?: boolean };
};

export type EvidenceSummary = {
  play?: string;
  quoteId?: string;
  note?: string;
  occupancyStatus?: string;
  window?: { start?: number | string; end?: number | string };
  t05?: ExecuteLike;
  t06?: ExecuteLike;
  t21?: ExecuteLike;
  listing?: { listingId?: string; txHash?: string };
  bought?: TransferLike;
  closed?: {
    status?: string;
    chain?: { closed?: { txHash?: string }; settled?: { txHash?: string } };
  };
  chain?: ChainLike;
  transfer?: TransferLike;
  settlement?: { settleTx?: string; status?: string };
  t30?: {
    ok?: boolean;
    sum?: string;
    expected?: string;
    verdict?: string;
    isolatedHardhatT30?: { expected?: string; note?: string };
    walletLevelSharedRegistry?: {
      ok?: boolean;
      verdict?: string;
      note?: string;
      sum?: string;
      comparedToIsolatedExpected?: string;
    };
    thisCommitment?: {
      remaining?: number;
      used?: number;
      executionEscrow?: string;
      providerPay?: string;
      unusedRefund?: string;
      conserved?: boolean;
    };
  };
};

export type TimelineRow = {
  key: string;
  label: string;
  status?: string;
  meta?: string;
  href?: string;
  tone: StepTone;
  show: boolean;
};

export type RunHeadline = "held_failover" | "listed" | "transferred" | "settled" | "closed" | "failed" | "recorded";

function settledStatus(s?: EvidenceSummary) {
  if (Number(s?.chain?.status) === CHAIN_STATUS.SETTLED) return true;
  const closed = String(s?.closed?.status || "").toLowerCase();
  const settlement = String(s?.settlement?.status || "").toLowerCase();
  const settleTx = s?.settlement?.settleTx || s?.closed?.chain?.settled?.txHash;
  if (settleTx && (settlement === "settled" || closed === "settled" || closed === "closed")) return true;
  if (closed === "settled" && settleTx) return true;
  return false;
}

function transferred(s?: EvidenceSummary) {
  const t = s?.transfer || s?.bought;
  if (!t) return false;
  const buyTx = t.buyTx || t.txHash;
  const epochOk =
    typeof t.ownerEpochAfter === "number" &&
    typeof t.ownerEpochBefore === "number" &&
    t.ownerEpochAfter > t.ownerEpochBefore;
  return Boolean(buyTx && t.from && t.to && epochOk);
}

function newOwnerExecuted(s?: EvidenceSummary) {
  const t = s?.transfer || s?.bought;
  if (!transferred(s) || !s?.t21?.status) return false;
  if (!/success|succeeded/i.test(s.t21.status)) return false;
  if (!s.t21.requestId) return false;
  if (s.t21.owner && t?.to && s.t21.owner.toLowerCase() !== t.to.toLowerCase()) return false;
  return true;
}

export function executes(s?: EvidenceSummary): ExecuteLike[] {
  return [s?.t05, s?.t06, s?.t21].filter((row): row is ExecuteLike => Boolean(row && (row.requestId || row.status)));
}

/** Failover only from this run’s route / counters / explicit fault — never from a t06 field name. */
export function didFailover(s?: EvidenceSummary) {
  if (Number(s?.chain?.breachPrimary || 0) >= 1) return true;
  if (Number(s?.chain?.successBackup || 0) >= 1) return true;
  if (s?.t06?.route === "BACKUP") return true;
  if (s?.t06?.fault?.ok === true) return true;
  return false;
}

function occupancyLabel(s?: EvidenceSummary) {
  return String(s?.closed?.status || s?.occupancyStatus || s?.settlement?.status || "").toLowerCase();
}

export function runHeadline(s?: EvidenceSummary): RunHeadline {
  if (!s) return "recorded";
  if (settledStatus(s)) return "settled";
  if (newOwnerExecuted(s) || transferred(s)) return "transferred";
  if (s.listing?.listingId) return "listed";
  if (Number(s.chain?.status) === CHAIN_STATUS.CLOSED) return "closed";
  const closed = occupancyLabel(s);
  if (closed === "held" || closed === "active" || !closed) {
    if (didFailover(s)) return "held_failover";
  }
  if (closed === "closed") return "closed";
  if (/(fail|error)/i.test(closed)) return "failed";
  return "recorded";
}

export function chainStatusName(status?: number) {
  if (status === CHAIN_STATUS.OPEN) return "open";
  if (status === CHAIN_STATUS.CLOSED) return "closed";
  if (status === CHAIN_STATUS.SETTLED) return "settled";
  return undefined;
}

export function displayStatus(s?: EvidenceSummary): string {
  if (settledStatus(s)) return "settled";
  const onchain = chainStatusName(s?.chain?.status);
  if (onchain === "settled" || onchain === "closed") return onchain;
  const closed = occupancyLabel(s);
  if (closed === "held" || closed === "active") return "held";
  if (closed === "closed" && !settledStatus(s)) return "closed";
  if (onchain === "open") return closed === "held" || closed === "active" ? "held" : "open";
  if (closed && closed !== "held") return closed;
  return "held";
}

export function closedWithoutSettle(s?: EvidenceSummary) {
  return Number(s?.chain?.status) === CHAIN_STATUS.CLOSED && !settledStatus(s);
}

/** @deprecated alias — occupancy may read held, expired, or still active */
export function occupancyHeldWhileClosed(s?: EvidenceSummary) {
  return closedWithoutSettle(s);
}

export function remainingUsed(s?: EvidenceSummary): { remaining?: number; used?: number } {
  const rows = executes(s).filter((row) => typeof row.liveUsed === "number");
  if (!rows.length) return {};
  const last = rows.reduce((best, row) => ((row.liveUsed ?? -1) >= (best.liveUsed ?? -1) ? row : best));
  return { remaining: last.remaining, used: last.liveUsed };
}

export function resultCard(s?: EvidenceSummary) {
  const withId = executes(s).filter((row) => row.requestId).length;
  return {
    requests: withId || executes(s).length,
    failovers: didFailover(s) ? 1 : 0,
    transfers: transferred(s) ? 1 : 0,
    settled: settledStatus(s),
  };
}

export function failoverRoute(s?: EvidenceSummary) {
  if (didFailover(s)) {
    if (s?.t06?.route) return s.t06.route;
    if (Number(s?.chain?.successBackup || 0) >= 1) return "BACKUP";
  }
  return s?.t21?.route || s?.t06?.route || s?.t05?.route || (executes(s).length ? "PRIMARY" : undefined);
}

export function thisRunEconomics(s?: EvidenceSummary) {
  const { remaining, used } = remainingUsed(s);
  if (remaining == null || used == null) return null;
  const quantity = remaining + used;
  const unit = 0.01;
  const fee = 0.02;
  const penalty = Number(s?.chain?.breachPrimary || 0) * 0.02;
  const executionEscrow = quantity * unit;
  const providerPay = used * unit;
  const unusedRefund = remaining * unit;
  return {
    quantity,
    remaining,
    used,
    buyerPrepaid: executionEscrow + fee + fee,
    reservationFees: fee + fee,
    executionEscrow,
    providerPay,
    unusedRefund,
    failoverPenalty: penalty,
    transferPrice: transferred(s) ? 0.15 : 0,
    escrowConserved: Math.abs(providerPay + unusedRefund - executionEscrow) < 1e-9,
  };
}

export function feeIdentity(econ: NonNullable<ReturnType<typeof thisRunEconomics>>, template: string) {
  return template
    .replace("{prepaid}", econ.buyerPrepaid.toFixed(2))
    .replace("{fees}", econ.reservationFees.toFixed(2))
    .replace("{pay}", econ.providerPay.toFixed(2))
    .replace("{refund}", econ.unusedRefund.toFixed(2));
}

export function t30Reading(s?: EvidenceSummary) {
  const raw = s?.t30;
  if (!raw) return null;
  const wallet = raw.walletLevelSharedRegistry;
  const isolated = raw.isolatedHardhatT30;
  const ok = wallet?.ok ?? raw.ok;
  const verdict = wallet?.verdict || raw.verdict || (ok ? "MATCH" : "NOT_APPLICABLE");
  return {
    isolatedExpected: isolated?.expected || raw.expected || "590000",
    walletSum: wallet?.sum || raw.sum,
    ok: Boolean(ok),
    verdict,
    conserved: raw.thisCommitment?.conserved,
    remaining: raw.thisCommitment?.remaining,
    used: raw.thisCommitment?.used,
    note:
      wallet?.note ||
      isolated?.note ||
      "Isolated Hardhat T30 (0.59) is not the shared-registry wallet total. ok:false here is not a funds-loss.",
  };
}

function execMeta(row: ExecuteLike | undefined, labels: { remain: string; used: string }) {
  if (!row) return undefined;
  const route = row.route ? ` · ${row.route}` : "";
  return `${labels.remain} ${row.remaining} · ${labels.used} ${row.liveUsed}${route}`;
}

export function formatUnixWindow(start?: number | string, end?: number | string) {
  const s = typeof start === "string" ? Number(start) : start;
  const e = typeof end === "string" ? Number(end) : end;
  if (!s || !e || !Number.isFinite(s) || !Number.isFinite(e)) return undefined;
  const startMs = s > 1e12 ? s : s * 1000;
  const endMs = e > 1e12 ? e : e * 1000;
  const a = new Date(startMs);
  const b = new Date(endMs);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return undefined;
  const isoA = a.toISOString().replace(/\.\d{3}Z$/, "Z");
  const isoB = b.toISOString().replace(/\.\d{3}Z$/, "Z");
  if (isoA.slice(0, 10) === isoB.slice(0, 10)) {
    return `${isoA} → ${isoB.slice(11, 19)} UTC`;
  }
  return `${isoA} → ${isoB}`;
}

export function buildTimeline(
  s: EvidenceSummary | undefined,
  labels: {
    quote: string;
    reserve: string;
    primary: string;
    failover: string;
    faultMissed: string;
    transfer: string;
    after: string;
    close: string;
    notRun: string;
    remain: string;
    used: string;
  },
): TimelineRow[] {
  if (!s) return [];
  const didTransfer = transferred(s);
  const didNewOwner = newOwnerExecuted(s);
  const didSettle = settledStatus(s);
  const failover = didFailover(s);
  const failoverMissed = failover && s.t06?.fault?.ok === false;
  const chainClosed = Number(s.chain?.status) === CHAIN_STATUS.CLOSED || displayStatus(s) === "closed";

  const rows: TimelineRow[] = [
    {
      key: "QUOTE",
      label: labels.quote,
      status: s.quoteId ? "quoted" : undefined,
      meta: s.quoteId,
      tone: s.quoteId ? "ok" : "idle",
      show: true,
    },
    {
      key: "CREATE",
      label: labels.reserve,
      status: s.chain?.createTx ? `#${s.chain.commitmentId}` : undefined,
      meta: s.chain?.createTx,
      href: s.chain?.createTx,
      tone: s.chain?.createTx ? "ok" : "idle",
      show: true,
    },
    {
      key: "PRIMARY",
      label: labels.primary,
      status: s.t05?.status,
      meta: execMeta(s.t05, labels),
      tone: s.t05?.status ? (/fail/i.test(s.t05.status) ? "bad" : "ok") : "idle",
      show: true,
    },
    {
      key: "FAILOVER",
      label: failoverMissed ? labels.faultMissed : labels.failover,
      status: s.t06?.status,
      meta: execMeta(s.t06, labels),
      tone: !s.t06?.status ? "idle" : failoverMissed ? "ok" : "warn",
      show: failover,
    },
    {
      key: "CALL_2",
      label: labels.primary,
      status: s.t06?.status,
      meta: execMeta(s.t06, labels),
      tone: s.t06?.status ? (/fail/i.test(s.t06.status) ? "bad" : "ok") : "idle",
      show: Boolean(s.t06?.status || s.t06?.requestId) && !failover,
    },
    {
      key: "CALL_3",
      label: labels.primary,
      status: s.t21?.status,
      meta: execMeta(s.t21, labels),
      tone: s.t21?.status ? (/fail/i.test(s.t21.status) ? "bad" : "ok") : "idle",
      show: Boolean(s.t21?.requestId) && !didNewOwner,
    },
    {
      key: "TRANSFER",
      label: labels.transfer,
      status: didTransfer ? "transferred" : labels.notRun,
      href: (s.transfer || s.bought)?.buyTx || (s.transfer || s.bought)?.txHash,
      tone: didTransfer ? "ok" : "idle",
      show: didTransfer,
    },
    {
      key: "NEW_OWNER",
      label: labels.after,
      status: didNewOwner ? s.t21?.status : labels.notRun,
      meta: didNewOwner && s.t21 ? execMeta(s.t21, labels) : undefined,
      tone: didNewOwner ? "ok" : "idle",
      show: didNewOwner,
    },
    {
      key: "CLOSE",
      label: labels.close,
      status: "closed",
      href: s.chain?.closed?.txHash,
      tone: "ok",
      show: chainClosed && !didSettle,
    },
    {
      key: "SETTLE",
      label: labels.close,
      status: didSettle ? s.closed?.status || "settled" : labels.notRun,
      href: s.settlement?.settleTx || s.closed?.chain?.settled?.txHash,
      tone: didSettle ? "ok" : "idle",
      show: didSettle,
    },
  ];
  return rows.filter((r) => r.show);
}
