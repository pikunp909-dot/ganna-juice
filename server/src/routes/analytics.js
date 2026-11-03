import { Router } from "express";
import { run, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

/** Local calendar day key, e.g. 2026-11-02 — matches server-local timezone. */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * POST /api/analytics/track-visit — public. Increments today's visit count.
 * Idempotent per client via localStorage dedupe on the frontend.
 */
router.post("/track-visit", asyncHandler(async (_req, res) => {
  try {
    await run(
      `INSERT INTO Analytics (date, visits) VALUES (?, 1)
       ON CONFLICT(date) DO UPDATE SET visits = visits + 1`,
      [todayKey()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Track visit failed:", err.message);
    res.status(500).json({ error: "Failed to track visit" });
  }
}));

/** GET /api/analytics/visits — admin. Today + all-time visit totals. */
router.get("/visits", requireAdmin, asyncHandler(async (_req, res) => {
  const key = todayKey();
  const todayRow = await get("SELECT visits FROM Analytics WHERE date = ?", [key]);
  const totalRow = await get("SELECT COALESCE(SUM(visits), 0) AS total FROM Analytics");
  res.json({
    today: Number(todayRow?.visits || 0),
    total: Number(totalRow?.total || 0)
  });
}));

export default router;
