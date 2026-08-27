import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Focused test for the one exact-match exception in
 * interviewCoach.finishSession: the WSA demo/test portal account's email
 * must never trigger the real-applicant staff notification, and nothing
 * else — not a similar-looking email, not a name, not a substring — may
 * suppress it. See server/routers.ts's DEMO_PORTAL_EMAIL.
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
  verifyPortalToken: vi.fn(),
  getPortalUserById: vi.fn().mockResolvedValue(null),
  verifySignupPrefillToken: vi.fn(),
}));
vi.mock("./portal-resolver", () => ({
  resolvePortalDashboard: vi.fn().mockResolvedValue({ state: "no_record" }),
}));
vi.mock("./interviewCoach", () => ({
  getSessionQuestions: vi.fn(),
  assessAnswer: vi.fn(),
  summariseSession: vi.fn().mockReturnValue({ averageScore: 90, passed: true, readyForMockInterview: true }),
  TYPE_LABELS: {
    cas: "CAS Interview Preparation",
    ukvi: "UKVI Credibility Interview Preparation",
    university: "University Interview Preparation",
    course: "Course-Specific Interview Preparation",
  },
}));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("./routers");
const { notifyInterviewCoachResult } = await import("./_core/notification");

const mockedNotifyInterviewCoachResult = vi.mocked(notifyInterviewCoachResult);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.9" } as any, res: {} as any });
}

const baseFinish = {
  interviewType: "cas" as const,
  results: [{ question: "Why this course?", score: 90 }],
  turnstileToken: "valid",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interviewCoach.finishSession — demo account notification exception", () => {
  it("does not notify staff when the email is exactly the approved demo account", async () => {
    const caller = makeCaller();
    const result = await caller.interviewCoach.finishSession({
      ...baseFinish,
      email: "portal-demo@worldstudentadvisors.com",
    });

    expect(result.success).toBe(true);
    expect(mockedNotifyInterviewCoachResult).not.toHaveBeenCalled();
  });

  it("is case-insensitive on the same exact address, not a pattern match (the email schema itself rejects untrimmed input, so only case needs handling here)", async () => {
    const caller = makeCaller();
    await caller.interviewCoach.finishSession({
      ...baseFinish,
      email: "Portal-Demo@WorldStudentAdvisors.com",
    });

    expect(mockedNotifyInterviewCoachResult).not.toHaveBeenCalled();
  });

  it("still notifies staff for a genuine student — the normal, unmodified path", async () => {
    const caller = makeCaller();
    const result = await caller.interviewCoach.finishSession({
      ...baseFinish,
      email: "genuine.student@example.com",
    });

    expect(result.success).toBe(true);
    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(1);
    const [payload] = mockedNotifyInterviewCoachResult.mock.calls[0];
    expect(payload.content).toContain("genuine.student@example.com");
  });

  it("does not suppress on a merely similar or demo-sounding email — only the exact address counts", async () => {
    const caller = makeCaller();
    for (const email of [
      "demo@worldstudentadvisors.com",
      "test@worldstudentadvisors.com",
      "portal-demo@arringtonconsultancy.com",
      "notportal-demo@worldstudentadvisors.com",
      "portal-demo@worldstudentadvisors.com.evil.example",
    ]) {
      await caller.interviewCoach.finishSession({ ...baseFinish, email });
    }

    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(5);
  });

  it("a genuine applicant cannot suppress their own notification by naming themselves 'demo' or 'test'", async () => {
    const caller = makeCaller();
    await caller.interviewCoach.finishSession({
      ...baseFinish,
      email: "demo.student@example.com",
    });

    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(1);
  });
});
