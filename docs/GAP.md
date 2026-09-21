# W01 gap: handbook vs existing overnight MVP

Source tree inventoried: `/Users/hoikin/Documents/cursor/okxai比赛/commit-protocol` (not modified).

Workspace `AGENTS.md` does not exist. Only `AGENT.md` for the unrelated 八字 A2A agent.

## Already present (not sufficient)

| Piece | Notes | Maps to |
| --- | --- | --- |
| Next.js dark UI, EN/ZH | 7 tabs; demo-book stats; not Mission Control | W12 rewrite |
| Quote/reserve HTTP stubs | In-memory, no occupancy, no termsHash | W05 replace |
| SearchNode `:3042` | Fake JSON hits, global sim offline, no Search v1 schema, no attemptId | W04 replace |
| `CommitProtocol.sol` | Native `msg.value`, one provider per token, chainId 196, no tCOM, no dual bond, no checkpoint | W06/W07 rewrite |
| Public `/api/public/quote` | Demo prices, not OKX AI User-side proof | W13 |

## Missing vs contest submit

Explorer source verify, public repo, video, form, phone T32, clean-machine T33, staging T34 restore. 1952 HTTPS smoke and T31 User-side are done. Local Hardhat sender exists; testnet sender is wired behind `COMMIT_ALLOW_XLAYER=1`. tCOM, CommitmentRegistry, and HTTPS quote are on 1952 / commit.jibai.site. ASP **#13781** is listed.

## Do not reuse as runtime

`lib/engine.ts` canonical $43.70 / $36.48 demo book, `(demo book)` homepage stats, `$0/call` spot anchors, `CHAIN_MODE=sim`.
