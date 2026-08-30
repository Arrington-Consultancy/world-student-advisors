// READ-ONLY production pre-flight for the access-control enforcement gate.
//
// Answers one question the earlier scripts do not: if enforcement were
// switched on over live Staff Portal surfaces right now, exactly who would
// still get in, and who would be locked out?
//
// It re-reads production on its own terms rather than trusting any earlier
// report, and it re-implements the resolution rules from
// server/access/identity.ts and the status rule from
// server/access/accessControl.ts so the answer comes from the same logic
// the server would apply, not from a summary of it.
//
// Personal data is kept to the minimum needed to identify whose row is
// whose: display name, an 8-character Entra oid prefix, and the email as
// first-two-characters plus domain. The full address is never printed.
//
// No writes, no DDL, no secrets.

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
const CONSEQUENTIAL = [
  "export_download", "external_send", "submit", "delete_destructive",
  "financial_action", "access_admin", "credential_admin",
];
const VALID_LEVELS = [1, 2, 3, 4, 5];
const VALID_CASE_SCOPES = ["organisation", "team", "assigned_caseload", "own_applicants"];

let concerns = 0;
function concern(message) {
  console.error(`  CONCERN: ${message}`);
  concerns += 1;
}

/**
 * server/access/identity.ts buildProfile + resolveStatus, restated.
 * Returns why a row would or would not yield a usable access profile.
 */
function resolveRow(row) {
  const allNull = row.baseAccessLevel === null && row.caseScope === null && row.accessStatus === null;
  if (allNull) return { resolved: false, reason: "no_access_assignment" };
  if (!VALID_LEVELS.includes(Number(row.baseAccessLevel))) {
    return { resolved: false, reason: `invalid_access_assignment (level=${row.baseAccessLevel})` };
  }
  if (!VALID_CASE_SCOPES.includes(row.caseScope)) {
    return { resolved: false, reason: `invalid_access_assignment (caseScope=${row.caseScope})` };
  }
  // Both status columns must permit: isActive governs whether the person
  // may hold a session at all, accessStatus the state of the assignment.
  const status = Number(row.isActive) !== 1
    ? "disabled"
    : (["active", "suspended", "disabled"].includes(row.accessStatus) ? row.accessStatus : "disabled");
  return { resolved: true, status, level: Number(row.baseAccessLevel), caseScope: row.caseScope };
}

