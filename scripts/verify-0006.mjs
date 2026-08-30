import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for migration 0006. Prints:
//   1. Full migration history (drizzle bookkeeping only).
//   2. SHOW CREATE TABLE for infrastructure_audit_events — the complete
//      production DDL: columns, types, nullability, defaults, keys,
//      constraints, enum definitions. The table is empty at this point
//      (no infrastructure run has happened), so this is pure schema
//      metadata; the row count is printed to prove it.
//   3. Confirmation every pre-existing table is still present.
// No DDL, no writes, no business-table row data, no secrets printed,
// and no synthetic rows are created.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  console.log("=== 1. Migration history (__drizzle_migrations) ===");
  const [migrations] = await db.execute(sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`);
  for (const row of migrations) {
    console.log(`  id=${row.id} created_at=${row.created_at} hash=${row.hash}`);
  }

  console.log("\n=== 2. SHOW CREATE TABLE infrastructure_audit_events ===");
  const [rows] = await db.execute(sql.raw("SHOW CREATE TABLE `infrastructure_audit_events`"));
  console.log(rows[0]["Create Table"]);
  const [count] = await db.execute(sql.raw("SELECT COUNT(*) AS n FROM `infrastructure_audit_events`"));
  console.log(`  row count: ${count[0].n}`);

  console.log("\n=== 3. All tables (pre-existing structures intact) ===");
  const [tables] = await db.execute(sql`SHOW TABLES`);
  const names = tables.map(row => String(Object.values(row)[0]));
  for (const name of names.sort()) console.log(`  ${name}`);
  for (const required of ["staff_users", "workforce_audit_events", "interview_coach_sessions", "portal_users", "users", "resources", "failed_submissions"]) {
    if (!names.includes(required)) {
      console.error(`MISSING pre-existing table: ${required}`);
      process.exit(1);
    }
  }
  console.log("  (all pre-existing tables present)");
} catch (error) {
  console.error("Verification query failed:", error.message);
  if (error.cause?.code) console.error("Underlying error code:", error.cause.code);
  process.exit(1);
}

process.exit(0);
