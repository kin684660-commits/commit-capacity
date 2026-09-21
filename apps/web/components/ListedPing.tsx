"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Quote = { quoteId: string; quantity: number; reservationRequired?: boolean };

export function ListedPing() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  async function ping() {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const q = await api<Quote>("/api/capacity/quote", {
        method: "POST",
        body: JSON.stringify({ quantity: 1, serviceClass: "search", query: "okx x layer" }),
      });
      setOk(`${t.pingOk} · quoteId ${q.quoteId} · qty ${q.quantity}`);
    } catch (e) {
      setErr(`${t.pingFail}: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="listed-ping">
      <button className="btn ghost" type="button" disabled={busy} onClick={ping}>
        {busy ? t.pinging : t.pingListed}
      </button>
      {ok && <p className="ok mono">{ok}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}
