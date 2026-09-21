# Build-period work (2026-09-17 →)

Contest window: 17–25 Sep 2026. This tree is a **new** repo at `commit/`. It does not rewrite `commit-protocol/` or Alpha Coliseum.

## Added this period

- Domain ledger, dual-pool occupancy, Search v1 providers, SIWE, execution router, outbox, list/buy/close.
- Solidity 0.8.24 `MockToken` + `CommitmentRegistry` (OZ 5, viaIR, cancun).
- Local Hardhat 31337 demo (`demo:local`) with T30 = 0.59 tCOM.
- X Layer testnet 1952 deploy of tCOM + registry; Tokyo HTTPS at commit.jibai.site.
- Controlled fault injection (admin-gated).
- ASP **#13781** listed; User-side T31 `qte_4fb626500335b561` → reservation `rsv_f0464418b15a7704`.

## Not claimed as nine-day original

- Next.js / viem / Hardhat / PGlite / OpenZeppelin as dependencies.
- Existing Tokyo Caddy stack for unrelated sites (Commit is an extra server block only).

## Still outside this build

- Public git, video upload, contest form (Batch C)
- Contract source verification on the explorer
- x402, Agentic Wallet auto-sign, mainnet
