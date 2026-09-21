import { DEMO, buyerDeposit, executionBudget } from "./params.js";
import { demoTerms, termsHash, windowFitsQuantity, type Terms } from "./terms.js";

export type QuoteInput = {
  serviceClass?: string;
  quantity?: number;
  window?: { start: string; end: string };
  asset?: `0x${string}`;
  minLeadSeconds?: number;
  chainId?: number;
};

export type QuoteErrorCode = "INVALID_INPUT" | "OUTSIDE_WINDOW";

export function unixFromIso(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error("INVALID_INPUT");
  return Math.floor(ms / 1000);
}

export function isoFromUnix(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

export function buildQuoteTerms(input: QuoteInput, nowSec: number): Terms | { error: QuoteErrorCode; message: string } {
  const serviceClass = input.serviceClass ?? DEMO.serviceClass;
  if (serviceClass !== DEMO.serviceClass) {
    return { error: "INVALID_INPUT", message: "only search is available in v0.1" };
  }
  const quantity = input.quantity ?? DEMO.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > DEMO.quantity) {
    return { error: "INVALID_INPUT", message: "quantity must be 1..20" };
  }
  const minLead = input.minLeadSeconds ?? DEMO.minLeadSeconds;
  const start = input.window?.start ? unixFromIso(input.window.start) : nowSec + minLead;
  const end = input.window?.end ? unixFromIso(input.window.end) : start + DEMO.windowSeconds;
  if (end <= start) {
    return { error: "INVALID_INPUT", message: "window end must be after start" };
  }
  if (start < nowSec + minLead) {
    return { error: "OUTSIDE_WINDOW", message: `must reserve at least ${minLead} seconds ahead` };
  }
  const terms = demoTerms({
    quantity: BigInt(quantity),
    start: BigInt(start),
    end: BigInt(end),
    asset: input.asset ?? "0x1111111111111111111111111111111111111111",
    chainId: BigInt(input.chainId ?? DEMO.chainId),
  });
  if (!windowFitsQuantity(terms)) {
    return { error: "OUTSIDE_WINDOW", message: "window cannot fit quantity at configured rate and retries" };
  }
  return terms;
}

export function quoteAmounts(quantity: number) {
  return {
    unitPrice: DEMO.unitPrice.toString(),
    executionBudget: executionBudget(quantity).toString(),
    primaryReservationFee: DEMO.primaryReservationFee.toString(),
    backupReservationFee: DEMO.backupReservationFee.toString(),
    buyerTotal: buyerDeposit(quantity).toString(),
    bondPerProvider: DEMO.bondPerProvider.toString(),
  };
}

export function publicQuoteBody(opts: {
  quoteId: string;
  terms: Terms;
  expiresAt: number;
  traceId: string;
  available: boolean;
}) {
  const quantity = Number(opts.terms.quantity);
  return {
    quoteId: opts.quoteId,
    schemaVersion: opts.terms.schemaVersion,
    serviceClass: opts.terms.serviceClass,
    quantity,
    window: { start: isoFromUnix(Number(opts.terms.start)), end: isoFromUnix(Number(opts.terms.end)) },
    limits: { maxConcurrency: Number(opts.terms.maxConcurrency), minIntervalMs: Number(opts.terms.minIntervalMs) },
    sla: { attemptTimeoutMs: Number(opts.terms.attemptTimeoutMs), maxAttempts: Number(opts.terms.maxAttempts) },
    providers: { primary: opts.terms.primaryName, backup: opts.terms.backupName },
    asset: { chainId: Number(opts.terms.chainId), address: opts.terms.asset, decimals: 6 },
    amounts: quoteAmounts(quantity),
    expiresAt: isoFromUnix(opts.expiresAt),
    termsHash: termsHash(opts.terms),
    reservationRequired: true,
    traceId: opts.traceId,
    available: opts.available,
  };
}

export function windowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
