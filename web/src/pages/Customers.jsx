import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useLanguage } from "../language";
import { Spinner, Card, Button } from "../components/ui";

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const waLink = (phone, name) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "#";
  const text = encodeURIComponent(`Hi ${name}, this is your sugarcane juice store!`);
  return `https://wa.me/${digits}?text=${text}`;
};

const avatar = (name) => String(name || "?").trim().charAt(0).toUpperCase() || "?";

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { customers } = await api.customers();
      setCustomers(customers || []);
    } catch (err) {
      setError(err.message || "Failed to load customers");
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
        <p className="font-display text-lg text-cream mb-1">{t("customersLoadFailed")}</p>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Button variant="primary" onClick={load}>{t("retry")}</Button>
      </Card>
    );
  }

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
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">{t("customersTitle")}</p>
        </div>
        <h3 className="font-display text-2xl text-cream mt-2">{t("customersSub")}</h3>
        <p className="text-sm text-muted mt-1">
          {t("customersCount").replace("{count}", customers.length)}
        </p>
      </motion.div>

      {/* Desktop table */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:block"
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-muted border-b border-white/5">
                  <th className="px-6 py-4">{t("customer")}</th>
                  <th className="px-6 py-4">{t("phone")}</th>
                  <th className="px-6 py-4 text-center">{t("totalOrders")}</th>
                  <th className="px-6 py-4 text-right">{t("totalSpent")}</th>
                  <th className="px-6 py-4 text-center">{t("stamps")}</th>
                  <th className="px-6 py-4 text-right">{t("contact")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.phone} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 shrink-0 rounded-full bg-gold-metal text-forest grid place-items-center text-sm font-bold shadow-glowGoldSoft">
                          {avatar(c.name)}
                        </span>
                        <span className="text-cream font-semibold truncate max-w-[180px]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted tabular-nums">{c.phone}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-gold/15 text-gold border border-gold/30 text-[11px] font-bold px-2.5 py-1">
                        {c.orderCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-cream font-semibold tabular-nums">
                      {inr(c.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        Number(c.stamps) > 0
                          ? "bg-mint/15 text-mint border-mint/30"
                          : "bg-white/5 text-muted border-white/10"
                      }`}>
                        🎫 {c.stamps}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={waLink(c.phone, c.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-mint/15 text-mint border border-mint/40 px-4 py-2 text-xs font-bold transition hover:bg-mint/25 hover:shadow-glowGoldSoft"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        {t("chatOnWhatsApp")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-3xl mb-3">🧾</p>
              <p className="font-display text-lg text-cream mb-1">{t("noCustomersYet")}</p>
              <p className="text-muted text-sm">{t("customersEmptySub")}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mobile cards */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="md:hidden grid gap-4"
      >
        {customers.map((c, i) => (
          <motion.div
            key={c.phone}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-glass p-5">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent pointer-events-none" />
              <div className="relative flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-full bg-gold-metal text-forest grid place-items-center text-base font-bold shadow-glowGoldSoft">
                  {avatar(c.name)}
                </span>
                <div className="min-w-0">
                  <p className="text-cream font-bold truncate">{c.name}</p>
                  <p className="text-xs text-muted tabular-nums">{c.phone}</p>
                </div>
              </div>
              <div className="relative grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{t("totalOrders")}</p>
                  <p className="text-lg text-cream font-bold mt-1">{c.orderCount}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-center col-span-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{t("spent")}</p>
                  <p className="text-sm text-gold-metal font-bold mt-1.5 leading-none">{inr(c.totalSpent)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{t("stamps")}</p>
                  <p className="text-lg text-mint font-bold mt-1">🎫 {c.stamps}</p>
                </div>
              </div>
              <a
                href={waLink(c.phone, c.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-mint/15 text-mint border border-mint/40 px-4 py-2.5 text-sm font-bold transition hover:bg-mint/25"
              >
                <WhatsAppIcon className="w-4 h-4" />
                {t("chatOnWhatsApp")}
              </a>
            </div>
          </motion.div>
        ))}
        {customers.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-3xl mb-3">🧾</p>
            <p className="font-display text-lg text-cream mb-1">{t("noCustomersYet")}</p>
            <p className="text-muted text-sm">{t("customersEmptySub")}</p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}
