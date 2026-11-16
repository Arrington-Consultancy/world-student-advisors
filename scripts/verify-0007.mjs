import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for migration 0007. Prints:
//   1. Full migration history (drizzle bookkeeping only).
//   2. SHOW CREATE TABLE for staff_users — proving the seven new access
//      columns exist, are nullable, and carry no permissive default. That
//      last point is the one that matters: a default would silently grant
//      every existing staff row an access assignment nobody decided.
//   3. SHOW CREATE TABLE for the two new tables, with row counts (both
//      expected 0 — no assignment has been recorded at this point).
//   4. A count of staff rows carrying any access assignment (expected 0),
//      printed as a count only — no names, no emails, no row data.
//   5. Confirmation every pre-existing table is still present.
// No DDL, no writes, no business-table row data, no secrets printed, and
// no synthetic rows are created.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  OK: ${message}`);
  } else {
    console.error(`  FAILED: ${message}`);
    failures += 1;
  }
}

try {
  console.log("=== 1. Migration history (__drizzle_migrations) ===");
  const [migrations] = await db.execute(sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`);
  for (const row of migrations) {
    console.log(`  id=${row.id} created_at=${row.created_at} hash=${row.hash}`);
  }

  console.log("\n=== 2. SHOW CREATE TABLE staff_users ===");
  const [staffDdl] = await db.execute(sql.raw("SHOW CREATE TABLE `staff_users`"));
  const staffCreate = staffDdl[0]["Create Table"];
  console.log(staffCreate);

  console.log("\n--- new access columns present, nullable, no permissive default ---");
  const NEW_COLUMNS = [
    "baseAccessLevel",
    "caseScope",
    "accessStatus",
    "teamId",
    "assignedByStaffUserId",
    "assignedAt",
    "assignmentReason",
  ];
  const [columns] = await db.execute(
    sql.raw("SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'"),
  );
  const byName = new Map(columns.map(c => [c.COLUMN_NAME, c]));
  for (const name of NEW_COLUMNS) {
    const col = byName.get(name);
    check(Boolean(col), `column ${name} exists`);
    if (!col) continue;
    check(col.IS_NULLABLE === "YES", `column ${name} is nullable (an account with no decision holds nothing)`);
    check(col.COLUMN_DEFAULT === null, `column ${name} has no default (default would invent an assignment)`);
  }

  console.log("\n=== 3. New tables ===");
  for (const table of ["staff_access_grants", "staff_access_changes"]) {
    const [ddl] = await db.execute(sql.raw(`SHOW CREATE TABLE \`${table}\``));
    console.log(ddl[0]["Create Table"]);
    const [count] = await db.execute(sql.raw(`SELECT COUNT(*) AS n FROM \`${table}\``));
    console.log(`  row count: ${count[0].n}`);
    check(Number(count[0].n) === 0, `${table} is empty — no assignment has been recorded by this migration`);
  }

  console.log("\n=== 4. Staff rows carrying any access assignment (count only) ===");
  const [assigned] = await db.execute(
    sql.raw("SELECT COUNT(*) AS n FROM `staff_users` WHERE `baseAccessLevel` IS NOT NULL OR `accessStatus` IS NOT NULL OR `caseScope` IS NOT NULL"),
  );
  console.log(`  staff rows with an access assignment: ${assigned[0].n}`);
  check(Number(assigned[0].n) === 0, "no staff row was given an assignment by the migration itself");

  const [total] = await db.execute(sql.raw("SELECT COUNT(*) AS n FROM `staff_users`"));
  console.log(`  total staff rows: ${total[0].n} (unchanged by this migration)`);

  console.log("\n=== 5. All tables (pre-existing structures intact) ===");
  const [tables] = await db.execute(sql`SHOW TABLES`);
  const names = tables.map(row => String(Object.values(row)[0]));
  for (const name of names.sort()) console.log(`  ${name}`);
  for (const required of [
    "staff_users",
    "workforce_audit_events",
    "infrastructure_audit_events",
    "interview_coach_sessions",
    "portal_users",
    "users",
    "resources",
    "failed_submissions",
  ]) {
    check(names.includes(required), `pre-existing table ${required} is still present`);
  }

  console.log(failures === 0 ? "\nAll post-migration checks passed." : `\n${failures} post-migration check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}
