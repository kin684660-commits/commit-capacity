"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function StatusChip() {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ok" | "down">("loading");
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function ping() {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = (await r.json()) as { ok?: boolean; chainId?: number };
        if (!alive) return;
        setState(r.ok && j.ok ? "ok" : "down");
        setChainId(typeof j.chainId === "number" ? j.chainId : null);
      } catch {
        if (alive) setState("down");
      }
    }
    ping();
    const id = setInterval(ping, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <span className={`chip ${state}`} title="GET /api/health">
      <i />
      {state === "down" ? t.apiDown : t.apiOk}
      {chainId ? ` · ${t.chain} ${chainId}` : ""}
    </span>
  );
}
