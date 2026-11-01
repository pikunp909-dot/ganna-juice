import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
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
        className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass transition-all duration-500 ${t.border}`}
      >
        {/* soft gradient wash */}
        <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`} />

        {/* glow orb */}
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl ${t.orb} ${t.orbGlow} transition-transform duration-700 group-hover:scale-125`} />

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

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { orders } = await api.orders();
      setOrders(orders || []);
    } catch (err) {
      setError(err.message || "Failed to load orders");
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

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass">
          {/* gold hairline on top edge */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 blur-3xl" />

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
