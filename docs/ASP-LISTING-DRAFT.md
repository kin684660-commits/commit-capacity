# ASP listing draft

Used to register ASP **#13781** (listed 2026-09-19). Kept as the source copy. Do **not** create a second ASP. Do not reuse #10496 / #10495 / #5163.

## Identity (Step 1)

| Field | Draft |
| --- | --- |
| Role | 服务提供商 |
| Name | `Commit` |
| Description | 让 Agent 按窗口、数量和 SLA 预订受控搜索容量。报价免费；履约与保证金在 X Layer 测试网。报价不等于已预订。 |
| Avatar | `docs/assets/asp-avatar.png` (1024×1024 PNG, 108 KB). Send the file; links are rejected. |

## Service [1] (Step 2)

| Field | Draft |
| --- | --- |
| Name | `Commit Capacity Quote` |
| Type | API service |
| Fee | `0` USDT (digits only: `"0"`) |
| Subscription | — |
| Free trial | — |
| Endpoint | `https://commit.jibai.site/api/capacity/quote` |

### Request description (four parts)

1. [服务说明] 查询指定窗口中两家受控搜索服务的可预订容量、条款和完整费用。报价不等于已预订，也不执行检索。
2. [参数规格] quantity（number，optional）：预订数量 1 到 20，默认 20；query（string，optional）：演示检索语句
3. [请求方法] POST
4. [请求示例] curl -X POST https://commit.jibai.site/api/capacity/quote -H "Content-Type: application/json" -d '{"quantity":3,"query":"okx x layer"}'

`--service` JSON (for the write after confirm only):

```json
[
  {
    "serviceName": "Commit Capacity Quote",
    "serviceDescription": "1. [服务说明] 查询指定窗口中两家受控搜索服务的可预订容量、条款和完整费用。报价不等于已预订，也不执行检索。\n2. [参数规格] quantity（number，optional）：预订数量 1 到 20，默认 20；query（string，optional）：演示检索语句\n3. [请求方法] POST\n4. [请求示例] curl -X POST https://commit.jibai.site/api/capacity/quote -H \"Content-Type: application/json\" -d '{\"quantity\":3,\"query\":\"okx x layer\"}'",
    "serviceType": "A2MCP",
    "fee": "0",
    "endpoint": "https://commit.jibai.site/api/capacity/quote"
  }
]
```

After create: identity is not public until activate. Preferred language for activate: `zh-CN`.

## T31 (done)

Listed-service call → `qte_4fb626500335b561` → reservation `rsv_f0464418b15a7704`. See `evidence/t31-user-side.md`. HTTP `smoke:quote` is not that proof.
