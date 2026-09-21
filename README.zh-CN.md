# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-e8e4dc?style=for-the-badge&color=6b6560" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-0B57D0?style=for-the-badge" /></a>
</p>

**提前预约 OKX AI 上的服务，并把交付做成服务商能改进的记录。**

Commit 做两件事。

1. **提前预约。** 任务开始之前，先为 OKX AI 上已上架的服务订下一段未来时间：要调用多少次、主服务必须在几秒内应答、超时后由谁备用。报价只是询价，还没有订上。
2. **让服务商看清自己的交付。** 同一笔预约会记下超时、备用接手和保证金扣罚。服务商能看到哪里没做到，下次再改自己的承诺。这是测试网上的一次样本，说明这条改进路径，并不表示线上稳定性已经提高。

**[线上原型 →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer 测试网 **1952** · 不是主网

![首页](docs/assets/01-home.png)

## 1. 提前预约 OKX AI 上的服务

买方调用已上架的 **Commit Capacity Quote**。这个演示会自动分到下一个还能订的时间段。报价里有起止时间、主服务和备用、应答时限、总价。报价不会锁定名额，确认之后才算预约。

![未来时间段的报价](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

截图取自 2026 年 9 月 21 日的英文页面。图里那个时间段只是当天的例子，不是现在仍然有效的报价。截图页脚当时还写着代码仓库未公开；公开源码就是现在这个仓库。

## 2. 服务商能拿来改进的记录

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) 这一笔把预约和交付记录放在一起。

当时预约了 20 次搜索。三次调用里，主服务成功了两次。受控故障测试中，主服务超过 **8 秒**仍未应答，备用服务返回了结果。这 8 秒是主服务单次尝试的时限，不是整单做完要花的时间。超时、备用接手、扣罚保证金，就是留给服务商的记录：承诺过什么、哪里没守住、代价是多少。

剩下的次数转给了另一个钱包。新钱包又调用了一次，然后这笔预约关闭并完成结算。

![这笔预约的证据](docs/assets/07-protocol-evidence.png)

预付 **0.24** 个测试代币：预约费 **0.04**，执行 **0.03**，没用完的托管 **0.17**。补偿来自主服务的保证金，不是从执行款里扣。页面上的可领取金额，还不等于已经提走。

![结算怎么拆](docs/assets/08-settlement-breakdown.png)

另一笔 [`run_429d2129ab1e`](https://commit.jibai.site/agent) 留下了当时真正搜到的内容：EIP-712、RFC 2119，以及 X Layer 的网络说明，语料是一份**固定的公开材料**。这一笔没有关闭，也没有结算。上面那笔没有保存检索正文。两笔是不同的记录。

![保存下来的检索结果](docs/assets/05-delivered-search-results.png)

## 各层做什么

| 层 | 做什么 |
| --- | --- |
| **OKX AI** | 发现服务，以及被预约的那个已上架报价 |
| **Commit** | 未来时间段，以及交付记录 |
| **X Layer 1952** | 托管、保证金、结算 |
| **接入的 ASP** | 真正提供的服务（这次是搜索 Search v1） |

现在的主服务、备用服务和验证者都由项目方运营。**tCOM 没有价值。**

| | |
| --- | --- |
| 产品 | https://commit.jibai.site/ |
| 预约和交付记录 | https://commit.jibai.site/evidence/run_510deba24b1d |
| 保存的检索结果 | https://commit.jibai.site/agent |
| 服务商接入说明 | https://commit.jibai.site/adapter |
| tCOM | [`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E) |
| 登记合约 | [`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64) |

局限见 `docs/known-limitations.md`。条款见 `docs/protocol-terms.md`。接入说明见 `docs/provider-contract.md`。

## 在本机跑起来

Hardhat 不需要私钥。默认不会连接主网 196，也不会连上生产数据库。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run doctor
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test:contracts
corepack pnpm build
corepack pnpm demo:local
```

演示还在跑的时候，打开 http://127.0.0.1:3000/evidence/local 。这个地址只在本机有效。`demo:local` 用的是本机 Hardhat **31337**。比赛用的是测试网 **1952**。
