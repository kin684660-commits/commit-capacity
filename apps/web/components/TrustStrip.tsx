"use client";

import { useI18n } from "@/lib/i18n";
import { REGISTRY, TOKEN, sourcify } from "@/lib/links";

export function TrustStrip() {
  const { t } = useI18n();
  return (
    <ul className="trust" aria-label="Trust">
      <li>
        <a href={sourcify(TOKEN)} target="_blank" rel="noreferrer">
          <b>✓</b> {t.trustVerifiedToken} <small>{t.trustSourcify}</small>
        </a>
      </li>
      <li>
        <a href={sourcify(REGISTRY)} target="_blank" rel="noreferrer">
          <b>✓</b> {t.trustVerifiedRegistry} <small>{t.trustSourcify}</small>
        </a>
      </li>
      <li>
        <span>
          <b>●</b> {t.trustListed}
        </span>
      </li>
      <li>
        <span>
          <b>⬡</b> {t.trustChain}
        </span>
      </li>
    </ul>
  );
}
