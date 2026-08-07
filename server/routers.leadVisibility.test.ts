import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./pipedrive", async () => {
  const actual = await vi.importActual<typeof import("./pipedrive")>("./pipedrive");
  return {
    ...actual,
    createStudentLead: vi.fn(),
  };
});
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
vi.mock("./_core/turnstile", () => ({
  requireTurnstile: vi.fn().mockResolvedValue(undefined),
}));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { notifyStaff } = await import("./_core/notification");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.7" } as any, res: {} as any });
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
});

describe("Recommended Counsellor visibility in the staff email", () => {
  it("puts the recommended counsellor's real name in the email subject line", async () => {
    mockedCreateStudentLead.mockResolvedValue({
      personId: 1,
      leadId: "lead-uuid-1",
      recommendedCounsellorLabel: "Eldah Therone",
      reusedExistingPerson: false,
    });

    const caller = makeCaller();
    await caller.contact.submitStudent({ ...validSignup, recommendedCounsellor: "eldah" });

    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    const payload = mockedNotifyStaff.mock.calls[0][0];
    expect(payload.title).toContain("Rec: Eldah Therone");
    expect(payload.content).toContain("Recommended Counsellor: Eldah Therone");
  });

  it("labels an unselected counsellor as 'Help me choose' in both subject and body", async () => {
    mockedCreateStudentLead.mockResolvedValue({
      personId: 1,
      leadId: "lead-uuid-2",
      recommendedCounsellorLabel: "Help me choose",
      reusedExistingPerson: false,
    });

    const caller = makeCaller();
    await caller.contact.submitStudent({ ...validSignup, recommendedCounsellor: "" });

    const payload = mockedNotifyStaff.mock.calls[0][0];
    expect(payload.title).toContain("Rec: Help me choose");
    expect(payload.content).toContain("Recommended Counsellor: Help me choose");
  });

  it("never claims the recommended counsellor is the Lead's owner anywhere in the email", async () => {
    mockedCreateStudentLead.mockResolvedValue({
      personId: 1,
      leadId: "lead-uuid-3",
      recommendedCounsellorLabel: "Glenice Owino",
      reusedExistingPerson: false,
    });

    const caller = makeCaller();
    await caller.contact.submitStudent({ ...validSignup, recommendedCounsellor: "glenice" });

    const payload = mockedNotifyStaff.mock.calls[0][0];
    expect(payload.title.toLowerCase()).not.toContain("owner");
    expect(payload.content.toLowerCase()).not.toContain("assigned to");
    expect(payload.content.toLowerCase()).not.toContain("owner");
  });
});
