#!/usr/bin/env bash
# Tokyo-only: settle the in-flight same-runId final play. No new reservation.
set -euo pipefail
cd /www/wwwroot/commit
set -a
# shellcheck disable=SC1091
[ -f .env.staging ] && . ./.env.staging
set +a
export COMMIT_ALLOW_XLAYER=1
export COMMIT_SMOKE_1952=1
export COMMIT_API_ORIGIN="${COMMIT_API_ORIGIN:-https://commit.jibai.site}"
export COMMIT_FINAL_RSV="${COMMIT_FINAL_RSV:-rsv_48df15207e9ca9d5}"
export COMMIT_FINAL_ID="${COMMIT_FINAL_ID:-5}"
echo "=== finish $(date -Is) ==="
/usr/local/bin/node scripts/smoke-final-finish.mjs
echo "=== done $(date -Is) ==="
