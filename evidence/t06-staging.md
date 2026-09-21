# T06 staging failover (2026-09-18 UTC)

Host admin fault inject returned HTTP 200, `pendingDelayMs` 11000 (next execute only).

On-chain create: commitment **2**, tx `0x814d37b1e1675ac3bbce858e0b9e0f7afa982ed99288622b2e3ac6f297b8ced2`.

Execute `rsv_eb1b4e3960bbc298`: status **SUCCEEDED**, remaining **2**, liveUsed **1**. Wall time from window start to finish was ~10s (8s primary timeout + backup), not a 1s primary hit.

Also fixed quote path: expired holds are released before checking capacity (`apps/api/src/occupancy.ts`).
