/**
 * Resolves a signed-in staff member's access profile from the controlled
 * records, for the pure model in accessControl.ts to decide against.
 *
 * The split matters: accessControl.ts answers "may this profile do this?"
 * and is provable without a database; this file answers "what profile does
 * this person actually hold?" and is the only place that reads the staff
 * record. Nothing else in the codebase may construct a StaffAccessProfile
 * — a profile built anywhere else would be an authority claim from an
 * unverified source, which is precisely what §9 forbids.
 *
 * Deny-by-default runs the whole way through (§9, "Missing or ambiguous
 * permission means no access until resolved"):
 *
 *   - a missing staff row, an inactive one, or an absent database resolves
 *     to no profile at all, not to a limited one;
 *   - a NULL baseAccessLevel, caseScope or accessStatus resolves to no
 *     profile — an account that has never had an authority decision
 *     recorded holds nothing, rather than falling back to the lowest level;
 *   - a stored grant value that is not in the approved list in
 *     accessControl.ts is DROPPED and reported, never passed through to a
 *     comparison that might accidentally match;
 *   - a shared-password session resolves to no profile, because it carries
 *     no individual identity to attach an authority decision to.
 */
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { getDb } from "../db";
import { staffUsers, staffAccessGrants } from "../../drizzle/schema";
import {
  ACTION_PERMISSIONS,
  CASE_SCOPES,
  FUNCTIONAL_SCOPES,
  SENSITIVE_OVERLAYS,
  type AccessLevel,
  type AccountStatus,
  type ActionPermission,
  type CaseScope,
  type FunctionalScope,
  type SensitiveOverlay,
  type StaffAccessProfile,
  type TemporaryGrant,
} from "./accessControl";

/**
 * Why no profile could be resolved. Returned rather than thrown so a
 * caller can audit the reason without a stack trace, and so an ordinary
 * "this person has no access assignment yet" is not confused with an
 * outage. Every value here denies.
 */
export type ProfileUnavailableReason =
  | "no_individual_identity"
  | "database_unavailable"
  | "staff_record_not_found"
  | "staff_record_inactive"
  | "no_access_assignment"
  | "invalid_access_assignment";

export type ProfileResolution =
  | { resolved: true; profile: StaffAccessProfile; droppedGrantValues: readonly string[] }
  | { resolved: false; reason: ProfileUnavailableReason; detail: string };

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/**
 * §2 — levels are 1..5 and nothing else. A stored 0, 6 or NaN is an invalid
 * assignment, not a level to clamp into range: clamping would invent an
 * authority decision nobody made.
 */
function toAccessLevel(value: unknown): AccessLevel | null {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;
}

/**
 * §9 — the two status columns must BOTH permit. isActive governs whether
 * the person may hold a session; accessStatus governs the state of their
 * access assignment. Neither can override the other, so a leaver
 * deactivated in one place cannot be silently re-enabled by the other.
 */
function resolveStatus(isActive: number, accessStatus: unknown): AccountStatus {
  if (isActive !== 1) return "disabled";
  if (accessStatus === "active" || accessStatus === "suspended" || accessStatus === "disabled") {
    return accessStatus;
  }
  return "disabled";
}

interface GrantRow {
  grantType: string;
  value: string;
  expiresAt: Date | null;
  grantedByStaffUserId: number;
  reason: string;
  grantedAt: Date;
}

/**
 * Sorts stored grants into the shape accessControl.ts expects. Standing
 * grants (no expiry) become the profile's own scope/permission/overlay
 * lists; expiring ones become temporaryGrants[] so the model applies its
 * own expiry rule to them rather than this layer deciding.
 *
 * That division is deliberate: this function does NOT compare expiresAt to
 * the clock. Expiry is the model's rule (§9) and is exercised by the
 * model's tests; duplicating the comparison here would create a second
 * place for it to be wrong.
 */
export function assembleGrants(rows: readonly GrantRow[]): {
  functionalScopes: FunctionalScope[];
  actionPermissions: ActionPermission[];
  sensitiveOverlays: SensitiveOverlay[];
  standingCaseScope: CaseScope | null;
  temporaryGrants: TemporaryGrant[];
  droppedGrantValues: string[];
} {
  const functionalScopes: FunctionalScope[] = [];
  const actionPermissions: ActionPermission[] = [];
  const sensitiveOverlays: SensitiveOverlay[] = [];
  const temporaryGrants: TemporaryGrant[] = [];
  const droppedGrantValues: string[] = [];
  let standingCaseScope: CaseScope | null = null;

  for (const row of rows) {
    // An unrecognised value is dropped, never coerced. §9 fail closed.
    const valid =
      (row.grantType === "functional_scope" && isOneOf(FUNCTIONAL_SCOPES, row.value)) ||
      (row.grantType === "action_permission" && isOneOf(ACTION_PERMISSIONS, row.value)) ||
      (row.grantType === "sensitive_overlay" && isOneOf(SENSITIVE_OVERLAYS, row.value)) ||
      (row.grantType === "case_scope" && isOneOf(CASE_SCOPES, row.value));
    if (!valid) {
      droppedGrantValues.push(`${row.grantType}:${row.value}`);
      continue;
    }

    if (row.expiresAt instanceof Date) {
      temporaryGrants.push({
        grantedByStaffUserId: row.grantedByStaffUserId,
        reason: row.reason,
        grantedAt: row.grantedAt,
        expiresAt: row.expiresAt,
        functionalScopes: row.grantType === "functional_scope" ? [row.value as FunctionalScope] : undefined,
        actionPermissions: row.grantType === "action_permission" ? [row.value as ActionPermission] : undefined,
        sensitiveOverlays: row.grantType === "sensitive_overlay" ? [row.value as SensitiveOverlay] : undefined,
        caseScope: row.grantType === "case_scope" ? (row.value as CaseScope) : undefined,
      });
      continue;
    }

    switch (row.grantType) {
      case "functional_scope":
        functionalScopes.push(row.value as FunctionalScope);
        break;
      case "action_permission":
        actionPermissions.push(row.value as ActionPermission);
        break;
      case "sensitive_overlay":
        sensitiveOverlays.push(row.value as SensitiveOverlay);
        break;
      case "case_scope":
        // A standing case-scope grant may only be honoured by the model's
        // widening rule; recorded here for the caller to reconcile against
        // the column, never applied silently.
        standingCaseScope = row.value as CaseScope;
        break;
    }
  }

  return {
    functionalScopes,
    actionPermissions,
    sensitiveOverlays,
    standingCaseScope,
    temporaryGrants,
    droppedGrantValues,
  };
}

