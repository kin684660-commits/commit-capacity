#!/usr/bin/env node
/**
 * Push listed web files to Tokyo via TAT as a gzip tarball (chunked for the
 * TAT command-size cap), then rebuild commit-web.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, ".local/run-tat.mjs");
const CHUNK = 8000;

const files = [
  "apps/web/app/page.tsx",
  "apps/web/app/layout.tsx",
  "apps/web/app/LatestDemo.tsx",
  "apps/web/app/evidence/[runId]/page.tsx",
  "apps/web/app/docs/page.tsx",
  "apps/web/app/adapter/page.tsx",
  "apps/web/app/globals.css",
  "apps/web/app/reserve/page.tsx",
  "apps/web/app/lab/page.tsx",
  "apps/web/app/agent/page.tsx",
  "apps/web/app/commitments/[id]/page.tsx",
  "apps/web/app/transfers/[id]/page.tsx",
  "apps/web/lib/copy.ts",
  "apps/web/lib/i18n.tsx",
  "apps/web/lib/links.ts",
  "apps/web/components/Chrome.tsx",
  "apps/web/components/ListedPing.tsx",
  "apps/web/components/StatusChip.tsx",
  "apps/web/components/Footer.tsx",
  "apps/web/components/Ticket.tsx",
  "apps/web/components/TrustStrip.tsx",
  "apps/web/components/Compare.tsx",
  "apps/web/components/Providers.tsx",
  "apps/web/components/Address.tsx",
  "apps/web/components/Sandbox.tsx",
  "apps/web/components/HomeRecord.tsx",
  "apps/web/components/ProviderReport.tsx",
  "apps/web/components/ConflictDemo.tsx",
  "apps/web/lib/evidenceSteps.ts",
];

function tat(cmd) {
  const r = spawnSync(process.execPath, [runner, cmd], { stdio: "inherit", env: process.env });
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
}

function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

const tarPath = path.join(os.tmpdir(), `commit-web-${Date.now()}.tgz`);
const tar = spawnSync("tar", ["-czf", tarPath, "-C", root, ...files], {
  stdio: "inherit",
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});
if (tar.status) process.exit(tar.status ?? 1);
const b64 = fs.readFileSync(tarPath).toString("base64");
fs.unlinkSync(tarPath);
console.error("tarball b64 chars", b64.length, "chunks", Math.ceil(b64.length / CHUNK));

const remoteB64 = "/tmp/commit-web.tgz.b64";
const remoteTgz = "/tmp/commit-web.tgz";
tat(`set -euo pipefail; : > ${remoteB64}`);
for (let i = 0; i < b64.length; i += CHUNK) {
  const piece = b64.slice(i, i + CHUNK);
  tat(`set -euo pipefail; printf '%s' ${shellQuote(piece)} >> ${remoteB64}`);
}

tat(`set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import base64
Path("${remoteTgz}").write_bytes(base64.b64decode(Path("${remoteB64}").read_text()))
print("tgz bytes", Path("${remoteTgz}").stat().st_size)
PY
cd /www/wwwroot/commit
tar -xzf ${remoteTgz}
systemctl stop commit-web
export PATH="/usr/local/bin:$PATH"
export NODE_OPTIONS="--max-old-space-size=512"
if command -v corepack >/dev/null; then
  corepack pnpm --filter @commit/web build
else
  cd apps/web
  /usr/local/bin/node ../../node_modules/next/dist/bin/next build
fi
systemctl start commit-web
systemctl is-active commit-web
curl -sS -o /dev/null -w "home:%{http_code}\\n" https://commit.jibai.site/
curl -sS -o /dev/null -w "alpha:%{http_code}\\n" https://alpha.jibai.site/
curl -sS -o /dev/null -w "game:%{http_code}\\n" https://game.jibai.site/
`);
