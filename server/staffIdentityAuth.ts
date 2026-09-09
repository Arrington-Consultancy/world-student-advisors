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
import { isCurrentlyApproved, readApprovals } from "./access/staffApprovalStore";
import { decideStaffSignIn } from "../shared/staffSignIn";
import { decideSessionVersion, SESSION_ENDED_MESSAGE } from "../shared/sessionVersion";

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
    // Force the account chooser rather than letting Microsoft reuse
    // whatever account the browser already holds.
    //
    // Without this, a member of staff whose browser is signed in to a
    // personal Microsoft account, or to a different tenant, is silently
    // sent through as that account. The authorize endpoint is
    // tenant-scoped, so Microsoft rejects it at its own end and never
    // redirects back here. The staff member sees a Microsoft error and
    // returns to a login page that has no idea anything happened, and
    // the server logs show the sign-in starting and no callback ever
    // arriving.
    //
    // This weakens nothing. The nonce, issuer, audience and WSA domain
    // checks on the returned token are unchanged; the only difference is
    // that the person gets to pick the right account.
    prompt: "select_account",
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
    // Per-user session invalidation. Bumping staff_users.sessionVersion ends
    // every session minted before the bump, for this account only.
    sessionVersion: staffUser.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(STAFF_IDENTITY_TOKEN_EXPIRY)
    .sign(STAFF_IDENTITY_JWT_SECRET);
}

export interface StaffIdentityTokenPayload {
  staffUserId: number;
  email: string;
  displayName: string;
  /**
   * Undefined for a token minted before 0014. Carried through rather than
   * defaulted, so requireActiveStaffIdentity can refuse it: defaulting here
   * would silently exempt exactly the sessions this control exists to cut.
   */
  sessionVersion?: number;
}

/** Verifies the WSA-signed session token only — does not re-check DB active state. Use requireActiveStaffIdentity for that. Never throws. */
export async function verifyStaffIdentityToken(token: string): Promise<StaffIdentityTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, STAFF_IDENTITY_JWT_SECRET);
    if (payload.purpose !== "staff_identity") return null;
    if (typeof payload.staffUserId !== "number" || typeof payload.email !== "string" || typeof payload.displayName !== "string") return null;
    return {
      staffUserId: payload.staffUserId,
      email: payload.email,
      displayName: payload.displayName,
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : undefined,
    };
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

  // Per-user session invalidation (Access Control Standard v1.0 §9, "Access
  // must be removed or changed promptly"). The token carries the version
  // current when it was minted; this row carries the version now. They must
  // match exactly. A password reset, a suspension or an administrator
  // revocation bumps the row, and every session minted before that bump dies
  // here on its next request. The comparison is per row, so one person's
  // revocation never touches anybody else's sessions.
  const versionDecision = decideSessionVersion(payload.sessionVersion, staffUser.sessionVersion);
  if (!versionDecision.valid) {
    throw new Error(versionDecision.reason ?? SESSION_ENDED_MESSAGE);
  }

  // A Google session's whole authority is its address being on the approval
  // list, so that is re-read here rather than trusted from sign-in. A token
  // lasts twelve hours; without this, revoking somebody would leave them
  // working inside the portal for the rest of the day. A Microsoft session
  // never reaches this, because its authority is the Entra tenant.
  if (staffUser.authProvider === "google" && !(await isCurrentlyApproved(staffUser.email))) {
    throw new Error("Access for this address has been withdrawn. Please contact an administrator.");
  }

  return { staffUserId: staffUser.id, email: staffUser.email, displayName: staffUser.displayName };
}

// ── Google sign-in ──────────────────────────────────────────────────────
/**
 * The second route into the Staff Portal, added 9 September 2026 on Tom
 * Arrington's decision so staff can use a personal Google account.
 *
 * IT IS NOT EQUIVALENT TO THE MICROSOFT ROUTE AND MUST NOT BECOME SO.
 * A Microsoft sign-in is protected by WSA's Entra tenant and the email
 * domain. Anybody can create a Google account, so neither applies here and
 * the approval list in staff_approved_emails is the only control. Every
 * function below therefore refuses before creating anything: an unapproved
 * person leaves no staff_users row at all, rather than a dormant one
 * somebody might later grant access to by mistake.
 *
 * The signature, issuer and audience checks mirror the Microsoft path and
 * the student portal's Google flow. email_verified is additionally required,
 * because here the address is the credential.
 */
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let _googleJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
function getGoogleJwks() {
  if (!_googleJwks) _googleJwks = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return _googleJwks;
}

export function isGoogleStaffSsoConfigured(): boolean {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret && ENV.staffGoogleRedirectUri);
}

