// Completes WSA's first access administrator to the approved profile, and
// clears the duplicate grant rows the old bootstrap left behind.
//
// WHY THIS EXISTS. On 3 September 2026 WSA hit a bootstrap deadlock in
// production. The bootstrap established a partial profile, and the Staff
// Portal access screen then refused to let the administrator complete it:
// "You cannot change your own access. Another administrator must make this
// change." That refusal is correct and is deliberately untouched. What was
// wrong is a bootstrap that could leave an account it had no way to
// finish, on an estate where no second administrator exists.
//
// The bootstrap is now atomic and complete (administrationStore.ts), so a
// future first administrator never reaches this state. This script is for
// the account that is already in it.
//
// WHY IT IS NOT A PRIVILEGE ESCALATION ROUTE. It takes no profile. There
// is no argument, flag or workflow input that says what to grant: the
// answer is always firstAdministratorProfile.ts and nothing else. It
// refuses an account that does not already hold access_admin, so it cannot
// appoint anybody. It refuses once a second administrator exists, so the
// window is exactly "there is one administrator and they cannot fix
// themselves". It refuses a no-op, so the run that uses it is the run that
// closes it. And it never touches sensitive overlays.
//
// Reaching it at all needs the production Railway token and code merged to
// main, which is the same control every other production write here uses.
//
// Dry run by default. Nothing is written without --apply.
//
// Usage:
//   tsx scripts/complete-first-administrator.ts \
//     --staff-user-id <id> \
//     --expect-display-name "<exact displayName on that row>" \
//     --reason "<why>" \
//     [--apply]
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers, staffAccessGrants, staffAccessChanges } from "../drizzle/schema";
import { readCurrentAssignment, applyAssignment } from "../server/access/administrationStore";
import { decideFirstAdministratorCompletion, type ProposedAssignment } from "../server/access/administration";
import {
  FIRST_ADMINISTRATOR_ACTIONS,
  FIRST_ADMINISTRATOR_AUTHORITY,
  FIRST_ADMINISTRATOR_CASE_SCOPE,
  FIRST_ADMINISTRATOR_LEVEL,
  FIRST_ADMINISTRATOR_SCOPES,
} from "../server/access/firstAdministratorProfile";

function arg(name: string): string | null {
  const fromEnv = process.env[`WSA_FIRSTADMIN_${name.toUpperCase().replace(/-/g, "_")}`];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}

const APPLY = process.env.WSA_FIRSTADMIN_APPLY === "true" || process.argv.includes("--apply");

function fail(message: string): never {
  console.error(`STOPPING: ${message}`);
  process.exit(1);
}

const staffUserId = Number(arg("staff-user-id"));
const expectDisplayName = arg("expect-display-name");
const reason = arg("reason");

if (!Number.isInteger(staffUserId) || staffUserId <= 0) fail("--staff-user-id is required and must be a positive integer.");
if (!expectDisplayName) fail("--expect-display-name is required, so the run can refuse if this row is somebody else.");
if (!reason) fail("--reason is required.");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set in this environment.");

const db = await getDb();
if (!db) fail("No database connection.");

const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
const staff = rows[0];
if (!staff) fail(`No staff_users row with id ${staffUserId}. This script never creates a staff account.`);

console.log("=== Identity check ===");
console.log(`  requested id:    ${staffUserId}`);
console.log(`  expected name:   ${expectDisplayName}`);
console.log(`  row displayName: ${staff.displayName}`);
console.log(`  row oid prefix:  ${(staff.entraObjectId ?? "").slice(0, 8)}...`);
if (String(staff.displayName) !== String(expectDisplayName)) {
  fail(`Identity mismatch: id ${staffUserId} carries "${staff.displayName}", not "${expectDisplayName}". Nothing written.`);
}
if (staff.isActive !== 1) fail(`The staff row id ${staffUserId} is not active.`);
console.log("  OK: the row's display name matches the expected identity.");

// Who holds access_admin, counted from the live grants table. This is the
// fact that decides whether this route is open, and it is never asserted
// by an argument.
const adminGrants = await db
  .select()
  .from(staffAccessGrants)
  .where(
    and(
      eq(staffAccessGrants.grantType, "action_permission"),
      eq(staffAccessGrants.value, "access_admin"),
      isNull(staffAccessGrants.revokedAt),
    ),
  );
const holders = adminGrants.map(g => g.staffUserId).filter((v, i, a) => a.indexOf(v) === i);
console.log("\n=== Administration estate ===");
console.log(`  accounts holding access_admin: ${holders.length} (ids: ${holders.join(", ") || "none"})`);

const current = await readCurrentAssignment(staffUserId);
if (!current) fail(`Could not read the current assignment for staff_users id ${staffUserId}.`);

console.log("\n=== Before ===");
console.log(`  level:      ${current.baseAccessLevel}`);
console.log(`  case scope: ${current.caseScope}`);
console.log(`  status:     ${current.accessStatus}`);
console.log(`  scopes:     [${[...current.functionalScopes].sort().join(", ")}]`);
console.log(`  actions:    [${[...current.actionPermissions].sort().join(", ")}]`);
console.log(`  overlays:   [${[...current.sensitiveOverlays].sort().join(", ")}]`);

const decision = decideFirstAdministratorCompletion(
  current,
  { accessAdminHolderCount: holders.length, targetHoldsAccessAdmin: holders.includes(staffUserId) },
  reason,
  FIRST_ADMINISTRATOR_AUTHORITY,
);
if (!decision.permitted) {
  console.error(`\nREFUSED (${decision.code}): ${decision.reason}`);
  process.exit(1);
}

