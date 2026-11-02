import { Router } from "express";
import { run, get, all } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Public — all reviews, newest first.
router.get("/", async (_req, res) => {
  const reviews = await all("SELECT * FROM Reviews ORDER BY createdAt DESC, id DESC");
  res.json({ reviews });
});

// Public — submit a review.
router.post("/", async (req, res) => {
  const body = req.body || {};
  const customerName = String(body.customerName || "").trim();
  const comment = String(body.comment || "").trim();
  const rating = Number(body.rating);

  if (!customerName) {
    return res.status(400).json({ error: "customerName is required" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
  }

  const { lastId } = await run(
    "INSERT INTO Reviews (customerName, rating, comment) VALUES (?, ?, ?)",
    [customerName, rating, comment]
  );

  res.status(201).json({ review: await get("SELECT * FROM Reviews WHERE id = ?", [lastId]) });
});

// Admin only — delete a review.
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid review id" });
  }
  const { changes } = await run("DELETE FROM Reviews WHERE id = ?", [id]);
  if (changes === 0) {
    return res.status(404).json({ error: "Review not found" });
  }
  res.json({ ok: true });
});

export default router;
