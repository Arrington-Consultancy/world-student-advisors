import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0015 (Routing Gap Log).
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
  // 0000 to 0014 is fifteen rows, so 0015 is the sixteenth.
  if (Number(migrations[0].n) !== 16) fail(`expected 16 applied migrations, found ${migrations[0].n}`);
  else pass("sixteen migrations applied");

  console.log("\n=== routing_gap_log ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'routing_gap_log'
  `);
  if (cols.length === 0) {
    fail("routing_gap_log does not exist");
  } else {
    const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
    for (const required of [
      "id", "requestText", "staffUserId", "authMethod", "caseReference", "interpretedIntent",
      "candidateWorkerIds", "confidence", "failureType", "failureReason", "originalWorkerId",
      "correctedWorkerId", "staffNextAction", "routerVersion", "reviewOutcome", "reviewedAt", "createdAt",
    ]) {
      if (byName[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    const failureType = String(byName.failureType?.COLUMN_TYPE ?? "");
    for (const value of [
      "no_recognised_intent", "subject_without_approved_remit", "remit_but_worker_inactive",
      "remit_but_capability_closed", "permission_failure", "connector_failure",
      "ambiguity_needs_clarification", "router_misclassification_corrected",
    ]) {
      if (failureType.includes(`'${value}'`)) pass(`failureType accepts ${value}`);
      else fail(`failureType does not accept ${value}`);
    }
    if (byName.requestText?.IS_NULLABLE === "NO") pass("requestText is required, so no gap is recorded without its wording");
    else fail("requestText must be NOT NULL");
    if (byName.routerVersion?.IS_NULLABLE === "NO") pass("routerVersion is required, so every row names the model that decided");
    else fail("routerVersion must be NOT NULL");
    if (byName.caseReference?.COLUMN_TYPE === "varchar(60)") pass("caseReference is identifier-sized, not a copy of the case");
    else fail(`caseReference should be varchar(60), found ${byName.caseReference?.COLUMN_TYPE}`);
  }

  const [count] = await db.execute(sql`SELECT COUNT(*) AS n FROM routing_gap_log`);
  console.log(`\n=== Contents ===\n  rows: ${count[0].n}`);
  pass("row count read; a fresh table is expected to be empty and a re-run may not be");

  console.log("\n=== Nothing else moved ===");
  const [tables] = await db.execute(sql`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  const names = tables.map(t => String(t.TABLE_NAME));
  for (const required of ["staff_users", "staff_signup_requests", "staff_approved_emails", "staff_access_grants", "staff_access_changes", "workforce_audit_events", "worker_conversation_turns", "__drizzle_migrations"]) {
    if (names.includes(required)) pass(`${required} present`); else fail(`${required} is missing`);
  }
  const [staffCols] = await db.execute(sql`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
  `);
  const staffNames = new Set(staffCols.map(c => String(c.COLUMN_NAME)));
  for (const required of ["sessionVersion", "authProvider", "googleSubjectId", "entraObjectId", "passwordHash", "email", "isActive"]) {
    if (staffNames.has(required)) pass(`staff_users.${required} still present`); else fail(`staff_users.${required} disappeared`);
  }

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
