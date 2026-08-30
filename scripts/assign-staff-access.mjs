// Records ONE controlled access assignment against an EXISTING staff_users
// row, and writes the audit trail the Access Control Standard §9 requires.
//
// What this deliberately cannot do:
//   - It never creates a staff account. The row must already exist, having
//     been created by a genuine Microsoft Entra sign-in. If no row matches
//     the given id, it stops.
//   - It never infers whose row it is from position. The caller must name
//     the staff_user id AND the display name they believe it carries, and
//     the two must match the live row exactly. "It is the only row, so it
//     must be them" is not identification, and this script cannot be used
//     that way.
//   - It never grants an action permission that was not named on the
//     command line, and it refuses outright to grant credential_admin,
//     delete_destructive, financial_action, access_admin, external_send or
//     submit. Those are consequential permissions (§3) and are not part of
//     any first assignment; granting one is its own decision, made
//     deliberately, not a flag on a bootstrap script.
//   - It never widens an assignment that already exists. If the staff row
//     already carries a level, it stops and prints what is there. Changing
//     an existing assignment is a different operation with a different
//     audit shape.
//   - It validates every value against the approved lists before writing.
//
// Everything it writes is recorded in staff_access_changes with who, what,
// when and why, plus the controlled authority reference passed in.
//
// Usage (all arguments required):
//   node scripts/assign-staff-access.mjs \
//     --staff-user-id <id> \
//     --expect-display-name "<exact displayName on that row>" \
//     --level <1-5> \
//     --scopes <comma-separated functional scopes> \
//     --case-scope <organisation|team|assigned_caseload|own_applicants> \
//     --actions <comma-separated action permissions> \
//     --authority "<controlled approval reference>" \
//     --reason "<why this assignment>" \
//     [--team <team id>] \
//     [--overlays <comma-separated sensitive overlays>] \
//     [--apply]
//
// Without --apply it prints exactly what it would write and changes
// nothing. That is the default on purpose.

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const FUNCTIONAL_SCOPES = [
  "executive", "operations", "enquiry_triage", "discovery", "education_research",
  "suitability", "admissions", "visa_compliance", "scholarships_funding",
  "pre_arrival_student_success", "quality_assurance", "marketing_seo", "paid_media",
  "records_control", "governance", "finance", "safeguarding", "technical_administration",
];
const ACTION_PERMISSIONS = [
  "read", "create", "update", "comment_handoff", "export_download", "external_send",
  "submit", "approve", "delete_destructive", "financial_action", "access_admin", "credential_admin",
];
// §3 — never granted by this script, whatever is passed.
const REFUSED_ACTIONS = new Set([
  "credential_admin", "delete_destructive", "financial_action", "access_admin", "external_send", "submit",
]);
const CASE_SCOPES = ["organisation", "team", "assigned_caseload", "own_applicants"];
const SENSITIVE_OVERLAYS = [
  "finance", "safeguarding", "visa_regulated", "hr_staff_private",
  "complaints_legal", "credentials_security", "records_destructive",
];

// Values come from the environment first, then the command line.
//
// The environment path exists because the workflow must not build a shell
// command out of them: a reason or authority reference containing an
// apostrophe breaks the quoting, and one containing a quote plus a
// semicolon would be executed. Reading them here means nothing a caller
// supplies is ever parsed by a shell.
function arg(name) {
  const envName = `WSA_ASSIGN_${name.toUpperCase().replace(/-/g, "_")}`;
  const fromEnv = process.env[envName];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}
const APPLY = process.env.WSA_ASSIGN_APPLY === "true" || process.argv.includes("--apply");

function fail(message) {
  console.error(`STOPPING: ${message}`);
  process.exit(1);
}

function list(value) {
  return (value ?? "").split(",").map(s => s.trim()).filter(Boolean);
}

const staffUserId = Number(arg("staff-user-id"));
const expectDisplayName = arg("expect-display-name");
const level = Number(arg("level"));
const scopes = list(arg("scopes"));
const caseScope = arg("case-scope");
const actions = list(arg("actions"));
const overlays = list(arg("overlays"));
const teamId = arg("team");
const authority = arg("authority");
const reason = arg("reason");

