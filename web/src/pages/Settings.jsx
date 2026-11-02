import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { Card, Button, Spinner } from "../components/ui";

const emptySettings = {
  phone: "",
  whatsapp: "",
  instagram: "",
  telegram: "",
  locationUrl: "",
  pincode: "",
  exactLocation: "",
  upiId: "",
  qrCodeUrl: "",
  heroImageUrl: ""
};

export default function Settings() {
  const [form, setForm] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  // security — change password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { settings } = await api.settings();
      setForm({
        phone: settings.phone || "",
        whatsapp: settings.whatsapp || "",
        instagram: settings.instagram || "",
        telegram: settings.telegram || "",
        locationUrl: settings.locationUrl || "",
        pincode: settings.pincode || "",
        exactLocation: settings.exactLocation || "",
        upiId: settings.upiId || "",
        qrCodeUrl: settings.qrCodeUrl || "",
        heroImageUrl: settings.heroImageUrl || ""
      });
    } catch (err) {
      setLoadError(err.message || "Failed to load settings");
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

  async function changePassword(e) {
    e.preventDefault();
    setPwError("");
    if (pw.next.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError("New passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pw.current,
        newPassword: pw.next
      });
      setToast("Password updated successfully");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err.message || "Could not update password");
    } finally {
      setPwSaving(false);
    }
  }

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    if (!form.upiId.trim()) {
      setSaveError("UPI ID is required — it powers the customer payment QR code");
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings({
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        instagram: form.instagram.trim(),
        telegram: form.telegram.trim(),
        locationUrl: form.locationUrl.trim(),
        pincode: form.pincode.trim(),
        exactLocation: form.exactLocation.trim(),
        upiId: form.upiId.trim(),
        qrCodeUrl: form.qrCodeUrl.trim(),
        heroImageUrl: form.heroImageUrl.trim()
      });
      setToast("Settings Saved! Refresh customer page to see changes");
    } catch (err) {
      setSaveError(err.message || "Save failed");
    } finally {
      setSaving(false);
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
        <p className="font-display text-lg text-cream mb-1">Could not load settings</p>
        <p className="text-muted text-sm mb-6">{loadError}</p>
        <Button variant="primary" onClick={load}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* page intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">Configuration</p>
        </div>
        <h3 className="font-display text-2xl text-cream mt-2">Stall Settings</h3>
        <p className="text-sm text-muted mt-1">
          Contact details and payment info shown on the customer site.
        </p>
      </motion.div>

      {/* ===== Glass form container ===== */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gold/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-mint/6 blur-3xl" />

        <form onSubmit={handleSave} className="relative p-6 sm:p-8">
          {/* ---- Group: Direct Contact ---- */}
          <SectionTitle icon="📞" title="Direct Contact" sub="Where customers can reach you" />
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5 mb-8">
            <SleekField label="Phone Number">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <SleekField label="WhatsApp Number">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="+91 98765 43210"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
          </div>

          {/* ---- Group: Social & Location ---- */}
          <SectionTitle icon="🌐" title="Social & Location" sub="Links shown in the homepage footer" />
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5 mb-8">
            <SleekField label="Instagram Link">
              <input
                type="url"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="https://instagram.com/yourpage"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <SleekField label="Telegram Link">
              <input
                type="url"
                value={form.telegram}
                onChange={(e) => set("telegram", e.target.value)}
                placeholder="https://t.me/yourhandle"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <div className="sm:col-span-2">
              <SleekField label="Google Maps Embed URL">
                <input
                  type="url"
                  value={form.locationUrl}
                  onChange={(e) => set("locationUrl", e.target.value)}
                  placeholder="https://www.google.com/maps?q=…&output=embed"
                  className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                />
              </SleekField>
              <p className="-mt-3 mb-0 text-xs text-muted/70 pl-1">
                Use the share → embed URL from Google Maps (ends with{" "}
                <span className="text-muted">output=embed</span>).
              </p>
            </div>
            <SleekField label="Shop Pincode">
              <input
                type="text"
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="e.g. 110001"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <div className="sm:col-span-2">
              <SleekField label="Google Maps Link (exact location)">
                <input
                  type="url"
                  value={form.exactLocation}
                  onChange={(e) => set("exactLocation", e.target.value)}
                  placeholder="https://maps.app.goo.gl/…"
                  className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                />
              </SleekField>
              <p className="-mt-3 mb-0 text-xs text-muted/70 pl-1">
                Use the Google Maps share link. Customers tap the footer map to open this exact location.
              </p>
            </div>
          </div>

          {/* ---- Group: UPI (glowing gold highlight) ---- */}
          <SectionTitle icon="💰" title="Payments" sub="UPI powers the customer payment QR code" />
          <div className="relative rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/[0.08] to-transparent p-5 sm:p-6 mb-8 shadow-[0_0_45px_-14px_rgba(245,158,11,0.55)]">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-goldLight/80 to-transparent" />
            <div className="pointer-events-none absolute -top-14 -right-14 w-40 h-40 rounded-full bg-gold/15 blur-3xl" />

            <div className="relative flex items-start gap-3.5 mb-4">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-gold-metal grid place-items-center text-lg shadow-glowGold">
                🏦
              </span>
              <div>
                <p className="font-display text-lg text-gold-metal leading-tight">UPI ID</p>
                <p className="text-xs text-muted mt-1">
                  Critical — generates the customer's payment QR at checkout. Double-check this.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => set("upiId", e.target.value)}
                placeholder="kunal@okaxis"
                className="bg-black/40 border-gold/30 text-goldLight font-semibold tracking-wide placeholder:text-muted/40 focus:border-gold/80 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
              />
            </div>
          </div>

          {/* ---- Group: Payment QR code ---- */}
          <SectionTitle icon="📱" title="Payment QR Code" sub="Your UPI app QR — used at checkout" />
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 mb-8">
            <SettingsImageUpload
              label="Payment QR code image"
              value={form.qrCodeUrl}
              onChange={(url) => set("qrCodeUrl", url)}
            />
            <p className="mt-3 text-xs text-muted/70 pl-1">
              Upload your Google Pay / PhonePe / Paytm QR screenshot. Leave empty to auto-generate
              from the UPI ID above.
            </p>
          </div>

          {/* ---- Group: Homepage hero ---- */}
          <SectionTitle icon="🖼️" title="Homepage Hero" sub="Backdrop of the customer site hero" />
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 mb-8">
            <SettingsImageUpload
              label="Hero background image"
              value={form.heroImageUrl}
              onChange={(url) => set("heroImageUrl", url)}
            />
            <p className="mt-3 text-xs text-muted/70 pl-1">
              Shown as the backdrop of the customer homepage hero. Landscape works best.
            </p>
          </div>

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3"
            >
              {saveError}
            </motion.div>
          )}

          {/* ---- Save ---- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
            <p className="text-xs text-muted/70">
              Customers will see changes after refreshing the homepage.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gold-metal text-forest font-bold rounded-2xl px-10 py-4 text-sm transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none shadow-glowGold"
            >
              {saving ? (
                <>
                  <Spinner className="w-4 h-4" /> Saving…
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" /> Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* ===== Security — change password ===== */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glass mt-8"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gold/8 blur-3xl" />

        <form onSubmit={changePassword} className="relative p-6 sm:p-8">
          <SectionTitle icon="🔒" title="Security — Change Password" sub="Keep your admin account safe" />

          {pwError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3"
            >
              {pwError}
            </motion.div>
          )}

          <div className="grid gap-y-5 mb-8">
            <SleekField label="Current Password">
              <input
                type="password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <SleekField label="New Password">
              <input
                type="password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
            <SleekField label="Confirm New Password">
              <input
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="bg-black/30 border-white/10 focus:border-gold/70 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
              />
            </SleekField>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gold-metal text-forest font-bold rounded-2xl px-10 py-4 text-sm transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none shadow-glowGold"
            >
              {pwSaving ? (
                <>
                  <Spinner className="w-4 h-4" /> Updating…
                </>
              ) : (
                <>Update Password</>
              )}
            </button>
          </div>
        </form>
      </motion.div>

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
    </div>
  );
}

/* ================= Local building blocks ================= */

function SectionTitle({ icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 grid place-items-center text-base shrink-0">
        {icon}
      </span>
      <div>
        <p className="font-bold text-cream leading-tight">{title}</p>
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function SleekField({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{label}</span>
      {children}
    </label>
  );
}

/* ---- elegant hero image upload (dashed / hover glow) ---- */

function SettingsImageUpload({ value, onChange, label = "Image" }) {
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
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-4 transition hover:border-gold/40">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(245,158,11,0.08),transparent_50%)]" />
          <img
            src={value}
            alt="Uploaded hero"
            className="relative w-20 h-14 rounded-xl object-cover border border-white/10 shadow-glass"
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
          className="group w-full h-36 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] grid place-items-center transition hover:border-gold/50 hover:bg-gold/[0.04] hover:shadow-[0_0_24px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50"
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

function SaveIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </IconBase>
  );
}
