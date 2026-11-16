import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0014 (per-user session
// invalidation).
//
// Three jobs. Prove the column exists with the exact shape the control
// depends on: NOT NULL, integer, defaulting to 1. Prove it is backwards-safe
// for the accounts that predate it, meaning every existing row now holds a
// defined version and none is null. And prove nothing else moved.
//
// The NOT NULL matters more than it looks. A nullable column would let a row
// hold null, decideSessionVersion would refuse every token for that account
// as malformed, and the person would be locked out with no way to sign in.
// The default matters for the same reason from the other direction.
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
  // 0000 to 0013 is fourteen rows, so 0014 is the fifteenth.
  if (Number(migrations[0].n) !== 15) fail(`expected 15 applied migrations, found ${migrations[0].n}`);
  else pass("fifteen migrations applied");

  console.log("\n=== staff_users.sessionVersion ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users' AND COLUMN_NAME = 'sessionVersion'
  `);
  if (cols.length === 0) {
    fail("sessionVersion does not exist");
  } else {
    const c = cols[0];
    console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (nullable ${c.IS_NULLABLE}, default ${c.COLUMN_DEFAULT})`);
    if (c.IS_NULLABLE === "NO") pass("NOT NULL, so no account can hold a null version and lock itself out");
    else fail("sessionVersion must be NOT NULL");
    if (String(c.COLUMN_DEFAULT) === "1") pass("defaults to 1, which is what gave existing rows a defined value");
    else fail(`default must be 1, found ${c.COLUMN_DEFAULT}`);
    if (String(c.COLUMN_TYPE).startsWith("int")) pass("integer, which is what the comparison requires");
    else fail(`type must be int, found ${c.COLUMN_TYPE}`);
  }

  console.log("\n=== Backwards-safe for the existing accounts ===");
  const [rows] = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      SUM(sessionVersion IS NULL) AS nulls,
      MIN(sessionVersion) AS lowest,
      MAX(sessionVersion) AS highest
    FROM staff_users
  `);
  const r = rows[0];
  console.log(`  total=${r.total} nulls=${r.nulls} lowest=${r.lowest} highest=${r.highest}`);
  if (Number(r.nulls) === 0) pass("every account holds a version, none null");
  else fail(`${r.nulls} account(s) hold a null version and cannot sign in`);
  if (Number(r.lowest) >= 1) pass("no account is below the initial version");
  else fail("an account holds a version below 1");

  console.log("\n=== Nothing else moved ===");
  const [allCols] = await db.execute(sql`
    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
  `);
  const byName = Object.fromEntries(allCols.map(c => [String(c.COLUMN_NAME), c]));
  // The controls from 0011, 0012 and 0013 must be untouched by this.
  for (const required of ["authProvider", "googleSubjectId", "entraObjectId", "passwordHash", "email", "isActive"]) {
    if (byName[required]) pass(`${required} still present`); else fail(`${required} disappeared`);
  }
  if (byName.passwordHash?.IS_NULLABLE === "YES") pass("passwordHash still nullable");
  else fail("passwordHash nullability changed");

  const [tables] = await db.execute(sql`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  const names = tables.map(t => String(t.TABLE_NAME));
  for (const required of ["staff_users", "staff_signup_requests", "staff_approved_emails", "staff_access_grants", "staff_access_changes", "workforce_audit_events", "worker_conversation_turns", "__drizzle_migrations"]) {
    if (names.includes(required)) pass(`${required} present`); else fail(`${required} is missing`);
  }

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
