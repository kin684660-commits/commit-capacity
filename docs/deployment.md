# Deployment

## Networks

| Env | Chain | Host |
| --- | --- | --- |
| Local | Hardhat 31337 | `127.0.0.1` |
| Staging / contest | X Layer testnet **1952** | https://commit.jibai.site/ |
| Forbidden | X Layer mainnet 196 | — |

## Staging apply

See `deploy/tokyo/README.md`. Isolation: new Caddy site only, ports 3100/3180/3142/3143, never 3001, never alpha/game roots.

Required env: `COMMIT_CHAIN_ID=1952`, `COMMIT_ALLOW_XLAYER=1`, `COMMIT_BIND=0.0.0.0` (Docker Caddy reaches the host via `172.18.0.1`), `COMMIT_ALLOW_DEV_SESSION=0`, `COMMIT_ALLOW_HARDHAT_KEYS=0`.

Node must be **22** (`/usr/local/bin/node`). `/usr/bin/node` on the host is v20 and rejects `--experimental-strip-types`.

## Contracts

Addresses and deploy txs: `docs/xlayer-1952.md`. Source verification on the explorer is still open (W14 remainder).

## Rollback

1. `systemctl stop commit-web commit-api commit-providers`
2. Remove the `commit.jibai.site` block from `/opt/referralnexus/referralnexus/ops/Caddyfile` and reload that Caddy container only.
3. Do not revert chain. Stop new creates; old entitlements remain claimable on the deployed registry.

Database rollback: restore `COMMIT_PGLITE_DIR` from `docs/runbook.md`. Migrations are forward-only.