export function buildGoogleStaffAuthorizeUrl(state: string, nonce: string): string {
  if (!isGoogleStaffSsoConfigured()) {
    throw new Error("Google staff sign-in is not configured.");
  }
  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    response_type: "code",
    redirect_uri: ENV.staffGoogleRedirectUri,
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface VerifiedGoogleClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

/** Verifies a Google ID token against Google's own keys. `jwks` is overridden only in tests. */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
  jwks: Parameters<typeof jose.jwtVerify>[1] = getGoogleJwks(),
): Promise<VerifiedGoogleClaims> {
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: ENV.googleClientId,
  });
  if (payload.nonce !== expectedNonce) {
    throw new Error("Nonce mismatch on Google sign-in. Possible replay, rejecting.");
  }
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) {
    throw new Error("Google ID token had no sub claim.");
  }
  const email = typeof payload.email === "string" ? payload.email : "";
  const displayName = (typeof payload.name === "string" && payload.name) || email;
  return { sub, email, emailVerified: payload.email_verified === true, displayName };
}

/**
 * Finds or creates the staff_users row for a Google identity.
 *
 * Keyed on Google's stable `sub`, never the email, so a later address change
 * does not orphan the record. Called only after the approval gate has
 * allowed the sign-in.
 */
export async function upsertStaffUserFromGoogleClaims(claims: VerifiedGoogleClaims): Promise<StaffUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available, so staff identity cannot be resolved.");
  const email = claims.email.trim().toLowerCase();

  const bySub = await db.select().from(staffUsers).where(eq(staffUsers.googleSubjectId, claims.sub)).limit(1);
  if (bySub[0]) {
    await db
      .update(staffUsers)
      .set({ email, displayName: claims.displayName, lastLoginAt: new Date() })
      .where(eq(staffUsers.id, bySub[0].id));
    return { ...bySub[0], email, displayName: claims.displayName };
  }

  // Somebody who already has a Microsoft staff record and now signs in with
  // Google on the same address is one person, so the Google identity is
  // linked to the existing row. Two rows would mean two separate access
  // assignments for one colleague, which is how somebody ends up holding
  // access nobody knowingly granted them.
  const byEmail = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  if (byEmail[0]) {
    await db
      .update(staffUsers)
      .set({ googleSubjectId: claims.sub, displayName: claims.displayName, lastLoginAt: new Date() })
      .where(eq(staffUsers.id, byEmail[0].id));
    return { ...byEmail[0], googleSubjectId: claims.sub, displayName: claims.displayName };
  }

  const inserted = await db.insert(staffUsers).values({
    authProvider: "google",
    googleSubjectId: claims.sub,
    email,
    displayName: claims.displayName,
    lastLoginAt: new Date(),
  });
  const insertId = (inserted as unknown as [{ insertId: number }])[0].insertId;
  const created = await db.select().from(staffUsers).where(eq(staffUsers.id, insertId)).limit(1);
  return created[0];
}

async function exchangeGoogleCodeForIdToken(code: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: ENV.staffGoogleRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google rejected the sign-in code (HTTP ${response.status}).`);
  }
  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("Google returned no id_token.");
  return body.id_token;
}

/**
 * The whole Google sign-in: code, verified claims, APPROVAL GATE, then and
 * only then a staff row and a session.
 *
 * The order is the security property. decideStaffSignIn runs before
 * upsertStaffUserFromGoogleClaims, so somebody who is not on the approval
 * list is refused without a staff_users row ever existing for them. A
 * dormant row for an unapproved stranger would be worse than no row: it
 * would appear in Staff access as somebody to assign permissions to.
 */
export async function completeGoogleStaffSignIn(code: string, expectedNonce: string): Promise<string> {
  const idToken = await exchangeGoogleCodeForIdToken(code);
  const claims = await verifyGoogleIdToken(idToken, expectedNonce);

  const decision = decideStaffSignIn(
    "google",
    { email: claims.email, emailVerified: claims.emailVerified },
    await readApprovals(),
  );
  if (!decision.permitted) {
    throw new Error(decision.reason ?? "That account may not sign in to the Staff Portal.");
  }

  const staffUser = await upsertStaffUserFromGoogleClaims(claims);
  return mintStaffIdentityToken(staffUser);
}

/** What the client needs to start Google sign-in. Mirrors the Microsoft pair exactly. */
export async function buildGoogleStaffSignInRequest(): Promise<{ authorizeUrl: string }> {
  const { token, nonce } = await issueSsoTransactionToken();
  return { authorizeUrl: buildGoogleStaffAuthorizeUrl(token, nonce) };
}

/** Completes Google sign-in from the callback's `code` and `state`, with the same replay protection. */
export async function completeGoogleStaffSignInFromCallback(code: string, state: string): Promise<string> {
  const transaction = await verifySsoTransactionToken(state);
  if (!transaction) {
    throw new Error("This sign-in attempt is invalid or has expired. Please try again.");
  }
  return completeGoogleStaffSignIn(code, transaction.nonce);
}
