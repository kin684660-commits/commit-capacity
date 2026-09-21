"use client";

import { useI18n } from "@/lib/i18n";

export function Providers() {
  const { t } = useI18n();
  return (
    <section className="providers">
      <h2 className="section-title">{t.providersTitle}</h2>
      <div className="prov-grid">
        <article className="prov">
          <div className="prov-top">
            <span className="prov-role primary">{t.provPrimary}</span>
            <span className="prov-bond mono">
              {t.provBond} 0.10 tCOM
            </span>
          </div>
          <h3>SearchNode</h3>
          <p>{t.provRole1}</p>
          <div className="prov-bar">
            <i style={{ width: "100%" }} />
          </div>
          <small className="mono">timeout 8000 ms · penalty 0.02 tCOM</small>
        </article>
        <article className="prov">
          <div className="prov-top">
            <span className="prov-role backup">{t.provBackup}</span>
            <span className="prov-bond mono">
              {t.provBond} 0.10 tCOM
            </span>
          </div>
          <h3>Nova</h3>
          <p>{t.provRole2}</p>
          <div className="prov-bar">
            <i style={{ width: "50%" }} />
          </div>
          <small className="mono">1 takeover / attempt · no silent retry</small>
        </article>
      </div>
      <p className="fine" style={{ marginTop: 14 }}>
        {t.provDisclosure}
      </p>
    </section>
  );
}
