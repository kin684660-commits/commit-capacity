"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  ARTIFACT_RUN,
  ARTIFACT_RSV,
  ARTIFACT_WINDOW,
  ASP_ID,
  LIVE_RUN,
  LIVE_RSV,
  LIVE_WINDOW,
  SERVICE_ID,
  explorerTx,
} from "@/lib/links";
import { thisRunEconomics, type EvidenceSummary } from "@/lib/evidenceSteps";

type Ev = {
  runId?: string;
  reservationId?: string;
  summary?: EvidenceSummary;
};

type Hit = { title?: string; sourceUrl?: string; snippet?: string; recordId?: string };

type Req = {
  requestId?: string;
  status?: string;
  query?: string;
  output?: { query?: string; providerId?: string; results?: Hit[] } | null;
};

type Load = "wait" | "ok" | "err";

function money(n: number) {
  return `${n.toFixed(2)} tCOM`;
}

async function loadRequests(row: Ev): Promise<Req[]> {
  const ids = [row.summary?.t05?.requestId, row.summary?.t06?.requestId, row.summary?.t21?.requestId].filter(
    Boolean,
  ) as string[];
  const rows: Req[] = [];
  for (const id of ids) {
    try {
      rows.push(await api<Req>(`/api/requests/${id}`));
    } catch {
      rows.push({ requestId: id, status: undefined, query: "", output: null });
    }
  }
  return rows;
}

