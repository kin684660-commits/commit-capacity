# Commit 开发与交付总手册

版本：1.0  
资料核对日期：2026 年 9 月 17 日  
执行窗口：2026 年 9 月 17 日至 9 月 25 日  
面向对象：项目负责人、接手开发的 AI、开发协作者、验收人员  
适用范围：OKX Dev Day 2026 的 Commit 测试网参赛原型

**执行结论：交付一个可验证的服务容量预订闭环。用真实 OKX AI 报价入口获取需求，在 X Layer 测试网上托管资金与保证金，真实执行和核销，在故障后切换备用 Provider，转让剩余权益，并完成结算与退款。**

本手册是开发规格、任务拆解和验收依据。后文标为“设计决定”的内容是本项目建议采用的实现规则，不是 OKX 官方规定；标为“待确认”的内容不得伪装为已完成。当前未检查 Commit 代码仓库，所有功能完成度初始记为“未验证”。

本次授权是生成这份手册及其本地交付文件。手册不是服务器写入、创建公开仓库、账户注册、链上交易、支付、DNS 修改或提交比赛的授权。执行 AI 应先完成可审阅的本地成果，再按第 3 章申请需要的操作授权。

## 阅读导航

- 负责人快速阅读：第 1–4、19、23、24、26 章。
- 开发 AI 首次接手：第 3–12、17–20、25 章。
- UI 实现：第 13–15 章。
- 上线与运维：第 16–18 章。
- 录视频和提交：第 21–24 章。
- 需求或规格冲突：以本文资金规则、状态转换、不变量和验收用例为准，先记录冲突，再更正所有相关接口、测试与说明。

## 1 项目目标与成功定义

### 1.1 产品一句话

Commit 让 Agent 提前预订指定时间内的服务容量，并以可核销权益、服务条款、Provider 保证金和备用路由管理履约。

对外英文建议：**Reserve agent capacity with explicit service terms and bonded accountability.**

不要宣称“保证服务永不失败”“去中心化 SLA 真相”“真实商业规模已获验证”。保证金是有上限的经济后果，不能消除网络、上游和协调器故障。

### 1.2 必须让评委看懂的故事

TradeBot 通过 OKX AI 获取报价 → 两家 Provider 为同一窗口预留容量 → 钱包创建链上 Commitment → 执行一次服务并核销 → 主 Provider 被注入延迟并实际超时 → Verifier 记录违约 → 备用服务成功 → 链上确认扣罚 → TradeBot 把全部剩余权益卖给 ResearchBot → 新钱包继续执行 → 结算并验证退款及收入。

这个流程证明技术可行性。需求强度、Provider 愿不愿意押保证金、用户愿不愿意支付预留费，以及二级市场流动性仍是独立的商业假设。

### 1.3 三层验收

| 层次 | 必须证明 | 不足以通过的证据 |
| --- | --- | --- |
| 产品 | 新钱包能继续使用已转让额度 | 只有 Owner 文本变更 |
| 技术 | API、数据库、合约资金和事件一致 | 前端定时器伪造用量和交易 |
| 比赛 | 工作中的 OKX AI 集成和可访问提交包 | 仅有 API、Logo 或待审核截图 |

### 1.4 本次产品边界

P0：单一服务类别、两家受控 Provider、免费报价入口、测试网资金闭环、整份剩余权益转让、公开只读证据页、受控写入演示、视频和代码。

P1：真实外部搜索上游、Agentic Wallet 自动执行、x402 收费、较完整的用户研究、额外动效。

延期：部分拆分和合并、复杂价格模型、订单簿、推测性容量交易、主网资金、多链、DAO、去中心化仲裁、多服务组合采购。

**优先级顺序：集成资格与资金正确性 → 完整执行闭环 → 可复现交付 → 清晰 UI → 额外功能。**

## 2 官方要求与资料使用规则

### 2.1 官方事实摘要

