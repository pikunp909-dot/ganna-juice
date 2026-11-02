import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_LANG, SUPPORTED_LANGS, translate } from "./locales";

const LanguageCtx = createContext(null);
const KEY = "ganna_lang";

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    } catch {
      /* storage unavailable — fall through to default */
    }
    // first visit — match the device language when it is Hindi or Odia
    if (typeof navigator !== "undefined" && navigator.language) {
      const deviceLang = navigator.language.toLowerCase();
      if (deviceLang.startsWith("hi")) return "hi";
      if (deviceLang.startsWith("or")) return "or";
    }
    return DEFAULT_LANG;
  });

  // persist on every change, and sync the document lang for font fallbacks
  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage full/unavailable — language still works in memory */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key) => translate(lang, key), [lang]);

  return <LanguageCtx.Provider value={{ lang, setLang, t }}>{children}</LanguageCtx.Provider>;
}

export const useLanguage = () => useContext(LanguageCtx);
