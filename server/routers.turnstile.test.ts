import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./pipedrive", () => ({
  createStudentLead: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
}));
vi.mock("./db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn().mockResolvedValue({ token: "portal-token" }),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(null),
  verifyPortalToken: vi.fn(),
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
  summariseSession: vi.fn().mockReturnValue({ averageScore: 90, passed: true, readyForMockInterview: true }),
  TYPE_LABELS: {
    cas: "CAS Interview Preparation",
    ukvi: "UKVI Credibility Interview Preparation",
    university: "University Interview Preparation",
    course: "Course-Specific Interview Preparation",
  },
}));
vi.mock("./_core/turnstile", () => ({
  requireTurnstile: vi.fn(),
}));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { notifyStaff } = await import("./_core/notification");
const { getSessionQuestions, assessAnswer } = await import("./interviewCoach");
const { requireTurnstile } = await import("./_core/turnstile");
const { requestPasswordReset } = await import("./portal-auth");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedGetSessionQuestions = vi.mocked(getSessionQuestions);
const mockedAssessAnswer = vi.mocked(assessAnswer);
const mockedRequireTurnstile = vi.mocked(requireTurnstile);
const mockedRequestPasswordReset = vi.mocked(requestPasswordReset);

function makeCaller() {
  const ctx = { req: { ip: "203.0.113.7" } as any, res: {} as any };
  return appRouter.createCaller(ctx);
}

const validSignup = {
  firstName: "Test",
  lastName: "Student",
  gender: "female",
  dateOfBirth: "2000-01-01",
  phone: "+441234567890",
  email: "test.student@example.com",
  nationality: "British",
  country: "United Kingdom",
  highestQualification: "bachelors",
  desiredLevel: "postgraduate",
  areaOfStudy: "Computer Science",
  preferredMode: "full-time",
  preferredStartMonth: "January",
  preferredDestination: "uk",
  educationFunding: "self-funded",
  gdprConsent: true,
  turnstileToken: "a-valid-token",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateStudentLead.mockResolvedValue({ personId: 1, dealId: 42, reusedExistingPerson: false });
});

describe("Turnstile gates contact.submitStudent", () => {
  it("never calls Pipedrive or sends notifications when Turnstile verification fails", async () => {
    mockedRequireTurnstile.mockRejectedValue(
      new TRPCError({ code: "BAD_REQUEST", message: "We couldn't verify you're human. Please try again." })
    );

    const caller = makeCaller();
    await expect(caller.contact.submitStudent(validSignup)).rejects.toThrow(/verify you're human/i);

    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
    expect(mockedNotifyStaff).not.toHaveBeenCalled();
  });

  it("proceeds to Pipedrive and notifications once Turnstile verification succeeds", async () => {
    mockedRequireTurnstile.mockResolvedValue(undefined);

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true);
    expect(mockedCreateStudentLead).toHaveBeenCalledTimes(1);
    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    expect(mockedRequireTurnstile).toHaveBeenCalledWith(validSignup.turnstileToken, "203.0.113.7");
  });

  it("skips Turnstile entirely for a honeypot-tripped submission (no side effects either way)", async () => {
    mockedRequireTurnstile.mockRejectedValue(new TRPCError({ code: "BAD_REQUEST", message: "irrelevant" }));

    const caller = makeCaller();
    const result = await caller.contact.submitStudent({ ...validSignup, website: "http://spam.example" });

    expect(result.success).toBe(true);
    expect(mockedRequireTurnstile).not.toHaveBeenCalled();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });
});

describe("Turnstile gates interviewCoach endpoints", () => {
  it("never calls getSessionQuestions (no LLM work) when Turnstile fails on startSession", async () => {
    mockedRequireTurnstile.mockRejectedValue(new TRPCError({ code: "BAD_REQUEST", message: "no" }));

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.startSession({ interviewType: "cas", count: 5, turnstileToken: "bad" })
    ).rejects.toThrow();

    expect(mockedGetSessionQuestions).not.toHaveBeenCalled();
  });

  it("calls getSessionQuestions once Turnstile succeeds on startSession", async () => {
    mockedRequireTurnstile.mockResolvedValue(undefined);

    const caller = makeCaller();
    const result = await caller.interviewCoach.startSession({ interviewType: "cas", count: 5, turnstileToken: "ok" });

    expect(result.success).toBe(true);
    expect(mockedGetSessionQuestions).toHaveBeenCalledTimes(1);
  });

  it("never calls assessAnswer (no LLM work) when Turnstile fails on submitAnswer", async () => {
    mockedRequireTurnstile.mockRejectedValue(new TRPCError({ code: "BAD_REQUEST", message: "no" }));

    const caller = makeCaller();
    await expect(
      caller.interviewCoach.submitAnswer({
        interviewType: "cas",
        question: "Why this course?",
        answer: "Because...",
        turnstileToken: "bad",
      })
    ).rejects.toThrow();

    expect(mockedAssessAnswer).not.toHaveBeenCalled();
  });
});

describe("Turnstile gates portal.requestReset", () => {
  it("never calls requestPasswordReset (no email sent) when Turnstile fails", async () => {
    mockedRequireTurnstile.mockRejectedValue(
      new TRPCError({ code: "BAD_REQUEST", message: "We couldn't verify you're human. Please try again." })
    );

    const caller = makeCaller();
    await expect(
      caller.portal.requestReset({ email: "student@example.com", turnstileToken: "bad" })
    ).rejects.toThrow(/verify you're human/i);

    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("calls requestPasswordReset once Turnstile verification succeeds", async () => {
    mockedRequireTurnstile.mockResolvedValue(undefined);

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "student@example.com", turnstileToken: "ok" });

    expect(result.success).toBe(true);
    expect(mockedRequestPasswordReset).toHaveBeenCalledWith("student@example.com");
    expect(mockedRequireTurnstile).toHaveBeenCalledWith("ok", "203.0.113.7");
  });
});
