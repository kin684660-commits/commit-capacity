# Artifact delivery run (not spliced with protocol evidence)

Purpose: store real `search.v1` bodies after persistence shipped.  
Protocol failover / transfer / settle remains `run_510deba24b1d`. These are two runs.

- **runId:** `run_429d2129ab1e`
- **reservation:** `rsv_653b5dc56b6988cf`
- **commitment:** `6`
- **window:** 2026-09-20T18:17:08Z → 18:20:08Z
- **create:** [`0x500431ba0d8821a52462e2dcb4ac7372220201fd519974582248237f094f1e0f`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x500431ba0d8821a52462e2dcb4ac7372220201fd519974582248237f094f1e0f)
- **quoteId:** `qte_642b1ecf58c4425d`
- **used / remaining:** 3 / 0
- **status:** held (close/settle reverted `closeWithCheckpoint`; unused escrow is zero because all 3 units were used)
- **bodies:** stored

| Query | Request | First hit |
| --- | --- | --- |
| EIP-712 | `req_7e515e6e295c5d69` | EIP-712 Typed structured data hashing and signing |
| RFC 2119 | `req_b72cfec6683e0752` | RFC 2119 — Key words for use in RFCs |
| X Layer | `req_68f5bbfe0cae181f` | X Layer network information |

Fixed public corpus. Not live web search. Not spliced with `run_510deba24b1d`.

Public: https://commit.jibai.site/agent
