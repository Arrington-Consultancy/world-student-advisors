import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Router-level coverage for the Entra ID sign-in endpoints
 * (staffPortal.microsoftSsoStatus/microsoftLoginUrl/microsoftCallback).
 * staffIdentityAuth's own crypto/claims logic is already thoroughly unit
 * tested in staffIdentityAuth.test.ts — this only proves the router wires
 * it correctly and never leaks a raw exception to the client.
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

const { appRouter } = await import("./routers");
const { isMicrosoftSsoConfigured, buildMicrosoftSignInRequest, completeMicrosoftSignInFromCallback } = await import("./staffIdentityAuth");

const mockedIsConfigured = vi.mocked(isMicrosoftSsoConfigured);
const mockedBuildSignInRequest = vi.mocked(buildMicrosoftSignInRequest);
const mockedCompleteCallback = vi.mocked(completeMicrosoftSignInFromCallback);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.70" } as any, res: {} as any });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("staffPortal.microsoftSsoStatus", () => {
  it("reports unconfigured honestly", async () => {
    mockedIsConfigured.mockReturnValue(false);
    const result = await makeCaller().staffPortal.microsoftSsoStatus();
    expect(result.configured).toBe(false);
  });

  it("reports configured once STAFF_SSO_* env vars are all set", async () => {
    mockedIsConfigured.mockReturnValue(true);
    const result = await makeCaller().staffPortal.microsoftSsoStatus();
    expect(result.configured).toBe(true);
  });
});

describe("staffPortal.microsoftLoginUrl", () => {
  it("returns the authorize URL from buildMicrosoftSignInRequest", async () => {
    mockedBuildSignInRequest.mockResolvedValue({ authorizeUrl: "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?state=abc" });
    const result = await makeCaller().staffPortal.microsoftLoginUrl();
    expect(result.authorizeUrl).toContain("login.microsoftonline.com");
  });
});

describe("staffPortal.microsoftCallback", () => {
  it("returns a usable token on success", async () => {
    mockedCompleteCallback.mockResolvedValue("a-valid-session-token");
    const result = await makeCaller().staffPortal.microsoftCallback({ code: "auth-code", state: "transaction-token" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.token).toBe("a-valid-session-token");
    expect(mockedCompleteCallback).toHaveBeenCalledWith("auth-code", "transaction-token");
  });

  it("never leaks a raw exception — reports the error message in a structured failure response", async () => {
    mockedCompleteCallback.mockRejectedValue(new Error("Sign-in is restricted to @worldstudentadvisors.com accounts."));
    const result = await makeCaller().staffPortal.microsoftCallback({ code: "auth-code", state: "transaction-token" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/restricted to @worldstudentadvisors\.com/i);
  });

  it("rejects an empty code or state at the input-validation layer, before ever calling the identity module", async () => {
    const caller = makeCaller();
    await expect(caller.staffPortal.microsoftCallback({ code: "", state: "x" })).rejects.toThrow();
    await expect(caller.staffPortal.microsoftCallback({ code: "x", state: "" })).rejects.toThrow();
    expect(mockedCompleteCallback).not.toHaveBeenCalled();
  });
});
