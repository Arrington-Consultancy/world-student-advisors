import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

/**
 * The WSA Pipedrive OAuth application, tested at the edges Tom set on
 * 11 September 2026 and widened by him on 16 September 2026 (Change Entry
 * 100): scopes fixed to the approved set; nothing outside it ever stored;
 * tokens sealed before the database and never in a URL, log or
 * audit row; refresh handled properly and single-flight; the website's
 * API token untouched; nothing Arrington.
 */
vi.mock("../db", () => ({ getDb: async () => null }));

const oauth = await import("./pipedriveOAuth");
const { pipedriveOAuthAuth, OAUTH_STATUS_MESSAGE } = await import("./pipedriveOAuthAuth");

const KEY = randomBytes(32).toString("base64");
const CFG = { clientId: "wsa-client-id", clientSecret: "wsa-client-secret-value", tokenKey: KEY, redirectUri: "https://www.worldstudentadvisors.com/api/connectors/pipedrive/callback" };
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => { oauth.resetPipedriveOAuthCache(); });
afterEach(() => { process.env = { ...ORIGINAL_ENV }; oauth.resetPipedriveOAuthCache(); vi.restoreAllMocks(); });

function tokenJson(over: Record<string, unknown> = {}) {
  return { access_token: "access-token-value-1234567890", refresh_token: "refresh-token-value-1234567890", expires_in: 3599, api_domain: "https://worldstudentadvisors.pipedrive.com", scope: "base leads:read deals:read contacts:read search:read", token_type: "Bearer", ...over };
}

describe("scopes are fixed to the approved set of Change Entry 100, and checked", () => {
  it("names exactly the approved set: read and full on deals, contacts and leads, plus base and search; never admin, mail, users or activities", () => {
    expect([...oauth.PIPEDRIVE_OAUTH_SCOPES]).toEqual(["base", "leads:read", "leads:full", "deals:read", "deals:full", "contacts:read", "contacts:full", "search:read"]);
    for (const s of oauth.PIPEDRIVE_OAUTH_SCOPES) expect(s).not.toMatch(/^(admin|mail|users|activities|products|projects|goals|webhooks|recents|phone|video|messengers)/);
    expect(oauth.PIPEDRIVE_CONNECTOR_AUTHORITY).toContain("16 September 2026");
    expect(oauth.PIPEDRIVE_CONNECTOR_AUTHORITY).toContain("no worker write granted");
  });
  it("accepts the read-only set and the approved :full scopes, and flags anything outside the set", () => {
    expect(oauth.scopesOutsideApproved("base leads:read deals:read contacts:read search:read")).toEqual([]);
    expect(oauth.scopesOutsideApproved("base leads:full deals:full contacts:full search:read")).toEqual([]);
    expect(oauth.scopesOutsideApproved("base leads:read deals:full")).toEqual([]);
    expect(oauth.scopesOutsideApproved("base,contacts:read,admin")).toEqual(["admin"]);
    expect(oauth.scopesOutsideApproved("base deals:full mail:full")).toEqual(["mail:full"]);
    expect(oauth.scopesOutsideApproved("base deals:full users:read activities:full")).toEqual(["users:read", "activities:full"]);
    expect(oauth.scopesOutsideApproved("")).toEqual([]);
  });
  it("the authorise URL names the client, the callback and the state, and no scope override and no secret", () => {
    const url = new URL(oauth.buildAuthoriseUrl(CFG, "state-token"));
    expect(url.origin + url.pathname).toBe(oauth.PIPEDRIVE_AUTHORISE_URL);
    expect(url.searchParams.get("client_id")).toBe("wsa-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(CFG.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-token");
    expect(url.toString()).not.toContain("wsa-client-secret-value");
  });
  it("the callback is on the public WSA site, not an Arrington domain", () => {
    expect(oauth.redirectUriFor("https://www.worldstudentadvisors.com/")).toBe("https://www.worldstudentadvisors.com/api/connectors/pipedrive/callback");
    expect(oauth.redirectUriFor("https://www.worldstudentadvisors.com")).not.toMatch(/arrington/i);
  });
});

