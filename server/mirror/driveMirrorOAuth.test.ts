import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

vi.mock("../db", () => ({ getDb: async () => null }));
const m = await import("./driveMirrorOAuth");

const KEY = randomBytes(32).toString("base64");
const CFG = { clientId: "mirror-client", clientSecret: "mirror-secret-value", tokenKey: KEY, redirectUri: "https://www.worldstudentadvisors.com/api/connectors/drive-mirror/callback" };
const ORIGINAL_ENV = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL_ENV }; m.resetDriveMirrorOAuthCache(); });

describe("the Google credential is drive.file and nothing else", () => {
  it("asks for exactly drive.file, offline access, and a dedicated client", () => {
    const url = new URL(m.buildDriveAuthoriseUrl(CFG, "s"));
    expect(url.origin + url.pathname).toBe(m.GOOGLE_AUTHORISE_URL);
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("include_granted_scopes")).toBe("false");
    expect(url.searchParams.get("client_id")).toBe("mirror-client");
    expect(url.toString()).not.toContain("mirror-secret-value");
  });
  it("refuses any wider scope on return", () => {
    expect(m.driveScopesOutsideApproved("https://www.googleapis.com/auth/drive.file")).toEqual([]);
    expect(m.driveScopesOutsideApproved("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive")).toEqual(["https://www.googleapis.com/auth/drive"]);
    expect(m.driveScopesOutsideApproved("https://www.googleapis.com/auth/drive.readonly")).toEqual(["https://www.googleapis.com/auth/drive.readonly"]);
  });
  it("uses its own client variables, never the staff sign-in client, and never the worker Drive service-account variables", () => {
    expect(m.driveOAuthConfig({ GOOGLE_CLIENT_ID: "staff", GOOGLE_CLIENT_SECRET: "staff", PIPEDRIVE_OAUTH_TOKEN_KEY: KEY })).toBeNull();
    expect(m.driveOAuthConfig({ GOOGLE_MIRROR_CLIENT_ID: "a", GOOGLE_MIRROR_CLIENT_SECRET: "b", PIPEDRIVE_OAUTH_TOKEN_KEY: KEY })).not.toBeNull();
    const code = ["driveMirrorOAuth.ts", "driveMirrorRoutes.ts", "driveClient.ts", "sync.ts", "reader.ts"]
      .map(f => readFileSync(new URL(`./${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n");
    expect(code).not.toMatch(/GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|googleClientId/);
    expect(code).not.toMatch(/WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON/);
    expect(code).not.toMatch(/auth\/drive"|auth\/drive\.readonly|auth\/drive\.metadata/);
  });
  it("a grant without a refresh token is not kept", async () => {
    await expect(m.storeDriveGrant({ accessToken: "a", refreshToken: null, expiresAt: new Date(), scope: m.DRIVE_MIRROR_SCOPE }, 1, CFG)).rejects.toThrow(/refresh token/);
  });
  it("state round-trips and rejects forgery", async () => {
    const st = await m.signDriveState(7, KEY);
    expect(await m.verifyDriveState(st, KEY)).toEqual({ staffUserId: 7 });
    expect(await m.verifyDriveState(st + "x", KEY)).toBeNull();
  });
  it("fails closed when unconfigured or unauthorised", async () => {
    delete process.env.GOOGLE_MIRROR_CLIENT_ID; delete process.env.GOOGLE_MIRROR_CLIENT_SECRET;
    expect(await m.getDriveMirrorAccess()).toEqual({ ok: false, status: "unconfigured" });
    process.env.GOOGLE_MIRROR_CLIENT_ID = "a"; process.env.GOOGLE_MIRROR_CLIENT_SECRET = "b"; process.env.PIPEDRIVE_OAUTH_TOKEN_KEY = KEY;
    expect(await m.getDriveMirrorAccess()).toEqual({ ok: false, status: "not_authorised" });
  });
  it("token requests put the client secret in the body, never the URL", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3599, scope: m.DRIVE_MIRROR_SCOPE }), { status: 200 }));
    const t = await m.exchangeDriveCode("code", CFG, fetchImpl as never);
    expect(t.refreshToken).toBe("rt");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(m.GOOGLE_TOKEN_URL);
    expect(url).not.toContain("mirror-secret-value");
    expect(new URLSearchParams(String(init.body)).get("client_secret")).toBe("mirror-secret-value");
  });
});
