import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY ordering guard for the executive password deployment.
//
// Setting EXECUTIVE_PASSWORD_HASH is what makes the break-glass route
// exist. From that moment the first person to use it writes an audit row
// with authMethod = shared_executive, and if migration 0009 has not been
// applied the column rejects it. The sign-in would then either fail or,
// worse, succeed with the audit write swallowed, which is an unaudited
// unrestricted session and precisely what the audit trail is for.
//
// The ordering is therefore a control, not a preference, so it is checked
// against production rather than remembered.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [columns] = await db.execute(sql`
    SELECT TABLE_NAME, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'authMethod'
      AND TABLE_NAME IN ('workforce_audit_events', 'staff_enquiries')
    ORDER BY TABLE_NAME
  `);

  if (columns.length !== 2) {
    console.error(`STOPPING: expected 2 authMethod columns, found ${columns.length}.`);
    process.exit(1);
  }

  let missing = 0;
  for (const row of columns) {
    const accepts = String(row.COLUMN_TYPE).includes("shared_executive");
    console.log(`  ${accepts ? "ok  " : "FAIL"} ${row.TABLE_NAME}: ${row.COLUMN_TYPE}`);
    if (!accepts) missing += 1;
  }

  if (missing > 0) {
    console.error(
      "\nSTOPPING: the audit columns do not accept shared_executive yet, so migration 0009 " +
        "has not been applied. Run apply-migration-0009.yml first. Nothing has been changed.",
    );
    process.exit(1);
  }

  console.log("\nThe audit trail can record an executive session. Safe to deploy the hash.");
} catch (err) {
  console.error("Ordering check failed:", err.message);
  process.exit(1);
}

process.exit(0);
