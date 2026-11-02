import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth";
import { api } from "../api";
import { Spinner } from "../components/ui";
import LanguageDropdown from "../components/LanguageDropdown";
import { useLanguage } from "../language";

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

const NAV = [
  { to: "/admin", labelKey: "navAnalytics", end: true, Icon: ChartIcon },
  { to: "/admin/menu", labelKey: "navMenu", Icon: MenuIcon },
  { to: "/admin/orders", labelKey: "navOrders", Icon: ReceiptIcon },
  { to: "/admin/customers", labelKey: "navCustomers", Icon: UsersIcon },
  { to: "/admin/reviews", labelKey: "navReviews", Icon: StarIcon },
  { to: "/admin/settings", labelKey: "navSettings", Icon: GearIcon }
];

const TITLES = {
  "/admin": "navAnalytics",
  "/admin/menu": "navMenu",
  "/admin/orders": "navOrders",
  "/admin/customers": "navCustomers",
  "/admin/reviews": "navReviews",
  "/admin/settings": "navSettings"
};

export default function DashboardLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported")
  );
  const [toast, setToast] = useState(null);

  const title = t(TITLES[location.pathname] || "navDashboard");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(type, message) {
    setToast({ type, message, key: Date.now() });
  }

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

  async function enableNotifications() {
    if (!("Notification" in window)) {
      showToast("error", "This browser doesn't support notifications");
      return;
    }
    setNotifLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== "granted") {
        showToast("error", "Notification permission denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get("/notifications/vapid");
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await api.post("/notifications/subscribe", subscription.toJSON());
      showToast("success", "Notifications enabled — you'll get order alerts!");
    } catch (err) {
      showToast("error", err.message || "Failed to enable notifications");
    } finally {
      setNotifLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // ---- in-app new-order alert (polls every 15s) ----
  const [orderAlert, setOrderAlert] = useState(null);
  const seenPendingIdsRef = useRef(null); // null = not seeded yet

  // latest pending orders for the header bell dropdown
  const [bellOpen, setBellOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const { orders } = await api.orders();
        if (!alive) return;
        const pending = (orders || []).filter((o) => o.status === "Pending");
        // keep the bell's list fresh without re-rendering when nothing changed
        setPendingOrders((prev) => {
          const next = pending.slice(0, 5);
          const same =
            prev.length === next.length &&
            prev.every((p, i) => p.id === next[i].id && p.status === next[i].status);
          return same ? prev : next;
        });
        const seen = seenPendingIdsRef.current;
        if (seen !== null) {
          const fresh = pending.find((o) => !seen.has(String(o.id)));
          if (fresh) {
            setOrderAlert({ id: fresh.id, totalAmount: fresh.totalAmount });
            // New-order chime — fires the moment the popup appears. Browsers
            // may block audio until a user gesture; the visual alert still
            // covers that case, so failures are swallowed silently.
            try {
              const chime = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
              chime.play().catch(() => {});
            } catch {
              /* audio unavailable — visual popup is the primary alert */
            }
          }
          for (const o of pending) seen.add(String(o.id));
        } else {
          seenPendingIdsRef.current = new Set(pending.map((o) => String(o.id)));
        }
      } catch {
        /* transient — ignore */
      }
    }

    poll();
    const iv = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="min-h-screen bg-forest">
      {/* ===== Desktop floating glass sidebar ===== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 p-4 flex-col">
        <div className="flex-1 flex flex-col rounded-[28px] border border-white/10 bg-forest2/50 backdrop-blur-md shadow-card overflow-hidden">
          <BrandBlock />

          <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
            {NAV.map(({ to, labelKey, end, Icon }) => (
              <NavLink key={to} to={to} end={end}>
                {({ isActive }) => (
                  <span
                    className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive ? "text-forest" : "text-muted hover:text-cream hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill-desktop"
                        className="absolute inset-0 rounded-2xl bg-gold-metal shadow-glowGold"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon className={`relative w-5 h-5 ${isActive ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" : ""}`} />
                    <span className="relative">{t(labelKey)}</span>

                    {isActive && (
                      <motion.span
                        layoutId="nav-dot-desktop"
                        className="relative ml-auto w-1.5 h-1.5 rounded-full bg-forest/70"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      />
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* signed-in card */}
          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gold-metal grid place-items-center text-sm font-bold text-forest shadow-glowGoldSoft">
                  {admin?.email?.charAt(0)?.toUpperCase() || "O"}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted">{t("signInAs")}</p>
                  <p className="text-sm text-cream truncate">{admin?.email}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gold">
                {t("ownerConsole")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== Mobile floating glass drawer ===== */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-[19rem] max-w-[85vw] flex flex-col rounded-r-[28px] border-r border-white/10 bg-forest2/70 backdrop-blur-md shadow-glass lg:hidden"
              initial={{ x: "-104%" }}
              animate={{ x: 0 }}
              exit={{ x: "-104%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-start justify-between p-5">
                <BrandBlock compact />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                {NAV.map(({ to, labelKey, end, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {({ isActive }) => (
                      <span
                        className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                          isActive ? "text-forest" : "text-muted hover:text-cream hover:bg-white/5"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="nav-pill-mobile"
                            className="absolute inset-0 rounded-2xl bg-gold-metal shadow-glowGold"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <Icon className={`relative w-5 h-5 ${isActive ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" : ""}`} />
                        <span className="relative">{t(labelKey)}</span>
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-muted hover:text-cream hover:bg-white/10 hover:border-gold/40 py-3 transition"
                >
                  <LogoutIcon className="w-4 h-4" /> {t("logout")}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== Main column ===== */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 lg:h-[4.75rem] px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-forest/70 backdrop-blur-md border-b border-white/5" />
          <div className="relative flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 grid place-items-center rounded-xl glass-card text-cream hover:border-gold/40"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
                <h2 className="font-display text-xl text-cream leading-none truncate">{title}</h2>
              </div>
              <p className="text-xs text-muted mt-1.5 hidden sm:block">Sugarcane Juice</p>
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            {!standalone && (
              <button
                onClick={installApp}
                title={t("installApp")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
              >
                <span className="text-base leading-none">📲</span>
                <span className="hidden sm:inline">{t("installApp")}</span>
              </button>
            )}
            {notifPermission === "default" && (
              <button
                onClick={enableNotifications}
                disabled={notifLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft disabled:opacity-60 disabled:pointer-events-none"
                title={t("enableNotificationsTitle")}
              >
                {notifLoading ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <BellIcon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {notifLoading ? t("enabling") : t("enableNotifications")}
                </span>
              </button>
            )}
            <LanguageDropdown />

            {/* Pending orders bell */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-cream transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
                aria-label="Pending orders"
              >
                <BellIcon className="w-5 h-5" />
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center shadow-lg">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                    <motion.div
                      className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-3xl border border-white/10 bg-forest2/95 backdrop-blur-2xl shadow-card"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("pendingOrders")}</p>
                        <span className="text-[10px] font-bold text-gold">{pendingOrders.length} {t("waiting")}</span>
                      </div>
                      <div className="max-h-[22rem] overflow-y-auto">
                        {pendingOrders.length === 0 ? (
                          <div className="px-5 py-10 text-center">
                            <p className="text-2xl mb-2">🎉</p>
                            <p className="text-sm text-muted">{t("noPendingOrders")}</p>
                          </div>
                        ) : (
                          pendingOrders.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => {
                                setBellOpen(false);
                                navigate("/admin/orders");
                              }}
                              className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors"
                            >
                              <span className="text-sm font-semibold text-cream">Order #{o.id}</span>
                              <span className="text-sm font-bold text-gold2 tabular-nums">
                                ₹{Number(o.totalAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold-metal grid place-items-center text-sm font-bold text-forest shadow-glowGoldSoft">
                {admin?.email?.charAt(0)?.toUpperCase() || "O"}
              </div>
              <div className="text-right">
                <p className="text-sm text-cream leading-tight truncate max-w-[200px]">{admin?.email}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">{t("owner")}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
            >
              <LogoutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Notification result toast */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-5 inset-x-0 z-[60] flex justify-center pointer-events-none">
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl border ${
                toast.type === "success"
                  ? "bg-forest2 text-mint border-mint/40"
                  : "bg-red-950 text-red-200 border-red-500/40"
              }`}
            >
              {toast.message}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* new-order alert popup */}
      <AnimatePresence>
        {orderAlert && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setOrderAlert(null)} />
            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative w-full max-w-sm rounded-[32px] border border-white/10 bg-forest2/90 backdrop-blur-md shadow-card overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-gold/10 max-lg:hidden blur-3xl" />
              <div className="relative p-7 text-center">
                <div className="mx-auto mb-5 w-16 h-16 rounded-3xl bg-gold/15 border border-gold/40 grid place-items-center text-3xl shadow-glowGoldSoft">
                  🔔
                </div>
                <h3 className="font-display text-2xl text-cream">New Order Received!</h3>
                <p className="text-muted text-sm mt-2">
                  Order{" "}
                  <span className="text-gold2 font-bold">#{orderAlert.id}</span>
                  {" · "}
                  <span className="text-cream font-bold">
                    ₹{Number(orderAlert.totalAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </p>
                <div className="mt-7 grid gap-2.5">
                  <button
                    onClick={() => {
                      setOrderAlert(null);
                      navigate("/admin/orders");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-3.5 text-sm transition hover:brightness-110 shadow-glowGold"
                  >
                    View & Approve
                  </button>
                  <button
                    onClick={() => setOrderAlert(null)}
                    className="w-full text-sm font-bold text-muted hover:text-cream py-2 transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrandBlock({ compact }) {
  const { t } = useLanguage();
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "px-5 pt-6 pb-4 border-b border-white/10"}`}>
      <div className="w-11 h-11 rounded-2xl bg-gold-metal shadow-glowGold grid place-items-center shrink-0 text-forest">
        <ChartIcon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-display text-lg text-cream leading-tight">
          Sugarcane <span className="text-gold-metal">Juice</span>
        </p>
        <p className="text-[11px] text-muted uppercase tracking-wider">{t("ownerConsole")}</p>
      </div>
    </div>
  );
}

/* ===== Inline icons ===== */

function IconBase({ children, className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ChartIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 4 3 5-7" />
    </IconBase>
  );
}

function MenuIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M4 6h16M4 12h10M4 18h16" />
    </IconBase>
  );
}

function ReceiptIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" />
      <path d="M9 8h6M9 12h6" />
    </IconBase>
  );
}

function StarIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </IconBase>
  );
}

function UsersIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

function GearIcon(p) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconBase>
  );
}

function LogoutIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </IconBase>
  );
}

function BellIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </IconBase>
  );
}

function CloseIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </IconBase>
  );
}
