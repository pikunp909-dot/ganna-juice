import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth";
import { api } from "../api";
import { Spinner } from "../components/ui";

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
  { to: "/admin", label: "Analytics", end: true, Icon: ChartIcon },
  { to: "/admin/menu", label: "Menu", Icon: MenuIcon },
  { to: "/admin/orders", label: "Orders", Icon: ReceiptIcon },
  { to: "/admin/reviews", label: "Reviews", Icon: StarIcon },
  { to: "/admin/settings", label: "Settings", Icon: GearIcon }
];

const TITLES = {
  "/admin": "Analytics",
  "/admin/menu": "Menu",
  "/admin/orders": "Orders",
  "/admin/reviews": "Reviews",
  "/admin/settings": "Settings"
};

export default function DashboardLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported")
  );
  const [toast, setToast] = useState(null);

  const title = TITLES[location.pathname] || "Dashboard";

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

  return (
    <div className="min-h-screen bg-forest relative">
      {/* ambient mesh wash behind everything */}
      <div className="fixed inset-0 bg-forest-mesh pointer-events-none" />
      <div className="noise fixed inset-0 z-[1] pointer-events-none opacity-[0.04] mix-blend-overlay" />

      {/* ===== Desktop floating glass sidebar ===== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 p-4 flex-col">
        <div className="relative flex-1 flex flex-col rounded-[28px] border border-white/10 bg-forest2/50 backdrop-blur-2xl shadow-card overflow-hidden">
          {/* inner ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -left-16 w-56 h-56 rounded-full bg-gold/10 blur-[80px]" />
            <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-mint/8 blur-[90px]" />
          </div>

          <BrandBlock />

          <nav className="relative flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
            {NAV.map(({ to, label, end, Icon }) => (
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
                    <span className="relative">{label}</span>

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
          <div className="relative px-4 pb-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gold-metal grid place-items-center text-sm font-bold text-forest shadow-glowGoldSoft">
                  {admin?.email?.charAt(0)?.toUpperCase() || "O"}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Signed in as</p>
                  <p className="text-sm text-cream truncate">{admin?.email}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gold">
                Owner console
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
              className="fixed inset-y-0 left-0 z-50 w-[19rem] max-w-[85vw] flex flex-col rounded-r-[28px] border-r border-white/10 bg-forest2/70 backdrop-blur-2xl shadow-glass lg:hidden"
              initial={{ x: "-104%" }}
              animate={{ x: 0 }}
              exit={{ x: "-104%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="relative flex items-start justify-between p-5">
                <div className="pointer-events-none absolute -top-16 -left-12 w-48 h-48 rounded-full bg-gold/10 blur-[70px]" />
                <BrandBlock compact />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="relative w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                {NAV.map(({ to, label, end, Icon }) => (
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
                        <span className="relative">{label}</span>
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
                  <LogoutIcon className="w-4 h-4" /> Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== Main column ===== */}
      <div className="relative z-[2] lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 lg:h-[4.75rem] px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-forest/70 backdrop-blur-2xl border-b border-white/5" />
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
                title="Install app"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
              >
                <span className="text-base leading-none">📲</span>
                <span className="hidden sm:inline">Install Admin App</span>
              </button>
            )}
            {notifPermission === "default" && (
              <button
                onClick={enableNotifications}
                disabled={notifLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft disabled:opacity-60 disabled:pointer-events-none"
                title="Enable push notifications for new orders"
              >
                {notifLoading ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <BellIcon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {notifLoading ? "Enabling…" : "Enable Notifications"}
                </span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold-metal grid place-items-center text-sm font-bold text-forest shadow-glowGoldSoft">
                {admin?.email?.charAt(0)?.toUpperCase() || "O"}
              </div>
              <div className="text-right">
                <p className="text-sm text-cream leading-tight truncate max-w-[200px]">{admin?.email}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Owner</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft"
            >
              <LogoutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
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
    </div>
  );
}

function BrandBlock({ compact }) {
  return (
    <div className={`relative flex items-center gap-3 ${compact ? "" : "px-5 pt-6 pb-4 border-b border-white/10"}`}>
      <div className="w-11 h-11 rounded-2xl bg-gold-metal shadow-glowGold grid place-items-center shrink-0 text-forest">
        <ChartIcon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-display text-lg text-cream leading-tight">
          Sugarcane <span className="text-gold-metal">Juice</span>
        </p>
        <p className="text-[11px] text-muted uppercase tracking-wider">Owner console</p>
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
