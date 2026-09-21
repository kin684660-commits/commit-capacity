# Contracts

Local Hardhat (31337) plus gated X Layer **testnet 1952** (`COMMIT_ALLOW_XLAYER=1`). Mainnet 196 is disabled.

```bash
cd packages/contracts
./node_modules/.bin/hardhat test --config hardhat.config.cjs
# from repo root, after test OKB:
# corepack pnpm wallets:xlayer
# corepack pnpm deploy:xlayer
```

- `MockToken` — 6-decimal tCOM, mint for tests
- `CommitmentRegistry` — bonds, EIP-712 create, checkpoints, designated-buyer list/buy, close, settle, forceSettle