try {
  console.log("=== 1. Migration history in production ===");
  let journal = [];
  try {
    const [rows] = await db.execute(sql.raw(
      "SELECT `hash`, `created_at` FROM `__drizzle_migrations` ORDER BY `created_at` ASC",
    ));
    journal = rows;
  } catch (err) {
    concern(`could not read __drizzle_migrations: ${err.message}`);
  }
  console.log(`  applied migrations: ${journal.length}`);
  for (const m of journal) {
    console.log(`    ${new Date(Number(m.created_at)).toISOString()}  ${String(m.hash).slice(0, 12)}…`);
  }

  console.log("\n=== 2. The 0007 access columns, as production actually has them ===");
  const [cols] = await db.execute(sql.raw(`
    SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
       AND COLUMN_NAME IN ('baseAccessLevel','caseScope','accessStatus','teamId',
                           'assignedByStaffUserId','assignedAt','assignmentReason')
     ORDER BY COLUMN_NAME
  `));
  for (const c of cols) {
    console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} nullable=${c.IS_NULLABLE} default=${c.COLUMN_DEFAULT ?? "NULL"}`);
    if (c.IS_NULLABLE !== "YES") concern(`${c.COLUMN_NAME} is NOT nullable`);
    if (c.COLUMN_DEFAULT !== null) concern(`${c.COLUMN_NAME} has a default (${c.COLUMN_DEFAULT})`);
  }
  if (cols.length !== 7) concern(`expected 7 access columns on staff_users, found ${cols.length}`);

  const [tables] = await db.execute(sql.raw(`
    SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('staff_access_grants','staff_access_changes','staff_enquiries')
     ORDER BY TABLE_NAME
  `));
  const present = tables.map(t => t.TABLE_NAME);
  console.log(`  access tables present: [${present.join(", ") || "none"}]`);
  if (!present.includes("staff_access_grants")) concern("staff_access_grants is missing");
  if (!present.includes("staff_access_changes")) concern("staff_access_changes is missing");

  console.log("\n=== 3. Every staff_users row, and what enforcement would do to it ===");
  const [staff] = await db.execute(sql`
    SELECT id, displayName, LEFT(entraObjectId, 8) AS oidPrefix,
           CONCAT(LEFT(email, 2), '…@', SUBSTRING_INDEX(email, '@', -1)) AS emailMasked,
           isActive, baseAccessLevel, caseScope, accessStatus, teamId,
           assignedByStaffUserId, assignedAt, createdAt, lastLoginAt
      FROM staff_users
     ORDER BY id ASC
  `);
  console.log(`  total staff_users rows: ${staff.length}`);

  const wouldRetain = [];
  const wouldLose = [];
  for (const r of staff) {
    const outcome = resolveRow(r);
    const verdict = outcome.resolved && outcome.status === "active";
    (verdict ? wouldRetain : wouldLose).push(r);
    console.log(`\n  id=${r.id} "${r.displayName}" oid=${r.oidPrefix}… ${r.emailMasked}`);
    console.log(`      isActive=${r.isActive} level=${r.baseAccessLevel} caseScope=${r.caseScope} accessStatus=${r.accessStatus} teamId=${r.teamId}`);
    console.log(`      lastLoginAt=${r.lastLoginAt ? new Date(r.lastLoginAt).toISOString() : "(never)"}`);
    console.log(`      -> under enforcement: ${verdict ? "RETAINS ACCESS" : "DENIED"}` +
      (outcome.resolved ? ` (status=${outcome.status})` : ` (${outcome.reason})`));
  }

  console.log("\n=== 4. Lockout summary ===");
  console.log(`  would retain access: ${wouldRetain.length} — ${wouldRetain.map(r => `${r.id}:"${r.displayName}"`).join(", ") || "(none)"}`);
  console.log(`  would be denied:     ${wouldLose.length} — ${wouldLose.map(r => `${r.id}:"${r.displayName}"`).join(", ") || "(none)"}`);
  if (wouldRetain.length === 0) {
    concern("NOBODY would retain individual-identity access under enforcement — this is a total lockout");
  }
  console.log("  note: a shared-password session carries no individual identity and resolves to");
  console.log("        no_individual_identity, so it is DENIED by the model regardless of the rows above.");

  console.log("\n=== 5. Grants, including revoked and expired ===");
  const [grants] = await db.execute(sql`
    SELECT id, staffUserId, grantType, value, expiresAt, grantedByStaffUserId,
           grantedAt, revokedAt, revokedByStaffUserId
      FROM staff_access_grants
     ORDER BY staffUserId ASC, id ASC
  `);
  console.log(`  total grant rows: ${grants.length}`);
  const now = new Date();
  const liveActions = [];
  for (const g of grants) {
    const expired = g.expiresAt instanceof Date && g.expiresAt <= now;
    const revoked = g.revokedAt !== null;
    const live = !expired && !revoked;
    console.log(`  id=${g.id} staffUserId=${g.staffUserId} ${g.grantType}=${g.value} ` +
      `expires=${g.expiresAt ? new Date(g.expiresAt).toISOString() : "(standing)"} ` +
      `${revoked ? "REVOKED " : ""}${expired ? "EXPIRED " : ""}${live ? "LIVE" : ""}`);
    if (live && g.grantType === "action_permission") liveActions.push(g.value);
    if (live && g.grantType === "sensitive_overlay") concern(`a sensitive overlay is live: ${g.value} (staffUserId=${g.staffUserId})`);
  }
  for (const a of CONSEQUENTIAL) {
    if (liveActions.includes(a)) concern(`a consequential action permission is live: ${a}`);
  }
  console.log(`  live action permissions across all staff: [${[...new Set(liveActions)].join(", ") || "none"}]`);

  console.log("\n=== 6. Access change audit ===");
  const [changes] = await db.execute(sql.raw(
    "SELECT COUNT(*) AS n, COUNT(DISTINCT `staffUserId`) AS people FROM `staff_access_changes`",
  ));
  console.log(`  audit rows: ${changes[0].n}, covering ${changes[0].people} staff member(s)`);

  console.log(concerns === 0
    ? "\nPre-flight complete. No concerns raised."
    : `\nPre-flight complete. ${concerns} concern(s) raised above.`);
  process.exit(0);
} catch (err) {
  console.error("Pre-flight failed:", err.message);
  process.exit(1);
}
