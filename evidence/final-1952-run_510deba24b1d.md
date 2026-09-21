# 1952 final play 2026-09-19 (LIVE_RUN)

Same reservation / commitment / evidence run. Not spliced with `run_12d6a5727869` or `run_04fc72cfb8a2`.

- **runId:** `run_510deba24b1d`
- **reservation:** `rsv_48df15207e9ca9d5`
- **commitment:** `5`
- **window:** 2026-09-19T11:37:47Z → 11:47:47Z
- **termsHash:** `0xe623f8aee02bef4bfc3be46d8840f20b6a155c936a6c4e71701d5612ae9d8599`

## Chain

| Step | Result |
| --- | --- |
| create | [`0x89d3406d5d618c7b92dc1629783097a64e4473bc5e588e1d66bc3f622592634c`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x89d3406d5d618c7b92dc1629783097a64e4473bc5e588e1d66bc3f622592634c) |
| T05 | `req_c514b0ab6e2ab049` SUCCEEDED remaining 19 used 1 (primary) |
| inject | Tokyo localhost `/api/admin/demo/fault` 200 |
| T06 | `req_ed027b1e99736dbb` SUCCEEDED remaining 18 used 2 · **breachPrimary=1 / successBackup=1 / route=BACKUP** |
| list | `lst_0b3a0cd08aad` [`0xfd1fcd9c8139a13e9a67e695163af306d7090330d881e6ff781827cd039254b6`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xfd1fcd9c8139a13e9a67e695163af306d7090330d881e6ff781827cd039254b6) |
| buy | [`0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x2a6c07ac2b32c775d18e767a71b3b02a9980aea38084c0281a989ee010ef5e9c) ownerEpoch 1→2 |
| old owner execute | rejected |
| T21 | `req_e65920b3216e8863` SUCCEEDED remaining 17 used 3 (new owner) |
| settle | [`0x31409058f3709b07acdd5b18a121ff80a2f81d33401a33e44f8c395114170126`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x31409058f3709b07acdd5b18a121ff80a2f81d33401a33e44f8c395114170126) `Settled(id=5, refund=170000, releasedP=80000, releasedB=100000)` |

Final: remaining **17** / used **3** / **settled** / chain status **2**.

Wallet-level `claimable` is cumulative across prior commitments; it is not the isolated local T30 0.59.

Public page: https://commit.jibai.site/evidence/run_510deba24b1d
