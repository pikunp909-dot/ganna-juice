/**
 * migrate.js — create/upgrade the Postgres schema and (optionally) import
 * data from the old SQLite dump.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." node scripts/migrate.js        # schema only
 *   DATABASE_URL="postgres://..." node scripts/migrate.js --import # + data
 *
 * --import reads server/data/dump/*.json (produced by export-sqlite.js).
 * Rows are upserted by primary key so re-running is safe.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema, query } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dumpDir = join(__dirname, "..", "data", "dump");

const IMPORT_ORDER = [
  "AdminUsers",
  "Settings",
  "Menu",
  "Orders",
  "OrderItems",
  "Reviews",
  "Subscriptions"
];

async function importDump() {
  let count = 0;
  for (const table of IMPORT_ORDER) {
    const file = join(dumpDir, `${table}.json`);
    if (!existsSync(file)) {
      console.log(`skip ${table}: no dump file`);
      continue;
    }
    const rows = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`skip ${table}: empty dump`);
      continue;
    }

    const cols = Object.keys(rows[0]);
    const setCols = cols.join(", ");
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updates = cols
      .filter((c) => c !== "id")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");
    const sql = `
      INSERT INTO ${table} (${setCols})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updates}
    `;

    for (const row of rows) {
      await query(sql, cols.map((c) => row[c]));
      count++;
    }
    console.log(`${table}: ${rows.length} rows imported`);
  }

  // Re-sync sequences so future auto-increments don't collide with imported ids.
  for (const table of IMPORT_ORDER) {
    await query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
    );
  }
  console.log(`\nImport complete — ${count} total rows.`);
}

const run = async () => {
  console.log("Creating schema…");
  await initSchema();
  console.log("Schema ready (idempotent).");

  if (process.argv.includes("--import")) {
    await importDump();
  } else {
    console.log("Tip: add --import to load data from server/data/dump/");
  }
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
