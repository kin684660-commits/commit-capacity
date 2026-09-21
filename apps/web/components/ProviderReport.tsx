"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LIVE_RUN } from "@/lib/links";
import { resultCard, type EvidenceSummary } from "@/lib/evidenceSteps";

type Ev = { summary?: EvidenceSummary };

export function ProviderReport() {
  const { t } = useI18n();
  const [card, setCard] = useState<ReturnType<typeof resultCard> | null>(null);

  useEffect(() => {
    api<Ev>(`/api/evidence/${LIVE_RUN}`)
      .then((row) => setCard(resultCard(row.summary)))
      .catch(() => setCard(null));
  }, []);

  const requests = card?.requests ?? null;
  const failovers = card?.failovers ?? null;
  const primaryHits = requests != null && failovers != null ? Math.max(requests - failovers, 0) : null;

  return (
    <section className="prov-editorial" id="providers">
      <h2>{t.provSecT}</h2>
      <p className="lede how-lede">{t.provSecP}</p>
      <ul className="run-strip">
        <li>
          <span>{t.provHit}</span>
          <strong>{primaryHits == null ? "…" : `${primaryHits}/${requests}`}</strong>
        </li>
        <li>
          <span>{t.provBackupM}</span>
          <strong>{failovers ?? "…"}</strong>
        </li>
        <li>
          <span>{t.provFailN}</span>
          <strong>{card == null ? "…" : "0"}</strong>
        </li>
      </ul>
      <p className="muted small">{t.provInject}</p>
      <ul className="prov-points">
        <li>{t.provCap}</li>
        <li>{t.provSee}</li>
        <li>{t.provTune}</li>
      </ul>
      <p>
        <Link href={`/evidence/${LIVE_RUN}`}>{t.ctaEvidence} →</Link>
      </p>
    </section>
  );
}
