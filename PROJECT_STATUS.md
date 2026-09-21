# PROJECT_STATUS

- Version: 0.1.0-dev
- Stage: 2026-09-19 **P0-4 complete**: same-runId 1952 play `run_510deba24b1d` / `rsv_48df15207e9ca9d5` / commitment **5** — T05 + Nova failover + list/buy + T21 + settle. Wallet claimable is still cumulative across commitments (not the local T30 0.59).
- Authorization: A-LOCAL-001 + **A-BATCH-B**. Mainnet 196 disabled. Batch C (public git / video / form) still not started.

## Public URLs

- Workbench: https://commit.jibai.site/
- Health: https://commit.jibai.site/api/health (`chainId` 1952, `localHardhat` false)
- Free quote (ASP service): `POST` https://commit.jibai.site/api/capacity/quote
- Evidence: https://commit.jibai.site/evidence/run_510deba24b1d
- Isolation check (2026-09-18): `alpha.jibai.site` 200, `game.jibai.site` 200. Port 3001 untouched.

## Evidence

- Hardhat tests: 10 passing. Isolated T30 on-chain sum is **0.59 tCOM**.
- API vitest: occupancy/router + **T28 replay** + **T34 restore**.
- `corepack pnpm demo:local`: remaining **17**, used **3**, status **settled**, T30 **590000**.
- X Layer 1952: tCOM `0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E`, registry `0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64`. See `docs/xlayer-1952.md`.
- Tokyo systemd: `commit-web` `:3100`, `commit-api` `:3180`, `commit-providers` `:3142/:3143`. Caddy extra site only (`commit.jibai.site` → `172.18.0.1`), not merged into alpha/game blocks.
- 1952 LIVE full play (`run_510deba24b1d` / `rsv_48df15207e9ca9d5` / commitment **5**): T05 primary ok, Tokyo localhost inject → Nova (`breachPrimary=1` / `successBackup=1` / `route=BACKUP`), list/buy ownerEpoch 2, T21 new owner, settle [`0x3140…0126`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x31409058f3709b07acdd5b18a121ff80a2f81d33401a33e44f8c395114170126). Remaining **17** / used **3** / **settled**. Prior held-failover `run_12d6a5727869` and settle-without-failover `run_04fc72cfb8a2` stay in the index (not spliced).

## Honest line

Live HTTPS + X Layer **testnet** funds and a real quote endpoint. Not commercial mainnet. Not a mocked UI. tCOM has no value. SearchNode/Nova are project-operated. Verifier is Commit-operated (disclosed).

## Still needs the owner

1. Official deactivate of leftover ASP **#4244** returned 81001 (parameter rejected). Mac message attach still lists 4244 and has 0 live streams — #13781 cannot stay on the official inbox until that identity is actually unpublished.
2. Disable the TAT CAM key used in this session (`docs/cam-rotate.md`).
3. Participation route: **Singapore Finale** (chosen). Batch C (public git / video / form) still needs explicit approval.
4. Explorer: Sourcify exact_match done; OKX web green-check optional — `docs/verify-1952.md` + `docs/owner-howto-failover-liverun-verify.md`.
5. Same-runId full 1952 play (failover + transfer + settle) before video — see handbook P0-4.
6. Rotate TAT CAM key: `docs/cam-rotate.md` (owner said later).

## Not on mainnet

Never 196. tCOM has no value. Verifier is Commit-operated (disclosed).
