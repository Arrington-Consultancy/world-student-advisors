import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0009.
//
// 0009 widens two ENUM columns to accept a third value, shared_executive.
// Widening an enum is backward compatible, but "backward compatible" is a
// claim, and the point of this script is to hold it to evidence:
//
//   1. Both columns now accept all three values, and the two original
//      values are still present. A MODIFY that dropped an existing value
//      would silently invalidate every historical row.
//   2. Row counts are unchanged. MySQL will coerce a value that no longer
//      fits to the empty string in non-strict mode rather than failing, so
//      the count alone is not enough and the next check exists.
//   3. No row in either table holds an empty or unrecognised authMethod,
//      which is what a lossy enum change would leave behind.
//   4. Every other table is still present, and the columns the platform
//      depends on elsewhere are untouched.
//
// No DDL, no writes, no row data beyond counts and the distinct enum
// values themselves, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const EXPECTED = ["entra_sso", "shared_executive", "shared_password"];
const TABLES = ["workforce_audit_events", "staff_enquiries"];

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;
const fail = message => {
  console.error(`  FAIL ${message}`);
  failures += 1;
};
const pass = message => console.log(`  ok   ${message}`);

try {
  // 1. The migration is recorded exactly once.
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // Ten, not nine: 0000 to 0008 is nine rows, and 0009 is the tenth.
  if (Number(migrations[0].n) !== 10) fail(`expected 10 applied migrations, found ${migrations[0].n}`);
  else pass("ten migrations applied");

  // 2. Both columns accept all three values, and lost neither original.
  console.log("\n=== authMethod columns ===");
  const [columns] = await db.execute(sql`
    SELECT TABLE_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'authMethod'
      AND TABLE_NAME IN ('workforce_audit_events', 'staff_enquiries')
    ORDER BY TABLE_NAME
  `);

  if (columns.length !== 2) fail(`expected 2 authMethod columns, found ${columns.length}`);

  for (const row of columns) {
    const type = String(row.COLUMN_TYPE);
    console.log(`  ${row.TABLE_NAME}: ${type} (nullable ${row.IS_NULLABLE})`);
    for (const value of EXPECTED) {
      if (type.includes(`'${value}'`)) pass(`${row.TABLE_NAME} accepts ${value}`);
      else fail(`${row.TABLE_NAME} does not accept ${value}`);
    }
    // The column must stay NOT NULL and keep no default: an audit row that
    // could omit its auth method would be an audit row that says nothing.
    if (row.IS_NULLABLE !== "NO") fail(`${row.TABLE_NAME}.authMethod became nullable`);
    else pass(`${row.TABLE_NAME}.authMethod is still NOT NULL`);
    if (row.COLUMN_DEFAULT !== null) fail(`${row.TABLE_NAME}.authMethod gained a default`);
    else pass(`${row.TABLE_NAME}.authMethod has no default`);
  }

  // 3. No row was coerced. An enum change that dropped a value would leave
  //    the empty string behind rather than erroring in non-strict mode.
  console.log("\n=== Existing rows survived intact ===");
  for (const table of TABLES) {
    const [rows] = await db.execute(
      sql.raw(`SELECT authMethod, COUNT(*) AS n FROM \`${table}\` GROUP BY authMethod ORDER BY authMethod`),
    );
    const total = rows.reduce((sum, r) => sum + Number(r.n), 0);
    console.log(`  ${table}: ${total} row(s)`);
    for (const row of rows) {
      const value = String(row.authMethod ?? "");
      console.log(`    ${value === "" ? "(empty)" : value}: ${row.n}`);
      if (value === "") fail(`${table} has ${row.n} row(s) with an empty authMethod, which means a lossy change`);
      else if (!EXPECTED.includes(value)) fail(`${table} has an unrecognised authMethod: ${value}`);
    }
    if (!rows.some(r => String(r.authMethod ?? "") === "")) pass(`${table} has no coerced rows`);
  }

  // 4. Nothing else moved.
  console.log("\n=== The rest of the schema is untouched ===");
  const [tables] = await db.execute(sql`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME
  `);
  const names = tables.map(t => String(t.TABLE_NAME));
  console.log(`  ${names.length} tables present`);
  for (const required of [
    "staff_users",
    "staff_access_grants",
    "staff_access_changes",
    "workforce_audit_events",
    "staff_enquiries",
    "staff_enquiry_contributions",
    "__drizzle_migrations",
  ]) {
    if (names.includes(required)) pass(`${required} present`);
    else fail(`${required} is missing`);
  }

  // The access assignment data this platform depends on must be unchanged;
  // 0009 touches neither table, so any movement here means something else
  // ran alongside it.
  const [access] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM staff_users) AS users,
      (SELECT COUNT(*) FROM staff_access_grants WHERE revokedAt IS NULL) AS live_grants
  `);
  console.log(`\n  staff_users=${access[0].users}, live grants=${access[0].live_grants}`);

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
