import { Router } from "express";
import { run } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { VAPID_PUBLIC_KEY, notifyAllSubscribers } from "../push.js";

const router = Router();

/** GET /api/notifications/vapid — public, returns the VAPID public key. */
router.get("/vapid", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/** POST /api/notifications/subscribe — save the owner's push subscription. */
router.post("/subscribe", requireAdmin, (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: "endpoint, keys.p256dh and keys.auth are required" });
  }

  const keysJson = JSON.stringify({ p256dh: keys.p256dh, auth: keys.auth });
  try {
    const { changes } = run(
      "INSERT INTO Subscriptions (endpoint, keysJson) VALUES (?, ?) ON CONFLICT(endpoint) DO UPDATE SET keysJson = excluded.keysJson",
      [String(endpoint), keysJson]
    );
    res.status(201).json({ ok: true, saved: changes === 1, subscription: { endpoint } });
  } catch (err) {
    console.error("Subscribe error:", err.message);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

/** POST /api/notifications/test — admin only, send a test push. */
router.post("/test", requireAdmin, async (_req, res) => {
  try {
    const result = await notifyAllSubscribers({
      title: "Sugarcane Juice",
      body: "Test notification — push is working!"
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Test push error:", err.message);
    res.status(500).json({ error: "Push failed" });
  }
});

export default router;
