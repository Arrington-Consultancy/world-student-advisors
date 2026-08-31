/**
 * Who may change whose access, and to what.
 *
 * The Access Control Standard defines five levels, nineteen functional
 * scopes, twelve action permissions, four case scopes and seven sensitive
 * overlays, and §9 requires every permission change to be logged with who,
 * what, when and reason. All of that existed. What did not exist was any
 * way to actually make a change except by editing production rows by
 * hand, which meant every new member of staff was a database edit.
 *
 * This module is the rules half, deliberately pure: it decides whether a
 * proposed change is permitted and returns the audit lines it must write.
 * It touches no database and no session. That separation is what lets the
 * dangerous cases be tested exhaustively rather than reasoned about.
 *
 * Four controls, and none of them is a matter of the caller being careful:
 *
 * NOBODY EDITS THEIR OWN ACCESS. Not their level, not their grants, not
 * their status. An administrator who can elevate themselves is not
 * constrained by their own level, which makes every other check here
 * decorative.
 *
 * NOBODY GRANTS WHAT THEY DO NOT HOLD. An administrator cannot assign a
 * level above their own, nor an overlay, scope or action permission they
 * lack. Otherwise access_admin is a level-1 grant in disguise, whoever
 * holds it.
 *
 * OVERLAYS KEEP THEIR MINIMUM LEVELS. §7 sets a floor per category so an
 * overlay granted in error cannot hand a junior account material it
 * should never reach. Granting credentials_security to a Level 4 account
 * is refused here rather than silently stored and refused later.
 *
 * CONSEQUENTIAL ACTIONS ARE EXPLICIT. export_download, external_send,
 * submit, delete_destructive, financial_action, access_admin and
 * credential_admin are never implied by a level. They are granted one at
 * a time, by name, with a reason, or not at all.
 */
import {
  CASE_SCOPES,
  FUNCTIONAL_SCOPES,
  ACTION_PERMISSIONS,
  SENSITIVE_OVERLAYS,
  SENSITIVE_OVERLAY_MIN_LEVEL,
  CONSEQUENTIAL_ACTIONS,
  type AccessLevel,
  type CaseScope,
  type FunctionalScope,
  type ActionPermission,
  type SensitiveOverlay,
} from "./accessControl";

/** The administrator's own resolved access, as the profile layer returns it. */
export interface AdministratorAccess {
  staffUserId: number;
  baseAccessLevel: AccessLevel;
  functionalScopes: readonly FunctionalScope[];
  actionPermissions: readonly ActionPermission[];
  sensitiveOverlays: readonly SensitiveOverlay[];
  caseScope: CaseScope | null;
  status: "active" | "suspended" | "disabled";
}

export interface ProposedAssignment {
  /** Whose access is being set. */
  targetStaffUserId: number;
  baseAccessLevel: AccessLevel;
  caseScope: CaseScope;
  functionalScopes: readonly FunctionalScope[];
  actionPermissions: readonly ActionPermission[];
  sensitiveOverlays: readonly SensitiveOverlay[];
  accessStatus: "active" | "suspended" | "disabled";
  teamId: string | null;
  /** §9 — required for every change, not only temporary ones. */
  reason: string;
  /** The controlled record this change was made under, where one applies. */
  authorityReference?: string;
}

export type RefusalCode =
  | "administrator_not_active"
  | "administrator_lacks_access_admin"
  | "self_administration"
  | "level_above_administrator"
  | "grant_administrator_lacks"
  | "overlay_below_minimum_level"
  | "unknown_value"
  | "reason_missing";

export interface AdministrationRefusal {
  permitted: false;
  code: RefusalCode;
  reason: string;
}

export interface AuditLine {
  changeType:
    | "level_assigned"
    | "level_changed"
    | "case_scope_changed"
    | "status_changed"
    | "team_changed"
    | "grant_added"
    | "grant_revoked";
  previousValue: string | null;
  newValue: string | null;
}

export interface AdministrationApproval {
  permitted: true;
  /** Every change this assignment makes, for staff_access_changes. */
  auditLines: readonly AuditLine[];
  /** Grants to add and to revoke, so the caller writes a diff not a wipe. */
  grantsToAdd: readonly { grantType: string; value: string }[];
  grantsToRevoke: readonly { grantType: string; value: string }[];
}

