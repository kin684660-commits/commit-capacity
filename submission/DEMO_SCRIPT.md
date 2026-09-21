# Demo script (~3:40) — English primary + 中文对照

**File location:** `commit/submission/DEMO_SCRIPT.md`  
**Subtitles:** `commit/submission/demo-en.srt`  
Record after ASP T31 and a 1952 run with **real failover** exist (prefer a new LIVE_RUN after Tokyo re-run; do not splice two runIds).

---

## Timeline / 时间轴

| Time | English (say / show) | 中文意思 |
| --- | --- | --- |
| 00:00–00:18 | Opening. Homepage one-liner. Testnet + tCOM + controlled providers + Commit verifier visible. | 开场。首页一句话。露出测试网、tCOM、自营双路、Commit 验证器。 |
| 00:18–00:43 | Quote. Show OKX AI User-side listed call (`quoteId` then reservation). Say a quote does not reserve. | 报价。展示 OKX AI 已上架调用（先 quoteId 再预订）。强调：报价≠已预订。 |
| 00:43–01:08 | Create on 1952. Two provider bonds. Wallet confirm. Testnet label. | 在 1952 创建。两家保证金。钱包确认。标明测试网。 |
| 01:08–01:30 | Window open. Two successful searches. Remaining 20 → 19 → 18. Real corpus results. | 窗口打开。两次成功搜索。剩余 20→19→18。真实语料结果。 |
| 01:30–02:05 | Inject primary delay. 8s timeout. Nova succeeds. Remaining 17. One unit, not two. | 注入主路延迟。8 秒超时。Nova 成功。剩余 17。只扣 1 单位，不是 2。 |
| 02:05–02:25 | Penalty checkpoint. Primary bond 0.10 → 0.08. | 扣罚检查点上链。主路保证金 0.10→0.08。 |
| 02:25–02:55 | List remaining 17 to the designated second wallet at 0.15. Owner/epoch change. | 剩余 17 挂给指定第二钱包，价 0.15。所有人/纪元变更。 |
| 02:55–03:15 | Second wallet executes once (17 → 16). First wallet refused. | 新钱包执行一次（17→16）。原钱包被拒。 |
| 03:15–03:32 | Early close, settle, withdraw unused funds. | 提前关闭、结算、提取未用资金。 |
| 03:32–03:45 | Evidence page, limitations, three external doors (OKX AI / explorer / git). | 证据页、局限披露、三扇外门（OKX AI / 浏览器 / git）。 |

---

## Voiceover / 旁白（英文为主 · 中文翻译）

**Opening**  
EN: “I have operated an ASP service. Listing a service is only the beginning; delivering it consistently is the harder part. Commit lets participating ASPs define delivery commitments, reserve future capacity, and keep an execution and settlement record.”  
ZH: “我做过 ASP 供应商。服务上架只是开始，持续稳定交付才是难点。Commit 让接入的 ASP 明确容量与交付条款，让 Agent 预订未来服务，并把履约与结算记录留下来。”

**Quote**  
EN: “We start with Commit Capacity Quote. The result comes from our reservation inventory. It includes two providers, a service window, a response deadline, and the full price. A quote alone does not reserve capacity.”  
中: 「我们从 Commit Capacity Quote 开始。结果来自预订库存：两家服务商、服务窗口、应答时限、完整价格。仅有报价并不会锁定容量。」

**Create**  
EN: “The buyer accepts. This transaction creates the position on X Layer testnet. tCOM has no value.”  
中: 「买方确认。这笔交易在 X Layer 测试网创建仓位。tCOM 无价值。」

**Execute**  
EN: “Successful searches consume reserved units on a demonstration corpus.”  
中: 「成功的搜索会消耗预订单位；检索语料是演示用固定公开语料。」

**Failover**  
EN: “Controlled delay. Primary misses 8 seconds. Backup succeeds. One unit burned, not two.”  
中: 「受控延迟。主路超过 8 秒。备路成功。烧掉 1 个单位，不是 2 个。」

**Penalty**  
EN: “The verifier submits the breach. The contract applies the configured penalty.”  
中: 「验证器提交违约检查点。合约按配置扣罚。」

**Transfer**  
EN: “Remaining units list to a designated second wallet. Ownership changes for real.”  
中: 「剩余单位挂给指定第二钱包。所有权真实变更。」

**New owner**  
EN: “The new wallet can execute. The original wallet cannot.”  
中: 「新钱包可以执行。原钱包不行。」

**Ending**  
EN: Keep handbook close/settle lines; show evidence URL and limitations.  
中: 按手册收尾关闭/结算；露出证据 URL 与局限说明。

---

## Recording notes / 拍摄注意

- Cut wallet waits. Subtitle the compression. Do not splice two runIds.  
  剪掉等钱包确认的空镜；用字幕标明时间压缩；**不要把两笔 runId 剪接成一笔**。
- Prefer recording after homepage LIVE_RUN points at a run with real Nova failover.  
  最好等首页 LIVE_RUN 指向「真实 Nova 接手」的那笔再拍。
