/**
 * The Google credential for the WSA AI Reporting Mirror.
 *
 * Tom Arrington, 11 September 2026: his own Google Drive holds the mirror,
 * as an explicitly approved, controlled exception to the WSA and Arrington
 * storage separation. One dedicated folder only. Workers never get general
 * access to that Drive, and no Arrington Consultancy business file may be
 * read, searched or indexed.
 *
 * HOW THE BOUNDARY IS MADE REAL, not promised. The credential is a
 * dedicated Google OAuth client (not the staff sign-in client) that Tom
 * consents to once, with the single scope drive.file. Under drive.file a
 * credential can see, list and change only the files and folders it
 * created itself. It cannot list the rest of the Drive at all. So the
 * folder is created by this application, the files inside it are written
 * by this application, and there is nothing else for the credential to
 * reach. A test proves the scope is exactly drive.file and nothing wider,
 * and the acceptance run proves an unfiltered listing returns only the
 * mirror's own files.
 *
 * Why not a service account: since 2025 Google gives service accounts no
 * Drive storage, so they cannot create files in a personal My Drive, and a
 * consumer Google account has no shared drives to hold them instead.
 *
 * Tokens are sealed with the connector token key before the database,
 * refreshed five minutes before expiry (Google refresh tokens do not
 * rotate), and never logged, audited by value, sent to the browser or
 * given to a worker or the model.
 */
import { randomBytes } from "crypto";
import * as jose from "jose";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { connectorOauthGrants } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { seal, open, shouldRefresh } from "../crm/pipedriveOAuth";

export const DRIVE_MIRROR_CONNECTOR = "google_drive_mirror";
export const DRIVE_MIRROR_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GOOGLE_AUTHORISE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_API_DOMAIN = "https://www.googleapis.com";
export const DRIVE_MIRROR_REDIRECT_PATH = "/api/connectors/drive-mirror/callback";
const STATE_TTL_SECONDS = 600;

export type DriveMirrorOAuthStatus = "unconfigured" | "not_authorised" | "operational" | "reauthorisation_required";

export interface DriveOAuthConfig { clientId: string; clientSecret: string; tokenKey: string; redirectUri: string }

/** The key that seals every connector token this service stores. */
export function connectorTokenKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.CONNECTOR_TOKEN_KEY ?? env.PIPEDRIVE_OAUTH_TOKEN_KEY ?? "";
}

export function driveRedirectUriFor(publicSiteUrl: string = ENV.publicSiteUrl): string {
  return `${publicSiteUrl.replace(/\/$/, "")}${DRIVE_MIRROR_REDIRECT_PATH}`;
}

export function driveOAuthConfig(env: NodeJS.ProcessEnv = process.env): DriveOAuthConfig | null {
  const clientId = env.GOOGLE_MIRROR_CLIENT_ID ?? "";
  const clientSecret = env.GOOGLE_MIRROR_CLIENT_SECRET ?? "";
  const tokenKey = connectorTokenKey(env);
  if (!clientId || !clientSecret || !tokenKey) return null;
  return { clientId, clientSecret, tokenKey, redirectUri: driveRedirectUriFor() };
}

/** Anything granted beyond drive.file. Empty means exactly the approved scope. */
export function driveScopesOutsideApproved(scopeString: string): string[] {
  return scopeString.split(/[\s,]+/).map(s => s.trim()).filter(Boolean).filter(s => s !== DRIVE_MIRROR_SCOPE);
}

export function buildDriveAuthoriseUrl(cfg: Pick<DriveOAuthConfig, "clientId" | "redirectUri">, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: DRIVE_MIRROR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `${GOOGLE_AUTHORISE_URL}?${params.toString()}`;
}

function stateKey(tokenKey: string): Uint8Array {
  return new TextEncoder().encode(`drive-mirror-oauth-state:${tokenKey}`);
}
export async function signDriveState(staffUserId: number, tokenKey: string, now: Date = new Date()): Promise<string> {
  return new jose.SignJWT({ staffUserId, nonce: randomBytes(12).toString("base64url") })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("wsa-drive-mirror-oauth-state")
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + STATE_TTL_SECONDS)
    .sign(stateKey(tokenKey));
}
export async function verifyDriveState(state: string, tokenKey: string): Promise<{ staffUserId: number } | null> {
  try {
    const { payload } = await jose.jwtVerify(state, stateKey(tokenKey), { audience: "wsa-drive-mirror-oauth-state" });
    return typeof payload.staffUserId === "number" ? { staffUserId: payload.staffUserId } : null;
  } catch { return null; }
}

