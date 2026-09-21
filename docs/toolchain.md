# Toolchain

Pinned at W02 start (2026-09-17). Do not chase majors during the 9-day window.

| Tool | Version / note |
| --- | --- |
| Node | 22.17.1 (engines >=22) |
| pnpm | 9.15.9 via corepack |
| TypeScript | 5.9.x |
| vitest | 2.x |
| viem | 2.x |
| Solidity | 0.8.24, evm cancun, viaIR |
| OpenZeppelin | 5.x |
| Hardhat | 2.22+ local chainId 31337; xlayerTest only if `COMMIT_ALLOW_XLAYER=1` |
| Next.js | 15.5 (apps/web) |
| PostgreSQL | PGlite locally (D008); real Postgres later |

Commands that must eventually match README (only publish after they pass):

```
pnpm install --frozen-lockfile
pnpm doctor
pnpm test:unit
```
