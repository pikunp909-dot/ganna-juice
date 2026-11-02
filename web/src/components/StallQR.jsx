import { useRef } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui";
import { useLanguage } from "../language";

export default function StallQR() {
  const { t } = useLanguage();
  const qrRef = useRef(null);
  const origin = (typeof window !== "undefined" && window.location.origin) || "";

  function downloadQR() {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    // Normalize the SVG for clean rasterization (stable size + xmlns).
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "420");
    clone.setAttribute("height", "420");
    const vb = svgEl.viewBox?.baseVal;
    if (vb && vb.width && vb.height) {
      clone.setAttribute("viewBox", `0 0 ${vb.width} ${vb.height}`);
    }

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 840;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "Sugarcane_Juice_QR.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    img.src = url;
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
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.04),transparent_50%)]" />

        <div className="relative p-6 sm:p-7 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6 self-start text-left">
            <span className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 grid place-items-center text-gold shadow-glowGoldSoft">
              <QrIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display text-xl text-cream leading-none">{t("stallQrTitle")}</h3>
              <p className="text-xs text-muted mt-1">{t("stallQrSub")}</p>
            </div>
          </div>

          {/* QR — white frame for scannability, gold ring for theme */}
          <div
            ref={qrRef}
            className="inline-block rounded-3xl p-3.5 bg-white shadow-glass ring-2 ring-gold/60"
          >
            <QRCodeSVG
              value={origin}
              size={208}
              level="M"
              marginSize={2}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>

          <p className="mt-5 font-semibold text-cream text-sm">{t("stallQrCta")}</p>
          <p className="mt-1 text-[11px] text-muted uppercase tracking-widest font-semibold">
            {t("stallQrBrand")}
          </p>

          <Button variant="primary" onClick={downloadQR} className="mt-6 w-full sm:w-auto">
            <DownloadIcon className="w-4 h-4" /> {t("downloadQr")}
          </Button>
        </div>
      </div>
    </motion.div>
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

function QrIcon(p) {
  return (
    <IconBase {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v3M14 21h3" />
    </IconBase>
  );
}

function DownloadIcon(p) {
  return (
    <IconBase {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </IconBase>
  );
}
