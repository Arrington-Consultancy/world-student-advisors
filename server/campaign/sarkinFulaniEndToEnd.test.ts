import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The Sarkin Fulani Future Leaders Programme Expression of Interest, end to
 * end through the real sign-up procedure, asserting who is told and what
 * they are told.
 *
 * Tim Hunt, 15 October 2026: "please direct the initial enquiry
 * notifications to Farooq, Maryam and me. The counsellors should become
 * involved once Farooq has confirmed eligibility and Maryam is ready to
 * progress the student." And: "Farooq should receive only the basic
 * information needed to establish eligibility. No passport numbers or
 * sensitive documents."
 *
 * Farooq's address is a personal one and is set in production, so these
 * tests check the shape of the list (Tim and Maryam present, no
 * counsellor) and the content of the email, not Farooq's address itself.
 */
vi.mock("../pipedrive", () => ({
  createStudentLead: vi.fn().mockResolvedValue({
    leadId: "lead-4711",
    personId: 1,
    recommendedCounsellorLabel: "Unallocated",
    reusedExistingPerson: false,
  }),
}));
vi.mock("../_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyCampaignOwner: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("../db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
  recordInterviewCoachSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../portal-auth", () => ({
  createPortalUser: vi.fn().mockResolvedValue({ token: "setup-token" }),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(null),
  verifyPortalToken: vi.fn(),
  getPortalUserById: vi.fn(),
  verifySignupPrefillToken: vi.fn(),
  findGoogleUser: vi.fn(),
  mintSignupPrefillToken: vi.fn().mockResolvedValue("prefill-token"),
}));
vi.mock("../portal-resolver", () => ({
  resolvePortalDashboard: vi.fn().mockResolvedValue({ state: "no_record" }),
}));
vi.mock("../_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const { appRouter } = await import("../routers");
const { notifyStaff, notifyCampaignOwner } = await import("../_core/notification");
const { ENV } = await import("../_core/env");
const { CAMPAIGN_SLUG, expressInterestHandoffUrl } = await import("../../client/src/lib/sarkinFulani");

const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedNotifyCampaignOwner = vi.mocked(notifyCampaignOwner);

const COUNSELLORS_AND_OTHERS = ["eldah@", "glenice@", "manet@", "claudia@", "sarafina@", "tom@arringtonconsultancy.com", "pipedrive@"];

/** What a family's answers look like after the hand-off and the second page. */
const handoff = new URL(expressInterestHandoffUrl({
  role: "parent", firstName: "Aisha", lastName: "Bello", email: "aisha.bello@example.com", phone: "08031234567", opportunity: "full-time-january-2027",
}), "https://www.worldstudentadvisors.com");
const signup = {
  firstName: handoff.searchParams.get("firstName"),
  lastName: handoff.searchParams.get("lastName"),
  email: handoff.searchParams.get("email"),
  phone: handoff.searchParams.get("phone"),
  desiredLevel: handoff.searchParams.get("desiredLevel"),
  areaOfStudy: handoff.searchParams.get("areaOfStudy"),
  preferredDestination: handoff.searchParams.get("preferredDestination"),
  campaign: handoff.searchParams.get("campaign"),
  gender: "female",
  dateOfBirth: "2012-05-14",
  passportNumber: "A01234567",
  nationality: "Nigeria",
  country: "Nigeria",
  highestQualification: "other",
  preferredMode: "full-time",
  preferredStartMonth: "January 2027",
  educationFunding: "self-funded",
  gdprConsent: true,
  turnstileToken: "valid",
};

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.9" } as any, res: {} as any });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("who an Expression of Interest reaches", () => {
  it("sends the programme's own notification and not the Student Counsellors' general one", async () => {
    expect(signup.campaign).toBe(CAMPAIGN_SLUG);
    await makeCaller().contact.submitStudent(signup as any);
    expect(mockedNotifyCampaignOwner).toHaveBeenCalledTimes(1);
    expect(mockedNotifyStaff).not.toHaveBeenCalled();
    expect(mockedNotifyCampaignOwner.mock.calls[0][0]).toBe(CAMPAIGN_SLUG);
  });

  it("resolves to Tim and Maryam, and to no counsellor, as the server resolves it", async () => {
    await makeCaller().contact.submitStudent(signup as any);
    const list = (ENV.campaignNotifyEmails[CAMPAIGN_SLUG] ?? []).map(a => a.toLowerCase());
    expect(list).toContain("tim.hunt@worldstudentadvisors.com");
    expect(list).toContain("maryam@worldstudentadvisors.com");
    for (const address of COUNSELLORS_AND_OTHERS) expect(list.join(" "), `${address} is not told before eligibility is confirmed`).not.toContain(address);
  });
});

describe("what the Office of His Royal Highness is told", () => {
  async function campaignEmail() {
    await makeCaller().contact.submitStudent(signup as any);
    const [, payload] = mockedNotifyCampaignOwner.mock.calls[0];
    return payload as { title: string; content: string };
  }

  it("carries the name, who they are and which opportunity, contact details, nationality and country, and the Lead id", async () => {
    const email = await campaignEmail();
    expect(email.title).toBe("Sarkin Fulani Future Leaders Programme, Expression of Interest: Aisha Bello");
    expect(email.content).toContain("Name: Aisha Bello");
    expect(email.content).toContain("Expression of interest: Sarkin Fulani Future Leaders Programme: Full-time education at Brooke House College, January 2027 (parent or guardian)");
    expect(email.content).toContain("Email: aisha.bello@example.com");
    expect(email.content).toContain("WhatsApp / phone: +2348031234567");
    expect(email.content).toContain("Nationality: Nigeria");
    expect(email.content).toContain("Country: Nigeria");
    expect(email.content).toContain("Pipedrive Lead ID: lead-4711");
    expect(email.content).toContain("The general WSA staff list has not been notified of it.");
  });

  it("carries no date of birth, passport number, gender, qualification, funding or counsellor detail", async () => {
    const email = await campaignEmail();
    for (const absent of ["Date of Birth", "2012-05-14", "Passport", "A01234567", "Gender", "Qualification", "Funding", "Recommended Counsellor", "Desired Level", "Preferred Mode", "Start:"]) {
      expect(email.content, `${absent} must not be sent`).not.toContain(absent);
    }
    expect(email.title).not.toContain("Rec:");
  });
});

describe("an ordinary enquiry is untouched by any of this", () => {
  it("still notifies the general staff list and no campaign", async () => {
    const { campaign: _dropped, ...ordinary } = signup;
    await makeCaller().contact.submitStudent({ ...ordinary, areaOfStudy: "Public health", desiredLevel: "postgraduate" } as any);
    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    expect(mockedNotifyCampaignOwner).not.toHaveBeenCalled();
    const content = (mockedNotifyStaff.mock.calls[0][0] as { content: string }).content;
    expect(content).toContain("Date of Birth: 2012-05-14");
  });
});
