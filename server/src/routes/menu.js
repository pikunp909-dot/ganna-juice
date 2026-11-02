import { Router } from "express";
import { run, all, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Public — menu for the customer site.
router.get("/", async (_req, res) => {
  const items = await all("SELECT * FROM Menu ORDER BY id ASC");
  res.json({ items });
});

// Admin — list / create / update / delete / toggle availability.
router.get("/admin", requireAdmin, async (_req, res) => {
  res.json({ items: await all("SELECT * FROM Menu ORDER BY id ASC") });
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, description = "", price, costPrice = 0, imageUrl = "", isAvailable = 1 } = req.body || {};
  if (!name || typeof price !== "number" || price < 0) {
    return res.status(400).json({ error: "name and a valid price are required" });
  }
  if (typeof costPrice !== "number" || costPrice < 0) {
    return res.status(400).json({ error: "costPrice must be a valid non-negative number" });
  }
  const { lastId } = await run(
    "INSERT INTO Menu (name, description, price, costPrice, imageUrl, isAvailable) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description, price, costPrice, imageUrl, isAvailable ? 1 : 0]
  );
  res.status(201).json({ item: await get("SELECT * FROM Menu WHERE id = ?", [lastId]) });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get("SELECT * FROM Menu WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Item not found" });

  const {
    name = existing.name,
    description = existing.description,
    price = existing.price,
    costPrice = existing.costPrice,
    imageUrl = existing.imageUrl,
    isAvailable = existing.isAvailable
  } = req.body || {};

  await run(
    "UPDATE Menu SET name = ?, description = ?, price = ?, costPrice = ?, imageUrl = ?, isAvailable = ? WHERE id = ?",
    [name, description, price, costPrice, imageUrl, isAvailable ? 1 : 0, id]
  );
  res.json({ item: await get("SELECT * FROM Menu WHERE id = ?", [id]) });
});

router.patch("/:id/toggle", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await get("SELECT * FROM Menu WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Item not found" });
  await run("UPDATE Menu SET isAvailable = ? WHERE id = ?", [existing.isAvailable ? 0 : 1, id]);
  res.json({ item: await get("SELECT * FROM Menu WHERE id = ?", [id]) });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await run("DELETE FROM Menu WHERE id = ?", [id]);
  res.json({ ok: true });
});

export default router;
