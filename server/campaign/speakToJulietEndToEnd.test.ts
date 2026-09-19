import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The full Speak to Juliet journey, end to end, through the real code.
 *
 * WHY THIS EXISTS. The launch checks proved the landing page hands off to
 * /contact carrying campaign=speak-to-juliet, and proved production resolves
 * that campaign to exactly four recipients. Both were true. The first real
 * human test still notified the general staff list, because the journey has a
 * step neither check went through: "Continue with Google". The OAuth callback
 * rebuilds the /contact URL from scratch, the campaign was not carried through
 * the state, and by the time the form was submitted it was gone.
 *
 * So this test does not stop at the handoff. It follows the marker from the
 * landing page, through the Google round trip, into the sign-up procedure, and
 * asserts who the resulting notification actually goes to, resolving the
 * recipients the way the server resolves them rather than restating a list.
 */
vi.mock("../pipedrive", () => ({
  createStudentLead: vi.fn().mockResolvedValue({
    leadId: "test-lead-id",
    personId: 1,
    recommendedCounsellorLabel: "Help me choose",
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
const { buildSignupReturnUrl, campaignFromUntrusted } = await import("../portal-google-auth");
const { ENV } = await import("../_core/env");
const { CAMPAIGN_SLUGS } = await import("../../shared/campaignEnquiry");

const mockedNotifyStaff = vi.mocked(notifyStaff);
const mockedNotifyCampaignOwner = vi.mocked(notifyCampaignOwner);

const AUTHORISED = [
  "eldah@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "juliet@worldstudentadvisors.com",
  "tim.hunt@worldstudentadvisors.com",
];
const MUST_NOT_RECEIVE = {
  Manet: "manet@worldstudentadvisors.com",
  Tom: "tom@arringtonconsultancy.com",
  Sarafina: "sarafina@worldstudentadvisors.com",
  "the pipedrive mailbox": "pipedrive@worldstudentadvisors.com",
};

const norm = (list: readonly string[]) => [...list].map(s => s.toLowerCase().trim()).sort();

/** Everything the sign-up form requires, minus the campaign under test. */
const baseSignup = {
  firstName: "Regression",
  lastName: "Test",
  gender: "prefer-not-to-say",
  dateOfBirth: "2000-01-01",
  phone: "+2348035837934",
  email: "regression@example.com",
  nationality: "Nigeria",
  country: "Nigeria",
  highestQualification: "bachelors",
  desiredLevel: "postgraduate",
  areaOfStudy: "Public health",
  preferredMode: "full-time",
  preferredStartMonth: "September 2027",
  preferredDestination: "uk",
  educationFunding: "self-funded",
  gdprConsent: true,
  turnstileToken: "valid",
};

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.9" } as any, res: {} as any });
}

/** Who the campaign notification actually reached, resolved as the server resolves it. */
function recipientsOfCampaignCall(): string[] {
  expect(mockedNotifyCampaignOwner).toHaveBeenCalledTimes(1);
  const [slug] = mockedNotifyCampaignOwner.mock.calls[0];
  return ENV.campaignNotifyEmails[slug] ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Speak to Juliet, the whole journey rather than the handoff alone", () => {
  it("notifies exactly Juliet, Tim, Glenice and Eldah, and does not notify the general list", async () => {
    await makeCaller().contact.submitStudent({ ...baseSignup, campaign: "speak-to-juliet" } as any);

    expect(mockedNotifyCampaignOwner).toHaveBeenCalledTimes(1);
    expect(mockedNotifyStaff).not.toHaveBeenCalled();
    expect(norm(recipientsOfCampaignCall())).toEqual(norm(AUTHORISED));
  });

  it("does not reach anybody Tom Arrington excluded", async () => {
    await makeCaller().contact.submitStudent({ ...baseSignup, campaign: "speak-to-juliet" } as any);

    const reached = recipientsOfCampaignCall().join(" ").toLowerCase();
    for (const [person, address] of Object.entries(MUST_NOT_RECEIVE)) {
      expect(reached, `${person} must not be notified`).not.toContain(address);
    }
  });

  it("sends one notification, not two", async () => {
    await makeCaller().contact.submitStudent({ ...baseSignup, campaign: "speak-to-juliet" } as any);

    expect(mockedNotifyCampaignOwner.mock.calls.length + mockedNotifyStaff.mock.calls.length).toBe(1);
  });

  /**
   * The journey that actually failed. Each step below is the real function the
   * live request runs, in the order the browser runs them.
   */
  it("survives Continue with Google, which is where the first real test lost it", async () => {
    // 1. The landing page hands off. This is the URL the browser is sent to.
    const handoff = new URL("https://www.worldstudentadvisors.com/contact?firstName=Regression&campaign=speak-to-juliet");

    // 2. The student clicks Continue with Google. The page passes the campaign
    //    it is holding to the OAuth start, which puts it into the state.
    const intoState = campaignFromUntrusted(handoff.searchParams.get("campaign"));
    expect(intoState).toBe("speak-to-juliet");

    // 3. Google returns. The callback rebuilds the /contact URL from scratch.
    const back = new URL(buildSignupReturnUrl(
      "https://www.worldstudentadvisors.com/api/portal/auth/google/callback",
      "prefill-token",
      intoState,
    ));
    expect(back.pathname).toBe("/contact");
    expect(back.searchParams.get("gpt")).toBe("prefill-token");
    expect(back.searchParams.get("campaign"), "the marker must survive the round trip").toBe("speak-to-juliet");

    // 4. The form reads the campaign off that URL and submits it.
    await makeCaller().contact.submitStudent({
      ...baseSignup,
      campaign: back.searchParams.get("campaign") ?? "",
    } as any);

    // 5. The notification goes where Tom authorised, and nowhere else.
    expect(mockedNotifyStaff, "the general staff list must not be notified").not.toHaveBeenCalled();
    expect(norm(recipientsOfCampaignCall())).toEqual(norm(AUTHORISED));
  });

  it("puts nothing back on the return URL when the journey had no campaign", () => {
    const back = new URL(buildSignupReturnUrl(
      "https://www.worldstudentadvisors.com/api/portal/auth/google/callback",
      "prefill-token",
      "",
    ));
    expect(back.searchParams.get("campaign")).toBeNull();
    expect(back.searchParams.get("gpt")).toBe("prefill-token");
  });

  it("carries nothing a visitor can craft through the round trip", () => {
    for (const crafted of ["", "unknown-campaign", "../admin", "SPEAK-TO-JULIET", "speak-to-juliet ", null, 7, {}]) {
      expect(campaignFromUntrusted(crafted), `"${String(crafted)}" must not survive`).toBe("");
      const back = new URL(buildSignupReturnUrl(
        "https://www.worldstudentadvisors.com/api/portal/auth/google/callback",
        "prefill-token",
        crafted,
      ));
      expect(back.searchParams.get("campaign")).toBeNull();
    }
  });
});

describe("every other enquiry is untouched", () => {
  it("an ordinary enquiry still notifies the general staff list and no campaign", async () => {
    await makeCaller().contact.submitStudent({ ...baseSignup } as any);

    expect(mockedNotifyStaff).toHaveBeenCalledTimes(1);
    expect(mockedNotifyCampaignOwner).not.toHaveBeenCalled();
    // The general list is unchanged by any of this, asserted address by
    // address. Juliet is deliberately not on it: she is reached through her
    // own campaign, which is the whole point of the mechanism.
    expect(norm(ENV.staffNotifyEmails)).toEqual(norm([
      "tim.hunt@worldstudentadvisors.com",
      "eldah@worldstudentadvisors.com",
      "sarafina@worldstudentadvisors.com",
      "glenice@worldstudentadvisors.com",
      "manet@worldstudentadvisors.com",
      "tom@arringtonconsultancy.com",
      "pipedrive@worldstudentadvisors.com",
    ]));
    expect(norm(ENV.staffNotifyEmails)).not.toContain("juliet@worldstudentadvisors.com");
  });

  it("a crafted campaign value falls back to the general list rather than suppressing it", async () => {
    for (const crafted of ["unknown-campaign", "../admin", "SPEAK-TO-JULIET"]) {
      vi.clearAllMocks();
      await makeCaller().contact.submitStudent({ ...baseSignup, campaign: crafted } as any);
      expect(mockedNotifyStaff, `"${crafted}" must not suppress the general notification`).toHaveBeenCalledTimes(1);
      expect(mockedNotifyCampaignOwner).not.toHaveBeenCalled();
    }
  });

  it("only the closed list of campaigns exists at all", () => {
    expect([...CAMPAIGN_SLUGS]).toEqual(["speak-to-juliet"]);
  });
});
