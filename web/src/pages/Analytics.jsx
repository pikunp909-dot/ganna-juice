import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Card, Badge, Button, Spinner, EmptyState } from "../components/ui";

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/* ---- animated count-up (easeOutCubic) ---- */
function useCountUp(target, { duration = 1400, delay = 0 } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }
    let raf = 0;
    let start;
    let timeout;

    const tick = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    timeout = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}

/* ---- stagger + pop variants ---- */
const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } }
};

const cardPop = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

/* ---- stat card gradient tones ---- */
const STAT_TONES = {
  gold: {
    gradient: "from-gold/30 via-gold/10 to-transparent",
    orb: "bg-gold/20",
    orbGlow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.45)]",
    icon: "bg-gold-metal text-forest shadow-glowGold",
    value: "text-gold-metal",
    border: "hover:border-gold/40"
  },
  mint: {
    gradient: "from-mint/25 via-mint/8 to-transparent",
    orb: "bg-mint/20",
    orbGlow: "shadow-[0_0_40px_-8px_rgba(63,165,102,0.45)]",
    icon: "bg-mint/15 text-mint border border-mint/40",
    value: "text-cream",
    border: "hover:border-mint/40"
  },
  amber: {
    gradient: "from-amber-500/25 via-amber-500/8 to-transparent",
    orb: "bg-amber-500/20",
    orbGlow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.5)]",
    icon: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
    value: "text-amber-300",
    border: "hover:border-amber-500/40"
  }
};

