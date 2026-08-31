/**
 * Individual Staff Portal identity via Microsoft Entra ID.
 *
 * WSA's own Digital Workspace Programme master plan (Programme Sponsor:
 * Timothy J. Hunt, Managing Director) states a controlled design
 * principle: "Use Microsoft security rather than separate passwords."
 * Its architecture diagram is Microsoft 365-native throughout (SharePoint,
 * Teams, Outlook, OneDrive). That is the evidence behind choosing Entra ID
 * here rather than inventing a second username/password system — this
 * module exists to retire the shared Staff Portal password
 * (staffPortalAuth.ts), not to run alongside it indefinitely.
 *
 * Standard OIDC Authorization Code flow: an authorize URL sends the staff
 * member to Microsoft, Microsoft returns a code, this exchanges it for a
 * signed ID token, verifies that token's signature against Microsoft's own
 * published keys (never trusts an unverified token), restricts sign-in to
 * the @worldstudentadvisors.com domain as a second check beyond whatever
 * the Entra tenant itself restricts, and finds-or-creates a staff_users
 * row keyed on Entra's stable object ID — never the mutable email/UPN.
 */
import * as jose from "jose";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { staffUsers, type StaffUser } from "../drizzle/schema";

const ALLOWED_EMAIL_DOMAIN = "worldstudentadvisors.com";
const STAFF_IDENTITY_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-staff-identity");
const STAFF_IDENTITY_TOKEN_EXPIRY = "12h";

export function isMicrosoftSsoConfigured(): boolean {
  return Boolean(ENV.staffSsoTenantId && ENV.staffSsoClientId && ENV.staffSsoClientSecret && ENV.staffSsoRedirectUri);
}

/** Builds the Microsoft authorize URL. state and nonce must be generated and stored (e.g. in a short-lived cookie) by the caller and checked on return. */
export function buildMicrosoftAuthorizeUrl(state: string, nonce: string): string {
  if (!isMicrosoftSsoConfigured()) {
    throw new Error("Microsoft SSO is not configured. STAFF_SSO_TENANT_ID, CLIENT_ID, CLIENT_SECRET and REDIRECT_URI are not all set.");
  }
  const params = new URLSearchParams({
    client_id: ENV.staffSsoClientId,
    response_type: "code",
    redirect_uri: ENV.staffSsoRedirectUri,
    response_mode: "query",
    scope: "openid profile email",
    state,
    nonce,
  });
  return `https://login.microsoftonline.com/${ENV.staffSsoTenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function exchangeCodeForIdToken(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: ENV.staffSsoClientId,
    client_secret: ENV.staffSsoClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.staffSsoRedirectUri,
  });
  const res = await fetch(`https://login.microsoftonline.com/${ENV.staffSsoTenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Microsoft token exchange failed (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("Microsoft token response had no id_token.");
  return json.id_token;
}

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
function getMicrosoftJwks() {
  if (!cachedJwks) {
    cachedJwks = jose.createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${ENV.staffSsoTenantId}/discovery/v2.0/keys`));
  }
  return cachedJwks;
}

export interface VerifiedMicrosoftClaims {
  oid: string;
  email: string;
  displayName: string;
}

/**
 * Verifies a Microsoft-issued ID token's signature against Microsoft's own
 * published JWKS, checks issuer/audience, checks the nonce matches what
 * this server issued (replay protection), and enforces the WSA email
 * domain. `jwks` defaults to the real remote Microsoft key set and is only
 * ever overridden in tests using a local key set built from a test
 * keypair — production code never supplies a different one.
 */
export async function verifyMicrosoftIdToken(
  idToken: string,
  expectedNonce: string,
  jwks: Parameters<typeof jose.jwtVerify>[1] = getMicrosoftJwks(),
): Promise<VerifiedMicrosoftClaims> {
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: `https://login.microsoftonline.com/${ENV.staffSsoTenantId}/v2.0`,
    audience: ENV.staffSsoClientId,
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error("Nonce mismatch on Microsoft sign-in. Possible replay, rejecting.");
  }
  const oid = payload.oid;
  if (typeof oid !== "string" || !oid) {
    throw new Error("Microsoft ID token had no oid (object id) claim.");
  }
  const email = (typeof payload.email === "string" && payload.email) || (typeof payload.preferred_username === "string" && payload.preferred_username) || "";
  if (!email) {
    throw new Error("Microsoft ID token had no email or preferred_username claim.");
  }
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain !== ALLOWED_EMAIL_DOMAIN) {
    throw new Error(`Sign-in is restricted to @${ALLOWED_EMAIL_DOMAIN} accounts.`);
  }
  const displayName = (typeof payload.name === "string" && payload.name) || email;

  return { oid, email: email.toLowerCase(), displayName };
}

