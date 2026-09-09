/**
 * Ending every session for one staff account.
 *
 * One function, three callers. Incrementing staff_users.sessionVersion makes
 * every token minted before the increment fail its next authenticated
 * request, because requireActiveStaffIdentity compares the token's version
 * against the row. It is scoped to a single row, so one person's revocation
 * never reaches anybody else's sessions.
 *
 * THE THREE TRIGGERS, and why each one is here.
 *
 *   password_reset — a local password was reset. Whoever knew the old
 *     password should not keep a working session, and the usual reason to
 *     reset is that somebody might.
 *   account_status_change — the account was suspended or disabled. Access
 *     Control Standard v1.0 §9: access must be removed promptly when
 *     employment or responsibilities change. Without this the person keeps
 *     working inside the portal until their token expires.
 *   administrator_revocation — an administrator explicitly cut the sessions.
 *
 * WHY THE ADMINISTRATOR PATH IS GATED ON credential_admin AND NOT ON
 * SENIORITY. §6 of the standard defines CREDENTIAL ADMIN as "Manage API
 * keys, passwords, tokens, MFA or secrets" and says it "is never inherited
 * from ordinary Level 1 business access". Ending somebody's sessions is
 * token management, so it is that permission and no other. §3 is explicit
 * that Level 1 must not be a magic flag, and the enforcement of that lives
 * in evaluateAccess, which this calls rather than reimplements. Nobody holds
 * credential_admin today, so the endpoint refuses everyone until Tom grants
 * it through the normal assignment route.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { staffUsers } from "../../drizzle/schema";
import {
  SESSION_REVOCATION_REASONS,
  type SessionRevocationTrigger,
} from "../../shared/sessionVersion";
import { evaluateAccess } from "./accessControl";
import { resolveStaffAccessProfile } from "./identity";
import { recordMaterialAuditEvent } from "../workforce/audit";

/** The permission an administrator must hold to revoke somebody else's sessions. */
export const REVOKE_ACTION = "credential_admin" as const;
/** The functional scope it must sit inside. §4 lists Technical Administration. */
export const REVOKE_SCOPE = "technical_administration" as const;

/**
 * Bump one account's session version.
 *
 * Written as a relative increment in SQL rather than a read followed by a
 * write, so two revocations landing at once cannot both read the same number
 * and write the same one back, leaving a session alive that both meant to
 * cut.
 */
export async function endSessionsFor(
  staffUserId: number,
  trigger: SessionRevocationTrigger,
): Promise<{ ended: boolean }> {
  const db = await getDb();
  if (!db) return { ended: false };

  await db
    .update(staffUsers)
    .set({ sessionVersion: sql`${staffUsers.sessionVersion} + 1` })
    .where(eq(staffUsers.id, staffUserId));

  // §9: "All permission changes, temporary elevations and high-risk actions
  // must be logged with who, what, when and reason." Cutting somebody's
  // sessions qualifies whichever of the three triggers caused it, and the
  // line is written against the account that lost them, so the log answers
  // "why did this person get signed out" as well as "who did it".
  await recordMaterialAuditEvent({
    staffUserId,
    authMethod: "entra_sso",
    workerId: "staff_portal",
    workerSpecificationVersion: "WSA Staff Portal Access Control Standard v1.0",
    requestedCapability: "staff_session_end",
    permissionDecision: "allowed",
    permissionReason: SESSION_REVOCATION_REASONS[trigger],
    success: true,
    errorCategory: "none",
    targetResourceId: `staff_user:${staffUserId}`,
  });

  return { ended: true };
}

export type RevocationOutcome =
  | { revoked: true }
  | { revoked: false; reason: string };

/**
 * An administrator ends another account's sessions.
 *
 * The permission is evaluated before anything is written, and the decision is
 * audited either way: §9 requires high-risk actions to be logged with who,
 * what, when and reason, and a refused attempt to revoke somebody is worth
 * more in that log than an allowed one.
 */
export async function revokeSessionsAsAdministrator(
  administratorStaffUserId: number,
  targetStaffUserId: number,
  reason: string,
): Promise<RevocationOutcome> {
  const resolution = await resolveStaffAccessProfile(administratorStaffUserId);

  if (!resolution.resolved) {
    await recordMaterialAuditEvent({
      staffUserId: administratorStaffUserId,
      authMethod: "entra_sso",
      workerId: "staff_portal",
      workerSpecificationVersion: "WSA Staff Portal Access Control Standard v1.0",
      requestedCapability: "staff_session_revocation",
      permissionDecision: "denied",
      permissionReason: resolution.detail,
      success: false,
      errorCategory: "permission_denied",
      targetResourceId: `staff_user:${targetStaffUserId}`,
    });
    return { revoked: false, reason: resolution.detail };
  }

  const decision = evaluateAccess(resolution.profile, {
    action: REVOKE_ACTION,
    functionalScope: REVOKE_SCOPE,
  });

  await recordMaterialAuditEvent({
    staffUserId: administratorStaffUserId,
    authMethod: "entra_sso",
    workerId: "staff_portal",
    workerSpecificationVersion: "WSA Staff Portal Access Control Standard v1.0",
    requestedCapability: "staff_session_revocation",
    permissionDecision: decision.allowed ? "allowed" : "denied",
    permissionReason: decision.allowed
      ? `${SESSION_REVOCATION_REASONS.administrator_revocation} Reason given: ${reason}`
      : decision.reason,
    success: decision.allowed,
    errorCategory: decision.allowed ? "none" : "permission_denied",
    targetResourceId: `staff_user:${targetStaffUserId}`,
  });

  if (!decision.allowed) {
    return { revoked: false, reason: decision.reason };
  }

  await endSessionsFor(targetStaffUserId, "administrator_revocation");
  return { revoked: true };
}
