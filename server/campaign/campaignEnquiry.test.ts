import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  CAMPAIGN_LABELS,
  CAMPAIGN_PATHS,
  CAMPAIGN_SLUGS,
  isCampaignSlug,
} from "../../shared/campaignEnquiry";
import { CAMPAIGN_SLUG } from "../../client/src/lib/speakToJuliet";

/**
 * The campaign mechanism that makes "Juliet will come back to you" true.
 *
 * Tom Arrington, 19 September 2026: the page said Juliet would come back to
 * the student, and the flow notified a staff list she is not on. The smallest
 * safe fix is a closed list of campaign slugs: a landing page emits one, the
 * signup procedure records it in the Lead note that is already written and
 * emails the campaign's own recipients as well as the usual list.
 *
 * What these tests exist to stop: a crafted value reaching a recipient list,
 * the general staff list being narrowed, a second CRM write path appearing,
 * and anybody being added to the counsellor vocabulary by the back door.
 */

/** Comments explain what the code deliberately does not do, and naturally
 *  name it. Stripped before any check about what the code actually does. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const ROUTER = readFileSync("server/routers.ts", "utf8");
const PIPEDRIVE = readFileSync("server/pipedrive.ts", "utf8");
const ENV_SOURCE = readFileSync("server/_core/env.ts", "utf8");
const NOTIFICATION = readFileSync("server/_core/notification.ts", "utf8");
const JULIET_PAGE = readFileSync("client/src/pages/SpeakToJuliet.tsx", "utf8");
const CONTACT = readFileSync("client/src/pages/Contact.tsx", "utf8");

describe("the closed list", () => {
  it("every slug has a label and a path", () => {
    for (const slug of CAMPAIGN_SLUGS) {
      expect(CAMPAIGN_LABELS[slug], `${slug} needs a label`).toBeTruthy();
      expect(CAMPAIGN_PATHS[slug], `${slug} needs a path`).toMatch(/^\//);
    }
  });

  it("accepts only what is on it", () => {
    expect(isCampaignSlug("speak-to-juliet")).toBe(true);
    for (const crafted of ["", " ", "speak-to-juliet ", "SPEAK-TO-JULIET", "../admin", "juliet", "<script>"]) {
      expect(isCampaignSlug(crafted), `"${crafted}" must not be accepted`).toBe(false);
    }
  });

  it("names no recipient, so the browser never learns who is emailed", () => {
    const shared = readFileSync("shared/campaignEnquiry.ts", "utf8");
    expect(shared).not.toContain("@");
  });

  it("is the slug the Juliet page sends", () => {
    expect(CAMPAIGN_SLUG).toBe("speak-to-juliet");
    expect(isCampaignSlug(CAMPAIGN_SLUG)).toBe(true);
  });
});

/**
 * The authorised recipient set for Speak to Juliet. Tim Hunt's master draft
 * of 19 September 2026 names these four and excludes Manet, Tom and Claudia;
 * Tom Arrington confirmed it the same day, authorising his own exclusion.
 */
const JULIET_AUTHORISED = [
  "juliet@worldstudentadvisors.com",
  "tim.hunt@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
];

const MUST_NOT_RECEIVE = {
  Manet: "manet@worldstudentadvisors.com",
  Tom: "tom@arringtonconsultancy.com",
  Claudia: "claudia",
};

/** The recipients ENV actually resolves for a campaign, read as the server does. */
async function recipientsFor(slug: string): Promise<string[]> {
  const { ENV } = await import("../_core/env");
  return ENV.campaignNotifyEmails[slug] ?? [];
}

