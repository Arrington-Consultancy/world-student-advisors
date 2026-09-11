/**
 * WSA Pipedrive OAuth application: the workforce's read-only CRM credential.
 *
 * Tom Arrington, 11 September 2026: WSA has 5 of 5 Premium seats in use and
 * another Deals user would cost about 637 pounds a year before VAT. Do not
 * buy a seat to give the AI read access. Use a dedicated WSA Pipedrive OAuth
 * application, authorised once by an existing WSA account, with read scopes
 * only.
 *
 * HOW THIS IS BOUNDED, in order of what matters most:
 *
 * Scopes are read only and fixed here. base is mandatory in Pipedrive's
 * model; leads:read, deals:read, contacts:read (persons and organisations)
 * and search:read (person search) are the minimum the approved Connector
 * Matrix v0.3 and the resolution-first reporting need. Nothing ending in
 * :full, and never admin. The scope string Pipedrive returns at
 * authorisation is checked against this list and a grant carrying anything
 * wider is refused and never stored.
 *
 * The app acts with the authorising user's visibility. That is Pipedrive's
 * model, not a choice here: an OAuth token is that user's read view of the
 * company. So the authorising account must be a WSA admin with full
 * visibility, and it must not be an Arrington Consultancy account. The
 * grant row records who authorised it.
 *
 * Tokens are secrets and are treated as such. Access tokens live an hour,
 * refresh tokens sixty days and rotate on every refresh. Both are sealed
 * with AES-256-GCM under PIPEDRIVE_OAUTH_TOKEN_KEY before they touch the
 * database, are never logged, never audited by value, never sent to the
 * browser and never reach the model. Refresh is single-flight and happens
 * five minutes before expiry; a failed refresh marks the grant
 * reauthorisation_required and every read fails closed until a human
 * authorises again.
 *
 * The website contact form's PIPEDRIVE_API_TOKEN is a different credential
 * for a different purpose and is not touched by anything in this file.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import * as jose from "jose";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { connectorOauthGrants } from "../../drizzle/schema";
import { ENV } from "../_core/env";

export const PIPEDRIVE_OAUTH_SCOPES = Object.freeze(["base", "leads:read", "deals:read", "contacts:read", "search:read"] as const);
export const PIPEDRIVE_AUTHORISE_URL = "https://oauth.pipedrive.com/oauth/authorize";
export const PIPEDRIVE_TOKEN_URL = "https://oauth.pipedrive.com/oauth/token";
export const PIPEDRIVE_OAUTH_REDIRECT_PATH = "/api/connectors/pipedrive/callback";
/** Refresh this long before the access token expires. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000;
/** A state token is valid for this long between starting and finishing consent. */
const STATE_TTL_SECONDS = 600;

export type PipedriveOAuthStatus = "unconfigured" | "not_authorised" | "operational" | "reauthorisation_required";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenKey: string;
  redirectUri: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  apiDomain: string;
  scope: string;
}

/** Production redirect is the public site; anything else is whatever the environment says it is. */
export function redirectUriFor(publicSiteUrl: string = ENV.publicSiteUrl): string {
  return `${publicSiteUrl.replace(/\/$/, "")}${PIPEDRIVE_OAUTH_REDIRECT_PATH}`;
}

/** Null until all three variables exist. Presence only; never the values. */
export function oauthConfig(env: NodeJS.ProcessEnv = process.env): OAuthConfig | null {
  const clientId = env.PIPEDRIVE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = env.PIPEDRIVE_OAUTH_CLIENT_SECRET ?? "";
  const tokenKey = env.PIPEDRIVE_OAUTH_TOKEN_KEY ?? "";
  if (!clientId || !clientSecret || !tokenKey) return null;
  return { clientId, clientSecret, tokenKey, redirectUri: redirectUriFor() };
}

/** Which returned scopes are wider than the approved read set. Empty means read only. */
export function scopesOutsideApproved(scopeString: string): string[] {
  const approved = new Set<string>(PIPEDRIVE_OAUTH_SCOPES);
  return scopeString
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !approved.has(s));
}

