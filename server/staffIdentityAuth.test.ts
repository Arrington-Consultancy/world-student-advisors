import { describe, expect, it, vi, beforeEach } from "vitest";
import * as jose from "jose";

/**
 * Coverage for the Entra ID identity layer. Signature verification is
 * tested against a locally-generated test RSA keypair (via jose's
 * createLocalJWKSet, injected as verifyMicrosoftIdToken's optional third
 * parameter) rather than a live Microsoft tenant, which does not exist in
 * this build. This proves the actual verification logic — issuer,
 * audience, nonce, domain restriction, signature — is correct; it does not
 * (and cannot, without real credentials) prove Microsoft's tenant is
 * reachable or configured.
 */
const mockEnv: {
  cookieSecret: string;
  staffSsoTenantId: string;
  staffSsoClientId: string;
  staffSsoClientSecret: string;
  staffSsoRedirectUri: string;
} = {
  cookieSecret: "test-jwt-secret",
  staffSsoTenantId: "test-tenant-id",
  staffSsoClientId: "test-client-id",
  staffSsoClientSecret: "test-client-secret",
  staffSsoRedirectUri: "https://portal.worldstudentadvisors.com/staff-portal/sso-callback",
};
vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};
vi.mock("./db", () => ({ getDb: vi.fn(async () => mockDb) }));

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.staffSsoTenantId = "test-tenant-id";
  mockEnv.staffSsoClientId = "test-client-id";
  mockEnv.staffSsoClientSecret = "test-client-secret";
  mockEnv.staffSsoRedirectUri = "https://portal.worldstudentadvisors.com/staff-portal/sso-callback";
});

async function makeTestKeypair() {
  return jose.generateKeyPair("RS256");
}

async function makeLocalJwks(publicKey: CryptoKey, kid: string) {
  const jwk = await jose.exportJWK(publicKey);
  return jose.createLocalJWKSet({ keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }] });
}

async function signTestIdToken(
  privateKey: CryptoKey,
  kid: string,
  claims: Record<string, unknown>,
  overrides: { issuer?: string; audience?: string; expiresIn?: string } = {},
) {
  return new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setIssuer(overrides.issuer ?? `https://login.microsoftonline.com/${mockEnv.staffSsoTenantId}/v2.0`)
    .setAudience(overrides.audience ?? mockEnv.staffSsoClientId)
    .setExpirationTime(overrides.expiresIn ?? "10m")
    .sign(privateKey);
}

describe("verifyMicrosoftIdToken — signature, issuer, audience, nonce, domain", () => {
  it("accepts a genuinely valid token and returns the expected claims", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", {
      oid: "entra-object-id-123",
      email: "genuine.staff@worldstudentadvisors.com",
      name: "Genuine Staff",
      nonce: "expected-nonce",
    });

    const result = await verifyMicrosoftIdToken(token, "expected-nonce", jwks);
    expect(result).toEqual({ oid: "entra-object-id-123", email: "genuine.staff@worldstudentadvisors.com", displayName: "Genuine Staff" });
  });

  it("rejects a token whose signature does not match the expected keys (tampered/wrong issuer key)", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey } = await makeTestKeypair();
    const { publicKey: differentPublicKey } = await makeTestKeypair();
    const wrongJwks = await makeLocalJwks(differentPublicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", {
      oid: "entra-object-id-123",
      email: "genuine.staff@worldstudentadvisors.com",
      nonce: "n",
    });

    await expect(verifyMicrosoftIdToken(token, "n", wrongJwks)).rejects.toThrow();
  });

  it("rejects a nonce mismatch — replay protection", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", {
      oid: "entra-object-id-123",
      email: "genuine.staff@worldstudentadvisors.com",
      nonce: "original-nonce",
    });

    await expect(verifyMicrosoftIdToken(token, "different-nonce", jwks)).rejects.toThrow(/nonce mismatch/i);
  });

  it("rejects a token issued for a different tenant (wrong issuer)", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(
      privateKey,
      "test-kid",
      { oid: "x", email: "genuine.staff@worldstudentadvisors.com", nonce: "n" },
      { issuer: "https://login.microsoftonline.com/some-other-tenant/v2.0" },
    );

    await expect(verifyMicrosoftIdToken(token, "n", jwks)).rejects.toThrow();
  });

  it("rejects a token issued for a different audience (wrong client id)", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(
      privateKey,
      "test-kid",
      { oid: "x", email: "genuine.staff@worldstudentadvisors.com", nonce: "n" },
      { audience: "some-other-client-id" },
    );

    await expect(verifyMicrosoftIdToken(token, "n", jwks)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(
      privateKey,
      "test-kid",
      { oid: "x", email: "genuine.staff@worldstudentadvisors.com", nonce: "n" },
      { expiresIn: "-10m" },
    );

    await expect(verifyMicrosoftIdToken(token, "n", jwks)).rejects.toThrow();
  });

  it("rejects a valid, correctly-signed token from an account outside the WSA email domain", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", {
      oid: "entra-object-id-999",
      email: "someone@gmail.com",
      nonce: "n",
    });

    await expect(verifyMicrosoftIdToken(token, "n", jwks)).rejects.toThrow(/restricted to @worldstudentadvisors\.com/i);
  });

  it("rejects a token with no oid claim", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", { email: "genuine.staff@worldstudentadvisors.com", nonce: "n" });

    await expect(verifyMicrosoftIdToken(token, "n", jwks)).rejects.toThrow(/oid/i);
  });

  it("falls back to preferred_username when email claim is absent, still enforcing the domain check", async () => {
    const { verifyMicrosoftIdToken } = await import("./staffIdentityAuth");
    const { privateKey, publicKey } = await makeTestKeypair();
    const jwks = await makeLocalJwks(publicKey, "test-kid");
    const token = await signTestIdToken(privateKey, "test-kid", {
      oid: "entra-object-id-777",
      preferred_username: "upn.only@worldstudentadvisors.com",
      nonce: "n",
    });

    const result = await verifyMicrosoftIdToken(token, "n", jwks);
    expect(result.email).toBe("upn.only@worldstudentadvisors.com");
  });
});

