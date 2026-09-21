# Commit — 进展简报（给评审 / 大佬看）

**日期：** 2026-09-19  
**赛道：** OKX.AI Trading Hackathon · Build a Company · **Singapore Finale**  
**状态：** 测试网实盘可点；公开仓库 / 视频 / 正式交表尚未做（Batch C 待批）

---

## 一句话

**Commit = Agent 服务容量的远期市场。**  
买的是「未来某段时间窗 + 数量 + SLA」，不是聊天机器人。  
定时任务只会提醒你去调用；**发明不了空座位**。占满后第二个买家会拿到 `NO_CAPACITY`。

---

## 5 分钟怎么看

| 顺序 | 看什么 | 链接 |
| --- | --- | --- |
| 1 | 产品首页（已收成：是什么 → 一次演示 → 三步） | https://commit.jibai.site/ |
| 2 | 真实 Nova 接手 + 转让 + 结算（同一 runId） | https://commit.jibai.site/evidence/run_510deba24b1d |
| 3 | 去预订页（报价 → 占用 → 链上创建） | https://commit.jibai.site/reserve |
| 4 | 已上架报价接口（免费） | `POST` https://commit.jibai.site/api/capacity/quote |
| 5 | 健康检查 | https://commit.jibai.site/api/health |

链上（X Layer **testnet 1952**，非主网）：

- tCOM：https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E  
- Registry：https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64  
- 本笔 create tx：https://www.okx.com/web3/explorer/xlayer-test/tx/0x05b53003d4f48375e984f25936643b1ae92cba406a5f7b7357a6a938f324809b  

OKX AI ASP：**#13781**（Commit Capacity Quote）已上架；User 侧报价已进入预订创建（T31）。

---

## 已经做成的（可验）

1. **HTTPS 产品站** + 东京实盘 API / Web / 双 Provider（SearchNode + Nova）  
2. **报价 → 双池占用 → 链上托管/保证金 → 执行计量 → 故障切换 → 转让 → 结算** 全链路（**同一 runId**）  
3. **真实 failover：** `breachPrimary=1` / `successBackup=1` / `route=BACKUP`（首页 LIVE_RUN 指向该笔）  
4. 合约 **Sourcify exact_match**；结算资产设计为可插拔 ERC-20（当前演示用无价值 tCOM）  
5. 本地 / 预发测试：T01–T31 主路径、T28 replay、T33/T34 等  
6. 隔离站点未炸：alpha.jibai.site / game.jibai.site 仍 200  

---

## 诚实边界（务必一起说）

- **测试网**，不是商业主网；tCOM **无价值**  
- SearchNode / Nova / Verifier 均为 **项目自营**（已披露）  
- 当前首页 LIVE 证据是 **同一笔** failover + 转让 + 结算（`run_510deba24b1d`）；更早的 held-failover / 无故障 settle 快照仍在证据索引里，**没有拼接**  
- 公开 git、Demo 视频、官方表单：**未交**（等 Batch C 批准）  

---

## 还没做 / 待你拍板

| 项 | 说明 |
| --- | --- |
| Batch C | 公开仓库 + 2–4 分钟视频 + 读表单后提交 |
| CAM 密钥轮换 | 运维安全 |
| ASP #4244 下架 | 旧身份干扰官方收件箱 |
| （可选）OKX 浏览器绿勾 | Sourcify 已够用 |

---

## 评委口述（30 秒）

> Agents 随时调用很常见。但工作流要的是**未来某一时刻的产能**。Commit 用明确 SLA 和双 Provider 保证金预订窗口；主路超时，备用接手并扣罚——单位烧掉、不偷偷多发。剩余权益可转让。这是产能远期，不是定时闹钟。

---

## 本地文件（仓库内）

- 本简报：`submission/BRIEF_FOR_REVIEW.md`  
- 表单草稿：`submission/FORM_DRAFT.md`  
- 视频脚本：`submission/DEMO_SCRIPT.md`  
- 链接总表：`submission/LINKS.md`  
- 状态：`PROJECT_STATUS.md`  

**不要把私钥 / TAT CAM / 钱包 JSON 发给任何人。**
