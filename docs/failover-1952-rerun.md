# Re-run 1952 failover evidence (owner action)

Public homepage LIVE_RUN is `run_12d6a5727869` (`rsv_729440135857d4cc`, commitment **4**): Tokyo localhost inject delay → **breachPrimary=1 / successBackup=1 / route=BACKUP**. Short T06 only (escrow still held). Prior settled-no-failover snapshot remains `run_04fc72cfb8a2`.

Judges need one HTTPS run where:

1. Admin inject succeeds (`pendingDelayMs: 11000`)
2. Execute shows primary `TIMEOUT` then Nova `OK`
3. On-chain `breachPrimary ≥ 1` after checkpoint
4. Evidence `termsVerification.match === true` (after API upgrade)
5. Prefer a closed play where T30 economics are consistent with the registry state (do not leave `ok:false` unexplained)

## Why Mac inject failed

`POST /api/admin/demo/fault` requires the **host** admin token (`x-commit-admin`). Default `change-me-local-only` is rejected on Tokyo (403). Token lives only on the server env / systemd unit — not in the public repo.

## Preferred path (on Tokyo)

```bash
# SSH or TAT into the host as root
cd /www/wwwroot/commit
# Read admin token from the running unit (do not paste into chat logs)
systemctl show commit-api -p Environment | tr ' ' '\n' | grep COMMIT

# Inject on localhost (avoids public 403 from wrong token)
curl -sS -X POST http://127.0.0.1:3180/api/admin/demo/fault \
  -H 'content-type: application/json' \
  -H "x-commit-admin: $COMMIT_PROVIDER_ADMIN_TOKEN" \
  -d '{"delayMs":11000}'

# Then run the short T06 smoke against HTTPS with wallets from .local/
COMMIT_SMOKE_1952=1 COMMIT_T06_ADMIN="$COMMIT_PROVIDER_ADMIN_TOKEN" \
  node scripts/smoke-t06.mjs
```

Or full play: follow `docs/SMOKE-1952.md` with inject **on-host** before the T06 execute.

## After success

1. Record `runId`, reservation, create/close/settle txs in `evidence/`
2. Update homepage `LIVE_RUN` / `last settled` pointers (UI change — only when owner asks)
3. Update `docs/QA_REPORT.md` and `submission/RELEASE_MANIFEST.json`
4. Confirm `GET /api/evidence/<runId>` includes `termsVerification.match: true`

## Do not

- Enable `COMMIT_ALLOW_DEV_SESSION` on the public host
- Paste admin tokens into git, chat, or screenshots
- Redeploy contracts to “fix” evidence
