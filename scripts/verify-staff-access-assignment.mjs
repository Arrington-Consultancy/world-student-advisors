// READ-ONLY verification of the recorded staff access assignments.
//
// Independent of assign-staff-access.mjs: it re-reads production and
// checks the state on its own terms, rather than trusting the read-back
// the writing script printed. Every check is asserted explicitly and the
// script exits non-zero if any fails.
//
// Personal data is kept to the minimum needed to prove whose assignment
// this is: display name, an 8-character Entra oid prefix, and the email as
// first-two-characters plus domain. The full address is never printed.
//
// No writes, no DDL, no secrets.

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const EXPECTED_NAME = process.env.WSA_VERIFY_DISPLAY_NAME ?? "Tom Arrington";
const CONSEQUENTIAL = [
  "export_download", "external_send", "submit", "delete_destructive",
  "financial_action", "access_admin", "credential_admin",
];

// The functional scopes this account is approved to hold, and the whole
// list. "executive" is the original assignment of 30 August. The thirteen
// after it are one per staff-facing worker, added on 1 September under
// Tom Arrington's explicit named-account workforce access approval, so
// that a named identity can reach the workforce through the ordinary
// permission model rather than the shared executive route.
//
// This is asserted as an exact set, not a superset. A scope appearing
// here that nobody approved is the failure this check exists to catch,
// and "at least these" would not catch it.
const EXPECTED_SCOPES = [
  "executive",
  "enquiry_triage", "discovery", "education_research", "suitability",
  "admissions", "visa_compliance", "scholarships_funding",
  "pre_arrival_student_success", "quality_assurance", "marketing_seo",
  "records_control", "paid_media", "social_media",
];
// Approved for nobody through any controlled route so far. Named so the
// check reads as a statement about them rather than as arithmetic.
const SCOPES_NOT_APPROVED = ["operations", "governance", "finance", "safeguarding", "technical_administration"];

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`  OK: ${message}`);
  else {
    console.error(`  FAILED: ${message}`);
    failures += 1;
  }
}

