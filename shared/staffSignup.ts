/**
 * Self-service staff signup and password reset, both driven by a one-time
 * link emailed to a WSA work address.
 *
 * TOM'S FLOW, 9 September 2026: "they sign up, get an email to their inbox
 * and set the password there. There's a forgot password route as well."
 *
 * THE PASSWORD IS CHOSEN AT THE LINK, NOT AT THE FORM, AND THAT IS THE WHOLE
 * POINT. The first version of this took a password on the signup form and
 * carried it through to the account. That let the person filling in the form
 * choose the password for an address they did not own: submit a colleague's
 * address with a password of your choosing, and if they ever followed the
 * link out of curiosity, they would be sitting in an account whose password
 * a stranger knew. Setting the password on the page the link opens removes
 * that completely, because only somebody who can read the mailbox ever
 * chooses it.
 *
 * The two halves of the control are unchanged. The domain rule says which
 * addresses may ever hold an account. The link proves this person can read
 * the one they typed. Neither is sufficient alone.
 *
 * WHY SIGNUP AND RESET SHARE A MODULE. They are the same mechanism pointed at
 * two situations: prove you can read this mailbox, then set a password. The
 * only difference is which starting state is permitted, so keeping them
 * together means one expiry rule, one single-use rule and one set of password
 * rules rather than two that can drift apart.
 *
 * WHAT SIGNING UP DOES NOT DO. It does not grant access. A verified staff
 * account starts with no access assignment at all, exactly like a Microsoft
 * or Google one, and every worker declines until Tom assigns scopes. This
 * establishes who somebody is, never what they may reach.
 */

import { MICROSOFT_ALLOWED_DOMAIN, normaliseEmail } from "./staffSignIn";

/** The only domain that may sign up. The same one Microsoft sign-in requires. */
export const SIGNUP_ALLOWED_DOMAIN = MICROSOFT_ALLOWED_DOMAIN;

/** How long a link stays usable. Long enough for a working day, short enough to matter. */
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

/**
 * How long before the same address can trigger another email.
 *
 * Both routes email an address supplied by whoever filled in the form, which
 * means either one could be used to bomb a colleague's inbox by submitting it
 * over and over. The throttle is on the send, never on the reply: the person
 * asking sees the same words regardless, so this cannot be used to work out
 * whether a request was live.
 */
export const RESEND_INTERVAL_MINUTES = 2;

/** What an emailed link is for. Stored with the pending request. */
export type LinkPurpose = "signup" | "reset";

export type SignupRefusalCode =
  | "email_missing"
  | "domain_not_permitted"
  | "already_registered";

export interface SignupDecision {
  permitted: boolean;
  code?: SignupRefusalCode;
  /** Written to be shown to the person signing up. */
  reason?: string;
}

function refuseSignup(code: SignupRefusalCode, reason: string): SignupDecision {
  return { permitted: false, code, reason };
}

/**
 * Whether this address may begin signing up. No password is involved: the
 * form collects an address and nothing else.
 *
 * `alreadyRegistered` is passed in rather than looked up here so this stays
 * pure. Note what the caller does with a refusal on that ground: see
 * `signupResponseFor` below, which deliberately does not tell the person
 * asking.
 */
export function decideStaffSignup(emailInput: string, alreadyRegistered: boolean): SignupDecision {
  const email = normaliseEmail(emailInput);

  if (email === "" || !email.includes("@")) {
    return refuseSignup("email_missing", "Enter your WSA work email address.");
  }

  const domain = email.split("@")[1] ?? "";
  if (domain !== SIGNUP_ALLOWED_DOMAIN) {
    return refuseSignup(
      "domain_not_permitted",
      `Sign up with your WSA work address, ending @${SIGNUP_ALLOWED_DOMAIN}.`,
    );
  }

  if (alreadyRegistered) {
    return refuseSignup("already_registered", "That address already has a Staff Portal account.");
  }

  return { permitted: true };
}

/**
 * The account a reset is being asked for, as the store holds it.
 * `null` means no account exists for that address.
 */
export interface ExistingAccount {
  authProvider: string;
  isActive: boolean;
}

export type ResetRefusalCode =
  | "email_missing"
  | "domain_not_permitted"
  | "no_account"
  | "not_a_password_account"
  | "account_inactive";

export interface ResetDecision {
  permitted: boolean;
  code?: ResetRefusalCode;
  reason?: string;
}

function refuseReset(code: ResetRefusalCode, reason: string): ResetDecision {
  return { permitted: false, code, reason };
}

/**
 * Whether a password reset link may be sent to this address.
 *
 * A MICROSOFT OR GOOGLE ACCOUNT IS REFUSED, and this is the important line in
 * the function. Those accounts hold no password and are meant to hold none:
 * their sign-in goes through the tenant, where Entra decides about MFA and
 * conditional access, and where Tom can revoke somebody centrally. If the
 * reset route would set a password on one of them, it would quietly mint a
 * second way into that account which none of those controls sit in front of,
 * and the person's own mailbox would be the only thing standing there. So a
 * reset only ever changes a password that already exists.
 */
