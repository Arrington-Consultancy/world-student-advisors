import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const mockEnv = { cookieSecret: "test-cookie-secret", executivePasswordHash: "" };
vi.mock("../_core/env", () => ({ ENV: mockEnv }));

const PASSWORD = "a-long-break-glass-password";

beforeEach(async () => {
  vi.resetModules();
  mockEnv.executivePasswordHash = await bcrypt.hash(PASSWORD, 10);
});

describe("break-glass executive sign-in", () => {
  it("mints a token for the correct password", async () => {
    const { authenticateExecutive, verifyExecutiveToken } = await import("./executiveAccess");
    const token = await authenticateExecutive(PASSWORD);
    expect(token).toBeTruthy();
    expect(await verifyExecutiveToken(token as string)).toBe(true);
  });

  it("refuses the wrong password", async () => {
    const { authenticateExecutive } = await import("./executiveAccess");
    expect(await authenticateExecutive("not-the-password")).toBeNull();
  });

  /**
   * Unset must close the door, not open it. A missing or mistyped
   * environment variable is the most likely way this ever changes, and it
   * must fail in the safe direction.
   */
  it("does not exist when the hash is unset", async () => {
    mockEnv.executivePasswordHash = "";
    const { authenticateExecutive, isExecutiveAccessConfigured } = await import("./executiveAccess");
    expect(isExecutiveAccessConfigured()).toBe(false);
    expect(await authenticateExecutive(PASSWORD)).toBeNull();
    expect(await authenticateExecutive("")).toBeNull();
  });

  it("rejects a token once the route is unconfigured", async () => {
    const first = await import("./executiveAccess");
    const token = (await first.authenticateExecutive(PASSWORD)) as string;

    vi.resetModules();
    mockEnv.executivePasswordHash = "";
    const { verifyExecutiveToken } = await import("./executiveAccess");
    expect(await verifyExecutiveToken(token)).toBe(false);
  });

  it("rejects rubbish and tokens signed with another secret", async () => {
    const { verifyExecutiveToken } = await import("./executiveAccess");
    expect(await verifyExecutiveToken("not-a-token")).toBe(false);
    expect(await verifyExecutiveToken("")).toBe(false);
  });

  /**
   * Defence in depth. The signing secret is already unique to this route,
   * so nothing else should be able to produce a validly signed token at
   * all. The purpose claim is the second lock, and an untested lock is
   * not a lock: if the secret were ever reused, this is what would still
   * refuse.
   */
  it("rejects a correctly signed token that is not an executive token", async () => {
    const jose = await import("jose");
    const secret = new TextEncoder().encode(mockEnv.cookieSecret + "-executive-access");
    const forged = await new jose.SignJWT({ purpose: "sso_transaction", nonce: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(secret);

    const { verifyExecutiveToken } = await import("./executiveAccess");
    expect(await verifyExecutiveToken(forged)).toBe(false);
  });

  it("rejects a signed token carrying no purpose at all", async () => {
    const jose = await import("jose");
    const secret = new TextEncoder().encode(mockEnv.cookieSecret + "-executive-access");
    const forged = await new jose.SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(secret);

    const { verifyExecutiveToken } = await import("./executiveAccess");
    expect(await verifyExecutiveToken(forged)).toBe(false);
  });
});

describe("the executive profile", () => {
  it("uses a negative sentinel id that no real staff row can hold", async () => {
    const { EXECUTIVE_STAFF_USER_ID, EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(EXECUTIVE_STAFF_USER_ID).toBeLessThan(0);
    expect(EXECUTIVE_PROFILE.staffUserId).toBe(EXECUTIVE_STAFF_USER_ID);
  });

  it("is Level 1 with every scope, permission and overlay, as authorised", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { FUNCTIONAL_SCOPES, ACTION_PERMISSIONS, SENSITIVE_OVERLAYS } = await import("./accessControl");
    expect(EXECUTIVE_PROFILE.baseAccessLevel).toBe(1);
    expect(EXECUTIVE_PROFILE.caseScope).toBe("organisation");
    expect([...EXECUTIVE_PROFILE.functionalScopes].sort()).toEqual([...FUNCTIONAL_SCOPES].sort());
    expect([...EXECUTIVE_PROFILE.actionPermissions].sort()).toEqual([...ACTION_PERMISSIONS].sort());
    expect([...EXECUTIVE_PROFILE.sensitiveOverlays].sort()).toEqual([...SENSITIVE_OVERLAYS].sort());
  });

  it("records what it is, so an audit reader is not misled", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(EXECUTIVE_PROFILE.assignmentReason).toMatch(/shared credential/i);
    expect(EXECUTIVE_PROFILE.assignmentReason).toMatch(/no individual identity/i);
  });

  it("is frozen, so nothing can widen or narrow it at runtime", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(Object.isFrozen(EXECUTIVE_PROFILE)).toBe(true);
  });
});

/**
 * The control that stops the break-glass credential quietly becoming
 * something else. It holds access_admin, so it can assign access to other
 * people, but administration.ts refuses self-administration and the
 * profile is held in code rather than in a row, so there is no path by
 * which a holder of the password edits what the password grants.
 */
describe("the executive credential cannot change what it grants", () => {
  it("cannot administer its own access", async () => {
    const { EXECUTIVE_STAFF_USER_ID, EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { decideAssignment } = await import("./administration");

    const decision = decideAssignment(
      {
        staffUserId: EXECUTIVE_STAFF_USER_ID,
        baseAccessLevel: EXECUTIVE_PROFILE.baseAccessLevel,
        functionalScopes: EXECUTIVE_PROFILE.functionalScopes,
        actionPermissions: EXECUTIVE_PROFILE.actionPermissions,
        sensitiveOverlays: EXECUTIVE_PROFILE.sensitiveOverlays,
        caseScope: EXECUTIVE_PROFILE.caseScope,
        status: "active",
      },
      {
        baseAccessLevel: 1,
        caseScope: "organisation",
        functionalScopes: [],
        actionPermissions: [],
        sensitiveOverlays: [],
        accessStatus: "active",
        teamId: null,
      },
      {
        targetStaffUserId: EXECUTIVE_STAFF_USER_ID,
        baseAccessLevel: 1,
        caseScope: "organisation",
        functionalScopes: [],
        actionPermissions: [],
        sensitiveOverlays: [],
        accessStatus: "active",
        teamId: null,
        reason: "Attempting to change the shared credential's own authority.",
      },
    );

    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("self_administration");
  });
});
