/**
 * Reading and writing staff access, with the decision made elsewhere.
 *
 * administration.ts decides whether a change is permitted and what the
 * diff is. This module does the database work and nothing else. Keeping
 * them apart means the rules can be tested exhaustively without a
 * database, and this file has no opinions to get wrong.
 *
 * Two things here are not merely persistence, and both are deliberate.
 *
 * The audit rows are written in the same call as the change, from the
 * decision's own audit lines rather than from a second reading of the
 * intent. A permission change that succeeded but whose audit write was
 * skipped is exactly the gap Access Control Standard section 9 exists to
 * close.
 *
 * Grants are revoked rather than deleted. The row stays with revokedAt,
 * revokedBy and a reason set, so the history of who held what survives a
 * change. Deleting would leave an audit trail that says a permission was
 * removed with no record it was ever held.
 */
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { staffUsers, staffAccessGrants, staffAccessChanges } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import type { AdministrationApproval, ProposedAssignment, CurrentAssignment } from "./administration";
import type { AccessLevel, CaseScope, FunctionalScope, ActionPermission, SensitiveOverlay } from "./accessControl";
import {
  FIRST_ADMINISTRATOR_ACTIONS,
  FIRST_ADMINISTRATOR_CASE_SCOPE,
  FIRST_ADMINISTRATOR_LEVEL,
  FIRST_ADMINISTRATOR_REASON,
  FIRST_ADMINISTRATOR_SCOPES,
} from "./firstAdministratorProfile";

export interface StaffSummary {
  staffUserId: number;
  email: string;
  displayName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  baseAccessLevel: number | null;
  accessStatus: string | null;
  caseScope: string | null;
}

/** Everyone who has ever signed in, so an administrator can find them. */
export async function listStaff(): Promise<StaffSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staffUsers);
  return rows.map(r => ({
    staffUserId: r.id,
    email: r.email,
    displayName: r.displayName,
    isActive: r.isActive === 1,
    lastLoginAt: r.lastLoginAt,
    baseAccessLevel: r.baseAccessLevel,
    accessStatus: r.accessStatus,
    caseScope: r.caseScope,
  }));
}

/** The target's position now, in the shape the decision function wants. */
export async function readCurrentAssignment(staffUserId: number): Promise<CurrentAssignment | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];

  const grants = await db
    .select()
    .from(staffAccessGrants)
    .where(and(eq(staffAccessGrants.staffUserId, staffUserId), isNull(staffAccessGrants.revokedAt)));

  const byType = (type: string) => grants.filter(g => g.grantType === type).map(g => g.value);

  return {
    baseAccessLevel: (row.baseAccessLevel as AccessLevel | null) ?? null,
    caseScope: (row.caseScope as CaseScope | null) ?? null,
    functionalScopes: byType("functional_scope") as FunctionalScope[],
    actionPermissions: byType("action_permission") as ActionPermission[],
    sensitiveOverlays: byType("sensitive_overlay") as SensitiveOverlay[],
    accessStatus: (row.accessStatus as "active" | "suspended" | "disabled" | null) ?? null,
    teamId: row.teamId ?? null,
  };
}

/**
 * Applies an approved decision. Takes the approval rather than the raw
 * proposal, so there is no way to reach this having skipped the rules.
 */
export async function applyAssignment(
  approval: AdministrationApproval,
  proposed: ProposedAssignment,
  administratorStaffUserId: number,
): Promise<{ applied: true } | { applied: false; reason: string }> {
  const db = await getDb();
  if (!db) return { applied: false, reason: "The database is unavailable, so no access was changed." };

  await db
    .update(staffUsers)
    .set({
      baseAccessLevel: proposed.baseAccessLevel,
      caseScope: proposed.caseScope,
      accessStatus: proposed.accessStatus,
      teamId: proposed.teamId,
      assignedByStaffUserId: administratorStaffUserId,
      assignedAt: new Date(),
      assignmentReason: proposed.reason,
    })
    .where(eq(staffUsers.id, proposed.targetStaffUserId));

  for (const grant of approval.grantsToAdd) {
    await db.insert(staffAccessGrants).values({
      staffUserId: proposed.targetStaffUserId,
      grantType: grant.grantType as "functional_scope" | "action_permission" | "sensitive_overlay" | "case_scope",
      value: grant.value,
      expiresAt: null,
      grantedByStaffUserId: administratorStaffUserId,
      reason: proposed.reason,
    });
  }

  for (const grant of approval.grantsToRevoke) {
    await db
      .update(staffAccessGrants)
      .set({
        revokedAt: new Date(),
        revokedByStaffUserId: administratorStaffUserId,
        revocationReason: proposed.reason,
      })
      .where(
        and(
          eq(staffAccessGrants.staffUserId, proposed.targetStaffUserId),
          eq(staffAccessGrants.value, grant.value),
          isNull(staffAccessGrants.revokedAt),
        ),
      );
  }

  for (const line of approval.auditLines) {
    await db.insert(staffAccessChanges).values({
      staffUserId: proposed.targetStaffUserId,
      changedByStaffUserId: administratorStaffUserId,
      changeType: line.changeType,
      previousValue: line.previousValue,
      newValue: line.newValue,
      reason: proposed.reason,
      authorityReference: proposed.authorityReference ?? "WSA Staff Portal Access Control Standard v1.0",
    });
  }

  return { applied: true };
}

