# Provider contract

Commit can call a **configured** search service. This is not self-serve onboarding.

## Execute

`POST {base}/execute`

```json
{"attemptId":"att_…","query":"EIP-712"}
```

Respond within the attempt deadline (demo: 8 seconds) with `search.v1`:

```json
{
  "status": "SUCCEEDED",
  "providerId": "your-service",
  "response": {
    "schemaVersion": "search.v1",
    "query": "EIP-712",
    "providerId": "your-service",
    "requestId": "att_…",
    "results": [
      {"title":"…","sourceUrl":"https://…","snippet":"…","recordId":"…"}
    ]
  }
}
```

Example wrapper: `packages/provider-sdk/examples/readonly-http-adapter.mjs`. Typed helper: `handleExecute` in `@commit/provider-sdk`.

## What Commit locks

Quote ≠ reservation. Confirmation holds **both** primary and backup pools for that window. Execute without a hold is rejected. Bonds, escrow, one backup attempt, and settlement follow quoted terms.

Commit does **not** lock CPU, quota, or inventory inside the upstream ASP. If the upstream has no reserved capacity of its own, Commit only guarantees admission and fallback/compensation rules.

## Out of scope

No provider signup, ranking, or automatic failover to an arbitrary listed ASP. Backup must be an explicitly compatible `search.v1` service. Side-effecting APIs (trading, writes) are out of scope.

Public page: https://commit.jibai.site/adapter
