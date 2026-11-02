import { Router } from "express";
import { run } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { VAPID_PUBLIC_KEY, notifyAllSubscribers } from "../push.js";

const router = Router();

/** GET /api/notifications/vapid — public, returns the VAPID public key. */
router.get("/vapid", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/** POST /api/notifications/subscribe — admin only, save the owner's push subscription. */
router.post("/subscribe", requireAdmin, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: "endpoint, keys.p256dh and keys.auth are required" });
  }

  const keysJson = JSON.stringify({ p256dh: keys.p256dh, auth: keys.auth });
  try {
    const { changes } = await run(
      "INSERT INTO Subscriptions (endpoint, keysJson, type) VALUES (?, ?, 'admin') ON CONFLICT(endpoint) DO UPDATE SET keysJson = excluded.keysJson, type = 'admin'",
      [String(endpoint), keysJson]
    );
    res.status(201).json({ ok: true, saved: changes === 1, subscription: { endpoint } });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

/** POST /api/notifications/subscribe-customer — public, save a customer's push subscription. */
router.post("/subscribe-customer", async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: "endpoint, keys.p256dh and keys.auth are required" });
  }

  const keysJson = JSON.stringify({ p256dh: keys.p256dh, auth: keys.auth });
  try {
    const { changes } = await run(
      "INSERT INTO Subscriptions (endpoint, keysJson, type) VALUES (?, ?, 'customer') ON CONFLICT(endpoint) DO UPDATE SET keysJson = excluded.keysJson, type = 'customer'",
      [String(endpoint), keysJson]
    );
    res.status(201).json({ ok: true, saved: changes === 1, subscription: { endpoint } });
  } catch (err) {
    console.error("Customer subscribe error:", err.message);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

/** POST /api/notifications/broadcast — admin only, send a push to all customer subscriptions. */
router.post("/broadcast", requireAdmin, async (req, res) => {
  const { title, body, data = {} } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  try {
    const result = await notifyAllSubscribers({ title, body, data, type: "customer" });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Broadcast error:", err.message);
    res.status(500).json({ error: "Broadcast failed" });
  }
});

/** POST /api/notifications/test — admin only, send a test push to the owner. */
router.post("/test", requireAdmin, async (_req, res) => {
  try {
    const result = await notifyAllSubscribers({
      title: "Sugarcane Juice",
      body: "Test notification — push is working!",
      type: "admin"
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Test push error:", err.message);
    res.status(500).json({ error: "Push failed" });
  }
});

export default router;
