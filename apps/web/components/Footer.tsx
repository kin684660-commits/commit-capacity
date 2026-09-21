"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ASP_ID, DEMO_VIDEO, LIVE_RUN, REGISTRY, SERVICE_ID, SOURCE_REPO, TOKEN, explorerAddress, sourcify } from "@/lib/links";

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="foot">
      <div className="foot-bar">
        <Link className="brand" href="/">
          Commit
        </Link>
        <p className="foot-tech">{t.footTech}</p>
        <p className="foot-links">
          <Link href={`/evidence/${LIVE_RUN}`}>{t.navEvidence}</Link>
          <Link href="/docs">{t.navDocs}</Link>
          <Link href="/adapter">{t.adapterNav}</Link>
          <Link href="/docs#repro">{t.navCode}</Link>
          {SOURCE_REPO ? (
            <a href={SOURCE_REPO} target="_blank" rel="noreferrer">
              {t.docsSourceT}
            </a>
          ) : (
            <span>{t.docsSourcePending}</span>
          )}
          {DEMO_VIDEO ? (
            <a href={DEMO_VIDEO} target="_blank" rel="noreferrer">
              {t.docsVideoT}
            </a>
          ) : (
            <span>{t.footVideo}</span>
          )}
        </p>
      </div>
      <p className="foot-line">{t.footLine}</p>
      <details className="foot-tech-details">
        <summary>{t.footContracts}</summary>
        <div className="foot-row">
          <span>{t.footToken}</span>
          <code title={TOKEN}>{short(TOKEN)}</code>
          <a href={explorerAddress(TOKEN)} target="_blank" rel="noreferrer">
            {t.footExplorer}
          </a>
          <a href={sourcify(TOKEN)} target="_blank" rel="noreferrer">
            {t.footSourcify}
          </a>
        </div>
        <div className="foot-row">
          <span>{t.footRegistry}</span>
          <code title={REGISTRY}>{short(REGISTRY)}</code>
          <a href={explorerAddress(REGISTRY)} target="_blank" rel="noreferrer">
            {t.footExplorer}
          </a>
          <a href={sourcify(REGISTRY)} target="_blank" rel="noreferrer">
            {t.footSourcify}
          </a>
        </div>
        <div className="foot-row">
          <span>
            ASP #{ASP_ID} · {SERVICE_ID}
          </span>
        </div>
      </details>
    </footer>
  );
}