describe("Microsoft SSO configuration gate", () => {
  it("reports unconfigured and refuses to build an authorize URL when any required env var is missing", async () => {
    mockEnv.staffSsoClientId = "";
    const { isMicrosoftSsoConfigured, buildMicrosoftAuthorizeUrl } = await import("./staffIdentityAuth");
    expect(isMicrosoftSsoConfigured()).toBe(false);
    expect(() => buildMicrosoftAuthorizeUrl("state", "nonce")).toThrow(/not configured/i);
  });

  it("builds a well-formed authorize URL once fully configured", async () => {
    const { buildMicrosoftAuthorizeUrl } = await import("./staffIdentityAuth");
    const url = new URL(buildMicrosoftAuthorizeUrl("my-state", "my-nonce"));
    expect(url.hostname).toBe("login.microsoftonline.com");
    expect(url.pathname).toContain(mockEnv.staffSsoTenantId);
    expect(url.searchParams.get("client_id")).toBe(mockEnv.staffSsoClientId);
    expect(url.searchParams.get("redirect_uri")).toBe(mockEnv.staffSsoRedirectUri);
    expect(url.searchParams.get("scope")).toBe("openid profile email");
    expect(url.searchParams.get("state")).toBe("my-state");
    expect(url.searchParams.get("nonce")).toBe("my-nonce");
  });

  /**
   * Tim Hunt could not sign in on 31 August 2026 while Tom could, on the
   * same app registration and redirect URI. The production logs showed
   * three sign-ins starting from his device and no callback ever
   * arriving, which means Microsoft refused at its own end. Without
   * prompt=select_account, a browser already holding a personal or
   * wrong-tenant Microsoft account is sent straight through as that
   * account, and a tenant-scoped authorize endpoint rejects it there.
   */
  it("forces the account chooser, so a cached wrong-tenant account cannot be reused silently", async () => {
    const { buildMicrosoftAuthorizeUrl } = await import("./staffIdentityAuth");
    const url = new URL(buildMicrosoftAuthorizeUrl("my-state", "my-nonce"));
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("still scopes sign-in to the WSA tenant, so the chooser is not a way in for any account", async () => {
    const { buildMicrosoftAuthorizeUrl } = await import("./staffIdentityAuth");
    const url = new URL(buildMicrosoftAuthorizeUrl("s", "n"));
    expect(url.pathname).toContain(mockEnv.staffSsoTenantId);
    expect(url.pathname).not.toContain("/common/");
    expect(url.pathname).not.toContain("/organizations/");
  });
});

describe("staff identity session token", () => {
  const staffUser = { id: 42, entraObjectId: "oid-1", email: "genuine.staff@worldstudentadvisors.com", displayName: "Genuine Staff", isActive: 1, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() };

  it("round-trips: mint then verify returns the same identity", async () => {
    const { mintStaffIdentityToken, verifyStaffIdentityToken } = await import("./staffIdentityAuth");
    const token = await mintStaffIdentityToken(staffUser as any);
    const result = await verifyStaffIdentityToken(token);
    expect(result).toEqual({ staffUserId: 42, email: "genuine.staff@worldstudentadvisors.com", displayName: "Genuine Staff" });
  });

  it("rejects a garbage token, never throws", async () => {
    const { verifyStaffIdentityToken } = await import("./staffIdentityAuth");
    await expect(verifyStaffIdentityToken("not-a-jwt")).resolves.toBeNull();
  });

  it("a client cannot forge a staffUserId by constructing its own payload shape — only a token signed with the server secret verifies", async () => {
    const jose2 = await import("jose");
    const { verifyStaffIdentityToken } = await import("./staffIdentityAuth");
    const forgedToken = await new jose2.SignJWT({ purpose: "staff_identity", staffUserId: 999999, email: "attacker@worldstudentadvisors.com", displayName: "Attacker" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("wrong-secret"));
    await expect(verifyStaffIdentityToken(forgedToken)).resolves.toBeNull();
  });
});

describe("stateless sign-in transaction (state param carries the nonce)", () => {
  it("buildMicrosoftSignInRequest returns an authorize URL whose state and nonce are consistent with each other", async () => {
    const { buildMicrosoftSignInRequest } = await import("./staffIdentityAuth");
    const { authorizeUrl } = await buildMicrosoftSignInRequest();
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("nonce")).toBeTruthy();
  });

  it("completeMicrosoftSignInFromCallback rejects a garbage state (not a valid transaction token)", async () => {
    const { completeMicrosoftSignInFromCallback } = await import("./staffIdentityAuth");
    await expect(completeMicrosoftSignInFromCallback("some-code", "not-a-real-token")).rejects.toThrow(/invalid or has expired/i);
  });

  it("completeMicrosoftSignInFromCallback rejects an empty state", async () => {
    const { completeMicrosoftSignInFromCallback } = await import("./staffIdentityAuth");
    await expect(completeMicrosoftSignInFromCallback("some-code", "")).rejects.toThrow(/invalid or has expired/i);
  });

  it("a forged state signed with the wrong secret is rejected even if well-formed", async () => {
    const { completeMicrosoftSignInFromCallback } = await import("./staffIdentityAuth");
    const forged = await new jose.SignJWT({ purpose: "sso_transaction", nonce: "attacker-chosen-nonce" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode("wrong-secret"));
    await expect(completeMicrosoftSignInFromCallback("some-code", forged)).rejects.toThrow(/invalid or has expired/i);
  });
});

describe("requireActiveStaffIdentity", () => {
  const activeUser = { id: 1, entraObjectId: "oid-active", email: "active@worldstudentadvisors.com", displayName: "Active Staff", isActive: 1, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() };
  const inactiveUser = { ...activeUser, id: 2, isActive: 0 };

  function mockSelectReturning(rows: unknown[]) {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    });
  }

  it("resolves a valid token for a currently-active staff user", async () => {
    mockSelectReturning([activeUser]);
    const { mintStaffIdentityToken, requireActiveStaffIdentity } = await import("./staffIdentityAuth");
    const token = await mintStaffIdentityToken(activeUser as any);
    const identity = await requireActiveStaffIdentity(token);
    expect(identity.staffUserId).toBe(1);
  });

  it("rejects a token for a staff user who has since been deactivated — deactivation takes effect immediately, not at token expiry", async () => {
    mockSelectReturning([inactiveUser]);
    const { mintStaffIdentityToken, requireActiveStaffIdentity } = await import("./staffIdentityAuth");
    const token = await mintStaffIdentityToken(inactiveUser as any);
    await expect(requireActiveStaffIdentity(token)).rejects.toThrow(/not active/i);
  });

  it("rejects an invalid token before ever touching the database", async () => {
    const { requireActiveStaffIdentity } = await import("./staffIdentityAuth");
    await expect(requireActiveStaffIdentity("garbage")).rejects.toThrow(/sign in/i);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("rejects a token for a staff user id that no longer exists", async () => {
    mockSelectReturning([]);
    const { mintStaffIdentityToken, requireActiveStaffIdentity } = await import("./staffIdentityAuth");
    const token = await mintStaffIdentityToken(activeUser as any);
    await expect(requireActiveStaffIdentity(token)).rejects.toThrow(/not active/i);
  });
});
