# Architecture

Commit reserves future agent-service capacity (window, quantity, SLA) with bonded backup. Not an agent storefront. A quote is not a reservation.

OKX AI supports discovery and the listed quote. Commit coordinates reservation and execution. X Layer records the on-chain terms and settlement trail.

## Layers

1. **Spot discovery** — OKX AI / A2MCP free quote (`POST /api/capacity/quote`). A quote is not a reservation.
2. **Occupancy** — PGlite SQL with `FOR UPDATE` on two provider pools. Dual-pool: both lock the same window or neither does.
3. **Execution** — SearchNode (primary) then Nova (backup). 8s SLA. One logical unit even after failover.
4. **Chain** — `MockToken` (tCOM, 6 decimals) + `CommitmentRegistry` on X Layer testnet **1952**. Escrow, bonds, checkpoints, list/buy, close/settle.
5. **Verifier** — Commit-operated EOA. Disclosed. Not decentralized arbitration.

## Processes (staging)

| Unit | Bind | Role |
| --- | --- | --- |
| `commit-providers` | `:3142` / `:3143` | SearchNode + Nova |
| `commit-api` | `:3180` | Occupancy, router, outbox, SIWE |
| `commit-web` | `:3100` | Next.js workbench |
| Caddy extra site `commit.jibai.site` | `:443` | `/api/*` → API, rest → web |

Do not share ports or vhosts with Alpha Coliseum (`alpha.jibai.site`, `game.jibai.site`, `:3001`).

## Data

- Occupancy and attempts: PGlite (`COMMIT_PGLITE_DIR`).
- Chain truth: registry events on 1952. Outbox checkpoints are pending until a sender submits them.
- Chain log replay: `chain_events` unique `(tx_hash, log_index)` so re-index does not double-apply.

## Trust

Bonds cap economic damage. They do not make the network or verifier honest. See `docs/known-limitations.md` and `docs/threat-model.md`.
