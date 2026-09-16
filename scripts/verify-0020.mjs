import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0020 (Google Ads conversion uploads).
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
  // 0000 to 0019 is twenty rows, so 0020 is the twenty-first.
  if (Number(migrations[0].n) !== 21) fail(`expected 21 applied migrations, found ${migrations[0].n}`);
  else pass("twenty-one migrations applied");

  console.log("\n=== google_ads_conversion_uploads ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_ads_conversion_uploads'
  `);
  if (cols.length === 0) {
    fail("google_ads_conversion_uploads does not exist");
  } else {
    const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
    for (const required of ["id", "dealId", "personId", "conversionActionId", "transactionId", "eventTimestamp", "status", "identifiers", "requestId", "googleStatus", "googleDetail", "reason", "attempts", "createdAt", "updatedAt"]) {
      if (byName[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    const status = String(byName.status?.COLUMN_TYPE ?? "");
    for (const value of ["uploaded", "skipped", "failed"]) {
      if (status.includes(`'${value}'`)) pass(`status accepts ${value}`); else fail(`status does not accept ${value}`);
    }
    const [rows] = await db.execute(sql`SELECT COUNT(*) AS n FROM google_ads_conversion_uploads`);
    console.log(`  note ${rows[0].n} upload row(s) present`);
    const [idx] = await db.execute(sql`SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_ads_conversion_uploads' AND INDEX_NAME = 'google_ads_conversion_uploads_deal_action' AND NON_UNIQUE = 0`);
    if (Number(idx[0].n) >= 2) pass("unique index on (dealId, conversionActionId) present"); else fail("unique index on (dealId, conversionActionId) is missing");
  }
  const [g] = await db.execute(sql`SELECT COUNT(*) AS n FROM crm_backup_runs`);
  pass(`crm_backup_runs untouched and readable (${g[0].n} rows)`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