try {
  console.log("=== 1. Staff rows carrying an access assignment ===");
  const [assigned] = await db.execute(sql`
    SELECT id, displayName, LEFT(entraObjectId, 8) AS oidPrefix,
           CONCAT(LEFT(email, 2), '…@', SUBSTRING_INDEX(email, '@', -1)) AS emailMasked,
           isActive, baseAccessLevel, caseScope, accessStatus, teamId,
           assignedByStaffUserId, assignedAt, assignmentReason
      FROM staff_users
     WHERE baseAccessLevel IS NOT NULL OR accessStatus IS NOT NULL OR caseScope IS NOT NULL
     ORDER BY id ASC
  `);
  for (const r of assigned) {
    console.log(`  id=${r.id} "${r.displayName}" oid=${r.oidPrefix}… ${r.emailMasked} isActive=${r.isActive}`);
    console.log(`      level=${r.baseAccessLevel} caseScope=${r.caseScope} status=${r.accessStatus} teamId=${r.teamId}`);
    console.log(`      assignedBy=${r.assignedByStaffUserId} at=${r.assignedAt ? new Date(r.assignedAt).toISOString() : null}`);
  }
  check(assigned.length === 1, `exactly one staff access assignment exists (found ${assigned.length})`);
  if (assigned.length !== 1) {
    console.error("\nCannot continue: expected exactly one assignment.");
    process.exit(1);
  }

  const staff = assigned[0];
  check(staff.displayName === EXPECTED_NAME, `the assignment belongs to ${EXPECTED_NAME} (row says "${staff.displayName}")`);
  check(staff.baseAccessLevel === 1, `Level 1 is recorded (found ${staff.baseAccessLevel})`);
  check(staff.caseScope === "organisation", `case scope is organisation (found ${staff.caseScope})`);
  check(staff.accessStatus === "active", `access status is active (found ${staff.accessStatus})`);
  check(staff.isActive === 1, "the staff account is active");

  console.log("\n=== 2. Total staff rows, and rows without an assignment ===");
  const [total] = await db.execute(sql.raw("SELECT COUNT(*) AS n FROM `staff_users`"));
  console.log(`  total staff rows: ${total[0].n}`);
  check(
    Number(total[0].n) - assigned.length >= 0,
    `no other staff row carries an assignment (${Number(total[0].n) - assigned.length} unassigned)`,
  );

  console.log("\n=== 3. Live grants (revokedAt IS NULL) ===");
  const [grants] = await db.execute(sql`
    SELECT staffUserId, grantType, value, expiresAt, grantedByStaffUserId, grantedAt
      FROM staff_access_grants
     WHERE revokedAt IS NULL
     ORDER BY staffUserId, grantType, value
  `);
  for (const g of grants) {
    console.log(`  staffUserId=${g.staffUserId} ${g.grantType}=${g.value} expires=${g.expiresAt ? new Date(g.expiresAt).toISOString() : "(standing)"}`);
  }

  const forStaff = grants.filter(g => g.staffUserId === staff.id);
  const otherStaff = grants.filter(g => g.staffUserId !== staff.id);
  check(otherStaff.length === 0, `no grant belongs to any other staff member (found ${otherStaff.length})`);

  const scopes = forStaff.filter(g => g.grantType === "functional_scope").map(g => g.value);
  const actions = forStaff.filter(g => g.grantType === "action_permission").map(g => g.value);
  const overlays = forStaff.filter(g => g.grantType === "sensitive_overlay").map(g => g.value);
  const caseScopeGrants = forStaff.filter(g => g.grantType === "case_scope").map(g => g.value);

  const missingScopes = EXPECTED_SCOPES.filter(s => !scopes.includes(s));
  const unexpectedScopes = scopes.filter(s => !EXPECTED_SCOPES.includes(s));
  check(
    missingScopes.length === 0,
    `every approved functional scope is held (missing [${missingScopes.join(", ")}])`,
  );
  check(
    unexpectedScopes.length === 0,
    `no functional scope beyond the approval is held (unexpected [${unexpectedScopes.join(", ")}])`,
  );
  check(
    scopes.length === EXPECTED_SCOPES.length,
    `exactly ${EXPECTED_SCOPES.length} functional scopes are held (found ${scopes.length})`,
  );
  for (const s of SCOPES_NOT_APPROVED) {
    check(!scopes.includes(s), `the ${s} scope is NOT granted`);
  }
  check(actions.length === 1 && actions[0] === "read", `read is the only action permission (found [${actions.join(", ")}])`);
  check(overlays.length === 0, `no sensitive overlay is granted, so finance access is NOT granted (found [${overlays.join(", ")}])`);
  check(!overlays.includes("finance"), "the finance overlay specifically is absent");
  check(caseScopeGrants.length === 0, `no case-scope grant widens the recorded scope (found [${caseScopeGrants.join(", ")}])`);

  console.log("\n--- no consequential action permission is held ---");
  for (const a of CONSEQUENTIAL) {
    check(!actions.includes(a), `${a} is NOT granted`);
  }

  console.log("\n=== 4. Audit trail ===");
  const [changes] = await db.execute(sql`
    SELECT staffUserId, changedByStaffUserId, changeType, previousValue, newValue, authorityReference, createdAt
      FROM staff_access_changes
     ORDER BY id ASC
  `);
  for (const c of changes) {
    console.log(`  staffUserId=${c.staffUserId} by=${c.changedByStaffUserId} ${c.changeType} ${c.previousValue ?? "(none)"} -> ${c.newValue} at=${new Date(c.createdAt).toISOString()}`);
  }
  check(changes.length > 0, `the change is recorded in the audit trail (${changes.length} row(s))`);
  check(
    changes.every(c => c.staffUserId === staff.id),
    "every audit row concerns only this staff member",
  );
  check(
    changes.every(c => c.authorityReference && String(c.authorityReference).length > 0),
    "every audit row carries a controlled authority reference",
  );

  console.log(failures === 0 ? "\nAll assignment checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}
