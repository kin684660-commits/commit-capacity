"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { LatestDemo } from "../../LatestDemo";
import { useI18n } from "@/lib/i18n";
import { ARTIFACT_RUN, ARTIFACT_WINDOW, ASP_ID, LIVE_RSV, LIVE_RUN, LIVE_WINDOW, explorerTx } from "@/lib/links";
import { Address } from "@/components/Address";
import {
  buildTimeline,
  displayStatus,
  failoverRoute,
  feeIdentity,
  formatUnixWindow,
  occupancyHeldWhileClosed,
  remainingUsed,
  resultCard,
  runHeadline,
  thisRunEconomics,
  t30Reading,
  type EvidenceSummary,
} from "@/lib/evidenceSteps";

type ChainSummary = {
  commitmentId?: string;
  createTx?: string;
  owner?: string;
  successPrimary?: string;
  successBackup?: string;
  breachPrimary?: string;
  breachBackup?: string;
  status?: number;
  escrow?: string;
  claimable?: { owner?: string; primary?: string; backup?: string; buyer?: string };
};

type LiveView = {
  status?: string;
  window?: { start?: number | string; end?: number | string };
  chain?: ChainSummary;
};

type Evidence = {
  recorded?: boolean;
  runId?: string;
  reservationId?: string;
  note?: string;
  termsVerification?: { quoteTermsHash?: string; onchainTermsHash?: string; match?: boolean };
  summary?: EvidenceSummary;
};

function tcom(raw?: string) {
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return (n / 1e6).toFixed(2);
}

function money(n: number) {
  return `${n.toFixed(2)} tCOM`;
}

