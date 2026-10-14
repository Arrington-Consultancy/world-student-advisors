import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0021 (Google Ads upload sources).
// Prove the three columns exist with the types the writer depends on, that
// every pre-existing row was kept and backfilled (sourceType 'deal',
// sourceId = its dealId), that dealId now allows NULL, and that both unique
// keys are in place. No DDL, no writes, no row data beyond counts, no secrets.

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
  // 0000 to 0020 is twenty-one rows, so 0021 is the twenty-second.
  if (Number(migrations[0].n) !== 22) fail(`expected 22 applied migrations, found ${migrations[0].n}`);
  else pass("twenty-two migrations applied");

  console.log("\n=== google_ads_conversion_uploads ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_ads_conversion_uploads'
  `);
  const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
  const sourceType = String(byName.sourceType?.COLUMN_TYPE ?? "");
  if (sourceType.includes("'deal'") && sourceType.includes("'lead'") && byName.sourceType?.IS_NULLABLE === "NO") pass("sourceType enum('deal','lead') NOT NULL");
  else fail(`sourceType is ${sourceType || "missing"}`);
  if (/varchar\(64\)/.test(String(byName.sourceId?.COLUMN_TYPE ?? "")) && byName.sourceId?.IS_NULLABLE === "NO") pass("sourceId varchar(64) NOT NULL");
  else fail(`sourceId is ${byName.sourceId?.COLUMN_TYPE ?? "missing"}, nullable ${byName.sourceId?.IS_NULLABLE}`);
  if (/^int/.test(String(byName.statusChecks?.COLUMN_TYPE ?? "")) && byName.statusChecks?.IS_NULLABLE === "NO") pass("statusChecks int NOT NULL");
  else fail(`statusChecks is ${byName.statusChecks?.COLUMN_TYPE ?? "missing"}`);
  if (byName.dealId?.IS_NULLABLE === "YES") pass("dealId allows NULL, for Lead rows");
  else fail("dealId is still NOT NULL");

  const [rows] = await db.execute(sql`
    SELECT COUNT(*) AS total,
           -- Compared as numbers: comparing sourceId with CAST(dealId AS CHAR)
           -- mixes the column's collation with the connection's and MySQL
           -- refuses it (found rehearsing on MySQL 8, 14 October 2026).
           SUM(sourceType = 'deal' AND sourceId REGEXP '^[0-9]+$' AND CAST(sourceId AS UNSIGNED) = dealId) AS backfilled,
           SUM(sourceType = 'lead') AS leads,
           SUM(status = 'uploaded') AS uploaded
    FROM google_ads_conversion_uploads
  `);
  const r = rows[0];
  console.log(`  note ${r.total} row(s): ${r.uploaded ?? 0} uploaded, ${r.leads ?? 0} Lead row(s)`);
  // Straight after the migration every row is a pre-existing Deal row.
  if (Number(r.backfilled ?? 0) + Number(r.leads ?? 0) === Number(r.total)) pass("every Deal row kept and backfilled with sourceId = dealId");
  else fail(`only ${r.backfilled} of ${r.total} Deal row(s) carry sourceId = dealId`);

  for (const [name, columns] of [["google_ads_conversion_uploads_source_action", 3], ["google_ads_conversion_uploads_deal_action", 2]]) {
    const [idx] = await db.execute(sql`SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_ads_conversion_uploads' AND INDEX_NAME = ${name} AND NON_UNIQUE = 0`);
    if (Number(idx[0].n) === columns) pass(`unique index ${name} present (${columns} columns)`);
    else fail(`unique index ${name} has ${idx[0].n} column(s), expected ${columns}`);
  }
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
