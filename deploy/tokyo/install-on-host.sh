#!/usr/bin/env bash
# Run ON the Tokyo host (Baota terminal / TAT / OrcaTerm). Never from Mac public SSH.
# Does not touch alpha.jibai.site, game.jibai.site, port 3001, or /www/wwwroot/alpha-coliseum-game.
set -euo pipefail

ROOT="${COMMIT_ROOT:-/www/wwwroot/commit}"
HOST="${COMMIT_PUBLIC_HOST:-}"
FORBIDDEN_ROOT="/www/wwwroot/alpha-coliseum-game"

if [[ -z "$HOST" ]]; then
  echo "Set COMMIT_PUBLIC_HOST (example: commit.jibai.site). Refusing to guess." >&2
  exit 1
fi
if [[ "$HOST" == "alpha.jibai.site" || "$HOST" == "game.jibai.site" ]]; then
  echo "refusing to bind Commit onto an existing site host" >&2
  exit 1
fi
if [[ "$ROOT" == "$FORBIDDEN_ROOT" || "$ROOT" == "$FORBIDDEN_ROOT"* ]]; then
  echo "refusing to install into the Alpha Coliseum tree" >&2
  exit 1
fi

ss -lnt 2>/dev/null | grep -q ':3001 ' && echo "note: port 3001 in use (leave it alone)"
for p in 3100 3180 3142 3143; do
  if ss -lnt 2>/dev/null | grep -q ":$p "; then
    echo "port $p already listening — pick another or stop the extra Commit process" >&2
    exit 1
  fi
done

mkdir -p "$ROOT" /etc/systemd/system
if [[ ! -f "$ROOT/package.json" ]]; then
  echo "unpack the staging tarball into $ROOT first" >&2
  exit 1
fi

if [[ ! -f "$ROOT/.local/xlayer-wallets.json" ]]; then
  echo "missing $ROOT/.local/xlayer-wallets.json (copy wallets with mode 600)" >&2
  exit 1
fi
chmod 600 "$ROOT/.local/xlayer-wallets.json"

if [[ ! -f "$ROOT/.env.staging" ]]; then
  cp "$ROOT/deploy/tokyo/env.staging.example" "$ROOT/.env.staging"
fi
umask 077
python3 - <<PY
from pathlib import Path
p = Path("$ROOT/.env.staging")
text = p.read_text()
text = text.replace("COMMIT_PUBLIC_HOST", "$HOST")
text = text.replace("https://COMMIT_PUBLIC_HOST", "https://$HOST")
p.write_text(text)
print("wrote", p)
PY
chmod 600 "$ROOT/.env.staging"

install -m 644 "$ROOT/deploy/tokyo/commit-api.service" /etc/systemd/system/commit-api.service
install -m 644 "$ROOT/deploy/tokyo/commit-web.service" /etc/systemd/system/commit-web.service
install -m 644 "$ROOT/deploy/tokyo/commit-providers.service" /etc/systemd/system/commit-providers.service

if command -v caddy >/dev/null 2>&1 || [[ -d /etc/caddy ]]; then
  SITE="/etc/caddy/commit.caddy"
  cat > "$SITE" <<CADDY
# NEW site only. Do not merge into alpha/game vhosts.
$HOST {
  encode gzip
  reverse_proxy /api/* 127.0.0.1:3180
  reverse_proxy 127.0.0.1:3100
}
CADDY
  echo "wrote $SITE — reload Caddy after validating (do not edit alpha/game files)"
elif [[ -d /www/server/panel/vhost/nginx ]]; then
  SITE="/www/server/panel/vhost/nginx/commit.conf"
  if [[ -e /www/server/panel/vhost/nginx/alpha.jibai.site.conf ]]; then
    echo "leaving existing alpha nginx vhost untouched"
  fi
  sed "s/COMMIT_PUBLIC_HOST/$HOST/g" "$ROOT/deploy/tokyo/nginx-commit.conf.example" | sed 's/^# //' > "$SITE"
  echo "wrote $SITE — use Baota to issue the cert, do not edit alpha/game vhosts"
else
  echo "no Caddy or Baota nginx vhost dir found; install proxy yourself from deploy/tokyo/" >&2
fi

echo "next: cd $ROOT && corepack enable && corepack pnpm install --frozen-lockfile"
echo "then: pnpm --filter @commit/web build   (or apps/web next build)"
echo "then: systemctl daemon-reload && systemctl enable --now commit-providers commit-api commit-web"
echo "then verify https://$HOST/api/health and that https://alpha.jibai.site still 200"
