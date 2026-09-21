# Tokyo staging pack (draft — do not apply blindly)

A-BATCH-B allows HTTPS staging **without** touching existing sites.

## Hard isolation

Do **not**:

- Change `alpha.jibai.site` or `game.jibai.site` nginx/vhosts
- Use or steal port `3001`
- Write into `/www/wwwroot/alpha-coliseum-game`
- Call `/usr/local/sbin/deploy-alpha-coliseum-game`
- Enable mainnet 196
- Set `COMMIT_ALLOW_HARDHAT_KEYS=1` on the public host
- Enable `COMMIT_ALLOW_DEV_SESSION=1` on the public host

## Suggested new ports (check they are free first)

| Process | Bind | Port |
| --- | --- | --- |
| commit-web (Next) | 127.0.0.1 | 3100 |
| commit-api | 127.0.0.1 | 3180 |
| SearchNode + Nova (`commit-providers`) | 127.0.0.1 | 3142 / 3143 |

Public HTTPS terminates at Caddy (docker) and proxies `/api/*` to `172.18.0.1:3180` and the rest to `172.18.0.1:3100`. API must listen with `COMMIT_BIND=0.0.0.0`. Providers stay off the public internet except through the API.

## Hostname

Do not reuse `alpha.jibai.site` / `game.jibai.site`. Public host is **commit.jibai.site**. HTTPS is a **new** Caddy site in `/opt/referralnexus/referralnexus/ops/Caddyfile` (docker `referralnexus-caddy-1` owns 80/443). Proxy to `172.18.0.1:3180` (`/api/*`) and `172.18.0.1:3100` (web). Do not edit the alpha/game/pearl blocks.

Public SSH from the Mac is closed by the daemon after TCP (do not retry). Use Baota terminal, OrcaTerm, or Tencent TAT.

## Apply order (when hostname + ports are confirmed)

1. On the Mac: `corepack pnpm pack:staging` → upload `.local/commit-staging.tar.gz` via Baota (not into `alpha-coliseum-game`).
2. On the host: unpack to `/www/wwwroot/commit`. Copy gitignored wallets to `/www/wwwroot/commit/.local/xlayer-wallets.json` mode 600.
3. `COMMIT_PUBLIC_HOST=your.host bash deploy/tokyo/install-on-host.sh`
4. Install Node 22 + pnpm 9.15.9; `pnpm install --frozen-lockfile` and build the web app.
5. `systemctl enable --now commit-providers commit-api commit-web`
6. Health: `https://<host>/api/health` plus both original sites still 200.
7. Only then list ASP at `https://<host>/api/capacity/quote`.

Rollback: disable the three Commit units and remove the new server block. Original sites stay untouched.
