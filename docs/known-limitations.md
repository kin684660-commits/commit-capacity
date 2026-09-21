# Known limitations

- Commit-operated verifier can mis-report events. Bonds cap damage; they do not make service unfailing.
- SearchNode and Nova are controlled demo providers over a fixed public corpus. They may share a host. This is not independent upstream disaster recovery.
- tCOM is a valueless test token. Amounts are not a commercial quote.
- forceSettle after `end + grace` uses the last confirmed checkpoint. Uncheckpointed work may lose provider income or buyer compensation.
- No mainnet funds. No decentralized arbitration.
- Local occupancy uses PGlite (Postgres SQL). Production/staging should use PostgreSQL when available.
- Outbox checkpoints stay pending unless `COMMIT_RPC_URL` + registry + token are set. Local Hardhat sender is gated by `COMMIT_ALLOW_HARDHAT_KEYS=1` (mnemonic accounts only). Testnet sender is gated by `COMMIT_ALLOW_XLAYER=1` and gitignored 1952 wallets — never the Hardhat mnemonic.
- Homepage LIVE_RUN is `run_510deba24b1d` (same-runId 1952 play: T05 + Nova failover + list/buy + T21 + settle; remaining 17 / used 3 / settled). Prior held-failover `run_12d6a5727869` and settle-without-failover `run_04fc72cfb8a2` remain in the evidence index and are **not** spliced. Wallet-level `claimable` is cumulative across commitments; local T30 conserved 0.59 is a separate isolated check. #13781 listed; T31 in `evidence/t31-user-side.md`.
- **PenaltyAccrued.id is always 0** on the deployed 1952 registry (`_penalize` emits `PenaltyAccrued(0, …)`). Do not use that event alone to attribute a penalty to a commitment. Use CheckpointApplied + breach counters + bond/claimable deltas. v0.2 will pass `commitmentId`. This contest does not redeploy the registry.
- Verifier is Commit-operated (disclosed). Roadmap: `docs/verifier-roadmap.md`. Evidence API may return `termsVerification` comparing ledger vs on-chain `termsHash`.
- Staging fault-inject admin token is host-only. Unauthenticated inject is 403 (T29). T06 failover on 1952 is recorded in `evidence/t06-staging.md`.
- Tokyo 2 GB RAM is tight (API ~350 MB). Do not enable `COMMIT_ALLOW_DEV_SESSION` or Hardhat keys on the public host. API must bind `COMMIT_BIND=0.0.0.0` so Docker Caddy can reach it.
- `COMMIT_ALLOW_DEV_SESSION=1` is a local bypass of SIWE. Never enable on a public host.
