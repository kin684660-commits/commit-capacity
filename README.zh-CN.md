# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-e8e4dc?style=for-the-badge&color=6b6560" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-0B57D0?style=for-the-badge" /></a>
</p>

**预订未来的 OKX AI 服务。让 ASP 留下可改进的交付记录。**

Commit 做两件事。

1. **提前预订。** Agent 在 OKX AI 已上架的服务上，于任务需要之前订下一个未来窗口：数量、应答时限、主路和备用。报价不等于预订。
2. **让交付变成 ASP 能改进的东西。** 同一笔承诺记下失约、备用接手和保证金扣罚。服务商看见自己没守住什么，下次就可以改承诺。这次测试网样本展示的是这条回路，不是声称生产可用性已经提高。

**[线上原型 →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer 测试网 **1952** · 非主网

![首页](docs/assets/01-home.png)

## 1. 预订未来的 OKX AI 服务

买方调用 OKX AI 已上架的 **Commit Capacity Quote**。这个演示会分配**下一个可预订的未来窗口**。报价给出起止时间、主路和备用、应答时限和价格。确认是另一步。

![带未来窗口的报价](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

截图是 2026-09-21 的真实采集。那个报价窗口是采集当时的例子，不是长期有效承诺。画面页脚仍写着仓库未公开 — 现在就是本仓库。

## 2. ASP 能据此改进的记录

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) 是同一笔承诺，两条线都在里面。

它预订了 20 个搜索单位。三次调用里主路成功两次。受控故障测试中，主路错过 **8 秒**应答时限，备用返回了结果。8 秒是主路时限，不是整笔完成时间。失约、备用接手、保证金扣罚，就是服务商的记录：承诺了什么、哪里没守住、代价是多少。

剩余权益随后转让，新所有人又调用了一次，然后关闭并结算。

![协议证据](docs/assets/07-protocol-evidence.png)

预付 **0.24** 测试代币：预订费 **0.04**、执行 **0.03**、未用托管 **0.17**。补偿来自主路保证金。可领取余额不等于已经提现。

![结算拆分](docs/assets/08-settlement-breakdown.png)

另一笔 [`run_429d2129ab1e`](https://commit.jibai.site/agent) 保存服务实际返回的内容：EIP-712、RFC 2119、X Layer 网络信息，来自**固定公开语料**。这一笔没有关闭和结算。上面那笔没有保留响应正文。两笔是不同的记录。

![保存的检索结果](docs/assets/05-delivered-search-results.png)

## 各层分工

| 层 | 作用 |
| --- | --- |
| **OKX AI** | 发现，以及被预订的已上架服务 |
| **Commit** | 未来窗口，以及交付记录 |
| **X Layer 1952** | 托管、保证金、结算 |
| **接入的 ASP** | 服务本身（这里是 Search v1） |

今天主路、备用和验证器由**项目运营**。**tCOM 无价值。**

| | |
| --- | --- |
| 产品 | https://commit.jibai.site/ |
| 预订与交付记录 | https://commit.jibai.site/evidence/run_510deba24b1d |
| 保存的检索结果 | https://commit.jibai.site/agent |
| 服务商契约 | https://commit.jibai.site/adapter |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| 登记合约 | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |

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
