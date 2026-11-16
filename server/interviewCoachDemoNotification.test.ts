import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Focused test for the one exact-match exception in
 * interviewCoach.finishSession: the WSA demo/test portal account's email
 * must never trigger the real-applicant staff notification, and nothing
 * else — not a similar-looking email, not a name, not a substring — may
 * suppress it. See server/routers.ts's DEMO_PORTAL_EMAIL.
 *
 * Since the applicant-gate change, identity comes only from the verified
 * portal token (requireActivePortalIdentity), never from client-typed
 * input — so these tests drive the exception entirely through what
 * verifyPortalToken/getPortalUserById resolve for a given token, exactly
 * as a real signed-in session would.
 */
vi.mock("./pipedrive", () => ({ createStudentLead: vi.fn() }));
vi.mock("./_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
  recordInterviewCoachSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn(),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(null),
  verifyPortalToken: vi.fn(),
  getPortalUserById: vi.fn(),
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
const { verifyPortalToken, getPortalUserById } = await import("./portal-auth");

const mockedNotifyInterviewCoachResult = vi.mocked(notifyInterviewCoachResult);
const mockedVerifyPortalToken = vi.mocked(verifyPortalToken);
const mockedGetPortalUserById = vi.mocked(getPortalUserById);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.9" } as any, res: {} as any });
}

/** Sets up a fake signed-in session identified by `email` for token "valid-token". */
function mockSignedInAs(email: string) {
  mockedVerifyPortalToken.mockResolvedValue({
    portalUserId: 1,
    email,
    firstName: "Test",
    lastName: "Student",
  } as any);
  mockedGetPortalUserById.mockResolvedValue({ firstName: "Test", pipedrivePersonId: null } as any);
}

const baseFinish = {
  token: "valid-token",
  interviewType: "cas" as const,
  results: [{ question: "Why this course?", score: 90 }],
  turnstileToken: "valid",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interviewCoach.finishSession — demo account notification exception", () => {
  it("does not notify staff when the signed-in account's email is exactly the approved demo account", async () => {
    mockSignedInAs("portal-demo@worldstudentadvisors.com");
    const caller = makeCaller();
    const result = await caller.interviewCoach.finishSession({ ...baseFinish });

    expect(result.success).toBe(true);
    expect(mockedNotifyInterviewCoachResult).not.toHaveBeenCalled();
  });

  it("is case-insensitive on the same exact address, not a pattern match", async () => {
    mockSignedInAs("Portal-Demo@WorldStudentAdvisors.com");
    const caller = makeCaller();
    await caller.interviewCoach.finishSession({ ...baseFinish });

    expect(mockedNotifyInterviewCoachResult).not.toHaveBeenCalled();
  });

  it("still notifies staff for a genuine student — the normal, unmodified path", async () => {
    mockSignedInAs("genuine.student@example.com");
    const caller = makeCaller();
    const result = await caller.interviewCoach.finishSession({ ...baseFinish });

    expect(result.success).toBe(true);
    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(1);
    const [payload] = mockedNotifyInterviewCoachResult.mock.calls[0];
    expect(payload.content).toContain("genuine.student@example.com");
  });

  it("does not suppress on a merely similar or demo-sounding email — only the exact address counts", async () => {
    for (const email of [
      "demo@worldstudentadvisors.com",
      "test@worldstudentadvisors.com",
      "portal-demo@arringtonconsultancy.com",
      "notportal-demo@worldstudentadvisors.com",
      "portal-demo@worldstudentadvisors.com.evil.example",
    ]) {
      mockSignedInAs(email);
      const caller = makeCaller();
      await caller.interviewCoach.finishSession({ ...baseFinish });
    }

    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(5);
  });

  it("a genuine applicant cannot suppress their own notification by naming themselves 'demo' or 'test'", async () => {
    mockSignedInAs("demo.student@example.com");
    const caller = makeCaller();
    await caller.interviewCoach.finishSession({ ...baseFinish });

    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(1);
  });

  it("has no email field in its input schema at all — identity can only come from the verified token, never from anything the client types", async () => {
    mockSignedInAs("genuine.student@example.com");
    const caller = makeCaller();
    // Even if a caller tries to smuggle an email in, the schema has no such
    // field, and identity is still resolved solely from the token above.
    const result = await caller.interviewCoach.finishSession({
      ...baseFinish,
      // @ts-expect-error — email is not part of the input schema
      email: "portal-demo@worldstudentadvisors.com",
    });

    expect(result.success).toBe(true);
    // The spoofed "demo" email in the (rejected/ignored) extra field must
    // not suppress the notification — only the verified token identity counts.
    expect(mockedNotifyInterviewCoachResult).toHaveBeenCalledTimes(1);
  });
});
