# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-0B57D0?style=for-the-badge" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-e8e4dc?style=for-the-badge&color=6b6560" /></a>
</p>

Commit answers two questions.

1. **I will need an AI service later. Can I book it now?** Yes. Through **Commit Capacity Quote**, listed on OKX AI, a user books a future window on the search service wired into Commit: how many calls, how fast the primary must answer, who backs it up. A quote is not a reservation. This does not book an arbitrary ASP listed on OKX AI.
2. **After the provider promised, how did they actually do — and is there evidence for the next review?** Yes. The same reservation keeps the promise next to what happened: a miss, a backup takeover, a bond penalty. That record is the evidence of stable delivery, for the provider to review next time. Commit does not claim stable delivery has already improved.

**[Live prototype →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer testnet **1952** · not mainnet

![Homepage](docs/assets/01-home.png)

## 1. Can I book it ahead?

The user calls **Commit Capacity Quote**. This demo assigns the next available future window. The quote shows start and end, primary and backup, the attempt timeout, and the price. A quote does not lock a seat. Confirmation does.

![Future-window quote](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

The screenshots are real captures from 21 Sep 2026. The quoted window was an example at capture time, not a standing offer. The footer in those frames still says the source repo was unpublished — it is now this repository.

## 2. How did the promise actually go?

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) keeps the promise and the outcome on one record.

It reserved 20 search calls. Before the transfer, two calls ran: the first returned from the primary; the second was a controlled fault test — the primary missed **8 seconds**, and backup Nova returned the result. Eight seconds is the primary attempt deadline, not the time to finish the whole order.

The remaining **18** calls then moved to another wallet. That wallet succeeded once. **17** remained, and the reservation was closed and settled. Three calls succeeded; 3 were used.

The miss, the backup, and the bond penalty are what a provider reviews: what was promised, what was missed, what it cost.

This demo also shows one extra ability: unused calls can be transferred as a whole to another wallet, which keeps using them through settlement.

![Protocol evidence](docs/assets/07-protocol-evidence.png)

The user prepaid **0.24 tCOM**: **0.04** in reservation fees for both providers, **0.20** in execution escrow. Three successful calls paid **0.03**. **0.17** of unused escrow was returned at settlement. The **0.02** compensation for the primary miss came from that provider's bond, not from execution escrow. The **0.15 tCOM** the new wallet paid to take the transfer is a separate amount, outside the original 0.24. A claimable balance is not a completed withdrawal. tCOM has no value.

![Settlement breakdown](docs/assets/08-settlement-breakdown.png)

A second run, [`run_429d2129ab1e`](https://commit.jibai.site/agent), stores what search actually returned: EIP-712, RFC 2119, and X Layer network information, from a fixed public corpus. That run did not close or settle. The run above did not keep response bodies. They are two different records.

![Saved search results](docs/assets/05-delivered-search-results.png)

## Where each layer sits

| Layer | Role |
| --- | --- |
| **OKX AI** | Discovery and the reservation entry. Commit Capacity Quote is listed. |
| **Commit** | Locks the future window, fails over to backup, and keeps the record used to review stable delivery |
| **X Layer 1952** | Escrow, bonds, and settlement |
| **Participating provider** | Runs Search v1 (SearchNode / Nova in this demo) |

Today the primary, backup, and verifier are project-operated.

| | |
| --- | --- |
| Product | https://commit.jibai.site/ |
| Reservation and delivery record | https://commit.jibai.site/evidence/run_510deba24b1d |
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