export default function EvidencePage() {
  const { t } = useI18n();
  const params = useParams<{ runId: string }>();
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState<LiveView | null>(null);

  useEffect(() => {
    const path = params.runId === "local" ? "/api/demo/latest" : `/api/evidence/${params.runId}`;
    api<Evidence>(path)
      .then(async (ev) => {
        setData(ev);
        if (ev.reservationId) {
          try {
            const c = await api<LiveView>(`/api/commitments/${ev.reservationId}`);
            setLive(c);
          } catch {
            setLive(null);
          }
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [params.runId]);

  const s: EvidenceSummary | undefined = data?.summary
    ? {
        ...data.summary,
        occupancyStatus: live?.status || data.summary.occupancyStatus,
        window: live?.window || data.summary.window,
        chain: { ...(data.summary.chain || {}), ...(live?.chain || {}) },
      }
    : undefined;
  const { remaining, used } = remainingUsed(s);
  const reservationId = data?.reservationId;
  const terms = data?.termsVerification;
  const chain = s?.chain || {};
  const claim = chain.claimable;
  const headline = runHeadline(s);
  const status = displayStatus(s);
  const card = resultCard(s);
  const econ = thisRunEconomics(s);
  const t30 = t30Reading(s);
  const route = failoverRoute(s);
  const hasWalletBalances = Boolean(claim?.owner || claim?.buyer || claim?.primary || claim?.backup);
  const liveWindow =
    formatUnixWindow(s?.window?.start, s?.window?.end) ||
    (params.runId === LIVE_RUN ? LIVE_WINDOW : params.runId === ARTIFACT_RUN ? ARTIFACT_WINDOW : t.notRecorded);

  const headlineText =
    headline === "held_failover"
      ? t.evHeadHeldFailover
      : headline === "closed"
        ? t.evHeadClosed
        : headline === "settled"
          ? t.evHeadSettled
          : headline === "transferred"
            ? t.evHeadTransferred
            : headline === "listed"
              ? t.evHeadListed
              : headline === "failed"
                ? t.evHeadFailed
                : t.evTag;

  const disclaimer =
    headline === "held_failover" ? t.evHeldDisclaimer : headline === "closed" ? t.evClosedDisclaimer : t.evLede;

  const timeline = buildTimeline(s, {
    quote: t.tlQuote,
    reserve: t.tlReserve,
    primary: t.tlPrimary,
    failover: t.tlFailover,
    faultMissed: t.tlFaultMissed,
    transfer: t.tlTransfer,
    after: t.tlAfter,
    close: t.tlClose,
    notRun: t.tlNotRun,
    remain: t.evRemain,
    used: t.evUsed,
  });

  const buyTx = s?.transfer?.buyTx || s?.bought?.buyTx || s?.bought?.txHash;
  const settleTx = s?.settlement?.settleTx;

  return (
    <main>
      <div className="tag">{headlineText}</div>
      <h1>
        {t.evH1} <span className="mono">{params.runId === "local" ? t.evLatest : params.runId}</span>
      </h1>
      <p className="lede">{disclaimer}</p>
      <p className="muted small">{t.evRecordedNote}</p>
      {params.runId === "local" && <LatestDemo />}
      {error && <p className="err">{error}</p>}

      {s && (
        <>
          <dl className="lab-dl" style={{ marginBottom: 28 }}>
            <div>
              <dt>{t.evFirstService}</dt>
              <dd>Commit Capacity Quote · search</dd>
            </div>
            <div>
              <dt>{t.evFirstOp}</dt>
              <dd>{t.serviceOp}</dd>
            </div>
            <div>
              <dt>{t.evFirstWindow}</dt>
              <dd className="mono">{liveWindow}</dd>
            </div>
            <div>
              <dt>{t.evFirstResult}</dt>
              <dd>
                {card.requests} used · {card.failovers} failover · {card.settled ? "settled" : "not settled"}
              </dd>
            </div>
            <div>
              <dt>{t.evFirstMoney}</dt>
              <dd>{econ ? money(econ.buyerPrepaid) : t.notRecorded} prepaid</dd>
            </div>
            <div>
              <dt>{t.evFirstVerify}</dt>
              <dd>{t.ecoVerifier}</dd>
            </div>
          </dl>
          <ul className="result-card" aria-label={t.evResultT}>
            <li>
              <span>{t.evResultReq}</span>
              <strong>{card.requests}</strong>
            </li>
            <li>
              <span>{t.evResultFail}</span>
              <strong>{card.failovers}</strong>
            </li>
            <li>
              <span>{t.evResultXfer}</span>
              <strong>{card.transfers}</strong>
            </li>
            <li>
              <span>{t.evResultSettle}</span>
              <strong>{card.settled ? t.settledYes : t.settledNo}</strong>
            </li>
          </ul>

          <div className="ev-grid">
            <section className="panel">
              <h3>{t.evWhat}</h3>
              <p className="muted">{s.play || s.note || "1952 HTTPS"}</p>
              <div className="stats ev-stats">
                <div>
                  <span>{t.evRemain}</span>
                  <strong>{remaining ?? "—"}</strong>
                </div>
                <div>
                  <span>{t.evUsed}</span>
                  <strong>{used ?? "—"}</strong>
                </div>
                <div>
                  <span>{t.evStatus}</span>
                  <strong>{status}</strong>
                </div>
              </div>
              {s.chain?.createTx && (
                <p className="small">
                  #{s.chain.commitmentId} · {s.chain.owner && <Address value={s.chain.owner} />}
                </p>
              )}

              {econ && (
                <div className="terms-proof econ-proof">
                  <h4>{t.evEconThisT}</h4>
                  <dl>
                    <div>
                      <dt>{t.evEconPrepaid}</dt>
                      <dd>{money(econ.buyerPrepaid)}</dd>
                    </div>
                    <div>
                      <dt>{t.evEconPay}</dt>
                      <dd>{money(econ.providerPay)}</dd>
                    </div>
                    <div>
                      <dt>{t.evEconRefund}</dt>
                      <dd>{money(econ.unusedRefund)}</dd>
                    </div>
                    <div>
                      <dt>{t.evEconPenalty}</dt>
                      <dd>{money(econ.failoverPenalty)}</dd>
                    </div>
                    {econ.transferPrice > 0 && (
                      <div>
                        <dt>{t.evEconXfer}</dt>
                        <dd>{money(econ.transferPrice)}</dd>
                      </div>
                    )}
                  </dl>
                  <p className={econ.escrowConserved ? "hash-match" : "err"}>
                    {econ.escrowConserved ? `✓ ${t.evEconConserved}` : t.evEconConserved}
                  </p>
                  {econ.reservationFees > 0 && (
                    <p className="muted small">{t.evFeeReserveSplit.replace("{fees}", econ.reservationFees.toFixed(2))}</p>
                  )}
                  <p className="muted small">{feeIdentity(econ, t.evFeeIdentity)}</p>
                  {econ.failoverPenalty > 0 && (
                    <p className="muted small">{t.evFeeBond.replace("{penalty}", econ.failoverPenalty.toFixed(2))}</p>
                  )}
                  {econ.transferPrice > 0 && (
                    <p className="muted small">{t.evFeeXferNote.replace("{xfer}", econ.transferPrice.toFixed(2))}</p>
                  )}
                  {occupancyHeldWhileClosed(s) && <p className="muted small">{t.evSettleIncomplete}</p>}
                  <p className="muted small">{t.evClaimableNote}</p>
                  <p className="small mono">
                    {t.evEconBreach}: P {chain.breachPrimary ?? "—"} / B {chain.breachBackup ?? "—"} · okP{" "}
                    {chain.successPrimary ?? "—"} / okB {chain.successBackup ?? "—"} · {t.evEconRoute}: {route || "—"}
                  </p>
                </div>
              )}

              <div className="terms-proof">
                <h4>{t.evCallT}</h4>
                <ol className="call-chain mono">
                  <li>OKX AI ASP #{ASP_ID} · Commit Capacity Quote</li>
                  <li>quoteId {s.quoteId || "—"}</li>
                  <li>reservationId {reservationId || LIVE_RSV}</li>
                  <li>commitmentId {chain.commitmentId || "—"}</li>
                  <li>
                    execute {s.t05?.requestId || "—"} → {s.t06?.requestId || "—"}
                    {s.t21?.requestId ? ` → ${s.t21.requestId}` : ""}
                  </li>
                  <li>
                    settle{" "}
                    {settleTx ? (
                      <a href={explorerTx(settleTx)} target="_blank" rel="noreferrer">
                        {settleTx.slice(0, 10)}…
                      </a>
                    ) : (
                      "—"
                    )}
                  </li>
                </ol>
              </div>

              {t30 && (
                <div className="terms-proof">
                  <h4>{t.evT30T}</h4>
                  <p className="muted small">{t.evT30Na}</p>
                  <p className="small mono">
                    isolated expected {tcom(t30.isolatedExpected)} · wallet sum {tcom(t30.walletSum)} · stored ok=
                    {String(t30.ok)} · verdict {t30.verdict}
                    {t30.conserved != null
                      ? ` · this commitment used ${t30.used} remaining ${t30.remaining} conserved ${String(t30.conserved)}`
                      : ""}
                  </p>
                </div>
              )}

              <div className="terms-proof">
                <h4>{t.evTermsT}</h4>
                {terms?.quoteTermsHash && terms.onchainTermsHash ? (
                  <>
                    <p className={terms.match ? "hash-match" : "err"}>
                      {terms.match ? `✓ ${t.evTermsMatch}` : "✕ mismatch"}
                    </p>
                  </>
                ) : (
                  <p className="muted small">{t.evTermsUnavailable}</p>
                )}
              </div>
              <div className="row" style={{ margin: "12px 0 0" }}>
                {reservationId && (
                  <Link className="btn ghost" href={`/commitments/${reservationId}`}>
                    {t.evOpen} {reservationId}
                  </Link>
                )}
                {s.chain?.createTx && (
                  <a className="btn ghost" href={explorerTx(s.chain.createTx)} target="_blank" rel="noreferrer">
                    {t.evTx}
                  </a>
                )}
                {buyTx && (
                  <a className="btn ghost" href={explorerTx(buyTx)} target="_blank" rel="noreferrer">
                    {t.evExplorer} buy
                  </a>
                )}
                {settleTx && (
                  <a className="btn ghost" href={explorerTx(settleTx)} target="_blank" rel="noreferrer">
                    {t.evExplorer} settle
                  </a>
                )}
              </div>
            </section>

            <section className="panel">
              <h3>{t.tlTitle}</h3>
              <ol className="timeline">
                {timeline.map((x) => (
                  <li key={x.key} className={x.tone}>
                    <i />
                    <div>
                      <div className="tl-label">
                        {x.label}
                        {x.status && <span className="tl-status mono">{x.status}</span>}
                      </div>
                      {x.href ? (
                        <a className="tl-meta mono" href={explorerTx(x.href)} target="_blank" rel="noreferrer">
                          {x.meta || x.href}
                        </a>
                      ) : (
                        x.meta && <div className="tl-meta mono">{x.meta}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}

      <details className="raw-details">
        <summary>{t.evWalletDetails}</summary>
        {hasWalletBalances && (
          <div className="terms-proof econ-proof" style={{ marginBottom: 12 }}>
            <h4>{t.evWalletT}</h4>
            <div className="stats ev-stats">
              <div>
                <span>{t.evEconBuyer}</span>
                <strong>{tcom(claim?.owner || claim?.buyer)}</strong>
              </div>
              <div>
                <span>{t.evEconPrimary}</span>
                <strong>{tcom(claim?.primary)}</strong>
              </div>
              <div>
                <span>{t.evEconBackup}</span>
                <strong>{tcom(claim?.backup)}</strong>
              </div>
            </div>
            <p className="muted small">{t.evWalletNote}</p>
          </div>
        )}
        <pre className="panel mono raw">{data ? JSON.stringify(data, null, 2) : error ? "" : t.evLoading}</pre>
      </details>
    </main>
  );
}
