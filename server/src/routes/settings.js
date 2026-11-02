import { Router } from "express";
import { run, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

const FIELDS = ["phone", "whatsapp", "instagram", "telegram", "locationUrl", "pincode", "exactLocation", "upiId", "qrCodeUrl", "heroImageUrl", "ownerName", "deliveryCharge", "freeDeliveryAbove", "openTime", "closeTime"];
const NUMERIC_FIELDS = ["deliveryCharge", "freeDeliveryAbove"];

// Public subset the customer site needs.
router.get("/public", async (_req, res) => {
  const s = (await get("SELECT * FROM Settings WHERE id = 1")) || {};
  const pick = {};
  for (const f of FIELDS) pick[f] = s[f] || "";
  pick.heroImageUrl = s.heroImageUrl || "";
  for (const f of NUMERIC_FIELDS) pick[f] = Number(s[f] ?? 0);
  res.json({ settings: pick });
});

// Admin — full settings, and update.
router.get("/", requireAdmin, async (_req, res) => {
  res.json({ settings: (await get("SELECT * FROM Settings WHERE id = 1")) || {} });
});

router.put("/", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const s = await get("SELECT * FROM Settings WHERE id = 1");

  const next = {};
  for (const f of FIELDS) next[f] = body[f] !== undefined ? String(body[f]) : s?.[f] ?? "";
  for (const f of NUMERIC_FIELDS) {
    next[f] = body[f] !== undefined
      ? Math.max(0, Math.floor(Number(body[f]) || 0))
      : Number(s?.[f] ?? 0);
  }

  if (s) {
    await run(
      `UPDATE Settings SET phone = ?, whatsapp = ?, instagram = ?, telegram = ?, locationUrl = ?, pincode = ?, exactLocation = ?, upiId = ?, qrCodeUrl = ?, heroImageUrl = ?, ownerName = ?, deliveryCharge = ?, freeDeliveryAbove = ?, openTime = ?, closeTime = ?, updatedAt = datetime('now') WHERE id = 1`,
      [next.phone, next.whatsapp, next.instagram, next.telegram, next.locationUrl, next.pincode, next.exactLocation, next.upiId, next.qrCodeUrl, next.heroImageUrl, next.ownerName, next.deliveryCharge, next.freeDeliveryAbove, next.openTime, next.closeTime]
    );
  } else {
    await run(
      `INSERT INTO Settings (id, phone, whatsapp, instagram, telegram, locationUrl, pincode, exactLocation, upiId, qrCodeUrl, heroImageUrl, ownerName, deliveryCharge, freeDeliveryAbove, openTime, closeTime) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [next.phone, next.whatsapp, next.instagram, next.telegram, next.locationUrl, next.pincode, next.exactLocation, next.upiId, next.qrCodeUrl, next.heroImageUrl, next.ownerName, next.deliveryCharge, next.freeDeliveryAbove, next.openTime, next.closeTime]
    );
  }

  res.json({ settings: await get("SELECT * FROM Settings WHERE id = 1") });
});

export default router;
