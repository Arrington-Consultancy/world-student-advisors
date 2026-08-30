import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Router-level coverage for staffPortal.myAccess.
 *
 * The permission model, the resolver and the enforcement gates are tested
 * in server/access/. This proves the endpoint reports the CALLER'S OWN
 * assignment and nothing else: that the staff id comes from the verified
 * session rather than from input, that an unassigned account is told so
 * plainly instead of meeting a silent refusal, and that a shared-password
 * session — which identifies nobody — resolves to no assignment.
 */
vi.mock("./pipedrive", () => ({ createStudentLead: vi.fn() }));
vi.mock("./_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./db", () => ({ recordFailedSubmission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn(),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(null),
  verifyPortalToken: vi.fn().mockResolvedValue(null),
  getPortalUserById: vi.fn().mockResolvedValue(null),
}));
vi.mock("./portal-resolver", () => ({ resolvePortalDashboard: vi.fn().mockResolvedValue({ state: "no_record" }) }));
vi.mock("./interviewCoach", () => ({
  getSessionQuestions: vi.fn(),
  assessAnswer: vi.fn(),
  summariseSession: vi.fn(),
  TYPE_LABELS: { cas: "", ukvi: "", university: "", course: "" },
}));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "test-jwt-secret", staffPortalPasswordHash: "" } }));

vi.mock("./staffIdentityAuth", () => ({
  isMicrosoftSsoConfigured: vi.fn(),
  buildMicrosoftSignInRequest: vi.fn(),
  completeMicrosoftSignInFromCallback: vi.fn(),
}));

vi.mock("./staffSession", () => ({ resolveStaffSession: vi.fn() }));
vi.mock("./access/identity", () => ({ resolveStaffAccessProfile: vi.fn() }));

const { appRouter } = await import("./routers");
const { resolveStaffSession } = await import("./staffSession");
const { resolveStaffAccessProfile } = await import("./access/identity");

const mockedResolveSession = vi.mocked(resolveStaffSession);
const mockedResolveProfile = vi.mocked(resolveStaffAccessProfile);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.70" } as any, res: {} as any });
}

const ENTRA_SESSION = {
  authMethod: "entra_sso" as const,
  staffUserId: 1,
  email: "tom@example.invalid",
  displayName: "Tom Arrington",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("staffPortal.myAccess", () => {
  it("resolves the profile by the session's staff id, never by anything in the input", async () => {
    mockedResolveSession.mockResolvedValue(ENTRA_SESSION);
    mockedResolveProfile.mockResolvedValue({
      resolved: false,
      reason: "no_access_assignment",
      detail: "no assignment",
    } as never);

    await makeCaller().staffPortal.myAccess({ token: "session-token" });

    expect(mockedResolveProfile).toHaveBeenCalledWith(1);
  });

  it("says plainly when no assignment has been recorded", async () => {
    mockedResolveSession.mockResolvedValue(ENTRA_SESSION);
    mockedResolveProfile.mockResolvedValue({
      resolved: false,
      reason: "no_access_assignment",
      detail: "This staff account has no recorded access assignment.",
    } as never);

    const result = await makeCaller().staffPortal.myAccess({ token: "session-token" });
    expect(result.assigned).toBe(false);
    if (!result.assigned) expect(result.reason).toBe("no_access_assignment");
  });

  it("reports a shared-password session as unassigned, since it identifies nobody", async () => {
    mockedResolveSession.mockResolvedValue({ authMethod: "shared_password", staffUserId: null });
    mockedResolveProfile.mockResolvedValue({
      resolved: false,
      reason: "no_individual_identity",
      detail: "no individual staff identity",
    } as never);

    const result = await makeCaller().staffPortal.myAccess({ token: "shared-token" });
    expect(mockedResolveProfile).toHaveBeenCalledWith(null);
    expect(result.assigned).toBe(false);
  });

  it("describes a resolved assignment, including its level name", async () => {
    mockedResolveSession.mockResolvedValue(ENTRA_SESSION);
    mockedResolveProfile.mockResolvedValue({
      resolved: true,
      droppedGrantValues: [],
      profile: {
        staffUserId: 1,
        baseAccessLevel: 1,
        functionalScopes: ["executive"],
        caseScope: "organisation",
        actionPermissions: ["read"],
        sensitiveOverlays: [],
        temporaryGrants: [],
        status: "active",
        teamId: null,
        assignedByStaffUserId: 1,
        assignedAt: new Date("2026-08-30T00:00:00.000Z"),
        assignmentReason: "First controlled assignment",
      },
    } as never);

    const result = await makeCaller().staffPortal.myAccess({ token: "session-token" });
    expect(result.assigned).toBe(true);
    if (result.assigned) {
      expect(result.baseAccessLevel).toBe(1);
      expect(result.accessLevelName).toBe("Executive / Full Business");
      expect(result.actionPermissions).toEqual(["read"]);
      expect(result.caseScope).toBe("organisation");
    }
  });

  it("surfaces a dropped grant value rather than swallowing it", async () => {
    mockedResolveSession.mockResolvedValue(ENTRA_SESSION);
    mockedResolveProfile.mockResolvedValue({
      resolved: true,
      droppedGrantValues: ["action_permission:sudo"],
      profile: {
        staffUserId: 1,
        baseAccessLevel: 4,
        functionalScopes: ["admissions"],
        caseScope: "assigned_caseload",
        actionPermissions: ["read"],
        sensitiveOverlays: [],
        temporaryGrants: [],
        status: "active",
        teamId: "admissions",
        assignedByStaffUserId: null,
        assignedAt: null,
        assignmentReason: null,
      },
    } as never);

    const result = await makeCaller().staffPortal.myAccess({ token: "session-token" });
    if (result.assigned) expect(result.droppedGrantValues).toEqual(["action_permission:sudo"]);
  });

  it("describes a temporary grant without restating what it granted as a capability", async () => {
    mockedResolveSession.mockResolvedValue(ENTRA_SESSION);
    mockedResolveProfile.mockResolvedValue({
      resolved: true,
      droppedGrantValues: [],
      profile: {
        staffUserId: 1,
        baseAccessLevel: 3,
        functionalScopes: ["finance"],
        caseScope: "team",
        actionPermissions: ["read"],
        sensitiveOverlays: [],
        temporaryGrants: [
          {
            grantedByStaffUserId: 1,
            reason: "Month-end cover",
            grantedAt: new Date("2026-08-29T00:00:00.000Z"),
            expiresAt: new Date("2026-09-05T00:00:00.000Z"),
            actionPermissions: ["export_download"],
          },
        ],
        status: "active",
        teamId: "finance",
        assignedByStaffUserId: null,
        assignedAt: null,
        assignmentReason: null,
      },
    } as never);

    const result = await makeCaller().staffPortal.myAccess({ token: "session-token" });
    if (result.assigned) {
      expect(result.temporaryGrants).toHaveLength(1);
      expect(result.temporaryGrants[0].reason).toBe("Month-end cover");
      // The response describes the elevation, it does not re-publish its
      // contents as something a client could read back as authority.
      expect(Object.keys(result.temporaryGrants[0])).toEqual(["reason", "grantedAt", "expiresAt"]);
    }
  });

  it("propagates an invalid session as an error rather than reporting an assignment", async () => {
    mockedResolveSession.mockRejectedValue(new Error("Please sign in to the Staff Portal to use this tool."));
    await expect(makeCaller().staffPortal.myAccess({ token: "nonsense" })).rejects.toThrow(/sign in/i);
    expect(mockedResolveProfile).not.toHaveBeenCalled();
  });
});