export interface DriveTokenSet { accessToken: string; refreshToken: string | null; expiresAt: Date; scope: string }

export function parseGoogleTokenResponse(json: unknown, now: Date = new Date()): DriveTokenSet | null {
  const j = json as Record<string, unknown> | null;
  if (!j || typeof j.access_token !== "string") return null;
  const expiresIn = typeof j.expires_in === "number" ? j.expires_in : Number(j.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) return null;
  return {
    accessToken: j.access_token,
    refreshToken: typeof j.refresh_token === "string" ? j.refresh_token : null,
    expiresAt: new Date(now.getTime() + expiresIn * 1000),
    scope: typeof j.scope === "string" ? j.scope : "",
  };
}

type FetchLike = typeof fetch;
async function tokenRequest(body: URLSearchParams, cfg: DriveOAuthConfig, fetchImpl: FetchLike): Promise<DriveTokenSet> {
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  const response = await fetchImpl(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  let json: unknown = null;
  try { json = await response.json(); } catch { json = null; }
  if (!response.ok) throw new Error(`Google token endpoint refused: ${(json as { error?: string } | null)?.error ?? `HTTP ${response.status}`}`);
  const tokens = parseGoogleTokenResponse(json);
  if (!tokens) throw new Error("Google token response had an unexpected shape.");
  return tokens;
}
export function exchangeDriveCode(code: string, cfg: DriveOAuthConfig, fetchImpl: FetchLike = fetch): Promise<DriveTokenSet> {
  return tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri }), cfg, fetchImpl);
}
export function refreshDriveToken(refreshToken: string, cfg: DriveOAuthConfig, fetchImpl: FetchLike = fetch): Promise<DriveTokenSet> {
  return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }), cfg, fetchImpl);
}

export async function storeDriveGrant(tokens: DriveTokenSet, staffUserId: number, cfg: DriveOAuthConfig): Promise<number | null> {
  if (!tokens.refreshToken) throw new Error("Google returned no refresh token; the grant cannot be kept. Consent must be given with offline access.");
  const db = await getDb();
  if (!db) return null;
  await db.update(connectorOauthGrants).set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(connectorOauthGrants.connector, DRIVE_MIRROR_CONNECTOR), eq(connectorOauthGrants.status, "active")));
  const [row] = await db.insert(connectorOauthGrants).values({
    connector: DRIVE_MIRROR_CONNECTOR,
    apiDomain: GOOGLE_API_DOMAIN,
    scopes: tokens.scope || DRIVE_MIRROR_SCOPE,
    authorisedByStaffUserId: staffUserId,
    authorisedAt: new Date(),
    sealedAccessToken: seal(tokens.accessToken, cfg.tokenKey),
    accessTokenExpiresAt: tokens.expiresAt,
    sealedRefreshToken: seal(tokens.refreshToken, cfg.tokenKey),
    status: "active",
  }).$returningId();
  cache = { status: "operational", accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, grantId: row?.id ?? null };
  return row?.id ?? null;
}

interface Cache { status: DriveMirrorOAuthStatus; accessToken: string | null; expiresAt: Date | null; grantId: number | null }
let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;
export function resetDriveMirrorOAuthCache(): void { cache = null; inflight = null; }

const EMPTY: Cache = { status: "not_authorised", accessToken: null, expiresAt: null, grantId: null };

async function loadFromStore(cfg: DriveOAuthConfig): Promise<Cache> {
  const db = await getDb();
  if (!db) return EMPTY;
  const rows = await db.select().from(connectorOauthGrants).where(eq(connectorOauthGrants.connector, DRIVE_MIRROR_CONNECTOR)).orderBy(desc(connectorOauthGrants.id)).limit(1);
  const row = rows[0];
  if (!row || row.status === "revoked") return EMPTY;
  if (row.status === "reauthorisation_required") return { status: "reauthorisation_required", accessToken: null, expiresAt: null, grantId: row.id };
  return { status: "operational", accessToken: open(row.sealedAccessToken, cfg.tokenKey), expiresAt: row.accessTokenExpiresAt, grantId: row.id };
}

