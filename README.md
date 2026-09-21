# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-0B57D0?style=for-the-badge" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-e8e4dc?style=for-the-badge&logoColor=111111&color=6b6560" /></a>
</p>

**Reserve AI agent capacity before you need it.**

Commit lets agents lock a future service window, quantity, SLA and backup provider — with bonded execution and settlement on X Layer.

> An agent needs search capacity tomorrow, 09:00–12:00 UTC.  
> Commit reserves that window **today**.  
> If the primary misses the 8-second attempt SLA, the bonded backup takes over.

This is a **forward capacity primitive**, not a chatbot and not a cron. A quote is not a reservation. Occupancy is exclusive.

**[Live product →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer testnet **1952** · not mainnet

![Book future ASP capacity](docs/assets/01-home.png)

## One commitment. Full lifecycle.

Recorded on the live testnet as **one** run: [`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d).

```text
RESERVED  20 search units
   ↓
PRIMARY EXECUTION
   ↓
PRIMARY MISSED 8s SLA     ← controlled fault test
   ↓
NOVA FAILOVER
   ↓
PRIMARY BOND SLASHED      0.10 → 0.08 tCOM
   ↓
17 UNITS TRANSFERRED
   ↓
NEW OWNER EXECUTED
   ↓
SETTLED
```

**[View live evidence →](https://commit.jibai.site/evidence/run_510deba24b1d)**

| Commitment | Search v1 · #5 on 1952 |
| --- | --- |
| Window | 2026-09-19 11:37:47 → 11:47:47 UTC |
| Capacity | 20 calls |
| Remaining | **17 / 20** |
| Primary / backup | SearchNode / Nova |
| SLA | ≤ 8 s primary attempt |
| Prepaid | 0.24 tCOM (no value) |
| Status | **SETTLED** |

![Protocol evidence](docs/assets/07-protocol-evidence.png)

**Reserve → Execute → Failover → Transfer → Settle.** Eight seconds is the primary attempt deadline, not end-to-end latency.

Funds on this run: 0.24 prepaid = 0.04 fees + 0.03 execution + 0.17 unused escrow. 0.02 compensation came from the primary **bond**, not from escrow. 0.15 transfer is a separate payment from the new owner. **Claimable is not a completed withdrawal.**

![Settlement](docs/assets/08-settlement-breakdown.png)

## A quote is not a seat

The listed service **Commit Capacity Quote** (#13781) returns the next future window, both providers, the timeout, and the full price. Confirmation is a separate step. A second create on the same window returns `NO_CAPACITY`.

![Future-window quote](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

## Delivery evidence (separate run)

[`run_429d2129ab1e`](https://commit.jibai.site/agent) stored search.v1 bodies from a fixed public corpus (EIP-712, RFC 2119, X Layer). It did **not** close/settle. The protocol run above did not keep response bodies. **Do not splice the two.**

![Stored search hits](docs/assets/05-delivered-search-results.png)

## Toward a forward market

Commit is building toward a **forward market for agent capacity**. This prototype demonstrates the core primitive:

**transferable, bonded, future-capacity commitments.**

It is not yet a traditional forward exchange: no order book, no price discovery, no open set of competing independent suppliers, no secondary liquidity venue.

Today SearchNode and Nova are **project-operated** so the lifecycle can be shown end-to-end. The join surface for a third ASP is the execute contract — not a self-serve marketplace yet.

## Join as a provider (~20 lines)

Expose `POST /execute`. Commit still configures who is primary/backup and holds occupancy.

```ts
import { handleExecute } from "@commit/provider-sdk";

const { statusCode, json } = await handleExecute(body, {
  providerId: "acme-search",
  search: async (query) => mySearch(query), // { title, sourceUrl, snippet, recordId }[]
});
```

Runnable wrapper: `packages/provider-sdk/examples/readonly-http-adapter.mjs`. Contract: `docs/provider-contract.md`. Page: https://commit.jibai.site/adapter

## Where each layer sits

| Layer | Role |
| --- | --- |
| **OKX AI** | Discovery and listed quote |
| **Commit** | Terms, reservation, execution, evidence |
| **X Layer 1952** | Escrow, bonds, checkpoints, transfer, settle |
| **Participating ASP** | The actual service (here: Search v1) |

## Prototype scope

tCOM has no value. Not commercial mainnet. Not x402. Not partial splits. Not decentralized arbitration. Screenshots are cropped from the live English UI on 21 Sep 2026 (nav removed; page copy not rewritten).

| | |
| --- | --- |
| Product | https://commit.jibai.site/ |
| Evidence (protocol) | https://commit.jibai.site/evidence/run_510deba24b1d |
| Evidence (delivery) | https://commit.jibai.site/agent |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| Registry | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |
| Sourcify | exact_match on both contracts |
| Demo video | not published yet |

Limitations: `docs/known-limitations.md`. Terms: `docs/protocol-terms.md`. Architecture: `docs/architecture.md`.

## Local quick start

No private keys for Hardhat. Defaults never touch mainnet 196 or the production database.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run doctor
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test:contracts
corepack pnpm build
corepack pnpm demo:local
```

Then http://127.0.0.1:3000/evidence/local while the stack is running (local-only). `demo:local` uses Hardhat **31337**. Contest chain is **1952**.