function StatCard({ tone, label, sub, value, icon, delay }) {
  const t = STAT_TONES[tone];
  const animated = useCountUp(value, { delay: 200 + delay * 120 });

  return (
    <motion.div variants={cardPop}>
      <div
        className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass transition-all duration-500 ${t.border}`}
      >
        {/* soft gradient wash */}
        <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`} />

        {/* glow orb */}
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full max-lg:hidden blur-3xl ${t.orb} ${t.orbGlow} transition-transform duration-700 group-hover:scale-125`} />

        {/* corner sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.06),transparent_50%)]" />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
            <span className={`w-10 h-10 rounded-2xl grid place-items-center ${t.icon}`}>
              {icon}
            </span>
          </div>

          <p className={`font-display text-4xl leading-none ${t.value}`}>
            {tone === "gold" ? inr(animated) : Math.round(animated).toLocaleString("en-IN")}
          </p>

          <div className="mt-3.5 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold via-gold2 to-goldDark"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.4 + delay * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="text-xs text-muted mt-3">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ---- Period card (Today / This Month) ---- */
function PeriodCard({ tone, label, icon, revenue, orders, delay }) {
  const t = STAT_TONES[tone];
  const animatedRevenue = useCountUp(revenue, { delay: 250 + delay * 120 });
  const animatedOrders = useCountUp(orders, { delay: 320 + delay * 120 });

  return (
    <motion.div variants={cardPop}>
      <div
        className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass transition-all duration-500 ${t.border}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`} />
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full max-lg:hidden blur-3xl ${t.orb} ${t.orbGlow} transition-transform duration-700 group-hover:scale-125`} />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.06),transparent_50%)]" />

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
            <span className={`w-10 h-10 rounded-2xl grid place-items-center ${t.icon}`}>
              {icon}
            </span>
          </div>

          <p className={`font-display text-4xl leading-none ${t.value}`}>
            {inr(animatedRevenue)}
          </p>

          <div className="mt-3.5 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold via-gold2 to-goldDark"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.4 + delay * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className={`text-sm font-bold ${t.value}`}>
              {Math.round(animatedOrders).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted">
              {Math.round(animatedOrders) === 1 ? "order" : "orders"} · verified
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---- Payment split (UPI vs COD) stacked bar ---- */
function PaymentSplit({ split }) {
  const upi = Number(split.upiAmount || 0);
  const cod = Number(split.codAmount || 0);
  const total = upi + cod;
  const upiPct = total > 0 ? Math.round((upi / total) * 100) : 0;
  const codPct = total > 0 ? 100 - upiPct : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
            <SplitIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-xl text-cream leading-none">Payment Split</h3>
            <p className="text-xs text-muted mt-1">Verified revenue — online vs cash</p>
          </div>
        </div>

        {total > 0 ? (
          <>
            {/* stacked bar */}
            <div className="relative h-4 rounded-full bg-white/5 overflow-hidden flex">
              <motion.div
                className="h-full bg-gradient-to-r from-gold via-gold2 to-goldLight"
                initial={{ width: "0%" }}
                animate={{ width: `${upiPct}%` }}
                transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-mint"
                initial={{ width: "0%" }}
                animate={{ width: `${codPct}%` }}
                transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            {/* legend */}
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gold/[0.07] border border-gold/25 px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold shadow-glowGoldSoft" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gold">Online (UPI)</span>
                </div>
                <p className="font-display text-2xl text-gold-metal leading-none">{inr(upi)}</p>
                <p className="text-xs text-muted mt-1.5">
                  {upiPct}% of revenue · {Number(split.upiOrders || 0)} orders
                </p>
              </div>

              <div className="rounded-2xl bg-mint/[0.07] border border-mint/25 px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-mint" />
                  <span className="text-xs font-bold uppercase tracking-wider text-mint">Cash on Delivery</span>
                </div>
                <p className="font-display text-2xl text-cream leading-none">{inr(cod)}</p>
                <p className="text-xs text-muted mt-1.5">
                  {codPct}% of revenue · {Number(split.codOrders || 0)} orders
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
            <p className="text-2xl mb-2">💤</p>
            <p className="text-sm text-muted">No verified payments yet.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---- Custom date range ---- */
function RangeCard() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState(null);

  async function apply(e) {
    e.preventDefault();
    setErr("");
    if (!start || !end) {
      setErr("Select both start and end dates");
      return;
    }
    if (start > end) {
      setErr("Start date must be before end date");
      return;
    }
    setLoading(true);
    try {
      const { stats } = await api.get(`/orders/stats?startDate=${start}&endDate=${end}`);
      setStats(stats.rangeStats && stats.rangeSplit ? { range: stats.rangeStats, split: stats.rangeSplit } : null);
      if (!stats.rangeStats) setErr("No verified orders in this range");
    } catch (err2) {
      setErr(err2.message || "Failed to load range");
    } finally {
      setLoading(false);
    }
  }

  const upi = Number(stats?.split.upiAmount || 0);
  const cod = Number(stats?.split.codAmount || 0);
  const total = upi + cod;
  const upiPct = total > 0 ? Math.round((upi / total) * 100) : 0;
  const codPct = total > 0 ? 100 - upiPct : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
            <RangeIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-xl text-cream leading-none">Custom Date Range</h3>
            <p className="text-xs text-muted mt-1">Revenue & payment split for any period</p>
          </div>
        </div>

        <form onSubmit={apply} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Start date</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-black/30 border-white/10 text-cream focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] [color-scheme:dark] w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">End date</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-black/30 border-white/10 text-cream focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] [color-scheme:dark] w-full"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-3 text-sm transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none shadow-glowGold whitespace-nowrap"
          >
            {loading ? <Spinner className="w-4 h-4" /> : "Apply"}
          </button>
        </form>

        {err && (
          <p className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3">{err}</p>
        )}

        {stats && (
          <div className="mt-6">
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl bg-gold/[0.07] border border-gold/25 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gold mb-1.5">Revenue</p>
                <p className="font-display text-3xl text-gold-metal leading-none">{inr(stats.range.revenue)}</p>
              </div>
              <div className="rounded-2xl bg-mint/[0.07] border border-mint/25 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mint mb-1.5">Orders</p>
                <p className="font-display text-3xl text-cream leading-none">
                  {Number(stats.range.orders).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {total > 0 ? (
              <>
                <div className="relative h-3 rounded-full bg-white/5 overflow-hidden flex">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold via-gold2 to-goldLight"
                    initial={{ width: "0%" }}
                    animate={{ width: `${upiPct}%` }}
                    transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-mint"
                    initial={{ width: "0%" }}
                    animate={{ width: `${codPct}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold" /> UPI {inr(upi)} · {upiPct}%
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="w-2.5 h-2.5 rounded-full bg-mint" /> COD {inr(cod)} · {codPct}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted/70">No verified payments in this range.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---- Last 7 days bar chart ---- */
function BroadcastCard() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function send() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await api.post("/notifications/broadcast", { message: text });
      setMessage("");
      setToast({
        type: "success",
        text: `Broadcast sent to ${res.sent} customer${res.sent === 1 ? "" : "s"}!`
      });
    } catch (err) {
      setToast({ type: "error", text: err.message || "Broadcast failed" });
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
              <BellIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display text-xl text-cream leading-none">Broadcast Alert to Customers</h3>
              <p className="text-xs text-muted mt-1">Tell everyone where the stall is right now</p>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder='e.g., "We are currently in Balasore! Fresh juice ready."'
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-cream placeholder:text-muted/70 resize-none outline-none focus:border-gold/50 transition"
          />
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[11px] text-muted">{message.length}/280</span>
            <Button variant="primary" onClick={send} disabled={!message.trim() || sending} loading={sending}>
              {sending ? "Sending…" : "Send Broadcast"}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-5 inset-x-0 z-[60] flex justify-center pointer-events-none">
            <motion.div
              key={toast.text}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl border ${
                toast.type === "success"
                  ? "bg-forest2 text-mint border-mint/40"
                  : "bg-red-950 text-red-200 border-red-500/40"
              }`}
            >
              {toast.text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ShareCard() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function share() {
    const url = window.location.origin;
    const payload = {
      title: "Sugarcane Juice",
      text: "Order fresh sugarcane juice here!",
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setToast({ type: "success", text: "Link shared!" });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ type: "success", text: "Link copied to clipboard!" });
      }
    } catch (err) {
      // User dismissed the system share sheet — not a failure.
      if (err && err.name === "AbortError") return;
      setToast({ type: "error", text: "Could not share link" });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
              <ShareIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display text-xl text-cream leading-none">Refer & Share</h3>
              <p className="text-xs text-muted mt-1">Grow your orders with one tap</p>
            </div>
          </div>

          <p className="text-sm text-cream/90 leading-relaxed mb-5">
            Share your store link with customers and friends to get more orders!
          </p>

          <button
            onClick={share}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 shadow-glowGold"
          >
            <span className="text-base leading-none">📲</span> Share Website Link
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-5 inset-x-0 z-[60] flex justify-center pointer-events-none">
            <motion.div
              key={toast.text}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl border ${
                toast.type === "success"
                  ? "bg-forest2 text-mint border-mint/40"
                  : "bg-red-950 text-red-200 border-red-500/40"
              }`}
            >
              {toast.text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatShortDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function SevenDayChart({ days }) {
  const list = days && days.length > 0 ? days : [];
  const max = Math.max(...list.map((d) => Number(d.revenue || 0)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
            <ChartIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-xl text-cream leading-none">Last 7 Days Sales</h3>
            <p className="text-xs text-muted mt-1">Verified revenue per day</p>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm text-muted">No sales data yet.</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 sm:gap-3 h-48">
            {list.map((d, i) => {
              const v = Number(d.revenue || 0);
              const pct = v > 0 ? Math.max((v / max) * 100, 6) : 2;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group min-w-0">
                  <span className="text-[10px] font-semibold text-gold-metal mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {inr(v)}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    title={`${d.date}: ${inr(v)} · ${d.orders} order(s)`}
                    className="w-full max-w-[46px] rounded-t-xl bg-gradient-to-t from-goldDark via-gold to-goldLight shadow-glowGoldSoft group-hover:brightness-110 transition group-hover:scale-[1.02]"
                  />
                  <span className="text-[10px] text-muted mt-2 whitespace-nowrap">{formatShortDate(d.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ orders }, { stats }] = await Promise.all([
        api.orders(),
        api.get("/orders/stats")
      ]);
      setOrders(orders || []);
      setStats(stats || {});
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid place-items-center py-32">
        <Spinner className="w-10 h-10" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-3xl mb-3">⛔</p>
        <p className="font-display text-lg text-cream mb-1">Could not load analytics</p>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Button variant="primary" onClick={load}>Retry</Button>
      </Card>
    );
  }

  // Revenue counts only Verified orders — pending payments aren't confirmed yet.
  const totalRevenue = orders
    .filter((o) => o.status === "Verified")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const recent = orders.slice(0, 5);

  // ---- today's collection (verified orders) ----
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const parseLocal = (iso) => {
    if (!iso) return null;
    const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const todayVerified = orders.filter((o) => {
    if (o.status !== "Verified") return false;
    const d = parseLocal(o.createdAt);
    return d ? isSameDay(d, new Date()) : false;
  });

  const cashCollected = todayVerified
    .filter((o) => o.paymentMethod === "COD")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const upiCollected = todayVerified
    .filter((o) => o.paymentMethod === "UPI")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const pendingCod = orders
    .filter((o) => o.status === "Pending" && o.paymentMethod === "COD")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const today = stats?.today || { revenue: 0, orders: 0 };
  const month = stats?.month || { revenue: 0, orders: 0 };
  const paymentSplit = stats?.paymentSplit || { upiAmount: 0, codAmount: 0, upiOrders: 0, codOrders: 0 };

  return (
    <div>
      {/* page intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">Overview</p>
        </div>
        <h3 className="font-display text-2xl text-cream mt-2">Store performance at a glance</h3>
        <p className="text-sm text-muted mt-1">Live figures from your order book.</p>
      </motion.div>

      {/* Period cards — today + month */}
      <motion.div
        variants={cardStagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 mb-10"
      >
        <PeriodCard
          tone="gold"
          label="Today's Sales"
          icon={<SunIcon className="w-5 h-5" />}
          revenue={today.revenue}
          orders={today.orders}
          delay={0}
        />
        <PeriodCard
          tone="mint"
          label="This Month's Sales"
          icon={<MonthIcon className="w-5 h-5" />}
          revenue={month.revenue}
          orders={month.orders}
          delay={1}
        />
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={cardStagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 mb-10"
      >
        <StatCard
          tone="gold"
          label="Total Revenue"
          sub="Verified orders only"
          value={totalRevenue}
          delay={0}
          icon={<RupeeIcon className="w-5 h-5" />}
        />
        <StatCard
          tone="mint"
          label="Total Orders"
          sub="Every order received"
          value={totalOrders}
          delay={1}
          icon={<ReceiptIcon className="w-5 h-5" />}
        />
        <StatCard
          tone="amber"
          label="Pending Orders"
          sub="Awaiting payment verification"
          value={pendingOrders}
          delay={2}
          icon={<ClockIcon className="w-5 h-5" />}
        />
      </motion.div>

      {/* Payment split */}
      <div className="mb-10">
        <PaymentSplit split={paymentSplit} />
      </div>

      {/* Custom date range */}
      <div className="mb-10">
        <RangeCard />
      </div>

      {/* Last 7 days sales graph */}
      <div className="mb-10">
        <SevenDayChart days={stats?.last7Days || []} />
      </div>

      {/* Owner broadcast */}
      <div className="mb-10">
        <BroadcastCard />
      </div>

      {/* Refer & share */}
      <div className="mb-10">
        <ShareCard />
      </div>

      {/* Today's collection (verified orders) */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

          <div className="relative p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
                <RupeeIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-xl text-cream leading-none">Today's Collection (Verified Orders)</h3>
                <p className="text-xs text-muted mt-1">Cash vs UPI realised today · pending COD owed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">
                  <span className="text-base">💵</span> Cash Collected
                </div>
                <p className="font-display text-2xl text-gold-metal">{inr(cashCollected)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">
                  <span className="text-base">📱</span> UPI Collected
                </div>
                <p className="font-display text-2xl text-gold-metal">{inr(upiCollected)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">
                  <span className="text-base">⏳</span> Pending COD
                </div>
                <p className="font-display text-2xl text-gold-metal">{inr(pendingCod)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
          {/* gold hairline on top edge */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

          <div className="relative flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold">
                <ReceiptIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-xl text-cream leading-none">Recent Orders</h3>
                <p className="text-xs text-muted mt-1">Latest 5 in the queue</p>
              </div>
            </div>
            <Badge tone="gray">Latest {recent.length}</Badge>
          </div>

          {recent.length === 0 ? (
            <EmptyState title="No orders yet" sub="Orders will appear here once customers place them." />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-3.5 font-bold">Order</th>
                    <th className="px-6 py-3.5 font-bold">Customer</th>
                    <th className="px-6 py-3.5 font-bold text-right">Amount</th>
                    <th className="px-6 py-3.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="group transition-colors duration-300 hover:bg-gold/[0.05]"
                    >
                      <td className="relative px-6 py-4 font-semibold text-gold2">
                        {/* gold hover marker */}
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-goldLight via-gold to-goldDark opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-glowGoldSoft" />
                        #{o.id}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-cream">{o.customerName}</p>
                        <p className="text-xs text-muted mt-0.5">{o.customerPhone}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-cream">{inr(o.totalAmount)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge tone={o.status === "Verified" ? "green" : "gold"}>
                          {o.status}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ---- inline icons ---- */

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

function RupeeIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a6 6 0 0 0 0-12H6" />
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

function ClockIcon(p) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </IconBase>
  );
}

function SunIcon(p) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </IconBase>
  );
}

function MonthIcon(p) {
  return (
    <IconBase {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </IconBase>
  );
}

function SplitIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 4 4 5-6" />
    </IconBase>
  );
}

function RangeIcon(p) {
  return (
    <IconBase {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16h2M13 16h2" />
    </IconBase>
  );
}

function ChartIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 15l3-4 3 2 5-7" />
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

function ShareIcon(p) {
  return (
    <IconBase {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </IconBase>
  );
}
