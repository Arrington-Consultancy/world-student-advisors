import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for migration 0005. Prints:
//   1. Full migration history (drizzle bookkeeping only).
//   2. SHOW CREATE TABLE for staff_users and workforce_audit_events —
//      the complete production DDL: columns, types, nullability, defaults,
//      keys, constraints, enum definitions. These tables are empty at this
//      point (no staff user exists yet), so this is pure schema metadata.
//   3. Confirmation the pre-existing tables are still present.
// No DDL, no writes, no business-table row data, no secrets printed.

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

  for (const table of ["staff_users", "workforce_audit_events"]) {
    console.log(`\n=== 2. SHOW CREATE TABLE ${table} ===`);
    const [rows] = await db.execute(sql.raw(`SHOW CREATE TABLE \`${table}\``));
    console.log(rows[0]["Create Table"]);
    const [count] = await db.execute(sql.raw(`SELECT COUNT(*) AS n FROM \`${table}\``));
    console.log(`  row count: ${count[0].n}`);
  }

  console.log("\n=== 3. All tables (pre-existing structures intact) ===");
  const [tables] = await db.execute(sql`SHOW TABLES`);
  for (const row of tables) console.log(`  ${Object.values(row)[0]}`);
} catch (error) {
  console.error("Verification query failed:", error.message);
  if (error.cause?.code) console.error("Underlying error code:", error.cause.code);
  process.exit(1);
}

process.exit(0);