if (!Number.isInteger(staffUserId) || staffUserId <= 0) fail("--staff-user-id is required and must be a positive integer.");
if (!expectDisplayName) {
  fail("--expect-display-name is required: name who you believe this row is, so the script can refuse if it is somebody else.");
}
if (![1, 2, 3, 4, 5].includes(level)) fail("--level must be 1, 2, 3, 4 or 5.");
if (!CASE_SCOPES.includes(caseScope)) fail(`--case-scope must be one of ${CASE_SCOPES.join(", ")}.`);
if (scopes.length === 0) fail("--scopes must name at least one functional scope.");
if (actions.length === 0) fail("--actions must name at least one action permission.");
if (!authority) fail("--authority is required: the controlled approval this assignment is made under.");
if (!reason) fail("--reason is required.");

for (const s of scopes) if (!FUNCTIONAL_SCOPES.includes(s)) fail(`"${s}" is not an approved functional scope.`);
for (const a of actions) if (!ACTION_PERMISSIONS.includes(a)) fail(`"${a}" is not an approved action permission.`);
for (const o of overlays) if (!SENSITIVE_OVERLAYS.includes(o)) fail(`"${o}" is not an approved sensitive overlay.`);
for (const a of actions) {
  if (REFUSED_ACTIONS.has(a)) {
    fail(`"${a}" is a consequential permission and is not granted by this script. It is a separate, deliberate decision.`);
  }
}
if (caseScope === "team" && !teamId) fail("--team is required when --case-scope is team, or team scope cannot be evaluated.");

if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set in this environment.");
const db = drizzle(process.env.DATABASE_URL);