export type AdministrationDecision = AdministrationApproval | AdministrationRefusal;

/** The target's current position, so the decision can be expressed as a diff. */
export interface CurrentAssignment {
  baseAccessLevel: AccessLevel | null;
  caseScope: CaseScope | null;
  functionalScopes: readonly FunctionalScope[];
  actionPermissions: readonly ActionPermission[];
  sensitiveOverlays: readonly SensitiveOverlay[];
  accessStatus: "active" | "suspended" | "disabled" | null;
  teamId: string | null;
}

function refuse(code: RefusalCode, reason: string): AdministrationRefusal {
  return { permitted: false, code, reason };
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/**
 * The whole decision. Returns either a refusal naming which control
 * stopped it, or the exact diff to write.
 */
export function decideAssignment(
  administrator: AdministratorAccess,
  current: CurrentAssignment,
  proposed: ProposedAssignment,
): AdministrationDecision {
  // A suspended or disabled administrator administers nothing, whatever
  // permissions the row still carries.
  if (administrator.status !== "active") {
    return refuse(
      "administrator_not_active",
      `Your own access is ${administrator.status}, so you cannot change anybody's access.`,
    );
  }

  if (!administrator.actionPermissions.includes("access_admin")) {
    return refuse(
      "administrator_lacks_access_admin",
      "Changing access requires the access_admin permission, which you do not hold.",
    );
  }

  // The control that makes the rest mean anything.
  if (administrator.staffUserId === proposed.targetStaffUserId) {
    return refuse(
      "self_administration",
      "You cannot change your own access. Another administrator must make this change.",
    );
  }

  if (proposed.reason.trim().length < 10) {
    return refuse(
      "reason_missing",
      "Access Control Standard section 9 requires a reason for every permission change. " +
      "Say why this person needs this access.",
    );
  }

  // Reject anything outside the approved lists rather than storing it and
  // failing closed later, which would look like a bug to whoever set it.
  if (![1, 2, 3, 4, 5].includes(proposed.baseAccessLevel)) {
    return refuse("unknown_value", `${String(proposed.baseAccessLevel)} is not an access level. Levels are 1 to 5.`);
  }
  if (!isOneOf(CASE_SCOPES, proposed.caseScope)) {
    return refuse("unknown_value", `${String(proposed.caseScope)} is not a case scope.`);
  }
  for (const scope of proposed.functionalScopes) {
    if (!isOneOf(FUNCTIONAL_SCOPES, scope)) return refuse("unknown_value", `${scope} is not a functional scope.`);
  }
  for (const action of proposed.actionPermissions) {
    if (!isOneOf(ACTION_PERMISSIONS, action)) return refuse("unknown_value", `${action} is not an action permission.`);
  }
  for (const overlay of proposed.sensitiveOverlays) {
    if (!isOneOf(SENSITIVE_OVERLAYS, overlay)) return refuse("unknown_value", `${overlay} is not a sensitive overlay.`);
  }

  // Level 1 is the most authority, so "above the administrator" is a
  // NUMERICALLY LOWER value. Getting this backwards would invert the
  // control entirely, which is why it is stated rather than inlined.
  if (proposed.baseAccessLevel < administrator.baseAccessLevel) {
    return refuse(
      "level_above_administrator",
      `You hold Level ${administrator.baseAccessLevel} and cannot assign Level ${proposed.baseAccessLevel}, ` +
      "which carries more authority than your own.",
    );
  }

  // Nobody hands out what they do not hold.
  for (const scope of proposed.functionalScopes) {
    if (!administrator.functionalScopes.includes(scope)) {
      return refuse("grant_administrator_lacks", `You cannot grant the ${scope} scope because you do not hold it.`);
    }
  }
  for (const action of proposed.actionPermissions) {
    if (!administrator.actionPermissions.includes(action)) {
      return refuse(
        "grant_administrator_lacks",
        `You cannot grant the ${action} permission because you do not hold it.`,
      );
    }
  }
  for (const overlay of proposed.sensitiveOverlays) {
    if (!administrator.sensitiveOverlays.includes(overlay)) {
      return refuse(
        "grant_administrator_lacks",
        `You cannot grant the ${overlay} overlay because you do not hold it.`,
      );
    }
  }

  // §7 floors, checked against the level being assigned rather than the
  // level the person happens to have now.
  for (const overlay of proposed.sensitiveOverlays) {
    const minimum = SENSITIVE_OVERLAY_MIN_LEVEL[overlay];
    if (proposed.baseAccessLevel > minimum) {
      return refuse(
        "overlay_below_minimum_level",
        `The ${overlay} overlay requires Level ${minimum} or higher. This assignment is Level ` +
        `${proposed.baseAccessLevel}. Raise the level or leave the overlay off.`,
      );
    }
  }

  return {
    permitted: true,
    auditLines: buildAuditLines(current, proposed),
    grantsToAdd: diffAdded(current, proposed),
    grantsToRevoke: diffRevoked(current, proposed),
  };
}

function buildAuditLines(current: CurrentAssignment, proposed: ProposedAssignment): AuditLine[] {
  const lines: AuditLine[] = [];

  if (current.baseAccessLevel !== proposed.baseAccessLevel) {
    lines.push({
      changeType: current.baseAccessLevel === null ? "level_assigned" : "level_changed",
      previousValue: current.baseAccessLevel === null ? null : `Level ${current.baseAccessLevel}`,
      newValue: `Level ${proposed.baseAccessLevel}`,
    });
  }
  if (current.caseScope !== proposed.caseScope) {
    lines.push({ changeType: "case_scope_changed", previousValue: current.caseScope, newValue: proposed.caseScope });
  }
  if (current.accessStatus !== proposed.accessStatus) {
    lines.push({ changeType: "status_changed", previousValue: current.accessStatus, newValue: proposed.accessStatus });
  }
  if ((current.teamId ?? null) !== (proposed.teamId ?? null)) {
    lines.push({ changeType: "team_changed", previousValue: current.teamId, newValue: proposed.teamId });
  }

  for (const added of diffAdded(current, proposed)) {
    lines.push({ changeType: "grant_added", previousValue: null, newValue: `${added.grantType}: ${added.value}` });
  }
  for (const revoked of diffRevoked(current, proposed)) {
    lines.push({ changeType: "grant_revoked", previousValue: `${revoked.grantType}: ${revoked.value}`, newValue: null });
  }

  return lines;
}

function diffAdded(current: CurrentAssignment, proposed: ProposedAssignment) {
  const added: { grantType: string; value: string }[] = [];
  for (const s of proposed.functionalScopes) {
    if (!current.functionalScopes.includes(s)) added.push({ grantType: "functional_scope", value: s });
  }
  for (const a of proposed.actionPermissions) {
    if (!current.actionPermissions.includes(a)) added.push({ grantType: "action_permission", value: a });
  }
  for (const o of proposed.sensitiveOverlays) {
    if (!current.sensitiveOverlays.includes(o)) added.push({ grantType: "sensitive_overlay", value: o });
  }
  return added;
}

function diffRevoked(current: CurrentAssignment, proposed: ProposedAssignment) {
  const revoked: { grantType: string; value: string }[] = [];
  for (const s of current.functionalScopes) {
    if (!proposed.functionalScopes.includes(s)) revoked.push({ grantType: "functional_scope", value: s });
  }
  for (const a of current.actionPermissions) {
    if (!proposed.actionPermissions.includes(a)) revoked.push({ grantType: "action_permission", value: a });
  }
  for (const o of current.sensitiveOverlays) {
    if (!proposed.sensitiveOverlays.includes(o)) revoked.push({ grantType: "sensitive_overlay", value: o });
  }
  return revoked;
}

/**
 * The consequential actions, exported for the UI so it can mark them
 * rather than presenting twelve identical tick boxes. Sourced from
 * accessControl.ts so the list cannot drift.
 */
export const CONSEQUENTIAL_ACTION_LIST: readonly ActionPermission[] =
  ACTION_PERMISSIONS.filter(a => CONSEQUENTIAL_ACTIONS.has(a));
