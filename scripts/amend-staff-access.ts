// Adds functional scopes to a staff access assignment that already exists.
//
// WHY A SECOND SCRIPT. assign-staff-access.mjs records a FIRST assignment
// and stops outright if the row already carries one, because changing an
// existing assignment is a different operation with a different audit
// shape. That was correct, and it left a real gap. The Staff Portal access
// screen is the intended route for a change, but it requires an
// administrator holding access_admin who is not the target, and nobody can
// administer themselves. Today the only holder of access_admin is the
// shared executive session. So a named account whose owner has approved
// their own access in writing had no controlled route at all, and the
// alternative was editing production rows by hand.
//
// WHAT THIS CAN DO. Add functional scopes. That is the whole list.
//
// The rules live in server/access/administration.ts as
// decideControlledScopeAddition, not here, and the write goes through the
// same applyAssignment the access screen uses. This file reads arguments,
// prints the delta and asks the rules; it decides nothing itself. The
// level, case scope, status, team, every action permission and every
// sensitive overlay are refused if they would move by so much as one
// value, which puts all seven consequential permissions out of reach by
// construction rather than by a list somebody could extend.
//
// Identity is bound the same way as the assignment script: the caller
// names the staff_users id AND the display name they believe it carries,
// and a mismatch stops the run. "It is the only row, so it must be them"
// is not identification.
//
// Dry run by default. Nothing is written without --apply.
//
// Usage:
//   tsx scripts/amend-staff-access.ts \
//     --staff-user-id <id> \
//     --expect-display-name "<exact displayName on that row>" \
//     --add-scopes <comma-separated functional scopes> \
//     --authority "<controlled approval reference>" \
//     --reason "<why>" \
//     [--apply]
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers } from "../drizzle/schema";
import { readCurrentAssignment, applyAssignment } from "../server/access/administrationStore";
import { decideControlledScopeAddition, type ProposedAssignment } from "../server/access/administration";
import type { AccessLevel, CaseScope, FunctionalScope } from "../server/access/accessControl";

/**
 * Values come from the environment first, then the command line, for the
 * same reason as the assignment script: the workflow must never build a
 * shell command out of a reason or an authority reference, because one
 * containing a quote and a semicolon would be executed.
 */
