/**
 * Tests for portal-google-auth.ts callback handler — specifically the login
 * branch's handling of the new discriminated FindGoogleUserResult.
 *
 * We mock findGoogleUserForLogin so we can test each status branch:
 * - ok        → redirects to /portal/login?token=...
 * - not_found → redirects to /portal/login?error=google_no_account
 * - inactive  → redirects to /portal/login?error=google_account_inactive
 * - conflict  → redirects to /portal/login?error=google_account_conflict
 * - db_unavailable → redirects to /portal/login?error=google_account
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import type { Server } from "http";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./portal-auth", () => ({
  findGoogleUserForLogin: vi.fn(),
  mintSignupPrefillToken: vi.fn(),
  createPortalUser: vi.fn(),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPortalToken: vi.fn(),
  getPortalUserById: vi.fn(),
  verifySignupPrefillToken: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    googleClientId: "test-client-id",
    googleClientSecret: "test-client-secret",
    cookieSecret: "test-secret",
  },
}));

// Mock jose to avoid real JWKS fetch and provide a controllable verifyJwt
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(),
    jwtVerify: vi.fn(),
  };
});

const { findGoogleUserForLogin } = await import("./portal-auth");
const jose = await import("jose");
const mockedFindGoogleUserForLogin = vi.mocked(findGoogleUserForLogin);
const mockedJwtVerify = vi.mocked(jose.jwtVerify);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal express app with only the Google auth routes registered.
 * Returns the app (we use supertest-style manual fetch via Node http).
 */
async function buildApp() {
  const app = express();
  const { registerGoogleAuthRoutes } = await import("./portal-google-auth");
  registerGoogleAuthRoutes(app);
  return app;
}

/**
 * Fire the callback handler directly with a pre-baked environment, bypassing
 * the real OAuth code-exchange and JWKS verification by injecting mocks.
 *
 * Returns the redirect location header.
 */
async function invokeCallback(
  app: express.Express,
  overrides: { nonce?: string; cookieNonce?: string; code?: string } = {},
): Promise<{ location: string; status: number }> {
  const nonce = overrides.nonce ?? "test-nonce-abc";
  const cookieNonce = overrides.cookieNonce ?? nonce;
  const code = overrides.code ?? "valid-auth-code";

  const state = Buffer.from(
    JSON.stringify({
      nonce,
      redirectUri: "http://localhost:3000/api/portal/auth/google/callback",
      flow: "login",
    }),
  ).toString("base64url");

  // Mock the Google token exchange fetch
  const fakeIdToken = "fake-id-token";
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: fakeIdToken }),
    text: async () => "",
  } as unknown as Response);

  // Mock jose jwtVerify to return controlled claims
  mockedJwtVerify.mockResolvedValue({
    payload: {
      sub: "google-sub-xyz",
      email: "user@example.com",
      given_name: "Test",
      family_name: "User",
      email_verified: true,
    },
    protectedHeader: { alg: "RS256" },
  } as unknown as jose.JWTVerifyResult & jose.ResolvedKey);

  return new Promise((resolve) => {
    const req = {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        cookie: `__Host-portal_oauth_state=${cookieNonce}`,
      },
      query: { code, state },
      socket: { remoteAddress: "10.0.0.1" },
    } as unknown as express.Request;

    const res = {
      _location: "",
      _status: 302,
      setHeader: vi.fn(),
      status(s: number) {
        this._status = s;
        return this;
      },
      send: vi.fn((msg: string) => {
        resolve({ location: msg, status: res._status });
      }),
      redirect(urlOrStatus: string | number, url?: string) {
        const location = typeof urlOrStatus === "string" ? urlOrStatus : (url as string);
        resolve({ location, status: 302 });
      },
    } as unknown as express.Response;

    // Call the registered callback route handler directly
    (app as unknown as { _router: { handle: (req: unknown, res: unknown, next: unknown) => void } })._router.handle(
      Object.assign(req, { url: `/api/portal/auth/google/callback?code=${code}&state=${state}`, method: "GET", path: "/api/portal/auth/google/callback" }),
      res,
      () => resolve({ location: "next-called", status: 404 }),
    );
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("portal-google-auth callback: login flow result routing", () => {
  it("redirects to /portal/login with token on status=ok", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({
      status: "ok",
      token: "portal-jwt-123",
      user: { id: 1, email: "user@example.com", firstName: "Test", lastName: "User" },
    });

    const { location } = await invokeCallback(app);

    expect(location).toContain("/portal/login");
    expect(location).toContain("token=portal-jwt-123");
    expect(location).not.toContain("error=");
  });

  it("redirects to /portal/login?error=google_no_account on status=not_found", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "not_found" });

    const { location } = await invokeCallback(app);

    expect(location).toContain("error=google_no_account");
    expect(location).not.toContain("error=google_account");
    expect(location).not.toContain("token=");
  });

  it("redirects to /portal/login?error=google_account on status=db_unavailable", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "db_unavailable" });

    const { location } = await invokeCallback(app);

    expect(location).toContain("error=google_account");
    expect(location).not.toContain("error=google_no_account");
    expect(location).not.toContain("token=");
  });

  it("redirects to /portal/login?error=google_account_inactive on status=inactive", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "inactive" });

    const { location } = await invokeCallback(app);

    expect(location).toContain("error=google_account_inactive");
    expect(location).not.toContain("error=google_no_account");
    expect(location).not.toContain("error=google_account_conflict");
    expect(location).not.toContain("token=");
  });

  it("redirects to /portal/login?error=google_account_conflict on status=conflict", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "conflict" });

    const { location } = await invokeCallback(app);

    expect(location).toContain("error=google_account_conflict");
    expect(location).not.toContain("error=google_no_account");
    expect(location).not.toContain("error=google_account_inactive");
    expect(location).not.toContain("token=");
  });

  it("does not create a portal user on not_found — createPortalUser is never called", async () => {
    const app = await buildApp();
    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "not_found" });
    const { createPortalUser } = await import("./portal-auth");

    await invokeCallback(app);

    expect(vi.mocked(createPortalUser)).not.toHaveBeenCalled();
  });

  it("google_no_account error is distinct from the db_unavailable google_account error", async () => {
    const app = await buildApp();

    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "not_found" });
    const { location: notFoundLoc } = await invokeCallback(app);

    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "db_unavailable" });
    const { location: dbLoc } = await invokeCallback(app);

    expect(notFoundLoc).not.toBe(dbLoc);
    expect(notFoundLoc).toContain("google_no_account");
    expect(dbLoc).toContain("google_account");
    expect(dbLoc).not.toContain("google_no_account");
  });

  it("uses distinct error params for no account, inactive, and conflict states", async () => {
    const app = await buildApp();

    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "not_found" });
    const { location: notFoundLoc } = await invokeCallback(app);

    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "inactive" });
    const { location: inactiveLoc } = await invokeCallback(app);

    mockedFindGoogleUserForLogin.mockResolvedValue({ status: "conflict" });
    const { location: conflictLoc } = await invokeCallback(app);

    expect(notFoundLoc).toContain("google_no_account");
    expect(inactiveLoc).toContain("google_account_inactive");
    expect(conflictLoc).toContain("google_account_conflict");
    expect(inactiveLoc).not.toContain("google_no_account");
    expect(conflictLoc).not.toContain("google_no_account");
  });
});