try {
  const [rows] = await db.execute(
    sql`SELECT id, LEFT(entraObjectId, 8) AS oidPrefix, CONCAT(LEFT(email, 2), '…@', SUBSTRING_INDEX(email, '@', -1)) AS emailMasked, displayName, isActive, lastLoginAt, baseAccessLevel, accessStatus, caseScope FROM staff_users WHERE id = ${staffUserId} LIMIT 1`,
  );
  const staff = rows[0];
  if (!staff) {
    fail(
      `No staff_users row with id ${staffUserId}. This script never creates a staff account — the row must already exist from a genuine Microsoft sign-in.`,
    );
  }

  // Identity binding. The caller states who they believe this row is; if
  // the live row says otherwise, nothing is written. This is what stops an
  // assignment being made against whoever happens to occupy a given id.
  console.log("=== Identity check ===");
  console.log(`  requested id:    ${staffUserId}`);
  console.log(`  expected name:   ${expectDisplayName}`);
  console.log(`  row displayName: ${staff.displayName}`);
  console.log(`  row oid prefix:  ${staff.oidPrefix}…`);
  console.log(`  row email:       ${staff.emailMasked}`);
  console.log(`  row isActive:    ${staff.isActive}`);
  console.log(`  row lastLoginAt: ${staff.lastLoginAt ? new Date(staff.lastLoginAt).toISOString() : "(never)"}`);
  if (String(staff.displayName) !== String(expectDisplayName)) {
    fail(
      `Identity mismatch: staff_users id ${staffUserId} carries displayName "${staff.displayName}", not "${expectDisplayName}". Nothing was written.`,
    );
  }
  console.log("  OK: the row's display name matches the expected identity.");

  if (staff.isActive !== 1) fail(`The staff row id ${staffUserId} is not active. Assigning access to an inactive account is not this script's job.`);
  if (staff.baseAccessLevel !== null || staff.accessStatus !== null || staff.caseScope !== null) {
    console.error(
      `STOPPING: staff_users id ${staffUserId} already carries an assignment (level=${staff.baseAccessLevel}, status=${staff.accessStatus}, caseScope=${staff.caseScope}). Changing an existing assignment is a different operation.`,
    );
    process.exit(1);
  }

  console.log("\n=== Assignment to be recorded ===");
  console.log(`  staff row:       id=${staff.id} (${staff.displayName})`);
  console.log(`  access level:    ${level}`);
  console.log(`  case scope:      ${caseScope}${teamId ? ` (team ${teamId})` : ""}`);
  console.log(`  functional:      ${scopes.join(", ")}`);
  console.log(`  actions:         ${actions.join(", ")}`);
  console.log(`  overlays:        ${overlays.length ? overlays.join(", ") : "(none)"}`);
  console.log(`  status:          active`);
  console.log(`  authority:       ${authority}`);
  console.log(`  reason:          ${reason}`);

  if (!APPLY) {
    console.log("\nDry run — nothing was written. Re-run with --apply to record this assignment.");
    process.exit(0);
  }

  // The assignment is attributed to the staff row itself where the person
  // is their own approval authority; there is no synthetic actor id.
  const actor = staff.id;

  await db.execute(sql`
    UPDATE staff_users
       SET baseAccessLevel = ${level},
           caseScope = ${caseScope},
           accessStatus = 'active',
           teamId = ${teamId ?? null},
           assignedByStaffUserId = ${actor},
           assignedAt = NOW(),
           assignmentReason = ${reason}
     WHERE id = ${staff.id}
  `);

  for (const [grantType, values] of [
    ["functional_scope", scopes],
    ["action_permission", actions],
    ["sensitive_overlay", overlays],
  ]) {
    for (const value of values) {
      await db.execute(sql`
        INSERT INTO staff_access_grants (staffUserId, grantType, value, expiresAt, grantedByStaffUserId, reason)
        VALUES (${staff.id}, ${grantType}, ${value}, NULL, ${actor}, ${reason})
      `);
      await db.execute(sql`
        INSERT INTO staff_access_changes (staffUserId, changedByStaffUserId, changeType, previousValue, newValue, reason, authorityReference)
        VALUES (${staff.id}, ${actor}, 'grant_added', NULL, ${`${grantType}:${value}`}, ${reason}, ${authority})
      `);
    }
  }

  await db.execute(sql`
    INSERT INTO staff_access_changes (staffUserId, changedByStaffUserId, changeType, previousValue, newValue, reason, authorityReference)
    VALUES (${staff.id}, ${actor}, 'level_assigned', NULL, ${String(level)}, ${reason}, ${authority})
  `);
  await db.execute(sql`
    INSERT INTO staff_access_changes (staffUserId, changedByStaffUserId, changeType, previousValue, newValue, reason, authorityReference)
    VALUES (${staff.id}, ${actor}, 'case_scope_changed', NULL, ${caseScope}, ${reason}, ${authority})
  `);
  await db.execute(sql`
    INSERT INTO staff_access_changes (staffUserId, changedByStaffUserId, changeType, previousValue, newValue, reason, authorityReference)
    VALUES (${staff.id}, ${actor}, 'status_changed', NULL, 'active', ${reason}, ${authority})
  `);

  console.log("\n=== Written. Read-back verification ===");
  const [after] = await db.execute(
    sql`SELECT baseAccessLevel, caseScope, accessStatus, teamId FROM staff_users WHERE id = ${staff.id}`,
  );
  console.log(`  staff_users: ${JSON.stringify(after[0])}`);
  const [grants] = await db.execute(
    sql`SELECT grantType, value, expiresAt FROM staff_access_grants WHERE staffUserId = ${staff.id} AND revokedAt IS NULL ORDER BY grantType, value`,
  );
  for (const g of grants) console.log(`  grant: ${g.grantType}=${g.value}${g.expiresAt ? ` expires ${g.expiresAt}` : ""}`);
  const [changes] = await db.execute(
    sql`SELECT COUNT(*) AS n FROM staff_access_changes WHERE staffUserId = ${staff.id}`,
  );
  console.log(`  audit rows written: ${changes[0].n}`);
} catch (err) {
  console.error("Assignment failed:", err.message);
  process.exit(1);
}
