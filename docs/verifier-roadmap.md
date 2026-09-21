# Verifier decentralisation roadmap

Commit today uses a **disclosed, Commit-operated** checkpoint signer. Bonds cap cash damage; they do not create unfailing service. This file is the honest migration path — not a claim that verification is decentralized today.

## Phase 1 — now (shipped)

- One EIP-712 / typed checkpoint path into `CommitmentRegistry`
- Evidence runs store quote + execution + chain fields for offline audit
- `/api/evidence/:runId` returns `termsVerification` when both ledger `terms_hash` and on-chain `termsHash` are available (`match: true|false`)
- `/api/config.verifier` names the operator and points here

## Phase 2 — multi-attester

- Independent 2-of-3 attesters with published keys and rotation
- Public liveness metrics (attester uptime, lag to chain head)
- Contract-side allowlist or registry of attester pubkeys (owner-set today → governance later)

## Phase 3 — permissionless verifier stake

- Stake + challenge window for conflicting checkpoints
- Slashing on proven conflict
- Settlement continues to use the last confirmed checkpoint under `forceSettle` rules (see `known-limitations.md`)

## Non-goals this contest

- Claiming “trustless” verification while a single operator signs
- Redeploying the 1952 registry solely for Phase 2 hooks
