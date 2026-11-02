import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Card, Badge, Button, Field, EmptyState, Spinner } from "../components/ui";

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const emptyForm = { name: "", price: "", description: "", imageUrl: "" };

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // item or null => new
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { items } = await api.menu();
      setItems(items || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- open / close form modal ---- */

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      price: String(item.price),
      description: item.description || "",
      imageUrl: item.imageUrl || ""
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  /* ---- save (create / update) ---- */

  async function handleSave(e) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) return setFormError("Name is required");
    if (!Number.isFinite(price) || price < 0) return setFormError("Enter a valid price");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      imageUrl: form.imageUrl.trim()
    };

    setSaving(true);
    setFormError("");
    try {
      const { item } = editing
        ? await api.updateMenuItem(editing.id, payload)
        : await api.createMenuItem(payload);
      setItems((prev) =>
        editing
          ? prev.map((i) => (i.id === item.id ? item : i))
          : [...prev, item]
      );
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ---- toggle availability (optimistic) ---- */

  async function toggleAvailability(item) {
    setTogglingId(item.id);
    setActionError("");
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: i.isAvailable ? 0 : 1 } : i))
    );
    try {
      const { item: updated } = await api.toggleMenuItem(item.id);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      setActionError(err.message || "Toggle failed — reverted");
    } finally {
      setTogglingId(null);
    }
  }

  /* ---- delete ---- */

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      await api.deleteMenuItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err.message || "Delete failed");
      setDeleteTarget(null);
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
        <p className="font-display text-lg text-cream mb-1">Could not load menu</p>
        <p className="text-muted text-sm mb-6">{loadError}</p>
        <Button variant="primary" onClick={load}>Retry</Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl text-cream">Menu Items</h3>
          <p className="text-sm text-muted mt-1">Manage what customers see on the stall menu.</p>
        </div>
        <Button variant="primary" onClick={openNew}>+ Add New Item</Button>
      </div>

      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur-md"
        >
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-red-300/70 hover:text-red-200 ml-4">✕</button>
        </motion.div>
      )}

      {/* ===== Glass table container ===== */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gold/8 blur-3xl" />

        {items.length === 0 ? (
          <EmptyState title="No menu items yet" sub="Add your first item to start selling." />
        ) : (
          <>
          <div className="relative hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-3.5 font-bold w-16">Image</th>
                  <th className="px-6 py-3.5 font-bold">Name</th>
                  <th className="px-6 py-3.5 font-bold hidden md:table-cell">Description</th>
                  <th className="px-6 py-3.5 font-bold text-right">Price</th>
                  <th className="px-6 py-3.5 font-bold text-center hidden sm:table-cell">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="group transition-all duration-300 hover:bg-gold/[0.045] hover:shadow-[inset_0_0_32px_-16px_rgba(245,158,11,0.35)]"
                  >
                    <td className="relative px-6 py-4 w-16">
                      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-goldLight via-gold to-goldDark opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-glowGoldSoft" />
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-glass"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-xl">
                          🍹
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-cream">{item.name}</p>
                      <p className="text-xs text-muted mt-0.5 md:hidden">{item.description}</p>
                    </td>
                    <td className="px-6 py-4 text-muted max-w-[260px] hidden md:table-cell">
                      <p className="line-clamp-2">{item.description || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gold2">{inr(item.price)}</td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <Badge tone={item.isAvailable ? "green" : "gray"}>
                        {item.isAvailable ? "Available" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* premium gold/emerald iOS switch */}
                        <button
                          role="switch"
                          aria-checked={!!item.isAvailable}
                          aria-label={`Toggle ${item.name} availability`}
                          onClick={() => toggleAvailability(item)}
                          disabled={togglingId === item.id}
                          className={`relative w-12 h-7 rounded-full transition-all duration-300 shrink-0 disabled:opacity-60 group/switch ${
                            item.isAvailable
                              ? "bg-gradient-to-r from-mint to-emerald-400 shadow-[0_0_18px_-4px_rgba(63,165,102,0.6)]"
                              : "bg-white/10 border border-white/15"
                          }`}
                        >
                          {togglingId === item.id ? (
                            <span className="absolute inset-0 grid place-items-center">
                              <Spinner className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <motion.span
                              className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full grid place-items-center text-[9px] font-black transition-all duration-300 ${
                                item.isAvailable
                                  ? "translate-x-5 bg-gold-metal text-forest shadow-glowGoldSoft"
                                  : "translate-x-0 bg-white/40 text-transparent"
                              }`}
                              layout
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              ✓
                            </motion.span>
                          )}
                        </button>

                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-white/10 bg-white/5 text-cream px-4 py-2 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft hover:bg-gold/10"
                        >
                          <PencilIcon className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-red-500/25 bg-red-500/10 text-red-300 px-4 py-2 transition hover:bg-red-500/25 hover:border-red-500/50 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)]"
                        >
                          <TrashIcon className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== Mobile cards (glass panels) ===== */}
          <div className="md:hidden grid gap-5">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  <div className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gold/8 blur-3xl" />

                  <div className="relative p-5">
                    {/* top row: image, name, availability badge */}
                    <div className="flex items-center gap-3.5">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-glass shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-2xl shrink-0">
                          🍹
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-cream text-base leading-snug truncate">{item.name}</p>
                        <div className="mt-1.5">
                          <Badge tone={item.isAvailable ? "green" : "gray"}>
                            {item.isAvailable ? "Available" : "Out of Stock"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* description + price */}
                    <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                      <p className="text-sm text-muted leading-relaxed line-clamp-2">
                        {item.description || "—"}
                      </p>
                      <div className="flex items-end justify-between gap-3">
                        <span className="text-xs text-muted uppercase tracking-wider font-semibold">Price</span>
                        <span className="font-display text-2xl text-gold-metal">{inr(item.price)}</span>
                      </div>
                    </div>

                    {/* action row: toggle, edit, delete */}
                    <div className="mt-4 flex items-center gap-2.5">
                      <button
                        role="switch"
                        aria-checked={!!item.isAvailable}
                        aria-label={`Toggle ${item.name} availability`}
                        onClick={() => toggleAvailability(item)}
                        disabled={togglingId === item.id}
                        className={`relative w-12 h-7 rounded-full transition-all duration-300 shrink-0 disabled:opacity-60 group/switch ${
                          item.isAvailable
                            ? "bg-gradient-to-r from-mint to-emerald-400 shadow-[0_0_18px_-4px_rgba(63,165,102,0.6)]"
                            : "bg-white/10 border border-white/15"
                        }`}
                      >
                        {togglingId === item.id ? (
                          <span className="absolute inset-0 grid place-items-center">
                            <Spinner className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <motion.span
                            className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full grid place-items-center text-[9px] font-black transition-all duration-300 ${
                              item.isAvailable
                                ? "translate-x-5 bg-gold-metal text-forest shadow-glowGoldSoft"
                                : "translate-x-0 bg-white/40 text-transparent"
                            }`}
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </button>

                      <button
                        onClick={() => openEdit(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-full border border-white/10 bg-white/5 text-cream px-4 py-2.5 transition hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft hover:bg-gold/10"
                      >
                        <PencilIcon className="w-3.5 h-3.5" /> Edit
                      </button>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-full border border-red-500/25 bg-red-500/10 text-red-300 px-4 py-2.5 transition hover:bg-red-500/25 hover:border-red-500/50 hover:shadow-[0_0_18px_-6px_rgba(239,68,68,0.6)]"
                      >
                        <TrashIcon className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* ===== Add/Edit modal (glass + gold border) ===== */}
      <GlassModal open={modalOpen} onClose={closeModal} title={editing ? "Edit Item" : "Add New Item"}>
        <form onSubmit={handleSave}>
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Classic Ganna"
              className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              autoFocus
            />
          </Field>

          <Field label="Price (₹)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="30"
              className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
            />
          </Field>

          <div className="mb-5">
            <MenuImageUpload
              label="Image"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What makes it special?"
              className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] resize-none"
            />
          </Field>

          {formError && (
            <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </GlassModal>

      {/* ===== Delete confirm modal ===== */}
      <GlassModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Item">
        <p className="text-sm text-muted mb-6">
          Are you sure you want to delete <span className="text-cream font-semibold">“{deleteTarget?.name}”</span>?
          This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </GlassModal>
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

/* ================= Elegant image upload ================= */

function MenuImageUpload({ value, onChange, label = "Image" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{label}</span>

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-4 transition hover:border-gold/40 group">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.08),transparent_50%)]" />
          <img
            src={value}
            alt="Uploaded"
            className="relative w-16 h-16 rounded-xl object-cover border border-white/10 shadow-glass"
          />
          <div className="relative flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-full border border-white/10 bg-white/5 text-cream px-4 py-2 hover:border-gold/50 hover:text-gold hover:shadow-glowGoldSoft transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Spinner className="w-3.5 h-3.5" /> Uploading…
                </>
              ) : (
                "Replace"
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="text-xs font-semibold text-muted hover:text-red-300 transition disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="group w-full h-32 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] grid place-items-center transition hover:border-gold/50 hover:bg-gold/[0.04] hover:shadow-[0_0_24px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <Spinner className="w-4 h-4" /> Uploading…
            </span>
          ) : (
            <span className="flex flex-col items-center gap-2">
              <span className="w-11 h-11 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-lg text-gold transition-transform duration-300 group-hover:scale-110">
                ⬆️
              </span>
              <span className="text-sm font-semibold text-muted group-hover:text-cream transition-colors">
                Upload image
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted/60">PNG · JPG · WebP</span>
            </span>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs text-red-300 mt-1.5">{error}</p>}
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

function PencilIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </IconBase>
  );
}

function TrashIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </IconBase>
  );
}
