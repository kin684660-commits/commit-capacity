# Runbook

Public host: https://commit.jibai.site/  
Units: `commit-web`, `commit-api`, `commit-providers`  
Caddy extra site only. Do not edit alpha/game/pearl blocks. Do not use port 3001.

## Start / stop

```bash
systemctl status commit-web commit-api commit-providers
systemctl restart commit-api
systemctl stop commit-web commit-api commit-providers
systemctl start commit-providers commit-api commit-web
```

Health:

- `https://commit.jibai.site/api/health` → `chainId` 1952
- `https://commit.jibai.site/api/config` → `localHardhat: false`, token + registry set
- Isolation: `alpha.jibai.site` and `game.jibai.site` still 200

Remote control from this Mac is Tencent TAT (international host `tat.intl.tencentcloudapi.com`, API version `2020-10-28`), not SSH.

## Logs

```bash
journalctl -u commit-api -n 100 --no-pager
journalctl -u commit-web -n 80 --no-pager
```

Do not print wallets, cookies, or SIWE signatures.

## Backup (T34)

Data dir: `COMMIT_PGLITE_DIR=/www/wwwroot/commit/.local/staging-pglite`

Clean snapshot:

```bash
systemctl stop commit-api
COMMIT_PGLITE_DIR=/www/wwwroot/commit/.local/staging-pglite \
  COMMIT_BACKUP_DIR=/www/wwwroot/commit/.local/backups \
  /usr/local/bin/node /www/wwwroot/commit/scripts/backup-pglite.mjs
systemctl start commit-api
```

Local unit test copies a PGlite directory and reopens it (`apps/api/tests/restore.test.ts`). Staging restore has **not** been executed against the live host (would stop the API).

## Restore

```bash
systemctl stop commit-api
COMMIT_ALLOW_RESTORE=1 \
  COMMIT_PGLITE_DIR=/www/wwwroot/commit/.local/staging-pglite \
  /usr/local/bin/node /www/wwwroot/commit/scripts/backup-pglite.mjs restore /www/wwwroot/commit/.local/backups/<stamp>
systemctl start commit-api
curl -sS https://commit.jibai.site/api/health
```

## Alerts (manual)

2 GB RAM. Do not `next build` while API + other stacks peak. If OOM: reboot the instance, wait for TAT agent, then start the three units. Watch disk: PGlite + Next `.next` + journals.

## Permissions

- Public: quote, health, config, evidence, docs, reserve UI
- SIWE session: execute / list / buy
- Fault inject: admin token only
- Wallets: `/www/wwwroot/commit/.local/xlayer-wallets.json` mode 600
