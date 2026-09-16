/**
 * Google Data Manager API client, for WSA's own offline conversion uploads.
 *
 * WHY THIS API. Google moved offline conversion imports and enhanced
 * conversions for leads out of the Google Ads API on 15 June 2026:
 * UploadClickConversions now fails for any developer token that was not
 * already uploading before that date, and the documented replacement is the
 * Data Manager API (datamanager.googleapis.com, method events:ingest). This
 * client is written against that API's published v1 schema, read from the
 * official @google-ads/datamanager 1.0.0 client library, not from older
 * Google Ads API examples.
 *
 * WHAT IT DOES NOT DO. It holds no business rule: what counts as a qualified
 * lead lives in qualifiedLead.ts. It stores nothing. It logs shapes and
 * status codes, never an email, a phone number, a click identifier or a
 * token. It never falls back to a weaker credential.
 *
 * AUTHENTICATION. Two credential shapes, chosen by what is configured:
 *   GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON  a Google Cloud service
 *     account key. The service account's email must be given access to the
 *     Google Ads account, and the Data Manager API must be enabled on the
 *     account's Cloud project. Preferred: no human's session is involved.
 *   GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN
 *     an OAuth client and a refresh token minted by a Google account that
 *     has access to the Google Ads account. For the case where Google Ads
 *     will not accept a service account as a user.
 * Either way the scope is the one the API declares, and only that one.
 */
import * as jose from "jose";
import { createHash } from "crypto";

export const DATA_MANAGER_ENDPOINT = "https://datamanager.googleapis.com/v1";
export const DATA_MANAGER_SCOPE = "https://www.googleapis.com/auth/datamanager";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type ConsentStatus = "CONSENT_GRANTED" | "CONSENT_DENIED";
export type EventSource = "WEB" | "APP" | "IN_STORE" | "PHONE" | "MESSAGE" | "OTHER";

export interface ProductAccount {
  accountType: "GOOGLE_ADS";
  /** Digits only: 5165838785, not 516-583-8785. */
  accountId: string;
}

export interface DataManagerDestination {
  reference?: string;
  /** Only when the operating account is reached through a manager account. */
  loginAccount?: ProductAccount;
  operatingAccount: ProductAccount;
  /** The Google Ads conversion action id, as a numeric string. */
  productDestinationId: string;
}

export type UserIdentifier = { emailAddress: string } | { phoneNumber: string };

export interface DataManagerEvent {
  /** Google's deduplication key within the destination. */
  transactionId: string;
  /** RFC 3339, UTC. */
  eventTimestamp: string;
  adIdentifiers?: { gclid?: string; gbraid?: string; wbraid?: string };
  /** SHA-256 hex of normalised values, never the values. */
  userData?: { userIdentifiers: UserIdentifier[] };
  consent?: { adUserData?: ConsentStatus; adPersonalization?: ConsentStatus };
  eventSource?: EventSource;
  currency?: string;
  conversionValue?: number;
}

export interface IngestEventsRequest {
  destinations: DataManagerDestination[];
  events: DataManagerEvent[];
  /** How userData hashes are encoded. This client always hashes to hex. */
  encoding: "HEX";
  /** True: Google checks the request and records nothing. */
  validateOnly?: boolean;
}

export interface IngestEventsResponse {
  requestId: string;
  fieldWarnings: unknown[];
}

export type RequestStatus = "SUCCESS" | "PROCESSING" | "FAILED" | "PARTIAL_SUCCESS" | "REQUEST_STATUS_UNKNOWN";

export interface RequestStatusSummary {
  status: RequestStatus;
  recordCount: number | null;
  errorCounts: Array<{ reason: string; count: number }>;
  warningCounts: Array<{ reason: string; count: number }>;
}

// ── Credentials ───────────────────────────────────────────────────────────

export type DataManagerCredential =
  | { kind: "service_account"; clientEmail: string; privateKey: string }
  | { kind: "oauth_refresh"; clientId: string; clientSecret: string; refreshToken: string };

