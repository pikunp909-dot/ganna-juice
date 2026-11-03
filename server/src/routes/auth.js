import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { run, get } from "../db.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

const TOKEN_TTL = "12h";

// Brute-force guard on the login endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." }
});

// Dummy hash for timing parity when the email doesn't exist,
// so "unknown email" and "wrong password" take the same time.
const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAqO7ZgGkZzR5mJQy4YxP2q6lQK1M0Y9eW";

router.post("/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const admin = await get("SELECT * FROM AdminUsers WHERE email = ?", [email.trim().toLowerCase()]);

  // Compare against the real hash or a dummy — same cost either way.
  const hash = admin ? admin.password : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);

  if (!admin || !ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, role: admin.role },
    expiresIn: TOKEN_TTL
  });
}));

// Current admin (validates a stored token on app load).
router.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// Change password / update profile — protected. Current password required.
// Accepts an optional new email (validated + uniqueness-checked) alongside
// an optional new password. Either one can be supplied alone.
router.post("/change-password", requireAdmin, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, email } = req.body || {};

  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  const pwStr = typeof newPassword === "string" ? newPassword : "";

  if (!emailStr && !pwStr) {
    return res.status(400).json({ error: "Nothing to update — provide an email and/or a new password" });
  }

  if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }

  if (pwStr && pwStr.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const admin = await get("SELECT * FROM AdminUsers WHERE id = ?", [req.admin.id]);
  const ok = await bcrypt.compare(currentPassword || "", admin.password);
  if (!ok) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  if (emailStr && emailStr !== admin.email) {
    const existing = await get("SELECT id FROM AdminUsers WHERE email = ?", [emailStr]);
    if (existing) {
      return res.status(409).json({ error: "That email is already in use" });
    }
    await run("UPDATE AdminUsers SET email = ? WHERE id = ?", [emailStr, admin.id]);
  }

  if (pwStr) {
    const hash = await bcrypt.hash(pwStr, 12);
    await run("UPDATE AdminUsers SET password = ? WHERE id = ?", [hash, admin.id]);
  }

  const updated = await get("SELECT id, email, role FROM AdminUsers WHERE id = ?", [admin.id]);
  res.json({ ok: true, admin: updated, message: "Profile updated" });
}));

// Logout is client-side (token discarded); nothing to revoke server-side.
router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
