import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./pipedrive", () => ({
  createStudentLead: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
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
  getPortalUserById: vi.fn().mockResolvedValue(null),
}));
vi.mock("./portal-resolver", () => ({
  resolvePortalDashboard: vi.fn().mockResolvedValue({ state: "no_record" }),
}));
vi.mock("./interviewCoach", () => ({
  getSessionQuestions: vi.fn(),
  assessAnswer: vi.fn(),
  summariseSession: vi.fn(),
  TYPE_LABELS: { cas: "CAS", ukvi: "UKVI", university: "University", course: "Course" },
}));
vi.mock("./_core/turnstile", () => ({
  requireTurnstile: vi.fn().mockResolvedValue(undefined),
}));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { notifyStaff } = await import("./_core/notification");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);

function makeCaller() {
  const ctx = { req: { ip: "203.0.113.7" } as any, res: {} as any };
  return appRouter.createCaller(ctx);
}

const baseSignup = {
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
  gdprConsent: true,
  turnstileToken: "a-valid-token",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateStudentLead.mockResolvedValue({
    personId: 1,
    leadId: "58be91f0-90c4-11f1-b0fa-7d61200439c7",
    recommendedCounsellorLabel: "Unallocated",
    reusedExistingPerson: false,
  });
});

describe("contact.submitStudent — server-side funding-status enforcement", () => {
  it("rejects Sponsor / Employer with no sponsor name or status", async () => {
    const caller = makeCaller();
    await expect(
      caller.contact.submitStudent({ ...baseSignup, educationFunding: "sponsor" })
    ).rejects.toThrow();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });

  it("rejects Sponsor / Employer with a name but no valid status", async () => {
    const caller = makeCaller();
    await expect(
      caller.contact.submitStudent({ ...baseSignup, educationFunding: "sponsor", sponsorName: "Acme Corp", sponsorStatus: "Maybe" })
    ).rejects.toThrow();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });

  it("accepts Sponsor / Employer with a name and a valid status, and forwards both", async () => {
    const caller = makeCaller();
    const result = await caller.contact.submitStudent({
      ...baseSignup,
      educationFunding: "sponsor",
      sponsorName: "Acme Corp",
      sponsorStatus: "Confirmed",
    });
    expect(result.success).toBe(true);
    expect(mockedCreateStudentLead).toHaveBeenCalledTimes(1);
    const callArg = mockedCreateStudentLead.mock.calls[0][0];
    expect(callArg.sponsorName).toBe("Acme Corp");
    expect(callArg.sponsorStatus).toBe("Confirmed");
    const emailContent = mockedNotifyStaff.mock.calls[0][0].content;
    expect(emailContent).toContain("Sponsor Name: Acme Corp");
    expect(emailContent).toContain("Funding Status: Confirmed");
  });

  it("rejects Scholarship with no scholarship name or status", async () => {
    const caller = makeCaller();
    await expect(
      caller.contact.submitStudent({ ...baseSignup, educationFunding: "scholarship" })
    ).rejects.toThrow();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });

  it("accepts Scholarship with name and status but no coverage (coverage is optional)", async () => {
    const caller = makeCaller();
    const result = await caller.contact.submitStudent({
      ...baseSignup,
      educationFunding: "scholarship",
      scholarshipName: "Chevening",
      scholarshipStatus: "Awarded",
    });
    expect(result.success).toBe(true);
    const callArg = mockedCreateStudentLead.mock.calls[0][0];
    expect(callArg.scholarshipName).toBe("Chevening");
    expect(callArg.scholarshipStatus).toBe("Awarded");
    const emailContent = mockedNotifyStaff.mock.calls[0][0].content;
    expect(emailContent).toContain("Scholarship Name: Chevening");
    expect(emailContent).not.toContain("Covers:");
  });

  it("rejects Mixed funding missing any of the three required answers", async () => {
    const caller = makeCaller();
    await expect(
      caller.contact.submitStudent({
        ...baseSignup,
        educationFunding: "mixed",
        mixedFundingSources: "Self-funded plus a sponsor",
        // mixedFundingConfirmedAmount and mixedFundingRemaining both missing
      })
    ).rejects.toThrow();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });

  it("accepts Mixed funding once all three answers are given, and forwards them", async () => {
    const caller = makeCaller();
    const result = await caller.contact.submitStudent({
      ...baseSignup,
      educationFunding: "mixed",
      mixedFundingSources: "Self-funded plus a sponsor",
      mixedFundingConfirmedAmount: "50% self-funded, already available",
      mixedFundingRemaining: "Remainder depends on employer sign-off",
    });
    expect(result.success).toBe(true);
    const callArg = mockedCreateStudentLead.mock.calls[0][0];
    expect(callArg.mixedFundingSources).toBe("Self-funded plus a sponsor");
    const emailContent = mockedNotifyStaff.mock.calls[0][0].content;
    expect(emailContent).toContain("Funding Sources: Self-funded plus a sponsor");
    expect(emailContent).toContain("Already Confirmed: 50% self-funded, already available");
    expect(emailContent).toContain("Still Dependent on Approval: Remainder depends on employer sign-off");
  });

  it("does not require any structured fields for Self-funded / Family", async () => {
    const caller = makeCaller();
    const result = await caller.contact.submitStudent({ ...baseSignup, educationFunding: "self-funded" });
    expect(result.success).toBe(true);
    expect(mockedCreateStudentLead).toHaveBeenCalledTimes(1);
  });

  it("does not require any structured fields for Student Loan", async () => {
    const caller = makeCaller();
    const result = await caller.contact.submitStudent({ ...baseSignup, educationFunding: "loan" });
    expect(result.success).toBe(true);
    expect(mockedCreateStudentLead).toHaveBeenCalledTimes(1);
  });
});