const proposed: ProposedAssignment = {
  targetStaffUserId: staffUserId,
  baseAccessLevel: FIRST_ADMINISTRATOR_LEVEL,
  caseScope: FIRST_ADMINISTRATOR_CASE_SCOPE,
  functionalScopes: [...FIRST_ADMINISTRATOR_SCOPES],
  actionPermissions: [...FIRST_ADMINISTRATOR_ACTIONS],
  sensitiveOverlays: current.sensitiveOverlays,
  accessStatus: "active",
  teamId: current.teamId,
  reason,
  authorityReference: FIRST_ADMINISTRATOR_AUTHORITY,
};

// Duplicate live rows for the same permission. Not a stronger grant and
// not a UI fault: the old bootstrap inserted without checking what the
// account already held, so the access screen displayed the same permission
// twice. The later row of each pair is revoked, keeping the earliest,
// which preserves the original grant's date and reason.
const liveGrants = await db
  .select()
  .from(staffAccessGrants)
  .where(and(eq(staffAccessGrants.staffUserId, staffUserId), isNull(staffAccessGrants.revokedAt)));
const seen = new Set<string>();
const duplicateIds: number[] = [];
for (const g of [...liveGrants].sort((a, b) => a.id - b.id)) {
  const key = `${g.grantType}:${g.value}`;
  if (seen.has(key)) duplicateIds.push(g.id);
  else seen.add(key);
}

console.log("\n=== Proposed delta ===");
console.log(`  level:      ${current.baseAccessLevel} -> ${proposed.baseAccessLevel}`);
console.log(`  case scope: ${current.caseScope} -> ${proposed.caseScope}`);
for (const g of decision.grantsToAdd) console.log(`  ADD    ${g.grantType}: ${g.value}`);
for (const g of decision.grantsToRevoke) console.log(`  REVOKE ${g.grantType}: ${g.value}`);
console.log(`  duplicate rows to retire: ${duplicateIds.length}${duplicateIds.length ? ` (ids ${duplicateIds.join(", ")})` : ""}`);
console.log(`  overlays:   untouched [${[...current.sensitiveOverlays].sort().join(", ") || "none"}]`);
console.log(`  audit rows to write: ${decision.auditLines.length}`);
console.log(`  authority:  ${FIRST_ADMINISTRATOR_AUTHORITY}`);

console.log("\n=== After (predicted) ===");
console.log(`  scopes:   [${[...proposed.functionalScopes].sort().join(", ")}]`);
console.log(`  actions:  [${[...proposed.actionPermissions].sort().join(", ")}]`);
console.log(`  overlays: [${[...proposed.sensitiveOverlays].sort().join(", ") || "none"}]`);

if (!APPLY) {
  console.log("\nDry run. Nothing was written. Re-run with --apply to complete the first administrator.");
  process.exit(0);
}

// Attributed to the staff row itself: this is the account's own approval
// authority acting on its own account, which is what a first-administrator
// bootstrap is. The shared executive session's reserved id is deliberately
// not borrowed, because no executive session made this change.
const result = await applyAssignment(decision, proposed, staff.id);
if (!result.applied) fail(result.reason);

// Only rows still live after the apply above. A duplicate of a permission
// the apply has just revoked outright is already gone, and rewriting it
// here would replace an accurate revocation reason with a less accurate
// one.
const stillLive = await db
  .select()
  .from(staffAccessGrants)
  .where(and(eq(staffAccessGrants.staffUserId, staffUserId), isNull(staffAccessGrants.revokedAt)));
const liveIds = new Set(stillLive.map(g => g.id));
const retiredIds = duplicateIds.filter(id => liveIds.has(id));
console.log(`\n  duplicate rows still live after the apply: ${retiredIds.length}${retiredIds.length ? ` (ids ${retiredIds.join(", ")})` : ""}`);

for (const id of retiredIds) {
  await db
    .update(staffAccessGrants)
    .set({
      revokedAt: new Date(),
      revokedByStaffUserId: staff.id,
      revocationReason: "Duplicate grant row created by the pre-correction bootstrap. The permission is unchanged.",
    })
    .where(eq(staffAccessGrants.id, id));
}
if (retiredIds.length > 0) {
  await db.insert(staffAccessChanges).values({
    staffUserId: staff.id,
    changedByStaffUserId: staff.id,
    changeType: "grant_revoked",
    previousValue: `${retiredIds.length} duplicate grant row(s)`,
    newValue: null,
    reason: "Retiring duplicate rows left by the pre-correction bootstrap. No permission was added or removed.",
    authorityReference: FIRST_ADMINISTRATOR_AUTHORITY,
  });
}

console.log("\n=== Written. Read-back verification ===");
const after = await readCurrentAssignment(staffUserId);
console.log(`  level:      ${after?.baseAccessLevel}`);
console.log(`  case scope: ${after?.caseScope}`);
console.log(`  status:     ${after?.accessStatus}`);
console.log(`  scopes:     [${[...(after?.functionalScopes ?? [])].sort().join(", ")}]`);
console.log(`  actions:    [${[...(after?.actionPermissions ?? [])].sort().join(", ")}]`);
console.log(`  overlays:   [${[...(after?.sensitiveOverlays ?? [])].sort().join(", ") || "none"}]`);

const remaining = await db
  .select()
  .from(staffAccessGrants)
  .where(and(eq(staffAccessGrants.staffUserId, staffUserId), isNull(staffAccessGrants.revokedAt)));
console.log(`  live grant rows: ${remaining.length} (distinct: ${new Set(remaining.map(g => `${g.grantType}:${g.value}`)).size})`);

// mysql2 keeps the event loop alive; without this a completed write hangs
// until the step times out and is reported as a failure.
process.exit(0);
