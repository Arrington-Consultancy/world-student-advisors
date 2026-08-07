import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn(),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPortalToken: vi.fn(),
}));
vi.mock("./_core/turnstile", () => ({
  requireTurnstile: vi.fn().mockResolvedValue(undefined),
}));

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
  firstName: "Amina",
  lastName: "Student",
  gender: "female",
  dateOfBirth: "2000-01-01",
  phone: "+441234567890",
  email: "amina.student@example.com",
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

/** Finds the staff alert specifically about a broken portal step, if any was sent. */
function findPortalFailureAlert() {
  return mockedNotifyStaff.mock.calls.find(([payload]) => payload.title.includes("Portal") && payload.title.includes("FAILED"));
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateStudentLead.mockResolvedValue({
    personId: 42,
    leadId: "lead-uuid-onboarding",
    ownerId: 25633444,
    ownerName: "Eldah Therone",
    needsAllocation: false,
    reusedExistingPerson: false,
  });
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

describe("Initial portal setup email", () => {
  it("sends the applicant a setup email containing their link when createPortalUser succeeds", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token-abc", isExisting: false } as any);

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true);
    expect(mockedSendPortalSetupEmail).toHaveBeenCalledTimes(1);

    const [to, firstName, link] = mockedSendPortalSetupEmail.mock.calls[0];
    expect(to).toBe(validSignup.email);
    expect(firstName).toBe(validSignup.firstName);
    expect(link).toContain("raw-setup-token-abc");
    expect(link).toContain(encodeURIComponent(validSignup.email));

    // No failure alert on the happy path.
    expect(findPortalFailureAlert()).toBeUndefined();
  });

  it("never includes the raw setup token in the client-facing response", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token-abc", isExisting: false } as any);

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(JSON.stringify(result)).not.toContain("raw-setup-token-abc");
    expect(result).not.toHaveProperty("portalToken");
  });

  it("never mentions the setup link in the internal staff enquiry email", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token-abc", isExisting: false } as any);

    const caller = makeCaller();
    await caller.contact.submitStudent(validSignup);

    const enquiryCall = mockedNotifyStaff.mock.calls.find(([payload]) => payload.title.includes("New Student Enquiry"));
    expect(enquiryCall).toBeTruthy();
    expect(enquiryCall![0].content).not.toContain("raw-setup-token-abc");
    expect(enquiryCall![0].content).not.toContain("Portal Setup Link");
  });
});

describe("Failed initial setup email", () => {
  it("does not fail the enquiry, and alerts staff explicitly, when the setup email fails to send", async () => {
    mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "raw-setup-token-xyz", isExisting: false } as any);
    mockedSendPortalSetupEmail.mockResolvedValue(false);

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true); // the enquiry itself still succeeds
    expect(findPortalFailureAlert()).toBeTruthy();

    // No leakage of the raw token into any console.error call.
    for (const call of consoleErrorSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("raw-setup-token-xyz");
    }
  });

  it("does not fail the enquiry, and alerts staff explicitly, when createPortalUser itself throws", async () => {
    mockedCreatePortalUser.mockRejectedValue(new Error("Database not available"));

    const caller = makeCaller();
    const result = await caller.contact.submitStudent(validSignup);

    expect(result.success).toBe(true);
    expect(mockedSendPortalSetupEmail).not.toHaveBeenCalled();
    expect(findPortalFailureAlert()).toBeTruthy();
  });
});

describe("Password reset request", () => {
  it("sends a reset email with the link for a valid, existing account", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "reset-token-123", firstName: "Amina" });

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "amina@example.com", turnstileToken: "ok" });

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/if an account exists/i);
    expect(mockedSendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const [to, firstName, link] = mockedSendPasswordResetEmail.mock.calls[0];
    expect(to).toBe("amina@example.com");
    expect(firstName).toBe("Amina");
    expect(link).toContain("reset-token-123");
  });

  it("returns the identical response for an unknown email, without sending any email", async () => {
    mockedRequestPasswordReset.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "nobody@example.com", turnstileToken: "ok" });

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/if an account exists/i);
    expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("gives byte-identical responses for a known vs an unknown account (anti-enumeration)", async () => {
    mockedRequestPasswordReset.mockResolvedValueOnce({ token: "t1", firstName: "Known" });
    const known = await makeCaller().portal.requestReset({ email: "known@example.com", turnstileToken: "ok" });

    mockedRequestPasswordReset.mockResolvedValueOnce(null);
    const unknown = await makeCaller().portal.requestReset({ email: "unknown@example.com", turnstileToken: "ok" });

    expect(known).toEqual(unknown);
  });

  it("still returns the generic response and alerts staff (not the requester) when the reset email fails to send", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "reset-token-456", firstName: "Amina" });
    mockedSendPasswordResetEmail.mockResolvedValue(false);

    const caller = makeCaller();
    const result = await caller.portal.requestReset({ email: "amina@example.com", turnstileToken: "ok" });

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/if an account exists/i);
    expect(findPortalFailureAlert()).toBeTruthy();
  });

  it("never logs the raw reset token, on success or on send failure", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ token: "super-secret-reset-token", firstName: "Amina" });
    mockedSendPasswordResetEmail.mockResolvedValue(false);

    const caller = makeCaller();
    await caller.portal.requestReset({ email: "amina@example.com", turnstileToken: "ok" });

    for (const call of [...consoleLogSpy.mock.calls, ...consoleErrorSpy.mock.calls]) {
      expect(JSON.stringify(call)).not.toContain("super-secret-reset-token");
    }
  });
});
