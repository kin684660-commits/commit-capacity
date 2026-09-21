"use client";

import { useI18n } from "@/lib/i18n";

export function Compare() {
  const { t } = useI18n();
  const rows: [string, string, string][] = [
    [t.cmp1k, t.cmp1a, t.cmp1b],
    [t.cmp2k, t.cmp2a, t.cmp2b],
    [t.cmp3k, t.cmp3a, t.cmp3b],
    [t.cmp4k, t.cmp4a, t.cmp4b],
    [t.cmp5k, t.cmp5a, t.cmp5b],
  ];
  return (
    <section className="compare">
      <h2 className="section-title">{t.compareTitle}</h2>
      <div className="compare-table" role="table">
        <div className="compare-row head" role="row">
          <div role="columnheader" />
          <div role="columnheader">{t.compareSpot}</div>
          <div role="columnheader" className="hi">
            {t.compareCommit}
          </div>
        </div>
        {rows.map(([k, a, b]) => (
          <div className="compare-row" role="row" key={k}>
            <div role="rowheader" className="k">
              {k}
            </div>
            <div role="cell" className="a">
              {a}
            </div>
            <div role="cell" className="b">
              {b}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
