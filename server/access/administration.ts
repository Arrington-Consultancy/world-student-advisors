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
  FIRST_ADMINISTRATOR_ACTIONS,
  FIRST_ADMINISTRATOR_CASE_SCOPE,
  FIRST_ADMINISTRATOR_LEVEL,
  FIRST_ADMINISTRATOR_SCOPES,
} from "./firstAdministratorProfile";
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
  | "reason_missing"
  // Refusals belonging only to the controlled scope-addition route below.
  | "no_existing_assignment"
  | "target_not_active"
  | "level_would_change"
  | "case_scope_would_change"
  | "status_would_change"
  | "team_would_change"
  | "action_permission_would_change"
  | "overlay_would_change"
  | "scope_would_be_revoked"
  | "authority_missing"
  | "no_change"
  // Refusals belonging only to the first-administrator completion route.
  | "not_the_first_administrator"
  | "administration_estate_established";

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
 * The one change a controlled workflow may make without an administrator
 * present: adding functional scopes to an assignment that already exists.
 *
 * WHY THIS EXISTS SEPARATELY. decideAssignment above is the screen's rule
 * set, and it assumes a signed-in administrator who is not the target.
 * That assumption is correct there and cannot be relaxed. But it leaves a
 * real gap: the only account holding access_admin is the shared executive
 * session, and a person cannot administer themselves, so an owner sitting
 * at a keyboard with no second administrator has no route to widen their
 * own named account except a hand-edited production row. Hand-edited rows
 * are exactly what this whole module was written to stop.
 *
 * So this route grants no administrator authority at all. It is defined
 * by what it refuses. The level cannot move, the case scope cannot move,
 * the status cannot move, the team cannot move, not one action permission
 * may be added or removed, not one sensitive overlay may be added or
 * removed, and no functional scope may be revoked. It can add functional
 * scopes to an active, already-assigned account, and it can do nothing
 * else. Every consequential permission in section 3 is therefore out of
 * reach here by construction rather than by a list that could be edited:
 * they are action permissions, and action permissions cannot change.
 *
 * A written authority reference is required and a no-op is refused, so a
 * repeated run cannot quietly append audit rows recording no change.
 *
 * It returns the same decision type as decideAssignment and produces its
 * diff and audit lines from the same functions, so applyAssignment still
 * only ever receives a decision that some rule set produced.
 */
export function decideControlledScopeAddition(
  current: CurrentAssignment,
  proposed: ProposedAssignment,
): AdministrationDecision {
  if (current.baseAccessLevel === null || current.accessStatus === null || current.caseScope === null) {
    return refuse(
      "no_existing_assignment",
      "This route amends an assignment that already exists. This account has none, so there is nothing " +
      "to add a scope to and the first assignment must be made deliberately.",
    );
  }
  if (current.accessStatus !== "active") {
    return refuse("target_not_active", `This account's access is ${current.accessStatus}, so it is not widened here.`);
  }
  if (proposed.reason.trim().length < 10) {
    return refuse(
      "reason_missing",
      "Access Control Standard section 9 requires a reason for every permission change.",
    );
  }
  if (!proposed.authorityReference || proposed.authorityReference.trim().length < 10) {
    return refuse(
      "authority_missing",
      "A controlled approval reference is required: this route runs with no administrator present, so the " +
      "written authority is the only thing standing behind the change.",
    );
  }

  if (proposed.baseAccessLevel !== current.baseAccessLevel) {
    return refuse(
      "level_would_change",
      `This route cannot change an access level. The account is Level ${current.baseAccessLevel} and the ` +
      `proposal says Level ${proposed.baseAccessLevel}.`,
    );
  }
  if (proposed.caseScope !== current.caseScope) {
    return refuse(
      "case_scope_would_change",
      `This route cannot change a case scope. The account is ${current.caseScope} and the proposal says ` +
      `${proposed.caseScope}.`,
    );
  }
  if (proposed.accessStatus !== current.accessStatus) {
    return refuse("status_would_change", "This route cannot change an access status.");
  }
  if ((proposed.teamId ?? null) !== (current.teamId ?? null)) {
    return refuse("team_would_change", "This route cannot change a team.");
  }

  if (!sameMembers(current.actionPermissions, proposed.actionPermissions)) {
    return refuse(
      "action_permission_would_change",
      "This route cannot add or remove an action permission. It holds [" +
      `${[...current.actionPermissions].sort().join(", ")}] and the proposal says [` +
      `${[...proposed.actionPermissions].sort().join(", ")}].`,
    );
  }
  if (!sameMembers(current.sensitiveOverlays, proposed.sensitiveOverlays)) {
    return refuse(
      "overlay_would_change",
      "This route cannot add or remove a sensitive overlay. It holds [" +
      `${[...current.sensitiveOverlays].sort().join(", ")}] and the proposal says [` +
      `${[...proposed.sensitiveOverlays].sort().join(", ")}].`,
    );
  }

  for (const scope of proposed.functionalScopes) {
    if (!isOneOf(FUNCTIONAL_SCOPES, scope)) return refuse("unknown_value", `${scope} is not a functional scope.`);
  }
  for (const held of current.functionalScopes) {
    if (!proposed.functionalScopes.includes(held)) {
      return refuse(
        "scope_would_be_revoked",
        `This route only adds. The proposal would revoke the ${held} scope, which is a separate decision.`,
      );
    }
  }

  const added = diffAdded(current, proposed);
  if (added.length === 0) {
    return refuse(
      "no_change",
      "This account already holds every scope proposed, so there is nothing to add. Refusing rather than " +
      "writing audit rows that record no change.",
    );
  }

  return {
    permitted: true,
    auditLines: buildAuditLines(current, proposed),
    grantsToAdd: added,
    grantsToRevoke: diffRevoked(current, proposed),
  };
}

