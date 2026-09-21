# Commit

**Book future ASP capacity. Plan your next task.**

A service being listed now does not mean it can deliver when an agent needs it later. Commit lets a buyer reserve a **future window**, a **quantity**, and **delivery terms** — then review what actually happened: execution, backup, transfer, and settlement.

Live product: **[commit.jibai.site](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer testnet **1952** · not mainnet.

![Homepage — Book future ASP capacity](docs/assets/01-home.png)

中文：上架只是开始，按约定时间交付才是难点。Commit 预订的是未来一段时间的 Agent 服务容量（窗口、数量、SLA）。主路超时，已缴保证金的备用接手。这是测试网实盘原型，不是主网商业服务。

## After a service is listed, delivery is the hard part

Commit comes from operating an ASP. The working question is simple:

> Can we reserve future service capacity, agree on delivery terms, and review the record?

A **quote is not a reservation.** Occupancy is exclusive. A second create on the same window returns `NO_CAPACITY`. A cron can remind you to call; it cannot invent a free seat.

## Live quote — a future window, not a chatbot

The buyer calls **Commit Capacity Quote**, listed on OKX AI. This demo assigns the **next available future window**. The quote shows start/end (UTC), primary and backup, the 8-second primary attempt timeout, and the full price.

Confirmation is a separate step: occupancy hold, wallet sign-in, then create on the registry.

![Listed quote with a future window](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote · ASP **#13781**

The screenshot is a real English-page capture from 21 Sep 2026 (`qte_552aa2f75f81c697`). That window was an example at capture time, not a standing offer.

## Two recorded examples — kept separate

Do not splice these into one run. They prove different things.

### 1. Protocol — failover, transfer, settle

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) reserved 20 search units. Across three calls the primary returned twice. In a **controlled fault test**, the primary missed the **8-second** attempt deadline and **Nova** returned the result. Eight seconds is the primary deadline, not end-to-end completion time.

The remaining entitlement was transferred, the new owner called once, then the commitment closed and settled.

![Protocol evidence — remaining 17 / used 3 / settled](docs/assets/07-protocol-evidence.png)

**Funds on that run (tCOM has no value):** 0.24 prepaid = 0.04 reservation fees + 0.03 execution + 0.17 unused escrow. 0.02 compensation came from the primary bond, not from execution escrow. 0.15 transfer is a separate payment from the new owner. **Claimable is not a completed withdrawal.**

![Settlement breakdown](docs/assets/08-settlement-breakdown.png)

### 2. Delivery — saved search results

[`run_429d2129ab1e`](https://commit.jibai.site/agent) stored search.v1 bodies from a **fixed public corpus** (EIP-712, RFC 2119, X Layer). That run did **not** complete close/settlement. The protocol run did not retain response bodies.

![Stored search hits from the delivery run](docs/assets/05-delivered-search-results.png)

## Where each layer sits

| Layer | Role |
| --- | --- |
| **OKX AI** | Discovery and the listed quote (#13781) |
| **Commit** | Terms, reservation, execution, evidence |
| **X Layer 1952** | Escrow, bonds, checkpoints, transfer, settle |
| **Participating ASP** | The actual service (here: Search v1) |

The same record is meant to help providers see missed commitments and backup recoveries, then adjust what they promise. That loop is the **goal**. One controlled sample is not a production uptime claim.

## Prototype scope

- Single service class (Search v1), two **project-operated** providers (SearchNode / Nova), Commit-operated verifier
- Free listed quote, whole remaining entitlement transfer, public evidence page
- **tCOM** has no value · **not** commercial mainnet 196 · **not** x402 · **not** partial splits · **not** decentralized arbitration
- Screenshots above are cropped from the live English UI (nav, including the language switch, removed). Page copy was not rewritten.

| | |
| --- | --- |
| Product | https://commit.jibai.site/ |
| Reserve | https://commit.jibai.site/reserve |
| Provider contract | https://commit.jibai.site/adapter |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| Registry | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |
| Sourcify | exact_match on both contracts |
| Demo video | not published yet |
| This repo | public source for the product above |

Known limitations: `docs/known-limitations.md`. Terms: `docs/protocol-terms.md`.

## Local quick start

No private keys required for Hardhat. Defaults never connect mainnet 196 or the production database.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run doctor
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test:contracts
corepack pnpm build
corepack pnpm demo:local
```

Then open http://127.0.0.1:3000/evidence/local while the demo stack is still running (`/evidence/local` is **local-only**).

`demo:local` boots **Hardhat 31337**, then execute → failover → transfer → settle on that local chain. Contest chain is **1952**.

Wallets, `.env`, and `.local/` are gitignored on purpose. Clone and the commands above are enough.

## Docs

- Spec: `docs/HANDBOOK.md`
- Architecture: `docs/architecture.md`
- OKX listing: `docs/OKX-INTEGRATION.md`
- Tests: `docs/QA_REPORT.md`
- Deploy: `docs/deployment.md`