根据 [Builder Kit](https://www.okx.com/learn/okx-dev-day-builder-kit)，Build a Company 要求通过 OKX AI 发布或集成工作中的服务，提供端到端流程和可验证链接。提交包包含团队与赛道、摘要、仓库与 README、2–4 分钟演示、可用的产品或测试环境链接及声明。截止是 **2026-09-25 23:59 UTC，即北京时间 9 月 26 日 07:59**。产品网页为本项目交付标准；不要把它与官方“where available”的表述混淆。

官方允许最多四人团队、单人和 AI 开发工具；已有项目需要说明正式开发期新增工作。评分涵盖创新、完整性、用户价值、技术、生态集成、增长与生态贡献，未公布权重。总奖池 10 万美元，Company 和 Market 各 3.5 万，Flash 和 Remote 各 1.5 万。Remote 单独评审，不参加现场决赛。提交后保持邮箱与 Telegram 可联系，补充资料需及时响应。[S1]

### 2.2 日期和资格核验

[T&C](https://www.okx.com/learn/okx-dev-day-terms) 写开发期为 9 月 17–25 日，现场 10 月 6 日；Builder Kit 写现场 10 月 7 日。两者冲突，必须取得官方书面确认。T&C 含条款优先、资格、费用自付和项目使用许可规定。不要自行宣布最终现场日期，或在书面入围前订不可退款行程。[S1][S2]

参与路线不能因本手册而默认已选。负责人确认 Singapore Finale 或 Remote Build，执行 AI 在提交字段中保持一致。

### 2.3 比赛要求和团队标准的区分

- 官方视频长度：2–4 分钟。团队建议：3 分 40 秒左右、英文旁白与字幕、1080p、30fps。
- 官方允许可访问仓库。团队建议：经授权公开仓库；未授权则准备评委访问方案。
- 本项目选择 X Layer Testnet，不把“测试网必定符合所有评审期待”作为已确认事实。尽早向官方确认测试网、受控 Provider、故障注入披露方案是否可接受。
- 官方没有要求同时使用 A2A、A2MCP、Agentic Wallet、x402 和所有市场工具。只集成与闭环有关的工具。
- “审核中”不等于满足工作中集成门槛。遇到审核阻塞，提供真实调用证据并询问官方可接受路径。

### 2.4 来源记录

仓库保留 `docs/official-sources.md`：URL、读取日期、页面更新时间（如果页面提供）、相关结论、仍需确认事项。开工、录制前、提交前各复查一次关键要求。不能用模型记忆替代当天页面。

## 3 接手 AI 的工作协议与授权边界

### 3.1 第一轮必须做什么

1. 读取工作区和目标目录的 AGENTS.md，并检查 Git 状态。
2. 找到用户明确指定的 Commit 仓库；找不到时提出新目录和分支方案。不能把现有 Alpha Coliseum 项目直接改造成 Commit。
3. 只读盘点已有代码、依赖、部署配置和测试。不得输出密钥或扫描无关私人资料。
4. 创建“已有 / 缺失 / 未验证”差异清单，按第 19 章任务编号关联。
5. 使用本手册默认设计推进已授权的本地工作；涉及资金规则、范围扩大或外部写入，集中提出有具体目标的批准请求。
6. 每项任务通过对应验收后才能标为完成。运行成功需要记录版本、命令、退出结果和证据位置。

### 3.2 默认设计决定

| 决定 | 默认值 | 变更条件 |
| --- | --- | --- |
| 网络 | X Layer Testnet | 主网需新授权及额外安全审查 |
| 演示资产 | 自建 6 位精度测试代币 tCOM | 官方测试币确认可用且无额外复杂度时可切换 |
| 服务 | 固定公共语料 Search v1 | 外部搜索独立接入，不改变核销语义 |
| Provider | 两个分别运行的受控服务 | 披露是否共享上游及基础设施 |
| 转让 | 整份剩余权益，固定价格，可指定买方 | 部分拆分延期 |
| 验证 | 中心化 Commit Verifier | 不宣称去信任 |
| 钱包 | 测试专用 EOA，两个人工签名钱包 | Agent 自动签名为增量功能 |
| 部署 | 独立服务及数据库 | 复用现有服务器需明确批准 |

测试代币用于自建合约资金流程，与 OKX AI 身份注册费用、Gas、以及可选 x402 结算资产不是同一概念。注册和上架可能涉及真实费用，必须先读取当前流程、确认网络和费用，再取得授权。

### 3.3 授权请求应集中且可审阅

不要每改一个按钮就问负责人。一次本地实施批准可以明确覆盖：目标目录、允许创建与修改的文件、安装依赖、测试、Git 提交和预算范围。但不能自行推断批准覆盖服务器、DNS、公开发布或真实资金。

外部操作申请应包含：目标、具体范围、预计费用、影响、回滚方式、已完成的本地验证、需要用户执行的登录步骤。用户未回复不是同意。

建议分三批：A 本地开发；B 测试网部署、指定钱包操作、ASP 注册与上架；C 网站部署、仓库发布、视频上传与正式提交。每批只申请准备好执行的具体操作，不能让用户批准未知交易。

### 3.4 必须保留的项目管理文件

- `PROJECT_STATUS.md`：版本、当前阶段、已完成证据、阻塞、下一步。
- `TASKS.md`：任务 ID、依赖、状态、验收及证据。
- `DECISIONS.md`：架构决定及变更理由。
- `APPROVALS.md`：批准的范围、时间、有效对象；不存秘密。
- `docs/known-limitations.md`：中心化、受控 Provider、测试币、异常退款风险。

长任务每完成一个可检验阶段更新一次状态。避免“前端完成 90%”等无法验证的表述。

## 4 交付物总清单

| ID | 交付物 | 完成标准 |
| --- | --- | --- |
| D01 | 产品网站 | HTTPS；Reserve、Commitment、Transfer、Evidence 可用 |
| D02 | OKX AI 服务 | 从 User 侧真实调用免费报价，输出被创建流程消费 |
| D03 | 测试网合约 | 源码、ABI、部署记录、网络、资产及浏览器链接齐全 |
| D04 | Provider 与后端 | 真实请求、超时、路由、持久化账本和恢复 |
| D05 | 完整代码仓库 | 锁定依赖、迁移、测试、启动文档、无秘密 |
| D06 | 资金验证 | 正常、故障、转让、到期、异常退出均可对账 |
| D07 | 演示证据 | 一份端到端 trace，关联真实请求和交易 |
| D08 | 演示视频 | 2–4 分钟，链接免登录可看，展示工作产品 |
| D09 | 提交文案 | 字段草稿、摘要、限制、链接和真实性声明 |
| D10 | 运维交接 | 启停、备份、恢复、回滚、告警和权限说明 |
| D11 | 发布版本 | Git SHA、版本标记、配置版本与提交材料一致 |
| D12 | 提交回执 | 经批准提交后的真实回执和后续联络安排 |

P0 的含义是必须落实或明确报告未完成；不能用预设截图填补缺失的功能。

## 5 官方工具接入路线

### 5.1 OKX AI 和 A2MCP

作用：让外部 Agent 从 OKX AI 发现和调用 Commit 的报价能力。免费接口可直接返回 HTTP 200；收费能力才需要 x402。公共 HTTPS API 是准备条件，不是已经完成平台接入的证据。[S3]

工作顺序：实现结构化报价 → 提供接口说明和 HTTPS → 实测请求 → 按当前官方 ASP 流程准备身份与服务 → 经授权注册及上架 → 保存审核状态 → 用买方 User 侧调用 → 将返回的 quoteId 用于后续预订。[S3][S4][S5]

服务草稿名称：Commit Capacity Quote。服务说明：查询指定窗口中受控 Search Provider 的可预订容量、条款和完整费用；报价不等于已预订。价格：0。不要把免费报价写成免费执行。

必须交付 `docs/OKX-INTEGRATION.md`：实际 ASP/Service 标识、真实 URL、接口输入输出、平台调用时间和 traceId、报价到 Commitment 的关联、错误样例、审核状态。身份网络与应用测试网可以不同，分别记录，不能假定所有步骤都在测试网上。

当前注册页说明了注册和上架步骤及 24 小时审核描述。排期仍预留至少两天处理依赖，不能把这个描述当作可保证的完成时间。[S4]

实现 AI 必须读当天的官方技能及 CLI 帮助，不复制未经验证的注册命令。不要对身份工具猜参数、把 `agent` 身份和钱包子账户混为一谈，或重复创建已有身份。

### 5.2 X Layer

用于本项目的经济状态：买方托管、Provider 保证金、累计用量检查点、扣罚、权益所有权、转让成交和结算。

已核对官方网络页：Testnet Chain ID 为 1952，Gas 为 OKB，RPC 提供 `https://testrpc.xlayer.tech/terigon` 与 `https://xlayertestrpc.okx.com/terigon`，浏览器为 `https://www.okx.com/web3/explorer/xlayer-test`。Mainnet Chain ID 为 196，本项目默认禁用。[S6]

网络配置集中在一个共享模块；启动时调用链 ID 检查，不一致即拒绝发送交易。浏览器链接由网络配置生成，不手写拼接未验证的路径。源码验证按官方部署及验证入口执行，保存编译器版本、优化设置、构造参数、部署交易和地址。[S7][S8]

官方 Faucet 用于领取测试 Gas；可选支付 SDK 文档也给出测试 USD₮0 的获取说明。领取资格和可用性需实测，不能假设任何钱包随时能领。tCOM 是本项目另行部署的演示币。[S9][S10]

### 5.3 Agentic Wallet

官方将其定位为 Agent 钱包及自动支付能力。[S11] 本项目先用它完成必要的 OKX AI 身份流程；是否让 TradeBot 用它自动调用自建合约，作为单独技术验证，不因支持 x402 就假定支持任意测试网合约流程。

若增加自动签名：只授权专用测试钱包、指定链、合约和方法，设费用上限，记录真实交易。人工确认的流程明确标注 human-authorized，不包装为完全自主。

### 5.4 Payment SDK 和 x402

这是 P1。官方 SDK 提供支付挑战和验证集成，示例有测试网配置；开发门户凭据是 SDK 路线的前置条件之一。[S9] 采用当天文档对应版本并锁定依赖，不能混用不同 x402 版本的头名称和消息格式。

即使加入，也仅在单独报价或明确付费 API 路由试验。已由 Commitment 托管覆盖的执行请求，不再重复收 x402 费用。自建履约托管合约不能被描述为 SDK 已提供的功能。

验证：未付费得到挑战 → 专用钱包付款 → 同一业务请求重放 → 服务返回 → 支付证据可查；相同支付/业务标识不能重复计费。不得把主网资产地址用于测试网，也不得把 tCOM 当作官方支持的 x402 资产。

### 5.5 本次不接入的工具

A2A 用于协商型任务的扩展，本次标准化报价不需要；行情、Swap、交易信号与本项目核心无直接关系，不为展示工具数量而增加权限或依赖。无需真实交易、Binance 账户或 API Key。

## 6 产品条款与演示数据

### 6.1 Search v1 的定义

默认检索已授权的固定公共语料库：输入 query，返回有标题、来源 URL、摘要和记录 ID 的结果。两家 Provider 分别运行同样接口，但有独立健康状态、延迟和请求日志。若共用机器或语料，应公开说明；不能宣称上游级灾备。

返回规范：`schemaVersion、query、results[]、providerId、requestId`。JSON Schema 校验字段类型、必需项和结果数量上限。空结果可算合法服务成功，但必须与“Provider 返回固定成功 JSON、未执行检索”区分。

不把返回结构正确当作内容真实或投资建议。演示内容不含私人数据和真实交易指令。

### 6.2 演示参数

| 参数 | 默认值 |
| --- | --- |
| 数量 | 20 个成功执行单位 |
| 窗口 | 10 分钟；至少提前 60 秒预订 |
| 并发 | 每份 Commitment 1 个逻辑请求 |
| 速率 | 相邻逻辑请求准入至少间隔 1 秒；不支持突发并发 |
| Provider SLA | 单次尝试完成响应与 Schema 校验不超过 8 秒 |
| 重试 | 只读 Search 最多一次备用尝试 |
| 单价 | 0.01 tCOM / 成功逻辑请求 |
| 预留费 | Primary 0.02、Backup 0.02 tCOM |
| 初始买方托管 | 0.24 tCOM |
| 专属保证金 | 两家各 0.10 tCOM |
| 违约扣罚 | 每个可归责 Provider 尝试 0.02 tCOM，上限为其剩余保证金 |
| 报价时效 | 60 秒，仅信息报价 |
| 预留凭证 | 最多 120 秒，且早于窗口开始失效 |
| 异常结算宽限 | 窗口结束后 10 分钟，纯演示参数 |

任何参数变更同步更新条款哈希、文档、测试和演示配置。tCOM 为无经济价值测试资产，数值不表示商业报价或经过验证的成本。

20 次是总额度，不代表随时瞬间完成。临近截止时，若不足以容纳最坏的两次尝试与收尾裕量，拒绝新请求，不归责 Provider。报价应检查数量、速率和窗口在配置条件下相容；拒绝明显不可能交付的预订。

### 6.3 容量与预留

v0.1 为每家 Provider 定义一个专用容量池。在一份 Commitment 的整个窗口内，主、备用池均独占预留，不能与另一份重叠预订共用。不宣称拥有复杂共享备份优化。

Quote 只读，不占位。Reservation 使用数据库事务同时占用两个池，绑定 buyer、termsHash、window、quantity 和 expiry。公开报价允许匿名，实际预留要求钱包认证和配额，避免免费占位耗尽服务。

所有可能上链的预留签名必须记录。释放不能只看本机 TTL：先确认链上时间超过签名 deadline，且相关确认区间内没有成功创建交易，再释放占位。链不可读时保持占用并报警，不冒险双卖。

Provider 以针对该预留条款的签名表示接受，并已在合约存入足够 freeBond。创建时原子转入买方资金、锁定双方保证金并登记权益；任何条件失败，整笔交易回滚。

### 6.4 取消和关闭

创建前：占位自然失效，不产生链上服务费用。创建成功即预留费归 Provider 应收，不提供无条件取消退款。买方可以停止继续使用并申请受控的提前关闭，未用执行预算退回，预留费保留。

窗口到期：停止接单，排空已合法接入的请求并结算。演示通过真实提前关闭展示退款，不伪造时间跳转；本地测试可以使用测试链时间推进，但不得混作测试网交易证据。

## 7 资金规则与对账样例

### 7.1 资金类别

合约分别维护 buyerExecutionEscrow、providerLockedBond、providerFreeBond、claimableBalance。预留费创建时从买方资金转为 Provider 可领取权益；后续每次成功执行只把一次单价从 escrow 转为实际履约 Provider 的应收。

扣罚从责任 Provider 的专属 lockedBond 转到该请求发生时的 Owner 补偿余额。主失败、备用成功：只核销一次，备用赚一次执行收入，主承担一次扣罚。双失败：不核销、不收执行费，但各自可归责违约可分别扣罚。

外部调用采用 pull withdrawal：收入、补偿和退款先记账，受益钱包自行领取。重入保护与先更新状态后转账必须覆盖领取及成交支付路径。

### 7.2 转让的经济语义

购买方支付转让价给卖方；原 Commitment 剩余执行预算继续留在合约中，随剩余使用权和未来退款权一同转移。转让价不再加进执行预算。历史补偿与历史收入留给原受益人。

转让不延长窗口，不补足已扣保证金，不恢复失效的主 Provider，也不重新收两家预留费。买方付款前看到当前路由、剩余保证金、剩余时间和全部权益。

### 7.3 唯一标准对账剧本

1. 买方 A 存 0.24；P 和 B 各锁 0.10。合约新增资金共 0.44。
2. P、B 分别获得预留费 0.02 的应收；执行 escrow 为 0.20。
3. 两次 P 成功：用量 2，P 新增收入 0.02，escrow 0.18。
4. 第三次逻辑请求 P 超时、B 成功：用量 3，B 新增收入 0.01；P bond 降为 0.08；A 补偿 0.02；escrow 0.17。
5. A 以 0.15 向指定钱包 C 转让 17 次剩余权益。C 额外支付 0.15，A 获得成交应收 0.15。
6. C 在 B 成功执行一次：总用量 4，剩余 16；B 再收入 0.01；escrow 0.16。
7. C 提前关闭，收回 0.16；P 解锁 0.08，B 解锁 0.10。

最终权益：P 收入 0.04、解锁保证金 0.08；B 收入 0.04、解锁 0.10；A 补偿 0.02、转让款 0.15；C 退款 0.16。合计 **0.59 = 原投入 0.44 + 转让支付 0.15**。解锁保证金回到 Provider freeBond，后续可提取，不能再重复计算为收入。

### 7.4 强制不变量

- 成功用量 + 未消费额度 + 在途锁定额度 = totalUnits。
- 已确认成功用量不下降，也不超过数据库真实完成量和总量。
- 每个逻辑请求至多核销一次；每个 Provider attempt 至多扣罚一次。
- 合约托管资产不少于 escrow、freeBond、lockedBond 和 claimable 的总负债。
- 任何扣罚不超过相应专属 lockedBond；不能影响其他 Commitment。
- 转让前后的总剩余额度和执行 escrow 不改变。
- 无正当权限不能转让、领取、签检查点或注入故障。
- 领取后对应应收归零或扣减，重复调用不能再次提走资金。

Gas 单独记录，不进入上述 tCOM 对账。只支持白名单普通 ERC20 测试资产；不支持转账税、rebase 或未知回调代币。

## 8 生命周期与执行语义

### 8.1 状态模型

合约持久状态简化为 OPEN、CLOSED、SETTLED。创建成功为 OPEN；执行资格由时间和子状态计算。资金和双 Provider 保证金原子创建，避免未接受的半生效合约。

UI 派生：SCHEDULED（未到开始时间）、ACTIVE、LISTED、PAUSED、EXPIRED、CLOSED、SETTLED。路由 PRIMARY/BACKUP/UNAVAILABLE 与资金状态分开。

显示优先级：SETTLED → CLOSED → EXPIRED → LISTED → PAUSED → SCHEDULED/ACTIVE。EXPIRED 只表示链上时间已到 end、禁止新执行，链上记录仍可能是 OPEN。到期后 worker 排空请求并生成 FINAL 用途检查点，任何人可提交有效最终检查点并调用 settle，原子从 OPEN 关闭并结算；提前关闭则先执行 Owner 授权的 closeWithCheckpoint，再从 CLOSED 结算。无有效最终检查点时，OPEN/CLOSED 都只能等 end + grace 后按最后确认状态 forceSettle。结算清除挂牌锁，任何迟到检查点和购买都拒绝。

执行请求：ACCEPTED → PRIMARY_RUNNING → SUCCEEDED 或 BACKUP_RUNNING → SUCCEEDED/FAILED；崩溃恢复可进入 UNCERTAIN。UNCERTAIN 暂时冻结额度，不擅自认定成功或重试，利用 attempt 标识向受控 Provider 查询结果；无法恢复则标失败释放额度，注明本次无法确认的执行不计费。

### 8.2 请求身份和幂等

逻辑请求键为 commitmentId + ownerEpoch + clientRequestId。相同键同 payload 返回原结果，相同键不同 payload 返回 409。Provider attempt 使用独立且稳定的 attemptId；受控 Provider 也持久化幂等结果。

买方 HTTP 连接断开不代表 Provider 失败，不自动取消已经接入的服务。每次准入同时锁额度和记录请求，避免进程在调用后、落库前消耗无记录。

### 8.3 计时与归责

使用单调时钟测 Provider 调用开始至响应完整且通过 schema 校验的耗时，日志另存 UTC 时间。服务端不信任浏览器提交的 latency。

8 秒达到时触发 Abort/超时标记并启动备用；如果主实际在 11 秒返回，只记录 late_response，不再次响应买方、核销或结算。UI 显示“timeout at 8.0s”，不能声称在等到 11.3 秒前已测得 11.3。

有效输入下的 Provider 超时、5xx、非法 schema 可归责；买方格式错误、限流、窗口结束、网络在 Commit 侧不可用、Commit 自身 bug 不直接扣 Provider。拒绝不明确归责并记录 reasonCode。

### 8.4 故障和链上扣罚解耦

故障切换立即在链下执行。扣罚提交异步队列，分别显示 Detected、Submitted、Confirmed/Failed。扣罚交易失败不能显示余额已减；重试必须复用业务事件 ID。

第一次主 Provider 违约后，在本窗口内固定走备用。备用也失败则本次请求失败；连续或担保不足时进入 UNAVAILABLE，停止准入，等待人工修复或关闭。没有自动第三家 Provider。

双失败允许一次逻辑请求产生两笔可归责扣罚，分别绑定两个 attemptId。可在同一检查点增加 breachPrimary 与 breachBackup，或按严格递增 sequence 分次提交；重复 evidence 不得增加计数。进入 SETTLED 后不接受追罚。若 forceSettle 前仍未确认相关检查点，未记录补偿可能丢失，适用第 9.5 节限制。

## 9 智能合约规格

### 9.1 数据与信任模型

部署一个不可升级 CommitmentRegistry 和一个仅测试环境使用的 MockToken。每份 Commitment 固定资产、双方 Provider、Verifier 地址、条款摘要和窗口；不设计管理员任意搬走用户托管的能力。

核心字段：id、owner、ownerEpoch、primary、backup、asset、start/end、totalUnits、successPrimary/successBackup、breachPrimary/breachBackup、unitPrice、reservationFees、lockedBonds、escrow、termsHash、sequence、status、listing。

累计数量用于计算增量，不让 Verifier直接提交任意收款地址或金额。Provider 收入由固定单价乘新增成功量计算，扣罚由条款乘新增违约数并受剩余保证金限制。Verifier 仍然可以谎报事件，必须公开这一信任限制。

### 9.2 推荐接口及权限

| 接口概念 | 调用者与限制 | 效果 |
| --- | --- | --- |
| depositBond | Provider | 增加自身 freeBond |
| withdrawFreeBond | Provider | 只取未锁定部分 |
| createCommitment | 被报价绑定的买方 | 验证双 Provider 与协调器签名，原子托管和锁定 |
| submitCheckpoint | 可由 relayer 提交授权签名 | 更新累计用量、收入、扣罚与证据摘要 |
| checkpointAndList | 当前 Owner，附特定用途检查点 | 同步用量并锁定整份剩余权益 |
| buyListing | 指定买方或按条款允许的买方 | 原子付款、转移 Owner、增加 ownerEpoch |
| cancelListing | Owner；过期清理可 permissionless | 清除链上挂牌锁 |
| closeWithCheckpoint | Owner，附关闭用途检查点 | 同步最后执行并禁止再消费 |
| settle | CLOSED；或到期且有最终检查点 | 分配退款并释放保证金 |
| forceSettle | end + grace 后任何人 | 按最后确认状态退出，禁止后续检查点 |
| withdraw | 受益钱包 | 领取自身 claimable |

这里是业务接口规格，不是可直接粘贴编译的 ABI。实现时补齐参数、custom errors 和 NatSpec；不要把省略参数当作已实现接口。

### 9.3 签名与重放保护

使用 EIP-712；签名 domain 绑定 chainId、verifyingContract、name、version。业务数据绑定 buyer/owner、reservationId、termsHash、nonce、deadline。链 ID 或部署地址变化，旧签名必须无效。[S12]

检查点签名绑定 commitmentId、ownerEpoch、nextSequence、累计四个计数、evidenceHash、purpose 和 deadline。LIST 用途额外绑定 listingPrice、designatedBuyer、listingExpiry；CLOSE 用途绑定提前终止动作；FINAL 用途只可在窗口结束、排空后用于最终结算，防止通用用量签名被挪用为交易授权。

计数必须单调、sequence 精确递增。Owner 变化后不能使用旧 epoch 签名。v0.1 默认 EOA；若未测试 ERC-1271 钱包，不宣称支持。

### 9.4 事件和安全

事件覆盖 Created、CheckpointApplied、PenaltyAccrued、Listed、ListingCancelled、OwnershipTransferred、Closed、Settled、Withdrawal；携带 id、必要版本与摘要，避免上传搜索正文。

使用成熟 ERC20 安全转账及签名组件，固定经过测试的库版本。[S12][S13] 防重入、权限、零地址、零额度、无效时间、精度溢出、nonce 复用、过期签名、双支付均需测试。管理员暂停只阻止新风险操作，不阻断已确权资金领取和到期兜底退出。

### 9.5 异常退出限制

Verifier 不可用时，end + grace 后允许按最后检查点退款/解锁。未上链但已发生的执行或违约无法公正追溯，可能损失 Provider 收入或买方补偿。此机制避免无限锁款，但不是无争议仲裁；上线界面与 README 必须写出。

## 10 链下账本与转让一致性

### 10.1 数据库权威范围

PostgreSQL 持久化所有 reservation、logical request、attempt、event、checkpoint 和 transaction job。链上是 Owner 和资金的权威；数据库是未提交执行的权威。显示 liveUsed 与 confirmedUsed，不能覆盖混淆。

每个 Commitment 的准入、完成、冻结使用事务与行锁；不依赖单个 Node 进程内锁。限制单一 active worker 或使用数据库 lease，避免两个 worker 同时处理同一请求。

### 10.2 检查点策略

正常成功按每 5 次或最长 30 秒形成检查点；违约、挂牌和关闭优先提交。此为演示配置，不作生产经济参数。

一个 Commitment 同时仅有一个正在发送的检查点任务；累计计数、序号和交易 intent 持久化。交易广播后未返回时，按发送地址 nonce、已知 hash 和链上事件恢复，禁止盲目生成新业务动作。

确认深度为可配置的测试网策略，默认 3 个块；它不是 L1 最终性承诺。索引器记录 blockHash，发现重组从共同祖先重放，受影响权益冻结直到恢复一致。

### 10.3 无并发双花的转让流程

1. Owner 发起挂牌准备；数据库先进入 FREEZING，拒绝新执行。
2. 排空在途请求；若不明执行未能收敛，不能挂牌。
3. 生成 LIST 专用检查点并签名；保持数据库冻结。
4. Owner 调用 checkpointAndList，合约原子接受检查点并锁定。
5. 确认后记录 LISTED，再显示购买按钮。
6. 买方付款和 Owner 更新在一笔链上交易完成；索引确认后更新数据库 epoch。
7. 新钱包认证后执行；旧 epoch 的 session/请求均拒绝。

钱包取消签名不等于可以立刻解冻：只要存在仍有效的 LIST 签名，就可能被延迟发送。需待该签名 deadline 经过且确认未上链，或通过已实现的链上 nonce 作废流程，再恢复执行。相同规则用于 CLOSE 准备。

挂牌交易已确认但数据库回调丢失时，以链上事件恢复锁定；数据库不可读或链上状态不确定时 fail closed。这个原型不保证在恶意 Verifier 下防双卖，只保证受信协调器和合约状态协作下的流程一致性。

### 10.4 挂牌约束

成交前验证：未过期、尚有额度、Commitment 未关闭、剩余窗口满足执行条件、买方符合 designatedBuyer、价格和状态版本匹配。窗口即将结束时不接受购买。转让期间冻结消费，剩余额度不应变化。

测试网演示限定一个指定买方，避免陌生访客抢走录制中的权益；公开页面仍可查看完整交易。取消及过期解除必须链上确认。不会由浏览器本地倒计时自动宣布解锁。

## 11 应用架构与代码结构

### 11.1 固定一套栈

建议 Next.js + TypeScript 实现网页，Node.js 长驻进程实现 API/worker，PostgreSQL 存储事务账本，Solidity + Hardhat + OpenZeppelin 实现合约，viem/wagmi 连接 EVM，Zod/JSON Schema 校验输入输出，Playwright 做端到端验收。样式采用 Tailwind 或既有设计系统，选定后不重复迁移。

这是项目技术选择，不是官方要求。具体版本由执行 AI 在开工时读取官方兼容说明后选择一组能通过构建和测试的稳定版本，写入 lockfile 与 `docs/toolchain.md`。不要在九天周期中途追逐最新大版本。

默认不增加 Redis、微服务网关、Kubernetes 和第二种数据库。数据库 outbox + worker 足以承载演示。同步 HTTP 不应在等待链上确认时长期占用请求；返回 jobId，由前端轮询或 SSE 查询结果。

### 11.2 逻辑拓扑

```text
OKX AI User ──> Free Quote HTTPS ──> Quote / Reservation Engine
                                           │
Browser / Agent client ──> Auth + API ──> PostgreSQL ledger
                              │               │
                              v               v
                        Execution Router   Outbox Worker
                         /           \         │
                    Provider P   Provider B   Verifier
                         \           /         │
                          Attempt logs         v
                                        X Layer Testnet
                              Registry + tCOM + Event Indexer
```

前端不可直接访问 Provider 密钥、数据库服务账号或 Verifier 密钥。报价服务不需要获得用户私钥。Agent 使用与前端相同的业务 API，不为 Demo 另开一条绕过权限的成功路径。

### 11.3 仓库目录

```text
commit/
  apps/web/                 # 页面与交互
  apps/api/                 # 认证、报价、预留、执行和查询
  apps/worker/              # 索引、检查点、超时恢复
  apps/providers/           # 两个受控 Provider 实例
  packages/domain/          # 条款、状态机、金额和共享类型
  packages/contracts/      # Registry、MockToken、部署、测试
  packages/provider-sdk/   # Adapter 接口与 Schema
  db/migrations/           # 可重复应用的迁移
  scripts/                 # doctor、seed、demo、验收
  tests/integration/
  tests/e2e/
  docs/                    # 架构、授权、工具、限制、运维
  submission/              # 提交文案和视频脚本
  evidence/                # 脱敏后的证据索引
  README.md
  TASKS.md
  PROJECT_STATUS.md
  DECISIONS.md
  APPROVALS.md
  .env.example
  .gitignore
  package.json
  pnpm-lock.yaml
```

不要创建空 SDK 和复杂抽象来假装工程完整。若现有仓库已选不同的合理结构，保留结构并提供责任映射。上述为新仓库的建议，不是要求推翻已运行项目。

### 11.4 必须提供的开发命令

项目应实现并实际验证以下脚本名，README 只写验证成功的命令：

```text
pnpm install --frozen-lockfile
pnpm doctor
pnpm db:migrate
pnpm seed:local
pnpm dev
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:contracts
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm demo:local
```

测试网部署、资金初始化及远程发布使用独立命令，默认拒绝 mainnet。执行需对应批准，不能被 `dev` 或 `test` 隐式触发。seed 默认仅允许本地开发库，明确拒绝已发布 evidence 数据库。

### 11.5 环境配置

公开值：应用 URL、chainId、合约地址、测试币地址、公开浏览器 URL、OKX AI 服务 URL。私密值：数据库连接、Provider 内部认证、Verifier/relayer 签名接口凭据、登录 session secret、可选上游和 SDK 凭据。

`.env.example` 只放变量名、说明和占位值。密钥不得放进 `NEXT_PUBLIC_*`、镜像层、提交材料或截图。服务器环境文件和密钥路径只记录访问方式，不写正文。启动配置缺失时清楚报错，禁止偷偷回退 mock。

## 12 数据库与 API 规格

### 12.1 数据表

| 表 | 核心字段与约束 |
| --- | --- |
| providers | id、wallet、poolId、internalEndpoint、schemaVersion、health；地址唯一 |
| provider_windows | providerId、start、end、reservationId、status；互斥重叠预留 |
| quotes | id、requestHash、terms、expiresAt、sourceTraceId；不可改价 |
| reservations | id、quoteId、buyer、termsHash、deadline、signatureStatus、status |
| commitments | chainId + registry + chainId内id 唯一；owner、epoch、liveUsed、confirmedUsed、mode |
| logical_requests | commitmentId、epoch、clientRequestId 唯一；payloadHash、status、lockedUnit |
| provider_attempts | attemptId 唯一；logicalId、provider、timing、reason、responseHash |
| sla_events | attemptId + ruleVersion 唯一；attributable、penaltyIntent |
| checkpoints | commitmentId + sequence 唯一；epoch、累计计数、hash、purpose、txStatus |
| listings | commitmentId、version、buyer、price、expiry、status、transaction |
| chain_events | chainId + txHash + logIndex 唯一；blockHash、confirmed、payload |
| outbox_jobs | intentKey 唯一；type、payloadHash、state、attempts、leaseUntil |
| sessions | wallet、nonce、expiry、domain、revoked；不存私钥 |
| audit_events | actor、action、target、UTC、traceId、result；追加写入 |

窗口互斥可采用 PostgreSQL range exclusion 或事务内锁定 Provider 的窗口集合；必须用两次并发预订的集成测试证明，不只做应用层先查再写。

时间统一 UTC ISO 8601，链上用 Unix 秒；UI 可切换本地时区，但标签必须显示时区。金额 API 使用最小单位十进制字符串，避免 JS 浮点数。原始搜索结果与隐私字段不直接放公开 evidence。

### 12.2 接口清单

| 方法与路径 | 权限 | 关键行为 |
| --- | --- | --- |
| GET /api/health | 公共 | 进程存活，不泄露配置 |
| GET /api/ready | 运维受控 | DB、链、worker 状态 |
| GET /api/config | 公共 | 公开网络及版本配置 |
| POST /api/auth/nonce | 限流 | 生成单次 nonce |
| POST /api/auth/verify | 钱包签名 | 域名、nonce、时间和网络校验 |
| POST /api/capacity/quote | 公共限流 | 返回报价或明确不可用原因 |
| POST /api/reservations | 已认证买方 | 两池原子预留，返回条款和交易准备数据 |
| GET /api/commitments/:id | 公共脱敏 | 链上与实时状态分列 |
| POST /api/commitments/:id/execute | 当前 Owner | 幂等、窗口、速率、余额和 epoch 检查 |
| GET /api/requests/:id | 对应 Owner或脱敏只读 | 查询异步执行结果 |
| POST /api/commitments/:id/prepare-list | 当前 Owner | 冻结、排空、准备 LIST 签名 |
| POST /api/commitments/:id/prepare-close | 当前 Owner | 冻结、排空、准备 CLOSE 签名 |
| GET /api/listings/:id | 公共 | 可买状态、权利、价格和剩余风险 |
| GET /api/evidence/:runId | 公共脱敏 | 只读已完成演示证据 |
| POST /api/admin/demo/fault | 演示管理员 | 指定下一次 attempt 注入，单次生效 |

买卖、托管、领取等钱包交易由前端构造并经钱包签名，不使用传入 wallet 字段冒充认证。不提供公共 `/breach` 或任意余额修改 API。认证建议遵循 SIWE 的 nonce、域、URI 和有效期语义。[S14]

### 12.3 报价示例

以下为字段示意；时间与价格均由运行时真实计算，不可原样当生产响应：

```json
{
  "quoteId": "generated-at-runtime",
  "schemaVersion": "search.v1",
  "serviceClass": "search",
  "quantity": 20,
  "window": {"start": "runtime UTC", "end": "runtime UTC"},
  "limits": {"maxConcurrency": 1, "minIntervalMs": 1000},
  "sla": {"attemptTimeoutMs": 8000, "maxAttempts": 2},
  "providers": {"primary": "SearchNode", "backup": "Nova"},
  "asset": {"chainId": 1952, "address": "actual deployment", "decimals": 6},
  "amounts": {
    "unitPrice": "10000", "executionBudget": "200000",
    "primaryReservationFee": "20000", "backupReservationFee": "20000",
    "buyerTotal": "240000", "bondPerProvider": "100000"
  },
  "expiresAt": "runtime UTC",
  "termsHash": "computed from canonical terms",
  "reservationRequired": true,
  "traceId": "generated-at-runtime"
}
```

termsHash 采用共享编码函数：固定字段顺序、单位、版本和链；合约与 TS 对同一向量必须产生相同哈希，不对普通 JSON.stringify 随意排序结果签名。

### 12.4 错误模型

统一返回 `error.code、message、retryable、traceId`。推荐代码：INVALID_INPUT、QUOTE_EXPIRED、NO_CAPACITY、NOT_OWNER、WRONG_NETWORK、OUTSIDE_WINDOW、RATE_LIMITED、INSUFFICIENT_BOND、LISTING_LOCKED、CHAIN_UNAVAILABLE、REQUEST_UNCERTAIN、PROVIDER_FAILED、IDEMPOTENCY_CONFLICT。

429 附可重试时间；401/403 不自动重试；409 先刷新状态；链和 Provider 临时失败采用有限退避。前端展示“下一步怎么做”，不能显示堆栈和秘密。

## 13 网站信息结构与用户流程

### 13.1 评委访问原则

无需登录即可理解产品、查看演示证据、代码与集成链接。写入测试需要钱包和明确的 testnet 提示；不要强迫评委充值、注册才能看懂产品。

提供两个清楚入口：**View verified demo** 查看已完成的真实演示；**Try on testnet** 发起新测试。历史演示明确标注 Recorded run、运行时间、版本和真实交易，不假装实时。

### 13.2 页面和路径

| 页面 | 路径建议 | 主要作用 |
| --- | --- | --- |
| 首页 | / | 30 秒理解问题、闭环和证据入口 |
| 预订 | /reserve | 输入需求、查看报价和授权创建 |
| 权益详情 | /commitments/:id | 操作执行、查看 SLA、资金与日志 |
| 转让详情 | /transfers/:id | 买方明确知道买到什么 |
| 证据中心 | /evidence/:runId | 验证 OKX AI、合约、交易和仓库 |
| 文档 | /docs | 范围、条款、信任限制和复现方式 |
| 演示控制 | /admin/demo | 强认证、无索引、仅受控环境 |

### 13.3 首页内容顺序

第一屏：一句产品定义，测试网/原型标签，Reserve capacity 与 View demo 两个按钮。第二屏：Reserve → Execute → Recover → Transfer → Settle 的简图。第三屏：用真实 evidence run 展示一次扣量、扣罚和转让。第四屏：OKX AI 与 X Layer 的具体分工。末尾：信任限制、GitHub、文档与官方服务入口。

不展示假合作伙伴 Logo、虚构用户数、未测收益或“99.99% uptime”。名称 SearchNode/Nova 是本项目演示 Provider，不伪称第三方商业服务。

### 13.4 Reserve 页面

输入：服务类别、开始时间、持续时间、数量。并发、时限、单价作为条款显式呈现。自然语言输入 P1，不影响结构化表单。

报价后展示两家 Provider、全部费用、保证金和可用性。解释“Quote is not a reservation”。用户确认后先创建占位，再做精确额度 token approval 和创建交易；分别显示每一步，钱包拒绝时保留表单。

创建成功依据 receipt/event，而非仅有 txHash。显示 Commitment ID、真实链、Owner、服务窗口和 View transaction。交易等待中允许离开并恢复，不能重复扣款。

### 13.5 Commitment 工作台

桌面布局：左侧权益与资金摘要，中间执行输入和请求时间线，右侧 SLA 与 Provider 路由。主要动作 Run request、Transfer remaining、Close and settle 根据状态禁用并说明原因。

容量：Total、Consumed、In flight、Remaining，另标 confirmed checkpoint。资金：未用预算、两家 lockedBond、本人补偿、可领取金额。不要把剩余预算和钱包余额相加作为“利润”。

时间线：请求接入 → 主尝试 → 超时/成功 → 备用尝试 → 结果 → 检查点提交 → 链上确认。展开可看 requestId、attemptId、reasonCode、时间、证据摘要和交易。

### 13.6 Transfer 页面

卖方先看到冻结消费提示和条款摘要，再输入固定价格、指定买方和有效期。买方看到剩余次数、剩余可用时间、当前 Provider、双方剩余保证金、可退预算以及成交价格。

成交后用新钱包显示可执行入口；原钱包显示历史收入/补偿，不再显示执行按钮。转让完成页仍指向同一 Commitment ID 和新 epoch，不创建不存在的 child position。

### 13.7 Evidence 页面

一页串起 runId、构建 SHA、日期、OKX AI 调用记录、quoteId、Commitment ID、创建/扣罚/转让/结算交易、测试报告摘要和 Known limitations。每个链接可打开；无链接的已完成状态必须说明原因，不放 `0x...` 假地址。

## 14 UI 设计系统与交互细节

### 14.1 视觉规范

方向：克制的运行控制台，高可读性与清晰状态。默认暗色，英文产品界面便于比赛；中文解释保留在开发文档，不强制做全站多语言。

| Token | 建议值 |
| --- | --- |
| background | #08090A |
| surface | #111315 |
| elevated | #191C20 |
| border | #343A40 |
| text | #F5F5F5 |
| textMuted | #B2B8C2 |
| accent | #B6FF3B；按钮用深色文字 |
| success | #59D38C |
| warning | #F4BE55 |
| danger | #FF7B7B |
| transfer | #80B7FF |

颜色为起点，必须实际测对比度。正文目标不低于 4.5:1，大字/关键非文本控件按适用可访问性标准验证。不要只靠红绿区分状态，配图标和文字。

字体：系统无衬线或本地托管 Geist/Inter；数字使用 tabular-nums，地址与短日志用等宽。正文 15–16px，辅助 13–14px，标题 24–32px，关键额度 32–40px。不要为塞数据把全页缩到 10px。

间距采用 4/8/12/16/24/32/48；卡片圆角 10–12px；内容最大宽度约 1280px。桌面 1440×900 为主验收视口，另测 1280×720、768×1024、390×844。

### 14.2 核心组件

WalletConnect、NetworkBadge、TimeWindow、CapacityMeter、ProviderStatus、SlaMetric、MoneyBreakdown、TransactionStepper、RequestTimeline、EvidenceLink、ErrorPanel、ConfirmationDialog。

一个组件一套状态定义，所有页面共享。Disabled 按钮带原因；Loading 避免无限 spinner；空列表说明如何开始；错误保留输入；所有 icon button 有可读标签；键盘 Tab、焦点、弹窗 Escape 和 reduced-motion 均可用。

### 14.3 交易交互

统一步骤：准备 → 等待钱包 → 已广播 → 等待确认 → 完成。区分用户拒绝、链失败、网络错误、交易替换和索引延迟。按钮防双击不等于业务幂等，两者都做。

链上未确认时显示 Pending，不能提前把 Owner 或保证金显示成最终结果。重试以现有 intent 为中心，不生成重复资金行为。

### 14.4 故障演示视觉

违约发生后，时间线出现红色事件，并显示 Primary timed out、Backup running。备用成功后出现 Recovered via Nova。Penalty pending/confirmed 独立显示；不能把“备用成功”与“链上罚款成功”合成一个强制成功动画。

动效 150–250ms，用于状态变更和数字反馈，不做红色全屏闪烁。测试者和评委可关闭动效。图表只呈现真实测量，少量请求用点/列表，不用无意义的平滑历史曲线。

### 14.5 UI 验收

截图覆盖正常、无容量、钱包未连接、错误网络、等待交易、违约、备用成功、挂牌冻结、已转让、已结算。检查手机表格换行、长地址截断、金额不被截断、按钮可点击、无布局跳动和浏览器控制台错误。

## 15 Agent 和 Provider 的实现细节

### 15.1 TradeBot 客户端

交付最小脚本或 CLI：读取需求 → 调用报价 → 输出选择和交易准备 → 经授权创建 → 到窗口内执行。人类钱包批准保持明确。禁止脚本悄悄读取用户日常钱包私钥。

研究买方 ResearchBot 可由第二个测试钱包加确定性脚本实现。它必须真实调用相同认证和执行 API，不能只有前端角色切换。

### 15.2 Adapter 契约

`execute(attemptId, query, deadline, signal)` 返回 providerId、响应、状态和来源信息；计时由 Router 外层负责。可选 `getAttempt(attemptId)` 用于崩溃恢复，受控 Provider 必须提供。服务端限制结果大小、重定向和处理时长。

Provider 收到重复 attemptId 时返回持久化的同一结果。Search 请求只读，允许在主超时后备用重试。未来写入类服务不能直接沿用本策略，避免产生两次不可逆副作用。

### 15.3 故障注入

只对指定 runId 和下一次指定主 Provider attempt 注入 11 秒延迟，确保实际超过 8 秒阈值。配置只消费一次；重置只清除未来故障计划，不改历史请求和链上状态。

故障 API 需要管理员会话与防 CSRF 校验，默认关闭；不得靠“隐藏路径”充当鉴权。公开用户不能选择任意延迟制造资源耗尽。录制里显示 Controlled failure injection 标签。

### 15.4 轻量需求验证

作为 P1 准备三类访谈问题：Agent 开发者在哪些时段真的遇到容量不足；Provider 是否愿意接受专用容量池和保证金；买方为何不直接购买已有 SLA 套餐。只记录真实反馈，未经批准不外发联系消息。不要把完成样本 Demo 称为已有客户验证。

## 16 部署与环境隔离

### 16.1 三个环境

Local：本地链、开发数据库、可随时重置的数据；用于绝大多数测试。

Staging：X Layer Testnet、测试专用钱包、HTTPS、独立数据库；用于官方集成和视频预演。

Submission：固定版本网站、已完成证据和受控测试写入。可以与 Staging 共用代码，但不能在提交后随意重置数据库或换合约地址。

正式产品不等于主网资金。网站可以正式对外可访问，合约仍明确标为 Testnet。

### 16.2 推荐运行方式

容器或常驻进程承载 web、api、worker 和两个 Provider；PostgreSQL 独立持久卷；反向代理终止 HTTPS。API/worker 不假定 serverless 请求结束后仍继续运行。用量恢复和过期结算由可靠 worker 执行。

首次部署前只读检查 CPU、内存、磁盘和已有服务。资源不足时缩减进程或使用独立环境，不挤占原业务。内部服务仅监听回环或私有网络，数据库不开放公网。

### 16.3 现有东京服务器约束

已有 `alpha.jibai.site` 与 `game.jibai.site` 必须保持正常。Commit 使用新的应用目录、服务名、独立数据库和经检查可用的端口；域名仅为待批准项，不默认创建 `commit.jibai.site`。

不能复用 `/usr/local/sbin/deploy-alpha-coliseum-game` 来部署 Commit，该脚本属于游戏站。不能覆盖 `/www/wwwroot/alpha-coliseum-game`，不能抢用 3001，也不能删除历史备份。

管理连接遵循工作区说明，优先保存的 OrcaTerm 会话或腾讯云 TAT；公网 SSH 已知不可用时不反复尝试。代理配置、权限、服务和 DNS 变更逐项说明范围并获得授权。部署后额外检查两个原站 HTTPS 和关键页面。

本手册和公开仓库不需要放服务器 IP、私钥路径或内部控制台信息，运维私密信息留在用户授权的本地记录中。

### 16.4 发布步骤

1. 固定 Git SHA，全部必要检查通过。
2. 在本地构建发布包/镜像，记录依赖锁和配置需求。
3. 备份目标数据库、旧发布包和代理配置。
4. 执行可回滚的新增迁移，禁止未经批准的破坏性迁移。
5. 部署新版本到独立位置，先跑 health/readiness。
6. 切换指定流量，检查 HTTPS、真实 API、worker、链 ID 和关键页面。
7. 运行测试网 smoke test，保存 runId 和交易证据。
8. 回归原站，记录发布成功与回滚位置。

回滚优先切回上一发布版本；数据库采用前向兼容迁移。链上部署不可按服务器回滚，合约有缺陷时停止新建、保留领取/退出路径、部署新地址并明确区分历史证据，不覆盖旧链事实。

## 17 安全与故障恢复

### 17.1 权限隔离

测试专用钱包分别承担 Owner A、Owner C、Provider P/B、Verifier/relayer。角色可以由同一开发团队控制，但 UI 与文档如实披露。Verifier 密钥只给签证用途，不成为任意资金提现权限。

钱包登录 nonce 单次使用、短时有效、绑定正确域和链；认证 Cookie 使用 HttpOnly、Secure、SameSite，写入路由防 CSRF。API 限流按 IP 与钱包双维度，公开报价和管理员操作分开限额。

### 17.2 重点威胁和控制

| 风险 | 必须控制 |
| --- | --- |
| 双卖/双消费 | 数据库行锁、链上挂牌锁、epoch 和排空流程 |
| 重放/重复罚款 | 幂等键、累计计数、nonce、sequence 和用途签名 |
| SSRF | Provider URL 固定白名单，拒绝用户自带目标 URL |
| 密钥泄漏 | 服务器秘密隔离、日志脱敏、提交前扫描 |
| 免费服务滥用 | 报价限流、预留需认证、单钱包占位上限 |
| 管理入口暴露 | 鉴权和网络控制，非隐藏 URL |
| 代币/金额错误 | 单资产白名单、整数计量、资产和链校验 |
| 时间竞争 | 链时间约束、到期停止接单、签名 expiry 确认 |
| Verifier 作恶 | 明示信任边界、单份最大敞口、无主网资金 |
| 前端 XSS | 搜索结果当不可信文本，不直插任意 HTML |

### 17.3 运行恢复表

| 故障 | 立即行为 | 恢复与验证 |
| --- | --- | --- |
| API 重启 | 已受理请求保持持久化 | 按 attemptId 恢复，不重复收费 |
| Provider 无响应 | 8 秒超时，按规则备用 | 记录原因，隔离主路由 |
| DB 不可用 | 停止准入和签新检查点 | 恢复数据库并对账 |
| RPC 不可用 | 冻结依赖所有权/资金的操作 | 切只读备用 RPC，校验同一链 |
| 交易卡住 | 显示 pending，保留 intent | 查 nonce/hash，替换需同一业务语义 |
| 索引延迟 | 显示状态同步中 | 重放已确认事件，避免乐观解锁 |
| 链重组 | 冻结受影响权益 | 从共同祖先重放并审计差异 |
| Verifier 长停 | 不签新动作 | 到期宽限后按确认状态退出 |
| 上架被拒 | 保留原因和真实状态 | 修正接口/说明后经授权重提 |

### 17.4 日志、备份和隐私

结构化日志至少包含 UTC、level、traceId、runId、commitmentId、requestId、attemptId、txHash、errorCode。正文搜索查询默认不公开，日志不得含 token、Cookie、签名秘密或私钥。

每日备份数据库和部署元数据；录制前、发布前再做一次，至少实际恢复一份到本地临时库验证。保留已提交 evidence 与对应代码版本。日志轮转并设磁盘阈值，避免录制当天磁盘写满。

提交后保持站点和证据至少覆盖评审窗口，建议至 10 月 10 日并由负责人确认费用；不是自动创建监控或续费授权。

## 18 测试计划与通过标准

### 18.1 测试分层

单元测试：金额计算、SLA 归责、状态转换、条款哈希和展示派生状态。

合约测试：签名、权限、资金不变量、转让、领取、超时退出及恶意重放。

集成测试：真实数据库事务、两家 HTTP Provider、worker、索引和崩溃恢复。

端到端：浏览器和两个测试钱包完成闭环；使用本地链自动化与测试网人工/脚本 smoke 两套证据。测试用 mock 不得替代提交视频中的外部集成证据。

### 18.2 必须执行的用例

| ID | 场景 | 预期 |
| --- | --- | --- |
| T01 | 两个买方并发预留同窗口 | 只成功一份，不超卖 |
| T02 | 过期报价/预留签名 | 拒绝，释放规则安全 |
| T03 | 资金或一方 bond 不足 | 创建整笔回滚 |
| T04 | 未开始/已到期/剩余时长不足 | 拒绝执行，不处罚 Provider |
| T05 | 正常成功 | 核销 1，收入增加 1 单价 |
| T06 | 主超时，备用成功 | 只核销 1，主罚一次 |
| T07 | 主迟到成功 | 不新增用量与收入 |
| T08 | 双 Provider 失败 | 核销 0，按归责分别处理 |
| T09 | 同键重复请求 | 返回原结果，不再调用 |
| T10 | 同键不同 payload | 409，保留原请求 |
| T11 | 并发超限/超速 | 拒绝第二次准入 |
| T12 | Schema 无效 | 记录违约，按规则备用 |
| T13 | 客户端断网后重查 | 返回真实执行结果 |
| T14 | API 在调用后重启 | 不重复收费，可恢复或显式 UNCERTAIN |
| T15 | 重复/回退检查点 | 拒绝，不重复罚款 |
| T16 | 错链/错合约/错 epoch 签名 | 拒绝 |
| T17 | 在途请求时挂牌 | 等待排空，不提前完成 |
| T18 | 签名后用户关闭页面 | 保持冻结至安全解锁 |
| T19 | 挂牌期间执行 | 拒绝 |
| T20 | 过期挂牌/错误指定买方 | 不能成交 |
| T21 | 成交后旧钱包执行 | 拒绝；新钱包成功 |
| T22 | 转让前后 escrow 与额度 | 守恒 |
| T23 | 提前关闭/正常到期 | 正确分配退款和 bond |
| T24 | Verifier 无响应 | grace 后可退出，已确认权益保留 |
| T25 | 重复提现/重入尝试 | 不能多提 |
| T26 | bond 耗尽 | 不继续提供该担保服务 |
| T27 | RPC 中断/索引延迟 | 不虚报确认或解锁 |
| T28 | 后端链事件重放 | 不重复应用 |
| T29 | 未授权故障注入 | 401/403，无影响 |
| T30 | 完整标准资金剧本 | 第 7 章总账等于 0.59 |
| T31 | OKX AI User 侧调用 | quoteId 可进入创建流程 |
| T32 | 手机/键盘/长地址 UI | 无截断、可操作、状态可辨 |
| T33 | 冷启动新环境 | README 步骤可复现 |
| T34 | 回滚/备份恢复 | 服务与账本可恢复 |

### 18.3 测试证据

`docs/QA_REPORT.md` 记录测试日期、环境、Git SHA、命令、结果、用例映射及未通过项。不能只写“全部测试通过”而没有运行结果。对关键合约不变量做随机序列/property 测试，例如执行、挂牌、取消、转让、关闭和领取的组合。

最终 release candidate 本地完整流程连续 5 次通过；测试网至少一轮完整闭环，并针对录制流程再预演。小改动后复测受影响用例；不得为凑次数反复消耗资金而无新增验证价值。

阻断发布：资金对不上、重复计费、越权消费、假成功状态、秘密泄漏、关键链接不可访问、核心官方集成未验证。视觉轻微问题可记录，但不能把遮挡金额或无法点击当轻微问题。

## 19 可执行任务包与依赖

### 19.1 任务状态规则

状态只用 TODO、IN_PROGRESS、BLOCKED、REVIEW、DONE。DONE 必须附证据。一个任务默认一个负责者；多人或多个 AI 时按文件/模块分工，共享接口先冻结，禁止回滚他人修改。资金与最终架构判断由主负责人复核。

以下工作量是规划估算，非交付保证。执行 AI 完成仓库盘点后应重估，发现超出九天承载能力时优先收缩范围。

### 19.2 任务卡

**W01 仓库盘点与范围冻结，约 2–3 小时。** 输入：本手册、现有仓库。输出：差异清单、TASKS、DECISIONS、授权清单。依赖：无。验收：所有未知项有负责人或保守默认，没有把旧项目误纳入改造。可先只读完成。

**W02 工程与环境骨架，约 3–5 小时。** 输入：W01 和本地实施授权。输出：目录、锁文件、配置校验、数据库连接、health、基础 CI。验收：干净环境 install、typecheck、build 通过；无密钥入库。

**W03 领域规则与对账函数，约 3–5 小时。** 输入：第 6–10 章。输出：金额类型、状态机、SLA reason codes、条款编码、标准剧本。依赖 W02。验收：第 7 章账务可自动验证；同条款 TS/合约哈希向量一致。

**W04 双 Provider，约 3–5 小时。** 输出：Search v1、attempt 幂等、结果查询、独立实例、受控故障注入。依赖 W02/W03。验收：真实检索，主 11 秒延迟可观测，备用不受相同故障开关影响。

**W05 Quote 和 Reservation，约 4–6 小时。** 输出：只读报价、占位事务、过期回收、双池冲突控制。依赖 W03。验收 T01/T02；quote 与 reservation 语义分离。此任务完成后立即准备 A2MCP 上架，不等全部网页。

**W06 合约创建和资金底座，约 6–9 小时。** 输出：MockToken、bond 存取、签名创建、事件。依赖 W03。验收 T03/T16/T25；独立复核资金权限后才准备测试网部署。

**W07 检查点与结算合约，约 5–8 小时。** 输出：累计用量/扣罚、关闭、正常与异常结算、领取。依赖 W06。验收 T15/T23–T26/T30。不能延期到最后一天。

**W08 钱包认证与创建 UI，约 4–6 小时。** 输出：SIWE 会话、网络检查、报价确认、approval、创建和交易状态。依赖 W05/W06。验收：两钱包身份隔离，用户拒绝后可恢复。

**W09 执行 Router 与账本，约 6–9 小时。** 输出：准入事务、in-flight、Provider attempts、结果核销、恢复。依赖 W04/W05/W03。验收 T04–T14，强调幂等与崩溃恢复。

**W10 Worker 和链索引，约 4–7 小时。** 输出：outbox、交易重试、检查点策略、链事件同步。依赖 W07/W09。验收 T27/T28；链下成功和链上 pending 分开。

**W11 转让合约与 API，约 5–8 小时。** 输出：freeze/drain、LIST 签名、原子购买、取消、epoch 更新。依赖 W07/W09/W10。验收 T17–T22。禁止此阶段临时加部分拆分。

**W12 工作台与转让 UI，约 4–7 小时。** 输出：详情、时间线、资金、SLA、转让、领取。依赖 W08–W11。验收：标准剧本所有状态由真实后端/合约驱动。

**W13 OKX AI 联调，约 3–6 小时加外部等待。** 输出：HTTPS 接口、服务草稿、授权后注册/上架、User 侧调用证据。依赖 W05 和公网发布授权。验收 T31。审核等待不算完成，期间继续本地任务。

**W14 测试网部署，约 2–4 小时加网络/权限准备。** 输出：版本、部署交易、源码验证、ABI、网络配置。依赖 W06/W07 的安全检查及授权。验收：链和资产正确、浏览器可验证、无主网隐式操作。W11 更新若需重部署，保留旧地址说明。

**W15 网站发布与恢复验证，约 3–5 小时。** 输出：发布包、运维说明、备份和回滚。依赖主要闭环、W14 和授权。验收 T34，原站回归正常。

**W16 QA 和威胁复核，约 6–10 小时。** 输出：测试报告、缺陷清单、修复证据。依赖各模块逐步完成，可持续执行。验收第 18 章阻断项为零。

**W17 Evidence 与文档，约 3–5 小时。** 输出：证据页、README、官方集成说明、Known limitations、运行手册。依赖真实运行。验收新环境按文档复现；无断链和假数字。

**W18 视频，约 3–5 小时。** 输出：脚本、完整原始录屏、最终 MP4、SRT、缩略图和授权后的可访问链接。依赖 release candidate 与证据。验收第 21–22 章。

**W19 提交和维持，约 1–3 小时加评审期维护。** 输出：表单字段核对、链接检查、授权提交、回执、联络安排。依赖 D01–D11。验收使用外部视角打开全部链接，保存真实 receipt。

### 19.3 关键依赖和工期判断

技术关键路径：W03 → W06/W07 → W09/W10 → W11/W12 → W16 → W18/W19。

外部关键路径：W05 → 受批准的 HTTPS 发布 → W13 审核/平台调用 → D02。这个路径必须早启动。

估算总量约 70–120 小时，取决于已有工程、返工和外部依赖；单人九天内紧张。AI 并行可减少独立任务等待，无法消除接口和安全复核。若实际只有很少可用工时，应提前把固定价格销售降为整份无偿转让并同步改文案，但需负责人批准，不能暗自把买卖动画留着。

### 19.4 并行团队建议

主 AI：领域规则、任务跟踪、合约/资金审查、集成、最终验收。工程 AI：在明确授权范围实现模块。低风险子任务：资料提取、文档链接检查、样例生成和测试结果整理。UI 协作者只改 web 和共享组件；合约协作者只改 contracts；后端协作者负责 API/DB/worker。共享 domain、ABI 变更由主 AI 协调。

不得把最终资金安全判断交给只做资料提取的代理。没有多代理条件时按依赖顺序执行，不为形式创建团队。

## 20 九天推进表与止损点

| 日期 | 当天必须看到的结果 | 阶段闸门 |
| --- | --- | --- |
| 9/17 | 规格、标准账务、工程和双 Provider 起步 | 默认规则冻结，重大未知已列明 |
| 9/18 | Quote/Reservation、公网接口准备；合约创建测试 | 无容量双卖；发起所需发布/上架批准 |
| 9/19 | 本地创建 + 执行 + 扣量；测试网基础部署 | 浏览器看到真实数据，启动官方买方联调 |
| 9/20 | 超时、备用、扣罚、检查点 | 故障闭环真实，非前端演出 |
| 9/21 | 关闭结算、退款、整份转让 | 标准资金剧本守恒 |
| 9/22 | OKX AI 全链联调；网站主要 UI 完成 | 禁止新增 P1；未接通官方集成立即升级处理 |
| 9/23 | 全用例复核、恢复、手机版和外部链接检查 | release candidate，无阻断缺陷 |
| 9/24 | 文档齐全、正式视频、提交字段准备 | 资料可完整审阅，预留修复时间 |
| 9/25 | 最终检查和经授权提交 | 建议北京时间 18:00 前提交，留缓冲 |

每天交接只需五项：今天完成什么证据、发现什么问题、明天最关键任务、等待哪项授权、截止风险是否增加。不要用长篇进度掩盖阻塞。

止损规则：9/20 仍无可用合约结算，停止 UI 装饰；9/21 转让未通过并发测试，禁止推进复杂市场；9/22 官方集成未通，不做 x402，立即准备官方求助材料；9/23 仍有资金错误，不能把当前版本称为可用产品；9/24 不再更换技术栈或合约模型。

## 21 演示视频分镜与旁白

### 21.1 视频目标

目标时长约 3 分 40 秒，保持在官方范围内。视频必须让评委看到产品、官方集成和经济结果。英文旁白建议，准确字幕比夸张剪辑重要；团队内部保留中文注解。

镜头使用同一 runId 与 Commitment。可以剪掉钱包等待和确认等待，但字幕注明等待被压缩，不能跨演示拼出不存在的完整闭环。另保存未经剪辑的完整录屏供复查。

### 21.2 分镜表

| 时间 | 画面与操作 | 证据重点 |
| --- | --- | --- |
| 00:00–00:18 | 首页一句话与简图 | 问题和有限担保定位 |
| 00:18–00:43 | OKX AI 用户侧调用报价 | 服务入口真实，显示 quoteId |
| 00:43–01:08 | 报价条款、钱包创建、交易确认 | 两家容量与保证金、测试网标签 |
| 01:08–01:30 | 进入窗口，两次成功请求 | 20 → 19 → 18，真实结果 |
| 01:30–02:05 | 明示故障注入，下一次主超时 | 8 秒阈值、备用成功、用量 17 |
| 02:05–02:25 | 显示扣罚链上确认与资金 | P bond 0.10 → 0.08，补偿 0.02 |
| 02:25–02:55 | 挂牌中展示指定买方，17 次权益以 0.15 转给该第二钱包 | 真实成交、Owner/epoch 变化 |
| 02:55–03:15 | 第二钱包执行一次 | 17 → 16，旧钱包无权执行 |
| 03:15–03:32 | 提前关闭、结算，第二钱包领取退款 | 0.16 从可领取变为钱包到账，闭环资金归属 |
| 03:32–03:45 | Evidence、限制和结束语 | OKX AI、X Layer、GitHub 三入口 |

时间为拍摄目标，不是让应用按脚本强制切状态。窗口提前 60 秒开始；可在创建和执行之间剪掉真实等待并标注。页面上的真实时间、交易和顺序必须可核对。

### 21.3 英文旁白草稿

Opening: “Agents can call services on demand. But a scheduled workflow may need capacity at a specific future time. Commit lets an agent reserve that capacity with explicit service terms, provider bonds, and a backup route.”

Quote: “We start inside OKX AI and call Commit Capacity Quote. The result comes from our reservation inventory. It includes two providers, a service window, a response deadline, and the full price. A quote alone does not reserve capacity.”

Create: “The buyer accepts these terms. Both providers commit capacity and collateral. This transaction creates the position on X Layer testnet. The tokens shown here are test assets.”

Execute: “When the window opens, successful requests consume reserved units. These are actual searches over our demonstration corpus. Request logs and remaining capacity update together.”

Failure: “We now inject a controlled delay into the primary provider. Commit observes the real timeout at eight seconds and retries through the backup. The backup succeeds. The logical request consumes one unit, not two.”

Penalty: “Execution recovery does not wait for a blockchain transaction. Separately, the verifier submits the breach evidence, and the contract applies the configured penalty. This prototype trusts the Commit-operated verifier.”

Transfer: “The first buyer no longer needs the remaining seventeen units. Execution is frozen, usage is synchronized, and a second wallet purchases the remaining entitlement. The service deadline stays the same. The buyer can see the remaining collateral before accepting.”

New owner: “The second wallet can now execute. The original wallet cannot consume this capacity. Ownership changes have an operational effect, not just a visual one.”

Settle: “We close the position early. The new owner withdraws the unused execution funds. Earned fees remain payable, and unused provider collateral is released. The evidence page links the service call, execution records, contract transactions, and code.”

Ending: “Commit demonstrates a programmable capacity agreement. Independent providers, stronger verification, and real customer demand remain the next tests.”

旁白按真实实现修改：如果用真实外部搜索，替换 demonstration corpus；如果只是无偿转让，删除 purchases；若没有实际领取镜头，只说余额可领取，不说已到账。

## 22 视频录制和成片操作手册

### 22.1 录制前检查

1. 固定 release SHA，清空浏览器无关标签和通知，退出私密邮箱界面。
2. 使用两个独立浏览器 Profile 或清楚区分的钱包账户，确认地址和链。
3. 准备足够测试 Gas、tCOM 和 Provider freeBond，关闭录制之外的故障计划。
4. 创建新的 runId，检查服务器时间、网络、worker 和官方服务可用。
5. 打开产品、OKX AI、浏览器交易页和 evidence；不预填假交易。
6. 做一轮真实预演，确认所有金额与第 7 章一致。
7. 启用勿扰、隐藏书签和个人头像；不录助记词、API 凭据、签名秘密或个人通知。

### 22.2 建议录制设置

使用团队已熟悉的系统录屏或 OBS；不为本次录制强制购买软件。选定 1920×1080 的画布，30fps，页面缩放以文字可读为准。录制整个应用区域和必要钱包弹窗；只录单标签可能漏掉授权过程。

若使用 OBS，可先保存较抗中断的录制格式再封装 MP4；这是制作建议，按当前软件能力验证，不是官方要求。无需直播。麦克风先录 10 秒试听，避免键盘声和削波。

录屏建议先完整录一遍操作，再按真实画面配旁白。鼠标移动缓慢，重要数字停留 2–3 秒；不用不停点击和滚动压缩信息。钱包等待可以剪，但不剪掉失败后换跑次的事实。

### 22.3 剪辑准则

- 前 20 秒明确产品价值，避免 40 秒片头。
- 每个镜头只表达一个变化：核销、故障、切换、扣罚、所有权、退款。
- 持续显示 Testnet；故障段显示 Controlled failure injection。
- 关键步骤显示短英文字幕；字幕避开右侧 SLA 与底部金额。
- 可以使用小标题说明时间压缩，不能生成假的浏览器 UI 或交易镜头。
- 若外部平台临时故障，使用同版本真实历史录屏并标注时间；若无法证明端到端关联，重新录制。

### 22.4 成片交付

建议 H.264 MP4、AAC 音频、1080p、30fps；码率根据文字清晰度取约 6–10 Mbps，上传平台兼容性实测。保留 `demo-final.mp4`、`demo-en.srt`、完整原始录屏、脚本、版本与 runId 对应表。

视频标题建议：Commit — Reserved Agent Capacity on OKX AI and X Layer。简介放产品、仓库和证据链接，说明测试网及验证器限制。

上传到负责人批准且评委可免登录观看的平台；YouTube unlisted 可作为候选，不是官方强制。不得默认选择公开发布。实际上传属于外部写入，需要授权。

### 22.5 最终视频验收

用未登录浏览器打开链接，确认有声音、字幕和 1080p 清晰度，时长 2–4 分钟，无地域或权限障碍。逐项检查：没有秘密、引用无误、金额一致、相同 Commitment、真实平台调用、链上确认、第二钱包执行、结算说明。将视频文件的 hash、上传 URL 和对应 release SHA 记录进提交包。

## 23 网站和代码的最终交付标准

### 23.1 网站

- HTTPS 正常，首页 30 秒内可理解，无需钱包即可查看已完成 evidence。
- 所有按钮有真实功能或明确禁用理由，没有 Coming soon 充当 P0。
- 测试网、测试币、受控 Provider 和中心化 Verifier 标识清楚。
- 创建、执行、故障、扣罚、转让、退款可核对；网页刷新后状态不丢失。
- 两个浏览器/钱包的权限真实区分；公开访客不能触发管理员故障。
- 404、无数据、钱包拒绝、链故障和服务错误页面正常。
- 移动端至少能阅读和查看证据；主要演示以桌面完整操作为准。
- 没有未授权版权素材、假合作声明、硬编码秘密或测试调试面板泄露。

### 23.2 代码仓库

README 头部依次放产品一句话、真实截图、产品/视频/证据/OKX AI/合约链接。随后解释问题、范围、快速启动、架构、条款、官方集成、资金模型、状态机、测试、部署、限制和构建期工作。

提交源代码、锁文件、数据库迁移、可运行测试、`.env.example`、合约 ABI 和部署元数据。不要提交 node_modules、数据库备份、真实 `.env`、钱包密钥、原始含隐私日志和大体积录屏；录屏按授权的平台链接提供。

记录本次 build period 的实际新增功能和正常 Git 历史，不伪造日期或补造提交。若复用已有组件，说明来源、原先功能和新工作；不要把全部旧代码包装成九天原创。

许可证由负责人确认，未经授权不替所有者选择不可撤销的开源许可。第三方依赖和素材保留许可及归属。私有仓库给评委访问权限的方式需提前验证，不能等截止时再发现访问受阻。

### 23.3 文档文件

必须交付：README、architecture、protocol-terms、threat-model、OKX-INTEGRATION、deployment、runbook、known-limitations、QA_REPORT、official-sources、build-period-work、demo-script、submission-checklist。

开发者需能回答：为什么存在预留费；备用服务为什么有容量；SLA 谁判断；为何罚款不重复；链下用量如何影响链上转让；Verifier 挂掉怎么办；测试币和真实资金有什么区别；项目使用了哪项官方能力。

### 23.4 提交包结构

```text
submission/
  PROJECT_SUMMARY.md
  FORM_DRAFT.md
  LINKS.md
  DEMO_SCRIPT.md
  demo-en.srt
  RELEASE_MANIFEST.json
  FINAL_CHECKLIST.md
  receipts/                 # 提交后回执，私密资料不公开
```

RELEASE_MANIFEST 至少含 project、version、gitSha、builtAtUTC、chainId、registry、token、providerMode、verifierModel、appUrl、okxServiceUrl、videoUrl、evidenceRunId、testsPassed、knownLimitations。未知值写 null/待完成并阻止对应发布闸门，不能填占位假 URL。

## 24 比赛提交与官方沟通

### 24.1 实际表单的核对

官方入口为 [项目提交表](https://forms.gle/81S2gnFCzqSoeDEA7)。本次只读检查发现需要 Google 登录，未读取登录后的实际字段。第 2 章来自 Builder Kit，不能当作表单逐项完整镜像。

负责人或获授权 AI 应提前打开实际表单，检查是否另需邮箱、成员资料、钱包、上传文件、字数、视频平台、访问权限或其他声明。仅填写草稿不等于批准发送；正式提交前把完整字段和值呈现给负责人。

### 24.2 提交摘要草稿

中文：Commit 是一个 Agent 服务容量预订原型。Agent 通过 OKX AI 获取未来窗口的服务报价，使用 X Layer 测试网合约创建带托管和 Provider 保证金的服务权益。系统执行并核销请求，在可归责故障后切换备用服务并记录经济后果，支持剩余权益转给第二个钱包继续使用，最后结算收入、补偿和未用预算。当前版本采用受控搜索 Provider、测试代币和中心化验证器。

English: Commit is a prototype for reserving future agent service capacity. Agents request capacity quotes through OKX AI and create service entitlements on X Layer testnet with escrow and provider bonds. The system executes and meters requests, routes around attributable provider failures, records economic consequences, and transfers remaining entitlements to another wallet for continued use. Settlement allocates earned fees, compensation, and unused execution funds. The current build uses controlled search providers, test tokens, and a Commit-operated verifier.

此段按实际完成项删改。未完成转让或未通过官方用户侧调用时，不能保留对应完成式陈述。

### 24.3 官方确认问题草稿

一次整理给主办方，避免零散追问：

1. 最新现场日期是 10 月 6 日还是 7 日？
2. Build a Company 使用已上架免费 A2MCP，加 X Layer Testnet 自建履约合约，是否符合本次集成要求？
3. 两家受控 Provider、明确披露的故障注入与测试代币，是否有额外演示要求？
4. 如服务仍处审核，有实际 OKX AI 调用和可访问集成证据时，可接受什么提交材料？
5. 两种 participation route 的最终选择或变更何时截止？

默认只生成提问草稿，不擅自向 Telegram 或邮件发送。保存官方回复的日期和链接或截图，更新规格与提交包。

### 24.4 最终检查和回执

发布版本锁定后，用无痕浏览器检查网站、视频、GitHub、OKX AI、浏览器合约页及全部交易链接。项目名、团队、路线、版本和描述保持一致。确认声明只对已核实内容作出。

经明确批准再提交；保存回执时间、回执邮件和提交版本。按官方要求留意补充材料通知，安排负责人每天查看联络渠道。不能声称“已提交”而只保存了表单草稿。

## 25 给执行 AI 的启动指令

下面可直接复制为下一轮任务提示。它要求先检查授权，再执行已经获准的工作。

```text
你接手 Commit 的 OKX Dev Day 2026 测试网原型开发。
请以本手册为需求和验收依据，先读取当前工作区 AGENTS.md。

第一阶段：只读盘点目标仓库，识别已实现、未实现和未验证的部分。
输出 TASKS 计划，按 W01–W19 标明依赖；确认目前授权范围。
若尚未批准本地开发，先给出具体目录、文件范围和实施方案申请一次授权。

获准后从 W02/W03 开始，先实现标准资金剧本、状态机和必要测试。
推进 Quote/Reservation 以尽早准备 OKX AI 集成，同时实现资金和执行闭环。
采用本手册默认设计，不自行新增部分拆分、主网交易或收费功能。

所有余额、用量、交易和所有权变化必须来自真实数据。
每完成任务保存可复核证据；在 PROJECT_STATUS.md 写下一步。
遇到阻塞先继续独立可做的工作，只向负责人集中提出关键问题。
测试网交易、服务器和 DNS 变更、注册上架、公开仓库、上传视频及正式提交，
必须遵循已有授权边界，不把本手册当作授权。

最终交付 D01–D12，并逐项报告未完成内容。
任何资金不守恒、权限漏洞或虚假成功状态均为发布阻断项。
```

交接时一并提供目标仓库位置、当前分支、最新测试报告和有效批准记录。不要要求接手 AI 从零猜测进度。若上下文丢失，以文件和实际代码为准，不能仅凭上一轮摘要宣布完成。

## 26 风险登记与负责人最少决策

### 26.1 最少需要负责人决定的事项

| 决策 | 建议默认 | 最晚处理时间 |
| --- | --- | --- |
| 目标仓库与本地开发授权 | 新的独立 Commit 项目 | 开始写代码前 |
| 默认功能范围 | 本手册 P0，整份剩余权益销售 | 9/17 |
| Provider 模式 | 固定公共语料受控服务 | 9/18 |
| 测试钱包和费用额度 | 专用钱包，主网操作逐次确认 | 注册/部署前 |
| 域名与服务器 | 独立部署，保护既有两站 | 公网接口发布前 |
| Participation route | 由实际行程决定，不猜 | 表单要求的截止前 |
| 仓库许可与公开权限 | 负责人明确选择 | 提交前 |
| 视频平台和正式提交 | 审阅最终链接后批准 | 9/25 内部目标前 |

负责人不必决定按钮圆角或每个函数名。实现 AI 在已授权范围采用默认值，自行完成可逆细节；只有范围、权利、资金、安全和外部影响才升级。

### 26.2 风险表

| 风险 | 早期信号 | 应对 |
| --- | --- | --- |
| 官方审核拖延 | 9/20 仍无用户侧调用 | 提前上架、保留证据、准备官方求助 |
| 范围失控 | 同时开发部分拆分、AI 预测和收费 | 冻结 P0，记录延期项 |
| 资金漏洞 | 两套余额或重复扣款 | 停止扩展，先修对账与不变量 |
| Provider 只是装饰 | 没有真实搜索或预留冲突 | 展示检索结果与拒绝超卖测试 |
| 备用不独立 | 两服务共享故障点 | 如实披露，避免宣传独立灾备 |
| 身份/钱包网络混淆 | 把注册当纯测试网免费操作 | 分别核对网络、费用和资产 |
| 录制当天不可用 | 没有预演、无备份 | 前一天锁版本、保存完整录屏 |
| 评委链接打不开 | 私有视频/仓库无授权 | 无痕/外部视角核验 |
| 损害原站 | 共用服务目录和部署脚本 | 独立目录、授权改代理、双站回归 |
| 产品假设不足 | 只有漂亮 Demo 无需求证据 | 诚实界定原型价值，补真实访谈 |

### 26.3 发布前一句话验收

**在一台新电脑打开网站，先看懂产品和真实证据；用两个测试钱包走完报价、预订、执行、违约恢复、剩余权益转让和结算；从 OKX AI、X Layer Explorer 和代码仓库三个外部入口核对同一套事实。**

## 27 官方与技术资料索引

以下资料于 2026 年 9 月 17 日读取或核对。链接是实现和复查入口，不代表所有服务当时已在项目中接通。

- [S1 OKX Dev Day Builder Kit](https://www.okx.com/learn/okx-dev-day-builder-kit)：比赛主入口、交付和视频要求。
- [S2 OKX Dev Day T&C](https://www.okx.com/learn/okx-dev-day-terms)：开发期、资格、日期冲突、费用与权利条款。
- [S3 A2MCP Guide](https://web3.okx.com/onchainos/dev-docs/okxai/howtomcp)：免费与收费 endpoint、HTTPS 准备。
- [S4 ASP Registration](https://web3.okx.com/onchainos/dev-docs/okxai/registerasp)：身份注册、服务资料、上架步骤。
- [S5 OKX AI User Guide](https://web3.okx.com/onchainos/dev-docs/okxai/user)：买方身份及用户侧测试入口。
- [S6 X Layer Network Information](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information)：链、RPC、Gas 和浏览器。
- [S7 Deploy a Smart Contract](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/deploy-a-smart-contract/deploying-contract)：部署工具入口。
- [S8 Verify a Smart Contract](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract)：源码验证入口。
- [S9 OKX Payment SDK](https://web3.okx.com/onchainos/dev-docs/payments/service-seller-sdk)：可选 x402 集成、凭据与测试网。
- [S10 X Layer Faucet](https://web3.okx.com/xlayer/faucet/xlayerfaucet)：测试资源申请入口。
- [S11 Agentic Wallet Overview](https://web3.okx.com/onchainos/dev-docs/home/agentic-wallet-overview)：Agent 钱包与支付能力。
- [S12 OpenZeppelin Cryptography](https://docs.openzeppelin.com/contracts/5.x/api/utils/cryptography)：签名和 EIP-712 组件参考。
- [S13 OpenZeppelin ERC20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)：ERC20 安全转账参考。
- [S14 Sign In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)：钱包认证消息和校验规范。
- [S15 Official Submission Form](https://forms.gle/81S2gnFCzqSoeDEA7)：实际字段需登录后核对。

## 28 变更记录与执行前检查

v1.0 将原叙事型初稿转为实施手册，新增容量池互斥、标准资金剧本、检查点和签名冻结边界、整份权益销售、异常退出、逐页 UI、任务依赖、恢复、安全测试、视频分镜和提交授权。

相对早期讨论的主要收缩：不做 child position/部分拆分；不要求 x402；不以 2,400 次伪造调用演示；不把 Oracle 信任和 Provider 独立性说成已解决。合约创建采用原子资金/保证金方案，状态相应简化，不能与旧版 FUNDED/ACCEPTED 状态拼接实现。

执行前勾选：

- [ ] 找到正确仓库并读完 AGENTS.md。
- [ ] 已确认本地开发范围；外部授权另行记录。
- [ ] 已对照本手册列出现有功能和差距。
- [ ] 已复核最新官方要求和实际表单。
- [ ] 已确认测试链、测试资产、Provider 模式。
- [ ] 已将第 7 章资金剧本和第 18 章测试录入任务。
- [ ] 已明确谁负责官方沟通、授权、录制与提交。
- [ ] 不把计划、占位值或预测日期当作完成事实。
