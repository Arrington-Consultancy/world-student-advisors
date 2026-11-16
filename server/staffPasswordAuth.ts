/**
 * Staff signup, password reset and password sign-in.
 *
 * The third route into the Staff Portal, added 9 September 2026 on Tom
 * Arrington's instruction. Microsoft and Google are untouched; this is
 * additive, and staff choose between the three.
 *
 * THE FLOW, and why it is in this order.
 *
 *   1. Somebody submits a work address. Nothing else. decideStaffSignup
 *      checks the domain; nothing is written unless it passes.
 *   2. A pending request is stored with the link's token held ONLY as a
 *      hash. The plain token goes into the email and nowhere else.
 *   3. Following the link proves they can read that mailbox. The page it
 *      opens is where they choose a password, and only then does a
 *      staff_users row exist.
 *
 * THE PASSWORD IS CHOSEN AT STEP 3, NOT STEP 1. An earlier version took it on
 * the form, which let whoever filled the form choose the password for an
 * address they did not own. Now the only person who ever chooses it is the
 * one who can open the mailbox.
 *
 * Steps 1 and 3 are two halves of one control. The domain says which
 * addresses may ever hold an account; the link proves this person holds the
 * one they typed. Step 1 alone would let anybody who knows WSA's email format
 * create a staff account.
 *
 * RESET IS THE SAME MECHANISM. Prove you can read the mailbox, then set a
 * password. It differs only in which starting state it permits, and it
 * refuses any account that signs in with Microsoft or Google, so it can never
 * mint a password route around the tenant's own controls.
 *
 * WHAT AN ACCOUNT GETS. Nothing. A verified staff member has no access
 * assignment, exactly like a Microsoft or Google one, and every worker
 * declines until Tom assigns scopes. This module establishes who somebody is;
 * it never decides what they may reach.
 *
 * TIMING. Sign-in compares against a bcrypt hash whether or not the account
 * exists, so a wrong address and a wrong password take the same time. Without
 * that, the response time answers "does this person work at WSA" for anybody
 * who cares to measure it.
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { staffUsers, staffSignupRequests, type StaffUser } from "../drizzle/schema";
import { normaliseEmail } from "../shared/staffSignIn";
import {
  decideStaffSignup,
  decidePasswordReset,
  decidePasswordChoice,
  decideVerification,
  signupResponseFor,
  resetResponseFor,
  mayResend,
  VERIFICATION_TTL_HOURS,
  type LinkPurpose,
  type PendingSignup,
} from "../shared/staffSignup";
import { sendGraphMail } from "./_core/graphMail";
import { mintStaffIdentityToken } from "./staffIdentityAuth";
import { endSessionsFor } from "./access/sessionRevocation";
import { ENV } from "./_core/env";

const PASSWORD_ROUNDS = 12;
const TOKEN_ROUNDS = 10;

/**
 * A real bcrypt hash of a value nobody knows, compared against when an
 * account does not exist so that the work done is the same either way.
 * Generated once at module load.
 */
const DECOY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), PASSWORD_ROUNDS);

function portalBase(): string {
  return ENV.staffSsoRedirectUri || "https://www.worldstudentadvisors.com/staff-portal";
}

function verificationLink(token: string): string {
  return `${portalBase()}?verify=${encodeURIComponent(token)}`;
}

export interface SignupOutcome {
  /** Always shown to the person. Identical whatever the underlying decision was. */
  message: string;
}

/**
 * Store a pending request and email its link.
 *
 * Shared by both routes because they differ only in the wording of the email
 * and in which starting state was permitted. A second attempt replaces the
 * first, so somebody who asks twice does not end up with two live links, and
 * the throttle stops the form being used to bomb a colleague's inbox.
 */
