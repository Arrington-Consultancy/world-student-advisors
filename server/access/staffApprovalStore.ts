/**
 * Reading and writing the Google sign-in approval list.
 *
 * The decision logic is in shared/staffSignIn.ts and is pure. This is the
 * only place that touches the table, so there is one path to approve, one to
 * revoke, and one to read, and each writes the audit trail.
 *
 * Approving an address is a consequential act: it is the entire access
 * control for a personal Google account. It therefore requires access_admin,
 * checked by the caller before anything here runs, and every change is
 * recorded against the named staff member who made it.
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { staffApprovedEmails, staffAccessChanges } from "../../drizzle/schema";
import { normaliseEmail, type ApprovedAddress } from "../../shared/staffSignIn";

/** Every approval ever made, live and revoked. The sign-in gate decides which count. */
export async function readApprovals(): Promise<ApprovedAddress[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staffApprovedEmails);
  return rows.map(r => ({ email: r.email, revokedAt: r.revokedAt ?? null }));
}

/** The full rows, for the administration screen. */
export async function readApprovalRows() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffApprovedEmails);
}

export interface ApprovalResult {
  applied: boolean;
  reason: string;
}

/**
 * Approve an address, or restore one previously revoked.
 *
 * Re-approving updates the existing row rather than inserting a second, so
 * an address can never be simultaneously live and revoked. The earlier
 * approval's history is preserved in the audit trail rather than in a second
 * row nobody would think to look at.
 */
export async function approveEmail(params: {
  email: string;
  reason: string;
  approvedByStaffUserId: number;
}): Promise<ApprovalResult> {
  const db = await getDb();
  if (!db) return { applied: false, reason: "The database is unavailable." };

  const email = normaliseEmail(params.email);
  if (email === "" || !email.includes("@")) {
    return { applied: false, reason: "That is not an email address." };
  }
  if (params.reason.trim().length < 5) {
    return { applied: false, reason: "A reason is required, so the list does not fill up with addresses nobody can account for." };
  }

  const existing = await db
    .select()
    .from(staffApprovedEmails)
    .where(eq(staffApprovedEmails.email, email))
    .limit(1);

  if (existing[0]) {
    if (existing[0].revokedAt === null) {
      return { applied: false, reason: "That address is already approved." };
    }
    await db
      .update(staffApprovedEmails)
      .set({
        revokedAt: null,
        revokedByStaffUserId: null,
        revocationReason: null,
        approvedByStaffUserId: params.approvedByStaffUserId,
        approvedAt: new Date(),
        reason: params.reason,
      })
      .where(eq(staffApprovedEmails.id, existing[0].id));
  } else {
    await db.insert(staffApprovedEmails).values({
      email,
      reason: params.reason,
      approvedByStaffUserId: params.approvedByStaffUserId,
    });
  }

  await db.insert(staffAccessChanges).values({
    staffUserId: params.approvedByStaffUserId,
    changedByStaffUserId: params.approvedByStaffUserId,
    changeType: "grant_added",
    previousValue: null,
    newValue: `Google sign-in approved for ${email}`,
    reason: params.reason,
    authorityReference: "Tom Arrington approval of personal Google sign-in, 9 September 2026.",
  });

  return { applied: true, reason: `${email} may now sign in with Google.` };
}

/**
 * Withdraw an approval.
 *
 * Takes effect immediately rather than at token expiry, because
 * requireActiveStaffIdentity re-reads this on every request. A revoked
 * person's next click is refused, not their next sign-in.
 */
export async function revokeEmail(params: {
  email: string;
  reason: string;
  revokedByStaffUserId: number;
}): Promise<ApprovalResult> {
  const db = await getDb();
  if (!db) return { applied: false, reason: "The database is unavailable." };

  const email = normaliseEmail(params.email);
  if (params.reason.trim().length < 5) {
    return { applied: false, reason: "A reason is required for a revocation." };
  }

  const live = await db
    .select()
    .from(staffApprovedEmails)
    .where(and(eq(staffApprovedEmails.email, email), isNull(staffApprovedEmails.revokedAt)))
    .limit(1);

  if (!live[0]) {
    return { applied: false, reason: "That address is not currently approved." };
  }

  await db
    .update(staffApprovedEmails)
    .set({
      revokedAt: new Date(),
      revokedByStaffUserId: params.revokedByStaffUserId,
      revocationReason: params.reason,
    })
    .where(eq(staffApprovedEmails.id, live[0].id));

  await db.insert(staffAccessChanges).values({
    staffUserId: params.revokedByStaffUserId,
    changedByStaffUserId: params.revokedByStaffUserId,
    changeType: "grant_revoked",
    previousValue: `Google sign-in approved for ${email}`,
    newValue: null,
    reason: params.reason,
    authorityReference: "Tom Arrington approval of personal Google sign-in, 9 September 2026.",
  });

  return { applied: true, reason: `${email} can no longer sign in, from their next request.` };
}

/**
 * Whether this address is approved right now.
 *
 * Called on every request for a Google session, which is what makes
 * revocation immediate. A Microsoft session never reaches this.
 */
export async function isCurrentlyApproved(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(staffApprovedEmails)
    .where(and(eq(staffApprovedEmails.email, normaliseEmail(email)), isNull(staffApprovedEmails.revokedAt)))
    .limit(1);
  return rows.length > 0;
}
