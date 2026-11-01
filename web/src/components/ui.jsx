import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";

export function Spinner({ className = "w-5 h-5" }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-current/30 border-t-current animate-spin ${className}`}
    />
  );
}

export function Button({ children, variant = "primary", loading, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-full transition disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-gold text-forest hover:bg-gold2 shadow-lg shadow-gold/20 px-6 py-3 text-sm",
    ghost: "bg-white/5 text-cream border border-white/10 hover:border-gold/50 px-5 py-2.5 text-sm",
    danger: "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 px-4 py-2 text-sm",
    small: "bg-white/5 text-cream border border-white/10 hover:border-gold/50 px-3 py-1.5 text-xs"
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={loading} {...props}>
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/[0.04] border border-white/10 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ tone = "gold", children }) {
  const tones = {
    gold: "bg-gold/15 text-gold border-gold/30",
    green: "bg-mint/15 text-mint border-mint/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    gray: "bg-white/5 text-muted border-white/10"
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} bg-forest2 border border-white/10 rounded-3xl p-6 shadow-card max-h-[88vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl">{title}</h3>
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ icon = "🍹", title, sub }) {
  return (
    <div className="text-center py-14">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-display text-lg text-cream">{title}</p>
      {sub && <p className="text-muted text-sm mt-1">{sub}</p>}
    </div>
  );
}

export function ImageUpload({ value, onChange, label = "Image" }) {
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
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <img src={value} alt="Uploaded" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-full border border-white/10 bg-white/5 text-cream px-4 py-2 hover:border-gold/50 transition disabled:opacity-50"
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
          className="w-full h-28 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] grid place-items-center text-sm text-muted hover:border-gold/40 hover:text-cream transition disabled:opacity-50"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="w-4 h-4" /> Uploading…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-semibold">⬆️ Upload image</span>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs text-red-300 mt-1.5">{error}</p>}
    </div>
  );
}
