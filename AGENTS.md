# Commit — execution notes

This directory is the OKX Dev Day 2026 **Commit** live testnet product (HTTPS + X Layer 1952). Not commercial mainnet.

Canonical spec: `docs/HANDBOOK.md` (v1.0). Conflicts: handbook funds rules, state transitions, invariants, and acceptance tests win.

Do not convert `trading-asp`, Alpha Coliseum, or `commit-protocol/` into this product. The older `commit-protocol/` folder is a reference-only overnight MVP (sim chain, native-value escrow, no PostgreSQL ledger).

Authorization: `APPROVALS.md`. A-LOCAL-001 = local files/tests. **A-BATCH-B** = X Layer **testnet 1952** + Tokyo HTTPS on **commit.jibai.site** without touching `alpha.jibai.site` / `game.jibai.site` / port 3001. No mainnet 196. Public git: https://github.com/kin684660-commits/commit-capacity. Demo video and contest form still owner-side.

#13781 is listed; T31 User-side is done (`evidence/t31-user-side.md`). Blocked on the owner: #4244 deactivate (else #13781 stream drops), Tokyo SIWE deploy, CAM key rotate, Singapore vs Remote, Batch C. Keep Mac comms up for #13781 official messages; do not dual-run trading ASP #10496 here.
