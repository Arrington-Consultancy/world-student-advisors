import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { portalUsers } from "../drizzle/schema";
import { ENV } from "./_core/env";
import * as jose from "jose";
import crypto from "crypto";

const PORTAL_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-portal");
const PORTAL_TOKEN_EXPIRY = "7d";

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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db.select().from(portalUsers).where(eq(portalUsers.email, data.email.toLowerCase())).limit(1);
  if (existing.length > 0) {
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

  // Create JWT
  const token = await new jose.SignJWT({
    portalUserId: portalUser.id,
    email: portalUser.email,
    firstName: portalUser.firstName,
    lastName: portalUser.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(PORTAL_TOKEN_EXPIRY)
    .sign(PORTAL_JWT_SECRET);

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
