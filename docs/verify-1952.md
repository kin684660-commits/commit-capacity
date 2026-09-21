# Verify contracts on X Layer testnet explorer

Do this in the browser (needs the connected deployer / a verify UI). Do not use mainnet 196.

Explorer: https://www.okx.com/web3/explorer/xlayer-test

Official verify entry: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract

## Compiler (both contracts)

| Setting | Value |
| --- | --- |
| Compiler | `0.8.24` |
| Optimizer | yes, runs `200` |
| EVM | `cancun` |
| viaIR | **true** (required — stack-too-deep otherwise) |
| License | MIT |

Sources: `packages/contracts/contracts/MockToken.sol`, `CommitmentRegistry.sol`. OpenZeppelin 5 via `node_modules`.

## MockToken `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`

- Constructor args: **none**
- Deploy tx: `0x4737960800eb5e1d79e315150fdd09b1499675c7661305cfed2677b7cd48a06f`

## CommitmentRegistry `0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`

Constructor `(address token_, address verifier_, address owner_, uint64 graceSeconds_)`:

| Arg | Value |
| --- | --- |
| token_ | `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E` |
| verifier_ | `0xD542aB96d0e110a9FD89D2970Ef659649d84f704` |
| owner_ | `0x2E386a0E396C21aBb7F11b1Eb447441008DE8d25` |
| graceSeconds_ | `600` |

ABI-encoded constructor (no `0x` function selector):

```
0x00000000000000000000000001f0171f1d2cb9e2ec133538f155be79dda81d5e000000000000000000000000d542ab96d0e110a9fd89d2970ef659649d84f7040000000000000000000000002e386a0e396c21abb7f11b1eb447441008de8d250000000000000000000000000000000000000000000000000000000000000258
```

If viaIR makes the OKX explorer standard-json verify fail, keep this file as the compiler record and say so in known-limitations. Do not redeploy just to get a green check.

## Sourcify (operated 2026-09-18) — both exact_match

OKX web explorer (`okx.com/web3/explorer/...`) redirected to login. Used Sourcify, which lists X Layer Testnet chainId **1952**. Compiler input from Hardhat `artifacts/build-info`.

| Contract | Address | Result | Repo |
| --- | --- | --- | --- |
| MockToken / tCOM | `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E` | exact_match (creation + runtime), job `72f6db7e-8f24-4f5c-82ff-183224c309e2`, matchId `51262923` | https://repo.sourcify.dev/contracts/full_match/1952/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E/ |
| CommitmentRegistry | `0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64` | exact_match via build-info `ee24bdf30f10f0298100c9da517b166d` (later `ff9947…` length-mismatched; do not use that one) | https://repo.sourcify.dev/contracts/full_match/1952/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64/ |

Do not redeploy. Flattened sources also live in `docs/verify-artifacts/`.

## 中文：你在浏览器里怎么点（不要用主网 196）

你只需要钱包能打开测试网浏览器。部署钱包是 `0x2E386a0E396C21aBb7F11b1Eb447441008DE8d25`。不要重新部署合约，只做「开源验证」。

1. 打开 [X Layer 测试网浏览器](https://www.okx.com/web3/explorer/xlayer-test)。确认左上角/网络是 **X Layer Testnet**，不是主网。
2. 官方说明（英文页，可选对照）：[Verify a smart contract](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract)
3. **先验证 tCOM（没有构造参数）**
   - 打开 [MockToken / tCOM](https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E)
   - 找 **Contract → Verify / 验证合约**（有的界面叫 Verify and Publish）
   - 填：编译器 `0.8.24`，Optimizer **开**、runs `200`，EVM **cancun**，**viaIR = true**（必开，否则会 stack too deep），许可证 MIT
   - 源码：仓库里 `packages/contracts/contracts/MockToken.sol`，OpenZeppelin 5 从 `node_modules` 一起带上（标准 JSON 输入最稳）
   - 构造参数：**空**
   - 部署交易可对照：`0x4737960800eb5e1d79e315150fdd09b1499675c7661305cfed2677b7cd48a06f`
4. **再验证登记合约（有构造参数）**
   - 打开 [CommitmentRegistry](https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64)
   - 编译器选项与上面完全相同
   - 源码：`packages/contracts/contracts/CommitmentRegistry.sol` + OZ 5
   - 构造参数按顺序：
     | 参数 | 值 |
     | --- | --- |
     | token_ | `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E` |
     | verifier_ | `0xD542aB96d0e110a9FD89D2970Ef659649d84f704` |
     | owner_ | `0x2E386a0E396C21aBb7F11b1Eb447441008DE8d25` |
     | graceSeconds_ | `600` |
   - 若表单要 ABI 编码（不要带函数选择器 `0x` 那种 4 字节）：

     ```
     0x00000000000000000000000001f0171f1d2cb9e2ec133538f155be79dda81d5e000000000000000000000000d542ab96d0e110a9fd89d2970ef659649d84f7040000000000000000000000002e386a0e396c21abb7f11b1eb447441008de8d250000000000000000000000000000000000000000000000000000000000000258
     ```
5. 点提交。成功后合约页会出现源码，不再是灰色 Bytecode。
6. **viaIR 若被浏览器拒了**：不要为了绿勾重新部署。把失败截图留下，我们在 `docs/known-limitations.md` 写明「编译记录在本文件，浏览器标准 JSON 不接受 viaIR」。

本机若要生成 standard-JSON（可选，方便你上传）：

```bash
cd commit/packages/contracts
corepack pnpm exec hardhat flatten contracts/MockToken.sol
```

扁平化有时比 standard-JSON 更易贴。Registry 依赖较多，优先用 Hardhat 的 `artifacts/build-info/*.json` 里的 `input` 整份上传。
