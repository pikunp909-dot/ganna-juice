/**
 * DB layer — Node's built-in SQLite (node:sqlite).
 * Zero native deps, fully synchronous. No external database required.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "ganna.db"));
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

/** Run a statement with optional bound params. Returns { changes, lastInsertRowid }. */
export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const info = stmt.run(...params);
  return { changes: Number(info.changes), lastId: Number(info.lastInsertRowid) };
}

/** Fetch all rows. */
export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/** Fetch first row or undefined. */
export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

/** Create all tables if missing. */
export function initSchema() {
  db.exec(`
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
  `);

  // Lightweight migrations — add columns to existing tables if missing.
  const settingsCols = db.prepare("PRAGMA table_info(Settings)").all().map((c) => c.name);
  if (!settingsCols.includes("qrCodeUrl")) {
    db.exec("ALTER TABLE Settings ADD COLUMN qrCodeUrl TEXT DEFAULT ''");
  }
  if (!settingsCols.includes("pincode")) {
    db.exec("ALTER TABLE Settings ADD COLUMN pincode TEXT DEFAULT ''");
  }
  if (!settingsCols.includes("exactLocation")) {
    db.exec("ALTER TABLE Settings ADD COLUMN exactLocation TEXT DEFAULT ''");
  }

  const orderCols = db.prepare("PRAGMA table_info(Orders)").all().map((c) => c.name);
  if (!orderCols.includes("paymentMethod")) {
    db.exec("ALTER TABLE Orders ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'UPI'");
  }

  // Subscribe type: 'admin' (owner) vs 'customer' (village alerts).
  // Older DBs have no column — default every existing row to admin.
  const subCols = db.prepare("PRAGMA table_info(Subscriptions)").all().map((c) => c.name);
  if (!subCols.includes("type")) {
    db.exec("ALTER TABLE Subscriptions ADD COLUMN type TEXT NOT NULL DEFAULT 'admin'");
  }
}

export default db;
