# QA_REPORT (2026-09-19)

Recorded through T31 / T34. T32 (physical phone) is the remaining look.

- Env: local Mac, Node 22.17.1, PGlite, Hardhat 31337
- Commands: `corepack pnpm test:unit`, `test:integration`, `test:contracts`

| ID | Result |
| --- | --- |
| T01/T02 | PASS occupancy |
| T03 | PASS Hardhat create rollback |
| T04 | PASS execute before window |
| T05 | PASS success burns 1 |
| T06 | PASS primary timeout, backup success, still 1 unit |
| T06-1952 | PASS host inject 200 + execute `rsv_eb1b4e3960bbc298` remaining 2 / used 1; create tx `0x814d37b1…ced2` (`evidence/t06-staging.md`) |
| T07 | PASS late primary does not add usage |
| T08 | PASS both fail, remaining restored |
| T09 | PASS idempotent clientRequestId |
| T10 | PASS same key different payload 409 |
| T11 | PASS 1s rate limit |
| T12 | PASS invalid schema failover |
| T13 | PASS re-read request |
| T14 | PASS recover inflight → UNCERTAIN, no extra usage |
| T15 | PASS replay / regressing checkpoint rejected |
| T16 | PASS wrong domain signatures |
| T17 | PASS list refused while in-flight |
| T18 | PASS listed freeze remains after prepare-list |
| T19 | PASS execute refused while listed |
| T20 | PASS wrong buyer and expired listing refused |
| T21 | PASS old owner refused after buy; new owner succeeds |
| T22 | PASS demo: remaining 17 / used 3; escrow 0 after settle; T30 conserved |
| T23 | PASS early close refund + unlock |
| T24 | PASS forceSettle after grace |
| T25 | PASS double withdraw |
| T26 | PASS slash capped at locked bond |
| T27 | PASS outbox stays pending on RPC failure |
| T28 | PASS chain log + outbox replay apply once (`apps/api/tests/replay.test.ts`) |
| T29 | PASS unauthenticated fault inject 403 |
| T30 | PASS on-chain 0.59 = 0.44 + 0.15 (demo sum 590000) |
| T31 | PASS listed #13781 call → `qte_4fb626500335b561` → reservation `rsv_f0464418b15a7704` |
| T34 | PASS local PGlite directory copy/reopen (`apps/api/tests/restore.test.ts`) |

T31 PASS 2026-09-18 UTC: listed #13781 Commit Capacity Quote, official call 200 no payment, `quoteId` `qte_4fb626500335b561` consumed as reservation `rsv_f0464418b15a7704` (held, remaining 3). See `evidence/t31-user-side.md`.

T33 PASS 2026-09-19: clean copy at `/tmp/commit-t33`, `corepack pnpm install --frozen-lockfile`, `doctor`, `test:unit` (domain 11 + sdk 2 + api 28).

T34 staging PASS 2026-09-19: stop `commit-api`, snapshot `pglite-2026-09-18T17-47-17-588Z`, restore same dir, start; health 200; latest evidence still `run_04fc72cfb8a2`; alpha/game 200.

Not run: T32 as a separate phone device (viewport + Chinese copy deployed; homepage/evidence verified in browser). Staging: https://commit.jibai.site/api/health 200, quote 200, home/docs/reserve 200; `localHardhat` false; alpha/game 200.

T06-1952 failover LIVE 2026-09-19: Tokyo TAT `COMMIT_T06_LEAD=900` + localhost inject 11s → `rsv_729440135857d4cc` / commitment **4** / evidence `run_12d6a5727869`; chain `breachPrimary=1` `successBackup=1` `route=BACKUP`. Homepage LIVE_RUN updated. Short T06 held (not full settle).

1952 HTTPS play (2026-09-17/18 UTC, `COMMIT_SMOKE_1952=1`): quote `qte_aa82d3faa12ce6bf`, reservation `rsv_1b476de2a4233d2b`, commitment **1**, create [`0xbf1231…394d`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xbf12313ca32b3558eac4497a01397d80908ffb371dd9a190e93ef95535bb394d), remaining **17** / used **3** / status **settled**, evidence `run_04fc72cfb8a2`. T05 and T21 succeeded. T06 succeeded on primary (fault inject 403 — staging admin token is not the local default). Kept as prior full-settle snapshot. T30 snapshot on this registry is **220000** (not the isolated Hardhat 590000); do not treat that as a local T30 fail.
