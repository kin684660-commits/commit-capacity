import { parseTcom } from "./money.js";

export const DEMO = {
  quantity: 20,
  windowSeconds: 10 * 60,
  minLeadSeconds: 60,
  maxConcurrency: 1,
  minIntervalMs: 1000,
  attemptTimeoutMs: 8000,
  injectedPrimaryDelayMs: 11000,
  maxAttempts: 2,
  quoteTtlSeconds: 60,
  reservationTtlSeconds: 120,
  graceAfterEndSeconds: 10 * 60,
  unitPrice: parseTcom("0.01"),
  primaryReservationFee: parseTcom("0.02"),
  backupReservationFee: parseTcom("0.02"),
  buyerTotal: parseTcom("0.24"),
  bondPerProvider: parseTcom("0.10"),
  penaltyPerAttempt: parseTcom("0.02"),
  transferPrice: parseTcom("0.15"),
  schemaVersion: "search.v1",
  serviceClass: "search",
  chainId: 1952,
  primaryName: "SearchNode",
  backupName: "Nova",
} as const;

export function executionBudget(quantity: number = DEMO.quantity): bigint {
  return DEMO.unitPrice * BigInt(quantity);
}

export function buyerDeposit(quantity: number = DEMO.quantity): bigint {
  return executionBudget(quantity) + DEMO.primaryReservationFee + DEMO.backupReservationFee;
}
