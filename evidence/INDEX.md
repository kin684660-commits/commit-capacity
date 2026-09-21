# Evidence index

Raw logs stay out of git (`evidence/raw/`). This file only lists public, desensitized pointers.

| Run | Chain | What | Where |
| --- | --- | --- | --- |
| local Hardhat 2026-09-17 | 31337 | T05 + T06 + transfer + settle; remaining 17 / used 3 / 590000 | `docs/QA_REPORT.md`; UI `/evidence/local` **only while local demo stack is up** (not a public URL) |
| Staging HTTPS 2026-09-18 | 1952 | health, config, quote, home 200; alpha/game 200 | `docs/QA_REPORT.md` |
| **1952 HTTPS run_510deba24b1d (LIVE — failover + transfer + settle)** | 1952 | same run: commitment **5**, Tokyo inject → **breachPrimary=1 / successBackup=1 / route=BACKUP**; list/buy ownerEpoch **2**; remaining **17** / used **3** / **settled**. | https://commit.jibai.site/evidence/run_510deba24b1d · create [`0x89d3…634c`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x89d3406d5d618c7b92dc1629783097a64e4473bc5e588e1d66bc3f622592634c) · settle [`0x3140…0126`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x31409058f3709b07acdd5b18a121ff80a2f81d33401a33e44f8c395114170126) |
| 1952 HTTPS run_12d6a5727869 (prior — failover only) | 1952 | earlier run: commitment **4**, controlled fault → backup succeeded; remaining **2** / used **1** / **held, not settled**. Separate from `run_510deba24b1d`. | https://commit.jibai.site/evidence/run_12d6a5727869 · create [`0x05b5…809b`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x05b53003d4f48375e984f25936643b1ae92cba406a5f7b7357a6a938f324809b) |
| 1952 HTTPS run_04fc72cfb8a2 | 1952 | create id **1**, T05/T06/T21 remaining **17** / used **3** / **settled**; buy tx live. T06 did not failover (admin fault 403). Kept as prior full-settle snapshot. | https://commit.jibai.site/evidence/run_04fc72cfb8a2 · create [`0xbf12…394d`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xbf12313ca32b3558eac4497a01397d80908ffb371dd9a190e93ef95535bb394d) |
| T06-1952 2026-09-18 | 1952 | host inject 200; commitment **2**; execute remaining **2** / used **1** | `evidence/t06-staging.md` · create [`0x814d…ced2`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x814d37b1e1675ac3bbce858e0b9e0f7afa982ed99288622b2e3ac6f297b8ced2) |
| T31 User-side 2026-09-18 | 1952 | listed #13781 call → `qte_4fb626500335b561` → reservation `rsv_f0464418b15a7704` held | `evidence/t31-user-side.md` |

Explorer:

- tCOM https://www.okx.com/web3/explorer/xlayer-test/address/0x01F0171f1D2cb9e2Ec133538f155bE79dda81d5E
- Registry https://www.okx.com/web3/explorer/xlayer-test/address/0x1Ee0Adbdc8A06504BaaE33a607185F7D9786Ac64
