import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../cart";
import { useLanguage } from "../language";
import Checkout from "../components/Checkout";
import { EmptyState, Spinner } from "../components/ui";
import { SugarcaneStick, SugarcaneLeaf } from "../components/sugarcane";
import LanguageDropdown from "../components/LanguageDropdown";

const MIN_ORDER_VALUE = 150;

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const FALLBACK_SETTINGS = {
  phone: "",
  whatsapp: "",
  instagram: "",
  telegram: "",
  locationUrl: "",
  pincode: "",
  exactLocation: "",
  upiId: "",
  openTime: "09:00",
  closeTime: "21:00"
};

/* default hero image — kept as the verified fallback; Unsplash sugarcane-field
   search was not verifiable at build time (owner can override via Settings) */
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=1600&q=80";

const waLink = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
};

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const formatHour12 = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return hhmm || "";
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m ?? 0).padStart(2, "0")} ${period}`;
};

// Converts a base64url VAPID key (from the API) into the Uint8Array
// that pushManager.subscribe expects.
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default function Home() {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [note, setNote] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const { lines, count, total, setQty, remove, clear } = useCart();
  const { t } = useLanguage();

  const ownerName = settings.ownerName || "Kunal";

  // Shop-hours gate — re-evaluated every minute so the badge stays honest.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);
  const nowHM =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
  const openTime = settings.openTime || "09:00";
  const closeTime = settings.closeTime || "21:00";
  const isOpen = nowHM >= openTime && nowHM <= closeTime;

  useEffect(() => {
    (async () => {
      try {
        const [{ items }, { settings }] = await Promise.all([
          api.menu(),
          api.publicSettings()
        ]);
        setItems((items || []).filter((i) => i.isAvailable));
        setSettings({ ...FALLBACK_SETTINGS, ...(settings || {}) });
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Visitor counter — one hit per browser per day (localStorage dedupe),
  // never blocking the page render. Failures are swallowed silently.
  useEffect(() => {
    const KEY = "ganna_last_visit_date";
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(KEY) === today) return;
      localStorage.setItem(KEY, today);
      api.trackVisit().catch(() => {});
    } catch {
      /* storage unavailable — skip tracking */
    }
  }, []);

  // First-visit welcome modal — shows once per browser (localStorage gate).
  // Never blocks page render; failures just skip the modal.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem("ganna_welcomed") !== null) return;
      } catch {
        /* storage unavailable — show anyway */
      }
      setWelcomeOpen(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  function closeWelcome() {
    try {
      localStorage.setItem("ganna_welcomed", "true");
    } catch {
      /* storage unavailable — still close */
    }
    setWelcomeOpen(false);
  }

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 2600);
    return () => clearTimeout(t);
  }, [note]);

  return (
    <div className="min-h-screen bg-forest text-cream relative">
      {/* global film grain */}
      <div className="noise fixed inset-0 z-[5] pointer-events-none opacity-[0.05] mix-blend-overlay" />

      <Nav
        onMenu={() => scrollTo("menu")}
        onContact={() => scrollTo("contact")}
        isOpen={isOpen}
        openTime={openTime}
        closeTime={closeTime}
      />

      <Hero heroImageUrl={settings.heroImageUrl} />
      <TrustBadges />
      <MenuSection
        items={items}
        loading={loading}
        error={error}
        onRetry={() => window.location.reload()}
        isOpen={isOpen}
        openTime={openTime}
        closeTime={closeTime}
      />
      <TrackOrder />
      <ReviewsSection exactLocation={settings.exactLocation} />
      <ReferSection />
      <Footer settings={settings} />

      {/* first-visit welcome modal */}
      <AnimatePresence>
        {welcomeOpen && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeWelcome} />
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-forest2/90 backdrop-blur-xl shadow-card"
            >
              {/* gold glow orbs + corner sheen */}
              <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gold/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 w-52 h-52 rounded-full bg-mint/10 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.05),transparent_50%)]" />

              <div className="relative p-7 sm:p-9 text-center">
                <motion.div
                  className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-gold/15 border border-gold/40 grid place-items-center text-4xl shadow-glowGoldSoft"
                  animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  👋
                </motion.div>

                <h3 className="font-display text-2xl sm:text-3xl text-cream leading-tight">
                  {t("welcomeTitle").replace("{name}", ownerName)}
                </h3>
                <p className="mt-3 text-muted text-sm sm:text-base leading-relaxed">
                  {t("welcomeSub").replace("{name}", ownerName)}
                </p>

                <button
                  onClick={closeWelcome}
                  className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-full px-7 py-4 text-base shadow-glowGold hover:brightness-110 active:scale-[0.97] transition"
                >
                  🍹 {t("welcomeBtn")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating whatsapp — hidden while the cart bar is up */}
      {count === 0 && settings.whatsapp && (
        <a
          href={waLink(settings.whatsapp)}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gold-metal text-forest grid place-items-center text-2xl shadow-glowGold border border-white/20 hover:brightness-110 transition"
        >
          💬
        </a>
      )}

      {/* floating cart bar */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full max-w-md flex items-center justify-between gap-3 bg-gold-metal text-forest rounded-2xl shadow-glowGold px-5 py-4 font-bold hover:brightness-110 transition"
            >
              <span className="flex items-center gap-3">
                <span className="w-7 h-7 grid place-items-center rounded-full bg-forest text-gold text-sm shadow-inner">
                  {count}
                </span>
                <span>{t("viewCart")}</span>
              </span>
              <span className="font-display text-lg">{inr(total)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* cart drawer */}
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lines={lines}
        total={total}
        setQty={setQty}
        remove={remove}
        isOpen={isOpen}
        openTime={openTime}
        closeTime={closeTime}
        onCheckout={() => {
          setDrawerOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* checkout modal */}
      <Checkout
        open={checkoutOpen}
        lines={lines}
        total={total}
        settings={settings}
        clear={clear}
        onClose={() => setCheckoutOpen(false)}
      />

      {/* toast */}
      <AnimatePresence>
        {note && (
          <motion.div
            className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <span className="glass-card text-cream text-sm font-semibold px-5 py-3 rounded-2xl shadow-glass">
              {note}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= Letter-by-letter reveal ================= */

const glyph = {
  hidden: { opacity: 0, y: 34, filter: "blur(10px)" },
  show: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  })
};

function AnimatedWords({ text, className, start = 0, goldWords = [] }) {
  const { lang } = useLanguage();
  const isLatin = !lang || lang === "en";
  return (
    <span className={className}>
      {text.split(" ").map((word, wi) => {
        const wordDelay = start + wi * 0.035;
        // Indic scripts (hi/or): char-level split breaks ligatures & matras,
        // so fade whole words instead — shapes stay intact.
        if (!isLatin) {
          return (
            <motion.span
              key={wi}
              className={`inline-block whitespace-nowrap ${goldWords.includes(wi) ? "text-gold-metal" : ""}`}
              variants={glyph}
              initial="hidden"
              animate="show"
              custom={wordDelay}
            >
              {word}
              {"\u00A0"}
            </motion.span>
          );
        }
        return (
          <span key={wi} className="inline-block whitespace-nowrap">
            {word.split("").map((ch, ci) => (
              <motion.span
                key={ci}
                className={`inline-block ${goldWords.includes(wi) ? "text-gold-metal" : ""}`}
                variants={glyph}
                initial="hidden"
                animate="show"
                custom={wordDelay + ci * 0.03}
              >
                {ch}
              </motion.span>
            ))}
            {"\u00A0"}
          </span>
        );
      })}
    </span>
  );
}

/* ================= Nav ================= */

function Nav({ onMenu, onContact, isOpen, openTime, closeTime }) {
  const { t } = useLanguage();

  // Village-alert subscription state: idle | loading | on | denied
  const [subState, setSubState] = useState("idle");

  useEffect(() => {
    if (!("Notification" in window)) {
      setSubState("denied");
      return;
    }
    if (Notification.permission === "granted") setSubState("on");
  }, []);

  // PWA install prompt (beforeinstallprompt)
  const [installEvt, setInstallEvt] = useState(null);
  const [standalone, setStandalone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setInstallEvt(e);
    }
    function onInstalled() {
      setStandalone(true);
      setInstallEvt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvt) {
      alert("To install, open this site in Chrome/Safari and tap 'Add to Home Screen'.");
      return;
    }
    installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  async function enableAlerts() {
    if (!("Notification" in window)) return;
    setSubState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setSubState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get("/notifications/vapid");
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await api.post("/notifications/subscribe-customer", subscription.toJSON());
      setSubState("on");
    } catch {
      // Permission granted but subscription failed — keep the button visible.
      setSubState("idle");
    }
  }

  return (
    <header className="fixed top-0 inset-x-0 z-30 border-b border-white/5 bg-forest/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => scrollTo("top")} className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-gold-metal grid place-items-center text-lg shadow-glowGoldSoft">
            🍹
          </span>
          <span className="font-display text-xl text-cream hidden sm:inline">
            Sugarcane <span className="text-gold-metal">Juice</span>
          </span>
        </button>
        <nav className="flex items-center justify-end gap-1 sm:gap-1.5 ml-auto min-w-0 text-sm font-semibold text-muted">
          <button onClick={onMenu} className="hidden sm:inline-flex px-2.5 sm:px-3 py-2 rounded-full hover:text-cream hover:bg-white/5 transition whitespace-nowrap">
            {t("menuShort")}
          </button>
          <button onClick={onContact} className="hidden sm:inline-flex px-2.5 sm:px-3 py-2 rounded-full hover:text-cream hover:bg-white/5 transition whitespace-nowrap">
            {t("contact")}
          </button>

          {/* shop open/closed pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full border text-[11px] sm:text-xs font-bold shadow-glass whitespace-nowrap ${
              isOpen
                ? "border-mint/40 bg-mint/10 text-mint"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
            title={isOpen ? `${t("shopOpen")} ${formatHour12(openTime)} - ${formatHour12(closeTime)}` : t("shopClosed")}
          >
            <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-mint animate-pulse" : "bg-red-400"}`} />
            <span className="hidden sm:inline">
              {isOpen
                ? t("shopStatusOpen")
                    .replace("{open}", formatHour12(openTime))
                    .replace("{close}", formatHour12(closeTime))
                : t("shopStatusClosed")
                    .replace("{open}", formatHour12(openTime))
                    .replace("{close}", formatHour12(closeTime))}
            </span>
            <span className="sm:hidden">
              {isOpen ? t("shopStatusOpenShort") : t("shopStatusClosedShort")}
            </span>
          </span>

          {/* install app — glassmorphic */}
          {!standalone && (
            <button
              onClick={installApp}
              aria-label="Install app"
              className="relative inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden whitespace-nowrap"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
              <span className="relative text-sm leading-none">📲</span>
              <span className="relative tracking-wide hidden sm:inline">Install App</span>
            </button>
          )}

          {/* language dropdown — glassmorphic */}
          <LanguageDropdown />

          {/* village alerts — glassmorphic */}
          {(subState === "idle" || subState === "loading") && (
            <button
              onClick={enableAlerts}
              disabled={subState === "loading"}
              aria-label="Get village alerts"
              className="relative hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden disabled:opacity-60 disabled:pointer-events-none"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
              {subState === "loading" ? (
                <Spinner className="relative w-4 h-4" />
              ) : (
                <span className="relative text-sm leading-none">🔔</span>
              )}
              <span className="relative tracking-wide">
                {subState === "loading" ? "Enabling…" : "Get Alerts"}
              </span>
            </button>
          )}
          {subState === "on" && (
            <span
              className="relative hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold shadow-glass"
              title="Alerts enabled — we'll ping you when the stall moves"
            >
              <span className="relative text-sm leading-none">🔔</span>
              <span className="relative tracking-wide">Alerts On</span>
            </span>
          )}

        </nav>
      </div>
    </header>
  );
}

