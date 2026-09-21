#!/usr/bin/env node
/**
 * Push API source files to Tokyo via TAT (chunked tarball), restart commit-api.
 * Does not rebuild or restart commit-web (UI stays as currently live).
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
  "apps/api/src/http.ts",
  "apps/api/src/router.ts",
  "apps/api/src/occupancy.ts",
  "apps/api/src/chain.ts",
  "apps/api/src/indexer.ts",
  "apps/api/src/db.ts",
  "db/migrations/005_response_body.sql",
  "docs/verifier-roadmap.md",
  "docs/failover-1952-rerun.md",
];

function tat(cmd) {
  const r = spawnSync(process.execPath, [runner, cmd], { stdio: "inherit", env: process.env });
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
}

function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

const tarPath = path.join(os.tmpdir(), `commit-api-${Date.now()}.tgz`);
const tar = spawnSync("tar", ["-czf", tarPath, "-C", root, ...files], {
  stdio: "inherit",
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});
if (tar.status) process.exit(tar.status ?? 1);
const b64 = fs.readFileSync(tarPath).toString("base64");
fs.unlinkSync(tarPath);
console.error("tarball b64 chars", b64.length, "chunks", Math.ceil(b64.length / CHUNK));

const remoteB64 = "/tmp/commit-api.tgz.b64";
const remoteTgz = "/tmp/commit-api.tgz";
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
systemctl restart commit-api
sleep 2
systemctl is-active commit-api
curl -sS https://commit.jibai.site/api/health
echo
curl -sS -o /dev/null -w "home:%{http_code}\\n" https://commit.jibai.site/
curl -sS -o /dev/null -w "evidence:%{http_code}\\n" https://commit.jibai.site/api/evidence/run_04fc72cfb8a2
`);
