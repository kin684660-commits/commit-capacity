# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-e8e4dc?style=for-the-badge&color=6b6560" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-0B57D0?style=for-the-badge" /></a>
</p>

**预订未来的 ASP 容量。安排下一步任务。**

我做过 Agent 服务商（ASP）。实际教训是：服务现在能接，不代表 Agent 以后需要时还能按约定交付。

Commit 只问一件事：能不能预订未来的服务容量，谈好交付条款，并事后核对真正发生了什么？

**[线上原型 →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer 测试网 **1952** · 非主网

![首页](docs/assets/01-home.png)

## 上架只是开始，交付才是难点

买方通过 OKX AI 已上架的 **Commit Capacity Quote** 请求搜索容量。这个演示会自动分配**下一个可预订的未来窗口**。报价给出起止时间、主路和备用、应答时限和价格。

仅有报价不会锁定容量。确认是另一步。

![带未来窗口的报价](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

截图是 2026-09-21 的真实采集。那个报价窗口是采集当时的例子，不是长期有效承诺。画面页脚仍写着仓库未公开 — 现在就是本仓库。

## 两笔已记录的例子 — 分开讲

它们证明系统的不同部分。不要剪成同一笔。

### 1. 协议跑 · 受控故障测试

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) 预订了 20 个搜索单位。三次调用里，主路成功两次。受控故障测试中，主路错过 **8 秒**应答时限，备用返回了结果。8 秒是主路时限，不是整笔完成时间。

剩余权益随后转让，新所有人又调用了一次，然后关闭并结算。证据页把已上架报价、预订、请求和 X Layer 测试网交易连在一起。

![协议证据](docs/assets/07-protocol-evidence.png)

预付 **0.24** 测试代币：预订费 **0.04**、执行 **0.03**、未用托管 **0.17**。补偿另自主路保证金出。可领取余额不等于已经提现。

![结算拆分](docs/assets/08-settlement-breakdown.png)

### 2. 交付跑 · 固定语料

[`run_429d2129ab1e`](https://commit.jibai.site/agent) 保存了检索结果：EIP-712、RFC 2119、X Layer 网络信息，来自**固定公开语料**。这一笔没有完成关闭和结算。协议跑没有保留响应正文。

![保存的检索结果](docs/assets/05-delivered-search-results.png)

## 给服务商看的记录

同一份记录能看见错过的承诺和备用接手。目标是帮助服务商调整承诺、改善交付。这一小次受控样本**不能**当成生产可用性提升。

## 各层分工

| 层 | 作用 |
| --- | --- |
| **OKX AI** | 发现与已上架报价 |
| **Commit** | 预订与执行 |
| **X Layer 1952** | 链上条款与结算轨迹 |
| **接入的 ASP** | 实际服务（这里是 Search v1） |

今天主路、备用和验证器由**项目运营**，测试代币 **tCOM 无价值**。

Commit：预订未来容量，安排下一步任务，核对交付记录。

| | |
| --- | --- |
| 产品 | https://commit.jibai.site/ |
| 协议证据 | https://commit.jibai.site/evidence/run_510deba24b1d |
| 交付证据 | https://commit.jibai.site/agent |
| 服务商契约 | https://commit.jibai.site/adapter |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| 登记合约 | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |
| 演示视频 | 尚未发布 |

局限：`docs/known-limitations.md`。条款：`docs/protocol-terms.md`。接入契约：`docs/provider-contract.md`。

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