/* ================= Hero (cinematic) ================= */

function Hero({ heroImageUrl }) {
  const ref = useRef(null);
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const orbY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const ringY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -70]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0.15]);

  return (
    <section id="top" ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* layered ambient orbs with drift */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div style={{ y: orbY }} className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-gold/[0.15] blur-[130px] animate-orbDrift" />
        <motion.div style={{ y: orbY }} className="absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full bg-mint/10 blur-[130px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-forest3/50 blur-[90px]" />
      </div>

      {/* background image + cinematic vignette */}
      <img
        src={heroImageUrl || DEFAULT_HERO_IMAGE}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-forest/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,13,8,0.45)_60%,rgba(5,13,8,0.94)_100%)]" />

      {/* sugarcane decor — lightweight stroke SVGs, no blur */}
      <motion.div
        className="pointer-events-none absolute top-24 left-[6%] text-gold opacity-10"
        style={{ rotate: -18 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneStick className="w-20 h-80" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-16 right-[8%] text-mint opacity-10"
        style={{ rotate: 14 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneStick className="w-20 h-80" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute top-32 right-[18%] text-gold opacity-20"
        style={{ rotate: 24 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneLeaf className="w-32 h-20" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-24 left-[14%] text-mint opacity-15"
        style={{ rotate: -20 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6.5, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneLeaf className="w-28 h-18" />
      </motion.div>

      {/* rotating glass ring (parallax) */}
      <motion.div style={{ y: ringY }} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
        <div className="w-[600px] h-[600px] rounded-full border border-gold/20 animate-spinSlow relative shadow-[0_0_120px_-30px_rgba(245,158,11,0.25)]">
          <div className="absolute inset-8 rounded-full border border-dashed border-gold/10" />
          <span className="absolute -top-2 left-1/2 w-2.5 h-2.5 rounded-full bg-gold shadow-glowGoldSoft" />
          <span className="absolute bottom-10 right-16 w-1.5 h-1.5 rounded-full bg-gold/60" />
        </div>
      </motion.div>

      <motion.div style={{ y: textY, opacity: fade }} className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em] text-gold-metal mb-7 glass-card px-5 py-2 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Sugarcane Juice
        </motion.p>

        <h1 className="font-display font-semibold text-6xl sm:text-8xl leading-[0.95] tracking-tight">
          <AnimatedWords text={t("heroLine1")} className="block text-cream" start={0.3} />
          <AnimatedWords text={t("heroLine2")} className="block" start={0.75} goldWords={[1]} />
          <AnimatedWords text={t("heroLine3")} className="block text-gold-metal" start={1.2} />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="mt-7 text-muted max-w-xl mx-auto text-base sm:text-lg"
        >
          {t("heroSub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.8 }}
          className="mt-11 flex flex-wrap items-center justify-center gap-3.5"
        >
          <button
            onClick={() => scrollTo("menu")}
            className="inline-flex items-center gap-2 bg-gold-metal text-forest font-bold rounded-full px-9 py-4 text-sm transition hover:brightness-110 shadow-glowGold"
          >
            {t("orderNow")}
          </button>
          <button
            onClick={() => scrollTo("menu")}
            className="inline-flex items-center gap-2 glass-card text-cream rounded-full px-9 py-4 text-sm font-bold transition hover:border-gold/50"
          >
            {t("viewMenu")}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.8 }}
          className="mt-16 flex justify-center"
        >
          <button onClick={() => scrollTo("menu")} className="text-muted/60 hover:text-gold transition" aria-label="Scroll to menu">
            <motion.span
              className="block text-xl"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              ↓
            </motion.span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ================= Trust ================= */

function TrustBadges() {
  const { t } = useLanguage();
  const TRUST = [
    { icon: "🌿", title: t("trustNatural"), sub: t("trustNaturalSub") },
    { icon: "0g", title: t("trustSugar"), sub: t("trustSugarSub") },
    { icon: "❄️", title: t("trustCold"), sub: t("trustColdSub") }
  ];

  return (
    <section className="relative -mt-4 pb-2 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TRUST.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card rounded-3xl p-6 text-center shadow-glass hover:shadow-glowGoldSoft transition-shadow"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-2xl shadow-glowGoldSoft">
              {item.icon}
            </div>
            <p className="font-display text-lg text-cream">{item.title}</p>
            <p className="text-xs text-muted mt-1">{item.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ================= Menu ================= */

function MenuSection({ items, loading, error, onRetry, isOpen, openTime, closeTime }) {
  const { t } = useLanguage();

  return (
    <section id="menu" className="relative px-4 sm:px-6 py-24 overflow-hidden">
      <motion.div
        className="pointer-events-none absolute top-16 left-[4%] text-gold opacity-10"
        style={{ rotate: -12 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneStick className="w-16 h-64" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-10 right-[6%] text-mint opacity-10"
        style={{ rotate: 16 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneLeaf className="w-28 h-16" />
      </motion.div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-goldLight">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-goldLight" />
            </span>
            {t("menuEyebrow")}
          </span>
          <h2 className="mt-5 font-display font-semibold text-4xl sm:text-5xl text-cream leading-tight">
            {t("menu")}
          </h2>
          <p className="text-muted mt-4 max-w-lg mx-auto leading-relaxed">{t("menuSub")}</p>
        </motion.div>

        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto text-center rounded-2xl border border-red-500/30 bg-red-500/[0.08] text-red-200 text-sm font-semibold px-5 py-3.5 mb-10 backdrop-blur-md"
          >
            {t("shopClosedBanner")
              .replace("{openTime}", formatHour12(openTime))
              .replace("{closeTime}", formatHour12(closeTime))}
          </motion.div>
        )}

        {loading ? (
          <div className="grid place-items-center py-24">
            <Spinner className="w-10 h-10" />
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto text-center glass-card rounded-3xl p-10 shadow-glass">
            <p className="text-3xl mb-3">⛔</p>
            <p className="text-muted text-sm mb-6">{error}</p>
            <button
              onClick={onRetry}
              className="bg-gold-metal text-forest font-bold rounded-full px-6 py-2.5 text-sm hover:brightness-110 shadow-glowGoldSoft transition"
            >
              {t("retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card rounded-3xl shadow-glass">
            <EmptyState icon="🍹" title={t("menuEmptyTitle")} sub={t("menuEmptySub")} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <MenuItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MenuItemCard({ item, index }) {
  const { add } = useCart();
  const { t } = useLanguage();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 3) * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-glass overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-gold/40 hover:shadow-glowGold"
    >
      {/* glass sheen + corner light pools */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gold/[0.12] blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-mint/[0.10] blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

      {/* image — fixed aspect ratio, zero CLS, lazy */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest3 via-forest2 to-forestD" />
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name || "Fresh juice"}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <span
            className="absolute inset-0 grid place-items-center text-gold/[0.28]"
            aria-hidden="true"
          >
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <path d="M5 8l1.5-5.5h5L13 8" />
              <path d="M9.5 11v6" />
              <path d="M12.5 13.5H6.5" />
            </svg>
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1a10]/70 via-transparent to-transparent" />
        <span className="absolute top-3.5 right-3.5 bg-black/40 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-cream px-3 py-1 rounded-full border border-white/15 shadow-glass">
          {t("fresh")}
        </span>
      </div>

      {/* body */}
      <div className="relative p-6">
        <h3 className="font-display text-xl text-cream group-hover:text-gold transition-colors">{item.name}</h3>
        <p className="text-sm text-muted mt-1.5 line-clamp-2 min-h-[2.5rem]">
          {item.description || t("itemDescFallback")}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-display text-2xl text-gold-metal">{inr(item.price)}</span>

          {/* add to cart — exact same logic, untouched */}
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.88 }}
            aria-label={added ? `Added ${item.name}` : `Add ${item.name} to cart`}
            className={`relative w-12 h-12 grid place-items-center rounded-full text-xl font-bold text-forest transition-all duration-300 ${
              added
                ? "bg-mint text-forest shadow-glowMint"
                : "bg-gold-metal shadow-glowGold group-hover:animate-pulseGlow hover:brightness-110"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ✓
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.6, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.6, opacity: 0, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  +
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ================= Cart Drawer (frosted bottom sheet / side panel) ================= */

function CartDrawer({ open, onClose, lines, total, setQty, remove, onCheckout, isOpen, openTime, closeTime }) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed z-50 w-full md:max-w-md bg-forest2/85 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-glass md:inset-y-0 md:right-0 rounded-t-[28px] md:rounded-none bottom-0 max-h-[85vh] md:max-h-none"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="md:hidden pt-3 flex justify-center">
              <span className="w-12 h-1.5 rounded-full bg-white/[0.15]" />
            </div>
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/5">
              <h3 className="font-display text-xl text-cream">{t("yourCart")}</h3>
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:bg-white/10"
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {lines.length === 0 ? (
                <EmptyState icon="🧺" title={t("cartEmpty")} sub={t("cartEmptySub")} />
              ) : (
                <div className="space-y-4">
                  {lines.map((l) => (
                    <div key={l.item.id} className="glass-card rounded-2xl p-3 flex gap-4 items-center">
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-forest3 grid place-items-center text-2xl border border-white/10 overflow-hidden">
                        {l.item.imageUrl ? (
                          <img src={l.item.imageUrl} alt={l.item.name} className="w-full h-full object-cover" />
                        ) : (
                          "🍹"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-cream truncate">{l.item.name}</p>
                        <p className="text-sm text-gold-metal">{inr(l.item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setQty(l.item.id, l.qty - 1)}
                          className="w-8 h-8 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:border-gold/40"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.item.id, l.qty + 1)}
                          className="w-8 h-8 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:border-gold/40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                        <button
                          onClick={() => remove(l.item.id)}
                          className="w-8 h-8 grid place-items-center rounded-full text-muted/60 hover:text-red-300"
                          aria-label={`Remove ${l.item.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-white/5 bg-forest/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted text-sm">{t("subtotal")}</span>
                <span className="font-display text-2xl text-gold-metal">{inr(total)}</span>
              </div>
              {lines.length > 0 && total < MIN_ORDER_VALUE && (
                <p className="text-xs font-semibold text-gold/80 mb-3">
                  Add ₹{(MIN_ORDER_VALUE - total).toLocaleString("en-IN", { maximumFractionDigits: 2 })} more to checkout. (Min order ₹150)
                </p>
              )}
              {!isOpen && (
                <p className="text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5 mb-3 text-center">
                  {t("shopClosedBanner")
                    .replace("{openTime}", formatHour12(openTime))
                    .replace("{closeTime}", formatHour12(closeTime))}
                </p>
              )}
              <button
                onClick={onCheckout}
                disabled={lines.length === 0 || total < MIN_ORDER_VALUE || !isOpen}
                className="w-full bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glowGold"
              >
                {t("proceedCheckout")}
              </button>
              <p className="text-center text-xs text-muted/60 mt-3">
                {t("drawerHint")}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================= Live order tracking ================= */

const TRACK_STEPS = ["Pending", "Preparing", "Out for Delivery", "Delivered"];
const TRACK_STEP_KEYS = ["trackStepPending", "trackStepPreparing", "trackStepOut", "trackStepDelivered"];

function TrackOrder() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackedId = order ? order.id : null;

  const trackById = useCallback(
    async (id) => {
      setLoading(true);
      setError("");
      setOrder(null);
      try {
        const { order: data } = await api.trackOrder(id);
        setOrder(data);
      } catch (err) {
        setError(err.message || t("trackNotFound"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  // live polling while an order is on screen
  useEffect(() => {
    if (!trackedId) return;
    const iv = setInterval(async () => {
      try {
        const { order: updated } = await api.trackOrder(trackedId);
        setOrder(updated);
      } catch {
        /* transient blip — keep the last known state */
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [trackedId]);

  // "Track Live Order" from the checkout success screen: pre-fill the ID,
  // scroll to this section, and fire the lookup immediately.
  useEffect(() => {
    function onTrackRequest(e) {
      const id = String(e.detail?.id || "").replace(/\D/g, "");
      if (!id) return;
      setInput(id);
      document.getElementById("track")?.scrollIntoView({ behavior: "smooth" });
      trackById(id);
    }
    window.addEventListener("ganna:track-order", onTrackRequest);
    return () => window.removeEventListener("ganna:track-order", onTrackRequest);
  }, [trackById]);

  // Deep link: ?track=00024 (from the WhatsApp receipt) opens tracking
  // pre-filled — used by trackById, then the query is cleaned so a
  // refresh doesn't re-trigger. Fully guarded: a malformed URL or an
  // environment without scrollIntoView can never take down the Home.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = (params.get("track") || "").trim();
      if (!raw) return;
      const id = raw.replace(/\D/g, "");
      if (!id) return;
      setInput(raw);
      const el = document.getElementById("track");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth" });
      }
      trackById(id);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    } catch {
      /* never let a bad deep link crash the homepage */
    }
  }, [trackById]);

  function handleTrack(e) {
    e.preventDefault();
    const id = String(input).trim().replace(/\D/g, "");
    if (!id) {
      setError(t("trackInvalid"));
      setOrder(null);
      return;
    }
    trackById(id);
  }

  const currentIdx = order ? TRACK_STEPS.indexOf(order.deliveryStatus) : -1;

  const orderDate = (() => {
    if (!order?.createdAt) return "";
    const d = new Date(String(order.createdAt).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return String(order.createdAt);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  })();

  return (
    <section id="track" className="relative px-4 sm:px-6 py-24 overflow-hidden">
      {/* ambient depth — drifting gold/mint orbs + horizon wash */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ x: [0, 44, -24, 0], y: [0, -34, 22, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-24 w-[28rem] h-[28rem] rounded-full bg-gold/[0.09] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -44, 26, 0], y: [0, 36, -26, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 -right-24 w-[28rem] h-[28rem] rounded-full bg-mint/[0.07] blur-[120px]"
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[42rem] h-64 bg-gold/[0.05] blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-goldLight">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-goldLight" />
            </span>
            {t("trackEyebrow")}
          </span>
          <h2 className="mt-5 font-display font-semibold text-4xl sm:text-5xl text-cream leading-tight">
            {t("trackTitle")}
          </h2>
          <p className="text-muted mt-4 max-w-lg mx-auto leading-relaxed">{t("trackSub")}</p>
        </motion.div>

        {/* search form */}
        <motion.form
          onSubmit={handleTrack}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="group relative"
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-gold/40 via-white/10 to-mint/40 opacity-50 blur-[2px] transition-opacity duration-300 group-focus-within:opacity-90" />
          <div className="relative flex items-stretch gap-2 sm:gap-3 rounded-3xl border border-white/10 bg-forest2/70 backdrop-blur-2xl p-2.5 sm:p-3 shadow-glass">
            <div className="flex items-center pl-3 sm:pl-4 text-muted">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("trackPlaceholder")}
              className="flex-1 min-w-0 bg-transparent px-2 py-3 text-sm sm:text-base text-cream placeholder:text-muted/60 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-metal text-forest font-bold px-5 sm:px-7 py-3 text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-glowGold"
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("trackBtn")}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M14 7h7v7" />
                  </svg>
                  {t("trackBtn")}
                </>
              )}
            </button>
          </div>
        </motion.form>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 backdrop-blur-xl px-5 py-4 text-sm text-red-200"
          >
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 glow-ring rounded-[32px]"
          >
            <div className="relative rounded-[31px] border border-white/10 bg-forest2/60 backdrop-blur-2xl overflow-hidden shadow-glass">
              {/* glass sheen + corner light pools */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gold/[0.10] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-mint/[0.08] blur-3xl" />

              <div className="relative p-6 sm:p-8">
                {/* order identity row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-[0.25em] font-bold">{t("orderLabel")}</p>
                    <p className="mt-1 font-display text-3xl text-gold2 leading-none">#{String(order.id).padStart(5, "0")}</p>
                    {order.customerName ? (
                      <p className="mt-2 text-xs text-muted">{order.customerName}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted uppercase tracking-[0.25em] font-bold">{t("trackTotal")}</p>
                    <p className="mt-1 font-display text-3xl text-cream leading-none">{inr(order.totalAmount)}</p>
                    {orderDate ? <p className="mt-2 text-xs text-muted">{orderDate}</p> : null}
                  </div>
                </div>

                <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* status timeline */}
                <div className="flex items-start">
                  {TRACK_STEPS.map((step, i) => {
                    const done = i <= currentIdx;
                    const fill = i < currentIdx;
                    const isLast = i === TRACK_STEPS.length - 1;
                    return (
                      <div key={step} className="flex items-start flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`relative w-11 h-11 rounded-full grid place-items-center text-lg font-bold border transition-all duration-500 ${
                              done
                                ? "bg-gold-metal text-forest border-gold shadow-glowGoldSoft"
                                : "bg-white/[0.03] text-muted border-white/10"
                            }`}
                          >
                            {done ? "✓" : i + 1}
                            {i === currentIdx && (
                              <span className="absolute -inset-1.5 rounded-full border border-gold/40 animate-pulseGlow" />
                            )}
                          </div>
                          <p className={`text-[11px] font-bold mt-3 text-center leading-tight ${done ? "text-cream" : "text-muted"}`}>
                            {t(TRACK_STEP_KEYS[i])}
                          </p>
                        </div>
                        {!isLast && (
                          <div className="mt-5 flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r from-gold to-goldLight transition-all duration-700 ${fill ? "w-full" : "w-0"}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* items */}
                {(order.items || []).length > 0 && (
                  <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md p-2">
                    {(order.items || []).map((it, idx) => (
                      <div
                        key={it.name}
                        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${idx > 0 ? "border-t border-white/5" : ""}`}
                      >
                        <span className="text-cream">
                          {it.name} <span className="text-muted">×{it.quantity}</span>
                        </span>
                        <span className="text-muted font-medium">{inr(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* live refresh footer */}
                <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted/70">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-goldLight" />
                  </span>
                  {t("trackRefresh")}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ================= Reviews ================= */

const REVIEW_STARS = [1, 2, 3, 4, 5];

function formatReviewDate(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StarRating({ value, interactive = false, onChange, size = "text-2xl" }) {
  return (
    <div className="flex items-center gap-0.5">
      {REVIEW_STARS.map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star`}
          className={`${size} leading-none transition-transform duration-150 ${
            interactive ? "cursor-pointer hover:scale-125 active:scale-95" : "cursor-default"
          } ${n <= value ? "opacity-100" : "opacity-20 grayscale"}`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ exactLocation }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ name: "", rating: 0, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { reviews } = await api.get("/reviews");
      setReviews(reviews || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!toast) return;
    const tmo = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(tmo);
  }, [toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError(t("reviewErrName"));
      return;
    }
    if (!REVIEW_STARS.includes(form.rating)) {
      setFormError(t("reviewErrRating"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/reviews", {
        customerName: form.name.trim(),
        rating: form.rating,
        comment: form.comment.trim()
      });
      setForm({ name: "", rating: 0, comment: "" });
      await loadReviews();
      setToast(t("reviewThanks"));
    } catch (err) {
      setFormError(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reviews" className="relative px-4 sm:px-6 py-24 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-gold/[0.08] blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-mint/[0.06] blur-[120px]" />
      </div>

      {/* sugarcane decor */}
      <motion.div
        className="pointer-events-none absolute top-20 left-[5%] text-gold opacity-10"
        style={{ rotate: -18 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneLeaf className="w-28 h-16" />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-14 right-[5%] text-mint opacity-10"
        style={{ rotate: 10 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.8, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <SugarcaneStick className="w-14 h-56" />
      </motion.div>

      <div className="relative max-w-7xl mx-auto">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gold-metal mb-4">{t("reviewsEyebrow")}</p>
          <h2 className="font-display font-semibold text-4xl sm:text-6xl text-cream">{t("reviewsTitle")}</h2>
          <p className="text-muted mt-4 max-w-lg mx-auto">{t("reviewsSub")}</p>
          {exactLocation && (
            <a
              href={exactLocation}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 bg-gold-metal text-forest font-bold rounded-full px-7 py-3 text-sm transition hover:brightness-110 shadow-glowGold"
            >
              📍 {t("rateOnMaps")}
            </a>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* reviews feed */}
          <div className="lg:col-span-3 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="glass-card rounded-3xl p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-24 rounded-full bg-white/10" />
                      <div className="h-4 w-40 rounded-full bg-white/10" />
                      <div className="h-3 w-full rounded-full bg-white/5" />
                      <div className="h-3 w-2/3 rounded-full bg-white/5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : loadError ? (
              <div className="glass-card rounded-3xl p-10 text-center">
                <p className="text-3xl mb-3">⛔</p>
                <p className="text-muted text-sm">{loadError}</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 text-center">
                <p className="text-4xl mb-4">⭐</p>
                <p className="text-muted text-sm">{t("reviewEmpty")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-card rounded-3xl p-6 shadow-glass hover:shadow-glowGoldSoft transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-base font-bold text-gold-metal">
                          {(r.customerName || "?").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-cream">{r.customerName}</p>
                          <StarRating value={r.rating} size="text-sm" />
                        </div>
                      </div>
                      <span className="text-xs text-muted/60 whitespace-nowrap">{formatReviewDate(r.createdAt)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-muted mt-4 leading-relaxed">{r.comment}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* write a review */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2 relative rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl" />
            <form onSubmit={handleSubmit} className="relative p-6 sm:p-7">
              <h3 className="font-display text-xl text-cream">{t("writeReviewTitle")}</h3>

              <label className="block mt-5">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{t("reviewNameLabel")}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("reviewNamePlaceholder")}
                  className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                />
              </label>

              <div className="mt-5">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{t("reviewRatingLabel")}</span>
                <div className="inline-flex items-center gap-1 p-3 rounded-2xl border border-white/10 bg-black/30">
                  <StarRating value={form.rating} interactive onChange={(n) => setForm({ ...form, rating: n })} />
                </div>
              </div>

              <label className="block mt-5">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{t("reviewCommentLabel")}</span>
                <textarea
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder={t("reviewCommentPlaceholder")}
                  className="resize-none bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                />
              </label>

              {formError && (
                <p className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none shadow-glowGold"
              >
                {submitting ? (
                  <>
                    <Spinner className="w-4 h-4" /> {t("reviewSending")}
                  </>
                ) : (
                  t("reviewSubmit")
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 bg-gradient-to-r from-mint to-emerald-400 text-forest font-bold text-sm px-5 py-3.5 rounded-2xl shadow-card"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-lg">✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================= Refer & Share ================= */

const GOLD_PARTICLES = [
  { left: "10%", top: "20%", size: 7, duration: 5.2, delay: 0 },
  { left: "78%", top: "16%", size: 5, duration: 6.4, delay: 0.9 },
  { left: "22%", top: "74%", size: 5, duration: 5.8, delay: 1.6 },
  { left: "88%", top: "70%", size: 8, duration: 7.1, delay: 0.4 },
  { left: "42%", top: "12%", size: 4, duration: 4.9, delay: 2.2 },
  { left: "60%", top: "82%", size: 6, duration: 6.1, delay: 1.1 },
  { left: "94%", top: "42%", size: 4, duration: 5.5, delay: 2.8 },
  { left: "4%", top: "48%", size: 6, duration: 6.8, delay: 0.2 }
];

function ReferSection() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function share() {
    const url = window.location.origin;
    const payload = {
      title: "Sugarcane Juice",
      text: "Order fresh sugarcane juice here! 🍹",
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setToast({ ok: true, text: "Link shared!" });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ ok: true, text: "Link copied to clipboard!" });
      }
    } catch (err) {
      // User dismissed the system share sheet — not a failure.
      if (err && err.name === "AbortError") return;
      setToast({ ok: false, text: "Could not share link" });
    }
  }

  return (
    <section className="relative px-4 sm:px-6 py-24 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 -right-24 w-[34rem] h-[34rem] rounded-full bg-gold/[0.08] blur-[130px]" />
        <div className="absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-mint/5 blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* gradient hairline border */}
          <div className="rounded-[32px] p-px bg-gradient-to-br from-gold/50 via-white/10 to-gold/30 shadow-glass">
            <div className="relative overflow-hidden rounded-[31px] border border-white/10 bg-forest2/60 backdrop-blur-2xl">
              {/* glow orbs + corner sheen */}
              <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gold/[0.15] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-mint/10 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.05),transparent_50%)]" />

              {/* floating gold particles */}
              <div className="pointer-events-none absolute inset-0">
                {GOLD_PARTICLES.map((p, i) => (
                  <motion.span
                    key={i}
                    className="absolute rounded-full bg-gold shadow-glowGoldSoft"
                    style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
                    animate={{ y: [0, -20, 0], opacity: [0.1, 0.75, 0.1] }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
              </div>

              <div className="relative px-6 py-14 sm:px-14 sm:py-16 text-center">
                <motion.div
                  className="mx-auto mb-7 w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 grid place-items-center text-3xl shadow-glowGoldSoft"
                  animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  🍹
                </motion.div>

                <h2 className="font-display text-4xl sm:text-5xl text-cream leading-tight">
                  Share the <span className="text-gold-metal drop-shadow-[0_0_18px_rgba(245,158,11,0.45)]">Taste!</span>
                </h2>
                <p className="mt-4 text-muted text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                  Share your store link with friends and get fresh juice together.
                </p>

                <button
                  onClick={share}
                  className="mt-9 inline-flex items-center justify-center gap-2.5 bg-gold-metal text-forest font-bold rounded-full px-9 py-4 text-base shadow-glowGold hover:brightness-110 active:scale-[0.97] transition"
                >
                  <span className="text-lg leading-none">📲</span> Share Website Link
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 font-bold text-sm px-5 py-3.5 rounded-2xl shadow-card ${
              toast.ok ? "bg-gradient-to-r from-mint to-emerald-400 text-forest" : "bg-red-950 text-red-200 border border-red-500/40"
            }`}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-lg">{toast.ok ? "✓" : "✕"}</span>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================= Footer / Contact ================= */

function Footer({ settings }) {
  const { t } = useLanguage();
  const links = [
    settings.whatsapp && { label: "WhatsApp", href: waLink(settings.whatsapp), icon: "💬" },
    settings.instagram && { label: "Instagram", href: settings.instagram.startsWith("http") ? settings.instagram : `https://instagram.com/${settings.instagram}`, icon: "📸" },
    settings.telegram && { label: "Telegram", href: settings.telegram.startsWith("http") ? settings.telegram : `https://t.me/${settings.telegram}`, icon: "✈️" }
  ].filter(Boolean);

  return (
    <footer id="contact" className="border-t border-white/5 bg-forest2/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid gap-10 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-10 h-10 rounded-xl bg-gold-metal grid place-items-center text-xl shadow-glowGoldSoft">
              🍹
            </span>
            <span className="font-display text-2xl text-cream">
              Sugarcane <span className="text-gold-metal">Juice</span>
            </span>
          </div>
          <p className="text-muted text-sm max-w-sm">
            {t("footerSub")}
          </p>

          {settings.pincode && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <span className="text-base">📍</span>
              {settings.pincode}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 glass-card text-cream text-sm font-semibold rounded-full px-5 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
              >
                <span>{l.icon}</span> {l.label}
              </a>
            ))}
            {settings.phone && (
              <a
                href={`tel:${settings.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 glass-card text-cream text-sm font-semibold rounded-full px-5 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
              >
                <span>📞</span> {settings.phone}
              </a>
            )}
          </div>
        </div>

        {settings.locationUrl && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">{t("findUs")}</p>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 glass-card">
              <iframe
                src={settings.locationUrl}
                title="Stall location"
                className="w-full h-64"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {settings.exactLocation && (
                <a
                  href={settings.exactLocation}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in Google Maps"
                  className="absolute inset-0 z-10 block cursor-pointer"
                >
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-cream text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/15 shadow-glass whitespace-nowrap">
                    📍 {t("openInMaps")}
                  </span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted/60">
          <span className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Sugarcane Juice.</span>
            <span className="text-white/10">|</span>
            <Link to="/login" className="hover:text-gold transition-colors">
              {t("ownerLogin")}
            </Link>
          </span>
          <span>{t("footerMade")}</span>
        </div>
      </div>
    </footer>
  );
}
