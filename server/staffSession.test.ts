import { describe, expect, it, vi, beforeEach } from "vitest";
import * as jose from "jose";

/**
 * Coverage for resolveStaffSession — the single gate protected workforce
 * procedures use to turn an opaque token into a structurally-labelled
 * staff session. Proves the two token types can never cross-verify, a
 * client cannot forge an individual identity, deactivation takes effect
 * immediately, and the absence of Entra configuration leaves only the
 * legacy path (never widens access).
 */
const mockEnv: {
  cookieSecret: string;
  staffPortalPasswordHash: string;
  staffSsoTenantId: string;
  staffSsoClientId: string;
  staffSsoClientSecret: string;
  staffSsoRedirectUri: string;
} = {
  cookieSecret: "test-jwt-secret",
  staffPortalPasswordHash: "",
  staffSsoTenantId: "",
  staffSsoClientId: "",
  staffSsoClientSecret: "",
  staffSsoRedirectUri: "",
};
vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockGetDb = vi.fn(async () => mockDb as any);
vi.mock("./db", () => ({ getDb: mockGetDb }));

const bcrypt = (await import("bcryptjs")).default;
const { resolveStaffSession } = await import("./staffSession");
const { authenticateStaffPortal } = await import("./staffPortalAuth");
const { mintStaffIdentityToken } = await import("./staffIdentityAuth");

const TEST_PASSWORD = "TestPass123!";
const testHash = await bcrypt.hash(TEST_PASSWORD, 12);

const activeStaffUser = {
  id: 7,
  entraObjectId: "oid-7",
  email: "named.staff@worldstudentadvisors.com",
  displayName: "Named Staff",
  isActive: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

function mockStaffUserLookup(rows: unknown[]) {
  mockDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => rows }) }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDb.mockResolvedValue(mockDb as any);
  mockEnv.staffPortalPasswordHash = testHash;
});

describe("resolveStaffSession — shared-password path", () => {
  it("resolves a shared-password token as shared_password with no individual identity, never touching the database", async () => {
    const token = (await authenticateStaffPortal(TEST_PASSWORD)) as string;
    const session = await resolveStaffSession(token);
    expect(session).toEqual({ authMethod: "shared_password", staffUserId: null });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("works identically when Entra is entirely unconfigured — missing configuration never blocks the legacy path", async () => {
    mockEnv.staffSsoTenantId = "";
    mockEnv.staffSsoClientId = "";
    const token = (await authenticateStaffPortal(TEST_PASSWORD)) as string;
    const session = await resolveStaffSession(token);
    expect(session.authMethod).toBe("shared_password");
  });
});

describe("resolveStaffSession — Entra individual-identity path", () => {
  it("resolves a genuine identity token to the named principal, re-checking the live staff_users row", async () => {
    mockStaffUserLookup([activeStaffUser]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    const session = await resolveStaffSession(token);
    expect(session).toEqual({
      authMethod: "entra_sso",
      staffUserId: 7,
      email: "named.staff@worldstudentadvisors.com",
      displayName: "Named Staff",
    });
  });

  it("rejects an identity token whose staff user has since been deactivated", async () => {
    mockStaffUserLookup([{ ...activeStaffUser, isActive: 0 }]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    await expect(resolveStaffSession(token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an identity token whose staff user row no longer exists", async () => {
    mockStaffUserLookup([]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    await expect(resolveStaffSession(token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("resolveStaffSession — the two token types can never cross-verify", () => {
  it("a shared-password token never resolves as an individual identity", async () => {
    const token = (await authenticateStaffPortal(TEST_PASSWORD)) as string;
    const session = await resolveStaffSession(token);
    expect(session.authMethod).not.toBe("entra_sso");
    expect(session.staffUserId).toBeNull();
  });

  it("a client-forged identity-shaped token signed with the wrong secret is rejected outright, not downgraded", async () => {
    const forged = await new jose.SignJWT({
      purpose: "staff_identity",
      staffUserId: 999,
      email: "attacker@worldstudentadvisors.com",
      displayName: "Attacker",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("attacker-secret"));
    await expect(resolveStaffSession(forged)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("a token forged with the SHARED-PASSWORD secret but an identity-shaped payload does not become an individual identity", async () => {
    // Same secret derivation as staffPortalAuth, but claiming staff_identity
    // fields — the identity verifier uses a different secret, so this fails
    // there; the shared-password verifier requires purpose staff_portal, so
    // it fails there too. Rejected outright.
    const crossForged = await new jose.SignJWT({
      purpose: "staff_identity",
      staffUserId: 999,
      email: "attacker@worldstudentadvisors.com",
      displayName: "Attacker",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(mockEnv.cookieSecret + "-staff-portal"));
    await expect(resolveStaffSession(crossForged)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("garbage and empty tokens are rejected", async () => {
    await expect(resolveStaffSession("garbage")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(resolveStaffSession("")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
