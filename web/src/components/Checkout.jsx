import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import { useLanguage } from "../language";
import { Spinner } from "./ui";

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const PHONE_RE = /^[6-9]\d{9}$/;
const UTR_RE = /^\d{12}$/;
const MIN_ORDER_VALUE = 150;

const emptyForm = { customerName: "", customerPhone: "", address: "" };

const STEP_INDEX = { form: 0, payment: 1, success: 2 };

/* Framer Motion variants for step transitions */
const stepVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    y: -14,
    filter: "blur(6px)",
    transition: { duration: 0.22, ease: "easeIn" }
  }
};

export default function Checkout({ open, lines, total, settings: propSettings, clear, onClose }) {
  const { t } = useLanguage();
  const [liveSettings, setLiveSettings] = useState(propSettings);
  const [step, setStep] = useState("form"); // form | payment | success
  const [mode, setMode] = useState("Pickup");
  const [paymentMethod, setPaymentMethod] = useState("UPI"); // UPI | COD
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [placeError, setPlaceError] = useState("");
  const [order, setOrder] = useState(null);
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // reset whenever the modal opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setForm(emptyForm);
      setErrors({});
      setPlaceError("");
      setOrder(null);
      setUtr("");
      setUtrError("");
      setMode("Pickup");
      setPaymentMethod("UPI");
      setFinalizing(false);
      setShowSuccess(false);
      autoOpenedRef.current = false;

      // pull fresh public settings so admin edits (UPI / QR) show immediately
      api.publicSettings()
        .then((s) => setLiveSettings({ ...propSettings, ...s }))
        .catch(() => {});
    }
  }, [open]);

  // Auto-open WhatsApp ~1s after the order lands on the success screen.
  // The manual button stays as a fallback when the browser blocks the popup.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!showSuccess || !order || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const t = setTimeout(() => {
      window.open(waLink(), "_blank");
    }, 1000);
    return () => clearTimeout(t);
  }, [step, order]);

  const upiId = liveSettings.upiId || "kunal@okaxis";
  const waDigits = String(liveSettings.whatsapp || "").replace(/\D/g, "");

  // Delivery charge — flat fee for delivery, waived above the free threshold.
  const deliveryCharge = Number(liveSettings.deliveryCharge ?? 20);
  const freeDeliveryAbove = Number(liveSettings.freeDeliveryAbove ?? 300);
  const deliveryFee =
    mode === "Delivery" && total < freeDeliveryAbove ? deliveryCharge : 0;
  const payable = total + deliveryFee;

  /* ---- validation ---- */

  function validateForm() {
    const e = {};
    if (!form.customerName.trim()) e.customerName = t("errName");
    if (!PHONE_RE.test(form.customerPhone.trim())) e.customerPhone = t("errPhone");
    if (mode === "Delivery" && !form.address.trim()) e.address = t("errAddress");
    if (total < MIN_ORDER_VALUE) {
      e.minOrder = "Minimum order value is ₹150. Please add more items.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ---- place order (UPI + COD) ---- */

  async function handlePlaceOrder() {
    if (paymentMethod === "UPI") {
      const utrTrimmed = utr.trim();
      if (!UTR_RE.test(utrTrimmed)) {
        setUtrError(t("errUtr"));
        return;
      }
      setUtrError("");
    }
    setFinalizing(true);
    setPlaceError("");
    try {
      const res = await api.post("/orders", {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        address: mode === "Delivery" ? form.address.trim() : "",
        mode,
        paymentMethod,
        totalAmount: payable,
        items: (lines || []).map((l) => ({ menuItemId: l.item.id, quantity: l.qty }))
      });
      setOrder(res.order);
      setFinalizing(false);
      setShowSuccess(true);
      clear();
    } catch (err) {
      setPlaceError(err.message || "Could not place order");
      setFinalizing(false);
    }
  }

  /* ---- track live order (from the success screen) ---- */

  function handleTrackLive() {
    const id = order?.id;
    setShowSuccess(false);
    onClose();
    if (id) {
      window.dispatchEvent(new CustomEvent("ganna:track-order", { detail: { id } }));
    }
  }

  /* ---- whatsapp receipt link ---- */

  function waLink() {
    // Build the receipt from the confirmed order (server response) when
    // available — the cart is cleared on success, so `total` / `lines`
    // props drop to 0/empty on the re-render. Fall back to live form state.
    const o = order;
    const customerName = o?.customerName || form.customerName;
    const customerPhone = o?.customerPhone || form.customerPhone;
    const isDelivery = o ? o.address !== "Pickup" : mode === "Delivery";
    const address = o ? (isDelivery ? o.address : "") : isDelivery ? form.address : "";
    const orderMode = isDelivery ? "Delivery" : "Pickup";
    const orderLines = o?.items && o.items.length ? o.items : lines;
    const orderTotal = o?.totalAmount ?? total;
    const payMethod = o?.paymentMethod || paymentMethod;
    const utrNo = o?.utrNumber || utr.trim();

    // Normalize cart lines ({ item, qty }) and server order items ({ name, quantity, price }).
    const itemsText = orderLines
      .map((l) => {
        const qty = l.qty ?? l.quantity;
        const name = l.item?.name ?? l.name;
        const price = l.item?.price ?? l.price;
        return `• ${qty} x ${name} - ${inr(price * qty)}`;
      })
      .join("\n");

    const msg = encodeURIComponent(
      `🥤 *NEW ORDER - Sugarcane Juice* 🥤\n\n` +
        `👤 *Customer Details:*\n` +
        `Name: ${customerName}\n` +
        `Phone: ${customerPhone}\n` +
        `Mode: ${orderMode}\n` +
        (isDelivery ? `Address: ${address}\n` : "") +
        `\n🛒 *Order Summary:*\n` +
        `${itemsText}\n\n` +
        `💰 *Total Amount:* ${inr(orderTotal)}\n\n` +
        `💳 *Payment Method:* ${payMethod === "COD" ? "Cash on Delivery" : "Online (UPI)"}\n` +
        (payMethod === "UPI" ? `🧾 UTR No: ${utrNo}\n` : "") +
        (payMethod === "UPI"
          ? `💳 *Pay Online Here:* upi://pay?pa=${upiId}&pn=SugarcaneJuice&am=${orderTotal}&cu=INR\n`
          : "") +
        `\nPlease confirm my order! 🙏`
    );
    return `https://wa.me/${waDigits}?text=${msg}`;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

          {/* modal shell */}
          <motion.div
            className="relative w-full max-w-xl bg-forest2 border border-white/10 rounded-[32px] overflow-hidden shadow-card"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {/* ambient glow inside the shell */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-[90px]" />
              <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-mint/8 blur-[100px]" />
            </div>

            {/* header */}
            <div className="relative flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="font-display text-2xl text-cream">{t("checkout")}</h3>
                <p className="text-xs text-muted mt-0.5">
                  {order
                    ? `${t("orderLabel")} #${order.id}`
                    : paymentMethod === "COD"
                    ? t("cashOnDelivery")
                    : t("secureUpi")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted hover:text-cream hover:bg-white/10 transition"
                aria-label="Close checkout"
              >
                ✕
              </button>
            </div>

            {/* step progress */}
            <div className="relative px-6 mt-5">
              <StepProgress current={STEP_INDEX[step]} />
            </div>

            {/* body — animated step swap */}
            <div className="relative px-6 py-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                {step === "form" && (
                  <motion.div key="form" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                    <DetailsStep
                      mode={mode}
                      setMode={setMode}
                      form={form}
                      setForm={setForm}
                      errors={errors}
                      onNext={() => {
                        if (validateForm()) setStep("payment");
                      }}
                      lines={lines}
                      total={total}
                      deliveryFee={deliveryFee}
                      payable={payable}
                    />
                  </motion.div>
                )}

                {step === "payment" && (
                  <motion.div key="payment" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                    <PaymentStep
                      total={payable}
                      settings={liveSettings}
                      upiId={upiId}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      utr={utr}
                      setUtr={setUtr}
                      utrError={utrError}
                      finalizing={finalizing}
                      placeError={placeError}
                      onPlace={handlePlaceOrder}
                      onBack={() => setStep("form")}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* full-screen premium success modal */}
      {showSuccess && order && (
        <SuccessStep
          order={order}
          paymentMethod={paymentMethod}
          waLink={waLink()}
          onClose={() => {
            setShowSuccess(false);
            onClose();
          }}
          onTrackLive={handleTrackLive}
        />
      )}
    </AnimatePresence>
  );
}

/* ================= Step progress indicator ================= */

function RadarIcon({ className = "w-4 h-4" }) {
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
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}

function StepProgress({ current }) {
  const { t } = useLanguage();
  const STEPS = [t("stepDetails"), t("stepPayment"), t("stepDone")];
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* step bubble */}
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full grid place-items-center text-sm font-bold border transition-colors ${
                  done
                    ? "bg-gold-metal text-forest border-transparent shadow-glowGoldSoft"
                    : active
                    ? "bg-gold/15 text-gold border-gold/50 shadow-glowGoldSoft"
                    : "bg-white/5 text-muted border-white/10"
                }`}
                initial={false}
                animate={{ scale: active ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 20 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <motion.span
                      key="n"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              <span
                className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                  active || done ? "text-gold" : "text-muted/60"
                }`}
              >
                {label}
              </span>
            </div>

            {/* connector */}
            {i < STEPS.length - 1 && (
              <div className="relative flex-1 h-[2px] mx-3 mb-6 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold2 rounded-full"
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= Step 1 — Details ================= */

function DetailsStep({ mode, setMode, form, setForm, errors, onNext, lines, total, deliveryFee, payable }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      {/* order summary strip */}
      <div className="glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 grid place-items-center text-lg">
            🧺
          </span>
          <div>
            <p className="text-sm font-semibold text-cream">
              {lines.length} {lines.length !== 1 ? t("items") : t("item")}
            </p>
            <p className="text-xs text-muted">{t("inCart")}</p>
          </div>
        </div>
        <span className="font-display text-xl text-gold-metal">{inr(total)}</span>
      </div>

      {/* delivery fee breakdown */}
      {mode === "Delivery" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Subtotal</span>
            <span className="text-cream font-semibold">{inr(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Delivery Fee</span>
            {deliveryFee > 0 ? (
              <span className="text-cream font-semibold">{inr(deliveryFee)}</span>
            ) : (
              <span className="text-mint font-bold">FREE</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
            <span className="text-muted font-semibold">Total Payable</span>
            <span className="font-display text-xl text-gold-metal">{inr(payable)}</span>
          </div>
        </div>
      )}

      {/* order mode toggle */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
        {[
          { key: "Pickup", label: t("pickup") },
          { key: "Delivery", label: t("delivery") }
        ].map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`relative py-2.5 rounded-xl text-sm font-bold transition ${
              mode === m.key ? "text-forest" : "text-muted hover:text-cream"
            }`}
          >
            {mode === m.key && (
              <motion.span
                layoutId="modePill"
                className="absolute inset-0 rounded-xl bg-gold-metal shadow-glowGoldSoft"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>

      {/* fields */}
      <div>
        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{t("name")}</label>
        <input
          type="text"
          placeholder={t("name")}
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          className={errors.customerName ? "!border-red-500/60" : ""}
        />
        {errors.customerName && (
          <p className="text-xs text-red-300 mt-1.5">{errors.customerName}</p>
        )}
      </div>

      <div>
        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{t("mobileNumber")}</label>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder={t("mobileNumber")}
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value.replace(/\D/g, "") })}
          className={errors.customerPhone ? "!border-red-500/60" : ""}
        />
        {errors.customerPhone && (
          <p className="text-xs text-red-300 mt-1.5">{errors.customerPhone}</p>
        )}
      </div>

      <AnimatePresence>
        {mode === "Delivery" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{t("deliveryAddress")}</label>
            <textarea
              rows={2}
              placeholder={t("deliveryAddress")}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={`resize-none ${errors.address ? "!border-red-500/60" : ""}`}
            />
            {errors.address && (
              <p className="text-xs text-red-300 mt-1.5">{errors.address}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {errors.minOrder && (
        <p className="text-xs text-red-300 mt-1.5">{errors.minOrder}</p>
      )}

      <button
        onClick={onNext}
        disabled={lines.length === 0}
        className="w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glowGold"
      >
        {t("continueToPayment")} →
      </button>
    </div>
  );
}

/* ================= Step 2 — Payment (UPI / COD) ================= */

function PaymentStep({
  total,
  settings,
  upiId,
  paymentMethod,
  setPaymentMethod,
  utr,
  setUtr,
  utrError,
  finalizing,
  placeError,
  onPlace,
  onBack
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("SugarcaneJuice")}&am=${total}&cu=INR`;

  function launchUpi() {
    window.location.href = upiPayload;
  }

  const upiApps = [
    { key: "gpay", label: "GPay", mark: "G", bg: "linear-gradient(135deg,#26d07c,#0f9d58)" },
    { key: "phonepe", label: "PhonePe", mark: "₹", bg: "linear-gradient(135deg,#8a4ddb,#5f259f)" },
    { key: "paytm", label: "Paytm", mark: "P", bg: "linear-gradient(135deg,#38c9f5,#00baf2)" },
    { key: "navi", label: "Navi", mark: "N", bg: "linear-gradient(135deg,#1c4e80,#0b2e4f)" },
    { key: "other", label: "Other UPI Apps", mark: "⋯", bg: "linear-gradient(135deg,#f59e0b,#d97706)" }
  ];

  const methodOptions = [
    { key: "UPI", icon: "📱", title: t("payOnline"), sub: t("payOnlineSub") },
    { key: "COD", icon: "💵", title: t("cashOnDelivery"), sub: t("payAtPickupSub") }
  ];

  return (
    <div className="space-y-5">
      {/* ===== Payment method — glassmorphic toggle ===== */}
      <div className="relative rounded-[24px] p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent backdrop-blur-2xl">
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-[23px] bg-white/[0.05] border border-white/10">
          {methodOptions.map((opt) => {
            const active = paymentMethod === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPaymentMethod(opt.key)}
                className={`relative flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition ${
                  active ? "text-forest" : "text-muted hover:text-cream"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="payMethodPill"
                    className="absolute inset-0 rounded-2xl bg-gold-metal shadow-glowGoldSoft"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={`relative w-9 h-9 shrink-0 rounded-xl grid place-items-center text-base transition ${
                    active ? "bg-black/20 border border-white/15" : "bg-white/5 border border-white/10"
                  }`}
                >
                  {opt.icon}
                </span>
                <span className="relative min-w-0">
                  <span className="block text-sm font-bold leading-tight truncate">{opt.title}</span>
                  <span className="block text-[10px] font-semibold opacity-70 mt-0.5 truncate">{opt.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== UPI mode — receipt with QR + UTR ===== */}
      {paymentMethod === "UPI" ? (
        <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-br from-goldLight via-gold to-goldDark shadow-[0_30px_80px_-24px_rgba(0,0,0,0.8),0_0_50px_-12px_rgba(245,158,11,0.45)]">
          {/* inner card — dark mesh */}
          <div className="relative rounded-[26.5px] overflow-hidden bg-forest-mesh">
            {/* sheen sweep */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 w-40 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
            />

            {/* receipt header */}
            <div className="relative px-6 pt-6 pb-5 border-b border-dashed border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-gold-metal grid place-items-center text-xl shadow-glowGoldSoft">
                    🍹
                  </span>
                  <div>
                    <p className="font-display text-lg text-cream leading-none">Sugarcane Juice</p>
                    <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">{t("upiReceipt")}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mint border border-mint/30 rounded-full px-2.5 py-1 bg-mint/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" /> {t("liveBadge")}
                </span>
              </div>
            </div>

            {/* amount + pay-via-app */}
            <div className="relative px-6 py-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{t("amountToPay")}</p>
                  <p className="font-display text-4xl text-gold-metal mt-1 leading-none">{inr(total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{t("orderLabel")}</p>
                  <p className="text-sm font-bold text-cream mt-1">{t("newLabel")}</p>
                </div>
              </div>

              {/* pay via app */}
              <div className="mt-6">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-3">{t("payViaApp")}</p>
                <div className="flex flex-wrap justify-start gap-x-3 gap-y-4">
                  {upiApps.map((app) => (
                    <button
                      key={app.key}
                      type="button"
                      onClick={launchUpi}
                      title={`Pay with ${app.label}`}
                      className="group flex flex-col items-center gap-2 w-14"
                    >
                      <span
                        className="w-12 h-12 rounded-2xl grid place-items-center text-lg font-black text-white shadow-lg ring-1 ring-white/20 transition transform group-hover:scale-105 group-hover:ring-gold/60 group-active:scale-95"
                        style={{ background: app.bg }}
                      >
                        {app.mark}
                      </span>
                      <span className="text-[10px] font-bold text-cream/70 text-center leading-tight group-hover:text-gold transition">
                        {app.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* or scan QR */}
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted/70">{t("orScanQr")}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* QR panel — light surface for contrast */}
              <div className="relative mt-5 rounded-2xl bg-gradient-to-br from-white to-[#f4ead6] p-2 shadow-inner">
                <div className="relative rounded-xl bg-white p-4 grid place-items-center">
                  {settings.qrCodeUrl ? (
                    <img
                      src={settings.qrCodeUrl}
                      alt="UPI QR code"
                      className="w-[196px] h-[196px] object-contain"
                    />
                  ) : (
                    <QRCodeSVG value={upiPayload} size={196} fgColor="#0b1a10" bgColor="transparent" level="M" />
                  )}
                  {/* soft glow behind QR */}
                  <div className="absolute inset-0 rounded-xl ring-1 ring-black/5" />
                </div>
                <div className="absolute -top-1 -left-1 w-5 h-5 rounded-tl-xl border-t-2 border-l-2 border-gold/70" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-tr-xl border-t-2 border-r-2 border-gold/70" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-bl-xl border-b-2 border-l-2 border-gold/70" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-br-xl border-b-2 border-r-2 border-gold/70" />
              </div>

              <p className="text-center text-xs text-muted mt-4">
                {t("scanUpi")}
              </p>

              {/* upi id with copy */}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">UPI ID</p>
                  <p className="text-sm font-bold text-cream truncate mt-0.5">{upiId}</p>
                </div>
                <button
                  onClick={copyUpi}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-white/10 bg-white/5 text-cream px-3.5 py-2 hover:border-gold/50 transition"
                >
                  {copied ? <span className="text-mint">✓ {t("copied")}</span> : <>📋 {t("copy")}</>}
                </button>
              </div>
            </div>

            {/* dashed divider */}
            <div className="relative px-6">
              <div className="border-t border-dashed border-white/10" />
            </div>

            {/* UTR verification */}
            <div className="relative px-6 pt-5 pb-6">
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                {t("paidEnterUtr")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder={t("utrPlaceholder")}
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
                className={`text-center tracking-[0.2em] font-semibold ${
                  utrError ? "!border-red-500/60" : ""
                }`}
              />
              {utrError ? (
                <p className="text-xs text-red-300 mt-1.5">{utrError}</p>
              ) : (
                <p className="text-[11px] text-muted/70 mt-1.5">
                  {t("utrHint")}
                </p>
              )}

              {placeError && (
                <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                  {placeError}
                </div>
              )}

              <button
                onClick={onPlace}
                disabled={finalizing || utr.trim().length !== 12}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glowGold"
              >
                {finalizing ? (
                  <>
                    <Spinner className="w-4 h-4" /> {t("placingOrder")}
                  </>
                ) : (
                  <>{t("confirmPayment")}</>
                )}
              </button>

              <button
                onClick={onBack}
                className="mt-3 w-full text-xs font-bold text-muted hover:text-cream transition"
              >
                {t("backToDetails")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ===== COD mode — no QR, no UTR, direct place ===== */
        <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-br from-white/15 via-white/5 to-transparent">
          <div className="relative rounded-[26.5px] overflow-hidden bg-forest-mesh px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-mint/15 border border-mint/30 grid place-items-center text-xl">
                💵
              </span>
              <div>
                <p className="font-display text-lg text-cream leading-none">{t("cashOnDelivery")}</p>
                <p className="text-[11px] text-muted mt-1 uppercase tracking-wider">{t("payOnArrival")}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/[0.04] border border-white/10 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t("amountPayable")}</span>
                <span className="font-display text-2xl text-gold-metal">{inr(total)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-white/10 flex items-center justify-between text-sm">
                <span className="text-muted">{t("methodLabel")}</span>
                <span className="font-semibold text-cream">{t("cashOnDelivery")}</span>
              </div>
            </div>

            <p className="text-xs text-muted/80 mt-4">
              {t("cashNote")}
            </p>

            {placeError && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {placeError}
              </div>
            )}

            <button
              onClick={onPlace}
              disabled={finalizing}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none shadow-glowGold"
            >
              {finalizing ? (
                <>
                  <Spinner className="w-4 h-4" /> {t("placingOrder")}
                </>
              ) : (
                <>{t("placeOrder")}</>
              )}
            </button>

            <button
              onClick={onBack}
              className="mt-3 w-full text-xs font-bold text-muted hover:text-cream transition"
            >
              {t("backToDetails")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Step 3 — Done ================= */

function StampCard({ phone }) {
  const [stamps, setStamps] = useState(null);

  useEffect(() => {
    let live = true;
    if (!phone) {
      setStamps(0);
      return;
    }
    api
      .get(`/loyalty/${phone}`)
      .then((d) => {
        if (live) setStamps(typeof d.stamps === "number" ? d.stamps : 0);
      })
      .catch(() => {
        if (live) setStamps(0);
      });
    return () => {
      live = false;
    };
  }, [phone]);

  const filled = stamps === null ? 0 : stamps % 5;
  const remaining = Math.max(0, 5 - filled);

  return (
    <div className="mt-5 rounded-[24px] border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-white/[0.03] to-transparent p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-cream">Digital Juice Stamp Card</span>
        <span className="text-[10px] uppercase tracking-wider text-gold font-semibold">Loyalty</span>
      </div>

      <div className="flex items-center justify-between gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 320, damping: 18 }}
            className={`relative w-11 h-11 rounded-full grid place-items-center text-lg shadow-glass ${
              i < filled
                ? "bg-gradient-to-br from-goldLight via-gold to-goldDark shadow-glowGold"
                : "bg-white/[0.06] border border-white/15"
            }`}
          >
            {i < filled && <span className="text-forest">🍹</span>}
          </motion.div>
        ))}
      </div>

      {stamps === null ? (
        <p className="text-xs text-muted">Checking your stamps…</p>
      ) : remaining === 0 ? (
        <p className="text-sm font-bold text-gold">
          You've unlocked a FREE juice! Redeem it at the counter 🎉
        </p>
      ) : (
        <p className="text-sm text-cream">
          You have <span className="font-bold text-gold">{filled}</span> of 5 stamps.
          Buy <span className="font-bold text-gold">{remaining}</span> more juices to get 1 FREE!
        </p>
      )}
    </div>
  );
}

function SuccessStep({ order, paymentMethod, waLink, onClose, onTrackLive }) {
  const { t } = useLanguage();
  const isCod = paymentMethod === "COD";
  return (
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-forest2 shadow-card overflow-hidden"
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-mint/10 blur-[80px]" />
          <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-gold/10 blur-[90px]" />
        </div>
        <div className="relative p-8 text-center">
      {/* animated check */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-mint/20 blur-2xl animate-pulse" />
        <motion.div
          className="relative w-24 h-24 rounded-full bg-mint/15 border border-mint/40 grid place-items-center"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <motion.span
            className="text-4xl text-mint"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 320, damping: 16 }}
          >
            ✓
          </motion.span>
        </motion.div>
      </div>

      <h4 className="font-display text-3xl text-cream">
        {isCod ? t("orderPlaced") : t("paymentRecorded")}
      </h4>
      <p className="text-muted text-sm mt-2 max-w-xs mx-auto">
        {isCod ? t("successCodSub") : t("successUpiSub")}
      </p>

      <div className="mt-6 glass-card rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{t("orderLabel")}</span>
          <span className="font-bold text-cream">
            {order ? `#${order.id}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted">{t("paymentLabel")}</span>
          <span className="font-bold text-cream">
            {isCod ? t("cashOnDelivery") : "UPI"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted">{t("statusLabel")}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {isCod ? t("statusConfirmed") : t("statusAwaiting")}
          </span>
        </div>
      </div>

      <StampCard phone={order?.customerPhone} />

      <div className="mt-5 grid gap-2.5">
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-gold-metal text-forest font-bold rounded-2xl px-6 py-4 text-sm transition hover:brightness-110 shadow-glowGold"
        >
          💬 {t("sendReceipt")}
        </a>
        <button
          onClick={onTrackLive}
          className="w-full inline-flex items-center justify-center gap-2 border border-gold/30 bg-gold/10 text-gold font-bold rounded-2xl px-6 py-4 text-sm transition hover:border-gold/60 hover:shadow-glowGoldSoft hover:bg-gold/15"
        >
          <RadarIcon className="w-4 h-4" /> {t("trackLiveOrder")}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm font-bold text-muted hover:text-cream py-2 transition"
        >
          {t("continueBrowsing")}
        </button>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
