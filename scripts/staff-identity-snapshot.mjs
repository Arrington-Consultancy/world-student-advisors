import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY snapshot of the Stage 3 identity tables, for the production
// identity acceptance test. Prints staff_users rows with minimal personal
// data (id, a short prefix of the stable Entra oid, the email's local-part
// initial and domain, active state, timestamps) and the most recent
// workforce_audit_events rows (bookkeeping fields only, no free text
// beyond the controlled permissionReason). No writes, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [staffRows] = await db.execute(
    sql`SELECT id, LEFT(entraObjectId, 8) AS oidPrefix, CONCAT(LEFT(email, 2), '…@', SUBSTRING_INDEX(email, '@', -1)) AS emailMasked, displayName, isActive, createdAt, lastLoginAt FROM staff_users ORDER BY id ASC`,
  );
  console.log(`=== staff_users (${staffRows.length} row(s)) ===`);
  for (const row of staffRows) {
    console.log(`  id=${row.id} oid=${row.oidPrefix}… ${row.emailMasked} "${row.displayName}" isActive=${row.isActive} created=${row.createdAt?.toISOString?.() ?? row.createdAt} lastLogin=${row.lastLoginAt?.toISOString?.() ?? row.lastLoginAt}`);
  }
  if (staffRows.length === 0) console.log("  (none — no staff identity has been created yet)");

  const [auditRows] = await db.execute(
    sql`SELECT id, staffUserId, authMethod, workerId, requestedCapability, permissionDecision, permissionReason, success, errorCategory, createdAt FROM workforce_audit_events ORDER BY id DESC LIMIT 20`,
  );
  console.log(`\n=== workforce_audit_events (latest ${auditRows.length} of table) ===`);
  for (const row of auditRows) {
    console.log(`  id=${row.id} staffUserId=${row.staffUserId} auth=${row.authMethod} worker=${row.workerId} cap=${row.requestedCapability} decision=${row.permissionDecision} success=${row.success} err=${row.errorCategory} at=${row.createdAt?.toISOString?.() ?? row.createdAt}`);
    console.log(`      reason: ${String(row.permissionReason).slice(0, 160)}`);
  }
  if (auditRows.length === 0) console.log("  (none)");
} catch (error) {
  console.error("Snapshot query failed:", error.message);
  if (error.cause?.code) console.error("Underlying error code:", error.cause.code);
  process.exit(1);
}

process.exit(0);
