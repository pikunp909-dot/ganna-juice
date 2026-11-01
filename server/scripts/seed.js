/**
 * Seed — creates schema + default admin, settings, and sample menu.
 * Run: npm run seed (from server/)
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { initSchema, run, get } from "../src/db.js";

dotenv.config();
await initSchema();

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kunal@ganna.in";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kunal123";

// Admin
if (!(await get("SELECT id FROM AdminUsers WHERE email = ?", [DEFAULT_ADMIN_EMAIL]))) {
  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  await run("INSERT INTO AdminUsers (email, password, role) VALUES (?, ?, 'admin')", [
    DEFAULT_ADMIN_EMAIL,
    hash
  ]);
  console.log(`Admin created → ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD} (CHANGE ME)`);
} else {
  console.log("Admin already exists");
}

// Settings row
if (!(await get("SELECT id FROM Settings WHERE id = 1"))) {
  await run(
    `INSERT INTO Settings (id, phone, whatsapp, instagram, telegram, locationUrl, upiId, heroImageUrl)
     VALUES (1, '+91 85949 34375', '+91 85949 34375', 'its_kunal088', 'KUNALYT0',
     'https://www.google.com/maps?q=20.2961,85.8245&z=15&output=embed', 'kunal@okaxis', '')`
  );
  console.log("Default settings inserted");
}

// Sample menu (only if menu is empty)
const menuRow = await get("SELECT COUNT(*) AS n FROM Menu");
const menuCount = Number(menuRow?.n || 0);
if (menuCount === 0) {
  const items = [
    ["Classic Ganna", "Pure, cold pressed cane juice. Nothing else.", 30],
    ["Ice Chilled", "Classic, crushed over shaved ice. Cold like winter.", 35],
    ["Lemon Mint Ganna", "A squeeze of lime, a sprig of mint. Sunshine in a glass.", 40],
    ["Ginger Kick", "Fresh ginger blended in. Immunity with attitude.", 45],
    ["Orange Cane Combo", "Half cane, half orange. Sweet citrus magic.", 50],
    ["Family Pack (1L)", "Full litre of fresh juice. The whole crew covered.", 120]
  ];
  for (const [name, description, price] of items) {
    await run("INSERT INTO Menu (name, description, price, isAvailable) VALUES (?, ?, ?, 1)", [
      name,
      description,
      price
    ]);
  }
  console.log(`Seeded ${items.length} menu items`);
} else {
  console.log("Menu already populated");
}

console.log("Seed complete ✔");