export function buildAuthoriseUrl(cfg: Pick<OAuthConfig, "clientId" | "redirectUri">, state: string): string {
  const params = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirectUri, state });
  return `${PIPEDRIVE_AUTHORISE_URL}?${params.toString()}`;
}

function stateKey(tokenKey: string): Uint8Array {
  // Derived, not the sealing key itself; a leaked state token proves nothing about stored tokens.
  return new TextEncoder().encode(`pipedrive-oauth-state:${tokenKey}`);
}

/** Who started consent, bound to a short life. Verified before any code is exchanged. */
export async function signState(staffUserId: number, tokenKey: string, now: Date = new Date()): Promise<string> {
  return new jose.SignJWT({ staffUserId, nonce: randomBytes(12).toString("base64url") })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("wsa-pipedrive-oauth-state")
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + STATE_TTL_SECONDS)
    .sign(stateKey(tokenKey));
}

export async function verifyState(state: string, tokenKey: string): Promise<{ staffUserId: number } | null> {
  try {
    const { payload } = await jose.jwtVerify(state, stateKey(tokenKey), { audience: "wsa-pipedrive-oauth-state" });
    return typeof payload.staffUserId === "number" ? { staffUserId: payload.staffUserId } : null;
  } catch {
    return null;
  }
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext>, base64url. */
export function seal(plain: string, keyB64: string): string {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) throw new Error("PIPEDRIVE_OAUTH_TOKEN_KEY must be 32 bytes, base64 encoded.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function open(sealed: string, keyB64: string): string {
  const [v, ivB, tagB, ctB] = sealed.split(".");
  if (v !== "v1" || !ivB || !tagB || !ctB) throw new Error("Sealed token has an unexpected shape.");
  const key = Buffer.from(keyB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]).toString("utf8");
}

export function shouldRefresh(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() - now.getTime() <= REFRESH_SKEW_MS;
}

export function parseTokenResponse(json: unknown, now: Date = new Date()): TokenSet | null {
  const j = json as Record<string, unknown> | null;
  if (!j || typeof j.access_token !== "string" || typeof j.refresh_token !== "string" || typeof j.api_domain !== "string") return null;
  const expiresIn = typeof j.expires_in === "number" ? j.expires_in : Number(j.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) return null;
  let apiDomain = j.api_domain.replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.pipedrive\.com$/i.test(apiDomain)) return null;
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: new Date(now.getTime() + expiresIn * 1000),
    apiDomain,
    scope: typeof j.scope === "string" ? j.scope : "",
  };
}

type FetchLike = typeof fetch;

async function tokenRequest(body: URLSearchParams, cfg: OAuthConfig, fetchImpl: FetchLike): Promise<TokenSet> {
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const response = await fetchImpl(PIPEDRIVE_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let json: unknown = null;
  try { json = await response.json(); } catch { json = null; }
  if (!response.ok) {
    const err = (json as { error?: string } | null)?.error ?? `HTTP ${response.status}`;
    throw new Error(`Pipedrive token endpoint refused: ${err}`);
  }
  const tokens = parseTokenResponse(json);
  if (!tokens) throw new Error("Pipedrive token response had an unexpected shape.");
  return tokens;
}

export function exchangeAuthorisationCode(code: string, cfg: OAuthConfig, fetchImpl: FetchLike = fetch): Promise<TokenSet> {
  return tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri }), cfg, fetchImpl);
}

export function refreshAccessToken(refreshToken: string, cfg: OAuthConfig, fetchImpl: FetchLike = fetch): Promise<TokenSet> {
  return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }), cfg, fetchImpl);
}

// ── Grant storage ─────────────────────────────────────────────────────────

