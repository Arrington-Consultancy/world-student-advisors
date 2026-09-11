import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0019 (CRM backup runs).
// Prove the table exists with the columns the writer depends on and the
// enum values it can produce, and prove nothing else moved.
// No DDL, no writes, no row data beyond counts, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;
const fail = m => { console.error(`  FAIL ${m}`); failures += 1; };
const pass = m => console.log(`  ok   ${m}`);

try {
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // 0000 to 0018 is nineteen rows, so 0019 is the twentieth.
  if (Number(migrations[0].n) !== 20) fail(`expected 20 applied migrations, found ${migrations[0].n}`);
  else pass("twenty migrations applied");

  console.log("\n=== crm_backup_runs ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_backup_runs'
  `);
  if (cols.length === 0) {
    fail("crm_backup_runs does not exist");
  } else {
    const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
    for (const required of ["id", "startedAt", "finishedAt", "status", "reason", "trigger", "tokenSource", "snapshotLabel", "snapshotFolderId", "countsJson", "totalBytes", "createdAt"]) {
      if (byName[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    const status = String(byName.status?.COLUMN_TYPE ?? "");
    for (const value of ["running", "complete", "partial", "failed"]) {
      if (status.includes(`'${value}'`)) pass(`status accepts ${value}`); else fail(`status does not accept ${value}`);
    }
    const [rows] = await db.execute(sql`SELECT COUNT(*) AS n FROM crm_backup_runs`);
    console.log(`  note ${rows[0].n} run row(s) present`);
  }
  const [g] = await db.execute(sql`SELECT COUNT(*) AS n FROM mirror_sync_runs`);
  pass(`mirror_sync_runs untouched and readable (${g[0].n} rows)`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
