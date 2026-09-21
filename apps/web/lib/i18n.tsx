"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy, type Copy, type Lang } from "./copy";

const KEY = "commit_lang";
const I18nContext = createContext<{ lang: Lang; t: Copy; setLang: (l: Lang) => void }>({
  lang: "en",
  t: copy.en,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    const next = saved === "zh" || saved === "en" ? saved : "en";
    setLangState(next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    window.localStorage.setItem(KEY, next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }

  const value = useMemo(() => ({ lang, t: copy[lang] as Copy, setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
