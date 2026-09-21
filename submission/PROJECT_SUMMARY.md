# Project summary (draft)

Commit is a prototype for reserving future agent service capacity. Agents request capacity quotes through a public HTTPS API intended for OKX AI, then create service entitlements on X Layer testnet with escrow and provider bonds. The system executes and meters Search v1 requests, routes around attributable provider failures, records economic consequences, and transfers remaining entitlements to another wallet for continued use. Settlement allocates earned fees, compensation, and unused execution funds.

The current build is live on HTTPS + X Layer testnet 1952 with controlled search providers, the valueless test token tCOM, and a Commit-operated verifier. Quote API is live. ASP #13781 is listed. User-side T31 consumed a listed-service quoteId into reservation create. Public source: https://github.com/kin684660-commits/commit-capacity. Demo video is not published yet.

Chinese: Commit 是 Agent 服务容量预订产品（测试网实盘，非主网）。通过公开 HTTPS 报价入口查询窗口容量，在 X Layer 测试网创建带托管和 Provider 保证金的权益，执行并核销请求，故障后切换备用并记录扣罚，支持把剩余权益转给第二个钱包继续使用，最后结算。当前为受控搜索 Provider、测试代币、中心化验证器。报价已上线；#13781 已上架；User 侧报价已进入预订创建。公开仓库：https://github.com/kin684660-commits/commit-capacity。演示视频尚未发布。
