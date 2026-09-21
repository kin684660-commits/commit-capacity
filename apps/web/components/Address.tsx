"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function Address({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const short = value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

  async function copyAddress() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="address-copy mono" onClick={copyAddress} title={`${t.copyAddress}: ${value}`}>
      <span className="address-full">{value}</span>
      <span className="address-short">{short}</span>
      <small>{copied ? t.copied : t.copy}</small>
    </button>
  );
}
