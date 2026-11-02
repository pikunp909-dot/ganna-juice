import { Router } from "express";
import { run, all, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { notifyAllSubscribers } from "../push.js";

const router = Router();

const DELIVERY_STATUSES = ["Pending", "Preparing", "Out for Delivery", "Delivered"];

/**
 * POST /api/orders — create an order.
 * Body: { customerName, customerPhone, address, mode: "Delivery"|"Pickup",
 *         items: [{ menuItemId, quantity }] }
 * Server recomputes totals from the Menu table (no trusting client prices).
 */
router.post("/", async (req, res) => {
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
    const menuItem = await get("SELECT * FROM Menu WHERE id = ?", [Number(item.menuItemId)]);
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(400).json({ error: `Menu item ${item.menuItemId} unavailable` });
    }
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    total += menuItem.price * qty;
    lines.push({ menuItemId: menuItem.id, name: menuItem.name, quantity: qty, price: menuItem.price });
  }
  total = Math.round(total * 100) / 100;

  const { lastId } = await run(
    "INSERT INTO Orders (customerName, customerPhone, address, totalAmount, paymentMethod, status) VALUES (?, ?, ?, ?, ?, 'Pending')",
    [customerName, customerPhone, address === "" && mode === "Pickup" ? "Pickup" : address, total, method]
  );

  const stmt = "INSERT INTO OrderItems (orderId, menuItemId, name, quantity, price) VALUES (?, ?, ?, ?, ?)";
  for (const line of lines) {
    await run(stmt, [lastId, line.menuItemId, line.name, line.quantity, line.price]);
  }

  const order = await get("SELECT * FROM Orders WHERE id = ?", [lastId]);
  order.items = await all("SELECT menuItemId, name, quantity, price FROM OrderItems WHERE orderId = ?", [lastId]);

  // Fire-and-forget owner push — never block/break the order response.
  notifyAllSubscribers({
    title: "New Order!",
    body: `₹${total} from ${customerName}`,
    data: { url: "/orders", orderId: lastId },
    type: "admin"
  }).catch((err) => console.error("Order push error:", err.message));

  res.status(201).json({ order });
});

/**
 * GET /api/orders/track/:id — public live tracking by order ID.
 * Returns only tracking-safe fields (no UTR, phone, or payment details).
 */
router.get("/track/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid order id" });
  }
  const order = await get(
    "SELECT id, customerName, deliveryStatus, totalAmount, createdAt FROM Orders WHERE id = ?",
    [id]
  );
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.items = await all("SELECT name, quantity, price FROM OrderItems WHERE orderId = ?", [id]);
  res.json({ order });
});

// Admin — all orders with items.
router.get("/", requireAdmin, async (_req, res) => {
  const orders = await all("SELECT * FROM Orders ORDER BY createdAt DESC, id DESC");
  for (const o of orders) {
    o.items = await all("SELECT name, quantity, price FROM OrderItems WHERE orderId = ?", [o.id]);
  }
  res.json({ orders });
});

