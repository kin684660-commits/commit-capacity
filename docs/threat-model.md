# Threat model (P0)

Scope: testnet prototype. No mainnet funds.

| Threat | Mitigation | Residual |
| --- | --- | --- |
| Occupancy double-sell | Dual-pool `FOR UPDATE`; T01 | App bug or DB without transactions |
| Quote treated as lock | Separate quote vs reservation APIs | Operator copy error |
| Replay / regressing checkpoint | Contract epoch + sequence; T15 | Verifier can still sign a new (wrong) checkpoint |
| Chain event re-index | `chain_events` PK `(tx, logIndex)`; T28 | Apply callback after insert can fail mid-way |
| Outbox double-send | Claim `pending` → `sending` → `submitted`; T28 | Crash while `sending` needs operator retry |
| Unauthorized fault inject | Admin token; T29 403 | Token in staging env |
| Public host SIWE bypass | `COMMIT_ALLOW_DEV_SESSION` forbidden on `commit.jibai.site` | Mis-set env |
| XSS from search results | Render as text, not HTML | Provider returning huge payloads |
| Verifier malice | Disclosed; bond cap; no mainnet | Full trust in that EOA on testnet |
| Shared provider host | Disclosed; not upstream DR | One VM outage hits both |
| Key leakage | Gitignored wallets mode 600; never Hardhat mnemonic on 1952 | Operator paste / CAM keys |

Do not claim decentralized SLA truth. See handbook §17.
