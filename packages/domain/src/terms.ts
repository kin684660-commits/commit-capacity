import { keccak256, encodeAbiParameters } from "viem";
import { DEMO } from "./params.js";

export type Terms = {
  schemaVersion: string;
  serviceClass: string;
  quantity: bigint;
  start: bigint;
  end: bigint;
  maxConcurrency: bigint;
  minIntervalMs: bigint;
  attemptTimeoutMs: bigint;
  maxAttempts: bigint;
  primaryName: string;
  backupName: string;
  chainId: bigint;
  asset: `0x${string}`;
  unitPrice: bigint;
  primaryReservationFee: bigint;
  backupReservationFee: bigint;
  bondPerProvider: bigint;
  penaltyPerAttempt: bigint;
  termsVersion: string;
};

const TERMS_ABI = [
  { type: "string", name: "schemaVersion" },
  { type: "string", name: "serviceClass" },
  { type: "uint256", name: "quantity" },
  { type: "uint64", name: "start" },
  { type: "uint64", name: "end" },
  { type: "uint32", name: "maxConcurrency" },
  { type: "uint32", name: "minIntervalMs" },
  { type: "uint32", name: "attemptTimeoutMs" },
  { type: "uint32", name: "maxAttempts" },
  { type: "string", name: "primaryName" },
  { type: "string", name: "backupName" },
  { type: "uint256", name: "chainId" },
  { type: "address", name: "asset" },
  { type: "uint256", name: "unitPrice" },
  { type: "uint256", name: "primaryReservationFee" },
  { type: "uint256", name: "backupReservationFee" },
  { type: "uint256", name: "bondPerProvider" },
  { type: "uint256", name: "penaltyPerAttempt" },
  { type: "string", name: "termsVersion" },
] as const;

export function demoTerms(overrides: Partial<Terms> = {}): Terms {
  const now = 1_800_000_000n;
  return {
    schemaVersion: DEMO.schemaVersion,
    serviceClass: DEMO.serviceClass,
    quantity: BigInt(DEMO.quantity),
    start: now + 60n,
    end: now + 60n + BigInt(DEMO.windowSeconds),
    maxConcurrency: BigInt(DEMO.maxConcurrency),
    minIntervalMs: BigInt(DEMO.minIntervalMs),
    attemptTimeoutMs: BigInt(DEMO.attemptTimeoutMs),
    maxAttempts: BigInt(DEMO.maxAttempts),
    primaryName: DEMO.primaryName,
    backupName: DEMO.backupName,
    chainId: BigInt(DEMO.chainId),
    asset: "0x1111111111111111111111111111111111111111",
    unitPrice: DEMO.unitPrice,
    primaryReservationFee: DEMO.primaryReservationFee,
    backupReservationFee: DEMO.backupReservationFee,
    bondPerProvider: DEMO.bondPerProvider,
    penaltyPerAttempt: DEMO.penaltyPerAttempt,
    termsVersion: "v0.1",
    ...overrides,
  };
}

export function encodeTerms(terms: Terms): `0x${string}` {
  return encodeAbiParameters(TERMS_ABI, [
    terms.schemaVersion,
    terms.serviceClass,
    terms.quantity,
    terms.start,
    terms.end,
    Number(terms.maxConcurrency),
    Number(terms.minIntervalMs),
    Number(terms.attemptTimeoutMs),
    Number(terms.maxAttempts),
    terms.primaryName,
    terms.backupName,
    terms.chainId,
    terms.asset,
    terms.unitPrice,
    terms.primaryReservationFee,
    terms.backupReservationFee,
    terms.bondPerProvider,
    terms.penaltyPerAttempt,
    terms.termsVersion,
  ]);
}

export function termsHash(terms: Terms): `0x${string}` {
  return keccak256(encodeTerms(terms));
}

export function windowFitsQuantity(terms: Terms): boolean {
  const windowMs = Number(terms.end - terms.start) * 1000;
  const worstMs = Number(terms.quantity) * Number(terms.minIntervalMs) + Number(terms.attemptTimeoutMs) * 2;
  return windowMs >= worstMs;
}
