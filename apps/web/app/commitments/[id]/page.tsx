"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { LatestDemo } from "../../LatestDemo";
import { useI18n } from "@/lib/i18n";
import { explorerTx } from "@/lib/links";
import { Address } from "@/components/Address";

type View = {
  id: string;
  owner: string;
  status: string;
  uiStatus: string;
  remaining: number;
  liveUsed: number;
  route: string;
  listed: boolean;
  window: { start: number; end: number };
  requests: { id: string; status: string; client_request_id: string }[];
  chain: Record<string, unknown>;
};

export default function CommitmentPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("EIP-712");
  const [error, setError] = useState("");
  const [buyer, setBuyer] = useState("");
  const [listingId, setListingId] = useState("");

  async function refresh() {
    const v = await api<View>(`/api/commitments/${params.id}`);
    setView(v);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [params.id]);

  async function execute() {
    setError("");
    try {
      await api(`/api/commitments/${params.id}/execute`, {
        method: "POST",
        body: JSON.stringify({ query, clientRequestId: crypto.randomUUID() }),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function closeIt() {
    setError("");
    try {
      await api(`/api/commitments/${params.id}/prepare-close`, { method: "POST" });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function listIt() {
    setError("");
    try {
      const out = await api<{ listingId: string }>(`/api/commitments/${params.id}/prepare-list`, {
        method: "POST",
        body: JSON.stringify({ buyer }),
      });
      setListingId(out.listingId);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!view) {
    return (
      <main>
        <p>{error || t.loadingCommitment}</p>
        {error && (
          <>
            <p className="muted">{t.missingCommitment}</p>
            <LatestDemo />
          </>
        )}
      </main>
    );
  }
  return (
    <main>
      <div className="tag">{view.uiStatus}</div>
      <h1 className="mono">{view.id}</h1>
      <div className="stats cm-stats">
        <div>
          <span>{t.cmOwner}</span>
          <strong><Address value={view.owner} /></strong>
        </div>
        <div>
          <span>{t.cmRemaining}</span>
          <strong>{view.remaining}</strong>
        </div>
        <div>
          <span>{t.cmUsed}</span>
          <strong>{view.liveUsed}</strong>
        </div>
        <div>
          <span>{t.cmRoute}</span>
          <strong>{view.route}</strong>
        </div>
      </div>
      {view.chain.pending ? (
        <p className="muted">{String(view.chain.note || t.cmChainPending)}</p>
      ) : (
        <>
          <p className="mono small">
            chain #{String(view.chain.commitmentId)} · escrow {String(view.chain.escrow)} ·{" "}
            <a href={explorerTx(String(view.chain.createTx))} target="_blank" rel="noreferrer">
              {t.cmOpenExplorer}
            </a>
          </p>
          {view.chain.claimable && typeof view.chain.claimable === "object" ? (
            <div className="panel econ-proof" style={{ marginTop: 16 }}>
              <h3>{t.cmEconT}</h3>
              <div className="stats cm-stats">
                <div>
                  <span>{t.evEconBuyer}</span>
                  <strong>
                    {(Number((view.chain.claimable as { owner?: string }).owner || 0) / 1e6).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>{t.evEconPrimary}</span>
                  <strong>
                    {(Number((view.chain.claimable as { primary?: string }).primary || 0) / 1e6).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>{t.evEconBackup}</span>
                  <strong>
                    {(Number((view.chain.claimable as { backup?: string }).backup || 0) / 1e6).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>{t.evEconBreach}</span>
                  <strong>
                    P{String(view.chain.breachPrimary ?? "—")}/B{String(view.chain.breachBackup ?? "—")}
                  </strong>
                </div>
              </div>
              <p className="muted small">{t.evEconNote}</p>
            </div>
          ) : null}
        </>
      )}
      <div className="card" style={{ marginTop: 24 }}>
        <h3>{t.cmExec}</h3>
        <label>{t.cmQuery}</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="row">
          <button className="btn" onClick={execute} disabled={view.listed}>
            {t.cmRun}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t.cmReq}</th>
              <th>{t.cmStatus}</th>
            </tr>
          </thead>
          <tbody>
            {view.requests.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>{t.cmTransferT}</h3>
        <p>{t.cmTransferP}</p>
        <label>{t.cmBuyer}</label>
        <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="0x…" />
        <div className="row">
          <button className="btn ghost" onClick={listIt}>
            {t.cmFreeze}
          </button>
          {listingId && (
            <Link className="btn" href={`/transfers/${listingId}`}>
              {t.cmOpenListing}
            </Link>
          )}
          <button className="btn ghost" onClick={closeIt} disabled={view.status === "settled" || view.status === "closed"}>
            {t.cmClose}
          </button>
        </div>
      </div>
      {error && <p className="err">{error}</p>}
      {!view.chain.pending && (
        <details className="raw-details">
          <summary>{t.tlRaw}</summary>
          <pre className="card mono">{JSON.stringify(view.chain, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
