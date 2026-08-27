import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Applicant-gate tests for the Interview Coach router: the Coach is an
 * applicant benefit, so every procedure must require a valid, currently
 * active Student Portal session token, identity must come only from that
 * verified token (never anything client-typed), no procedure may create or
 * touch a Pipedrive Person/Lead/Deal, and finishSession must persist only
 * the minimal completion record — never the answer transcript.
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
  getSessionQuestions: vi.fn().mockResolvedValue(["Q1", "Q2", "Q3"]),
  assessAnswer: vi.fn().mockResolvedValue({
    needsFollowUp: false,
    followUpQuestion: "",
    score: 90,
    strengths: [],
    weaknesses: [],
    missingInformation: [],
    researchHomework: [],
  }),
  summariseSession: vi.fn().mockReturnValue({ averageScore: 88, passed: true, readyForMockInterview: true }),
  TYPE_LABELS: {
    cas: "CAS Interview Preparation",
    ukvi: "UKVI Credibility Interview Preparation",
    university: "University Interview Preparation",
    course: "Course-Specific Interview Preparation",
  },
}));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { recordInterviewCoachSession } = await import("./db");
const { verifyPortalToken, getPortalUserById } = await import("./portal-auth");
const { getSessionQuestions } = await import("./interviewCoach");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedRecordInterviewCoachSession = vi.mocked(recordInterviewCoachSession);
const mockedVerifyPortalToken = vi.mocked(verifyPortalToken);
const mockedGetPortalUserById = vi.mocked(getPortalUserById);
const mockedGetSessionQuestions = vi.mocked(getSessionQuestions);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.11" } as any, res: {} as any });
}

function mockActiveAccount(email = "genuine.student@example.com") {
  mockedVerifyPortalToken.mockResolvedValue({
    portalUserId: 42,
    email,
    firstName: "Genuine",
    lastName: "Student",
  } as any);
  mockedGetPortalUserById.mockResolvedValue({ firstName: "Genuine", pipedrivePersonId: 99 } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interviewCoach access gate — requires an active Student Portal account", () => {
  it("rejects startSession with no valid token — invalid/expired token", async () => {
    mockedVerifyPortalToken.mockResolvedValue(null);

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.startSession({ token: "garbage", interviewType: "cas", count: 5, turnstileToken: "ok" })
    ).rejects.toThrow(/sign in/i);

    expect(mockedGetSessionQuestions).not.toHaveBeenCalled();
  });

  it("rejects startSession for a token whose account is deactivated or missing (getPortalUserById returns null)", async () => {
    mockedVerifyPortalToken.mockResolvedValue({
      portalUserId: 7,
      email: "deactivated@example.com",
      firstName: "X",
      lastName: "Y",
    } as any);
    mockedGetPortalUserById.mockResolvedValue(null);

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.startSession({ token: "stale", interviewType: "cas", count: 5, turnstileToken: "ok" })
    ).rejects.toThrow(/could not be verified/i);

    expect(mockedGetSessionQuestions).not.toHaveBeenCalled();
  });

  it("rejects submitAnswer for an invalid token", async () => {
    mockedVerifyPortalToken.mockResolvedValue(null);

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.submitAnswer({
        token: "garbage",
        interviewType: "cas",
        question: "Why this course?",
        answer: "Because...",
        turnstileToken: "ok",
      })
    ).rejects.toThrow(/sign in/i);
  });

  it("rejects finishSession for an invalid token, and never persists or notifies", async () => {
    mockedVerifyPortalToken.mockResolvedValue(null);

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.finishSession({
        token: "garbage",
        interviewType: "cas",
        results: [{ question: "Why this course?", score: 90 }],
        turnstileToken: "ok",
      })
    ).rejects.toThrow(/sign in/i);

    expect(mockedRecordInterviewCoachSession).not.toHaveBeenCalled();
  });

  it.each(["cas", "ukvi", "university", "course"] as const)(
    "allows a genuinely active account to start a %s session",
    async (interviewType) => {
      mockActiveAccount();
      const caller = makeCaller();
      const result = await caller.interviewCoach.startSession({
        token: "valid-token",
        interviewType,
        count: 5,
        turnstileToken: "ok",
      });

      expect(result.success).toBe(true);
      expect(mockedGetSessionQuestions).toHaveBeenCalledWith(interviewType, undefined, 5);
    }
  );

  it("derives identity from the verified token only — no email field exists in the input schema for the client to control", async () => {
    mockActiveAccount("real.applicant@example.com");
    const caller = makeCaller();
    const result = await caller.interviewCoach.finishSession({
      token: "valid-token",
      interviewType: "cas",
      results: [{ question: "Why this course?", score: 90 }],
      turnstileToken: "ok",
      // @ts-expect-error — email is not a field on this schema
      email: "someone.else@example.com",
    });

    expect(result.success).toBe(true);
    expect(mockedRecordInterviewCoachSession).toHaveBeenCalledWith(
      expect.objectContaining({ portalUserId: 42 })
    );
  });
});

describe("interviewCoach never creates Pipedrive Person/Lead/Deal activity", () => {
  it("startSession, submitAnswer, and finishSession never call createStudentLead", async () => {
    mockActiveAccount();
    const caller = makeCaller();

    await caller.interviewCoach.startSession({ token: "valid-token", interviewType: "cas", count: 5, turnstileToken: "ok" });
    await caller.interviewCoach.submitAnswer({
      token: "valid-token",
      interviewType: "cas",
      question: "Why this course?",
      answer: "Because...",
      turnstileToken: "ok",
    });
    await caller.interviewCoach.finishSession({
      token: "valid-token",
      interviewType: "cas",
      results: [{ question: "Why this course?", score: 90 }],
      turnstileToken: "ok",
    });

    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });
});

describe("interviewCoach.finishSession — minimal persistence model", () => {
  it("persists exactly portalUserId, interviewType, averageScore, and passed — no answer transcript, no question text", async () => {
    mockActiveAccount();
    const caller = makeCaller();
    await caller.interviewCoach.finishSession({
      token: "valid-token",
      interviewType: "ukvi",
      results: [
        { question: "Why do you want to study in the UK?", score: 92 },
        { question: "Who is paying for your studies?", score: 84 },
      ],
      turnstileToken: "ok",
    });

    expect(mockedRecordInterviewCoachSession).toHaveBeenCalledTimes(1);
    const [payload] = mockedRecordInterviewCoachSession.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(["averageScore", "interviewType", "passed", "portalUserId"]);
    expect(payload).toEqual({
      portalUserId: 42,
      interviewType: "ukvi",
      averageScore: 88,
      passed: true,
    });
  });

  it("a failure to persist never blocks the response to the applicant", async () => {
    mockActiveAccount();
    mockedRecordInterviewCoachSession.mockRejectedValue(new Error("db unavailable"));
    const caller = makeCaller();

    const result = await caller.interviewCoach.finishSession({
      token: "valid-token",
      interviewType: "cas",
      results: [{ question: "Why this course?", score: 90 }],
      turnstileToken: "ok",
    });

    expect(result.success).toBe(true);
  });
});
