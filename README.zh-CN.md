# Commit

<p>
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-e8e4dc?style=for-the-badge&color=6b6560" /></a>
  <a href="README.zh-CN.md"><img alt="中文" src="https://img.shields.io/badge/中文-0B57D0?style=for-the-badge" /></a>
</p>

Commit 回答两个问题。

1. **我以后要用一个 AI 服务，能不能提前订？** 能。通过 OKX AI 上已上架的 **Commit Capacity Quote**，为接下来的任务订下一段未来时间：调用多少次、主服务必须在几秒内应答、超时后由谁备用。报价只是询价，确认之后才算预约。现在能订的是接入 Commit 的搜索服务，不是 OKX AI 上任意一个 ASP。
2. **服务商答应了之后到底做得怎么样，能不能留下证据，供下一次复盘？** 能。同一笔预约把承诺和实际履约放在一起：超时、备用接手、保证金扣罚都留下。这就是稳定交付能力的证据，服务商下次复盘时对着看。Commit 不替服务商声称稳定交付能力已经提高。

**[线上原型 →](https://commit.jibai.site/)** · OKX.AI ASP **#13781** · X Layer 测试网 **1952** · 不是主网

![首页](docs/assets/01-home.png)

## 1. 能不能提前订

用户调用已上架的 **Commit Capacity Quote**。这个演示会自动分到下一个还能订的时间段。报价里有起止时间、主服务和备用、应答时限、总价。报价不会锁定名额，确认之后才算预约。

![未来时间段的报价](docs/assets/03-future-window-quote.png)

`POST` https://commit.jibai.site/api/capacity/quote

截图取自 2026 年 9 月 21 日的英文页面。图里那个时间段只是当天的例子，不是现在仍然有效的报价。截图页脚当时还写着代码仓库未公开；公开源码就是现在这个仓库。

## 2. 答应了之后做得怎么样

[`run_510deba24b1d`](https://commit.jibai.site/evidence/run_510deba24b1d) 把承诺和实际履约放在同一条记录里。

当时预约了 20 次搜索。转让前先执行了两次：第一次由主服务正常返回；第二次是受控故障测试，主服务超过 **8 秒**仍未应答，备用服务 Nova 接手并返回结果。这 8 秒是主服务单次尝试的时限，不是整单完成时间。

随后，剩余的 **18 次**转给另一个钱包。新钱包又成功调用了一次，最终剩余 **17 次**，然后这笔预约关闭并完成结算。三次调用都成功，用掉 3 次。

超时、备用接手、扣罚保证金，就是服务商复盘稳定交付能力的依据：承诺过什么、哪里没守住、代价是多少。

这笔演示还有一个补充能力：没用完的剩余次数可以整笔转给另一个钱包。新钱包接手后继续使用，最后完成结算。

![这笔预约的证据](docs/assets/07-protocol-evidence.png)

用户最初预付 **0.24 tCOM**：其中 **0.04** 是两家服务商的预约费，**0.20** 进入执行托管。最终成功执行 3 次，支付 **0.03**；剩余 **0.17** 未使用托管在结算时返还。主服务超时产生的 **0.02** 补偿来自它的保证金，不是执行托管。转让时新钱包支付的 **0.15 tCOM** 是另一笔款项，不包含在最初的 0.24 里。页面上的可领取金额，还不等于已经提走。tCOM 没有价值。

![结算怎么拆](docs/assets/08-settlement-breakdown.png)

另一笔 [`run_429d2129ab1e`](https://commit.jibai.site/agent) 留下了当时真正搜到的内容：EIP-712、RFC 2119，以及 X Layer 的网络说明，语料是一份固定的公开材料。这一笔没有关闭，也没有结算。上面那笔没有保存检索正文。两笔是不同的记录。

![保存下来的检索结果](docs/assets/05-delivered-search-results.png)

## 各层做什么

| 层 | 做什么 |
| --- | --- |
| **OKX AI** | 服务发现与预约入口；Commit Capacity Quote 已上架 |
| **Commit** | 锁定未来服务窗口、主备切换，并记下履约，供复盘稳定交付能力 |
| **X Layer 1952** | 托管、保证金、结算 |
| **接入的服务商** | 实际执行 Search v1（演示中为 SearchNode / Nova） |

现在的主服务、备用服务和验证者都由项目方运营。

| | |
| --- | --- |
| 产品 | https://commit.jibai.site/ |
| 预约和履约记录 | https://commit.jibai.site/evidence/run_510deba24b1d |
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