export type BootstrapOutcome =
  | { bootstrapped: true; staffUserId: number; email: string }
  | { bootstrapped: false; reason: string };

/**
 * Grants the first access administrator, once.
 *
 * The chicken-and-egg is real: access_admin can only be granted by
 * somebody holding access_admin, so on an empty system nobody ever could.
 * This is the only way in, and it is deliberately narrow.
 *
 * It requires ACCESS_BOOTSTRAP_EMAIL to be set in the deployment
 * environment, which needs Railway access, held by the same people who
 * could otherwise edit the database directly. So it opens no door that
 * was closed.
 *
 * It refuses the moment any account holds access_admin. That makes it
 * self-closing: it works once, on an estate with no administrator, and
 * never again. Changing the variable afterwards does nothing, so it
 * cannot be replayed to mint a second administrator quietly.
 *
 * The named person must already have signed in through Microsoft. This
 * grants access to a real, verified identity or to nobody.
 *
 * IT ESTABLISHES THE WHOLE PROFILE, ATOMICALLY. It used to grant four
 * scopes and leave the account short of what administering actually needs,
 * with a comment saying a second administrator would widen the first. That
 * is a deadlock rather than a process, and WSA hit it in production on
 * 3 September 2026: the access screen correctly refuses self-
 * administration, and there was no second administrator to ask. A
 * bootstrap that can leave an account it has no way to finish is not a
 * bootstrap. The profile now comes from firstAdministratorProfile.ts and
 * is written in one transaction, so the outcome is the complete approved
 * administrator or nothing at all.
 *
 * IT NO LONGER CREATES DUPLICATE GRANTS. It used to insert every scope and
 * action unconditionally, so an account that already held one ended up
 * with two rows for it. Set membership made that harmless to decisions and
 * it was not harmless to read: the access screen showed "executive" and
 * "read" twice, which reads as a bug in the permission model. Grants the
 * account already holds are skipped.
 */
export async function bootstrapFirstAdministrator(): Promise<BootstrapOutcome> {
  const db = await getDb();
  if (!db) return { bootstrapped: false, reason: "The database is unavailable." };

  const email = ENV.accessBootstrapEmail;
  if (!email) {
    return { bootstrapped: false, reason: "ACCESS_BOOTSTRAP_EMAIL is not set in this environment." };
  }

  const existingAdmins = await db
    .select()
    .from(staffAccessGrants)
    .where(
      and(
        eq(staffAccessGrants.grantType, "action_permission"),
        eq(staffAccessGrants.value, "access_admin"),
        isNull(staffAccessGrants.revokedAt),
      ),
    );
  if (existingAdmins.length > 0) {
    return {
      bootstrapped: false,
      reason:
        "An access administrator already exists, so the bootstrap is closed. " +
        "Further access changes are made by that administrator in the Staff Portal.",
    };
  }

  const rows = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  if (rows.length === 0) {
    return {
      bootstrapped: false,
      reason:
        `No staff record exists for ${email}. That person must sign in with Microsoft first, which creates ` +
        "their record. Access cannot be granted to an identity that has never authenticated.",
    };
  }
  const target = rows[0];

  // Everything below is one transaction. A half-written bootstrap is the
  // exact failure this route exists to avoid: an account holding
  // access_admin but not the scopes it needs cannot be completed through
  // the access screen, because self-administration is refused there.
  await db.transaction(async tx => {
    await tx
      .update(staffUsers)
      .set({
        baseAccessLevel: FIRST_ADMINISTRATOR_LEVEL,
        caseScope: FIRST_ADMINISTRATOR_CASE_SCOPE,
        accessStatus: "active",
        assignedAt: new Date(),
        assignmentReason: FIRST_ADMINISTRATOR_REASON,
      })
      .where(eq(staffUsers.id, target.id));

    // What the account already holds, so a re-grant does not become a
    // second row for the same permission.
    const held = await tx
      .select()
      .from(staffAccessGrants)
      .where(and(eq(staffAccessGrants.staffUserId, target.id), isNull(staffAccessGrants.revokedAt)));
    const alreadyHolds = (grantType: string, value: string) =>
      held.some(g => g.grantType === grantType && g.value === value);

    for (const value of FIRST_ADMINISTRATOR_SCOPES) {
      if (alreadyHolds("functional_scope", value)) continue;
      await tx.insert(staffAccessGrants).values({
        staffUserId: target.id,
        grantType: "functional_scope",
        value,
        grantedByStaffUserId: target.id,
        reason: FIRST_ADMINISTRATOR_REASON,
      });
    }
    for (const value of FIRST_ADMINISTRATOR_ACTIONS) {
      if (alreadyHolds("action_permission", value)) continue;
      await tx.insert(staffAccessGrants).values({
        staffUserId: target.id,
        grantType: "action_permission",
        value,
        grantedByStaffUserId: target.id,
        reason: FIRST_ADMINISTRATOR_REASON,
      });
    }

    await tx.insert(staffAccessChanges).values({
      staffUserId: target.id,
      changedByStaffUserId: null,
      changeType: "level_assigned",
      previousValue: null,
      newValue: "Level 1, organisation, the thirteen worker scopes, read/create/update/access_admin",
      reason: "First access administrator. No administrator existed, so no administrator could have granted this.",
      authorityReference: "ACCESS_BOOTSTRAP_EMAIL, one-time and self-closing",
    });
  });

  return { bootstrapped: true, staffUserId: target.id, email: target.email };
}
