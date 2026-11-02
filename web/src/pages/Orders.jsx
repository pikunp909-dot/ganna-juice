import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Card, Badge, Button, EmptyState, Spinner } from "../components/ui";

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" }
];

const DELIVERY_STEPS = ["Pending", "Preparing", "Out for Delivery", "Delivered"];

function TrashIcon({ className = "w-4 h-4" }) {
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
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

function formatDate(createdAt) {
  if (!createdAt) return "—";
  // SQLite datetime('now') is UTC — append Z to treat as UTC, render local.
  const d = new Date(createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return createdAt;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function summarizeItems(items) {
  if (!items || items.length === 0) return "—";
  const head = items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ");
  const rest = items.length - 2;
  return rest > 0 ? `${head} +${rest} more` : head;
}

function DeliveryStepper({ order, busy, onUpdate }) {
  const idx = DELIVERY_STEPS.indexOf(order.deliveryStatus);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DELIVERY_STEPS.map((step, i) => {
        const active = i === idx;
        const done = idx > i;
        return (
          <button
            key={step}
            disabled={busy}
            onClick={() => onUpdate(order, step)}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-full border transition ${
              active
                ? "bg-gold-metal text-forest border-gold shadow-glowGoldSoft"
                : done
                  ? "text-mint border-mint/40 bg-mint/10 hover:bg-mint/20"
                  : "text-muted border-white/10 bg-white/[0.03] hover:text-cream hover:border-gold/40"
            }`}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [verifyTarget, setVerifyTarget] = useState(null);
  const [utr, setUtr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [updatingId, setUpdatingId] = useState(null);

  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { orders } = await api.orders();
      setOrders(orders || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = orders.filter((o) =>
    filter === "all" ? true : filter === "pending" ? o.status === "Pending" : o.status === "Verified"
  );

  const countFor = (key) =>
    key === "all"
      ? orders.length
      : orders.filter((o) => (key === "pending" ? o.status === "Pending" : o.status === "Verified")).length;

  function openVerify(order) {
    setVerifyTarget(order);
    setUtr(order.utrNumber || "");
    setVerifyError("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteOrder(deleteTarget.id);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast(`Order #${deleteTarget.id} deleted`);
    } catch (err) {
      setDeleteError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmVerify() {
    if (!verifyTarget) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await api.patch(`/orders/${verifyTarget.id}/verify`, { utrNumber: utr.trim() });
      setVerifyTarget(null);
      setToast(`Payment verified for order #${verifyTarget.id}`);
      await load();
    } catch (err) {
      setVerifyError(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function changeStatus(order, next) {
    if (order.deliveryStatus === next || updatingId) return;
    setUpdatingId(order.id);
    try {
      await api.updateOrderStatus(order.id, next);
      setOrders((prev) =>
        prev.map((x) => (x.id === order.id ? { ...x, deliveryStatus: next } : x))
      );
      setToast(`Order #${order.id} → ${next}`);
    } catch (err) {
      setToast(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="grid place-items-center py-32">
        <Spinner className="w-10 h-10" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="p-10 text-center">
        <p className="text-3xl mb-3">⛔</p>
        <p className="font-display text-lg text-cream mb-1">Could not load orders</p>
        <p className="text-muted text-sm mb-6">{loadError}</p>
        <Button variant="primary" onClick={load}>Retry</Button>
      </Card>
    );
  }

  const emptyText =
    filter === "all"
      ? "No orders yet"
      : filter === "pending"
        ? "No pending orders right now"
        : "No verified orders yet";

  return (
    <div>
      {/* Header + segmented filter control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl text-cream">Order Receipts</h3>
          <p className="text-sm text-muted mt-1">Check UTR numbers and verify payments.</p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-inner p-1.5 self-start">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-colors ${
                  active ? "text-forest" : "text-muted hover:text-cream"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="orders-filter-pill"
                    className="absolute inset-0 rounded-full bg-gold-metal shadow-glowGold"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {f.label} <span className="opacity-70">({countFor(f.key)})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🧾" title={emptyText} sub="Verified orders move to the revenue tally." />
        </Card>
      ) : (
        <>
          {/* ===== Desktop table (glass) ===== */}
          <div className="relative hidden md:block overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-3.5 font-bold">Order</th>
                    <th className="px-6 py-3.5 font-bold">Date</th>
                    <th className="px-6 py-3.5 font-bold">Customer</th>
                    <th className="px-6 py-3.5 font-bold">Items</th>
                    <th className="px-6 py-3.5 font-bold text-right">Total</th>
                    <th className="px-6 py-3.5 font-bold">UTR</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold">Delivery</th>
                    <th className="px-6 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="group transition-all duration-300 hover:bg-gold/[0.045] hover:shadow-[inset_0_0_32px_-16px_rgba(245,158,11,0.35)]"
                    >
                      <td className="relative px-6 py-4 font-semibold text-gold2">
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-gradient-to-b from-goldLight via-gold to-goldDark opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-glowGoldSoft" />
                        #{o.id}
                      </td>
                      <td className="px-6 py-4 text-muted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="px-6 py-4">
                        <p className="text-cream">{o.customerName}</p>
                        <p className="text-xs text-muted">{o.customerPhone}</p>
                      </td>
                      <td className="px-6 py-4 text-muted max-w-[220px]">
                        <p className="line-clamp-2">{summarizeItems(o.items)}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-cream">{inr(o.totalAmount)}</td>
                      <td className="px-6 py-4 text-muted">{o.utrNumber || "—"}</td>
                      <td className="px-6 py-4">
                        <Badge tone={o.status === "Verified" ? "green" : "gold"}>{o.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <DeliveryStepper order={o} busy={updatingId === o.id} onUpdate={changeStatus} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {o.status === "Pending" && (
                            <button
                              onClick={() => openVerify(o)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-gold/30 bg-gold/10 text-gold px-4 py-2 transition hover:border-gold/60 hover:shadow-glowGoldSoft hover:bg-gold/15"
                            >
                              <VerifyIcon className="w-3.5 h-3.5" /> Verify Payment
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(o)}
                            className="w-8 h-8 grid place-items-center rounded-full bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)] transition"
                            aria-label={`Delete order ${o.id}`}
                            title="Delete order"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== Mobile cards (floating glass panels) ===== */}
          <div className="md:hidden grid gap-5">
            {filtered.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  <div className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gold/8 max-lg:hidden blur-3xl" />

                  <div className="relative p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-display text-xl text-gold2">#{o.id}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={o.status === "Verified" ? "green" : "gold"}>{o.status}</Badge>
                        <button
                          onClick={() => setDeleteTarget(o)}
                          className="w-8 h-8 grid place-items-center rounded-full bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)] transition"
                          aria-label={`Delete order ${o.id}`}
                          title="Delete order"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">Date</span>
                        <span className="text-cream text-right">{formatDate(o.createdAt)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">Customer</span>
                        <span className="text-cream text-right">
                          {o.customerName}<br />
                          <span className="text-xs text-muted">{o.customerPhone}</span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">Items</span>
                        <span className="text-cream text-right">{summarizeItems(o.items)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">Total</span>
                        <span className="font-semibold text-gold-metal">{inr(o.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted">UTR</span>
                        <span className="text-cream text-right">{o.utrNumber || "—"}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <DeliveryStepper order={o} busy={updatingId === o.id} onUpdate={changeStatus} />
                    </div>

                    {o.status === "Pending" && (
                      <button
                        onClick={() => openVerify(o)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-3.5 text-sm transition hover:brightness-110 shadow-glowGold"
                      >
                        <VerifyIcon className="w-4 h-4" /> Verify Payment
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ===== Verify modal (glass) ===== */}
      <GlassModal
        open={!!verifyTarget}
        onClose={() => !verifying && setVerifyTarget(null)}
        title="Verify Payment"
      >
        {verifyTarget && (
          <>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-5 text-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-muted">Order</span>
                <span className="font-semibold text-gold2">#{verifyTarget.id}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-muted">Customer</span>
                <span className="text-cream">{verifyTarget.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Amount</span>
                <span className="text-cream font-semibold">{inr(verifyTarget.totalAmount)}</span>
              </div>
            </div>

            <label className="block mb-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                UTR Number <span className="normal-case font-normal opacity-60">(required)</span>
              </span>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 415298741023"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] tracking-[0.08em]"
              />
            </label>

            {verifyError && (
              <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                {verifyError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setVerifyTarget(null)} disabled={verifying}>Cancel</Button>
              <Button variant="primary" loading={verifying} onClick={confirmVerify}>
                {verifying ? "Verifying…" : "Confirm Verified"}
              </Button>
            </div>
          </>
        )}
      </GlassModal>

      {/* ===== Delete confirm modal (glass) ===== */}
      <GlassModal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Order">
        {deleteTarget && (
          <>
            <p className="text-sm text-muted mb-6">
              Delete order <span className="text-cream font-semibold">#{deleteTarget.id}</span> (
              {deleteTarget.customerName}, {inr(deleteTarget.totalAmount)})? This cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </>
        )}
      </GlassModal>

      {/* ===== Success toast ===== */}
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
    </div>
  );
}

/* ================= Glass modal (deep blur + gold border) ================= */

function GlassModal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[28px] p-[1.5px] bg-gradient-to-br from-goldLight via-gold/60 to-goldDark shadow-card"
          >
            <div className="relative rounded-[26.5px] bg-forest2/85 backdrop-blur-md p-6 overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-gold/10 max-lg:hidden blur-3xl" />
              <div className="relative flex items-center justify-between mb-5">
                <h3 className="font-display text-2xl text-cream">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:bg-white/10"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="relative max-h-[72vh] overflow-y-auto pr-1">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

function VerifyIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </IconBase>
  );
}
