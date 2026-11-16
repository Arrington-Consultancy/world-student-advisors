/**
 * Staff Portal authentication.
 *
 * A single shared password (not a per-user account system, unlike the
 * Student Portal) gating internal-only content. The password itself never
 * appears in source: only its bcrypt hash, supplied via the
 * STAFF_PORTAL_PASSWORD_HASH environment variable, is compared against.
 * A correct password mints a short-lived signed JWT that the client stores
 * and sends back to prove the session; there is no way to reach protected
 * content without the server verifying that token.
 */
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

const STAFF_PORTAL_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-staff-portal");
const STAFF_PORTAL_TOKEN_EXPIRY = "12h";

// ─── Simple in-process rate limiter ─────────────────────────────────────────
// Limits login attempts to 10 per IP per minute — this gates a single shared
// password, so brute-force resistance matters more than for a per-account
// login. Mirrors server/portal-google-auth.ts's isRateLimited.
const _rateBuckets = new Map<string, { count: number; resetAt: number }>();
export function isStaffPortalLoginRateLimited(ip: string, windowMs = 60_000, max = 10): boolean {
  const now = Date.now();
  let bucket = _rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    _rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count > max;
}

/**
 * Check a submitted password against STAFF_PORTAL_PASSWORD_HASH and, if it
 * matches, mint a session token. Returns null if the password is wrong, or
 * if the hash isn't configured (never falls back to any default — an unset
 * hash means the Staff Portal is confirmed inaccessible, not open).
 */
export async function authenticateStaffPortal(password: string): Promise<string | null> {
  if (!ENV.staffPortalPasswordHash) return null;
  const valid = await bcrypt.compare(password, ENV.staffPortalPasswordHash);
  if (!valid) return null;

  return new jose.SignJWT({ purpose: "staff_portal" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(STAFF_PORTAL_TOKEN_EXPIRY)
    .sign(STAFF_PORTAL_JWT_SECRET);
}

/** Verify a Staff Portal session token. Never throws. */
export async function verifyStaffPortalToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, STAFF_PORTAL_JWT_SECRET);
    return payload.purpose === "staff_portal";
  } catch {
    return false;
  }
}

/**
 * The gate every protected Staff Portal procedure (worker registry, worker
 * workspaces, connector actions, etc.) must call before doing anything.
 * Throws on a missing, invalid, or expired token so a caller fails closed
 * the same way requireActivePortalIdentity does for the Student Portal —
 * there is no protected staffPortal content yet in Stage 1, but nothing
 * added later may skip this.
 */
export async function requireStaffPortalAuth(token: string): Promise<void> {
  const authenticated = await verifyStaffPortalToken(token);
  if (!authenticated) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to the Staff Portal to use this tool." });
  }
}
