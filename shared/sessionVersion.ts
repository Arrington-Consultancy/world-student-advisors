/**
 * Per-user session invalidation.
 *
 * A general staff security control, not something tied to forgotten
 * passwords. Every staff account carries a session version. Every session
 * token carries the version that was current when it was minted. Every
 * authenticated request compares the two, and a session whose version no
 * longer matches the account stops working immediately.
 *
 * WHAT THIS ENFORCES, AND WHY IT NEEDS NO NEW APPROVAL. The Staff Portal
 * Access Control Standard v1.0 (APPROVED, 30 August 2026) already requires
 * it. Section 9: "Access must be removed or changed promptly when staff
 * role, employment, team or responsibilities change", and "Permission
 * denial must fail closed." Before this, a signed staff token was good for
 * its full twelve hours no matter what happened to the account behind it, so
 * "promptly" was true for anything the request re-read from the database and
 * false for the session itself. This closes that gap. It does not widen the
 * access model: no level, scope, overlay or case rule changes.
 *
 * WHY A VERSION RATHER THAN A SESSION TABLE. The portal issues signed tokens
 * and keeps no server-side session store. Adding one would mean a write on
 * every request. A single integer on the account gives the same power for
 * the thing that actually matters, cutting every existing session for one
 * person at once, at the cost of not being able to cut one device and leave
 * another. That is the right trade for a revocation control: the reason to
 * revoke is almost always "this account may be compromised", and that
 * answer is all of them.
 *
 * A MISSING VERSION IS A FAILURE, NOT A PASS. A token minted before this
 * existed carries no version claim. It could be treated as exempt, which
 * would leave exactly the sessions this control was built to cut running
 * unchallenged. So it fails, and the practical cost is that everybody signed
 * in at the moment this deploys signs in once more.
 */

export type SessionVersionRefusalCode =
  | "version_missing"
  | "version_malformed"
  | "version_superseded";

export interface SessionVersionDecision {
  valid: boolean;
  code?: SessionVersionRefusalCode;
  /** Shown to the person. Deliberately the same words for every refusal. */
  reason?: string;
}

/**
 * The first version every account holds. Migration 0014 defaults existing
 * rows to this, so the three accounts that predate the column are in a
 * defined state rather than null.
 */
export const INITIAL_SESSION_VERSION = 1;

/**
 * One message for every refusal.
 *
 * A person whose session was cut because an administrator revoked it, and a
 * person whose session was cut because they reset their password, are told
 * the same thing. Distinguishing them would tell somebody holding a stolen
 * token which control caught them, and the person who genuinely owns the
 * account needs only to know to sign in again.
 */
export const SESSION_ENDED_MESSAGE =
  "Your session has ended. Please sign in to the Staff Portal again.";

/**
 * Whether a token's session version still matches the account.
 *
 * Pure, so the rule can be exercised without a database. Every path that is
 * not an exact match of two whole numbers refuses.
 */
export function decideSessionVersion(
  tokenVersion: unknown,
  accountVersion: unknown,
): SessionVersionDecision {
  if (tokenVersion === undefined || tokenVersion === null) {
    return {
      valid: false,
      code: "version_missing",
      reason: SESSION_ENDED_MESSAGE,
    };
  }

  // Not a whole number, or not a number at all. A string "3" that happened to
  // equal the account's 3 must not pass: a claim of the wrong type is a token
  // that was not minted by the current code, and guessing its intent is how a
  // check like this gets quietly bypassed.
  if (
    typeof tokenVersion !== "number" ||
    !Number.isInteger(tokenVersion) ||
    typeof accountVersion !== "number" ||
    !Number.isInteger(accountVersion)
  ) {
    return {
      valid: false,
      code: "version_malformed",
      reason: SESSION_ENDED_MESSAGE,
    };
  }

  if (tokenVersion !== accountVersion) {
    return {
      valid: false,
      code: "version_superseded",
      reason: SESSION_ENDED_MESSAGE,
    };
  }

  return { valid: true };
}

/** Why an account's sessions were cut. Recorded on the audit line. */
export type SessionRevocationTrigger =
  | "password_reset"
  | "account_status_change"
  | "administrator_revocation";

export const SESSION_REVOCATION_REASONS: Record<SessionRevocationTrigger, string> = {
  password_reset: "A local password was reset, so sessions opened under the old password were ended.",
  account_status_change: "The account was suspended or disabled, so its sessions were ended.",
  administrator_revocation: "An administrator with credential_admin explicitly revoked this account's sessions.",
};
