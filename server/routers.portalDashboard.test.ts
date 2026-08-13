import { describe, expect, it, vi, beforeEach } from "vitest";

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
  requestPasswordReset: vi.fn(),
  verifyPortalToken: vi.fn(),
  getPortalUserById: vi.fn(),
}));
vi.mock("./portal-resolver", () => ({
  resolvePortalDashboard: vi.fn(),
}));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("./routers");
const { verifyPortalToken, getPortalUserById } = await import("./portal-auth");
const { resolvePortalDashboard } = await import("./portal-resolver");

const mockedVerifyPortalToken = vi.mocked(verifyPortalToken);
const mockedGetPortalUserById = vi.mocked(getPortalUserById);
const mockedResolvePortalDashboard = vi.mocked(resolvePortalDashboard);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.7" } as any, res: {} as any });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("portal.dashboard — status states", () => {
  it("returns unauthenticated for a missing/invalid token, never throwing", async () => {
    mockedVerifyPortalToken.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "not-a-real-token" });

    expect(result).toEqual({ status: "unauthenticated" });
    expect(mockedGetPortalUserById).not.toHaveBeenCalled();
  });

  it("returns unavailable when the database is down (getPortalUserById returns null) — never falls back to any portal content", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "a@b.com", firstName: "A", lastName: "B" });
    mockedGetPortalUserById.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "valid-token" });

    expect(result).toEqual({ status: "unavailable" });
    expect(mockedResolvePortalDashboard).not.toHaveBeenCalled();
  });

  it("returns no_application (not unavailable) when the portal user has no pipedrivePersonId to anchor on — this is not an outage", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "a@b.com", firstName: "A", lastName: "B" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Amara", pipedrivePersonId: null });

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "valid-token" });

    expect(result).toEqual({ status: "no_application", name: "Amara" });
    expect(mockedResolvePortalDashboard).not.toHaveBeenCalled();
  });

  it("returns ok with the student's name and resolved progress on the happy path", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "a@b.com", firstName: "Amara", lastName: "B" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Amara", pipedrivePersonId: 8455 });
    mockedResolvePortalDashboard.mockResolvedValue({
      state: "resolved",
      stageLabel: "Application Discussion",
      nextAction: "Preparing your application",
      position: 2,
      counsellor: "Glenice Owino",
    });

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "valid-token" });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.name).toBe("Amara");
      expect(result.progress).toEqual({
        state: "resolved",
        stageLabel: "Application Discussion",
        nextAction: "Preparing your application",
        position: 2,
        counsellor: "Glenice Owino",
      });
    }
    expect(mockedResolvePortalDashboard).toHaveBeenCalledWith(8455);
  });

  it("still returns the student's name when Pipedrive is unavailable — only the progress area degrades", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "a@b.com", firstName: "Amara", lastName: "B" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Amara", pipedrivePersonId: 8455 });
    mockedResolvePortalDashboard.mockResolvedValue({ state: "pipedrive_unavailable" });

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "valid-token" });

    expect(result).toEqual({
      status: "ok",
      name: "Amara",
      progress: { state: "pipedrive_unavailable" },
    });
  });
});

describe("portal.dashboard — allowlist drift guard", () => {
  it("an ok response contains exactly the locked allowlist keys, never a raw Pipedrive field", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "a@b.com", firstName: "Amara", lastName: "B" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Amara", pipedrivePersonId: 8455 });
    mockedResolvePortalDashboard.mockResolvedValue({
      state: "resolved",
      stageLabel: "CAS / Visa / Pre-Departure",
      nextAction: "Preparing for your visa and travel",
      position: 6,
      counsellor: "Eldah Therone",
    });

    const caller = makeCaller();
    const result = await caller.portal.dashboard({ token: "valid-token" });

    expect(Object.keys(result).sort()).toEqual(["name", "progress", "status"].sort());
    if (result.status === "ok" && result.progress.state === "resolved") {
      expect(Object.keys(result.progress).sort()).toEqual(
        ["state", "stageLabel", "nextAction", "position", "counsellor"].sort()
      );
    }
    // No raw Pipedrive identifiers or objects anywhere in the response.
    expect(JSON.stringify(result)).not.toMatch(/person_id|deal_id|lead_id|owner_id|user_id|stage_id/i);
  });
});
