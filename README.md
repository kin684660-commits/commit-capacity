# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-0B57D0?style=for-the-badge" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-e8e4dc?style=for-the-badge&color=6b6560" /></a>
</p>

**Reserve a future OKX AI service. Give the ASP a delivery record.**

Commit does two things.

1. **Reserve ahead.** An agent books a future window on a service listed on OKX AI — quantity, attempt deadline, primary and backup — before the task needs it. A quote is not a reservation.
2. **Make delivery something an ASP can improve.** The same commitment records a miss, a backup takeover, and a bond penalty. The provider sees what it failed to hold and can change what it promises next. This testnet sample shows that loop. It does not claim production uptime has already gone up.

**[Live prototype →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer testnet **1952** · not mainnet

![Homepage](docs/assets/01-home.png)

## 1. Reserve a future OKX AI service

The buyer calls **Commit Capacity Quote**, listed on OKX AI. This demo assigns the **next available future window**. The quote shows start and end, primary and backup, the attempt timeout, and the price. Confirmation is a separate step.

![Future-window quote](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

The screenshots are real captures from 21 Sep 2026. The quoted window was an example at capture time, not a standing offer. The footer in those frames still says the source repo was unpublished — it is now this repository.

## 2. A record the ASP can act on

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) is one commitment that shows both lines.

It reserved twenty search units. Across three calls the primary returned twice. In a controlled fault test the primary missed its **eight-second** attempt deadline and the backup returned the result. Eight seconds is the primary deadline, not the total completion time. The miss, the backup, and the bond penalty are the provider record: what was promised, what was missed, what it cost.

The remaining entitlement was transferred, the new owner called once, and the commitment was closed and settled.

![Protocol evidence](docs/assets/07-protocol-evidence.png)

Of the **0.24** test tokens prepaid: **0.04** reservation fees, **0.03** execution, **0.17** unused escrow. Compensation came from the primary provider's bond. A claimable balance is not a completed withdrawal.

![Settlement breakdown](docs/assets/08-settlement-breakdown.png)

A second run, [`run_429d2129ab1e`](https://commit.jibai.site/agent), stores what the service actually returned: EIP-712, RFC 2119, and X Layer network information, from a **fixed public corpus**. That run did not close or settle. The run above did not keep response bodies. They are two different records.

![Saved search results](docs/assets/05-delivered-search-results.png)

## Where each layer sits

| Layer | Role |
| --- | --- |
| **OKX AI** | Discovery and the listed service being reserved |
| **Commit** | The future window, and the delivery record |
| **X Layer 1952** | Escrow, bonds, and settlement |
| **Participating ASP** | The service itself (here: Search v1) |

Today the primary, backup, and verifier are **project-operated**. **tCOM has no value.**

| | |
| --- | --- |
| Product | https://commit.jibai.site/ |
| Reservation + delivery record | https://commit.jibai.site/evidence/run_510deba24b1d |
| Saved search results | https://commit.jibai.site/agent |
| Provider contract | https://commit.jibai.site/adapter |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| Registry | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |

Limitations: `docs/known-limitations.md`. Terms: `docs/protocol-terms.md`. Join contract: `docs/provider-contract.md`.

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
