/**
 * Self-service staff signup with a work email address and a password.
 *
 * Tom Arrington asked for this on 9 September 2026: staff sign themselves up
 * using their work email address so WSA knows who they are, and set their own
 * password.
 *
 * THE PREMISE NEEDED ONE CORRECTION, AND THIS MODULE IS SHAPED BY IT.
 * "They have to use their work email address so we know it's fine" treats
 * typing an address as proof of holding it. It is not. Without a further
 * step, anybody who knows that WSA addresses look like
 * firstname@worldstudentadvisors.com could create a staff account with a
 * password of their own choosing, and the domain rule would wave them
 * through. So the domain check is only the first half: the second is a
 * verification link sent to that address, which only somebody who can read
 * that mailbox can follow.
 *
 * The two together do what Tom asked. The domain says which addresses may
 * ever sign up; the link proves this person holds the one they typed.
 *
 * WHAT SIGNING UP DOES NOT DO. It does not grant access. A verified staff
 * account starts with no access assignment at all, exactly like a Microsoft
 * or Google one, and every worker declines until Tom assigns scopes. Signup
 * is about establishing who somebody is, never what they may reach.
 *
 * WHY UNVERIFIED SIGNUPS ARE NOT staff_users ROWS. A pending signup lives in
 * its own table until the link is followed. The same reasoning as the Google
 * approval gate: a half-finished stranger sitting in staff_users would
 * appear on the Staff access screen as somebody to assign permissions to,
 * and the point of verifying is that such a person never gets that far.
 */

import { MICROSOFT_ALLOWED_DOMAIN, normaliseEmail } from "./staffSignIn";

/** The only domain that may sign up. The same one Microsoft sign-in requires. */
export const SIGNUP_ALLOWED_DOMAIN = MICROSOFT_ALLOWED_DOMAIN;

/** How long a verification link stays usable. Long enough for a working day, short enough to matter. */
export const VERIFICATION_TTL_HOURS = 24;

/**
 * Twelve characters, and nothing else prescribed.
 *
 * Length does far more for a password than composition rules do, and
 * mandatory symbols reliably produce Password1! across a whole organisation.
 * A long passphrase somebody can actually remember beats a short scramble
 * they write on a note under the keyboard.
 */
export const MIN_PASSWORD_LENGTH = 12;

export type SignupRefusalCode =
  | "email_missing"
  | "domain_not_permitted"
  | "password_too_short"
  | "password_contains_email"
  | "already_registered";

export interface SignupDecision {
  permitted: boolean;
  code?: SignupRefusalCode;
  /** Written to be shown to the person signing up. */
  reason?: string;
}

function refuse(code: SignupRefusalCode, reason: string): SignupDecision {
  return { permitted: false, code, reason };
}

/**
 * Whether this person may begin signing up.
 *
 * `alreadyRegistered` is passed in rather than looked up here so this stays
 * pure. Note what the caller does with a refusal on that ground: see
 * `signupResponseFor` below, which deliberately does not tell the person
 * asking.
 */
export function decideStaffSignup(
  emailInput: string,
  password: string,
  alreadyRegistered: boolean,
): SignupDecision {
  const email = normaliseEmail(emailInput);

  if (email === "" || !email.includes("@")) {
    return refuse("email_missing", "Enter your WSA work email address.");
  }

  const domain = email.split("@")[1] ?? "";
  if (domain !== SIGNUP_ALLOWED_DOMAIN) {
    return refuse(
      "domain_not_permitted",
      `Sign up with your WSA work address, ending @${SIGNUP_ALLOWED_DOMAIN}.`,
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return refuse(
      "password_too_short",
      `Your password needs at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you will remember works well.`,
    );
  }

  // The local part of somebody's own address is the first thing an attacker
  // tries, and it is the one password guaranteed to be public.
  const localPart = email.split("@")[0];
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    return refuse(
      "password_contains_email",
      "Your password cannot contain your email address. Anyone who knows your address would know it.",
    );
  }

  if (alreadyRegistered) {
    return refuse("already_registered", "That address already has a Staff Portal account.");
  }

  return { permitted: true };
}

/**
 * What the person signing up is actually told.
 *
 * Deliberately the same words whether the address was accepted or already
 * has an account. Otherwise the signup form answers "does this person work
 * at WSA" for anybody who cares to ask it, one address at a time, and that
 * is a staff directory handed out for free.
 *
 * The refusals it does disclose are ones the person must see to proceed: a
 * wrong domain and a weak password are their own input, and telling them is
 * the only way they can fix it.
 */
export const SIGNUP_ACCEPTED_MESSAGE =
  "Check your WSA email. If that address can sign up, a link is on its way, and it works for the next " +
  `${VERIFICATION_TTL_HOURS} hours.`;

export function signupResponseFor(decision: SignupDecision): { shown: string; sendEmail: boolean } {
  if (decision.permitted) return { shown: SIGNUP_ACCEPTED_MESSAGE, sendEmail: true };
  if (decision.code === "already_registered") {
    // Same words as success, and no email. The person who genuinely owns the
    // address already has an account and can sign in or reset; the person
    // fishing learns nothing.
    return { shown: SIGNUP_ACCEPTED_MESSAGE, sendEmail: false };
  }
  return { shown: decision.reason ?? "That signup could not be completed.", sendEmail: false };
}

export type VerificationRefusalCode = "token_unknown" | "token_expired" | "token_used";

export interface VerificationDecision {
  permitted: boolean;
  code?: VerificationRefusalCode;
  reason?: string;
}

/** A pending signup, as the store holds it. The token itself is never stored, only its hash. */
export interface PendingSignup {
  email: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

/**
 * Whether this verification link may still be used.
 *
 * Single use and time limited. A link that has been followed once is spent,
 * so a forwarded or logged URL cannot create a second account or reopen a
 * closed one.
 */
export function decideVerification(
  pending: PendingSignup | null,
  now: Date = new Date(),
): VerificationDecision {
  if (!pending) {
    return { permitted: false, code: "token_unknown", reason: "That link is not valid. Please sign up again." };
  }
  if (pending.consumedAt !== null) {
    return { permitted: false, code: "token_used", reason: "That link has already been used. Try signing in." };
  }
  if (now.getTime() > pending.expiresAt.getTime()) {
    return { permitted: false, code: "token_expired", reason: "That link has expired. Please sign up again." };
  }
  return { permitted: true };
}
