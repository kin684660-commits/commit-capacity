# T31 User-side (2026-09-18 UTC)

ASP **#13781** listed (`approvalStatus` 4, `status` 1, online). Service **Commit Capacity Quote** is live, fee 0.

Official User-side call (logged-in wallet, POST quantity=3, query=`okx x layer`): HTTP **200**, no payment required.

- `quoteId`: `qte_4fb626500335b561`
- consumed by `POST /api/reservations` → `rsv_f0464418b15a7704`
- reservation `status`: held, remaining 3

HTTP `smoke:quote` is not this proof. This run is the listed-service path into reservation create.
