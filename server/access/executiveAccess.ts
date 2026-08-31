/**
 * Break-glass executive access, without Microsoft.
 *
 * Tom Arrington asked for this explicitly on 31 August 2026, chose the
 * unrestricted form after the alternatives and their costs were put to
 * him, and asked for it to remain permanently available. It is recorded
 * here plainly rather than softened, because somebody reading this file
 * in six months needs to know what it is and that it was a decision
 * rather than an accident.
 *
 * WHAT IT COSTS. A shared password cannot say who used it. Every action
 * taken through this route is attributable to "somebody who held the
 * password" and no further. The individual-identity work exists precisely
 * so that a student's case can be traced to a named person, and this
 * route steps outside that. It also bypasses Microsoft's multi-factor
 * requirement entirely, so the password is the only thing between anyone
 * who learns it and full executive access, permanently, until it is
 * changed.
 *
 * WHY IT EXISTS ANYWAY. WSA was locked out of its own Staff Portal by an
 * external dependency it could not quickly fix: Entra would not let staff
 * register an authentication method, so no individual identity could be
 * established at all. A continuity route that depends on nothing external
 * is a legitimate answer to that, and the judgement is the business
 * owner's to make.
 *
 * WHAT IS STILL TRUE. The password is never stored, only its bcrypt hash,
 * in EXECUTIVE_PASSWORD_HASH. Unset means this route does not exist, and
 * there is no default: absence of configuration cannot open a door. Every
 * action is audited under the shared_executive method, so the audit trail
 * says honestly what kind of session did it rather than implying a person.
 * Sign-in attempts are rate limited per address, because a permanent
 * unrestricted password with unlimited guesses is a different and much
 * worse thing.
 */
import * as jose from "jose";
import bcrypt from "bcryptjs";
import { ENV } from "../_core/env";
import type { StaffAccessProfile } from "./accessControl";
import {
  FUNCTIONAL_SCOPES,
  ACTION_PERMISSIONS,
  SENSITIVE_OVERLAYS,
  type FunctionalScope,
  type ActionPermission,
  type SensitiveOverlay,
} from "./accessControl";

const EXECUTIVE_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-executive-access");
const EXECUTIVE_TOKEN_EXPIRY = "12h";

/**
 * The staff-user id an executive session carries.
 *
 * Negative, so it can never collide with a real autoincrement id, and a
 * single reserved value so an audit row carrying it is unmistakable. It
 * is not a person and is never written to staff_users. Anything reading
 * an audit trail can tell at a glance that this was the shared route.
 */
export const EXECUTIVE_STAFF_USER_ID = -1;

export function isExecutiveAccessConfigured(): boolean {
  return Boolean(ENV.executivePasswordHash);
}

/**
 * The profile an executive session resolves to: Level 1, organisation-wide,
 * every functional scope, every action permission and every sensitive
 * overlay. This is the unrestricted form that was chosen.
 *
 * It is constructed in code rather than read from the database on purpose.
 * A row would be editable through the access screen, and a shared
 * credential whose authority could be quietly widened or narrowed by
 * whoever holds it is worse than one whose authority is fixed and
 * readable here.
 */
export const EXECUTIVE_PROFILE: StaffAccessProfile = Object.freeze({
  staffUserId: EXECUTIVE_STAFF_USER_ID,
  baseAccessLevel: 1,
  functionalScopes: Object.freeze([...FUNCTIONAL_SCOPES]) as readonly FunctionalScope[],
  caseScope: "organisation",
  actionPermissions: Object.freeze([...ACTION_PERMISSIONS]) as readonly ActionPermission[],
  sensitiveOverlays: Object.freeze([...SENSITIVE_OVERLAYS]) as readonly SensitiveOverlay[],
  temporaryGrants: Object.freeze([]),
  status: "active",
  teamId: null,
  assignedByStaffUserId: null,
  assignedAt: null,
  assignmentReason:
    "Break-glass executive access. Shared credential, no individual identity. " +
    "Authorised by Tom Arrington, 31 August 2026.",
});

/**
 * Checks a submitted password and, if it matches, mints an executive
 * session token. Returns null on any failure, without distinguishing a
 * wrong password from an unconfigured route, so this cannot be used to
 * probe whether the route exists.
 */
export async function authenticateExecutive(password: string): Promise<string | null> {
  if (!ENV.executivePasswordHash) return null;
  const valid = await bcrypt.compare(password, ENV.executivePasswordHash);
  if (!valid) return null;

  return new jose.SignJWT({ purpose: "executive_access" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXECUTIVE_TOKEN_EXPIRY)
    .sign(EXECUTIVE_JWT_SECRET);
}

/**
 * Verifies an executive token. Its own signing secret and purpose claim
 * mean no other token type can ever verify as one, and this one can never
 * verify as an Entra or shared-password token.
 */
export async function verifyExecutiveToken(token: string): Promise<boolean> {
  if (!ENV.executivePasswordHash) return false;
  try {
    const { payload } = await jose.jwtVerify(token, EXECUTIVE_JWT_SECRET);
    return payload.purpose === "executive_access";
  } catch {
    return false;
  }
}
