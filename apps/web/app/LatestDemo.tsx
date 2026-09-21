"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Latest = {
  recorded?: boolean;
  runId?: string;
  reservationId?: string;
  note?: string;
  summary?: {
    t06?: { remaining?: number; liveUsed?: number };
    t21?: { remaining?: number; liveUsed?: number };
    closed?: { status?: string };
  };
};

const FALLBACK_RUN = "run_510deba24b1d";
const FALLBACK_RSV = "rsv_729440135857d4cc";

export function LatestDemo() {
  const { t } = useI18n();
  const [data, setData] = useState<Latest | null>(null);

  useEffect(() => {
    api<Latest>("/api/demo/latest")
      .then(setData)
      .catch(() => setData({ recorded: true, runId: FALLBACK_RUN, reservationId: FALLBACK_RSV }));
  }, []);

  const runId = data?.runId || FALLBACK_RUN;
  const reservationId = data?.reservationId || FALLBACK_RSV;
  const remaining = data?.summary?.t06?.remaining ?? data?.summary?.t21?.remaining ?? 2;
  const used = data?.summary?.t06?.liveUsed ?? data?.summary?.t21?.liveUsed ?? 1;
  const rawClosed = String(data?.summary?.closed?.status || "held").toLowerCase();
  const status = rawClosed === "settled" || rawClosed === "closed" ? rawClosed : "held";

  return (
    <section className="stats">
      <div>
        <span>{t.statsRun}</span>
        <strong className="mono">{runId}</strong>
      </div>
      <div>
        <span>{t.statsRemain}</span>
        <strong>{remaining}</strong>
      </div>
      <div>
        <span>{t.statsUsed}</span>
        <strong>{used}</strong>
      </div>
      <div>
        <span>{t.statsStatus}</span>
        <strong>{status}</strong>
      </div>
      <div className="stats-actions">
        <Link className="btn" href={`/evidence/${runId}`}>
          {t.openEvidence}
        </Link>
        {reservationId && (
          <Link className="btn ghost" href={`/commitments/${reservationId}`}>
            {t.openCommitment}
          </Link>
        )}
      </div>
      {data && !data.recorded && <p className="muted">{data.note}</p>}
    </section>
  );
}
