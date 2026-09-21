"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Footer } from "@/components/Footer";

export function Chrome({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="shell">
      <nav className="nav">
        <Link className="brand" href="/">
          Commit
        </Link>
        <div className="nav-mid">
          <a href="/#how-it-works">{t.navHow}</a>
          <a href="/#providers">{t.navProviders}</a>
          <Link href="/docs#repro">{t.navCode}</Link>
        </div>
        <div className="nav-right">
          <div className="lang" role="group" aria-label="Language">
            <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
              {t.langEn}
            </button>
            <button type="button" className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")}>
              {t.langZh}
            </button>
          </div>
          <Link className="btn nav-cta" href="/agent">
            {t.ctaDemo}
          </Link>
        </div>
      </nav>
      {children}
      <Footer />
    </div>
  );
}
