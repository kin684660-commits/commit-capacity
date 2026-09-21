# Final checklist (not a release candidate yet)

Blockers for calling this a submit-ready build:

- [x] OKX AI ASP listed; User-side T31 with quoteId consumed by create (`evidence/t31-user-side.md`)
- [x] **Same runId** 1952 HTTPS play: create → T05 → T06 **real failover** → list/buy → new-owner execute → close/settle (`run_510deba24b1d` / `rsv_48df15207e9ca9d5` / commitment **5**)
- [x] Sourcify exact_match on tCOM + registry; OKX web login/viaIR optional (`docs/verify-1952.md`)
- [ ] Public git or verified judge access
- [ ] 2–4 min video, unlisted, no secrets (record only after final run)
- [x] Participation route: **Singapore Finale** (7 Oct)
- [ ] Form fields read after Google login; owner approves send
- [ ] CAM key used for TAT rotated (`docs/cam-rotate.md`)
- [x] Evidence timeline no longer paints transfer/settle as success on the held failover run
- [x] This-run counters vs wallet-level claimable split on the evidence page
- [x] Standard buyer create is **0.24** (20×0.01+0.02+0.02); 0.59 is local T30 conserved sum
- [x] Homepage LIVE_RUN points at the **final** same-runId settle+failover play
- [ ] `COMMIT_ALLOW_DEV_SESSION` still off on the public host
- [ ] alpha.jibai.site and game.jibai.site still 200
- [ ] README screenshot, links, and limitations match the live site

Already true (2026-09-19):

- [x] HTTPS product at commit.jibai.site
- [x] Free quote 200 (`smoke:quote`)
- [x] tCOM + registry on 1952
- [x] Local T30 0.59 tCOM (Hardhat; labelled separately from 0.24 buyerTotal)
- [x] T28 replay tests (part of unit suite, not extra to T01–T31)
- [x] T34 local PGlite copy/reopen
- [x] T34 staging backup+restore
- [x] T33 clean-directory install + unit tests
- [x] Runbook / architecture / submission drafts
- [x] Viewport + wrap for long addresses
- [x] ASP listing **draft** + avatar PNG (not on-chain)
- [x] Explorer verify **inputs** (`docs/verify-1952.md`)
- [x] Video script / SRT / thumbnail (not recorded)
- [x] PenaltyAccrued.id=0 disclosed in known-limitations
