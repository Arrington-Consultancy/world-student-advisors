import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Router-level coverage for staffPortal.login / staffPortal.me — exercises
 * the real staffPortalAuth logic end-to-end through the tRPC router (no
 * mock of ./staffPortalAuth itself), same style as routers.turnstile.test.ts.
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

const mockEnv: { cookieSecret: string; staffPortalPasswordHash: string } = {
  cookieSecret: "test-jwt-secret",
  staffPortalPasswordHash: "",
};
vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const bcrypt = (await import("bcryptjs")).default;
const { appRouter } = await import("./routers");

const TEST_PASSWORD = "TestPass123!";
const testHash = await bcrypt.hash(TEST_PASSWORD, 12);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.50" } as any, res: {} as any });
}

beforeEach(() => {
  mockEnv.staffPortalPasswordHash = testHash;
});

describe("staffPortal.login", () => {
  it("rejects the wrong password without issuing a token", async () => {
    const caller = makeCaller();
    const result = await caller.staffPortal.login({ password: "wrong-password" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/incorrect password/i);
  });

  it("accepts the correct password and returns a usable token", async () => {
    const caller = makeCaller();
    const result = await caller.staffPortal.login({ password: TEST_PASSWORD });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.token).toBe("string");
      const me = await caller.staffPortal.me({ token: result.token });
      expect(me.authenticated).toBe(true);
    }
  });
});

describe("staffPortal.me", () => {
  it("returns authenticated: false for an invalid token", async () => {
    const caller = makeCaller();
    const result = await caller.staffPortal.me({ token: "garbage" });
    expect(result.authenticated).toBe(false);
  });

  it("returns authenticated: false for an empty token", async () => {
    const caller = makeCaller();
    const result = await caller.staffPortal.me({ token: "" });
    expect(result.authenticated).toBe(false);
  });
});

describe("staffPortal login rate limiting", () => {
  it("blocks login attempts once the per-IP threshold is exceeded, even with the correct password", async () => {
    const caller = appRouter.createCaller({ req: { ip: "203.0.113.99" } as any, res: {} as any });
    let lastResult: Awaited<ReturnType<typeof caller.staffPortal.login>> | undefined;
    for (let i = 0; i < 11; i++) {
      lastResult = await caller.staffPortal.login({ password: TEST_PASSWORD });
    }
    expect(lastResult?.success).toBe(false);
    if (lastResult && !lastResult.success) expect(lastResult.error).toMatch(/too many attempts/i);
  });
});