async function refreshStored(cfg: DriveOAuthConfig, grantId: number, fetchImpl: FetchLike): Promise<Cache> {
  const db = await getDb();
  if (!db) return EMPTY;
  const [row] = await db.select().from(connectorOauthGrants).where(eq(connectorOauthGrants.id, grantId)).limit(1);
  if (!row || row.status !== "active") return loadFromStore(cfg);
  try {
    const tokens = await refreshDriveToken(open(row.sealedRefreshToken, cfg.tokenKey), cfg, fetchImpl);
    const wider = driveScopesOutsideApproved(tokens.scope);
    if (tokens.scope && wider.length > 0) throw new Error(`refreshed grant carries scopes outside drive.file: ${wider.join(", ")}`);
    await db.update(connectorOauthGrants).set({
      sealedAccessToken: seal(tokens.accessToken, cfg.tokenKey),
      accessTokenExpiresAt: tokens.expiresAt,
      lastRefreshedAt: new Date(),
      lastRefreshError: null,
    }).where(eq(connectorOauthGrants.id, grantId));
    return { status: "operational", accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, grantId };
  } catch (error) {
    const message = String((error as Error)?.message ?? error).slice(0, 200);
    await db.update(connectorOauthGrants).set({ status: "reauthorisation_required", lastRefreshError: message }).where(eq(connectorOauthGrants.id, grantId));
    console.warn("[Drive mirror OAuth] Refresh failed; the mirror writer now fails closed until re-authorised.");
    return { status: "reauthorisation_required", accessToken: null, expiresAt: null, grantId };
  }
}

export async function getDriveMirrorAccess(
  deps: { fetchImpl?: FetchLike; now?: Date; cfg?: DriveOAuthConfig | null } = {},
): Promise<{ ok: true; accessToken: string } | { ok: false; status: DriveMirrorOAuthStatus }> {
  const cfg = deps.cfg === undefined ? driveOAuthConfig() : deps.cfg;
  if (!cfg) return { ok: false, status: "unconfigured" };
  const now = deps.now ?? new Date();
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (!inflight) {
    inflight = (async () => {
      let c = cache ?? (await loadFromStore(cfg));
      if (c.status === "operational" && c.expiresAt && shouldRefresh(c.expiresAt, now) && c.grantId !== null) c = await refreshStored(cfg, c.grantId, fetchImpl);
      cache = c;
      return c;
    })().finally(() => { inflight = null; });
  }
  const c = await inflight;
  if (c.status === "operational" && c.accessToken) return { ok: true, accessToken: c.accessToken };
  return { ok: false, status: c.status };
}

export async function getDriveMirrorStatus(): Promise<DriveMirrorOAuthStatus> {
  const r = await getDriveMirrorAccess();
  return r.ok ? "operational" : r.status;
}

/** Non-secret facts about the current grant. */
export async function describeDriveMirrorGrant(): Promise<{ status: DriveMirrorOAuthStatus; scopes: string | null; authorisedByStaffUserId: number | null; authorisedAt: Date | null; lastRefreshedAt: Date | null; lastRefreshError: string | null }> {
  const status = await getDriveMirrorStatus();
  const none = { status, scopes: null, authorisedByStaffUserId: null, authorisedAt: null, lastRefreshedAt: null, lastRefreshError: null };
  const db = await getDb();
  if (!db) return none;
  const rows = await db.select().from(connectorOauthGrants).where(eq(connectorOauthGrants.connector, DRIVE_MIRROR_CONNECTOR)).orderBy(desc(connectorOauthGrants.id)).limit(1);
  const row = rows[0];
  if (!row) return none;
  return { status, scopes: row.scopes, authorisedByStaffUserId: row.authorisedByStaffUserId, authorisedAt: row.authorisedAt, lastRefreshedAt: row.lastRefreshedAt, lastRefreshError: row.lastRefreshError };
}