// Admin — analytics rollups: today, this month, verified payment split,
// optional custom date range, and the last 7 days for the sales graph.
router.get("/stats", requireAdmin, async (req, res) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const iso = (dt) => dt.toISOString().slice(0, 19).replace("T", " ");
  const todayStart = iso(new Date(y, m, d));
  const todayEnd = iso(new Date(y, m, d + 1));
  const monthStart = iso(new Date(y, m, 1));
  const monthEnd = iso(new Date(y, m + 1, 1));

  const range = async (start, end) => {
    const row = await get(
      `SELECT COALESCE(SUM(totalAmount), 0) AS revenue, COUNT(*) AS orders
       FROM Orders
       WHERE status = 'Verified' AND createdAt >= ? AND createdAt < ?`,
      [start, end]
    );
    return { revenue: Number(row?.revenue || 0), orders: Number(row?.orders || 0) };
  };

  const splitBetween = async (start, end) => {
    const row = await get(
      `SELECT
         COALESCE(SUM(CASE WHEN paymentMethod = 'UPI' THEN totalAmount ELSE 0 END), 0) AS upiAmount,
         COALESCE(SUM(CASE WHEN paymentMethod = 'COD' THEN totalAmount ELSE 0 END), 0) AS codAmount,
         SUM(CASE WHEN paymentMethod = 'UPI' THEN 1 ELSE 0 END) AS upiOrders,
         SUM(CASE WHEN paymentMethod = 'COD' THEN 1 ELSE 0 END) AS codOrders
       FROM Orders
       WHERE status = 'Verified' AND createdAt >= ? AND createdAt < ?`,
      [start, end]
    );
    return {
      upiAmount: Number(row?.upiAmount || 0),
      codAmount: Number(row?.codAmount || 0),
      upiOrders: Number(row?.upiOrders || 0),
      codOrders: Number(row?.codOrders || 0)
    };
  };

  const today = await range(todayStart, todayEnd);
  const month = await range(monthStart, monthEnd);
  const paymentSplit = await splitBetween("0000-01-01 00:00:00", "9999-12-31 23:59:59");

  // Optional custom range: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  let rangeStats = null;
  let rangeSplit = null;
  const { startDate = "", endDate = "" } = req.query || {};
  if (startDate || endDate) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
      return res.status(400).json({ error: "startDate and endDate must be in YYYY-MM-DD format" });
    }
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date supplied" });
    }
    if (start > end) {
      return res.status(400).json({ error: "startDate must be before endDate" });
    }
    const startIso = iso(start);
    const endIso = iso(new Date(ey, em - 1, ed + 1));
    rangeStats = await range(startIso, endIso);
    rangeSplit = await splitBetween(startIso, endIso);
  }

  // Last 7 days — local calendar days ending today.
  const weekStart = iso(new Date(y, m, d - 6));
  const weekRows = await all(
    `SELECT createdAt, totalAmount FROM Orders
     WHERE status = 'Verified' AND createdAt >= ? AND createdAt < ?`,
    [weekStart, todayEnd]
  );
  const buckets = new Map();
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(y, m, d - i);
    const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    buckets.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const row of weekRows) {
    const dt = new Date(String(row.createdAt).replace(" ", "T") + "Z");
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (b) {
      b.revenue += Number(row.totalAmount || 0);
      b.orders += 1;
    }
  }
  const last7Days = [...buckets.values()];

  res.json({
    stats: {
      today,
      month,
      paymentSplit,
      rangeStats,
      rangeSplit,
      last7Days
    }
  });
});

// Admin — mark payment verified (UTR checked by owner).
router.patch("/:id/verify", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const order = await get("SELECT * FROM Orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { utrNumber, status = "Verified" } = req.body || {};
  const utr = String(utrNumber || "").trim();
  if (!utr) {
    return res.status(400).json({ error: "utrNumber is required to verify payment" });
  }
  await run("UPDATE Orders SET utrNumber = ?, status = ? WHERE id = ?", [utr, status, id]);
  res.json({ order: await get("SELECT * FROM Orders WHERE id = ?", [id]) });
});

// Admin — update delivery status (Pending → Preparing → Out for Delivery → Delivered).
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const next = String(status || "").trim();
  if (!DELIVERY_STATUSES.includes(next)) {
    return res.status(400).json({ error: `status must be one of ${DELIVERY_STATUSES.join(", ")}` });
  }
  const order = await get("SELECT * FROM Orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ error: "Order not found" });
  await run("UPDATE Orders SET deliveryStatus = ? WHERE id = ?", [next, id]);
  res.json({ order: await get("SELECT * FROM Orders WHERE id = ?", [id]) });
});

// Admin — delete an order (spam/cancelled). OrderItems cascade via FK.
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const order = await get("SELECT * FROM Orders WHERE id = ?", [id]);
  if (!order) return res.status(404).json({ error: "Order not found" });
  await run("DELETE FROM Orders WHERE id = ?", [id]);
  res.json({ ok: true });
});

export default router;
