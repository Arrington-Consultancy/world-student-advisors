/**
 * Default staff access: what an active staff account holds when nobody has
 * assigned it anything.
 *
 * Tim Hunt asked for full access by default. Tom Arrington chose it on
 * 12 September 2026, from four options, with the consequences stated: level
 * 1, organisation case scope, every functional scope, every action
 * permission and every sensitive overlay, including visa-regulated, finance
 * and staff-private HR. The two consequences put to him and accepted were
 * that access_admin and credential_admin become automatic, so any new
 * account can grant access and manage credentials, and that AI workers act
 * inside the signed-in member's profile, so every worker reaches whatever
 * that member now reaches.
 *
 * This replaces deny-by-default for accounts with no assignment. It does
 * not replace the assignment mechanism: an explicit assignment still wins,
 * so an account can be narrowed or suspended in the usual way and the
 * default never widens it back.
 *
 * What is deliberately NOT changed:
 *   An inactive staff row is still disabled. The default is for an active
 *     account nobody has got round to assigning, not for a closed one.
 *   An explicit assignment is still authoritative, including one that
 *     grants less than this.
 *   The profile records that it came from the default, so an audit row and
 *     the access screen both say so rather than implying somebody chose it.
 *
 * Changing this is a change to the approved Access Control Standard and a
 * Change Log entry, not a code edit.
 */
import {
  ACTION_PERMISSIONS,
  CASE_SCOPES,
  FUNCTIONAL_SCOPES,
  SENSITIVE_OVERLAYS,
  type AccessLevel,
  type ActionPermission,
  type CaseScope,
  type FunctionalScope,
  type SensitiveOverlay,
} from "./accessControl";

export const DEFAULT_ACCESS_SOURCE =
  "Default staff access, chosen by Tom Arrington on 12 September 2026 on Tim Hunt's request: " +
  "full access for any active staff account with no explicit assignment. " +
  "Recorded in the WSA Access Control Standard and Change Log Change Entry 092.";

/** Applied only where there is no assignment at all. An assignment always wins. */
export const DEFAULT_ACCESS: Readonly<{
  baseAccessLevel: AccessLevel;
  caseScope: CaseScope;
  functionalScopes: readonly FunctionalScope[];
  actionPermissions: readonly ActionPermission[];
  sensitiveOverlays: readonly SensitiveOverlay[];
}> = Object.freeze({
  baseAccessLevel: 1,
  caseScope: "organisation",
  functionalScopes: Object.freeze([...FUNCTIONAL_SCOPES]) as readonly FunctionalScope[],
  actionPermissions: Object.freeze([...ACTION_PERMISSIONS]) as readonly ActionPermission[],
  sensitiveOverlays: Object.freeze([...SENSITIVE_OVERLAYS]) as readonly SensitiveOverlay[],
});

/** True while the default is in force. Kept as a named constant so a reader can find it. */
export const DEFAULT_ACCESS_IN_FORCE = true;

/** The sentence the Staff access screen shows, so nobody has to read the code to know. */
export const DEFAULT_ACCESS_NOTICE =
  "Every active staff account without an explicit assignment currently holds full access: " +
  "the whole organisation's cases, every functional area, every action including export, " +
  "delete, access administration and credential administration, and every sensitive overlay " +
  "including visa, finance and staff HR. Assigning somebody explicitly narrows them to what you choose.";

// Both lists are complete by construction rather than by hand, so a value
// added to the standard cannot be silently left out of the default.
export const DEFAULT_GRANTS_EVERYTHING =
  DEFAULT_ACCESS.functionalScopes.length === FUNCTIONAL_SCOPES.length &&
  DEFAULT_ACCESS.actionPermissions.length === ACTION_PERMISSIONS.length &&
  DEFAULT_ACCESS.sensitiveOverlays.length === SENSITIVE_OVERLAYS.length &&
  (CASE_SCOPES as readonly string[]).includes(DEFAULT_ACCESS.caseScope);
