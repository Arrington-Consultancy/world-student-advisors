import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0010.
//
// 0010 adds one table and changes nothing else, so the verification has
// two jobs: prove the new table is exactly what the code expects, and
// prove that nothing which already existed moved.
//
// The column checks are not ceremony. staffUserId and workerId are what
// make a conversation belong to one person and one worker, and role is
// what keeps a staff message from being replayed as a worker's words. A
// column missing or of the wrong shape would not fail loudly at runtime;
// it would quietly weaken an isolation boundary.
//
// No DDL, no writes, no row data beyond counts, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TABLE = "worker_conversation_turns";
const db = drizzle(process.env.DATABASE_URL);
let failures = 0;
const fail = m => { console.error(`  FAIL ${m}`); failures += 1; };
const pass = m => console.log(`  ok   ${m}`);

try {
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // 0000 to 0009 is ten rows, so 0010 is the eleventh.
  if (Number(migrations[0].n) !== 11) fail(`expected 11 applied migrations, found ${migrations[0].n}`);
  else pass("eleven migrations applied");

  console.log(`\n=== ${TABLE} ===`);
  const [columns] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${TABLE}
    ORDER BY ORDINAL_POSITION
  `);
  if (columns.length === 0) {
    fail(`${TABLE} does not exist`);
  } else {
    const byName = Object.fromEntries(columns.map(c => [String(c.COLUMN_NAME), c]));
    for (const c of columns) console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (nullable ${c.IS_NULLABLE})`);

    for (const required of ["id", "conversationId", "staffUserId", "workerId", "role", "content", "createdAt"]) {
      if (byName[required]) pass(`${required} present`);
      else fail(`${required} is missing`);
    }

    // These three carry the isolation boundary, so their shape matters.
    if (byName.conversationId && byName.conversationId.IS_NULLABLE === "NO") pass("conversationId is NOT NULL, so no turn is unattached");
    else fail("conversationId must be NOT NULL");
    if (byName.workerId && byName.workerId.IS_NULLABLE === "NO") pass("workerId is NOT NULL, so every turn names its worker");
    else fail("workerId must be NOT NULL");
    if (byName.role && String(byName.role.COLUMN_TYPE).includes("'staff'") && String(byName.role.COLUMN_TYPE).includes("'worker'")) {
      pass("role distinguishes staff from worker");
    } else fail("role must be an enum of staff and worker");
    // staffUserId is deliberately nullable: the executive sentinel is -1
    // and a session with no resolved identity stores null.
    if (byName.staffUserId && byName.staffUserId.IS_NULLABLE === "YES") pass("staffUserId is nullable, as the design requires");
    else fail("staffUserId should be nullable");
  }

  console.log("\n=== The indexes ownership lookups rely on ===");
  const [indexes] = await db.execute(sql`
    SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${TABLE}
  `);
  const names = indexes.map(i => String(i.INDEX_NAME));
  console.log(`  ${names.join(", ")}`);
  for (const required of ["worker_conversation_turns_conversation_idx", "worker_conversation_turns_owner_idx"]) {
    if (names.includes(required)) pass(`${required} present`);
    else fail(`${required} is missing`);
  }

  console.log("\n=== Nothing that already existed moved ===");
  const [tables] = await db.execute(sql`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME
  `);
  const tableNames = tables.map(t => String(t.TABLE_NAME));
  console.log(`  ${tableNames.length} tables present`);
  for (const required of [
    "staff_users", "staff_access_grants", "staff_access_changes",
    "workforce_audit_events", "staff_enquiries", "staff_enquiry_contributions",
    "__drizzle_migrations",
  ]) {
    if (tableNames.includes(required)) pass(`${required} present`);
    else fail(`${required} is missing`);
  }

  // 0010 touches neither of these, so movement here means something else ran.
  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM staff_users) AS users,
      (SELECT COUNT(*) FROM staff_access_grants WHERE revokedAt IS NULL) AS live_grants,
      (SELECT COUNT(*) FROM workforce_audit_events) AS audit_rows
  `);
  console.log(`\n  staff_users=${counts[0].users}, live grants=${counts[0].live_grants}, audit rows=${counts[0].audit_rows}`);

  const [turns] = await db.execute(sql.raw(`SELECT COUNT(*) AS n FROM \`${TABLE}\``));
  console.log(`  ${TABLE} rows: ${turns[0].n}`);

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