/** Finds or creates the staff_users row for these verified claims, and stamps lastLoginAt. Never trusts anything except the already-verified claims. */
export async function upsertStaffUserFromClaims(claims: VerifiedMicrosoftClaims): Promise<StaffUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available, so staff identity cannot be resolved.");

  const existing = await db.select().from(staffUsers).where(eq(staffUsers.entraObjectId, claims.oid)).limit(1);
  if (existing.length > 0) {
    const current = existing[0];
    await db
      .update(staffUsers)
      .set({ email: claims.email, displayName: claims.displayName, lastLoginAt: new Date() })
      .where(eq(staffUsers.id, current.id));
    return { ...current, email: claims.email, displayName: claims.displayName };
  }

  const inserted = await db.insert(staffUsers).values({
    entraObjectId: claims.oid,
    email: claims.email,
    displayName: claims.displayName,
    lastLoginAt: new Date(),
  });
  const insertId = (inserted as unknown as [{ insertId: number }])[0].insertId;
  const created = await db.select().from(staffUsers).where(eq(staffUsers.id, insertId)).limit(1);
  return created[0];
}

/** The full sign-in flow: code -> verified claims -> resolved staff_users row -> signed WSA session token. */
export async function completeMicrosoftSignIn(code: string, expectedNonce: string): Promise<string> {
  const idToken = await exchangeCodeForIdToken(code);
  const claims = await verifyMicrosoftIdToken(idToken, expectedNonce);
  const staffUser = await upsertStaffUserFromClaims(claims);
  return mintStaffIdentityToken(staffUser);
}

// ─── Stateless sign-in transaction (the OAuth `state` parameter IS the token) ──
// No server-side session storage is needed: the nonce is embedded in a
// short-lived signed JWT that this server hands to the browser as `state`
// and Microsoft echoes back verbatim in the callback query string. Only
// this server's secret can have produced a valid one, so it also serves as
// CSRF protection for the redirect itself.
const SSO_TRANSACTION_SECRET = new TextEncoder().encode(ENV.cookieSecret + "-staff-sso-transaction");

async function issueSsoTransactionToken(): Promise<{ token: string; nonce: string }> {
  const nonce = crypto.randomUUID();
  const token = await new jose.SignJWT({ purpose: "sso_transaction" as const, nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(SSO_TRANSACTION_SECRET);
  return { token, nonce };
}

async function verifySsoTransactionToken(token: string): Promise<{ nonce: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SSO_TRANSACTION_SECRET);
    if (payload.purpose !== "sso_transaction" || typeof payload.nonce !== "string") return null;
    return { nonce: payload.nonce };
  } catch {
    return null;
  }
}

/** What the client needs to start Microsoft sign-in: just the URL to redirect to. */
export async function buildMicrosoftSignInRequest(): Promise<{ authorizeUrl: string }> {
  const { token, nonce } = await issueSsoTransactionToken();
  return { authorizeUrl: buildMicrosoftAuthorizeUrl(token, nonce) };
}

/** Completes sign-in from the callback's `code` and `state` (the transaction token Microsoft echoed back). */
export async function completeMicrosoftSignInFromCallback(code: string, state: string): Promise<string> {
  const transaction = await verifySsoTransactionToken(state);
  if (!transaction) {
    throw new Error("This sign-in attempt is invalid or has expired. Please try again.");
  }
  return completeMicrosoftSignIn(code, transaction.nonce);
}

export async function mintStaffIdentityToken(staffUser: StaffUser): Promise<string> {
  return new jose.SignJWT({
    purpose: "staff_identity" as const,
    staffUserId: staffUser.id,
    email: staffUser.email,
    displayName: staffUser.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(STAFF_IDENTITY_TOKEN_EXPIRY)
    .sign(STAFF_IDENTITY_JWT_SECRET);
}

export interface StaffIdentityTokenPayload {
  staffUserId: number;
  email: string;
  displayName: string;
}

/** Verifies the WSA-signed session token only — does not re-check DB active state. Use requireActiveStaffIdentity for that. Never throws. */
export async function verifyStaffIdentityToken(token: string): Promise<StaffIdentityTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, STAFF_IDENTITY_JWT_SECRET);
    if (payload.purpose !== "staff_identity") return null;
    if (typeof payload.staffUserId !== "number" || typeof payload.email !== "string" || typeof payload.displayName !== "string") return null;
    return { staffUserId: payload.staffUserId, email: payload.email, displayName: payload.displayName };
  } catch {
    return null;
  }
}

/**
 * The gate a future protected procedure should call once individual
 * identity is wired in: verifies the token AND re-checks the staff_users
 * row is still active right now — a deactivated staff member loses access
 * immediately rather than at token expiry, mirroring
 * requireActivePortalIdentity's re-check for the Student Portal. Throws on
 * any failure so a caller fails closed.
 */
export async function requireActiveStaffIdentity(token: string): Promise<{ staffUserId: number; email: string; displayName: string }> {
  const payload = await verifyStaffIdentityToken(token);
  if (!payload) {
    throw new Error("Please sign in to the Staff Portal to use this tool.");
  }
  const db = await getDb();
  if (!db) {
    throw new Error("Staff identity could not be verified because the database is unavailable.");
  }
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, payload.staffUserId)).limit(1);
  const staffUser = rows[0];
  if (!staffUser || staffUser.isActive !== 1) {
    throw new Error("This Staff Portal account is not active. Please contact an administrator.");
  }
  return { staffUserId: staffUser.id, email: staffUser.email, displayName: staffUser.displayName };
}