async function issueLink(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  email: string,
  purpose: LinkPurpose,
): Promise<void> {
  const existing = await db
    .select()
    .from(staffSignupRequests)
    .where(eq(staffSignupRequests.email, email))
    .limit(1);

  // Only a live, unspent request holds the throttle. A spent or expired one
  // must not stop somebody asking again.
  const live =
    existing[0] && existing[0].consumedAt === null && existing[0].expiresAt.getTime() > Date.now()
      ? existing[0]
      : null;
  if (live && !mayResend(live.createdAt)) return;

  const token = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = await bcrypt.hash(token, TOKEN_ROUNDS);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  if (existing[0]) {
    await db
      .update(staffSignupRequests)
      .set({ verificationTokenHash, purpose, expiresAt, consumedAt: null, createdAt: new Date() })
      .where(eq(staffSignupRequests.id, existing[0].id));
  } else {
    await db.insert(staffSignupRequests).values({ email, verificationTokenHash, purpose, expiresAt });
  }

  const link = verificationLink(token);
  const body =
    purpose === "signup"
      ? "Somebody asked to create a WSA Staff Portal account for this address.\n\n" +
        `Set your password and finish setting up: ${link}\n\n` +
        `The link works for the next ${VERIFICATION_TTL_HOURS} hours and can be used once.\n\n` +
        "If this was not you, ignore this email. No account is created unless the link is followed."
      : "Somebody asked to reset the WSA Staff Portal password for this address.\n\n" +
        `Set a new password: ${link}\n\n` +
        `The link works for the next ${VERIFICATION_TTL_HOURS} hours and can be used once.\n\n` +
        "If this was not you, ignore this email. Your current password still works and nothing has changed.";

  // sendGraphMail takes plain text and never throws: it returns false when
  // Graph is unconfigured. The request is recorded either way, so a mail
  // outage does not strand anybody, and they can ask for a fresh link.
  await sendGraphMail({
    to: [email],
    subject: purpose === "signup" ? "Set up your WSA Staff Portal account" : "Reset your WSA Staff Portal password",
    text: body,
  });
}

/**
 * Send the email that is not a link.
 *
 * These go to somebody who asked for something they cannot have on an
 * address they do demonstrably hold: they already have an account, or their
 * account signs in through Microsoft or Google. Telling them on screen would
 * answer "does this person work at WSA" for anybody who asked. Telling them
 * in their own inbox tells only them.
 */
async function sendAdvisoryMail(email: string, kind: "already_has_account" | "signs_in_with_sso"): Promise<void> {
  const signIn = portalBase();

  const [subject, text] =
    kind === "already_has_account"
      ? [
          "You already have a WSA Staff Portal account",
          "Somebody asked to create a WSA Staff Portal account for this address, and one " +
            "already exists.\n\n" +
            `Sign in here: ${signIn}\n\n` +
            "Use the same button you used before, Microsoft, Google or a password. If you " +
            "have a password and cannot remember it, use the Forgotten your password link on " +
            "that page.\n\n" +
            "If this was not you, nothing has changed and your account is untouched.",
        ]
      : [
          "Your WSA Staff Portal account signs in with Microsoft or Google",
          "Somebody asked to reset a WSA Staff Portal password for this address.\n\n" +
            "There is no password to reset. This account signs in with Microsoft or Google " +
            "instead, so use that button rather than the password box.\n\n" +
            `Sign in here: ${signIn}\n\n` +
            "If this was not you, nothing has changed and your account is untouched.",
        ];

  await sendGraphMail({ to: [email], subject, text });
}

/**
 * Begin a signup. Returns the same message whether the address was accepted
 * or already has an account, so the form cannot be used to enumerate staff.
 */
export async function beginStaffSignup(emailInput: string): Promise<SignupOutcome> {
  const db = await getDb();
  if (!db) return { message: "Signup is unavailable at the moment. Please try again shortly." };

  const email = normaliseEmail(emailInput);
  const existing = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  const response = signupResponseFor(decideStaffSignup(emailInput, existing.length > 0));

  if (response.email === "link") await issueLink(db, email, "signup");
  else if (response.email === "already_has_account") await sendAdvisoryMail(email, "already_has_account");
  return { message: response.shown };
}

