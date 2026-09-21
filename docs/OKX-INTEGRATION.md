# OKX integration

P0 uses OKX as the **spot** for finding Commit, not as the matching engine.

## Live (2026-09-18)

- Quote: `POST` https://commit.jibai.site/api/capacity/quote (free)
- Workbench: https://commit.jibai.site/
- Config: https://commit.jibai.site/api/config (`chainId` 1952, tCOM + registry addresses)
- Contracts: `docs/xlayer-1952.md`
- ASP **#13781** `Commit` **listed** (approval 4, status 1, online). Identity chain is X Layer; app funds stay testnet **1952**.
- Original sites still 200: `alpha.jibai.site`, `game.jibai.site`

## T31 (done)

Listed-service call returned `quoteId` `qte_4fb626500335b561`; reservation create consumed it as `rsv_f0464418b15a7704`. Evidence: `evidence/t31-user-side.md`.

## Morning leftovers

- Rotate the Tencent CAM key used for TAT (`docs/cam-rotate.md`).
- Singapore vs Remote.
- Batch C (public git / video / form).

Mainnet 196 stays disabled.
