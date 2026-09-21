# Protocol terms (P0)

Numbers below are the **standard play**, not a commercial quote. Asset is tCOM (6 decimals, no value).

**Canonical buyer create payment:**

```text
quantity × unitPrice + primaryReservationFee + backupReservationFee
= 20 × 0.01 + 0.02 + 0.02
= 0.24 tCOM buyerTotal
```

Do not use 0.22 for buyer create. 0.22 would omit one reservation fee. Historical runs that used different quantities must be labelled with their `runId`.

## Window and quantity

- Quantity: 20 units
- Unit price: 0.01 tCOM
- Execution escrow: 0.20 tCOM
- Reservation fees: 0.02 + 0.02 tCOM
- Buyer total at create: **0.24 tCOM**
- Primary + backup bonds: 0.10 tCOM each
- Response deadline: 8 seconds per attempt
- Max attempts: 2
- Penalty: 0.02 tCOM per bonded miss
- Min lead: 60 seconds before window start (`COMMIT_MIN_LEAD_SECONDS`)

## Standard play T30 (0.59 tCOM conserved — local Hardhat run)

This 0.59 figure is the **local demo conserved sum** (create inflows + bonds + transfer price), not the buyer create payment:

1. Buyer pays **0.24** at create (0.20 execution + 0.04 fees).
2. Three successful logical requests (T05 + T06 failover + post-transfer T21) burn 3 units; remaining **17**.
3. Primary timeout once → 0.02 penalty from primary bond.
4. Whole remaining listed to a designated buyer at **0.15**.
5. Early close + settle. Conserved demo sum: **0.59 = 0.24 buyer + 0.20 bonds + 0.15 transfer**.

Exact local demo (2026-09-17, Hardhat 31337): remaining 17, used 3, claimable 590000 (6-decimal integer). Do not mix this with a 1952 HTTPS run that used a different quantity.

## Quote vs reservation

A quote is a signed snapshot of available capacity and price. It does not lock pools. Reservation uses a dual-pool occupancy transaction. Expired quotes cannot create.

## Transfer

Whole remaining entitlement only. Freeze, drain in-flight, LIST to a named buyer, atomic buy, epoch bump. Partial splits are out of scope.

## SLA judgment

Commit Verifier signs checkpoints. Late primary success after backup already succeeded does not add usage. Both providers failing restores the unit.

## PenaltyAccrued event (v0.1 deployed)

Deployed registry emits `PenaltyAccrued(0, provider, amount)` — the commitment id in that event is always `0`. Prove a penalty with `CheckpointApplied`, breach counters, and bond/claimable deltas for that commitment. Fix is v0.2; this contest keeps the current 1952 address.