function arg(name: string): string | null {
  const fromEnv = process.env[`WSA_AMEND_${name.toUpperCase().replace(/-/g, "_")}`];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

const APPLY = process.env.WSA_AMEND_APPLY === "true" || process.argv.includes("--apply");

function fail(message: string): never {
  console.error(`STOPPING: ${message}`);
  process.exit(1);
}

function list(value: string | null): string[] {
  return (value ?? "").split(",").map(s => s.trim()).filter(Boolean);
}

const staffUserId = Number(arg("staff-user-id"));
const expectDisplayName = arg("expect-display-name");
const addScopes = list(arg("add-scopes"));
const authority = arg("authority");
const reason = arg("reason");

if (!Number.isInteger(staffUserId) || staffUserId <= 0) fail("--staff-user-id is required and must be a positive integer.");
if (!expectDisplayName) {
  fail("--expect-display-name is required: name who you believe this row is, so the run can refuse if it is somebody else.");
}
if (addScopes.length === 0) fail("--add-scopes must name at least one functional scope.");
if (!authority) fail("--authority is required: the controlled approval this amendment is made under.");
if (!reason) fail("--reason is required.");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set in this environment.");

const db = await getDb();
if (!db) fail("No database connection.");

const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
const staff = rows[0];
if (!staff) {
  fail(`No staff_users row with id ${staffUserId}. This script never creates a staff account.`);
}

console.log("=== Identity check ===");
console.log(`  requested id:    ${staffUserId}`);
console.log(`  expected name:   ${expectDisplayName}`);
console.log(`  row displayName: ${staff.displayName}`);
console.log(`  row oid prefix:  ${(staff.entraObjectId ?? "").slice(0, 8)}...`);
console.log(`  row isActive:    ${staff.isActive}`);
if (String(staff.displayName) !== String(expectDisplayName)) {
  fail(
    `Identity mismatch: staff_users id ${staffUserId} carries displayName "${staff.displayName}", ` +
    `not "${expectDisplayName}". Nothing was written.`,
  );
}
if (staff.isActive !== 1) fail(`The staff row id ${staffUserId} is not active.`);
console.log("  OK: the row's display name matches the expected identity.");

const current = await readCurrentAssignment(staffUserId);
if (!current) fail(`Could not read the current assignment for staff_users id ${staffUserId}.`);

console.log("\n=== Before ===");
console.log(`  level:      ${current.baseAccessLevel}`);
console.log(`  case scope: ${current.caseScope}`);
console.log(`  status:     ${current.accessStatus}`);
console.log(`  team:       ${current.teamId ?? "(none)"}`);
console.log(`  scopes:     [${[...current.functionalScopes].sort().join(", ")}]`);
console.log(`  actions:    [${[...current.actionPermissions].sort().join(", ")}]`);
console.log(`  overlays:   [${[...current.sensitiveOverlays].sort().join(", ")}]`);

/**
 * The proposal is built FROM the current assignment, so every dimension
 * this route may not touch is carried across unchanged by construction
 * rather than by the caller remembering to pass it. The only field the
 * caller influences is the scope list, and even that is a union: it can
 * add, and it has no way to express a removal.
 */
const proposedScopes = [...new Set([...current.functionalScopes, ...(addScopes as FunctionalScope[])])];
const proposed: ProposedAssignment = {
  targetStaffUserId: staffUserId,
  baseAccessLevel: current.baseAccessLevel as AccessLevel,
  caseScope: current.caseScope as CaseScope,
  functionalScopes: proposedScopes,
  actionPermissions: current.actionPermissions,
  sensitiveOverlays: current.sensitiveOverlays,
  accessStatus: current.accessStatus ?? "active",
  teamId: current.teamId,
  authorityReference: authority,
  reason,
};

const decision = decideControlledScopeAddition(current, proposed);
if (!decision.permitted) {
  console.error(`\nREFUSED (${decision.code}): ${decision.reason}`);
  process.exit(1);
}

console.log("\n=== Proposed delta ===");
console.log(`  level:      ${current.baseAccessLevel} -> ${proposed.baseAccessLevel} (unchanged)`);
console.log(`  case scope: ${current.caseScope} -> ${proposed.caseScope} (unchanged)`);
console.log(`  status:     ${current.accessStatus} -> ${proposed.accessStatus} (unchanged)`);
console.log(`  team:       ${current.teamId ?? "(none)"} -> ${proposed.teamId ?? "(none)"} (unchanged)`);
for (const g of decision.grantsToAdd) console.log(`  ADD    ${g.grantType}: ${g.value}`);
for (const g of decision.grantsToRevoke) console.log(`  REVOKE ${g.grantType}: ${g.value}`);
console.log(`  audit rows to write: ${decision.auditLines.length}`);
console.log(`  authority:  ${authority}`);
console.log(`  reason:     ${reason}`);

console.log("\n=== After (predicted) ===");
console.log(`  scopes:   [${[...proposed.functionalScopes].sort().join(", ")}]`);
console.log(`  actions:  [${[...proposed.actionPermissions].sort().join(", ")}]`);
console.log(`  overlays: [${[...proposed.sensitiveOverlays].sort().join(", ")}]`);

if (!APPLY) {
  console.log("\nDry run. Nothing was written. Re-run with --apply to record this amendment.");
  process.exit(0);
}

// Attributed to the staff row itself, the same convention the assignment
// script uses where the person is their own approval authority. There is
// no synthetic actor id, and the shared executive session's id is not
// borrowed to describe a change no executive session made.
const result = await applyAssignment(decision, proposed, staff.id);
if (!result.applied) fail(result.reason);

console.log("\n=== Written. Read-back verification ===");
const after = await readCurrentAssignment(staffUserId);
console.log(`  level:      ${after?.baseAccessLevel}`);
console.log(`  case scope: ${after?.caseScope}`);
console.log(`  status:     ${after?.accessStatus}`);
console.log(`  scopes:     [${[...(after?.functionalScopes ?? [])].sort().join(", ")}]`);
console.log(`  actions:    [${[...(after?.actionPermissions ?? [])].sort().join(", ")}]`);
console.log(`  overlays:   [${[...(after?.sensitiveOverlays ?? [])].sort().join(", ")}]`);

// mysql2 holds the connection open, which keeps Node's event loop alive.
// Without this the apply path completes every write, prints its read-back
// and then hangs until the step times out, reporting a failure for a
// change that actually succeeded.
process.exit(0);
