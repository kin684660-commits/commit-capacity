"use client";

import { useI18n } from "@/lib/i18n";

export function Ticket() {
  const { t } = useI18n();
  const rows: [string, string][] = [
    [t.ticketWindow, t.ticketWindowV],
    [t.ticketQty, t.ticketQtyV],
    [t.ticketSla, t.ticketSlaV],
    [t.ticketBond, t.ticketBondV],
  ];
  return (
    <aside className="ticket" aria-label={t.ticketTitle}>
      <div className="ticket-head">
        <span className="ticket-dot" />
        {t.ticketTitle}
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="ticket-foot mono">{t.ticketFoot}</div>
    </aside>
  );
}
