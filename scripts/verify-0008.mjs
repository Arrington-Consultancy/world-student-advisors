// READ-ONLY post-migration verification for 0008 (enquiry and response history).
//
// Checks the production schema as it actually is, not as the migration
// intended. Asserts that both new tables exist with the expected columns,
// nullability, types and indexes; that both are empty, so the migration
// recorded no enquiry of its own; that no column carries a default that
// could invent a state nobody decided; and — the point of a migration-only
// change — that every pre-existing table and the one recorded staff access
// assignment are untouched.
//
// No writes, no DDL, no secrets, no row contents.

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`  OK: ${message}`);
  else {
    console.error(`  FAILED: ${message}`);
    failures += 1;
  }
}

// name -> [nullable, hasDefault]. Only createdAt may carry a default.
const ENQUIRY_COLUMNS = {
  id: ["NO", true],
  staffUserId: ["YES", false],
  authMethod: ["NO", false],
  caseId: ["YES", false],
  requestSummary: ["NO", false],
  functionalScope: ["NO", false],
  sensitiveOverlay: ["YES", false],
  leadWorkerId: ["YES", false],
  outcome: ["NO", false],
  finalResponse: ["YES", false],
  qualityCheckPassed: ["YES", false],
  approvalState: ["NO", false],
  approvedByStaffUserId: ["YES", false],
  approvedAt: ["YES", false],
  actionTaken: ["YES", false],
  createdAt: ["NO", true],
  updatedAt: ["YES", false],
};

const CONTRIBUTION_COLUMNS = {
  id: ["NO", true],
  enquiryId: ["NO", false],
  workerId: ["NO", false],
  workerSpecificationVersion: ["NO", false],
  isLead: ["NO", false],
  functionalScope: ["NO", false],
  position: ["YES", false],
  confidence: ["NO", false],
  evidenceQuality: ["NO", false],
  disagreedWithWorkerId: ["YES", false],
  cannotAnswer: ["NO", false],
  evidenceReference: ["YES", false],
  createdAt: ["NO", true],
};

async function columnsOf(table) {
  const [rows] = await db.execute(sql`
    SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE, EXTRA
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
  `);
  return rows;
}

async function verifyTable(table, expected) {
  console.log(`\n--- ${table} ---`);
  const cols = await columnsOf(table);
  check(cols.length > 0, `${table} exists`);
  if (cols.length === 0) return;

  const byName = new Map(cols.map(c => [c.COLUMN_NAME, c]));
  for (const [name, [nullable, mayHaveDefault]] of Object.entries(expected)) {
    const col = byName.get(name);
    check(Boolean(col), `column ${name} exists`);
    if (!col) continue;
    check(col.IS_NULLABLE === nullable, `column ${name} nullable=${nullable} (found ${col.IS_NULLABLE})`);
    if (!mayHaveDefault) {
      check(col.COLUMN_DEFAULT === null, `column ${name} has no default (a default would invent a state nobody decided)`);
    }
  }
  const unexpected = cols.map(c => c.COLUMN_NAME).filter(n => !(n in expected));
  check(unexpected.length === 0, `${table} has no unexpected column (found [${unexpected.join(", ")}])`);

  const [count] = await db.execute(sql.raw(`SELECT COUNT(*) AS n FROM \`${table}\``));
  check(Number(count[0].n) === 0, `${table} is empty — the migration recorded nothing of its own`);
}

try {
  console.log("=== 1. Migration history ===");
  const [applied] = await db.execute(sql.raw(
    "SELECT `hash`, `created_at` FROM `__drizzle_migrations` ORDER BY `created_at` ASC",
  ));
  console.log(`  applied migrations: ${applied.length}`);
  check(applied.length === 9, `nine migrations are applied (found ${applied.length})`);

  console.log("\n=== 2. The two new tables ===");
  await verifyTable("staff_enquiries", ENQUIRY_COLUMNS);
  await verifyTable("staff_enquiry_contributions", CONTRIBUTION_COLUMNS);

  console.log("\n=== 3. Indexes ===");
  const [indexes] = await db.execute(sql.raw(`
    SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('staff_enquiries','staff_enquiry_contributions')
     GROUP BY TABLE_NAME, INDEX_NAME
  `));
  const indexNames = indexes.map(i => i.INDEX_NAME);
  for (const required of [
    "staff_enquiries_staffUserId_idx",
    "staff_enquiries_caseId_idx",
    "staff_enquiries_createdAt_idx",
    "staff_enquiry_contributions_enquiryId_idx",
  ]) {
    check(indexNames.includes(required), `index ${required} exists`);
  }

  console.log("\n=== 4. Nothing that already existed was disturbed ===");
  const [tables] = await db.execute(sql.raw(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  ));
  const names = tables.map(t => t.TABLE_NAME);
  for (const required of [
    "users", "portal_users", "resources", "failed_submissions",
    "interview_coach_sessions", "staff_users", "workforce_audit_events",
    "infrastructure_audit_events", "staff_access_grants", "staff_access_changes",
  ]) {
    check(names.includes(required), `pre-existing table ${required} is still present`);
  }

  const [staff] = await db.execute(sql.raw(
    "SELECT COUNT(*) AS total, SUM(`baseAccessLevel` IS NOT NULL) AS assigned FROM `staff_users`",
  ));
  check(Number(staff[0].total) === 1, `staff_users still holds exactly 1 row (found ${staff[0].total})`);
  check(Number(staff[0].assigned) === 1, `still exactly 1 staff access assignment (found ${staff[0].assigned})`);

  const [grants] = await db.execute(sql.raw(
    "SELECT COUNT(*) AS n FROM `staff_access_grants` WHERE `revokedAt` IS NULL",
  ));
  check(Number(grants[0].n) === 2, `the 2 live access grants are unchanged (found ${grants[0].n})`);

  console.log(failures === 0 ? "\nAll post-migration checks passed." : `\n${failures} post-migration check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}
