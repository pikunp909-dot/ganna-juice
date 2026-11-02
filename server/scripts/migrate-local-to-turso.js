/**
 * Migrate local SQLite data (server/data/ganna.db) → Turso.
 *
 * Usage (from server/, with TURSO_* vars in .env):
 *   npm run migrate:turso          # safe — refuses if Turso already has orders
 *   npm run migrate:turso -- --force  # wipe Turso tables, then re-import
 *
 * Preserves every column and row id, so relations (OrderItems.orderId etc.)
 * stay intact. Idempotent without --force: rows whose id already exists are
 * skipped.
 */
import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema, run, get } from "../src/db.js";

dotenv.config();

const FORCE = process.argv.includes("--force");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("❌ Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in server/.env first.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "..", "data", "ganna.db");
const source = new DatabaseSync(sourcePath);

const TABLES = ["AdminUsers", "Settings", "Menu", "Orders", "OrderItems", "Reviews", "Subscriptions"];

const colsOf = (table) =>
  source.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

const rowsOf = (table) => {
  const cols = colsOf(table);
  const rows = source.prepare(`SELECT ${cols.join(", ")} FROM ${table} ORDER BY id ASC`).all();
  return { cols, rows };
};

async function ensureDestEmptyOf(table) {
  const row = await get(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(row?.n || 0) === 0;
}

async function main() {
  console.log("→ Initializing Turso schema...");
  await initSchema();

  if (!FORCE) {
    const destOrders = await get("SELECT COUNT(*) AS n FROM Orders");
    if (Number(destOrders?.n || 0) > 0) {
      console.error("❌ Turso already has orders — run with --force to wipe and re-import.");
      process.exit(1);
    }
    console.log("→ Turso is empty — proceeding.");
  }

  let total = 0;
  for (const table of TABLES) {
    const { cols, rows } = rowsOf(table);
    const placeholders = cols.map(() => "?").join(", ");
    const colList = cols.join(", ");
    let inserted = 0;
    let skipped = 0;

    if (FORCE && !(await ensureDestEmptyOf(table))) {
      await run(`DELETE FROM ${table}`);
    }

    for (const row of rows) {
      const existing = await get(`SELECT id FROM ${table} WHERE id = ?`, [row.id]);
      if (existing && !FORCE) {
        skipped++;
        continue;
      }
      const values = cols.map((c) => row[c] ?? null);
      await run(
        `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`,
        values
      );
      inserted++;
    }

    total += inserted;
    console.log(`  ${table}: ${inserted} inserted, ${skipped} skipped (existing)`);
  }

  console.log(`\n✓ Done — ${total} rows migrated to Turso.`);

  // sanity: compare totals
  for (const table of TABLES) {
    const src = Number(source.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
    const dst = Number((await get(`SELECT COUNT(*) AS n FROM ${table}`))?.n || 0);
    const flag = src === dst ? "ok" : "MISMATCH";
    console.log(`  verify ${table}: source=${src} dest=${dst} ${flag}`);
  }

  console.log("\nNote: locally uploaded /uploads images cannot be recovered if already");
  console.log("deleted. New uploads are stored inside Turso as base64 data URLs.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
