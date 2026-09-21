"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createWalletClient, custom } from "viem";
import { useI18n } from "@/lib/i18n";

type Quote = {
  quoteId: string;
  quantity: number;
  window: { start: string; end: string };
  amounts: Record<string, string>;
  termsHash: string;
  providers: { primary: string; backup: string };
  sla: { attemptTimeoutMs: number; maxAttempts: number };
  reservationRequired: boolean;
  expiresAt?: string;
};

async function siweLogin() {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } })
    .ethereum;
  if (!eth) throw new Error("No injected wallet. Connect a browser wallet to reserve on this host.");
  const [address] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const nonce = await api<{ nonce: string; chainId?: number }>("/api/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 3600_000).toISOString();
  const domain = window.location.host;
  const uri = window.location.origin;
  const chainId = nonce.chainId || 1952;
  const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nCommit reservation login.\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce.nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expirationTime}`;
  const client = createWalletClient({ transport: custom(eth) });
  const signature = await client.signMessage({ account: address as `0x${string}`, message });
  return api("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature }) });
}

async function demoLogin() {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(generatePrivateKey());
  return api("/api/auth/dev-session", { method: "POST", body: JSON.stringify({ address: account.address }) });
}

export default function ReservePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [quantity, setQuantity] = useState(20);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [localHardhat, setLocalHardhat] = useState(false);

  useEffect(() => {
    api<{ localHardhat?: boolean }>("/api/config")
      .then((c) => setLocalHardhat(!!c.localHardhat))
      .catch(() => setLocalHardhat(false));
  }, []);

  async function requestQuote() {
    setError("");
    setBusy("quote");
    try {
      const q = await api<Quote>("/api/capacity/quote", {
        method: "POST",
        body: JSON.stringify({ quantity, serviceClass: "search", query: "okx x layer" }),
      });
      setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function reserve(mode: "wallet" | "demo") {
    if (!quote) return;
    setError("");
    setBusy("reserve");
    try {
      if (mode === "wallet") await siweLogin();
      else await demoLogin();
      const r = await api<{ reservationId: string }>("/api/reservations", {
        method: "POST",
        body: JSON.stringify({ quoteId: quote.quoteId }),
      });
      try {
        await api(`/api/commitments/${r.reservationId}/onchain-create`, { method: "POST" });
      } catch {
        /* occupancy is held even if chain create is skipped */
      }
      router.push(`/commitments/${r.reservationId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main>
      <div className="tag">{t.reserveTag}</div>
      <h1>{t.reserveH1}</h1>
      <p className="lede">{t.reserveLede}</p>
      <section className="listed compact">
        <div className="listed-kicker">{t.listedKicker}</div>
        <h2>{t.listedTitle}</h2>
        <p className="listed-asp">{t.listedAsp} · {t.listedFee} · {t.listedStatus}</p>
        <p className="muted small">{t.docsAssetNote}</p>
        <p className="muted small">{t.docsAttemptNote}</p>
      </section>
      <div className="panel">
        <label>{t.serviceClass}</label>
        <input value="search" readOnly />
        <label>{t.quantity}</label>
        <input type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        <p className="muted small">{t.reserveWindowNote}</p>
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={requestQuote}>
            {busy === "quote" ? t.quoting : t.getQuote}
          </button>
        </div>
        {quote && (
          <div>
            <p>
              {t.window} {quote.window.start} → {quote.window.end} · {t.reserveTz}
            </p>
            <p>
              {quote.providers.primary} / {quote.providers.backup} · timeout {quote.sla.attemptTimeoutMs}ms
            </p>
            <p className="mono">
              {t.reserveFees} {Number(quote.amounts.buyerTotal) / 1e6} tCOM
              {quote.amounts.primaryReservationFee && quote.amounts.backupReservationFee
                ? ` · fees ${(Number(quote.amounts.primaryReservationFee) + Number(quote.amounts.backupReservationFee)) / 1e6}`
                : ""}
              {" · "}
              {t.reserveExpiry} {quote.expiresAt || "60s"}
            </p>
            <p className="muted small">{t.reserveAttempt}</p>
            <p className="mono">quoteId {quote.quoteId}</p>
            <p className="mono">terms {quote.termsHash.slice(0, 18)}…</p>
            <p>{t.next}</p>
            <p className="muted small">{t.reserveApprove}</p>
            <div className="row">
              <button className="btn" disabled={!!busy} onClick={() => reserve("wallet")}>
                {t.signReserve}
              </button>
              {localHardhat && (
                <button className="btn ghost" disabled={!!busy} onClick={() => reserve("demo")}>
                  {t.localDemo}
                </button>
              )}
            </div>
          </div>
        )}
        {error && <p className="err">{error}</p>}
      </div>
    </main>
  );
}
