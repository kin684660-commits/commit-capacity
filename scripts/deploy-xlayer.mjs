#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = path.join(root, "packages/contracts");
const bin = path.join(cwd, "node_modules/.bin/hardhat");
const env = { ...process.env, COMMIT_ALLOW_XLAYER: "1" };
const r = spawnSync(
  bin,
  ["run", "scripts/deploy-xlayer.cjs", "--network", "xlayerTest"],
  { cwd, stdio: "inherit", env },
);
process.exit(r.status ?? 1);
