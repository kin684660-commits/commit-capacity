# TASKS

Status: TODO | IN_PROGRESS | BLOCKED | REVIEW | DONE

| ID | Status | Deps | Acceptance | Evidence |
| --- | --- | --- | --- | --- |
| W01–W07 | DONE | — | prior | `docs/QA_REPORT.md` |
| W08 | DONE (local) | W05/W06 | SIWE + demo session, quote/reserve UI | `apps/web/app/reserve/page.tsx` |
| W09 | DONE | W04/W05 | execution router T04–T14 | `apps/api/tests/router.test.ts` |
| W10 | DONE | W07/W09 | outbox + T28 replay | T27 + `apps/api/tests/replay.test.ts` + `apps/api/src/indexer.ts` |
| W11 | DONE (local list/buy/close) | W07/W09/W10 | listing freeze/drain/buy/epoch + Hardhat list/buy/close/settle | T17–T21 + `demo:local` T30 590000 |
| W12 | DONE (local + staging web) | W08–W11 | commitments / transfers / evidence / docs | https://commit.jibai.site/ 200 |
| W13 | DONE | ASP approved | OKX AI User-side T31 | listed #13781; quote `qte_4fb626500335b561` → reservation `rsv_f0464418b15a7704`; `evidence/t31-user-side.md` |
| W14 | DONE | A-BATCH-B | 1952 wallets + tCOM/registry; Sourcify exact_match both contracts (1952) | `docs/verify-1952.md` |
| W15 | DONE | hostname | Tokyo HTTPS without touching alpha/game/3001 | https://commit.jibai.site/api/health 200; `docs/runbook.md` |
| W16 | DONE (local) | W12 | browser opens this-run URLs | home + evidence + settled commitment |
| W17 | DONE | W12 | README + required docs + submission drafts | `README.md`, `docs/*`, `submission/` |
| W18–W19 | BLOCKED | Batch C | video / submit | drafts only: `submission/DEMO_SCRIPT.md` |
| T32 CSS | DONE | W12 | viewport + wrap long addresses | `apps/web/app/layout.tsx`, `globals.css` — phone visual pass still manual |
| T34 | DONE | W15 | PGlite copy/reopen | local unit + staging restore `pglite-2026-09-18T17-47-17-588Z` |
