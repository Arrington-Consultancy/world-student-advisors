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
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { notifyStaff, sendPortalSetupEmail, sendPasswordResetEmail } = await import("./_core/notification");
const { createPortalUser, requestPasswordReset } = await import("./portal-auth");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedSendPortalSetupEmail = vi.mocked(sendPortalSetupEmail);
const mockedSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
const mockedCreatePortalUser = vi.mocked(createPortalUser);
const mockedRequestPasswordReset = vi.mocked(requestPasswordReset);

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
  mockedCreateStudentLead.mockResolvedValue({
    personId: 8455,
    leadId: "ce8b5300-43a8-11f1-a337-33eff7c8a9b7",
    recommendedCounsellorLabel: "Eldah Therone",
    reusedExistingPerson: false,
  });
});

describe("submitStudent — portal setup email flow", () => {
  it("sends the setup email directly to the applicant, with the raw token only in the emailed link", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });

    const caller = makeCaller();
    await caller.contact.submitStudent(validSignup);

    expect(mockedCreatePortalUser).toHaveBeenCalledWith({
      email: validSignup.email,
      firstName: validSignup.firstName,
      lastName: validSignup.lastName,
      pipedrivePersonId: 8455,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "ce8b5300-43a8-11f1-a337-33eff7c8a9b7",
    });
    expect(mockedSendPortalSetupEmail).toHaveBeenCalledTimes(1);
    const [to, firstName, setupLink] = mockedSendPortalSetupEmail.mock.calls[0];
    expect(to).toBe(validSignup.email);
    expect(firstName).toBe(validSignup.firstName);
    expect(setupLink).toContain("token=raw-setup-token");
    expect(setupLink).toContain("/portal/set-password");
  });

  it("never returns the raw setup token to the client", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result).not.toHaveProperty("portalToken");
    expect(JSON.stringify(result)).not.toContain("raw-setup-token");
    if (result.success) {
      expect(Object.keys(result).sort()).toEqual(["leadId", "success"]);
    }
  });

  it("never puts the setup link or raw token in the staff notification email", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });

    const caller = makeCaller();
    await caller.contact.submitStudent(validSignup);

    const staffCall = mockedNotifyStaff.mock.calls.find(call => call[0].title.includes("New Student Enquiry"));
    expect(staffCall).toBeDefined();
    expect(staffCall![0].content).not.toContain("raw-setup-token");
    expect(staffCall![0].content.toLowerCase()).not.toContain("portal setup link");
  });

  it("alerts staff (without failing the enquiry) when the setup email fails to send", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });
    mockedSendPortalSetupEmail.mockResolvedValue(false);

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true);
    const failureAlert = mockedNotifyStaff.mock.calls.find(call => call[0].title.includes("Portal setup email FAILED"));
    expect(failureAlert).toBeDefined();
    expect(failureAlert![0].content).toContain(validSignup.email);
  });

  it("alerts staff (without failing the enquiry) when portal account creation itself throws", async () => {
    mockedCreatePortalUser.mockRejectedValue(new Error("Database not available"));

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.leadId).toBe("ce8b5300-43a8-11f1-a337-33eff7c8a9b7");
    }
    expect(mockedSendPortalSetupEmail).not.toHaveBeenCalled();
    const failureAlert = mockedNotifyStaff.mock.calls.find(call => call[0].title.includes("Portal account creation FAILED"));
    expect(failureAlert).toBeDefined();
  });

  it("does not include allocation/ownership language anywhere in the enquiry flow", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });

    const caller = makeCaller();
    await caller.contact.submitStudent(validSignup);

    const allContent = mockedNotifyStaff.mock.calls.map(call => `${call[0].title} ${call[0].content}`).join(" ").toLowerCase();
    expect(allContent).not.toContain("needsallocation");
    expect(allContent).not.toContain("assigned to eldah");
    expect(allContent).not.toContain("owner_id");
  });
});

describe("portal.requestReset — password reset email flow", () => {
  it("sends the reset email with a personalised link when the account exists", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "raw-reset-token", firstName: "Amara" });

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "amara@example.com", turnstileToken: "valid" });

    expect(mockedSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [to, firstName, resetLink] = mockedSendPasswordResetEmail.mock.calls[0];
    expect(to).toBe("amara@example.com");
    expect(firstName).toBe("Amara");
    expect(resetLink).toContain("token=raw-reset-token");
    expect(result).toEqual({ success: true, message: "If an account exists with that email, a reset link has been sent." });
  });

  it("gives the identical response, and sends no email, when no account exists — anti-enumeration", async () => {
    mockedRequestPasswordReset.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "nobody@example.com", turnstileToken: "valid" });

    expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: "If an account exists with that email, a reset link has been sent." });
  });

  it("never returns or logs the raw reset token", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "raw-reset-token", firstName: "Amara" });
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "amara@example.com", turnstileToken: "valid" });

    expect(JSON.stringify(result)).not.toContain("raw-reset-token");
    const loggedRawToken = consoleLogSpy.mock.calls.some(call => call.some(arg => String(arg).includes("raw-reset-token")));
    expect(loggedRawToken).toBe(false);

    consoleLogSpy.mockRestore();
  });

  it("alerts staff, but still returns the identical anti-enumeration response, when the reset email fails to send", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "raw-reset-token", firstName: "Amara" });
    mockedSendPasswordResetEmail.mockResolvedValue(false);

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "amara@example.com", turnstileToken: "valid" });

    expect(result).toEqual({ success: true, message: "If an account exists with that email, a reset link has been sent." });
    const failureAlert = mockedNotifyStaff.mock.calls.find(call => call[0].title.includes("Portal reset email FAILED"));
    expect(failureAlert).toBeDefined();
  });
});
