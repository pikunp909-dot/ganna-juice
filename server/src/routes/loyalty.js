import { Router } from "express";
import { get, run } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

/** Normalize + validate a 10-digit phone param. */
function parsePhone(raw) {
  const phone = String(raw || "").trim();
  if (!/^\d{10}$/.test(phone)) return null;
  return phone;
}

/**
 * GET /api/loyalty/:phone — public lookup.
 * Returns { phone, stamps, scratchCards, totalFreeGlasses }.
 * Unknown phones resolve to zeros.
 */
router.get("/:phone", asyncHandler(async (req, res) => {
  const phone = parsePhone(req.params.phone);
  if (!phone) return res.status(400).json({ error: "Invalid phone number" });

  try {
    const row = await get(
      "SELECT phone, stamps, scratchCards, totalFreeGlasses FROM Loyalty WHERE phone = ?",
      [phone]
    );
    return res.json({
      phone,
      stamps: row ? Number(row.stamps) : 0,
      scratchCards: row ? Number(row.scratchCards) : 0,
      totalFreeGlasses: row ? Number(row.totalFreeGlasses) : 0
    });
  } catch (err) {
    console.error("Loyalty lookup failed:", err.message);
    return res.status(500).json({ error: "Failed to load loyalty data" });
  }
}));

/**
 * POST /api/loyalty/scratch/:phone — public, redeem one scratch card.
 * Prizes: 1–2 glasses (common, 60%) or 3–4 glasses (rare, 40%).
 * The guarded UPDATE prevents double-spend: it only touches rows with
 * scratchCards > 0, so two concurrent scratches can't both win.
 */
router.post("/scratch/:phone", asyncHandler(async (req, res) => {
  const phone = parsePhone(req.params.phone);
  if (!phone) return res.status(400).json({ error: "Invalid phone number" });

  // Common {1,2} = 60% total; rare {3,4} = 40% total.
  const prize = Math.random() < 0.6
    ? (Math.random() < 0.5 ? 1 : 2)
    : (Math.random() < 0.5 ? 3 : 4);

  try {
    const { changes } = await run(
      `UPDATE Loyalty
       SET scratchCards = scratchCards - 1,
           totalFreeGlasses = totalFreeGlasses + ?,
           updatedAt = datetime('now')
       WHERE phone = ? AND scratchCards > 0`,
      [prize, phone]
    );

    if (changes === 0) {
      return res.status(400).json({ error: "No scratch cards available" });
    }

    const row = await get(
      "SELECT phone, stamps, scratchCards, totalFreeGlasses FROM Loyalty WHERE phone = ?",
      [phone]
    );
    return res.json({
      phone,
      prize,
      scratchCards: Number(row.scratchCards),
      totalFreeGlasses: Number(row.totalFreeGlasses)
    });
  } catch (err) {
    console.error("Scratch card failed:", err.message);
    return res.status(500).json({ error: "Failed to scratch card" });
  }
}));

/**
 * POST /api/loyalty/redeem/:phone — admin only.
 * Resets totalFreeGlasses to 0 after the owner hands out the free juice.
 */
router.post("/redeem/:phone", requireAdmin, asyncHandler(async (req, res) => {
  const phone = parsePhone(req.params.phone);
  if (!phone) return res.status(400).json({ error: "Invalid phone number" });

  try {
    const { changes } = await run(
      "UPDATE Loyalty SET totalFreeGlasses = 0, updatedAt = datetime('now') WHERE phone = ?",
      [phone]
    );
    if (changes === 0) {
      // No loyalty row yet — nothing to redeem, still return zeros.
      return res.json({ phone, totalFreeGlasses: 0, redeemed: false });
    }
    const row = await get(
      "SELECT phone, stamps, scratchCards, totalFreeGlasses FROM Loyalty WHERE phone = ?",
      [phone]
    );
    return res.json({
      phone,
      totalFreeGlasses: Number(row.totalFreeGlasses),
      redeemed: true
    });
  } catch (err) {
    console.error("Redeem failed:", err.message);
    return res.status(500).json({ error: "Failed to redeem glasses" });
  }
}));

export default router;
