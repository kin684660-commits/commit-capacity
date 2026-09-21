# 1952 HTTPS smoke (do not run until the owner says so)

Uses gitignored `.local/xlayer-wallets.json` and staging HTTPS. Spends **test** OKB + tCOM only. Never 196.

## Preconditions

- [ ] `COMMIT_ALLOW_XLAYER=1` already on the host
- [ ] `localHardhat` is false at `/api/config`
- [ ] Buyer and seller have test OKB (faucet: https://web3.okx.com/xlayer/faucet/xlayerfaucet)
- [ ] Window start ≥ now + 60s (`COMMIT_MIN_LEAD_SECONDS`)
- [ ] Owner replied 「可以跑 1952 smoke」

## Sequence

1. `corepack pnpm smoke:quote` — save `quoteId`
2. SIWE as buyer → `POST /api/reservations` with that `quoteId`
3. `POST /api/commitments/<id>/onchain-create`
4. Wait until window start
5. Execute once (T05)
6. Inject primary delay (admin token) → execute (T06)
7. Prepare list → buy as designated wallet → execute as new owner (T21)
8. Close + settle; record remaining / used / txs
9. Put `evidenceRunId` into `submission/RELEASE_MANIFEST.json`

Do not run this from the Mac against Tokyo wallets unless TAT or an explicit local env with `COMMIT_ALLOW_XLAYER=1` is used. Do not enable `COMMIT_ALLOW_DEV_SESSION` on the public host.