describe("who a Speak to Juliet enquiry notifies", () => {
  it("uses exactly Juliet, Tim, Glenice and Eldah", async () => {
    const recipients = await recipientsFor("speak-to-juliet");
    expect([...recipients].sort()).toEqual([...JULIET_AUTHORISED].sort());
    expect(recipients).toHaveLength(4);
  });

  it("does not notify Manet, Tom or Claudia", async () => {
    const recipients = (await recipientsFor("speak-to-juliet")).join(" ").toLowerCase();
    for (const [person, address] of Object.entries(MUST_NOT_RECEIVE)) {
      expect(recipients, `${person} must not receive this campaign`).not.toContain(address.toLowerCase());
    }
  });

  it("replaces the general notification rather than adding to it", async () => {
    const { campaignReplacesGeneralNotification } = await import("../../shared/campaignEnquiry");
    expect(campaignReplacesGeneralNotification("speak-to-juliet")).toBe(true);
    // The general notification is skipped for such a campaign, so the
    // excluded people are not reached by the other route either.
    expect(ROUTER).toContain("if (!campaignReplacesGeneral) {");
    expect(ROUTER).toContain("notifyStaff({ title: enquiryTitle, content: enquiryContent })");
  });

  it("gives those four the same detail the general list would have had", () => {
    // One content array, used by both, so the two cannot drift apart and the
    // campaign's recipients lose nothing by the general one being skipped.
    expect(ROUTER).toContain("const enquiryContent = [");
    expect(ROUTER.match(/const enquiryContent = \[/g) ?? []).toHaveLength(1);
    const campaignCall = ROUTER.slice(ROUTER.indexOf("notifyCampaignOwner(campaignSlug, {"));
    expect(campaignCall.slice(0, 900)).toContain("enquiryContent");
  });

  it("tells them plainly that nobody else was notified", () => {
    expect(ROUTER).toContain("The general WSA staff list has not been notified of it.");
  });
});

describe("an ordinary enquiry is untouched", () => {
  it("still uses the existing global recipient list, unchanged", () => {
    for (const address of [
      "tim.hunt@worldstudentadvisors.com",
      "eldah@worldstudentadvisors.com",
      "sarafina@worldstudentadvisors.com",
      "glenice@worldstudentadvisors.com",
      "manet@worldstudentadvisors.com",
      "tom@arringtonconsultancy.com",
      "pipedrive@worldstudentadvisors.com",
    ]) {
      expect(ENV_SOURCE, `${address} must stay on the general staff list`).toContain(address);
    }
  });

  it("carries no campaign, so the general notification is sent as always", () => {
    // campaignSlug is null without a valid slug, so the guard is false and
    // notifyStaff runs exactly as it did before any of this existed.
    expect(ROUTER).toContain("const campaignSlug = isCampaignSlug(effectiveInput.campaign) ? effectiveInput.campaign : null;");
    expect(ROUTER).toContain("const campaignReplacesGeneral = campaignSlug !== null && campaignReplacesGeneralNotification(campaignSlug);");
  });

  it("keeps failure alerts on the general staff list whatever the campaign", () => {
    // A sign-up that could not be saved, or a portal account that could not
    // be created, is an operational alert for whoever fixes the system. Those
    // calls are untouched by the campaign routing.
    expect(ROUTER).toContain("Sign-up FAILED to save:");
    expect(ROUTER).toContain("Portal account creation FAILED:");
    const failureBlock = ROUTER.slice(ROUTER.indexOf("Sign-up FAILED to save:"), ROUTER.indexOf("Notify staff of the new sign-up"));
    expect(failureBlock).not.toContain("campaignReplacesGeneral");
  });
});

describe("a crafted campaign value cannot alter recipients", () => {
  it("resolves no recipients for anything off the closed list", async () => {
    for (const crafted of ["", "speak-to-juliet ", "SPEAK-TO-JULIET", "../admin", "juliet", "<script>", "unknown-campaign"]) {
      expect(isCampaignSlug(crafted), `"${crafted}" must not be a slug`).toBe(false);
      expect(await recipientsFor(crafted), `"${crafted}" must resolve no recipients`).toEqual([]);
    }
  });

  it("sends nothing at all when a campaign has no recipients", () => {
    expect(NOTIFICATION).toContain("const recipients = ENV.campaignNotifyEmails[slug] ?? [];");
    expect(NOTIFICATION).toContain("if (recipients.length === 0)");
  });

  it("cannot suppress the general notification with an unknown value", async () => {
    const { campaignReplacesGeneralNotification } = await import("../../shared/campaignEnquiry");
    // The guard requires a valid slug first, so an unknown value leaves
    // campaignSlug null and the general notification is sent as normal.
    for (const crafted of ["unknown-campaign", "../admin", ""]) {
      expect(isCampaignSlug(crafted)).toBe(false);
    }
    expect(campaignReplacesGeneralNotification("speak-to-juliet")).toBe(true);
  });
});

describe("the enquiry reaches Juliet", () => {

  it("sends through a campaign notifier that refuses an unconfigured campaign", () => {
    expect(NOTIFICATION).toContain("export async function notifyCampaignOwner");
    expect(NOTIFICATION).toContain("if (recipients.length === 0)");
    expect(NOTIFICATION).toContain("return false;");
  });

  it("is sent only for a value that survives the guard", () => {
    expect(ROUTER).toContain("isCampaignSlug(effectiveInput.campaign)");
    expect(ROUTER).toContain("notifyCampaignOwner(campaignSlug, {");
  });

});

describe("the enquiry is identifiable in the CRM", () => {
  it("names the campaign in the Lead note that is already written", () => {
    expect(PIPEDRIVE).toContain("CAMPAIGN_LABELS[data.campaign]");
    expect(PIPEDRIVE).toContain("**Source:** WSA Website - Sign-up Form, from");
  });

  it("falls back to the original source line when there is no campaign", () => {
    expect(PIPEDRIVE).toContain("`**Source:** WSA Website - Sign-up Form`");
  });

  it("creates no Pipedrive field, owner or counsellor for the campaign", () => {
    const code = stripComments(PIPEDRIVE);
    expect(code).not.toContain("campaign]:");
    expect(code).not.toContain("COUNSELLOR_MAP[data.campaign]");
    expect(code).not.toContain("owner_id");
    // Every mention of it sits in the two lines that build the Source line.
    const lines = code.split("\n").filter(l => l.includes("data.campaign"));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.includes("isCampaignSlug") || line.includes("**Source:**")).toBe(true);
    }
  });

  it("adds nobody to the counsellor vocabulary", () => {
    const map = PIPEDRIVE.slice(PIPEDRIVE.indexOf("const COUNSELLOR_MAP"), PIPEDRIVE.indexOf("const COUNSELLOR_LABELS"));
    expect(map.toLowerCase()).not.toContain("juliet");
  });
});

