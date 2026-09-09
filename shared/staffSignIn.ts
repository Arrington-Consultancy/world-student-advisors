/**
 * Who may open a Staff Portal session, and by which route.
 *
 * WHY THIS IS A SEPARATE MODULE. Tom Arrington decided on 9 September 2026
 * that staff should be able to sign in with a personal Google account,
 * approved address by address, and revocable. That decision moves the
 * security of the whole Staff Portal onto one list, so the rule that reads
 * that list lives on its own, is pure, and is tested by breaking it.
 *
 * THE TWO ROUTES ARE NOT EQUIVALENT, and the difference is the point.
 *
 *   Microsoft. Two independent controls, both kept exactly as they were.
 *   Only WSA's Entra tenant can issue a token for the configured client,
 *   and the address must end @worldstudentadvisors.com. Somebody who does
 *   not work at WSA cannot obtain such a token, so the domain check is
 *   defence in depth rather than the wall.
 *
 *   Google. Anybody on earth can create a Google account, so neither of
 *   those controls exists. The approval list is not defence in depth here.
 *   It is the entire wall. Everything below follows from that.
 *
 * WHY email_verified IS MANDATORY. With Google the address is the
 * credential: it is the thing matched against the approval list. An ID
 * token whose email_verified is false is asserting an address Google has
 * not confirmed the holder owns, so trusting it would let somebody claim an
 * approved colleague's address. This refuses it. That check is the
 * difference between an approval list and a suggestion.
 *
 * WHY MATCHING IS EXACT. No wildcards, no domain patterns, no "ends with",
 * no normalisation beyond lowercasing and trimming. Gmail treats
 * a.b@gmail.com and ab@gmail.com as the same mailbox and this deliberately
 * does not, because the failure direction matters: a stricter match denies
 * a real colleague, who then asks Tom and gets approved, while a looser one
 * admits somebody nobody approved. One of those is an inconvenience and the
 * other is a breach.
 *
 * WHY REVOCATION IS CHECKED ON EVERY REQUEST, not at sign-in. A session
 * token lasts twelve hours. If approval were only read when the session
 * opened, revoking somebody would leave them working inside the portal for
 * the rest of the day. staffIdentityAuth's requireActiveStaffIdentity
 * already re-reads isActive on every request for exactly this reason, and
 * this check sits beside it.
 */

export type SignInProvider = "microsoft" | "google";

/** The Microsoft tenant domain. Unchanged, and deliberately not applied to Google. */
export const MICROSOFT_ALLOWED_DOMAIN = "worldstudentadvisors.com";

export type SignInRefusalCode =
  | "email_missing"
  | "email_not_verified"
  | "domain_not_permitted"
  | "not_approved"
  | "approval_revoked";

export interface SignInDecision {
  permitted: boolean;
  code?: SignInRefusalCode;
  /** Written to be shown to the person trying to sign in. */
  reason?: string;
}

/** One row of the approval list, as the store holds it. */
export interface ApprovedAddress {
  email: string;
  /** Cleared approvals are kept rather than deleted, so the record of who was let in survives. */
  revokedAt: Date | null;
}

function refuse(code: SignInRefusalCode, reason: string): SignInDecision {
  return { permitted: false, code, reason };
}

/**
 * The single normalisation, used when approving and when checking, so the
 * two can never disagree. Lowercase and trim, and nothing else: see the
 * note above on why Gmail's dot and plus rules are deliberately not applied.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Whether this verified identity may open a session.
 *
 * Deny by default. `approvals` is the live list read from the store; an
 * empty list means nobody signs in with Google, which is the correct state
 * before Tom has approved anyone.
 */
export function decideStaffSignIn(
  provider: SignInProvider,
  claims: { email: string | null | undefined; emailVerified: boolean },
  approvals: readonly ApprovedAddress[],
): SignInDecision {
  const email = normaliseEmail(claims.email ?? "");
  if (email === "") {
    return refuse("email_missing", "That account did not provide an email address.");
  }

  if (provider === "microsoft") {
    // Unchanged. The tenant is the control; the domain is the second check.
    const domain = email.split("@")[1] ?? "";
    if (domain !== MICROSOFT_ALLOWED_DOMAIN) {
      return refuse(
        "domain_not_permitted",
        `Microsoft sign-in is restricted to @${MICROSOFT_ALLOWED_DOMAIN} accounts.`,
      );
    }
    return { permitted: true };
  }

  // Google. The approval list is the only wall, so everything is checked.
  if (!claims.emailVerified) {
    return refuse(
      "email_not_verified",
      "Google has not confirmed that this account owns that email address, so it cannot be used to sign in.",
    );
  }

  const match = approvals.find(a => normaliseEmail(a.email) === email);
  if (!match) {
    return refuse(
      "not_approved",
      "That address has not been approved for the WSA Staff Portal. Ask Tom Arrington to approve it.",
    );
  }
  if (match.revokedAt !== null) {
    return refuse("approval_revoked", "Access for that address has been withdrawn.");
  }
  return { permitted: true };
}

/** The addresses currently permitted, for display. Revoked rows are kept but not listed as live. */
export function liveApprovals(approvals: readonly ApprovedAddress[]): ApprovedAddress[] {
  return approvals.filter(a => a.revokedAt === null);
}
