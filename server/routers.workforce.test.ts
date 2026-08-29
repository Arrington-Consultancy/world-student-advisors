import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Access-gate and behaviour coverage for the workforce.* procedures:
 * requires a valid Staff Portal session, exposes the real controlled
 * status (never a hardcoded "ready"), and the router never invents
 * ownership or authority.
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
  return appRouter.createCaller({ req: { ip: "203.0.113.60" } as any, res: {} as any });
}

beforeEach(() => {
  mockEnv.staffPortalPasswordHash = testHash;
});

async function getValidToken(caller: ReturnType<typeof makeCaller>): Promise<string> {
  const result = await caller.staffPortal.login({ password: TEST_PASSWORD });
  if (!result.success) throw new Error("login failed in test setup");
  return result.token;
}

describe("workforce.listWorkers — requires a valid Staff Portal session", () => {
  it("rejects an invalid token", async () => {
    const caller = makeCaller();
    await expect(caller.workforce.listWorkers({ token: "garbage" })).rejects.toThrow();
  });

  it("returns the full controlled estate for a valid session, with Sophie the only approved entry", async () => {
    const caller = makeCaller();
    const token = await getValidToken(caller);
    const result = await caller.workforce.listWorkers({ token });
    expect(result.workers.length).toBeGreaterThanOrEqual(15);
    const approved = result.workers.filter(w => w.specificationStatus === "approved");
    expect(approved.map(w => w.id)).toEqual(["sophie"]);
  });

  it("never reports any worker as openable for live execution", async () => {
    const caller = makeCaller();
    const token = await getValidToken(caller);
    const result = await caller.workforce.listWorkers({ token });
    for (const w of result.workers) {
      expect(w.canOpenForLiveExecution).toBe(false);
    }
  });
});

describe("workforce.route — requires a valid Staff Portal session and never invents authority", () => {
  it("rejects an invalid token", async () => {
    const caller = makeCaller();
    await expect(caller.workforce.route({ token: "garbage", request: "visa check" })).rejects.toThrow();
  });

  it("routes a visa request to Priya and reports her as not available, for a valid session", async () => {
    const caller = makeCaller();
    const token = await getValidToken(caller);
    const result = await caller.workforce.route({ token, request: "Can you check this student's UK visa evidence?" });
    expect(result.responsibleWorkerId).toBe("priya");
    expect(result.availability).toBe("not_available_for_live_case_work");
  });
});
