"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LIVE_RUN } from "@/lib/links";
import { resultCard, type EvidenceSummary } from "@/lib/evidenceSteps";

type Ev = { summary?: EvidenceSummary };
type Load = "wait" | "ok" | "err";

export function HomeRecord() {
  const { t } = useI18n();
  const [card, setCard] = useState<ReturnType<typeof resultCard> | null>(null);
  const [load, setLoad] = useState<Load>("wait");

  useEffect(() => {
    api<Ev>(`/api/evidence/${LIVE_RUN}`)
      .then((row) => {
        setCard(resultCard(row.summary));
        setLoad("ok");
      })
      .catch(() => setLoad("err"));
  }, []);

  return (
    <>
      <section className="home-scene" id="demo-preview">
        <article className="report-preview">
          <p className="preview-kicker">{t.previewKicker}</p>
          <h3>{t.caseT}</h3>
          <dl className="case-facts">
            <div>
              <dt>{t.casePromise}</dt>
              <dd>{t.casePromiseV}</dd>
            </div>
            <div>
              <dt>{t.caseActual}</dt>
              <dd>{t.caseActualV}</dd>
            </div>
            <div>
              <dt>{t.caseHandling}</dt>
              <dd>{t.caseHandlingV}</dd>
            </div>
          </dl>
          <p className="muted small">{t.agentLimit}</p>
          <Link className="scene-run" href={`/agent`}>
            {t.ctaViewRun} →
          </Link>
        </article>
        <div>
          <h2 className="scene-see">{t.sceneSee}</h2>
          <p>{t.sceneP}</p>
          <img
            src="/images/commit/03-task-continuity-illustration.jpg"
            alt=""
            width={1536}
            height={1024}
            className="sceneIllustration"
            loading="lazy"
          />
          <p className="muted small">{t.sceneArt}</p>
        </div>
      </section>

      <section className="home-run">
        {load === "wait" && <p className="muted">{t.loadWait}</p>}
        {load === "err" && <p className="err">{t.loadFail}</p>}
        <ul className="run-strip" aria-label={t.evResultT}>
          <li>
            <span>{t.evResultReq}</span>
            <strong>{load === "ok" ? (card?.requests ?? t.notRecorded) : "…"}</strong>
          </li>
          <li>
            <span>{t.evResultFail}</span>
            <strong>{load === "ok" ? (card?.failovers ?? t.notRecorded) : "…"}</strong>
          </li>
          <li>
            <span>{t.evResultXfer}</span>
            <strong>{load === "ok" ? (card?.transfers ?? t.notRecorded) : "…"}</strong>
          </li>
          <li>
            <span>{t.evResultSettle}</span>
            <strong>{load === "ok" ? (card?.settled ? t.settledYes : t.settledNo) : "…"}</strong>
          </li>
        </ul>
        <Link className="btn" href={`/evidence/${LIVE_RUN}`}>
          {t.ctaEvidence}
        </Link>
        <p className="muted small">{t.runProofP}</p>
        <p>
          <Link href="/lab">{t.labHomeLink} →</Link>
        </p>
      </section>
    </>
  );
}