/** Store a freshly authorised grant. Any earlier active grant is superseded. */
export async function storeGrant(tokens: TokenSet, staffUserId: number, cfg: OAuthConfig): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(connectorOauthGrants)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(connectorOauthGrants.connector, "pipedrive"), eq(connectorOauthGrants.status, "active")));
  const [row] = await db.insert(connectorOauthGrants).values({
    connector: "pipedrive",
    apiDomain: tokens.apiDomain,
    scopes: tokens.scope,
    authorisedByStaffUserId: staffUserId,
    authorisedAt: new Date(),
    sealedAccessToken: seal(tokens.accessToken, cfg.tokenKey),
    accessTokenExpiresAt: tokens.expiresAt,
    sealedRefreshToken: seal(tokens.refreshToken, cfg.tokenKey),
    status: "active",
  }).$returningId();
  cache = { status: "operational", accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, apiDomain: tokens.apiDomain, grantId: row?.id ?? null };
  return row?.id ?? null;
}

interface Cache {
  status: PipedriveOAuthStatus;
  accessToken: string | null;
  expiresAt: Date | null;
  apiDomain: string | null;
  grantId: number | null;
}
let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

/** Test seam and process restart: forget what is cached. */
export function resetPipedriveOAuthCache(): void { cache = null; inflight = null; }

async function loadFromStore(cfg: OAuthConfig): Promise<Cache> {
  const db = await getDb();
  if (!db) return { status: "not_authorised", accessToken: null, expiresAt: null, apiDomain: null, grantId: null };
  const rows = await db.select().from(connectorOauthGrants)
    .where(eq(connectorOauthGrants.connector, "pipedrive"))
    .orderBy(desc(connectorOauthGrants.id)).limit(1);
  const row = rows[0];
  if (!row || row.status === "revoked") return { status: "not_authorised", accessToken: null, expiresAt: null, apiDomain: null, grantId: null };
  if (row.status === "reauthorisation_required") return { status: "reauthorisation_required", accessToken: null, expiresAt: null, apiDomain: row.apiDomain, grantId: row.id };
  return {
    status: "operational",
    accessToken: open(row.sealedAccessToken, cfg.tokenKey),
    expiresAt: row.accessTokenExpiresAt,
    apiDomain: row.apiDomain,
    grantId: row.id,
  };
}

async function refreshStored(cfg: OAuthConfig, grantId: number, fetchImpl: FetchLike): Promise<Cache> {
  const db = await getDb();
  if (!db) return { status: "not_authorised", accessToken: null, expiresAt: null, apiDomain: null, grantId: null };
  const [row] = await db.select().from(connectorOauthGrants).where(eq(connectorOauthGrants.id, grantId)).limit(1);
  if (!row || row.status !== "active") return loadFromStore(cfg);
  try {
    const tokens = await refreshAccessToken(open(row.sealedRefreshToken, cfg.tokenKey), cfg, fetchImpl);
    const wider = scopesOutsideApproved(tokens.scope);
    if (tokens.scope && wider.length > 0) throw new Error(`refreshed grant carries scopes outside the approved read set: ${wider.join(", ")}`);
    await db.update(connectorOauthGrants).set({
      sealedAccessToken: seal(tokens.accessToken, cfg.tokenKey),
      accessTokenExpiresAt: tokens.expiresAt,
      // Pipedrive rotates the refresh token on every refresh; the old one is dead.
      sealedRefreshToken: seal(tokens.refreshToken, cfg.tokenKey),
      lastRefreshedAt: new Date(),
      lastRefreshError: null,
    }).where(eq(connectorOauthGrants.id, grantId));
    return { status: "operational", accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, apiDomain: tokens.apiDomain, grantId };
  } catch (error) {
    const message = String((error as Error)?.message ?? error).slice(0, 200);
    await db.update(connectorOauthGrants).set({ status: "reauthorisation_required", lastRefreshError: message }).where(eq(connectorOauthGrants.id, grantId));
    console.warn("[Pipedrive OAuth] Refresh failed; the connector now fails closed until re-authorised.");
    return { status: "reauthorisation_required", accessToken: null, expiresAt: null, apiDomain: row.apiDomain, grantId };
  }
}