export type CredentialState = "service_account" | "oauth_refresh" | "unconfigured" | "malformed";

export function readCredential(env: NodeJS.ProcessEnv = process.env): DataManagerCredential | null {
  const raw = env.GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim() !== "") {
    try {
      const j = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
      if (typeof j.client_email === "string" && typeof j.private_key === "string") {
        return { kind: "service_account", clientEmail: j.client_email, privateKey: j.private_key };
      }
    } catch {
      // Malformed JSON is reported by credentialState, not guessed around.
    }
    return null;
  }
  const clientId = env.GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_ADS_DATAMANAGER_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) return { kind: "oauth_refresh", clientId, clientSecret, refreshToken };
  return null;
}

export function credentialState(env: NodeJS.ProcessEnv = process.env): CredentialState {
  const cred = readCredential(env);
  if (cred) return cred.kind;
  const anySet = ["GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON", "GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID", "GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_SECRET", "GOOGLE_ADS_DATAMANAGER_OAUTH_REFRESH_TOKEN"]
    .some(k => (env[k] ?? "").trim() !== "");
  return anySet ? "malformed" : "unconfigured";
}

/** The identity Google will see, for granting access. Not a secret. */
export function credentialIdentity(env: NodeJS.ProcessEnv = process.env): string | null {
  const cred = readCredential(env);
  if (!cred) return null;
  return cred.kind === "service_account" ? cred.clientEmail : `OAuth client ${cred.clientId.slice(0, 12)}...`;
}

type Cached = { key: string; token: string; expiresAt: number };
let cached: Cached | null = null;
export function resetDataManagerTokenCache(): void { cached = null; }

export async function accessToken(credential: DataManagerCredential, fetchImpl: typeof fetch = fetch, now: number = Date.now()): Promise<string> {
  const key = credential.kind === "service_account" ? `sa:${credential.clientEmail}` : `oauth:${credential.clientId}`;
  if (cached && cached.key === key && cached.expiresAt > now + 30_000) return cached.token;

  let body: URLSearchParams;
  if (credential.kind === "service_account") {
    const pk = await jose.importPKCS8(credential.privateKey, "RS256");
    const assertion = await new jose.SignJWT({ scope: DATA_MANAGER_SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credential.clientEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(Math.floor(now / 1000) + 3600)
      .sign(pk);
    body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion });
  } else {
    body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credential.clientId,
      client_secret: credential.clientSecret,
      refresh_token: credential.refreshToken,
    });
  }
  const response = await fetchImpl(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  if (!response.ok) {
    // The body names the failure (invalid_grant, unauthorized_client). It
    // never carries our secret, so its first line is safe to surface.
    const text = (await response.text()).slice(0, 200);
    throw new DataManagerError(`Google token request failed (HTTP ${response.status}): ${text}`, response.status, false);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = { key, token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cached.token;
}

// ── Errors and retries ────────────────────────────────────────────────────

export class DataManagerError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean, public readonly googleStatus: string | null = null) {
    super(message);
    this.name = "DataManagerError";
  }
}

export interface ClientOptions {
  fetchImpl?: typeof fetch;
  credential?: DataManagerCredential | null;
  /** Total attempts for a retryable failure. Default 3. */
  attempts?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function authorisedFetch(path: string, init: RequestInit, opts: ClientOptions): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const credential = opts.credential === undefined ? readCredential() : opts.credential;
  if (!credential) throw new DataManagerError("The Google Data Manager credential is not configured.", 0, false);
  const attempts = Math.max(1, opts.attempts ?? 3);
  const sleep = opts.sleep ?? defaultSleep;
  let lastError: DataManagerError | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const token = await accessToken(credential, fetchImpl, (opts.now ?? Date.now)());
      const response = await fetchImpl(`${DATA_MANAGER_ENDPOINT}${path}`, {
        ...init,
        headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.ok) return response;
      const detail = await errorDetail(response);
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new DataManagerError(`Data Manager ${path} failed (HTTP ${response.status}${detail.status ? ` ${detail.status}` : ""}): ${detail.message}`, response.status, retryable, detail.status);
      if (!retryable) throw lastError;
    } catch (error) {
      if (error instanceof DataManagerError) {
        if (!error.retryable) throw error;
        lastError = error;
      } else {
        // Network failure: retryable.
        lastError = new DataManagerError(`Data Manager ${path} could not be reached: ${String((error as Error)?.message ?? error).slice(0, 160)}`, 0, true);
      }
    }
    if (attempt < attempts) await sleep(attempt * 1500);
  }
  throw lastError ?? new DataManagerError("Data Manager request failed.", 0, true);
}

