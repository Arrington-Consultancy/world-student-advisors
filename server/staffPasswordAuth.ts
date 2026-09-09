/**
 * Staff signup and sign-in with a work email address and a password.
 *
 * The third route into the Staff Portal, added 9 September 2026 on Tom
 * Arrington's instruction. Microsoft and Google are untouched; this is
 * additive, and staff choose between the three.
 *
 * THE FLOW, and why it is in this order.
 *
 *   1. Somebody submits a work address and a password. decideStaffSignup
 *      checks the domain and the password; nothing is written unless both
 *      pass.
 *   2. A pending signup is stored with the password already hashed and the
 *      verification token stored ONLY as a hash. The plain token goes into
 *      the email and nowhere else.
 *   3. Following the link proves they can read that mailbox. Only then does
 *      a staff_users row exist.
 *
 * Steps 1 and 3 are two halves of one control. The domain says which
 * addresses may ever sign up; the link proves this person holds the one they
 * typed. Either alone is not enough, and step 1 alone would let anybody who
 * knows WSA's email format create a staff account.
 *
 * WHAT AN ACCOUNT GETS. Nothing. A verified staff member has no access
 * assignment, exactly like a Microsoft or Google one, and every worker
 * declines until Tom assigns scopes. This module establishes who somebody
 * is; it never decides what they may reach.
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
  decideVerification,
  signupResponseFor,
  VERIFICATION_TTL_HOURS,
  type PendingSignup,
} from "../shared/staffSignup";
import { sendGraphMail } from "./_core/graphMail";
import { mintStaffIdentityToken } from "./staffIdentityAuth";
import { ENV } from "./_core/env";

const PASSWORD_ROUNDS = 12;
const TOKEN_ROUNDS = 10;

/**
 * A real bcrypt hash of a value nobody knows, compared against when an
 * account does not exist so that the work done is the same either way.
 * Generated once at module load.
 */
const DECOY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), PASSWORD_ROUNDS);

function verificationLink(token: string): string {
  const base = ENV.staffSsoRedirectUri || "https://www.worldstudentadvisors.com/staff-portal";
  return `${base}?verify=${encodeURIComponent(token)}`;
}

export interface SignupOutcome {
  /** Always shown to the person. Identical for success and already-registered. */
  message: string;
}

/**
 * Begin a signup. Returns the same message whether the address was accepted
 * or already has an account, so the form cannot be used to enumerate staff.
 */
export async function beginStaffSignup(emailInput: string, password: string): Promise<SignupOutcome> {
  const db = await getDb();
  if (!db) return { message: "Signup is unavailable at the moment. Please try again shortly." };

  const email = normaliseEmail(emailInput);

  const existing = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  const decision = decideStaffSignup(emailInput, password, existing.length > 0);
  const response = signupResponseFor(decision);

  if (!response.sendEmail) return { message: response.shown };

  const token = crypto.randomBytes(32).toString("hex");
  const [passwordHash, verificationTokenHash] = await Promise.all([
    bcrypt.hash(password, PASSWORD_ROUNDS),
    bcrypt.hash(token, TOKEN_ROUNDS),
  ]);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  // A second attempt replaces the first, so somebody who mistypes and starts
  // again does not end up with two live links.
  const pending = await db
    .select()
    .from(staffSignupRequests)
    .where(eq(staffSignupRequests.email, email))
    .limit(1);

  if (pending[0]) {
    await db
      .update(staffSignupRequests)
      .set({ passwordHash, verificationTokenHash, expiresAt, consumedAt: null, createdAt: new Date() })
      .where(eq(staffSignupRequests.id, pending[0].id));
  } else {
    await db.insert(staffSignupRequests).values({ email, passwordHash, verificationTokenHash, expiresAt });
  }

  // sendGraphMail takes plain text and never throws: it returns false when
  // Graph is unconfigured. The signup is still recorded either way, so a mail
  // outage does not lose somebody's chosen password, and they can ask for a
  // fresh link by signing up again.
  await sendGraphMail({
    to: [email],
    subject: "Confirm your WSA Staff Portal account",
    text:
      "Somebody asked to create a WSA Staff Portal account for this address.\n\n" +
      `Confirm your account: ${verificationLink(token)}\n\n` +
      `The link works for the next ${VERIFICATION_TTL_HOURS} hours and can be used once.\n\n` +
      "If this was not you, ignore this email. No account is created unless the link is followed.",
  });

  return { message: response.shown };
}

export interface VerificationOutcome {
  verified: boolean;
  /** A Staff Portal session token, present only when verified. */
  token?: string;
  reason?: string;
}

/**
 * Complete a signup from the emailed link.
 *
 * The token is matched by comparing against stored hashes rather than looked
 * up directly, because only the hash is stored. Consuming the row and
 * creating the account happen together, so a link cannot be followed twice.
 */
export async function completeStaffSignup(token: string): Promise<VerificationOutcome> {
  const db = await getDb();
  if (!db) return { verified: false, reason: "Verification is unavailable at the moment." };
  if (!token) return { verified: false, reason: "That link is not valid. Please sign up again." };

  const candidates = await db
    .select()
    .from(staffSignupRequests)
    .where(isNull(staffSignupRequests.consumedAt));

  let matched: (typeof candidates)[number] | null = null;
  for (const row of candidates) {
    if (await bcrypt.compare(token, row.verificationTokenHash)) {
      matched = row;
      break;
    }
  }

  const pending: PendingSignup | null = matched
    ? { email: matched.email, expiresAt: matched.expiresAt, consumedAt: matched.consumedAt ?? null }
    : null;
  const decision = decideVerification(pending);
  if (!decision.permitted || !matched) {
    return { verified: false, reason: decision.reason ?? "That link is not valid." };
  }

  // Spend the link first. If anything below fails, the link is still spent,
  // which is the safe direction: a person can sign up again, and a replayed
  // link cannot create a second account.
  await db
    .update(staffSignupRequests)
    .set({ consumedAt: new Date() })
    .where(eq(staffSignupRequests.id, matched.id));

  const already = await db.select().from(staffUsers).where(eq(staffUsers.email, matched.email)).limit(1);
  if (already[0]) {
    // Somebody signed up twice, or by two routes. One person, one row.
    return { verified: true, token: await mintStaffIdentityToken(already[0]) };
  }

  const inserted = await db.insert(staffUsers).values({
    authProvider: "password",
    email: matched.email,
    displayName: matched.email.split("@")[0],
    passwordHash: matched.passwordHash,
    lastLoginAt: new Date(),
  });
  const insertId = (inserted as unknown as [{ insertId: number }])[0].insertId;
  const created = await db.select().from(staffUsers).where(eq(staffUsers.id, insertId)).limit(1);
  return { verified: true, token: await mintStaffIdentityToken(created[0]) };
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
