#!/usr/bin/env bash
# Tokyo-only: top up bonds if needed, localhost fault inject at T06, full 1952 play.
set -euo pipefail
cd /www/wwwroot/commit
export COMMIT_ALLOW_XLAYER=1

/usr/local/bin/node --input-type=module <<'EOF'
import fs from "fs";
import { privateKeyToAccount } from "./apps/api/node_modules/viem/_esm/accounts/index.js";
import { createPublicClient, createWalletClient, http, parseAbi, getAddress } from "./apps/api/node_modules/viem/_esm/index.js";
import { xLayerTestnet } from "./apps/api/node_modules/viem/_esm/chains/index.js";
const wallets = JSON.parse(fs.readFileSync(".local/xlayer-wallets.json", "utf8"));
const registry = getAddress("0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64");
const rpc = "https://testrpc.xlayer.tech/terigon";
const chain = { ...xLayerTestnet, rpcUrls: { default: { http: [rpc] } } };
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const regAbi = parseAbi([
  "function depositBond(uint256 amount)",
  "function freeBond(address) view returns (uint256)",
]);
for (const role of ["primary", "backup"]) {
  const raw = wallets[role].privateKey.startsWith("0x")
    ? wallets[role].privateKey
    : `0x${wallets[role].privateKey}`;
  const account = privateKeyToAccount(raw);
  const free = await publicClient.readContract({
    address: registry,
    abi: regAbi,
    functionName: "freeBond",
    args: [account.address],
  });
  console.log(role, "free_before", free.toString());
  if (free < 200_000n) {
    const wallet = createWalletClient({ account, chain, transport: http(rpc) });
    const hash = await wallet.writeContract({
      address: registry,
      abi: regAbi,
      functionName: "depositBond",
      args: [500_000n],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.readContract({
      address: registry,
      abi: regAbi,
      functionName: "freeBond",
      args: [account.address],
    });
    console.log(role, "free_after", after.toString(), hash);
  }
}
EOF

python3 <<'PY'
import os, subprocess
vals = {}
env = subprocess.check_output(["systemctl", "show", "commit-api", "-p", "Environment", "--no-pager"], text=True)
for part in env.replace("Environment=", "").split():
    if "=" in part:
        k, v = part.split("=", 1)
        vals[k] = v
path = "/www/wwwroot/commit/.env.staging"
if os.path.isfile(path):
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            vals.setdefault(k.strip(), v.strip().strip('"').strip("'"))
open("/tmp/commit-admin.token", "w").write(vals["COMMIT_PROVIDER_ADMIN_TOKEN"])
print("token_ok", len(vals["COMMIT_PROVIDER_ADMIN_TOKEN"]))
print("dev_session", vals.get("COMMIT_ALLOW_DEV_SESSION", "unset"))
PY

TOKEN=$(cat /tmp/commit-admin.token)
rm -f /tmp/commit-admin.token

echo "=== preflight health ==="
curl -sS http://127.0.0.1:3180/api/health
echo
curl -sS -o /dev/null -w "anon_inject:%{http_code}\n" -X POST http://127.0.0.1:3180/api/admin/demo/fault \
  -H "content-type: application/json" -d '{"delayMs":11000}' || true

echo "=== smoke-final $(date -Is) ==="
export COMMIT_SMOKE_1952=1
export COMMIT_T06_ADMIN="$TOKEN"
export COMMIT_INJECT_URL="http://127.0.0.1:3180/api/admin/demo/fault"
export COMMIT_API_ORIGIN=https://commit.jibai.site
export COMMIT_FINAL_LEAD="${COMMIT_FINAL_LEAD:-900}"
export COMMIT_FINAL_QTY="${COMMIT_FINAL_QTY:-20}"
/usr/local/bin/node scripts/smoke-final-1952.mjs
echo "=== done $(date -Is) ==="
