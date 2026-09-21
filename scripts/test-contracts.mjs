#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packages/contracts");
const bin = path.join(cwd, "node_modules/.bin/hardhat");
const r = spawnSync(bin, ["test", "--config", "hardhat.config.cjs"], { cwd, stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
