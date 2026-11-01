/**
 * requireAdmin — protects dashboard routes.
 * Expects: Authorization: Bearer <JWT>
 * Verifies signature + expiry, loads the admin, attaches req.admin.
 */
import jwt from "jsonwebtoken";
import { get } from "../db.js";

export default async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const admin = await get("SELECT id, email, role FROM AdminUsers WHERE id = ?", [payload.id]);
  if (!admin || admin.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.admin = admin;
  next();
}
