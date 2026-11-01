import { Router } from "express";
import { run, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

const FIELDS = ["phone", "whatsapp", "instagram", "telegram", "locationUrl", "pincode", "exactLocation", "upiId", "qrCodeUrl", "heroImageUrl"];

// Public subset the customer site needs.
router.get("/public", async (_req, res) => {
  const s = (await get("SELECT * FROM Settings WHERE id = 1")) || {};
  const pick = {};
  for (const f of FIELDS) pick[f] = s[f] || "";
  pick.heroImageUrl = s.heroImageUrl || "";
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

  if (s) {
    await run(
      `UPDATE Settings SET phone = ?, whatsapp = ?, instagram = ?, telegram = ?, locationUrl = ?, pincode = ?, exactLocation = ?, upiId = ?, qrCodeUrl = ?, heroImageUrl = ?, updatedAt = NOW() WHERE id = 1`,
      [next.phone, next.whatsapp, next.instagram, next.telegram, next.locationUrl, next.pincode, next.exactLocation, next.upiId, next.qrCodeUrl, next.heroImageUrl]
    );
  } else {
    await run(
      `INSERT INTO Settings (id, phone, whatsapp, instagram, telegram, locationUrl, pincode, exactLocation, upiId, qrCodeUrl, heroImageUrl) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [next.phone, next.whatsapp, next.instagram, next.telegram, next.locationUrl, next.pincode, next.exactLocation, next.upiId, next.qrCodeUrl, next.heroImageUrl]
    );
  }

  res.json({ settings: await get("SELECT * FROM Settings WHERE id = 1") });
});

export default router;