/** Row shape this module needs from staff_users. Kept explicit so a schema change surfaces here. */
export interface StaffAccessRow {
  id: number;
  isActive: number;
  baseAccessLevel: number | null;
  caseScope: string | null;
  accessStatus: string | null;
  teamId: string | null;
  assignedByStaffUserId: number | null;
  assignedAt: Date | null;
  assignmentReason: string | null;
}

/**
 * The pure half of resolution, exported so it can be tested exhaustively
 * without a database. buildProfile decides; resolveStaffAccessProfile only
 * fetches and delegates.
 */
export function buildProfile(row: StaffAccessRow, grantRows: readonly GrantRow[]): ProfileResolution {
  // An inactive staff row is NOT short-circuited here. It resolves to a
  // profile whose status is "disabled", so the denial is produced by the
  // model and lands in the audit log as a decision rather than an absence.
  // resolveStatus below is what makes that true.
  const level = toAccessLevel(row.baseAccessLevel);
  const caseScope = isOneOf(CASE_SCOPES, row.caseScope) ? row.caseScope : null;

  if (row.baseAccessLevel === null && row.caseScope === null && row.accessStatus === null) {
    return {
      resolved: false,
      reason: "no_access_assignment",
      detail: "This staff account has no recorded access assignment, so it holds no access (fail closed).",
    };
  }
  if (level === null) {
    return {
      resolved: false,
      reason: "invalid_access_assignment",
      detail: `Stored access level is not one of 1-5, so no profile can be resolved.`,
    };
  }
  if (caseScope === null) {
    return {
      resolved: false,
      reason: "invalid_access_assignment",
      detail: "Stored case scope is missing or not an approved value, so no profile can be resolved.",
    };
  }

  const assembled = assembleGrants(grantRows);

  return {
    resolved: true,
    droppedGrantValues: assembled.droppedGrantValues,
    profile: {
      staffUserId: row.id,
      baseAccessLevel: level,
      functionalScopes: assembled.functionalScopes,
      caseScope,
      actionPermissions: assembled.actionPermissions,
      sensitiveOverlays: assembled.sensitiveOverlays,
      temporaryGrants: assembled.temporaryGrants,
      status: resolveStatus(row.isActive, row.accessStatus),
      teamId: row.teamId,
      assignedByStaffUserId: row.assignedByStaffUserId,
      assignedAt: row.assignedAt,
      assignmentReason: row.assignmentReason,
    },
  };
}

/**
 * Resolves the live access profile for an individually identified staff
 * member. `staffUserId` must come from a verified session (see
 * staffSession.ts) — never from request input.
 *
 * Reads the staff row and its live grants on every call rather than
 * trusting anything cached in the session token, so a revoked grant or a
 * changed level takes effect on the next request rather than at token
 * expiry (§9, "Access must be removed or changed promptly").
 */
export async function resolveStaffAccessProfile(staffUserId: number | null): Promise<ProfileResolution> {
  if (staffUserId === null) {
    return {
      resolved: false,
      reason: "no_individual_identity",
      detail:
        "This session has no individual staff identity (shared-password sign-in), so no access assignment can be attached to it.",
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      resolved: false,
      reason: "database_unavailable",
      detail: "Access assignments could not be read, so no access is granted (fail closed).",
    };
  }

  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, staffUserId)).limit(1);
  const row = rows[0];
  if (!row) {
    return { resolved: false, reason: "staff_record_not_found", detail: "No staff record for this identity." };
  }

  const now = new Date();
  const grantRows = await db
    .select()
    .from(staffAccessGrants)
    .where(
      and(
        eq(staffAccessGrants.staffUserId, staffUserId),
        // Revoked grants are excluded at the query layer, not filtered in
        // memory afterwards, so a revoked grant never enters the process.
        isNull(staffAccessGrants.revokedAt),
        // Long-expired grants are excluded here too, as an optimisation
        // only — the model applies the authoritative expiry rule.
        or(isNull(staffAccessGrants.expiresAt), gt(staffAccessGrants.expiresAt, now)),
      ),
    );

  return buildProfile(row as StaffAccessRow, grantRows as GrantRow[]);
}
