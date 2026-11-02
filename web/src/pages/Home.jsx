import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { api } from "../api";
import { useCart } from "../cart";
import { useLanguage } from "../language";
import Checkout from "../components/Checkout";
import { EmptyState, Spinner } from "../components/ui";
import { SugarcaneStick, SugarcaneLeaf } from "../components/sugarcane";

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
  upiId: ""
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
  const { lines, count, total, setQty, remove, clear } = useCart();
  const { t } = useLanguage();

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

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 2600);
    return () => clearTimeout(t);
  }, [note]);

  return (
    <div className="min-h-screen bg-forest text-cream relative">
      {/* global film grain */}
      <div className="noise fixed inset-0 z-[5] pointer-events-none opacity-[0.05] mix-blend-overlay" />

      <Nav onMenu={() => scrollTo("menu")} onContact={() => scrollTo("contact")} />

      <Hero heroImageUrl={settings.heroImageUrl} />
      <TrustBadges />
      <MenuSection items={items} loading={loading} error={error} onRetry={() => window.location.reload()} />
      <TrackOrder />
      <ReviewsSection exactLocation={settings.exactLocation} />
      <Footer settings={settings} />

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
  let delay = start;
  return (
    <span className={className}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((ch, ci) => {
            const d = delay;
            delay += 0.035;
            return (
              <motion.span
                key={ci}
                className={`inline-block ${goldWords.includes(wi) ? "text-gold-metal" : ""}`}
                variants={glyph}
                initial="hidden"
                animate="show"
                custom={d}
              >
                {ch}
              </motion.span>
            );
          })}
          {"\u00A0"}
        </span>
      ))}
    </span>
  );
}

/* ================= Nav ================= */

