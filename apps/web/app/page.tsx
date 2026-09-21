"use client";

import Link from "next/link";
import { HomeRecord } from "@/components/HomeRecord";
import { ProviderReport } from "@/components/ProviderReport";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  return (
    <main className="home-editorial">
      <section className="hero hero-editorial">
        <div>
          <p className="kicker-plain">{t.kickerAsp}</p>
          <h1>{t.h1}</h1>
          <p className="lede">{t.lede}</p>
          <p className="asp-expand">{t.aspExpand}</p>
          <div className="row">
            <Link className="btn" href="/agent">
              {t.ctaViewRun}
            </Link>
            <Link className="btn ghost" href="/reserve">
              {t.ctaReserve}
            </Link>
          </div>
          <p className="hero-fine">{t.heroFine}</p>
        </div>
        <img
          src="/images/commit/07-hero-archive-box.jpg"
          alt=""
          width={1536}
          height={1024}
          className="heroIllustration"
          fetchPriority="high"
        />
      </section>

      <section className="problem-editorial" id="why">
        <h2>{t.problemT}</h2>
        <p className="lede how-lede">{t.problemP}</p>
        <div className="problem-cols">
          <article>
            <strong>{t.buyerColT}</strong>
            <span>{t.buyerColP}</span>
          </article>
          <article>
            <strong>{t.provColT}</strong>
            <span>{t.provColP}</span>
          </article>
        </div>
      </section>

      <section className="how-editorial" id="how-it-works">
        <h2>{t.howScene}</h2>
        <p className="lede how-lede">{t.howSub}</p>
        <ol className="how-cols">
          <li className="how-has-arrow">
            <span className="how-n">01</span>
            <strong>{t.step1t}</strong>
            <div className="how-fig">
              <img src="/images/commit/04-step-reserve.jpg" alt="" width={1536} height={1024} loading="lazy" />
            </div>
            <span>{t.step1}</span>
          </li>
          <li className="how-has-arrow">
            <span className="how-n">02</span>
            <strong>{t.step2t}</strong>
            <div className="how-fig">
              <img src="/images/commit/05-step-execute.jpg" alt="" width={1536} height={1024} loading="lazy" />
            </div>
            <span>{t.step2}</span>
          </li>
          <li>
            <span className="how-n">03</span>
            <strong>{t.step3t}</strong>
            <div className="how-fig">
              <img src="/images/commit/06-step-review.jpg" alt="" width={1536} height={1024} loading="lazy" />
            </div>
            <span>{t.step3}</span>
          </li>
        </ol>
      </section>

      <HomeRecord />
      <ProviderReport />

      <section className="eco-editorial">
        <h2>{t.ecoT}</h2>
        <ol className="eco-flow">
          <li>{t.ecoOkx}</li>
          <li>{t.ecoCommit}</li>
          <li>{t.ecoAsp}</li>
        </ol>
        <p>{t.ecoXlayer}</p>
        <p className="muted small">{t.ecoVerifier}</p>
      </section>
    </main>
  );
}
