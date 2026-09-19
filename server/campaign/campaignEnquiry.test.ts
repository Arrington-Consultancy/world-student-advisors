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

describe("the enquiry reaches Juliet", () => {
  it("has her as the recipient for her own page", () => {
    expect(ENV_SOURCE).toContain('"speak-to-juliet": ["juliet@worldstudentadvisors.com"]');
  });

  it("sends through a campaign notifier that refuses an unconfigured campaign", () => {
    expect(NOTIFICATION).toContain("export async function notifyCampaignOwner");
    expect(NOTIFICATION).toContain("if (recipients.length === 0)");
    expect(NOTIFICATION).toContain("return false;");
  });

  it("is sent only for a value that survives the guard", () => {
    expect(ROUTER).toContain("if (isCampaignSlug(effectiveInput.campaign))");
    expect(ROUTER).toContain("notifyCampaignOwner(slug, {");
  });

  it("never replaces the general staff notification", () => {
    expect(ROUTER.indexOf("notifyStaff({\n          title: `New Student Enquiry"))
      .toBeLessThan(ROUTER.indexOf("notifyCampaignOwner(slug, {"));
  });

  it("leaves the general staff list exactly as it was", () => {
    for (const address of [
      "tim.hunt@worldstudentadvisors.com",
      "eldah@worldstudentadvisors.com",
      "sarafina@worldstudentadvisors.com",
      "glenice@worldstudentadvisors.com",
      "manet@worldstudentadvisors.com",
      "tom@arringtonconsultancy.com",
      "pipedrive@worldstudentadvisors.com",
    ]) {
      expect(ENV_SOURCE, `${address} must stay on the staff list`).toContain(address);
    }
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
  it("the Juliet page still hands off to the controlled signup and calls nothing itself", () => {
    expect(JULIET_PAGE).toContain('params.set("campaign", CAMPAIGN_SLUG)');
    expect(JULIET_PAGE).toContain("window.location.assign(`/contact?${params.toString()}#student-signup`)");
    expect(JULIET_PAGE.toLowerCase()).not.toContain("api.pipedrive");
  });

  it("the campaign rides with the submission the signup form already makes", () => {
    expect(CONTACT).toContain("campaign, ...getStoredAdClickIds()");
    expect(CONTACT).toContain("if (isCampaignSlug(campaignParam)) setCampaign(campaignParam);");
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
