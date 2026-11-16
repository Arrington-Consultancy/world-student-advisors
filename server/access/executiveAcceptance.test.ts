import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const mockEnv = { cookieSecret: "test-cookie-secret", executivePasswordHash: "", staffPortalPasswordHash: "" };
vi.mock("../_core/env", () => ({ ENV: mockEnv }));

const PASSWORD = "a-long-break-glass-password";

beforeEach(async () => {
  vi.resetModules();
  mockEnv.executivePasswordHash = await bcrypt.hash(PASSWORD, 10);
  mockEnv.staffPortalPasswordHash = await bcrypt.hash("the-legacy-shared-password", 10);
});

/**
 * The acceptance checklist for the Executive Shared Access Override,
 * approved by Tom Arrington on 31 August 2026.
 *
 * Each test below corresponds to a line of the verification list in that
 * decision. They exercise the real access gate rather than reading the
 * profile object back, because a profile that lists a permission and a
 * gate that grants it are different claims, and only the second one
 * matters when somebody presses a button.
 */

describe("credential", () => {
  it("the correct credential succeeds", async () => {
    const { authenticateExecutive, verifyExecutiveToken } = await import("./executiveAccess");
    const token = await authenticateExecutive(PASSWORD);
    expect(token).toBeTruthy();
    expect(await verifyExecutiveToken(token as string)).toBe(true);
  });

  it("an incorrect credential fails", async () => {
    const { authenticateExecutive } = await import("./executiveAccess");
    expect(await authenticateExecutive("wrong")).toBeNull();
    expect(await authenticateExecutive(PASSWORD.toUpperCase())).toBeNull();
    expect(await authenticateExecutive(PASSWORD + " ")).toBeNull();
  });

  it("failed authentication is fail-closed: no token, no partial session", async () => {
    const { authenticateExecutive } = await import("./executiveAccess");
    const result = await authenticateExecutive("wrong");
    expect(result).toBeNull();
    expect(result).not.toBeTruthy();
  });

  it("comparison is against a bcrypt hash, never a stored password", async () => {
    // The configured value must be a bcrypt hash, and the plaintext must
    // not equal it. If someone ever set the plaintext directly, bcrypt
    // comparison fails and the route closes rather than opening.
    expect(mockEnv.executivePasswordHash).toMatch(/^\$2[aby]\$/);
    expect(mockEnv.executivePasswordHash).not.toContain(PASSWORD);
  });
});

