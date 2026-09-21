#!/usr/bin/env node
/**
 * Build a gitignored staging tarball for Baota upload. Excludes node_modules and secrets.
 * Copy .local/xlayer-wallets.json to the host separately (mode 600).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destDir = path.join(root, ".local");
const dest = path.join(destDir, "commit-staging.tar.gz");
fs.mkdirSync(destDir, { recursive: true });

const r = spawnSync(
  "tar",
  [
    "-czf",
    dest,
    "--exclude",
    "node_modules",
    "--exclude",
    ".local",
    "--exclude",
    ".git",
    "--exclude",
    ".next",
    "--exclude",
    "packages/contracts/cache",
    "--exclude",
    "packages/contracts/artifacts",
    "-C",
    path.dirname(root),
    path.basename(root),
  ],
  { stdio: "inherit" },
);
if (r.status) process.exit(r.status);
const st = fs.statSync(dest);
console.log(JSON.stringify({ file: dest, bytes: st.size, note: "Upload to /www/wwwroot then tar -xzf. Copy wallets separately." }, null, 2));
