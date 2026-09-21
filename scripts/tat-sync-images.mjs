#!/usr/bin/env node
/**
 * Push homepage JPEGs only (no Next rebuild). Keep them out of tat-sync-web.mjs
 * so source deploys stay under the TAT round-trip budget.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, ".local/run-tat.mjs");
const CHUNK = 20000;

const files = [
  "apps/web/public/images/commit/04-step-reserve.jpg",
  "apps/web/public/images/commit/05-step-execute.jpg",
  "apps/web/public/images/commit/06-step-review.jpg",
  "apps/web/public/images/commit/07-hero-archive-box.jpg",
];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function tat(cmd, tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const r = spawnSync(process.execPath, [runner, cmd], { stdio: "inherit", env: process.env });
    if ((r.status ?? 1) === 0) return;
    if (n === tries) process.exit(r.status ?? 1);
    console.error(`tat retry ${n} after ${r.status}`);
    sleep(4000 * n);
  }
}

function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

const tarPath = path.join(os.tmpdir(), `commit-web-images-${Date.now()}.tgz`);
const tar = spawnSync("tar", ["-czf", tarPath, "-C", root, ...files], {
  stdio: "inherit",
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});
if (tar.status) process.exit(tar.status ?? 1);
const b64 = fs.readFileSync(tarPath).toString("base64");
fs.unlinkSync(tarPath);
console.error("image tarball b64 chars", b64.length, "chunks", Math.ceil(b64.length / CHUNK));

const remoteB64 = "/tmp/commit-web-images.tgz.b64";
const remoteTgz = "/tmp/commit-web-images.tgz";
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
mkdir -p /www/wwwroot/commit/apps/web/public/images/commit
cd /www/wwwroot/commit
tar -xzf ${remoteTgz}
ls -l apps/web/public/images/commit
systemctl restart commit-web
sleep 2
curl -sS -o /dev/null -w "local04:%{http_code}\\n" http://127.0.0.1:3100/images/commit/04-step-reserve.jpg
curl -sS -o /dev/null -w "local05:%{http_code}\\n" http://127.0.0.1:3100/images/commit/05-step-execute.jpg
curl -sS -o /dev/null -w "local06:%{http_code}\\n" http://127.0.0.1:3100/images/commit/06-step-review.jpg
`);
