import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Card, Button, EmptyState, Spinner } from "../components/ui";

const REVIEW_STARS = [1, 2, 3, 4, 5];

function Stars({ value, size = "text-lg" }) {
  return (
    <div className="flex items-center gap-0.5">
      {REVIEW_STARS.map((n) => (
        <span key={n} className={`${size} leading-none ${n <= value ? "" : "opacity-20 grayscale"}`}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function formatDate(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return createdAt;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

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

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
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
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.del(`/reviews/${deleteTarget.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast(`Review by ${deleteTarget.customerName} deleted`);
    } catch (err) {
      setDeleteError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
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
        <p className="font-display text-lg text-cream mb-1">Could not load reviews</p>
        <p className="text-muted text-sm mb-6">{loadError}</p>
        <Button variant="primary" onClick={load}>Retry</Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl text-cream">Customer Reviews</h3>
          <p className="text-sm text-muted mt-1">What customers are saying about the stall.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold border border-gold/30 bg-gold/10 rounded-full px-4 py-2">
          ⭐ {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
        </span>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <EmptyState icon="⭐" title="No reviews yet" sub="Customer reviews will appear here once submitted." />
        </Card>
      ) : (
        <>
          {/* ===== Desktop table (glass) ===== */}
          <div className="relative hidden md:block overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 blur-3xl" />

            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-3.5 font-bold">Customer</th>
                    <th className="px-6 py-3.5 font-bold">Rating</th>
                    <th className="px-6 py-3.5 font-bold">Comment</th>
                    <th className="px-6 py-3.5 font-bold">Date</th>
                    <th className="px-6 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="group transition-all duration-300 hover:bg-gold/[0.045] hover:shadow-[inset_0_0_32px_-16px_rgba(245,158,11,0.35)]"
                    >
                      <td className="relative px-6 py-4">
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-gradient-to-b from-goldLight via-gold to-goldDark opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-glowGoldSoft" />
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 shrink-0 rounded-xl bg-gold/10 border border-gold/25 grid place-items-center text-sm font-bold text-gold-metal">
                            {(r.customerName || "?").charAt(0).toUpperCase()}
                          </span>
                          <span className="text-cream font-semibold">{r.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Stars value={r.rating} />
                      </td>
                      <td className="px-6 py-4 text-muted max-w-[340px]">
                        <p className="line-clamp-3">{r.comment || "—"}</p>
                      </td>
                      <td className="px-6 py-4 text-muted whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="w-8 h-8 grid place-items-center rounded-full bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)] transition"
                            aria-label={`Delete review by ${r.customerName}`}
                            title="Delete review"
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
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  <div className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gold/8 blur-3xl" />

                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-base font-bold text-gold-metal">
                          {(r.customerName || "?").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-cream">{r.customerName}</p>
                          <Stars value={r.rating} size="text-sm" />
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)] transition"
                        aria-label={`Delete review by ${r.customerName}`}
                        title="Delete review"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {r.comment && (
                      <p className="text-sm text-muted leading-relaxed">{r.comment}</p>
                    )}

                    <p className="mt-4 text-xs text-muted/60">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ===== Delete confirm modal (glass) ===== */}
      <GlassModal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Review">
        {deleteTarget && (
          <>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-5 text-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-muted">Customer</span>
                <span className="text-cream font-semibold">{deleteTarget.customerName}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-muted">Rating</span>
                <span className="text-gold"><Stars value={deleteTarget.rating} size="text-sm" /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Date</span>
                <span className="text-cream">{formatDate(deleteTarget.createdAt)}</span>
              </div>
            </div>

            <p className="text-sm text-muted mb-6">
              This will permanently remove the review. This cannot be undone.
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
            <div className="relative rounded-[26.5px] bg-forest2/85 backdrop-blur-2xl p-6 overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-gold/10 blur-3xl" />
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