async function errorDetail(response: Response): Promise<{ status: string | null; message: string }> {
  try {
    const j = (await response.json()) as { error?: { status?: string; message?: string } };
    return { status: j.error?.status ?? null, message: (j.error?.message ?? "no detail").slice(0, 300) };
  } catch {
    return { status: null, message: "no detail" };
  }
}

// ── Methods ───────────────────────────────────────────────────────────────

export async function ingestEvents(request: IngestEventsRequest, opts: ClientOptions = {}): Promise<IngestEventsResponse> {
  const response = await authorisedFetch("/events:ingest", { method: "POST", body: JSON.stringify(request) }, opts);
  const j = (await response.json()) as { requestId?: string; fieldWarnings?: unknown[] };
  return { requestId: j.requestId ?? "", fieldWarnings: Array.isArray(j.fieldWarnings) ? j.fieldWarnings : [] };
}

export async function retrieveRequestStatus(requestId: string, opts: ClientOptions = {}): Promise<RequestStatusSummary> {
  const response = await authorisedFetch(`/requestStatus:retrieve?requestId=${encodeURIComponent(requestId)}`, { method: "GET" }, opts);
  const j = (await response.json()) as {
    requestStatusPerDestination?: Array<{
      requestStatus?: RequestStatus;
      eventsIngestionStatus?: { recordCount?: string | number };
      errorInfo?: { errorCounts?: Array<{ reason?: string; recordCount?: string | number }> };
      warningInfo?: { warningCounts?: Array<{ reason?: string; recordCount?: string | number }> };
    }>;
  };
  const first = j.requestStatusPerDestination?.[0];
  const counts = (list?: Array<{ reason?: string; recordCount?: string | number }>) =>
    (list ?? []).map(c => ({ reason: String(c.reason ?? "UNKNOWN"), count: Number(c.recordCount ?? 0) }));
  return {
    status: first?.requestStatus ?? "REQUEST_STATUS_UNKNOWN",
    recordCount: first?.eventsIngestionStatus?.recordCount === undefined ? null : Number(first.eventsIngestionStatus.recordCount),
    errorCounts: counts(first?.errorInfo?.errorCounts),
    warningCounts: counts(first?.warningInfo?.warningCounts),
  };
}

// ── Normalisation and hashing, per Google's "Format user data" rules ─────

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Lower case, whitespace removed; for gmail.com and googlemail.com the dots
 * in the local part are removed as well. Null when it is not an address.
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(/\s+/g, "").toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1 || !value.includes(".", at)) return null;
  let local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/**
 * E.164 only: a leading plus followed by 8 to 15 digits. Punctuation and
 * spaces are dropped, "00" becomes "+". A number with no country code is
 * refused rather than guessed, because a wrong identifier is worse than
 * none. The website already sends Nigerian numbers in international form.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // "(0)" is the written trunk prefix ("+44 (0)7555 ..."), never part of the
  // international number, so it goes before the ordinary punctuation does.
  let value = raw.replace(/\(0\)/g, "").replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return null;
  return value;
}

export function emailIdentifier(raw: string | null | undefined): UserIdentifier | null {
  const n = normaliseEmail(raw);
  return n ? { emailAddress: sha256Hex(n) } : null;
}

export function phoneIdentifier(raw: string | null | undefined): UserIdentifier | null {
  const n = normalisePhone(raw);
  return n ? { phoneNumber: sha256Hex(n) } : null;
}