export function decidePasswordReset(emailInput: string, account: ExistingAccount | null): ResetDecision {
  const email = normaliseEmail(emailInput);

  if (email === "" || !email.includes("@")) {
    return refuseReset("email_missing", "Enter your WSA work email address.");
  }

  const domain = email.split("@")[1] ?? "";
  if (domain !== SIGNUP_ALLOWED_DOMAIN) {
    return refuseReset(
      "domain_not_permitted",
      `Use your WSA work address, ending @${SIGNUP_ALLOWED_DOMAIN}.`,
    );
  }

  if (!account) {
    return refuseReset("no_account", "No account exists for that address.");
  }
  if (!account.isActive) {
    return refuseReset("account_inactive", "That account is not active.");
  }
  if (account.authProvider !== "password") {
    return refuseReset(
      "not_a_password_account",
      "That address signs in with Microsoft or Google, so it has no password to reset.",
    );
  }

  return { permitted: true };
}

/**
 * What the person is actually told, on either route.
 *
 * Deliberately the same words whether the address was accepted, already has
 * an account, has no account, or signs in another way. Otherwise these forms
 * answer "does this person work at WSA" for anybody who cares to ask, one
 * address at a time, and that is a staff directory handed out for free. The
 * reset form would be worse still: it would say which staff use a password
 * and which use Microsoft, which is a map of who to go after.
 *
 * The refusals that are disclosed are the ones the person must see to
 * proceed. A wrong domain is their own input, and telling them is the only
 * way they can fix it.
 */
export const SIGNUP_ACCEPTED_MESSAGE =
  "Check your WSA email. If that address can sign up, a link is on its way, and it works for the next " +
  `${VERIFICATION_TTL_HOURS} hours. Open it to set your password.`;

export const RESET_ACCEPTED_MESSAGE =
  "Check your WSA email. If that address has an account with a password, a link is on its way, and it " +
  `works for the next ${VERIFICATION_TTL_HOURS} hours. Open it to set a new password.`;

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

export function resetResponseFor(decision: ResetDecision): { shown: string; sendEmail: boolean } {
  if (decision.permitted) return { shown: RESET_ACCEPTED_MESSAGE, sendEmail: true };
  if (
    decision.code === "no_account" ||
    decision.code === "not_a_password_account" ||
    decision.code === "account_inactive"
  ) {
    return { shown: RESET_ACCEPTED_MESSAGE, sendEmail: false };
  }
  return { shown: decision.reason ?? "That request could not be completed.", sendEmail: false };
}

/**
 * Whether enough time has passed to email this address again.
 *
 * `lastSentAt` is null when there is no live request. A refusal here never
 * changes what the person is told, only whether an email leaves.
 */
export function mayResend(lastSentAt: Date | null, now: Date = new Date()): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - lastSentAt.getTime() >= RESEND_INTERVAL_MINUTES * 60 * 1000;
}

export type PasswordRefusalCode = "password_too_short" | "password_contains_email";

export interface PasswordDecision {
  permitted: boolean;
  code?: PasswordRefusalCode;
  reason?: string;
}

/**
 * Whether this password may be set, checked at the moment it is chosen.
 *
 * The address is passed in from the link's stored request, not from anything
 * the browser sent, so the local-part rule cannot be sidestepped by claiming
 * a different address on the set-password form.
 */
export function decidePasswordChoice(email: string, password: string): PasswordDecision {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      permitted: false,
      code: "password_too_short",
      reason: `Your password needs at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you will remember works well.`,
    };
  }

  // The local part of somebody's own address is the first thing an attacker
  // tries, and it is the one password guaranteed to be public.
  const localPart = normaliseEmail(email).split("@")[0] ?? "";
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    return {
      permitted: false,
      code: "password_contains_email",
      reason: "Your password cannot contain your email address. Anyone who knows your address would know it.",
    };
  }

  return { permitted: true };
}

export type VerificationRefusalCode = "token_unknown" | "token_expired" | "token_used";

export interface VerificationDecision {
  permitted: boolean;
  code?: VerificationRefusalCode;
  reason?: string;
}

/** A pending link, as the store holds it. The token itself is never stored, only its hash. */
export interface PendingSignup {
  email: string;
  purpose: LinkPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
}

/**
 * Whether this link may still be used.
 *
 * Single use and time limited. A link that has been followed once is spent,
 * so a forwarded or logged URL cannot set a password a second time.
 */
export function decideVerification(
  pending: PendingSignup | null,
  now: Date = new Date(),
): VerificationDecision {
  if (!pending) {
    return { permitted: false, code: "token_unknown", reason: "That link is not valid. Please start again." };
  }
  if (pending.consumedAt !== null) {
    return { permitted: false, code: "token_used", reason: "That link has already been used. Try signing in." };
  }
  if (now.getTime() > pending.expiresAt.getTime()) {
    return { permitted: false, code: "token_expired", reason: "That link has expired. Please start again." };
  }
  return { permitted: true };
}
