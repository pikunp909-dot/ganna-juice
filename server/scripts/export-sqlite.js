/**
 * export-sqlite.js — dump the current node:sqlite database to JSON files
 * under server/data/dump/ so it can be imported into Postgres later.
 *
 * Run: node scripts/export-sqlite.js
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "data", "ganna.db");
const dumpDir = join(__dirname, "..", "data", "dump");

mkdirSync(dumpDir, { recursive: true });

const db = new DatabaseSync(dbPath, { readOnly: true });

const TABLES = [
  "AdminUsers",
  "Settings",
  "Menu",
  "Orders",
  "OrderItems",
  "Reviews",
  "Subscriptions"
];

for (const table of TABLES) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  writeFileSync(join(dumpDir, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`${table}: ${rows.length} rows dumped`);
}

console.log(`\nDump complete → ${dumpDir}`);