/**
 * Begin a password reset. Same message for every outcome, so this form says
 * nothing about who works here or which of them uses a password.
 */
export async function beginPasswordReset(emailInput: string): Promise<SignupOutcome> {
  const db = await getDb();
  if (!db) return { message: "Password reset is unavailable at the moment. Please try again shortly." };

  const email = normaliseEmail(emailInput);
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  const user = rows[0] as StaffUser | undefined;
  const decision = decidePasswordReset(
    emailInput,
    user ? { authProvider: user.authProvider, isActive: user.isActive === 1 } : null,
  );
  const response = resetResponseFor(decision);

  if (response.email === "link") await issueLink(db, email, "reset");
  else if (response.email === "signs_in_with_sso") await sendAdvisoryMail(email, "signs_in_with_sso");
  return { message: response.shown };
}

export interface LinkCheck {
  valid: boolean;
  /** What the page should offer: setting a first password, or replacing one. */
  purpose?: LinkPurpose;
  /** Shown so the person can see which address they are setting a password for. */
  email?: string;
  reason?: string;
}

/**
 * Find the pending request a token belongs to.
 *
 * Matched by comparing against stored hashes rather than looked up directly,
 * because only the hash is stored.
 */
async function findPending(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  token: string,
): Promise<{ id: number; email: string; purpose: LinkPurpose; expiresAt: Date; consumedAt: Date | null } | null> {
  const candidates = await db
    .select()
    .from(staffSignupRequests)
    .where(isNull(staffSignupRequests.consumedAt));

  for (const row of candidates) {
    if (await bcrypt.compare(token, row.verificationTokenHash)) {
      return {
        id: row.id,
        email: row.email,
        purpose: row.purpose === "reset" ? "reset" : "signup",
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt ?? null,
      };
    }
  }
  return null;
}

/**
 * Check a link without spending it, so the page can show a password form
 * rather than an error after the person has typed one in.
 *
 * This reads and never writes. The link is spent by setPasswordFromLink.
 */
export async function checkSignupLink(token: string): Promise<LinkCheck> {
  const db = await getDb();
  if (!db) return { valid: false, reason: "That link cannot be checked at the moment." };
  if (!token) return { valid: false, reason: "That link is not valid. Please start again." };

  const matched = await findPending(db, token);
  const pending: PendingSignup | null = matched
    ? { email: matched.email, purpose: matched.purpose, expiresAt: matched.expiresAt, consumedAt: matched.consumedAt }
    : null;
  const decision = decideVerification(pending);
  if (!decision.permitted || !matched) {
    return { valid: false, reason: decision.reason ?? "That link is not valid." };
  }
  return { valid: true, purpose: matched.purpose, email: matched.email };
}

export interface SetPasswordOutcome {
  ok: boolean;
  /** A Staff Portal session token, present only on success. */
  token?: string;
  reason?: string;
}

/**
 * Set a password from an emailed link, creating the account on a signup link
 * and replacing the password on a reset link.
 *
 * The password is checked BEFORE the link is spent. Otherwise somebody who
 * typed a password that was too short would burn their only link and have to
 * start again, which is a bad experience with no security benefit: the link
 * has not been used to change anything.
 *
 * The link is then spent BEFORE the write. If anything below fails, the link
 * is still spent, which is the safe direction: a person can ask for another,
 * and a replayed link cannot set a second password.
 */
