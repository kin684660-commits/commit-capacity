import { DEMO } from "./params.js";

export type ReasonCode =
  | "OK"
  | "TIMEOUT"
  | "HTTP_5XX"
  | "INVALID_SCHEMA"
  | "BUYER_INPUT"
  | "RATE_LIMITED"
  | "OUTSIDE_WINDOW"
  | "COMMIT_UNAVAILABLE"
  | "COMMIT_BUG"
  | "UNCLEAR";

export function isProviderAttributable(code: ReasonCode): boolean {
  return code === "TIMEOUT" || code === "HTTP_5XX" || code === "INVALID_SCHEMA";
}

export function classifyAttempt(opts: {
  startedAtMs: number;
  finishedAtMs: number;
  abortedAtMs?: number;
  httpStatus?: number;
  schemaOk: boolean;
  buyerInputOk: boolean;
  insideWindow: boolean;
}): { reason: ReasonCode; lateResponse: boolean; countsAsSuccess: boolean } {
  if (!opts.buyerInputOk) {
    return { reason: "BUYER_INPUT", lateResponse: false, countsAsSuccess: false };
  }
  if (!opts.insideWindow) {
    return { reason: "OUTSIDE_WINDOW", lateResponse: false, countsAsSuccess: false };
  }
  const abortedAt = opts.abortedAtMs;
  const aborted = abortedAt !== undefined;
  const duration = opts.finishedAtMs - opts.startedAtMs;
  const late = aborted && opts.finishedAtMs > abortedAt;
  if (aborted || duration >= DEMO.attemptTimeoutMs) {
    return { reason: "TIMEOUT", lateResponse: late, countsAsSuccess: false };
  }
  if (opts.httpStatus && opts.httpStatus >= 500) {
    return { reason: "HTTP_5XX", lateResponse: false, countsAsSuccess: false };
  }
  if (!opts.schemaOk) {
    return { reason: "INVALID_SCHEMA", lateResponse: false, countsAsSuccess: false };
  }
  return { reason: "OK", lateResponse: false, countsAsSuccess: true };
}
