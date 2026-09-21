# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-e8e4dc?style=for-the-badge&color=6b6560" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-0B57D0?style=for-the-badge" /></a>
</p>

**在需要之前，先预订 Agent 服务容量。**

Commit 让 Agent 锁定未来的服务窗口、数量、SLA 和备用服务商，并在 X Layer 上完成有保证金的执行与结算。

> 一个 Agent 明天 09:00–12:00 UTC 需要搜索容量。  
> Commit **今天**就把这个窗口订下来。  
> 主路错过 8 秒应答 SLA，已缴保证金的备用接手。

这是**产能远期原语**，不是聊天机器人，也不是 cron。报价不等于预订。占用是排他的。

**[线上产品 →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer 测试网 **1952** · 非主网

![预订未来 ASP 容量](docs/assets/01-home.png)

## 一笔承诺，完整生命周期

测试网实盘、**同一条** run：[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d)。

```text
已预订  20 个搜索单位
   ↓
主路执行
   ↓
主路错过 8 秒 SLA     ← 受控故障测试
   ↓
Nova 接手
   ↓
主路保证金扣罚         0.10 → 0.08 tCOM
   ↓
转让剩余 17 单位
   ↓
新所有人执行
   ↓
已结算
```

**[查看线上证据 →](https://commit.jibai.site/evidence/run_510deba24b1d)**

| 承诺 | Search v1 · 1952 上 #5 |
| --- | --- |
| 窗口 | 2026-09-19 11:37:47 → 11:47:47 UTC |
| 容量 | 20 次调用 |
| 剩余 | **17 / 20** |
| 主路 / 备用 | SearchNode / Nova |
| SLA | 主路尝试 ≤ 8 秒 |
| 预付 | 0.24 tCOM（无价值） |
| 状态 | **已结算** |

![协议证据](docs/assets/07-protocol-evidence.png)

**预订 → 执行 → 故障切换 → 转让 → 结算。** 8 秒是主路单次尝试时限，不是端到端完成时间。

本笔资金：预付 0.24 = 费用 0.04 + 执行 0.03 + 未用托管 0.17。补偿 0.02 来自主路**保证金**，不是执行托管。转让 0.15 是新所有人另付。**可领取 ≠ 已经提现。**

![结算拆分](docs/assets/08-settlement-breakdown.png)

## 报价不是座位

已上架服务 **Commit Capacity Quote**（#13781）返回下一个未来窗口、两家服务商、超时和全价。确认是另一步。同一窗口第二次创建返回 `NO_CAPACITY`。

![带未来窗口的报价](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

## 交付证据（另一笔 run）

[`run_429d2129ab1e`](https://commit.jibai.site/agent) 保存了固定公开语料上的 search.v1 正文（EIP-712、RFC 2119、X Layer）。该笔**没有**关闭/结算。上面的协议跑没有保留响应正文。**不要把两笔剪成一笔。**

![保存的检索结果](docs/assets/05-delivered-search-results.png)

## 朝远期市场走，但还不是交易所

Commit 在建设 Agent 产能的**远期市场**。当前原型证明的是核心原语：

**可转让、有保证金的未来容量承诺。**

它还不是传统远期交易所：没有订单簿、没有价格发现、没有多家独立供应商竞争、没有二级流动性市场。

今天 SearchNode 和 Nova 由**项目运营**，以便把生命周期跑通。第三方 ASP 的接入面是 execute 契约，还不是自助开市。

## 作为服务商接入（约 20 行）

暴露 `POST /execute`。谁是主路/备用、占用锁定仍由 Commit 配置。

```ts
import { handleExecute } from "@commit/provider-sdk";

const { statusCode, json } = await handleExecute(body, {
  providerId: "acme-search",
  search: async (query) => mySearch(query), // { title, sourceUrl, snippet, recordId }[]
});
```

可运行包装：`packages/provider-sdk/examples/readonly-http-adapter.mjs`。契约：`docs/provider-contract.md`。页面：https://commit.jibai.site/adapter

## 各层分工

| 层 | 作用 |
| --- | --- |
| **OKX AI** | 发现与已上架报价 |
| **Commit** | 条款、预订、执行、证据 |
| **X Layer 1952** | 托管、保证金、检查点、转让、结算 |
| **接入的 ASP** | 实际服务（这里是 Search v1） |

## 原型范围

tCOM 无价值。非商业主网。非 x402。非部分拆分。非去中心化仲裁。截图来自 2026-09-21 线上英文页（裁掉导航；未改写页面文案）。

| | |
| --- | --- |
| 产品 | https://commit.jibai.site/ |
| 证据（协议） | https://commit.jibai.site/evidence/run_510deba24b1d |
| 证据（交付） | https://commit.jibai.site/agent |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| 登记合约 | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |
| Sourcify | 两份合约 exact_match |
| 演示视频 | 尚未发布 |

局限：`docs/known-limitations.md`。条款：`docs/protocol-terms.md`。架构：`docs/architecture.md`。

## 本地快速开始

Hardhat 不需要私钥。默认不会连主网 196 或生产库。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run doctor
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test:contracts
corepack pnpm build
corepack pnpm demo:local
```

栈还在跑时打开 http://127.0.0.1:3000/evidence/local（仅本地）。`demo:local` 用 Hardhat **31337**。比赛链是 **1952**。
