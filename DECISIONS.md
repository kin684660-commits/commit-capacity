# DECISIONS

| ID | Decision | Why | Change condition |
| --- | --- | --- | --- |
| D001 | New independent repo at `commit/`, do not rewrite `commit-protocol/` | Handbook default; old MVP uses sim txs, chainId 196, native value, in-memory JSON, multi-service fake book | User names a different path |
| D002 | X Layer **testnet chainId 1952**; mainnet 196 disabled | Builder Kit / official network page [S6]; old MVP used 196 incorrectly | Official correction |
| D003 | Demo asset is self-deployed 6-decimal **tCOM**, not OKB and not USD₮0 | Handbook §3.2 | Official test token is simpler and authorized |
| D004 | Single service class: Search v1 over a fixed public corpus | P0 boundary | External search is P1 and must not change metering |
| D005 | Two separately running providers: SearchNode (primary), Nova (backup) | Handbook demo story | Disclose shared host/corpus; do not claim upstream DR |
| D006 | Whole remaining entitlement transfer at a fixed price to a designated buyer | P0; no partial splits | Owner approval to drop paid transfer |
| D007 | Centralized Commit Verifier; stated in UI and README | Honest trust model | Not in this 9-day P0 |
| D008 | Local DB is **PGlite** (Postgres dialect) until a real Postgres is installed | Machine had no Docker/Postgres at W05; occupancy still uses SQL transactions + `FOR UPDATE` | Set `DATABASE_URL` to Postgres later |
| D009 | P1 frozen: x402, Agentic Wallet auto-sign, extra motion, user interviews | Handbook priority | After official quote path works |
| D011 | W07 includes designated-buyer list/buy so T30 can run on-chain | Handbook lists T30 under W07 | W11 still adds off-chain freeze/drain |
| D012 | `COMMIT_MIN_LEAD_SECONDS` stays 60; `demo:local` warps Hardhat +61s instead of skipping lead | Judge-facing quotes must refuse immediate windows | Do not set minLead 0 on a public host |
| D013 | Outbox stores checkpoint JSON until a chain sender exists | Unit tests stay RPC-off | Local sender when `COMMIT_RPC_URL` + `COMMIT_ALLOW_HARDHAT_KEYS=1`; testnet sender when `COMMIT_ALLOW_XLAYER=1` + 1952 wallets |
| D014 | Local demo chain is Hardhat 31337 with deployed tCOM; contest chain remains 1952 | A-LOCAL-001 forbade X Layer deploy | A-BATCH-B: deploy to 1952 after test OKB; never 196 |
| D015 | Five gitignored 1952 role wallets; seller = deployer | Fewer faucets; roles still separate addresses except seller | Rotate with `wallets:xlayer --force` |