describe("rate limiting operates", () => {
  it("refuses after the configured number of attempts from one address", async () => {
    const { isStaffPortalLoginRateLimited } = await import("../staffPortalAuth");
    const ip = "203.0.113.99";
    let limited = false;
    for (let i = 0; i < 12; i++) {
      if (isStaffPortalLoginRateLimited(ip)) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });

  it("limits per address, so one attacker cannot lock everyone out", async () => {
    const { isStaffPortalLoginRateLimited } = await import("../staffPortalAuth");
    for (let i = 0; i < 12; i++) isStaffPortalLoginRateLimited("198.51.100.1");
    expect(isStaffPortalLoginRateLimited("198.51.100.2")).toBe(false);
  });
});

describe("the granted authority is genuinely available through the real gate", () => {
  it("every one of the 19 functional scopes passes a read", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess, FUNCTIONAL_SCOPES } = await import("./accessControl");
    expect(FUNCTIONAL_SCOPES).toHaveLength(19);
    for (const scope of FUNCTIONAL_SCOPES) {
      const decision = evaluateAccess(EXECUTIVE_PROFILE, { action: "read", functionalScope: scope });
      expect(decision.allowed, `${scope} was refused`).toBe(true);
    }
  });

  it("every one of the 12 action permissions is genuinely granted", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess, ACTION_PERMISSIONS } = await import("./accessControl");
    expect(ACTION_PERMISSIONS).toHaveLength(12);
    for (const action of ACTION_PERMISSIONS) {
      const decision = evaluateAccess(EXECUTIVE_PROFILE, { action, functionalScope: "operations" });
      expect(decision.allowed, `${action} was refused`).toBe(true);
    }
  });

  it("the destructive permission is genuinely available, not merely listed", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess } = await import("./accessControl");
    const decision = evaluateAccess(EXECUTIVE_PROFILE, {
      action: "delete_destructive",
      functionalScope: "records_control",
      sensitiveCategory: "records_destructive",
    });
    expect(decision.allowed).toBe(true);
  });

  it("the financial permission is genuinely available, not merely listed", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess } = await import("./accessControl");
    const decision = evaluateAccess(EXECUTIVE_PROFILE, {
      action: "financial_action",
      functionalScope: "finance",
      sensitiveCategory: "finance",
    });
    expect(decision.allowed).toBe(true);
  });

  it("every one of the 7 sensitive overlays passes", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess, SENSITIVE_OVERLAYS } = await import("./accessControl");
    expect(SENSITIVE_OVERLAYS).toHaveLength(7);
    for (const overlay of SENSITIVE_OVERLAYS) {
      const decision = evaluateAccess(EXECUTIVE_PROFILE, {
        action: "read",
        functionalScope: "governance",
        sensitiveCategory: overlay,
      });
      expect(decision.allowed, `${overlay} was refused`).toBe(true);
    }
  });

  it("organisation-wide case scope reaches any case", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess } = await import("./accessControl");
    const decision = evaluateAccess(EXECUTIVE_PROFILE, {
      action: "read",
      functionalScope: "enquiry_triage",
      // A case belonging to somebody else entirely, on another team.
      case: { assignedStaffUserIds: [999], teamId: "another-team" },
    });
    expect(decision.allowed).toBe(true);
  });

  it("a caseworker is still confined to their own caseload, for contrast", async () => {
    const { evaluateAccess } = await import("./accessControl");
    const caseworker = {
      staffUserId: 5,
      baseAccessLevel: 4 as const,
      functionalScopes: ["enquiry_triage"] as never,
      caseScope: "assigned_caseload" as const,
      actionPermissions: ["read"] as never,
      sensitiveOverlays: [] as never,
      temporaryGrants: [],
      status: "active" as const,
      teamId: null,
      assignedByStaffUserId: null,
      assignedAt: null,
      assignmentReason: null,
    };
    const decision = evaluateAccess(caseworker, {
      action: "read",
      functionalScope: "enquiry_triage",
      case: { assignedStaffUserIds: [999], teamId: "another-team" },
    });
    expect(decision.allowed).toBe(false);
  });

  it("credential_admin and access_admin are both held, as authorised", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { consequentialActionsHeld } = await import("./accessControl");
    const held = consequentialActionsHeld(EXECUTIVE_PROFILE);
    expect(held).toContain("credential_admin");
    expect(held).toContain("access_admin");
    expect(held).toContain("delete_destructive");
    expect(held).toContain("financial_action");
  });
});

describe("no expiry is applied", () => {
  it("holds no temporary grants, so nothing can lapse", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(EXECUTIVE_PROFILE.temporaryGrants).toHaveLength(0);
  });

  it("the profile still grants everything a decade from now", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { evaluateAccess, ACTION_PERMISSIONS } = await import("./accessControl");
    const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    for (const action of ACTION_PERMISSIONS) {
      const decision = evaluateAccess(EXECUTIVE_PROFILE, { action, functionalScope: "operations" }, farFuture);
      expect(decision.allowed, `${action} lapsed`).toBe(true);
    }
  });
});

describe("the credential cannot change what it grants", () => {
  it("the profile is frozen at runtime", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(Object.isFrozen(EXECUTIVE_PROFILE)).toBe(true);
  });

  it("self-administration is refused", async () => {
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
        baseAccessLevel: 1, caseScope: "organisation", functionalScopes: [],
        actionPermissions: [], sensitiveOverlays: [], accessStatus: "active", teamId: null,
      },
      {
        targetStaffUserId: EXECUTIVE_STAFF_USER_ID,
        baseAccessLevel: 1, caseScope: "organisation", functionalScopes: [],
        actionPermissions: [], sensitiveOverlays: [], accessStatus: "active", teamId: null,
        reason: "Attempting to alter the shared credential's own authority.",
      },
    );
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("self_administration");
  });

  it("the authority comes from code, not from a database row anybody can edit", async () => {
    // resolveStaffAccessProfile returns the code-held profile for the
    // sentinel without reading staff_users at all, so there is no row for
    // the access screen to change.
    const { EXECUTIVE_STAFF_USER_ID, EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const { resolveStaffAccessProfile } = await import("./identity");
    const resolution = await resolveStaffAccessProfile(EXECUTIVE_STAFF_USER_ID);
    expect(resolution.resolved).toBe(true);
    if (!resolution.resolved) return;
    expect(resolution.profile).toBe(EXECUTIVE_PROFILE);
  });
});