export async function setPasswordFromLink(token: string, password: string): Promise<SetPasswordOutcome> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "That link cannot be completed at the moment." };
  if (!token) return { ok: false, reason: "That link is not valid. Please start again." };

  const matched = await findPending(db, token);
  const pending: PendingSignup | null = matched
    ? { email: matched.email, purpose: matched.purpose, expiresAt: matched.expiresAt, consumedAt: matched.consumedAt }
    : null;
  const linkDecision = decideVerification(pending);
  if (!linkDecision.permitted || !matched) {
    return { ok: false, reason: linkDecision.reason ?? "That link is not valid." };
  }

  // The address comes from the stored request, never from the browser, so
  // the rule about a password containing your own address cannot be dodged
  // by claiming a different one on the form.
  const passwordDecision = decidePasswordChoice(matched.email, password);
  if (!passwordDecision.permitted) {
    return { ok: false, reason: passwordDecision.reason };
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);

  await db
    .update(staffSignupRequests)
    .set({ consumedAt: new Date() })
    .where(eq(staffSignupRequests.id, matched.id));

  const existing = await db.select().from(staffUsers).where(eq(staffUsers.email, matched.email)).limit(1);
  const user = existing[0] as StaffUser | undefined;

  if (matched.purpose === "reset") {
    // Re-checked at the moment of the write, not only when the link was
    // issued. An account could have been deactivated, or switched to
    // Microsoft, in the 24 hours a link stays live.
    if (!user || user.isActive !== 1 || user.authProvider !== "password") {
      return { ok: false, reason: "That link is no longer valid for this account." };
    }
    await db
      .update(staffUsers)
      .set({ passwordHash, lastLoginAt: new Date() })
      .where(eq(staffUsers.id, user.id));

    // Every session opened under the old password dies now. The usual reason
    // to reset is that somebody else might know the old one, so leaving those
    // sessions running would defeat the point of resetting.
    await endSessionsFor(user.id, "password_reset");

    // Read back AFTER the bump, so the token this person is handed carries
    // the new version. Minting before it would hand them a session the very
    // next request rejects.
    const refreshed = await db.select().from(staffUsers).where(eq(staffUsers.id, user.id)).limit(1);
    return { ok: true, token: await mintStaffIdentityToken(refreshed[0]) };
  }

  if (user) {
    // Somebody signed up twice, or by two routes, between the link being
    // issued and followed. One person, one row: the existing account stands
    // and this link does not overwrite its password.
    return { ok: false, reason: "That address already has an account. Please sign in." };
  }

  const inserted = await db.insert(staffUsers).values({
    authProvider: "password",
    email: matched.email,
    displayName: matched.email.split("@")[0],
    passwordHash,
    lastLoginAt: new Date(),
  });
  const insertId = (inserted as unknown as [{ insertId: number }])[0].insertId;
  const created = await db.select().from(staffUsers).where(eq(staffUsers.id, insertId)).limit(1);
  return { ok: true, token: await mintStaffIdentityToken(created[0]) };
}

/**
 * Sign in with a work address and password.
 *
 * One message for every failure, and the same bcrypt work whether or not the
 * account exists, so neither the wording nor the timing says whether an
 * address belongs to a member of staff.
 */
export async function signInWithPassword(
  emailInput: string,
  password: string,
): Promise<{ token: string } | { error: string }> {
  const failure = { error: "That email address and password do not match an account." };

  const db = await getDb();
  if (!db) return { error: "Sign-in is unavailable at the moment. Please try again shortly." };

  const email = normaliseEmail(emailInput);
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  const user = rows[0] as StaffUser | undefined;

  // Compare against a decoy when there is no account, or when the account
  // exists but holds no password, so every path does the same work.
  const hash = user?.passwordHash ?? DECOY_HASH;
  const matches = await bcrypt.compare(password, hash);

  if (!user || !user.passwordHash || !matches) return failure;
  if (user.isActive !== 1) return failure;
  // A Microsoft or Google account has no password and cannot be signed into
  // this way, even if a hash were somehow present.
  if (user.authProvider !== "password") return failure;

  await db.update(staffUsers).set({ lastLoginAt: new Date() }).where(eq(staffUsers.id, user.id));
  return { token: await mintStaffIdentityToken(user) };
}
