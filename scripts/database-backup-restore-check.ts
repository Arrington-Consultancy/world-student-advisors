/**
 * The second half of the database backup acceptance: after the workflow
 * has restored the downloaded backup into a throwaway MySQL, compare every
 * table's row count with what the backup's manifest says it holds.
 * RESTORE_DATABASE_URL is that throwaway database; BACKUP_ACCEPTANCE_OUT
 * holds expected.json from database-backup-acceptance.ts.
 * Prints table names and counts only. Exit 0 only when all match.
 */
import { readFileSync } from "fs";
import { join } from "path";
import mysql from "mysql2/promise";

const out = process.env.BACKUP_ACCEPTANCE_OUT!;
const expected = JSON.parse(readFileSync(join(out, "expected.json"), "utf8")) as { snapshotLabel: string; tables: Array<{ name: string; rows: number }>; totalRows: number };
const conn = await mysql.createConnection(process.env.RESTORE_DATABASE_URL!);
let failures = 0;
console.log(`\n=== 5. Restored ${expected.snapshotLabel} into a throwaway MySQL ===`);
const [[version]] = await conn.query({ sql: "SELECT VERSION()", rowsAsArray: true }) as unknown as [[string]];
console.log(`  note restore target MySQL ${version}`);
const [present] = await conn.query({ sql: "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", rowsAsArray: true }) as unknown as [string[][]];
const names = present.map(r => r[0]);
const sameTables = JSON.stringify(names) === JSON.stringify(expected.tables.map(t => t.name).sort());
if (!sameTables) failures += 1;
console.log(`  ${sameTables ? "ok  " : "FAIL"} the restored database has exactly the backed-up tables  ${names.length} of ${expected.tables.length}`);
let total = 0;
for (const t of expected.tables) {
  const [[n]] = await conn.query({ sql: `SELECT COUNT(*) FROM ${mysql.escapeId(t.name)}`, rowsAsArray: true }) as unknown as [[number]];
  total += Number(n);
  const ok = Number(n) === t.rows;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${t.name}: ${n} restored, ${t.rows} in the manifest`);
}
const ok = total === expected.totalRows;
if (!ok) failures += 1;
console.log(`  ${ok ? "ok  " : "FAIL"} total rows restored ${total} of ${expected.totalRows}`);
await conn.end();
console.log(`\nRESULT: ${failures === 0 ? "the backup restores, every table complete" : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
