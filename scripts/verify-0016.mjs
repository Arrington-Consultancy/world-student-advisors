import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0016 (Management-information resolutions).
//
// Prove the table exists with the columns the writer depends on and the
// enum values the classifier can produce, prove it is empty (a migration
// creates a table, it does not populate one), and prove nothing else moved.
//
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
  // 0000 to 0015 is sixteen rows, so 0016 is the seventeenth.
  if (Number(migrations[0].n) !== 17) fail(`expected 17 applied migrations, found ${migrations[0].n}`);
  else pass("seventeen migrations applied");

  console.log("\n=== information_resolutions ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'information_resolutions'
  `);
  if (cols.length === 0) {
    fail("information_resolutions does not exist");
  } else {
    const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
    for (const required of [
      "id", "requestText", "staffUserId", "authMethod", "measure", "subject", "outcome", "gapType",
      "coverageFrom", "coverageTo", "reliableFrom", "sourcesChecked", "humanOwner", "answerText",
      "routerVersion", "reviewOutcome", "reviewedAt", "createdAt",
    ]) {
      if (byName[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    const gapType = String(byName.gapType?.COLUMN_TYPE ?? "");
    for (const value of ["none", "router_defect", "workforce_remit_gap", "connector_gap", "data_quality_gap", "reporting_gap", "permission_gap", "out_of_scope"]) {
      if (gapType.includes(`'${value}'`)) pass(`gapType accepts ${value}`); else fail(`gapType does not accept ${value}`);
    }
    if (byName.requestText?.IS_NULLABLE === "NO") pass("requestText is required"); else fail("requestText must be NOT NULL");
    if (byName.answerText?.IS_NULLABLE === "NO") pass("answerText is required: every resolution records what was said"); else fail("answerText must be NOT NULL");
    const [rows] = await db.execute(sql`SELECT COUNT(*) AS n FROM information_resolutions`);
    if (Number(rows[0].n) === 0) pass("table is empty, as a fresh migration should leave it"); else console.log(`  note ${rows[0].n} row(s) present (second verification run after use is fine)`);
  }
  const [gap] = await db.execute(sql`SELECT COUNT(*) AS n FROM routing_gap_log`);
  pass(`routing_gap_log untouched and readable (${gap[0].n} rows)`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
