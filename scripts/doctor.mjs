#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let ok = true;
function check(name, pass, extra = "") {
  const mark = pass ? "ok" : "FAIL";
  if (!pass) ok = false;
  console.log(`${mark}  ${name}${extra ? " — " + extra : ""}`);
}

check("node >= 22", Number(process.versions.node.split(".")[0]) >= 22, process.versions.node);
check("handbook present", fs.existsSync(path.join(root, "docs/HANDBOOK.md")));
check("no .env committed", !fs.existsSync(path.join(root, ".env")));
try {
  require.resolve("viem/package.json", { paths: [path.join(root, "packages/domain")] });
  check("domain installed", true);
} catch {
  check("domain installed", false, "run pnpm install");
}

const chain = process.env.COMMIT_CHAIN_ID || "1952";
check("default chainId is testnet 1952", chain === "1952");
check("mainnet 196 not default", chain !== "196");

if (process.env.DATABASE_URL) check("DATABASE_URL set", true);
else check("PGlite local occupancy", true, "DATABASE_URL unset");
try {
  require.resolve("@electric-sql/pglite", { paths: [path.join(root, "apps/api")] });
  check("pglite installed", true);
} catch {
  const dir = path.join(root, "apps/api/node_modules/@electric-sql/pglite");
  check("pglite installed", fs.existsSync(dir), dir);
}

try {
  require.resolve("next/package.json", { paths: [path.join(root, "apps/web")] });
  check("web next installed", true);
} catch {
  check("web next installed", false, "run pnpm install");
}

process.exit(ok ? 0 : 1);
