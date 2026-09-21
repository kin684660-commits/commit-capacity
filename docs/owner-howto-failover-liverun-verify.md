# Owner howto: failover LIVE_RUN + OKX green check

中文操作手册（英文标题保留给评委文档交叉引用）。  
**我能代劳的：** 你跑完并把新 `runId` 发我后，改 `LIVE_RUN` 并热更东京站点。  
**必须你做的：** Tokyo 上带 admin token 注入故障；OKX 浏览器登录后点验证（若仍要绿勾）。

---

## 0. 先搞清三件事

| 目标 | 现状 | 谁做 |
| --- | --- | --- |
| 首页「最近结算」指向真实 Nova 接手 | 现挂 `run_04fc72cfb8a2`（注入 403，主路自己成功） | 你在 Tokyo 重跑 → 告诉我 runId → 我改代码上线 |
| 已有一笔短 T06 | `evidence/t06-staging.md`（commitment 2，约 10s）但未必是首页证据 run | 最好再跑一笔完整 play 并 `recordEvidence` |
| OKX Explorer 绿勾 | Sourcify 已 **exact_match**；OKX 网页常跳登录 | 你登录 OKX 再点；或评委材料用 Sourcify 链接 |

Sourcify（已完成，可直接给评委）：

- tCOM: https://repo.sourcify.dev/contracts/full_match/1952/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E/
- Registry: https://repo.sourcify.dev/contracts/full_match/1952/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64/

---

## 1. 在 Tokyo 重跑真实 failover（核心）

### 1.1 登录东京机

任选其一：

- SSH 到东京轻量（若你开了 22 端口）
- 腾讯云控制台 → 该实例 → **自动化助手 / 远程命令（TAT）** → 以 `root` 执行下面命令

工作目录：

```bash
cd /www/wwwroot/commit
```

### 1.2 取出 admin token（不要发到聊天）

```bash
# 方式 A：systemd 环境
systemctl show commit-api -p Environment --no-pager | tr ' ' '\n' | grep -E 'COMMIT_.*ADMIN|COMMIT_PROVIDER'

# 方式 B：staging env 文件
grep -E 'ADMIN|PROVIDER' /www/wwwroot/commit/.env.staging || true
```

在**同一台机器**的 shell 里：

```bash
export COMMIT_PROVIDER_ADMIN_TOKEN='（只粘在东京终端，不要微信/Cursor）'
```

变量名以你机器上实际为准：常见是 `COMMIT_PROVIDER_ADMIN_TOKEN`。`smoke-t06.mjs` 读的是 `COMMIT_T06_ADMIN`，下面会一起 export。

### 1.3 本机注入（必须 127.0.0.1）

```bash
curl -sS -X POST http://127.0.0.1:3180/api/admin/demo/fault \
  -H 'content-type: application/json' \
  -H "x-commit-admin: $COMMIT_PROVIDER_ADMIN_TOKEN" \
  -d '{"delayMs":11000}'
```

成功：HTTP 200，JSON 里有 `pendingDelayMs` 或类似字段。  
失败 403：token 不对，回到 1.2。

### 1.4 跑短剧 T06（约等窗口 3 分钟）

确认钱包文件存在：

```bash
ls -la .local/xlayer-wallets.json
```

```bash
export COMMIT_SMOKE_1952=1
export COMMIT_T06_ADMIN="$COMMIT_PROVIDER_ADMIN_TOKEN"
export COMMIT_API_ORIGIN=https://commit.jibai.site
node scripts/smoke-t06.mjs
```

**成功长什么样：**

- 日志里 `mac inject` / inject 为成功（或脚本内再次注入成功）
- `execute` 从窗口开始算大约 **8–11 秒**才返回（不是 1 秒）
- `status: SUCCEEDED`，`liveUsed` 增加 1

把终端里 **reservationId / commitmentId / create tx** 复制下来（可打码私钥）。

### 1.5（推荐）完整 play 并写入 evidence run

短 T06 只证明切换；首页最好挂「完整结算 + failover」一笔。完整步骤见 `docs/SMOKE-1952.md`，关键：**T06 执行前**在东京本机做 1.3 注入。

跑完后应有新的 `run_xxxxx`。核对：

```bash
curl -sS "https://commit.jibai.site/api/evidence/你的新runId" | head -c 2000
```

确认：

- 时间线/summary 里 T06 体现 failover（或 attempts 含 TIMEOUT + nova）
- `termsVerification.match === true`（有则更好）

### 1.6 告诉我之后我改 LIVE_RUN

发我（不要带 token）：

1. 新 `runId`（例如 `run_……`）  
2. 对应 `reservationId`  
3. 一句话：是否确认 Nova 接手（执行耗时约 10s）

我会改这些文件并 `tat-sync-web` 上线：

- `apps/web/lib/links.ts` → `LIVE_RUN`
- `apps/web/app/LatestDemo.tsx` → `FALLBACK_RUN`（如有）
- `submission/RELEASE_MANIFEST.json` → `evidenceRunId`
- `submission/LINKS.md` / `evidence/INDEX.md` / `PROJECT_STATUS.md`

**在你批准改 UI 之前我不会动首页。** 你这条消息已经等于授权「跑通后可以替换 LIVE_RUN」。

---

## 2. OKX 浏览器「绿勾」教程

### 2.1 现实情况

- **Sourcify 绿勾已有**（上面两个链接）——评委材料优先贴这个。  
- OKX 网页 Explorer 常 **跳转登录**；viaIR 有时导致浏览器标准 JSON 验证失败。失败了 **不要重新部署**。

### 2.2 若你仍要 OKX 站内绿勾

1. 浏览器打开并登录 OKX：  
   https://www.okx.com/web3/explorer/xlayer-test  
   确认网络是 **X Layer Testnet**，不是主网。
2. 官方说明：  
   https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract
3. **先验证 tCOM**  
   地址：`0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`  
   - Compiler `0.8.24`  
   - Optimizer on, runs `200`  
   - EVM `cancun`  
   - **viaIR = true**（必开）  
   - License MIT  
   - Constructor：**空**  
   - 源码：`packages/contracts/contracts/MockToken.sol` + OpenZeppelin 5；优先上传 Hardhat `artifacts/build-info` 里的 standard-json `input`
4. **再验证 Registry**  
   地址：`0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`  
   编译选项同上。构造参数：

   | Arg | Value |
   | --- | --- |
   | token_ | `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E` |
   | verifier_ | `0xD542aB96d0e110a9FD89D2970Ef659649d84f704` |
   | owner_ | `0x2E386a0E396C21aBb7F11b1Eb447441008DE8d25` |
   | graceSeconds_ | `600` |

   ABI-encoded（无 4-byte selector）：见 `docs/verify-1952.md`。
5. 成功：合约页出现源码，不再是灰 Bytecode。  
6. viaIR 被拒：截图留存；材料写「Sourcify exact_match + 本文件编译记录」，**禁止为绿勾 redeploy**。

更细的中文点法也在 `docs/verify-1952.md` 第二节。

---

## 3. 和 Batch C / 新加坡的关系

- **Batch C** = 公开 git + 拍视频 + 交官方表（需你再明确一句「批准 Batch C」我才推公开仓/代填发送）。  
- 你已选 **新加坡线下（Singapore Finale）** —— 已写入 `submission/FORM_DRAFT.md`。  
- 视频脚本：`submission/DEMO_SCRIPT.md`（英主中辅）。建议 **failover LIVE_RUN 换好再拍**，否则旁白「Nova succeeds」和首页证据不一致。
