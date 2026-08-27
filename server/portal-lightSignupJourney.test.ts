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
  linkPortalUserToPipedrive: vi.fn(),
}));
vi.mock("./portal-resolver", () => ({ resolvePortalDashboard: vi.fn() }));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("./routers");
const { createStudentLead } = await import("./pipedrive");
const { notifyStaff, sendApplicantConfirmation, sendPortalSetupEmail } = await import("./_core/notification");
const { createPortalUser, verifyPortalToken, getPortalUserById, linkPortalUserToPipedrive } = await import("./portal-auth");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedSendApplicantConfirmation = vi.mocked(sendApplicantConfirmation);
const mockedSendPortalSetupEmail = vi.mocked(sendPortalSetupEmail);
const mockedCreatePortalUser = vi.mocked(createPortalUser);
const mockedVerifyPortalToken = vi.mocked(verifyPortalToken);
const mockedGetPortalUserById = vi.mocked(getPortalUserById);
const mockedLinkPortalUserToPipedrive = vi.mocked(linkPortalUserToPipedrive);

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.7" } as any, res: {} as any });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateStudentLead.mockResolvedValue({
    personId: 8371,
    leadId: "58877ff0-a229-11f1-a4a0-1756967adcc3",
    recommendedCounsellorLabel: "Unallocated",
    reusedExistingPerson: false,
  });
});

const baseApplication = {
  gender: "female",
  dateOfBirth: "2000-01-01",
  phone: "+441234567890",
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

describe("portal.signup — light entry, no application fields", () => {
  it("creates a light account (no Pipedrive fields) and sends the setup email", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token", isExisting: false });

    const caller = makeCaller();
    const result = await caller.portal.signup({
      firstName: "Will",
      lastName: "Pembroke",
      email: "will@example.com",
      turnstileToken: "valid",
    });

    expect(result.success).toBe(true);
    expect(mockedCreatePortalUser).toHaveBeenCalledWith({
      email: "will@example.com",
      firstName: "Will",
      lastName: "Pembroke",
    });
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
    expect(mockedSendPortalSetupEmail).toHaveBeenCalledTimes(1);
  });

  it("alerts staff but still returns success:false gracefully if account creation throws", async () => {
    mockedCreatePortalUser.mockRejectedValue(new Error("Database not available"));

    const caller = makeCaller();
    const result = await caller.portal.signup({
      firstName: "Will",
      lastName: "Pembroke",
      email: "will@example.com",
      turnstileToken: "valid",
    });

    expect(result.success).toBe(false);
    expect(mockedSendPortalSetupEmail).not.toHaveBeenCalled();
  });
});

describe("portal.submitApplication — in-portal application completion", () => {
  it("rejects an invalid/expired session token before touching Pipedrive", async () => {
    mockedVerifyPortalToken.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.submitApplication({ token: "not-a-real-token", ...baseApplication });

    expect(result.success).toBe(false);
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
    expect(mockedGetPortalUserById).not.toHaveBeenCalled();
  });

  it("rejects when the account can't be found", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "will@example.com", firstName: "Will", lastName: "Pembroke" });
    mockedGetPortalUserById.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.submitApplication({ token: "valid-token", ...baseApplication });

    expect(result.success).toBe(false);
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });

  it("refuses to create a second Lead for an already-linked account — no duplicate Pipedrive records", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 1, email: "will@example.com", firstName: "Will", lastName: "Pembroke" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Will", pipedrivePersonId: 8371 });

    const caller = makeCaller();
    const result = await caller.portal.submitApplication({ token: "valid-token", ...baseApplication });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("already have an application");
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
    expect(mockedLinkPortalUserToPipedrive).not.toHaveBeenCalled();
  });

  it("on success: creates the Lead with the token's verified identity, links this exact account by id, notifies staff and the applicant, and never re-registers or re-emails a setup link", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 7, email: "will@example.com", firstName: "Will", lastName: "Pembroke" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Will", pipedrivePersonId: null });

    const caller = makeCaller();
    const result = await caller.portal.submitApplication({ token: "valid-token", ...baseApplication });

    expect(result.success).toBe(true);

    // Identity comes from the verified token, not any client-submitted value.
    const leadCallArg = mockedCreateStudentLead.mock.calls[0][0];
    expect(leadCallArg.firstName).toBe("Will");
    expect(leadCallArg.lastName).toBe("Pembroke");
    expect(leadCallArg.email).toBe("will@example.com");

    // Linked by id, not by a fresh email-matching createPortalUser call.
    expect(mockedLinkPortalUserToPipedrive).toHaveBeenCalledWith(7, {
      pipedrivePersonId: 8371,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "58877ff0-a229-11f1-a4a0-1756967adcc3",
    });
    expect(mockedCreatePortalUser).not.toHaveBeenCalled();
    expect(mockedSendPortalSetupEmail).not.toHaveBeenCalled();

    expect(mockedNotifyStaff).toHaveBeenCalled();
    expect(mockedSendApplicantConfirmation).toHaveBeenCalledWith("will@example.com", "Will");
  });

  it("still enforces the sponsor/scholarship/mixed structured-status validation", async () => {
    mockedVerifyPortalToken.mockResolvedValue({ portalUserId: 7, email: "will@example.com", firstName: "Will", lastName: "Pembroke" });
    mockedGetPortalUserById.mockResolvedValue({ firstName: "Will", pipedrivePersonId: null });

    const caller = makeCaller();
    await expect(
      caller.portal.submitApplication({ token: "valid-token", ...baseApplication, educationFunding: "sponsor" })
    ).rejects.toThrow();
    expect(mockedCreateStudentLead).not.toHaveBeenCalled();
  });
});
