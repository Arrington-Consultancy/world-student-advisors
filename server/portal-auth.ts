import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { portalUsers } from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as jose from "jose";
import crypto from "crypto";

const PORTAL_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-portal");
const PORTAL_TOKEN_EXPIRY = "7d";
const SIGNUP_PREFILL_EXPIRY = "15m";

/**
 * Create a portal user record after registration form submission.
 * Called from the registration flow after Pipedrive record is created.
 */
export async function createPortalUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  pipedrivePersonId: number;
  /** "lead" for everything created going forward — see the doc comment on
   * drizzle/schema.ts's portalUsers.pipedriveObjectType. Write-once audit
   * trail only; live portal resolution never reads this back. */
  pipedriveObjectType: "lead" | "deal";
  pipedriveObjectId: string;
  /** When the student signed up via Google, link their sub so they can use Google portal login immediately. */
  googleSub?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db.select().from(portalUsers).where(eq(portalUsers.email, data.email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    // Link the Google sub if this is a Google-verified registration and it isn't linked yet
    if (data.googleSub && !existing[0].googleSub) {
      await db.update(portalUsers).set({ googleSub: data.googleSub }).where(eq(portalUsers.id, existing[0].id));
    }
    // User already registered - generate a new password reset token
    const token = await generateResetToken(data.email.toLowerCase());
    return { userId: existing[0].id, token, isExisting: true };
  }

  // Create new portal user (no password yet - they'll set it via the link)
  const result = await db.insert(portalUsers).values({
    email: data.email.toLowerCase(),
    firstName: data.firstName,
    lastName: data.lastName,
    pipedrivePersonId: data.pipedrivePersonId,
    pipedriveObjectType: data.pipedriveObjectType,
    pipedriveObjectId: data.pipedriveObjectId,
    ...(data.googleSub ? { googleSub: data.googleSub } : {}),
  });

  const userId = result[0].insertId;

  // Generate password creation token
  const token = await generateResetToken(data.email.toLowerCase());

  return { userId, token, isExisting: false };
}

/**
 * Generate a secure token for password creation/reset
 */
export async function generateResetToken(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db
    .update(portalUsers)
    .set({ resetToken: hashedToken, resetTokenExpiry: expiry })
    .where(eq(portalUsers.email, email));

  return token;
}

/**
 * Verify a reset/creation token and set the password
 */
export async function setPasswordWithToken(email: string, token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const user = await db.select().from(portalUsers).where(eq(portalUsers.email, email.toLowerCase())).limit(1);
  if (!user.length) return false;

  const portalUser = user[0];
  if (!portalUser.resetToken || !portalUser.resetTokenExpiry) return false;
  if (new Date() > portalUser.resetTokenExpiry) return false;

  const tokenValid = await bcrypt.compare(token, portalUser.resetToken);
  if (!tokenValid) return false;

  // Hash the new password and save
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(portalUsers)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(portalUsers.email, email.toLowerCase()));

  return true;
}

/**
 * Authenticate a portal user with email + password
 */
export async function authenticatePortalUser(
  email: string,
  password: string
): Promise<{ token: string; user: { id: number; email: string; firstName: string; lastName: string } } | null> {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select().from(portalUsers).where(eq(portalUsers.email, email.toLowerCase())).limit(1);
  if (!user.length) return null;

  const portalUser = user[0];
  if (!portalUser.passwordHash) return null;
  if (!portalUser.isActive) return null;

  const valid = await bcrypt.compare(password, portalUser.passwordHash);
  if (!valid) return null;

  // Update last login
  await db.update(portalUsers).set({ lastLogin: new Date() }).where(eq(portalUsers.id, portalUser.id));

  const token = await mintPortalToken(portalUser);

  return {
    token,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      firstName: portalUser.firstName,
      lastName: portalUser.lastName,
    },
  };
}

/**
 * Verify a portal JWT token
 */
export async function verifyPortalToken(
  token: string
): Promise<{ portalUserId: number; email: string; firstName: string; lastName: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, PORTAL_JWT_SECRET);
    return payload as any;
  } catch {
    return null;
  }
}

/**
 * Mint a signed portal JWT for a given user row.
 * Shared by password login and the Google OAuth callback.
 */
