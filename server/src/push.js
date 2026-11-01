/**
 * push.js — Web Push (VAPID) setup + send helper.
 * Keys are generated once via web-push and hardcoded for now.
 * Override via env if you want to rotate them.
 */
import webpush from "web-push";
import { get, all, run } from "./db.js";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY || "BJ_J5-6hWWhQgLP__vAE-fonvWxDP4kZkqosEpRGZJDErlXG6e56dWLdMfwT3y--PQ28DN8ElWsC6k0XC_YSkw4";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "H9iDxP81BhRch6Zem6CJT0qB6x1lmY9hzYDFcxIjBvI";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@ganna.local";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export { VAPID_PUBLIC_KEY };

/**
 * Send a push notification to stored subscriptions. Pass `type` to target
 * only 'admin' or 'customer' rows; omit it to send to all.
 * Dead subscriptions (404/410) are pruned automatically.
 */
export async function notifyAllSubscribers({ title, body, data = {}, type }) {
  const subs = type
    ? all("SELECT id, endpoint, keysJson FROM Subscriptions WHERE type = ?", [type])
    : all("SELECT id, endpoint, keysJson FROM Subscriptions");
  const payload = JSON.stringify({ title, body, data });

  const results = await Promise.all(
    subs.map(async (row) => {
      let keys;
      try {
        keys = JSON.parse(row.keysJson);
      } catch {
        return { ok: false, reason: "bad-keys" };
      }
      const sub = { endpoint: row.endpoint, keys };
      try {
        await webpush.sendNotification(sub, payload);
        return { ok: true };
      } catch (err) {
        // 404/410 — subscription no longer valid, drop it.
        if (err.statusCode === 404 || err.statusCode === 410) {
          run("DELETE FROM Subscriptions WHERE id = ?", [row.id]);
          return { ok: false, reason: "removed" };
        }
        return { ok: false, reason: `push-error:${err.statusCode || "unknown"}` };
      }
    })
  );

  return { sent: results.filter((r) => r.ok).length, results };
}
