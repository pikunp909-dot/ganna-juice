import { Router } from "express";
import { run, all, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

/**
 * POST /api/orders — create an order.
 * Body: { customerName, customerPhone, address, mode: "Delivery"|"Pickup",
 *         items: [{ menuItemId, quantity }] }
 * Server recomputes totals from the Menu table (no trusting client prices).
 */
router.post("/", (req, res) => {
  const { customerName, customerPhone, address = "", mode = "Delivery", items = [], paymentMethod = "UPI" } = req.body || {};
  const method = String(paymentMethod).trim().toUpperCase() === "COD" ? "COD" : "UPI";

  if (!customerName || !customerPhone) {
    return res.status(400).json({ error: "customerName and customerPhone are required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }

  let total = 0;
  const lines = [];
  for (const item of items) {
    const menuItem = get("SELECT * FROM Menu WHERE id = ?", [Number(item.menuItemId)]);
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(400).json({ error: `Menu item ${item.menuItemId} unavailable` });
    }
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    total += menuItem.price * qty;
    lines.push({ menuItemId: menuItem.id, name: menuItem.name, quantity: qty, price: menuItem.price });
  }
  total = Math.round(total * 100) / 100;

  const { lastId } = run(
    "INSERT INTO Orders (customerName, customerPhone, address, totalAmount, paymentMethod, status) VALUES (?, ?, ?, ?, ?, 'Pending')",
    [customerName, customerPhone, address === "" && mode === "Pickup" ? "Pickup" : address, total, method]
  );

  const stmt = "INSERT INTO OrderItems (orderId, menuItemId, name, quantity, price) VALUES (?, ?, ?, ?, ?)";
  for (const line of lines) {
    run(stmt, [lastId, line.menuItemId, line.name, line.quantity, line.price]);
  }

  const order = get("SELECT * FROM Orders WHERE id = ?", [lastId]);
  order.items = all("SELECT menuItemId, name, quantity, price FROM OrderItems WHERE orderId = ?", [lastId]);
  res.status(201).json({ order });
});

// Admin — all orders with items.
router.get("/", requireAdmin, (_req, res) => {
  const orders = all("SELECT * FROM Orders ORDER BY createdAt DESC, id DESC");
  for (const o of orders) {
    o.items = all("SELECT name, quantity, price FROM OrderItems WHERE orderId = ?", [o.id]);
  }
  res.json({ orders });
});

// Admin — mark payment verified (UTR checked by owner).
router.patch("/:id/verify", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const order = get("SELECT * FROM Orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { utrNumber, status = "Verified" } = req.body || {};
  const utr = String(utrNumber || "").trim();
  if (!utr) {
    return res.status(400).json({ error: "utrNumber is required to verify payment" });
  }
  run("UPDATE Orders SET utrNumber = ?, status = ? WHERE id = ?", [utr, status, id]);
  res.json({ order: get("SELECT * FROM Orders WHERE id = ?", [id]) });
});

// Admin — delete an order (spam/cancelled). OrderItems cascade via FK.
router.delete("/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const order = get("SELECT * FROM Orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ error: "Order not found" });
  run("DELETE FROM Orders WHERE id = ?", [id]);
  res.json({ ok: true });
});

export default router;
