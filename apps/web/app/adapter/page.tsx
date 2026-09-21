"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const EXAMPLE = `POST {base}/execute
content-type: application/json

{"attemptId":"att_…","query":"EIP-712"}

→ 200
{
  "status": "SUCCEEDED",
  "providerId": "your-service",
  "response": {
    "schemaVersion": "search.v1",
    "query": "EIP-712",
    "providerId": "your-service",
    "requestId": "att_…",
    "results": [
      {
        "title": "…",
        "sourceUrl": "https://…",
        "snippet": "…",
        "recordId": "…"
      }
    ]
  }
}`;

export default function AdapterPage() {
  const { t } = useI18n();
  return (
    <main>
      <p className="kicker-plain">{t.adapterTag}</p>
      <h1>{t.adapterH1}</h1>
      <p className="lede">{t.adapterLede}</p>

      <section className="panel">
        <h3>{t.adapterShapeT}</h3>
        <p>{t.adapterShape}</p>
        <pre className="mono adapter-pre">{EXAMPLE}</pre>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>{t.adapterLimitT}</h3>
        <p>{t.adapterLimit}</p>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>{t.adapterNotT}</h3>
        <p>{t.adapterNot}</p>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>{t.adapterExT}</h3>
        <p>{t.adapterExP}</p>
        <p className="muted small">
          <Link href="/docs#repro">{t.docsReproT} →</Link>
        </p>
      </section>
    </main>
  );
}
