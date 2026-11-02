/**
 * DB layer — Turso (LibSQL) when TURSO_DATABASE_URL is set, otherwise the
 * local file database (node:sqlite). Both backends expose the same async
 * API: run(), get(), all(), initSchema().
 *
 * Turso persists forever in the cloud (no ephemeral-disk resets on Render).
 * The local file path is kept for development only.
 */
// Load .env before anything reads process.env — ESM imports hoist above
// any dotenv.config() call in the importing file, so without this the
// Turso credentials would be invisible and we'd silently fall back to the
// local file DB.
import "dotenv/config";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
const useTurso = Boolean(tursoUrl);

let db;

if (useTurso) {
  // Pure-JS fetch client — no native bindings. Works everywhere, including
  // Node on Render and local devices.
  if (!tursoAuthToken) {
    console.warn("⚠ TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is missing — queries will fail.");
  }
  const { createClient } = await import("@libsql/client/web");
  db = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken || undefined
  });
} else {
  // Local dev — Node's built-in SQLite file.
  const { DatabaseSync } = await import("node:sqlite");
  mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(join(dataDir, "ganna.db"));
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
}

/** SQLite treats undefined bound params as errors — normalize to null. */
const normParams = (params = []) => params.map((p) => (p === undefined ? null : p));

/** Run a statement with optional bound params. Returns { changes, lastId }. */
export async function run(sql, params = []) {
  if (useTurso) {
    const res = await db.execute({ sql, args: normParams(params) });
    return {
      changes: Number(res.rowsAffected || 0),
      lastId: Number(res.lastInsertRowid || 0)
    };
  }
  const info = db.prepare(sql).run(...normParams(params));
  return { changes: Number(info.changes), lastId: Number(info.lastInsertRowid) };
}

/** Fetch all rows as objects. */
export async function all(sql, params = []) {
  if (useTurso) {
    const res = await db.execute({ sql, args: normParams(params), rowMode: "object" });
    return res.rows;
  }
  return db.prepare(sql).all(...normParams(params));
}

/** Fetch first row or undefined. */
export async function get(sql, params = []) {
  if (useTurso) {
    const rows = await all(sql, params);
    return rows[0];
  }
  return db.prepare(sql).get(...normParams(params));
}

/** Execute a bare SQL statement (schema/migrations). */
async function exec(sql) {
  if (useTurso) {
    await db.execute({ sql });
  } else {
    db.exec(sql);
  }
}

/** Create all tables if missing. Idempotent — safe on every boot. */
export async function initSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS AdminUsers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      phone TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      telegram TEXT DEFAULT '',
      locationUrl TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      exactLocation TEXT DEFAULT '',
      upiId TEXT DEFAULT '',
      qrCodeUrl TEXT DEFAULT '',
      heroImageUrl TEXT DEFAULT '',
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      imageUrl TEXT DEFAULT '',
      isAvailable INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      address TEXT DEFAULT '',
      totalAmount REAL NOT NULL,
      paymentMethod TEXT NOT NULL DEFAULT 'UPI',
      utrNumber TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      deliveryStatus TEXT NOT NULL DEFAULT 'Pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS OrderItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
      menuItemId INTEGER,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      keysJson TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'admin',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
    CREATE INDEX IF NOT EXISTS idx_orderitems_order ON OrderItems(orderId);
    CREATE INDEX IF NOT EXISTS idx_reviews_created ON Reviews(createdAt);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_endpoint ON Subscriptions(endpoint);
  `;

  if (useTurso) {
    await db.executeMultiple(schema);
  } else {
    db.exec(schema);
  }

  // Lightweight migrations — add columns to existing tables if missing.
  const tableCols = async (table) => {
    if (useTurso) {
      const res = await db.execute({ sql: `PRAGMA table_info(${table})`, rowMode: "object" });
      return res.rows.map((c) => c.name);
    }
    return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  };

  const settingsCols = await tableCols("Settings");
  if (!settingsCols.includes("qrCodeUrl")) {
    await exec("ALTER TABLE Settings ADD COLUMN qrCodeUrl TEXT DEFAULT ''");
  }
  if (!settingsCols.includes("pincode")) {
    await exec("ALTER TABLE Settings ADD COLUMN pincode TEXT DEFAULT ''");
  }
  if (!settingsCols.includes("exactLocation")) {
    await exec("ALTER TABLE Settings ADD COLUMN exactLocation TEXT DEFAULT ''");
  }

  const orderCols = await tableCols("Orders");
  if (!orderCols.includes("paymentMethod")) {
    await exec("ALTER TABLE Orders ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'UPI'");
  }
  if (!orderCols.includes("deliveryStatus")) {
    await exec("ALTER TABLE Orders ADD COLUMN deliveryStatus TEXT NOT NULL DEFAULT 'Pending'");
  }

  // Subscribe type: 'admin' (owner) vs 'customer' (village alerts).
  // Older DBs have no column — default every existing row to admin.
  const subCols = await tableCols("Subscriptions");
  if (!subCols.includes("type")) {
    await exec("ALTER TABLE Subscriptions ADD COLUMN type TEXT NOT NULL DEFAULT 'admin'");
  }
}

export default db;
