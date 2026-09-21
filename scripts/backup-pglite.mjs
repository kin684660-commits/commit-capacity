#!/usr/bin/env node
/**
 * Copy the PGlite data directory. Restore is documented in docs/runbook.md.
 * Does not stop the API — snapshot may be crash-consistent; stop commit-api first for a clean copy.
 */
import fs from "node:fs";
import path from "node:path";

const src = process.env.COMMIT_PGLITE_DIR || path.resolve(".data");
const destRoot = process.env.COMMIT_BACKUP_DIR || path.resolve(".local/backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(destRoot, `pglite-${stamp}`);

if (process.argv[2] === "restore") {
  const from = process.argv[3];
  if (!from || !fs.existsSync(from)) {
    console.error("usage: node scripts/backup-pglite.mjs restore <backup-dir>");
    process.exit(1);
  }
  if (!process.env.COMMIT_ALLOW_RESTORE) {
    console.error("set COMMIT_ALLOW_RESTORE=1 after stopping commit-api");
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(src), { recursive: true });
  fs.rmSync(src, { recursive: true, force: true });
  fs.cpSync(from, src, { recursive: true });
  console.log(`restored ${from} -> ${src}`);
  process.exit(0);
}

if (!fs.existsSync(src)) {
  console.error(`no data dir at ${src}`);
  process.exit(1);
}
fs.mkdirSync(destRoot, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(dest);
