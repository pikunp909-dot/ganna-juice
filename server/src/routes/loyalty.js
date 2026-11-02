import { Router } from "express";
import { get } from "../db.js";

const router = Router();

/**
 * GET /api/loyalty/:phone — public stamps lookup for the loyalty program.
 * Returns { phone, stamps }. Unknown phones resolve to 0 stamps.
 */
router.get("/:phone", async (req, res) => {
  const phone = String(req.params.phone || "").trim();
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  try {
    const row = await get("SELECT phone, stamps FROM Loyalty WHERE phone = ?", [phone]);
    return res.json({ phone, stamps: row ? row.stamps : 0 });
  } catch (err) {
    console.error("Loyalty lookup failed:", err.message);
    return res.status(500).json({ error: "Failed to load loyalty data" });
  }
});

export default router;