/** Set equality, so ordering and duplication cannot look like a change. */
function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size !== right.size) return false;
  return a.every(value => right.has(value));
}

/**
 * What the caller must establish about the estate before this route runs.
 * Facts, counted from the live grants table, never asserted by a request.
 */
export interface FirstAdministratorContext {
  /** Distinct accounts holding a live access_admin grant. */
  accessAdminHolderCount: number;
  /** Whether the account being completed is one of them. */
  targetHoldsAccessAdmin: boolean;
}

/**
 * Completes the first access administrator, once, to the approved profile.
 *
 * THE DEADLOCK THIS EXISTS TO BREAK. WSA hit it in production on
 * 3 September 2026. The bootstrap established a partial profile, and the
 * access screen then refused to let the administrator finish it, because
 * decideAssignment refuses self-administration. That refusal is correct
 * and is deliberately untouched: an administrator who can elevate
 * themselves makes every other control decorative. What was wrong was a
 * bootstrap that could leave an account it had no way to complete.
 *
 * WHY THIS IS NOT A SELF-SERVICE ESCALATION ROUTE. Four things hold, and
 * each is tested:
 *
 * It takes no profile. The result is FIRST_ADMINISTRATOR_* or nothing, so
 * there is no argument, input or workflow parameter that can widen it.
 * Passing it a request for credential_admin is not possible, because there
 * is nowhere to put one.
 *
 * It only ever completes an account that ALREADY holds access_admin. It
 * cannot appoint anybody, so it is not a way in.
 *
 * It refuses once a second administrator exists. The window is the period
 * when exactly one account can administer, which is the definition of "the
 * first administrator", and it closes permanently the moment a real
 * administration estate exists.
 *
 * It refuses a no-op, so once the profile matches, running it again does
 * nothing and writes nothing. In the ordinary case it is available exactly
 * once, and the run that uses it is the run that closes it.
 *
 * It also never touches sensitive overlays. Those are a separate approval
 * about categories of material, so whatever the account holds is carried
 * through untouched rather than granted or revoked here.
 */
export function decideFirstAdministratorCompletion(
  current: CurrentAssignment,
  context: FirstAdministratorContext,
  reason: string,
  authorityReference: string,
): AdministrationDecision {
  if (!context.targetHoldsAccessAdmin) {
    return refuse(
      "not_the_first_administrator",
      "This account does not hold access_admin, so it is not the first administrator and this route cannot " +
      "appoint it. Appointing an administrator is the bootstrap's job, and an ordinary assignment thereafter.",
    );
  }
  if (context.accessAdminHolderCount !== 1) {
    return refuse(
      "administration_estate_established",
      `${context.accessAdminHolderCount} accounts hold access_admin, so there is an administration estate and ` +
      "this route is closed. A second administrator makes the ordinary access screen the correct way to change " +
      "anybody's access, including the first administrator's.",
    );
  }
  if (current.baseAccessLevel === null || current.accessStatus === null || current.caseScope === null) {
    return refuse(
      "no_existing_assignment",
      "This account has no recorded assignment at all, so the bootstrap has not run. Run the bootstrap rather " +
      "than completing something that does not exist.",
    );
  }
  if (current.accessStatus !== "active") {
    return refuse("target_not_active", `This account's access is ${current.accessStatus}, so it is not completed here.`);
  }
  if (reason.trim().length < 10) {
    return refuse("reason_missing", "Access Control Standard section 9 requires a reason for every permission change.");
  }
  if (authorityReference.trim().length < 10) {
    return refuse("authority_missing", "A controlled approval reference is required.");
  }

  const proposed: ProposedAssignment = {
    targetStaffUserId: 0,
    baseAccessLevel: FIRST_ADMINISTRATOR_LEVEL,
    caseScope: FIRST_ADMINISTRATOR_CASE_SCOPE,
    functionalScopes: [...FIRST_ADMINISTRATOR_SCOPES],
    actionPermissions: [...FIRST_ADMINISTRATOR_ACTIONS],
    // Carried through, never decided here.
    sensitiveOverlays: current.sensitiveOverlays,
    accessStatus: "active",
    teamId: current.teamId,
    reason,
    authorityReference,
  };

  const added = diffAdded(current, proposed);
  const revoked = diffRevoked(current, proposed);
  const levelMoves = current.baseAccessLevel !== proposed.baseAccessLevel;
  const scopeMoves = current.caseScope !== proposed.caseScope;
  if (added.length === 0 && revoked.length === 0 && !levelMoves && !scopeMoves) {
    return refuse(
      "no_change",
      "This account already holds exactly the approved first-administrator profile, so there is nothing to " +
      "complete. Refusing rather than writing audit rows that record no change.",
    );
  }

  return {
    permitted: true,
    auditLines: buildAuditLines(current, proposed),
    grantsToAdd: added,
    grantsToRevoke: revoked,
  };
}

/**
 * The consequential actions, exported for the UI so it can mark them
 * rather than presenting twelve identical tick boxes. Sourced from
 * accessControl.ts so the list cannot drift.
 */
export const CONSEQUENTIAL_ACTION_LIST: readonly ActionPermission[] =
  ACTION_PERMISSIONS.filter(a => CONSEQUENTIAL_ACTIONS.has(a));