export async function mintPortalToken(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  return new jose.SignJWT({
    portalUserId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(PORTAL_TOKEN_EXPIRY)
    .sign(PORTAL_JWT_SECRET);
}

export type FindGoogleUserResult =
  | { status: "ok"; token: string; user: { id: number; email: string; firstName: string; lastName: string } }
  | { status: "not_found" }
  | { status: "db_unavailable" };

/**
 * Look up a portal user by their Google OAuth subject identifier for portal
 * login. Never creates a new portal user — that is only permitted via
 * createPortalUser() in the registration flow.
 *
 * Resolution order:
 * 1. Match by googleSub → log in.
 * 2. No googleSub match + emailVerified=true → match by email, link the sub, log in.
 * 3. No match → return { status: "not_found" } without creating any record.
 */
export async function findGoogleUserForLogin(
  profile: { sub: string; email: string; firstName: string; lastName: string },
  emailVerified: boolean,
): Promise<FindGoogleUserResult> {
  const db = await getDb();
  if (!db) return { status: "db_unavailable" };

  const emailLower = profile.email.toLowerCase();

  // Try by googleSub first (fastest path for returning users)
  let rows = await db.select().from(portalUsers).where(eq(portalUsers.googleSub, profile.sub)).limit(1);

  if (!rows.length) {
    if (emailVerified) {
      // Fall back to email — link an existing password account
      rows = await db.select().from(portalUsers).where(eq(portalUsers.email, emailLower)).limit(1);

      if (rows.length) {
        // Link the Google sub to the existing account
        await db.update(portalUsers).set({ googleSub: profile.sub }).where(eq(portalUsers.id, rows[0].id));
      }
    }
  }

  if (!rows.length) return { status: "not_found" };

  const portalUser = rows[0];
  if (!portalUser.isActive) return { status: "not_found" };

  await db.update(portalUsers).set({ lastLogin: new Date() }).where(eq(portalUsers.id, portalUser.id));

  const token = await mintPortalToken(portalUser);
  return {
    status: "ok",
    token,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      firstName: portalUser.firstName,
      lastName: portalUser.lastName,
    },
  };
}

/**
 * Request password reset - generates token for existing user. Returns null
 * for both "no database" and "no such account" so the caller can give an
 * identical anti-enumeration response either way.
 */
export async function requestPasswordReset(email: string): Promise<{ token: string; firstName: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select().from(portalUsers).where(eq(portalUsers.email, email.toLowerCase())).limit(1);
  if (!user.length) return null;

  const token = await generateResetToken(email.toLowerCase());
  return { token, firstName: user[0].firstName };
}

/**
 * Look up a portal user by their numeric id (the JWT's portalUserId claim)
 * for use by portal.dashboard — returns the durable pipedrivePersonId
 * anchor plus display name, or null if the account is missing/deactivated
 * or the database is unavailable. Never throws.
 */
export async function getPortalUserById(
  id: number
): Promise<{ firstName: string; pipedrivePersonId: number | null } | null> {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select().from(portalUsers).where(eq(portalUsers.id, id)).limit(1);
  if (!user.length || !user[0].isActive) return null;

  return { firstName: user[0].firstName, pipedrivePersonId: user[0].pipedrivePersonId };
}

/**
 * Mint a short-lived JWT (15 min) that encodes verified Google identity claims
 * for the sign-up pre-fill flow. The token is passed back to /contact via the
 * OAuth callback redirect, decoded client-side for display, and verified
 * server-side inside submitStudent to enforce the locked name/email values
 * and link the googleSub to the resulting portal account.
 *
 * The `purpose` claim prevents reuse as a portal session token.
 */
export async function mintSignupPrefillToken(profile: {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  return new jose.SignJWT({
    purpose: "signup_prefill" as const,
    sub: profile.sub,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(SIGNUP_PREFILL_EXPIRY)
    .sign(PORTAL_JWT_SECRET);
}

/**
 * Verify a signup prefill token and return its claims, or null if the token is
 * missing, expired, or not a signup_prefill token. Never throws.
 */
export async function verifySignupPrefillToken(
  token: string,
): Promise<{ sub: string; email: string; firstName: string; lastName: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, PORTAL_JWT_SECRET);
    if (payload.purpose !== "signup_prefill") return null;
    const { sub, email, firstName, lastName } = payload as Record<string, unknown>;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return {
      sub,
      email,
      firstName: typeof firstName === "string" ? firstName : "",
      lastName: typeof lastName === "string" ? lastName : "",
    };
  } catch {
    return null;
  }
}
