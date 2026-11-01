/**
 * DB layer — PostgreSQL via node-postgres (pg).
 * Production flow: DATABASE_URL from Supabase/Neon. All helpers are async;
 * routes await them. SQL placeholders are written as `?` and auto-converted
 * to `$1, $2, ...` so existing route code stays portable.
 */
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("⚠ DATABASE_URL is not set — API will fail on first query.");
}

const pool = new Pool({
  connectionString: connectionString || "postgres://localhost:5432/ganna",
  ssl:
    process.env.PGSSLMODE === "disable"
      ? false
      : { rejectUnauthorized: false }, // Supabase/Neon want SSL by default
  max: 10,
  idleTimeoutMillis: 30_000
});

/* Convert `?` placeholders to Postgres `$1, $2, ...`. */
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/* Auto-append RETURNING id for INSERTs so run() can report lastId. */
function ensureReturning(sql) {
  if (/^\s*insert\b/i.test(sql) && !/returning/i.test(sql)) {
    return `${sql} RETURNING id`;
  }
  return sql;
}

/** Run a statement. Returns { changes, lastId }. */
export async function run(sql, params = []) {
  const res = await pool.query(toPg(ensureReturning(sql)), params);
  let lastId = null;
  if (res.rows && res.rows.length && res.rows[0] && "id" in res.rows[0]) {
    lastId = Number(res.rows[0].id);
  }
  return { changes: res.rowCount ?? 0, lastId };
}

/** Fetch all rows. */
export async function all(sql, params = []) {
  const res = await pool.query(toPg(sql), params);
  return res.rows;
}

/** Fetch first row or undefined. */
export async function get(sql, params = []) {
  const res = await pool.query(toPg(sql), params);
  return res.rows[0];
}

/** Raw query (for transactions / advanced use). */
export function query(sql, params = []) {
  return pool.query(toPg(sql), params);
}

/** Create all tables if missing. Idempotent — safe to run on every boot. */
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS AdminUsers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS Settings (
      id BIGINT PRIMARY KEY CHECK (id = 1),
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
      updatedAt TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS Menu (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(10,2) NOT NULL,
      imageUrl TEXT DEFAULT '',
      isAvailable INTEGER NOT NULL DEFAULT 1,
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS Orders (
      id BIGSERIAL PRIMARY KEY,
      customerName TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      address TEXT DEFAULT '',
      totalAmount NUMERIC(10,2) NOT NULL,
      paymentMethod TEXT NOT NULL DEFAULT 'UPI',
      utrNumber TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS OrderItems (
      id BIGSERIAL PRIMARY KEY,
      orderId BIGINT NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
      menuItemId BIGINT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Reviews (
      id BIGSERIAL PRIMARY KEY,
      customerName TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS Subscriptions (
      id BIGSERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      keysJson TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'admin',
      createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
    CREATE INDEX IF NOT EXISTS idx_orderitems_order ON OrderItems(orderId);
    CREATE INDEX IF NOT EXISTS idx_reviews_created ON Reviews(createdAt);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_endpoint ON Subscriptions(endpoint);
  `);
}

export default pool;