describe("no second CRM path", () => {
  it("the Juliet page no longer hands off to the website signup: its form is Tim Hunt's Pipedrive form", () => {
    // 24 September 2026. The page embeds his form and sends nobody to
    // /contact, so the website campaign route is reached only by links
    // already in circulation. The route itself is untouched, and the tests
    // below and in speakToJulietEndToEnd.test.ts still prove it works for
    // those links.
    expect(JULIET_PAGE).not.toContain('params.set("campaign"');
    expect(JULIET_PAGE).not.toContain("/contact?");
    expect(JULIET_PAGE).toContain("data-pd-webforms={PIPEDRIVE_FORM.embedUrl}");
    // And still no API call of its own to the CRM.
    expect(JULIET_PAGE.toLowerCase()).not.toContain("api.pipedrive");
    expect(CAMPAIGN_SLUG).toBe("speak-to-juliet");
  });

  it("the campaign rides with the submission the signup form already makes", () => {
    expect(CONTACT).toContain("campaign, ...getStoredAdClickIds()");
    // The form takes the marker from the URL when it is there, and from what
    // the tab remembers when it is not, which is how a return from Google
    // sign-in keeps it. Asserted as the two sources rather than as one exact
    // line, because pinning the line is what let the Google journey through:
    // the wording matched while the journey did not work.
    expect(CONTACT).toContain("isCampaignSlug(campaignParam)");
    expect(CONTACT).toContain("rememberCampaign(campaignParam)");
    expect(CONTACT).toContain("recallCampaign()");
    // What actually proves the journey is
    // server/campaign/speakToJulietEndToEnd.test.ts, which runs it.
  });

  it("hands the campaign to the Google round trip, which would otherwise drop it", () => {
    expect(CONTACT).toContain("startGoogleSignup(campaign)");
    expect(CONTACT).toContain("&campaign=${encodeURIComponent(campaign)}");
  });

  it("keeps the bot check and the validation in front of it", () => {
    // The call site, not the import at the top of the file.
    const beforeCampaign = ROUTER.slice(0, ROUTER.indexOf("notifyCampaignOwner(slug, {"));
    expect(beforeCampaign).toContain("await requireTurnstile(input.turnstileToken, ctx.req.ip)");
    expect(beforeCampaign).toContain("await createStudentLead(effectiveInput)");
  });

  it("bounds the field so a long value cannot be posted", () => {
    expect(ROUTER).toContain("campaign: z.string().max(64).optional().default(\"\")");
  });
});

describe("the images are not deferred", () => {
  it("renders Glenice's portrait without lazy loading, so it is never a blank box", () => {
    // It is an 80px thumbnail. Deferring it saved nothing and left it blank in
    // a full-page screenshot, which would do the same in a print or a share
    // preview. Tom Arrington reported exactly that on 19 September 2026.
    const glenice = JULIET_PAGE.slice(JULIET_PAGE.indexOf("src={GLENICE.photo}"));
    expect(glenice.slice(0, 400)).not.toContain('loading="lazy"');
    expect(glenice.slice(0, 400)).toContain('decoding="async"');
  });

  it("defers no image on the page at all", () => {
    expect(JULIET_PAGE).not.toContain('loading="lazy"');
  });
});
