"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const phases = ["ready", "primary", "timeout", "backup", "settled"] as const;

export function Sandbox() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || step >= phases.length - 1) {
      if (step >= phases.length - 1) setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), step === 1 ? 2400 : 1100);
    return () => window.clearTimeout(timer);
  }, [running, step]);

  function run() {
    setStep(0);
    setRunning(true);
  }

  const rows = [
    [t.simQuote, step >= 0, "ok"],
    [t.simPrimary, step >= 1, step >= 2 ? "warn" : "ok"],
    [t.simTimeout, step >= 2, "warn"],
    [t.simBackup.replace("{n}", "18"), step >= 3, "ok"],
    [t.simSettle, step >= 4, "ok"],
  ] as const;

  return (
    <section className="sandbox">
      <div className="sandbox-copy">
        <div className="tag">{t.simTag}</div>
        <h2>{t.simTitle}</h2>
        <p>{t.simBody}</p>
        <button className="btn" onClick={run} disabled={running}>
          {running ? t.simRunning : t.simRun}
        </button>
        <small>
          {t.simNoWallet} · {t.simIllustrated}
        </small>
      </div>
      <div className="ticket sandbox-ticket" aria-live="polite">
        <div className="ticket-head"><i className="ticket-dot" /> {t.simTicket}</div>
        <div className="sim-metrics">
          <span>{t.evRemain}<strong>{step >= 3 ? "19" : "20"}</strong></span>
          <span>{t.simRoute}<strong>{step >= 3 ? "NOVA" : "SEARCHNODE"}</strong></span>
          <span>{t.simPenalty}<strong>{step >= 4 ? "+0.02" : "—"}</strong></span>
        </div>
        <ol className="timeline">
          {rows.map(([label, active, tone]) => (
            <li key={label} className={active ? tone : "idle"}><i /><div className="tl-label">{label}</div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