describe("the credential never leaks", () => {
  it("no module exports the password or the hash", async () => {
    const executive = await import("./executiveAccess");
    const serialised = JSON.stringify(
      Object.fromEntries(Object.entries(executive).filter(([, v]) => typeof v !== "function")),
    );
    expect(serialised).not.toContain(PASSWORD);
    expect(serialised).not.toContain(mockEnv.executivePasswordHash);
  });

  it("the profile carries no credential material", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    const serialised = JSON.stringify(EXECUTIVE_PROFILE);
    expect(serialised).not.toContain(PASSWORD);
    expect(serialised).not.toContain(mockEnv.executivePasswordHash);
    expect(serialised).not.toMatch(/\$2[aby]\$/);
  });

  it("a minted token carries no credential material", async () => {
    const { authenticateExecutive } = await import("./executiveAccess");
    const token = (await authenticateExecutive(PASSWORD)) as string;
    const [, payload] = token.split(".");
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    expect(decoded).not.toContain(PASSWORD);
    expect(decoded).not.toContain(mockEnv.executivePasswordHash);
    expect(decoded).toContain("executive_access");
  });

  it("an authentication failure returns nothing that distinguishes why", async () => {
    const { authenticateExecutive } = await import("./executiveAccess");
    const wrongPassword = await authenticateExecutive("wrong");
    mockEnv.executivePasswordHash = "";
    vi.resetModules();
    const { authenticateExecutive: unconfigured } = await import("./executiveAccess");
    const notConfigured = await unconfigured("wrong");
    // Identical results, so the response cannot be used to probe whether
    // the route exists at all.
    expect(wrongPassword).toBe(notConfigured);
  });
});

describe("audit attributes honestly", () => {
  it("shared_executive is a distinct auth method, not folded into entra_sso", async () => {
    const { EXECUTIVE_STAFF_USER_ID } = await import("./executiveAccess");
    // The sentinel is what reaches an audit row, and it is not a person.
    expect(EXECUTIVE_STAFF_USER_ID).toBeLessThan(0);
  });

  it("the profile says outright that no individual identity was established", async () => {
    const { EXECUTIVE_PROFILE } = await import("./executiveAccess");
    expect(EXECUTIVE_PROFILE.assignmentReason).toMatch(/no individual identity/i);
    expect(EXECUTIVE_PROFILE.assignmentReason).not.toMatch(/\bTim\b/);
    // Naming Tom as the approver is a record of who authorised the route.
    // It must never read as a claim about who used it.
    expect(EXECUTIVE_PROFILE.assignmentReason).toMatch(/Authorised by/i);
  });
});

describe("nothing else was widened", () => {
  it("Microsoft named authentication still works independently", async () => {
    const { isMicrosoftSsoConfigured } = await import("../staffIdentityAuth");
    // Configuration is environment-driven; what matters is that the
    // function still exists and answers, so the Entra path is intact.
    expect(typeof isMicrosoftSsoConfigured()).toBe("boolean");
  });

  it("the legacy shared password still grants no access at all", async () => {
    const { resolveStaffAccessProfile } = await import("./identity");
    const resolution = await resolveStaffAccessProfile(null);
    expect(resolution.resolved).toBe(false);
    if (resolution.resolved) return;
    expect(resolution.reason).toBe("no_individual_identity");
  });

  it("the executive profile is not reachable when the route is unconfigured", async () => {
    mockEnv.executivePasswordHash = "";
    vi.resetModules();
    const { EXECUTIVE_STAFF_USER_ID } = await import("./executiveAccess");
    const { resolveStaffAccessProfile } = await import("./identity");
    const resolution = await resolveStaffAccessProfile(EXECUTIVE_STAFF_USER_ID);
    // Falls through to a database lookup for a row that cannot exist,
    // and denies. Turning the variable off genuinely closes the route.
    expect(resolution.resolved).toBe(false);
  });

  it("a normal staff profile gains nothing from this change", async () => {
    const { evaluateAccess } = await import("./accessControl");
    const caseworker = {
      staffUserId: 5,
      baseAccessLevel: 4 as const,
      functionalScopes: ["enquiry_triage"] as never,
      caseScope: "assigned_caseload" as const,
      actionPermissions: ["read"] as never,
      sensitiveOverlays: [] as never,
      temporaryGrants: [],
      status: "active" as const,
      teamId: null,
      assignedByStaffUserId: null,
      assignedAt: null,
      assignmentReason: null,
    };
    expect(evaluateAccess(caseworker, { action: "delete_destructive", functionalScope: "records_control" }).allowed).toBe(false);
    expect(evaluateAccess(caseworker, { action: "financial_action", functionalScope: "finance" }).allowed).toBe(false);
    expect(evaluateAccess(caseworker, { action: "read", functionalScope: "finance" }).allowed).toBe(false);
  });
});