describe("configuration is presence only and separate from the website's token", () => {
  it("is null until all three variables are present", () => {
    expect(oauth.oauthConfig({})).toBeNull();
    expect(oauth.oauthConfig({ PIPEDRIVE_OAUTH_CLIENT_ID: "a", PIPEDRIVE_OAUTH_CLIENT_SECRET: "b" })).toBeNull();
    expect(oauth.oauthConfig({ PIPEDRIVE_OAUTH_CLIENT_ID: "a", PIPEDRIVE_OAUTH_CLIENT_SECRET: "b", PIPEDRIVE_OAUTH_TOKEN_KEY: KEY })).not.toBeNull();
  });
  it("ignores PIPEDRIVE_API_TOKEN and WORKFORCE_PIPEDRIVE_API_TOKEN entirely", () => {
    expect(oauth.oauthConfig({ PIPEDRIVE_API_TOKEN: "website", WORKFORCE_PIPEDRIVE_API_TOKEN: "old" })).toBeNull();
    const code = ["pipedriveOAuth.ts", "pipedriveOAuthAuth.ts", "pipedriveOAuthRoutes.ts"]
      .map(f => readFileSync(new URL(`./${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))
      .join("\n");
    expect(code).not.toMatch(/PIPEDRIVE_API_TOKEN/);
    expect(code).not.toMatch(/pipedriveApiToken/);
    expect(code).not.toMatch(/api_token/);
    expect(code).not.toMatch(/arrington/i);
  });
});

describe("state token: who started consent, for ten minutes", () => {
  it("round-trips the staff id and is bound to the audience", async () => {
    const state = await oauth.signState(42, KEY);
    expect(await oauth.verifyState(state, KEY)).toEqual({ staffUserId: 42 });
  });
  it("is rejected when tampered, expired, or signed under a different key", async () => {
    const state = await oauth.signState(42, KEY);
    expect(await oauth.verifyState(state + "x", KEY)).toBeNull();
    expect(await oauth.verifyState(state, randomBytes(32).toString("base64"))).toBeNull();
    const old = await oauth.signState(42, KEY, new Date(Date.now() - 11 * 60 * 1000));
    expect(await oauth.verifyState(old, KEY)).toBeNull();
  });
});

describe("tokens are sealed before they touch the database", () => {
  it("seal and open round-trip, ciphertext never contains the plaintext, and a wrong key fails", () => {
    const sealed = oauth.seal("access-token-value-1234567890", KEY);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("access-token-value");
    expect(oauth.open(sealed, KEY)).toBe("access-token-value-1234567890");
    expect(() => oauth.open(sealed, randomBytes(32).toString("base64"))).toThrow();
  });
  it("refuses a key that is not 32 bytes", () => {
    expect(() => oauth.seal("x", Buffer.from("short").toString("base64"))).toThrow(/32 bytes/);
  });
});

describe("token responses are validated, and refresh timing has a five-minute margin", () => {
  it("parses a well-formed response and computes expiry", () => {
    const now = new Date("2026-09-11T10:00:00Z");
    const t = oauth.parseTokenResponse(tokenJson(), now);
    expect(t?.apiDomain).toBe("https://worldstudentadvisors.pipedrive.com");
    expect(t?.expiresAt.toISOString()).toBe("2026-09-11T10:59:59.000Z");
    expect(t?.scope).toContain("leads:read");
  });
  it("rejects a missing refresh token, a bad expiry, or an api_domain that is not a pipedrive.com company host", () => {
    expect(oauth.parseTokenResponse(tokenJson({ refresh_token: undefined }))).toBeNull();
    expect(oauth.parseTokenResponse(tokenJson({ expires_in: 0 }))).toBeNull();
    expect(oauth.parseTokenResponse(tokenJson({ api_domain: "https://evil.example.com" }))).toBeNull();
    expect(oauth.parseTokenResponse(tokenJson({ api_domain: "http://worldstudentadvisors.pipedrive.com" }))).toBeNull();
  });
  it("shouldRefresh is true inside the last five minutes and false before", () => {
    const now = new Date("2026-09-11T10:00:00Z");
    expect(oauth.shouldRefresh(new Date("2026-09-11T10:04:00Z"), now)).toBe(true);
    expect(oauth.shouldRefresh(new Date("2026-09-11T10:06:00Z"), now)).toBe(false);
  });
});

describe("the token endpoint is called with client credentials in the header, never in a URL", () => {
  it("exchanges a code with Basic client auth and the registered redirect", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(tokenJson()), { status: 200 }));
    const t = await oauth.exchangeAuthorisationCode("the-code", CFG, fetchImpl as never);
    expect(t.accessToken).toBe("access-token-value-1234567890");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(oauth.PIPEDRIVE_TOKEN_URL);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("wsa-client-id:wsa-client-secret-value").toString("base64")}`);
    const body = new URLSearchParams(String(init.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("redirect_uri")).toBe(CFG.redirectUri);
    expect(url).not.toContain("wsa-client-secret-value");
  });
  it("refreshes with the refresh_token grant and surfaces a refusal as an error, not a token", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
    await expect(oauth.refreshAccessToken("old-refresh", CFG, fetchImpl as never)).rejects.toThrow(/invalid_grant/);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URLSearchParams(String(init.body)).get("grant_type")).toBe("refresh_token");
  });
});

describe("access fails closed", () => {
  it("is unconfigured with no variables and the strategy throws a plain message before any request", async () => {
    delete process.env.PIPEDRIVE_OAUTH_CLIENT_ID; delete process.env.PIPEDRIVE_OAUTH_CLIENT_SECRET; delete process.env.PIPEDRIVE_OAUTH_TOKEN_KEY;
    expect(await oauth.getPipedriveOAuthAccess()).toEqual({ ok: false, status: "unconfigured" });
    expect(oauth.pipedriveOAuthStatusSync()).toBe("unconfigured");
    await expect(pipedriveOAuthAuth.headers()).rejects.toThrow(OAUTH_STATUS_MESSAGE.unconfigured);
  });
  it("is not_authorised when configured but no grant has been stored (no database here)", async () => {
    process.env.PIPEDRIVE_OAUTH_CLIENT_ID = "a"; process.env.PIPEDRIVE_OAUTH_CLIENT_SECRET = "b"; process.env.PIPEDRIVE_OAUTH_TOKEN_KEY = KEY;
    expect(await oauth.getPipedriveOAuthAccess()).toEqual({ ok: false, status: "not_authorised" });
    expect(oauth.pipedriveOAuthStatusSync()).toBe("not_authorised");
    await expect(pipedriveOAuthAuth.baseUrl()).rejects.toThrow(OAUTH_STATUS_MESSAGE.not_authorised);
    expect(await oauth.warmPipedriveOAuth()).toBe("not_authorised");
  });
  it("the status messages never carry a token shape", () => {
    for (const m of Object.values(OAUTH_STATUS_MESSAGE)) expect(m).not.toMatch(/[a-z0-9]{32,}/i);
  });
});
