import { Router } from "express";
import { run, all, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Public — menu for the customer site.
router.get("/", (_req, res) => {
  const items = all("SELECT * FROM Menu ORDER BY id ASC");
  res.json({ items });
});

// Admin — list / create / update / delete / toggle availability.
router.get("/admin", requireAdmin, (_req, res) => {
  res.json({ items: all("SELECT * FROM Menu ORDER BY id ASC") });
});

router.post("/", requireAdmin, (req, res) => {
  const { name, description = "", price, imageUrl = "", isAvailable = 1 } = req.body || {};
  if (!name || typeof price !== "number" || price < 0) {
    return res.status(400).json({ error: "name and a valid price are required" });
  }
  const { lastId } = run(
    "INSERT INTO Menu (name, description, price, imageUrl, isAvailable) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, imageUrl, isAvailable ? 1 : 0]
  );
  res.status(201).json({ item: get("SELECT * FROM Menu WHERE id = ?", [lastId]) });
});

router.put("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = get("SELECT * FROM Menu WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Item not found" });

  const {
    name = existing.name,
    description = existing.description,
    price = existing.price,
    imageUrl = existing.imageUrl,
    isAvailable = existing.isAvailable
  } = req.body || {};

  run(
    "UPDATE Menu SET name = ?, description = ?, price = ?, imageUrl = ?, isAvailable = ? WHERE id = ?",
    [name, description, price, imageUrl, isAvailable ? 1 : 0, id]
  );
  res.json({ item: get("SELECT * FROM Menu WHERE id = ?", [id]) });
});

router.patch("/:id/toggle", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = get("SELECT * FROM Menu WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Item not found" });
  run("UPDATE Menu SET isAvailable = ? WHERE id = ?", [existing.isAvailable ? 0 : 1, id]);
  res.json({ item: get("SELECT * FROM Menu WHERE id = ?", [id]) });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  run("DELETE FROM Menu WHERE id = ?", [id]);
  res.json({ ok: true });
});

export default router;
