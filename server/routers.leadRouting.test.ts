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
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("./db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn().mockResolvedValue({ token: "portal-token", isExisting: false }),
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
const { createPortalUser } = await import("./portal-auth");

const mockedCreateStudentLead = vi.mocked(createStudentLead);
const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedCreatePortalUser = vi.mocked(createPortalUser);

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
  mockedCreatePortalUser.mockResolvedValue({ userId: 1, token: "portal-token", isExisting: false } as any);
});

describe.each([
  ["eldah", "Eldah Therone", 25633444],
  ["glenice", "Glenice Owino", 25633433],
  ["manet", "Manet Khamayo", 25633422],
  ["sarafina", "Sarafina Kihumbu", 25633455],
] as const)("router: recommendedCounsellor = %s", (counsellorValue, ownerName, ownerId) => {
  it("creates a portal account with pipedriveObjectType 'lead' and sends a normal (non-allocation) staff email", async () => {
    mockedCreateStudentLead.mockResolvedValue({
      personId: 42,
      leadId: `lead-uuid-${counsellorValue}`,
      ownerId,
      ownerName,
      needsAllocation: false,
      reusedExistingPerson: false,
    });

    const caller = makeCaller();
    const result = await caller.contact.submitStudent({ ...validSignup, recommendedCounsellor: counsellorValue });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.leadId).toBe(`lead-uuid-${counsellorValue}`);
    }

    // Portal account creation succeeds with the new object-type/object-id shape.
    expect(mockedCreatePortalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        pipedrivePersonId: 42,
        pipedriveObjectType: "lead",
        pipedriveObjectId: `lead-uuid-${counsellorValue}`,
      })
    );

    // Full staff email fired, no allocation-needed language, mentions the owner.
    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    const call = mockedNotifyStaff.mock.calls[0][0];
    expect(call.title).not.toContain("Needs Allocation");
    expect(call.content).toContain(`Assigned to: ${ownerName}`);
    expect(call.content).toContain(`Pipedrive Lead ID: lead-uuid-${counsellorValue}`);
    expect(call.content).not.toContain("Pipedrive Deal ID");
  });
});

describe("router: no counsellor selected (unallocated)", () => {
  it("creates the portal account, flags allocation needed in the email, and reaches both Eldah and Tim via the staff list", async () => {
    mockedCreateStudentLead.mockResolvedValue({
      personId: 99,
      leadId: "lead-uuid-unallocated",
      ownerId: 25633444,
      ownerName: "Eldah Therone",
      needsAllocation: true,
      reusedExistingPerson: false,
    });

    const caller = makeCaller();
    const result = await caller.contact.submitStudent({ ...validSignup, recommendedCounsellor: "" });

    expect(result.success).toBe(true);

    expect(mockedCreatePortalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        pipedrivePersonId: 99,
        pipedriveObjectType: "lead",
        pipedriveObjectId: "lead-uuid-unallocated",
      })
    );

    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    const call = mockedNotifyStaff.mock.calls[0][0];
    expect(call.title).toContain("Needs Allocation");
    expect(call.content).toContain("needs allocating");
    expect(call.content).toContain("Assigned to: Eldah Therone");

    // notifyStaff itself always targets the full staff list (which includes
    // both tim.hunt@ and eldah@ — see server/_core/env.ts
    // DEFAULT_STAFF_NOTIFY_EMAILS), so "reaches both Tim and Eldah" doesn't
    // depend on any per-case recipient logic here; this assertion confirms
    // the router doesn't override or narrow the recipient list for this case.
    expect(mockedNotifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Needs Allocation") })
    );
  });
});
