"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Address } from "@/components/Address";

type Listing = {
  listingId: string;
  reservationId: string;
  designatedBuyer: string;
  owner: string;
  remaining: number;
  liveUsed: number;
  price: string;
  status: string;
};

export default function TransferPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    api<Listing>(`/api/listings/${params.id}`)
      .then(setListing)
      .catch((e) => setError((e as Error).message));
  }, [params.id]);

  async function buy() {
    setError("");
    try {
      const out = await api<{ reservationId: string }>(`/api/listings/${params.id}/buy`, { method: "POST" });
      setDone(out.reservationId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!listing) return <p>{error || t.trLoading}</p>;
  return (
    <main>
      <div className="tag">{t.trTag}</div>
      <h1>{t.trH1}</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        <p>{t.trP}</p>
        <table>
          <tbody>
            <tr>
              <th>{t.trSeller}</th>
              <td><Address value={listing.owner} /></td>
            </tr>
            <tr>
              <th>{t.trBuyer}</th>
              <td><Address value={listing.designatedBuyer} /></td>
            </tr>
            <tr>
              <th>{t.trRemaining}</th>
              <td>
                {listing.remaining} {t.cmRemaining} / {listing.liveUsed} {t.cmUsed}
              </td>
            </tr>
            <tr>
              <th>{t.trPrice}</th>
              <td className="mono">{listing.price} tCOM (6 dp)</td>
            </tr>
            <tr>
              <th>{t.trStatus}</th>
              <td>{listing.status}</td>
            </tr>
          </tbody>
        </table>
        <div className="row">
          <button className="btn" onClick={buy} disabled={listing.status !== "open"}>
            {t.trBuy}
          </button>
          <Link className="btn ghost" href={`/commitments/${listing.reservationId}`}>
            {t.trView}
          </Link>
        </div>
        {done && <p className="ok">{t.trDone}</p>}
        {error && <p className="err">{error}</p>}
      </div>
    </main>
  );
}
