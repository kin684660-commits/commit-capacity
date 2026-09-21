"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ConflictDemo } from "@/components/ConflictDemo";

type Race = {
  window?: { start: string; end: string };
  agentA?: { alreadyHeld?: boolean; reservationId?: string; quoteId?: string };
  agentB?: { code?: string; message?: string; http?: number; unexpected?: string };
  oversellRejected?: boolean;
  executeGatedByReservation?: boolean;
  heldWindows?: number;
  note?: string;
};

export default function LabPage() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [race, setRace] = useState<Race | null>(null);
  const [searchErr, setSearchErr] = useState("");
  const [error, setError] = useState("");

  async function runRace() {
    setError("");
    setBusy(true);
    try {
      setRace(await api<Race>("/api/lab/capacity-race", { method: "POST", body: "{}" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function tryOpenSearch() {
    setSearchErr("");
    try {
      await api("/api/search", { method: "POST", body: JSON.stringify({ query: "open queue" }) });
      setSearchErr("unexpected success");
    } catch (e) {
      setSearchErr((e as Error).message);
    }
  }

  return (
    <main>
      <div className="tag">{t.labTag}</div>
      <h1>{t.labH1}</h1>
      <p className="lede">{t.labLede}</p>

      <section>
        <h3>{t.labDiagramT}</h3>
        <ConflictDemo />
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h3>{t.labApiT}</h3>
        <div className="row">
          <button className="btn" disabled={busy} onClick={runRace}>
            {busy ? t.labRunning : t.labRun}
          </button>
          <button className="btn ghost" onClick={tryOpenSearch}>
            {t.labExec}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
        {searchErr && <p className="mono small">{searchErr}</p>}
        {race && (
          <dl className="lab-dl">
            <div>
              <dt>{t.labWindow}</dt>
              <dd className="mono">
                {race.window?.start} → {race.window?.end}
              </dd>
            </div>
            <div>
              <dt>{t.labA}</dt>
              <dd className="mono">
                {race.agentA?.alreadyHeld ? "window already held" : race.agentA?.reservationId || race.agentA?.quoteId}
              </dd>
            </div>
            <div>
              <dt>{t.labB}</dt>
              <dd className="mono">{race.agentB?.code || race.agentB?.unexpected || t.notRecorded}</dd>
            </div>
            <div>
              <dt>{t.labOversell}</dt>
              <dd className={race.oversellRejected ? "ok" : "err"}>
                {race.oversellRejected ? "rejected · NO_CAPACITY" : "not rejected"}
              </dd>
            </div>
            <div>
              <dt>execute</dt>
              <dd>reservation required · seats 1 · held windows {race.heldWindows}</dd>
            </div>
          </dl>
        )}
        <p className="muted small">{t.labNote}</p>
      </section>
    </main>
  );
}
