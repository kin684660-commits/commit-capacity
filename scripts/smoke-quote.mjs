#!/usr/bin/env node
/** Public HTTPS quote probe. No wallets. A quote does not reserve. */
const url = process.env.COMMIT_QUOTE_URL || "https://commit.jibai.site/api/capacity/quote";
const body = { quantity: 3, query: "okx x layer" };
const r = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const text = await r.text();
if (!r.ok) {
  console.error(r.status, text.slice(0, 500));
  process.exit(1);
}
const json = JSON.parse(text);
console.log(
  JSON.stringify(
    {
      status: r.status,
      quoteId: json.quoteId || json.id || null,
      reservationRequired: json.reservationRequired ?? null,
      keys: Object.keys(json),
    },
    null,
    2,
  ),
);
