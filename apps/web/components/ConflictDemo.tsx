"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const phases = ["idle", "aOk", "bFail", "done"] as const;

export function ConflictDemo() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || step >= phases.length - 1) {
      if (step >= phases.length - 1) setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), step === 0 ? 700 : 1200);
    return () => window.clearTimeout(timer);
  }, [running, step]);

  function run() {
    setStep(0);
    setRunning(true);
  }

  return (
    <section className="sandbox conflict">
      <div className="sandbox-copy">
        <div className="tag">{t.cfTag}</div>
        <h2>{t.cfTitle}</h2>
        <p>{t.cfBody}</p>
        <button className="btn" onClick={run} disabled={running}>
          {running ? t.cfRunning : t.cfRun}
        </button>
        <small>{t.cfNoWallet}</small>
      </div>
      <div className="ticket sandbox-ticket" aria-live="polite">
        <div className="ticket-head">
          <i className="ticket-dot" /> {t.cfTicket}
        </div>
        <div className="sim-metrics">
          <span>
            {t.cfWindow}
            <strong>15:00–15:10 UTC</strong>
          </span>
          <span>
            {t.cfPool}
            <strong>{step >= 1 ? "1/1 held" : "0/1 free"}</strong>
          </span>
          <span>
            {t.cfResult}
            <strong>{step >= 2 ? "NO_CAPACITY" : "—"}</strong>
          </span>
        </div>
        <ol className="timeline">
          <li className={step >= 0 ? "ok" : "idle"}>
            <i />
            <div className="tl-label">{t.cfStepQuote}</div>
          </li>
          <li className={step >= 1 ? "ok" : "idle"}>
            <i />
            <div className="tl-label">
              {t.cfStepA}
              {step >= 1 && <span className="tl-status mono">held</span>}
            </div>
          </li>
          <li className={step >= 2 ? "bad" : "idle"}>
            <i />
            <div>
              <div className="tl-label">
                {t.cfStepB}
                {step >= 2 && <span className="tl-status mono">409</span>}
              </div>
              {step >= 2 && <div className="tl-meta mono">{t.cfStepBMeta}</div>}
            </div>
          </li>
          <li className={step >= 3 ? "ok" : "idle"}>
            <i />
            <div className="tl-label">{t.cfStepWhy}</div>
          </li>
        </ol>
      </div>
    </section>
  );
}