export default function AgentPage() {
  const { t } = useI18n();
  const [protocol, setProtocol] = useState<Ev | null>(null);
  const [artifact, setArtifact] = useState<Ev | null>(null);
  const [protocolReqs, setProtocolReqs] = useState<Req[]>([]);
  const [artifactReqs, setArtifactReqs] = useState<Req[]>([]);
  const [load, setLoad] = useState<Load>("wait");

  const loadRun = useCallback(() => {
    setLoad("wait");
    Promise.all([
      api<Ev>(`/api/evidence/${LIVE_RUN}`),
      ARTIFACT_RUN ? api<Ev>(`/api/evidence/${ARTIFACT_RUN}`) : Promise.resolve(null),
    ])
      .then(async ([proto, art]) => {
        setProtocol(proto);
        setProtocolReqs(await loadRequests(proto));
        if (art) {
          setArtifact(art);
          setArtifactReqs(await loadRequests(art));
        }
        setLoad("ok");
      })
      .catch(() => setLoad("err"));
  }, []);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  const protoSum = protocol?.summary;
  const artSum = artifact?.summary;
  const protoEcon = thisRunEconomics(protoSum);
  const hits = artifactReqs.flatMap((r) => (r.output?.results || []).map((hit) => ({ ...hit, query: r.query || r.output?.query })));
  const deliveryOn = Boolean(ARTIFACT_RUN);
  const hasArtifact = Boolean(ARTIFACT_RUN && artifact);

  return (
    <main>
      <p className="kicker-plain">{t.agentTag}</p>
      <h1>{t.agentH1}</h1>
      <p className="lede">{t.agentLede}</p>
      {load === "wait" && <p className="muted">{t.loadWait}</p>}
      {load === "err" && (
        <p className="err">
          {t.loadFail}{" "}
          <button type="button" className="btn ghost" onClick={loadRun}>
            {t.retry}
          </button>
        </p>
      )}

      <section className="panel">
        <p className="preview-kicker">{t.caseDeliveryT}</p>
        <h3>{t.agentGotT}</h3>
        <p className="muted small">{t.caseDeliveryP}</p>
        {deliveryOn ? (
          <>
            <p>
              ASP #{ASP_ID} · search · 3 units · {ARTIFACT_WINDOW || t.notRecorded}
            </p>
            <p className="muted small">
              {t.agentCorpus} · {artifact?.runId || ARTIFACT_RUN} · {artifact?.reservationId || ARTIFACT_RSV}
            </p>
            {load === "wait" && <p className="muted">{t.loadWait}</p>}
            {load === "ok" && hits.length > 0 ? (
              <ul className="hit-list">
                {hits.map((hit, i) => (
                  <li key={`${hit.recordId || i}-${hit.sourceUrl || ""}`}>
                    <strong>{hit.title || t.notRecorded}</strong>
                    {hit.query ? <span className="muted small"> · {hit.query}</span> : null}
                    <p>{hit.snippet || t.notRecorded}</p>
                    {hit.sourceUrl ? (
                      <a href={hit.sourceUrl} target="_blank" rel="noreferrer">
                        {t.agentHitSource}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {load === "ok" && hits.length === 0 ? <p className="muted">{t.agentNoOutput}</p> : null}
          </>
        ) : (
          <p>{t.agentNoOutput}</p>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>{t.agentTaskT}</h3>
        {(hasArtifact ? artifactReqs : protocolReqs).length > 0 ? (
          <ul className="brief">
            {(hasArtifact ? artifactReqs : protocolReqs).map((r) => (
              <li key={r.requestId}>
                {r.query ? r.query : t.notRecorded}
                {r.status ? ` · ${r.status}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{load === "ok" ? t.notRecorded : t.loadWait}</p>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <p className="preview-kicker">{t.caseProtocolT}</p>
        <h3>{t.agentHappenedT}</h3>
        <p className="muted small">{t.caseProtocolP}</p>
        <p>
          ASP #{ASP_ID} · search · 20 units · {LIVE_WINDOW} · prepaid 0.24 tCOM
        </p>
        <p className="muted small">
          {LIVE_RUN} · {protocol?.reservationId || LIVE_RSV}
        </p>
        <ol className="brief">
          <li>{t.simTimeout}</li>
          <li>
            {t.simBackup.replace(
              "{n}",
              protoSum?.t06?.remaining != null ? String(protoSum.t06.remaining) : t.notRecorded,
            )}
          </li>
          <li>{t.caseHandlingV}</li>
        </ol>
        {protoEcon ? (
          <dl className="lab-dl" style={{ marginTop: 12 }}>
            <div>
              <dt>{t.evEconPrepaid}</dt>
              <dd>{money(protoEcon.buyerPrepaid)}</dd>
            </div>
            <div>
              <dt>{t.evEconPay}</dt>
              <dd>{money(protoEcon.providerPay)}</dd>
            </div>
            <div>
              <dt>{t.evEconRefund}</dt>
              <dd>{money(protoEcon.unusedRefund)}</dd>
            </div>
            <div>
              <dt>{t.evEconPenalty}</dt>
              <dd>{money(protoEcon.failoverPenalty)}</dd>
            </div>
          </dl>
        ) : null}
        {protoEcon && protoEcon.failoverPenalty > 0 ? (
          <p className="muted small">{t.evFeeBond.replace("{penalty}", protoEcon.failoverPenalty.toFixed(2))}</p>
        ) : null}
        <p style={{ marginTop: 12 }}>
          <Link className="btn" href={`/evidence/${LIVE_RUN}`}>
            {t.ctaEvidence}
          </Link>
          {hasArtifact ? (
            <>
              {" "}
              <Link className="btn ghost" href={`/evidence/${ARTIFACT_RUN}`}>
                {t.caseDeliveryT}
              </Link>
            </>
          ) : null}
        </p>
      </section>

      <details className="raw-details">
        <summary>{t.agentTrailT}</summary>
        <ol className="call-chain mono">
          <li>
            OKX AI listed quote · ASP #{ASP_ID} · {SERVICE_ID}
          </li>
          <li>protocol quoteId {protoSum?.quoteId || t.notRecorded}</li>
          {hasArtifact ? <li>delivery quoteId {artSum?.quoteId || t.notRecorded}</li> : null}
          <li>
            protocol settle{" "}
            {protoSum?.settlement?.settleTx ? (
              <a href={explorerTx(protoSum.settlement.settleTx)} target="_blank" rel="noreferrer">
                {protoSum.settlement.settleTx.slice(0, 12)}…
              </a>
            ) : (
              t.notRecorded
            )}
          </li>
        </ol>
      </details>
    </main>
  );
}