/**
 * A usable access token, refreshing first when it is about to expire.
 * Single-flight so concurrent workers do not race Pipedrive with parallel
 * refreshes, which would invalidate each other's rotated refresh tokens.
 */
export async function getPipedriveOAuthAccess(
  deps: { fetchImpl?: FetchLike; now?: Date; cfg?: OAuthConfig | null } = {},
): Promise<{ ok: true; accessToken: string; apiDomain: string } | { ok: false; status: PipedriveOAuthStatus }> {
  const cfg = deps.cfg === undefined ? oauthConfig() : deps.cfg;
  if (!cfg) return { ok: false, status: "unconfigured" };
  const now = deps.now ?? new Date();
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (!inflight) {
    inflight = (async () => {
      let c = cache ?? (await loadFromStore(cfg));
      if (c.status === "operational" && c.expiresAt && shouldRefresh(c.expiresAt, now) && c.grantId !== null) {
        c = await refreshStored(cfg, c.grantId, fetchImpl);
      }
      cache = c;
      return c;
    })().finally(() => { inflight = null; });
  }
  const c = await inflight;
  if (c.status === "operational" && c.accessToken && c.apiDomain) return { ok: true, accessToken: c.accessToken, apiDomain: c.apiDomain };
  return { ok: false, status: c.status };
}

/**
 * Cheap, synchronous, for connector state checks: what we last established.
 * The connector gate in shared.ts consults state synchronously before a
 * call, so the cache is warmed at server start (see _core/index.ts). If it
 * is somehow cold here, a background load is started and this returns
 * not_authorised for this one request, which fails closed and honestly.
 */
export function pipedriveOAuthStatusSync(): PipedriveOAuthStatus {
  if (!oauthConfig()) return "unconfigured";
  if (cache === null) {
    void getPipedriveOAuthAccess().catch(() => undefined);
    return "not_authorised";
  }
  return cache.status;
}

/** Establish the grant state once at start so the first request is not refused for a cold cache. Never throws. */
export async function warmPipedriveOAuth(): Promise<PipedriveOAuthStatus> {
  try {
    return await getPipedriveOAuthStatus();
  } catch (error) {
    console.warn("[Pipedrive OAuth] Could not establish grant state at start:", String((error as Error)?.message ?? error).slice(0, 200));
    return "not_authorised";
  }
}

export async function getPipedriveOAuthStatus(): Promise<PipedriveOAuthStatus> {
  const r = await getPipedriveOAuthAccess();
  return r.ok ? "operational" : r.status;
}

/** Non-secret facts about the current grant, for the admin screen and the acceptance run. */
export async function describePipedriveGrant(): Promise<{ status: PipedriveOAuthStatus; apiDomainHost: string | null; scopes: string | null; authorisedByStaffUserId: number | null; authorisedAt: Date | null; lastRefreshedAt: Date | null; lastRefreshError: string | null }> {
  const status = await getPipedriveOAuthStatus();
  const db = await getDb();
  if (!db) return { status, apiDomainHost: null, scopes: null, authorisedByStaffUserId: null, authorisedAt: null, lastRefreshedAt: null, lastRefreshError: null };
  const rows = await db.select().from(connectorOauthGrants).where(eq(connectorOauthGrants.connector, "pipedrive")).orderBy(desc(connectorOauthGrants.id)).limit(1);
  const row = rows[0];
  if (!row) return { status, apiDomainHost: null, scopes: null, authorisedByStaffUserId: null, authorisedAt: null, lastRefreshedAt: null, lastRefreshError: null };
  return {
    status,
    apiDomainHost: row.apiDomain.replace(/^https:\/\//, ""),
    scopes: row.scopes,
    authorisedByStaffUserId: row.authorisedByStaffUserId,
    authorisedAt: row.authorisedAt,
    lastRefreshedAt: row.lastRefreshedAt,
    lastRefreshError: row.lastRefreshError,
  };
}
