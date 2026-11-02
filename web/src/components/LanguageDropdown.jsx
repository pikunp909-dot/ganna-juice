import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../language";

const OPTIONS = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिंदी", short: "HI" },
  { code: "or", label: "ଓଡ଼ିଆ", short: "OD" }
];

export default function LanguageDropdown() {
  const { lang, setLang } = useLanguage() ?? { lang: "en", setLang: () => {} };
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const current = OPTIONS.find((o) => o.code === lang) || OPTIONS[0];

  return (
    <div ref={ref} className="relative ml-2 flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
        aria-expanded={open}
        className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden whitespace-nowrap"
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
        <span className="relative text-sm leading-none">🌐</span>
        <span className="relative tracking-wide">{current.short}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-forest2/95 backdrop-blur-xl shadow-glass overflow-hidden z-50"
          >
            {OPTIONS.map((opt) => {
              const active = opt.code === lang;
              return (
                <button
                  key={opt.code}
                  onClick={() => {
                    setLang(opt.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition ${
                    active ? "text-gold bg-gold/10" : "text-cream hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted">{opt.short}</span>
                  </span>
                  {active && <span className="text-gold">✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
