/**
 * Clean fake test data — deletes orders, order items, and loyalty records
 * belonging to test customers (phone prefix 999999999*, names Test/Amit/
 * Priya/Test Kundan).
 *
 * Usage (from server/, uses TURSO_* from .env for the live DB):
 *   node scripts/clean-fake-data.js
 *
 * Backs up every removed order to data/backup-fake-orders-<ts>.json first.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema, run, all } from "../src/db.js";

await initSchema();

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const FAKE_ORDER_SQL = `
  SELECT id, customerName, customerPhone, createdAt FROM Orders
  WHERE customerPhone LIKE '999999999%'
     OR customerName IN ('Test', 'Amit', 'Priya', 'Test Kundan')
  ORDER BY id
`;

const fakeOrders = await all(FAKE_ORDER_SQL);
const fakePhones = await all("SELECT DISTINCT phone FROM Loyalty WHERE phone LIKE '999999999%'");

if (fakeOrders.length === 0 && fakePhones.length === 0) {
  console.log("No fake orders or loyalty rows found — nothing to clean.");
  process.exit(0);
}

// Backup first — one JSON file per run.
mkdirSync(dataDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = join(dataDir, `backup-fake-orders-${ts}.json`);
writeFileSync(backupPath, JSON.stringify({ fakeOrders, fakePhones }, null, 2));
console.log(`Backup written: ${backupPath}`);

let deletedItems = 0;
for (const o of fakeOrders) {
  const { changes: items } = await run("DELETE FROM OrderItems WHERE orderId = ?", [o.id]);
  deletedItems += items;
}
for (const o of fakeOrders) {
  await run("DELETE FROM Orders WHERE id = ?", [o.id]);
}

let deletedLoyalty = 0;
const { changes: loyaltyChanges } = await run("DELETE FROM Loyalty WHERE phone LIKE '999999999%'");
deletedLoyalty = loyaltyChanges;

// Sanity: confirm none remain.
const remaining = await all(FAKE_ORDER_SQL);
const remainingLoyalty = await all("SELECT COUNT(*) AS n FROM Loyalty WHERE phone LIKE '999999999%'");

console.log(`Deleted orders: ${fakeOrders.length}`);
console.log(`Deleted order items: ${deletedItems}`);
console.log(`Deleted loyalty rows: ${deletedLoyalty}`);
console.log(`Remaining fake orders: ${remaining.length}; remaining fake loyalty rows: ${remainingLoyalty[0]?.n ?? 0}`);
console.log("Done — dashboard is clean.");
