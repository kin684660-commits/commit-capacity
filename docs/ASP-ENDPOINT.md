# ASP / A2MCP quote endpoint

P0 lists a **free** capacity quote. Paid x402 is frozen (D009).

## Live

| Field | Value |
| --- | --- |
| Method | `POST` (probes may `GET`) |
| URL | https://commit.jibai.site/api/capacity/quote |
| Auth | none (rate-limited) |
| Payment | none in P0 |
| Effect | quote only — does **not** reserve occupancy |
| Checked | 2026-09-18 HTTPS 200, `quoteId` returned |

Example:

```http
POST /api/capacity/quote
content-type: application/json

{"quantity":3,"query":"okx x layer"}
```

## Listing

ASP **#13781** used this endpoint. Draft copy remains in `docs/ASP-LISTING-DRAFT.md`.

#13781 is **listed**. T31 consumed a listed-service `quoteId` into reservation create (`evidence/t31-user-side.md`). Do not attach this listing to #10496.