function Nav({ onMenu, onContact }) {
  const { t, lang, setLang } = useLanguage();
  const targetLang = lang === "en" ? "or" : "en";
  const targetLabel = lang === "en" ? "ଓଡ଼ିଆ" : "EN";

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
        <button onClick={() => scrollTo("top")} className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gold-metal grid place-items-center text-lg shadow-glowGoldSoft">
            🍹
          </span>
          <span className="font-display text-xl text-cream">
            Sugarcane <span className="text-gold-metal">Juice</span>
          </span>
        </button>
        <nav className="flex items-center gap-1 text-sm font-semibold text-muted">
          <button onClick={onMenu} className="px-3 py-2 rounded-full hover:text-cream hover:bg-white/5 transition">
            {t("menuShort")}
          </button>
          <button onClick={onContact} className="px-3 py-2 rounded-full hover:text-cream hover:bg-white/5 transition">
            {t("contact")}
          </button>

          {/* install app — glassmorphic */}
          {!standalone && (
            <button
              onClick={installApp}
              aria-label="Install app"
              className="relative ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
              <span className="relative text-sm leading-none">📲</span>
              <span className="relative tracking-wide">Install App</span>
            </button>
          )}

          {/* village alerts — glassmorphic */}
          {(subState === "idle" || subState === "loading") && (
            <button
              onClick={enableAlerts}
              disabled={subState === "loading"}
              aria-label="Get village alerts"
              className="relative ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden disabled:opacity-60 disabled:pointer-events-none"
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
              className="relative ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold shadow-glass"
              title="Alerts enabled — we'll ping you when the stall moves"
            >
              <span className="relative text-sm leading-none">🔔</span>
              <span className="relative tracking-wide">Alerts On</span>
            </span>
          )}

          {/* language toggle — glassmorphic */}
          <button
            onClick={() => setLang(targetLang)}
            aria-label={`Switch language to ${targetLabel}`}
            className="relative ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl text-xs font-bold text-cream hover:border-gold/50 hover:text-gold transition shadow-glass overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
            <span className="relative text-sm leading-none">🌐</span>
            <span className="relative tracking-wide">{targetLabel}</span>
          </button>
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
        <motion.div style={{ y: orbY }} className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-gold/15 blur-[130px] animate-orbDrift" />
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

function MenuSection({ items, loading, error, onRetry }) {
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
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gold-metal mb-4">{t("menuEyebrow")}</p>
          <h2 className="font-display font-semibold text-4xl sm:text-6xl text-cream">{t("menu")}</h2>
          <p className="text-muted mt-4 max-w-lg mx-auto">
            {t("menuSub")}
          </p>
        </motion.div>

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
      className="group glass-card rounded-[28px] overflow-hidden shadow-glass hover:shadow-glowGold hover:-translate-y-2 transition-all duration-500 glow-ring"
    >
      {/* image */}
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest3 via-forest2 to-forestD" />
        {item.imageUrl ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -inset-y-10 inset-x-0 animate-floaty">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
              />
            </div>
          </div>
        ) : (
          <span className="relative grid place-items-center h-full text-6xl drop-shadow-[0_8px_20px_rgba(245,158,11,0.35)]">🍹</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1a10]/70 to-transparent" />
        <span className="absolute top-3.5 right-3.5 bg-black/40 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-cream px-3 py-1 rounded-full border border-white/15 shadow-glass">
          {t("fresh")}
        </span>
      </div>

      {/* body */}
      <div className="p-6">
        <h3 className="font-display text-xl text-cream group-hover:text-gold transition-colors">{item.name}</h3>
        <p className="text-sm text-muted mt-1.5 line-clamp-2 min-h-[2.5rem]">
          {item.description || t("itemDescFallback")}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-display text-2xl text-gold-metal">{inr(item.price)}</span>

          {/* circular glowing add button */}
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

function CartDrawer({ open, onClose, lines, total, setQty, remove, onCheckout }) {
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
              <span className="w-12 h-1.5 rounded-full bg-white/15" />
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
              <button
                onClick={onCheckout}
                disabled={lines.length === 0}
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

  return (
    <section id="track" className="relative px-4 sm:px-6 py-24 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-gold/8 blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-mint/6 blur-[120px]" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gold-metal mb-4">{t("trackEyebrow")}</p>
          <h2 className="font-display font-semibold text-4xl sm:text-6xl text-cream">{t("trackTitle")}</h2>
          <p className="text-muted mt-4 max-w-lg mx-auto">{t("trackSub")}</p>
        </motion.div>

        {/* order id form */}
        <motion.form
          onSubmit={handleTrack}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative glass-card rounded-3xl p-4 sm:p-5 flex gap-3 shadow-glass"
        >
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("trackPlaceholder")}
            className="flex-1 min-w-0 bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 sm:px-7 py-3 text-sm transition hover:brightness-110 disabled:opacity-50 shadow-glowGold"
          >
            {loading ? <Spinner className="w-4 h-4" /> : t("trackBtn")}
          </button>
        </motion.form>

        {error && (
          <div className="mt-5 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-5 py-4">
            {error}
          </div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 relative rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-bold">{t("orderLabel")}</p>
                  <p className="font-display text-2xl text-gold2">#{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted uppercase tracking-wider font-bold">{t("trackTotal")}</p>
                  <p className="font-display text-2xl text-cream">{inr(order.totalAmount)}</p>
                </div>
              </div>

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
                          className={`w-10 h-10 rounded-full grid place-items-center text-lg font-bold border transition ${done ? "bg-gold-metal text-forest border-gold shadow-glowGoldSoft" : "bg-white/[0.03] text-muted border-white/10"}`}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                        <p className={`text-[11px] font-bold mt-2.5 text-center leading-tight ${done ? "text-cream" : "text-muted"}`}>
                          {t(TRACK_STEP_KEYS[i])}
                        </p>
                      </div>
                      {!isLast && (
                        <div className={`mt-5 flex-1 h-0.5 rounded-full ${fill ? "bg-gold/60" : "bg-white/10"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* items */}
              <div className="mt-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 text-sm">
                {order.items.map((it) => (
                  <div key={it.name} className="flex justify-between gap-3">
                    <span className="text-cream">
                      {it.name} <span className="text-muted">×{it.quantity}</span>
                    </span>
                    <span className="text-muted">{inr(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-center text-xs text-muted/60 flex items-center justify-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                {t("trackRefresh")}
              </p>
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
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-gold/8 blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-mint/6 blur-[120px]" />
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
          <span>© {new Date().getFullYear()} Sugarcane Juice.</span>
          <span>{t("footerMade")}</span>
        </div>
      </div>
    </footer>
  );
}
