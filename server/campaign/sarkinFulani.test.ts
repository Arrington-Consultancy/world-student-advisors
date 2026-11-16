import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  AWARDS,
  CAMPAIGN_SLUG,
  DRAFT,
  EXPRESS_INTEREST,
  MARYAM,
  OPPORTUNITIES,
  OPPORTUNITY_CARDS,
  PAGE_PATH,
  PARTNERS,
  PATRON,
  REVIEW_NOTES,
  STEPS,
  allRenderedCopy,
  expressInterestHandoffUrl,
  maryamWhatsAppHref,
} from "../../client/src/lib/sarkinFulani";
import { CAMPAIGN_PATHS, campaignNotificationDetail, campaignReplacesGeneralNotification, isCampaignSlug } from "../../shared/campaignEnquiry";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { isDesiredLevelValue } from "../../shared/studentEnquiryOptions";
import { statesAnUnnegatedGuarantee } from "../operating/qualityCheck";

/**
 * The Sarkin Fulani Future Leaders Programme landing page, Tim Hunt's brief
 * of 8 October 2026 from Farooq Gajo's revised proposal.
 *
 * What these hold, in order of the damage a failure would do: the page
 * stays a draft until it is published on purpose (noindex, out of the
 * sitemap and prerender list, linked from nowhere, banner showing, all
 * together); the one form hands off to the sign-up and opens no second
 * route into Pipedrive; the community is named as
 * the Office of His Royal Highness asked; and no promise appears that
 * Brooke House College has not made.
 */

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = stripComments(read("client/src/pages/SarkinFulaniFutureLeaders.tsx"));
const COPY = allRenderedCopy().join("\n");
const publicFile = (p: string) => existsSync(`client/public${p}`);

describe("publication state: a draft, held together", () => {
  it("is a real route so it can be reviewed", () => {
    expect(VALID_CLIENT_ROUTES).toContain(PAGE_PATH);
    expect(isValidClientRoute(PAGE_PATH)).toBe(true);
    expect(read("client/src/App.tsx")).toContain(`path={"${PAGE_PATH}"}`);
  });

  it("has its own title and description", () => {
    expect(SEO_MAP[PAGE_PATH]?.title).toContain("Sarkin Fulani Future Leaders Programme");
    expect(SEO_MAP[PAGE_PATH]?.description).toContain("Arewa");
  });

  it("while DRAFT.isDraft: noindex, not in the sitemap, not prerendered, banner on", () => {
    expect(DRAFT.isDraft).toBe(true);
    expect(NOINDEX_PATHS.has(PAGE_PATH)).toBe(true);
    expect(shouldNoindex(PAGE_PATH)).toBe(true);
    expect(read("client/public/sitemap.xml")).not.toContain(PAGE_PATH);
    expect(ALL_PRERENDER_ROUTES).not.toContain(PAGE_PATH);
    expect(PAGE).toContain("DRAFT.isDraft &&");
  });

  it("is linked from nowhere on the public site", () => {
    for (const file of ["client/src/components/Header.tsx", "client/src/components/Footer.tsx", "client/src/pages/Home.tsx", "client/src/pages/Partners.tsx"]) {
      expect(read(file), `${file} must not link the draft`).not.toContain(PAGE_PATH);
    }
  });
});

describe("the community is named as the Office of His Royal Highness asked", () => {
  it("says Arewa, and never 'Fulani and Hausa Fulani'", () => {
    expect(COPY).toContain("Arewa");
    expect(COPY).not.toMatch(/Hausa[\s-]?Fulani/i);
    expect(COPY).not.toMatch(/Fulani and Hausa/i);
  });

  it("names the Patron and his title exactly", () => {
    expect(COPY).toContain("Alhaji (Dr.) Mohammed Abubakar Bambado II");
    expect(COPY).toContain("Sarkin Fulani of Lagos");
  });

  it("ships the seal, the Foundation logo and both partner logos from this site", () => {
    for (const p of [PATRON.seal, PATRON.foundationLogo, PARTNERS.brookeHouse.logo, PARTNERS.wsa.logo]) {
      expect(publicFile(p), `${p} must exist in client/public`).toBe(true);
    }
    expect(PATRON.sealAlt).toContain("Sarkin Fulani of Lagos");
  });
});

describe("no promise Brooke House College has not made", () => {
  it("states no unnegated guarantee", () => {
    expect(statesAnUnnegatedGuarantee(COPY)).toBe(false);
  });

  it("says the College decides, and carries its confirmation of the awards with the one point still open", () => {
    expect(COPY).toMatch(/made independently by Brooke House College/);
    expect(COPY).toContain("Awards confirmed by Brooke House College on 12 October 2026. Precisely which fees they apply to is to be confirmed by the College.");
    expect(COPY).toContain("not a fully funded scholarship");
  });

  it("carries Brooke House College's confirmation of 12 October 2026: the places for January 2027 and the basis of the further 15%", () => {
    const fullTime = OPPORTUNITY_CARDS.find(c => c.id === "full-time")!;
    expect(fullTime.confirmedHeading).toBe("Places for January 2027, confirmed by Brooke House College");
    expect(fullTime.confirmed).toEqual([
      "Years 7, 8 and 9 (aged 12, 13 or 14 on or after 1 September): 17 places",
      "Year 10 (aged 15 on or after 1 September): 6 to 8 places, for students whose first language is English",
      "Year 11 (aged 16 on or after 1 September): full",
      "Years 12 and 13 (aged 17 on or after 1 September): 7 to 8 places",
    ]);
    // Leadership is not a basis Brooke House gave for the further 15%.
    const further = AWARDS.paragraphs.find(p => p.includes("further reduction"))!;
    expect(further).toContain("football ability and/or academic level");
    expect(further).toContain("football assessment and/or a current school report");
    expect(further).not.toMatch(/leadership/);
    expect(DRAFT.line).toContain("confirmed January 2027 entry and the tuition fee awards on 12 October 2026");
    // The page renders the confirmed list.
    expect(PAGE).toContain("card.confirmed");
  });

  it("uses UK English and no em dash", () => {
    expect(COPY).not.toContain("—");
    expect(COPY).toContain("programme");
    expect(COPY).not.toContain("Memorization");
    expect(COPY).not.toMatch(/\bprogram\b/);
  });
});

describe("the Expression of Interest goes down the one controlled path", () => {
  it("is a registered campaign whose own notification replaces the Student Counsellors' general one (Tim Hunt, 15 October 2026)", () => {
    expect(isCampaignSlug(CAMPAIGN_SLUG)).toBe(true);
    expect(CAMPAIGN_PATHS[CAMPAIGN_SLUG]).toBe(PAGE_PATH);
    expect(campaignReplacesGeneralNotification(CAMPAIGN_SLUG)).toBe(true);
    expect(campaignNotificationDetail(CAMPAIGN_SLUG)).toBe("eligibility");
  });

  it("notifies Tim and Maryam by default, with Farooq's address left to production", async () => {
    const { ENV } = await import("../_core/env");
    const list = (ENV.campaignNotifyEmails[CAMPAIGN_SLUG] ?? []).map(a => a.toLowerCase());
    expect(list).toContain("tim.hunt@worldstudentadvisors.com");
    expect(list).toContain("maryam@worldstudentadvisors.com");
    for (const counsellor of ["eldah", "glenice", "manet", "claudia", "sarafina", "pipedrive@", "tom@"]) {
      expect(list.join(" "), `${counsellor} is told once eligibility is confirmed, not before`).not.toContain(counsellor);
    }
    // No personal address in a public repository.
    expect(readFileSync("server/_core/env.ts", "utf8")).not.toMatch(/gmail\.com/i);
  });

  it("tells families where their details go, and lists the eligibility check as a step", () => {
    expect(EXPRESS_INTEREST.privacy).toContain("Office of His Royal Highness");
    expect(EXPRESS_INTEREST.privacy).toContain("name, contact details and chosen opportunity");
    expect(STEPS[1].title).toBe("The Office of His Royal Highness confirms eligibility");
    expect(STEPS[2].title).toBe("Talk to Maryam Lawal or a Student Counsellor");
    expect(STEPS[2].body).toMatch(/^Once eligibility is confirmed/);
  });

  it("hands off to /contact with the slug, the level, the destination and the opportunity", () => {
    const url = expressInterestHandoffUrl({
      role: "parent",
      firstName: " Aisha ",
      lastName: "Bello",
      email: "aisha@example.com",
      phone: "0803 123 4567",
      opportunity: "football-and-education",
    });
    expect(url.startsWith("/contact?")).toBe(true);
    expect(url.endsWith("#student-signup")).toBe(true);
    const params = new URL(`https://x${url}`).searchParams;
    expect(params.get("campaign")).toBe(CAMPAIGN_SLUG);
    expect(params.get("firstName")).toBe("Aisha");
    expect(params.get("lastName")).toBe("Bello");
    expect(params.get("email")).toBe("aisha@example.com");
    expect(params.get("phone")).toBe("+2348031234567");
    expect(params.get("desiredLevel")).toBe("boarding");
    expect(params.get("preferredDestination")).toBe("uk");
    expect(params.get("areaOfStudy")).toBe("Sarkin Fulani Future Leaders Programme: Football and Education (parent or guardian)");
  });

  it("drops a number it cannot read rather than handing over a mangled one", () => {
    const url = expressInterestHandoffUrl({ role: "student", firstName: "A", lastName: "B", email: "a@b.com", phone: "call me", opportunity: "not-sure" });
    const params = new URL(`https://x${url}`).searchParams;
    expect(params.has("phone")).toBe(false);
    expect(params.get("desiredLevel")).toBe("other");
  });

  it("every opportunity maps to a level the sign-up form offers", () => {
    for (const o of OPPORTUNITIES) expect(isDesiredLevelValue(o.desiredLevel), o.label).toBe(true);
    expect(OPPORTUNITIES[OPPORTUNITIES.length - 1].value).toBe("not-sure");
  });

  it("the sign-up form reads the two fields this page adds, and nothing else new", () => {
    const contact = read("client/src/pages/Contact.tsx");
    expect(contact).toContain('take("lastName", 60)');
    expect(contact).toContain('take("areaOfStudy", 160)');
  });

  it("the page itself creates no Lead and embeds no third-party form", () => {
    expect(PAGE).not.toContain("createStudentLead");
    expect(PAGE).not.toContain("submitStudent");
    expect(PAGE).not.toContain("webforms.pipedrive.com");
    expect(PAGE).toContain("expressInterestHandoffUrl(");
  });
});

describe("Maryam Lawal's contact card, Tim Hunt's request of 9 October 2026", () => {
  it("carries the details he gave, exactly", () => {
    expect(MARYAM.name).toBe("Maryam Lawal");
    expect(MARYAM.programmeRole).toBe("Programme Relationship and Family Liaison");
    expect(MARYAM.title).toBe("Director, Nigeria");
    expect(MARYAM.email).toBe("Maryam@WorldStudentAdvisors.com");
    expect(MARYAM.whatsapp).toBe("+44 7305 615 829");
    expect(maryamWhatsAppHref()).toBe("https://wa.me/447305615829");
    expect(MARYAM.description).toBe("Maryam is available to answer general questions about the programme and explain how families can begin their educational journey.");
  });

  it("sits below Who is behind the programme and above the Expression of Interest", () => {
    const behind = PAGE.indexOf("{BEHIND.heading}");
    const maryam = PAGE.indexOf('id="maryam"');
    const eoi = PAGE.indexOf('id="express-interest"');
    expect(behind).toBeGreaterThan(0);
    expect(maryam).toBeGreaterThan(behind);
    expect(eoi).toBeGreaterThan(maryam);
  });

  it("makes both contact details live, WhatsApp with a WhatsApp icon, email as mailto", () => {
    const card = PAGE.slice(PAGE.indexOf('id="maryam"'), PAGE.indexOf('id="express-interest"'));
    expect(card).toContain("href={maryamWhatsAppHref()}");
    expect(card).toContain("<MessageCircle");
    expect(card).not.toContain("<Phone");
    expect(card).toContain("href={`mailto:${MARYAM.email}`}");
    expect(card).toContain("<Mail");
  });

  it("puts the WSA logo centred over her photograph and details, and her email on one line (Tim Hunt, 18 October 2026)", () => {
    const card = PAGE.slice(PAGE.indexOf('id="maryam"'), PAGE.indexOf('id="express-interest"'));
    const logo = card.indexOf("src={PARTNERS.wsa.logo}");
    const photo = card.indexOf("src={MARYAM.photo}");
    const name = card.indexOf("{MARYAM.name}");
    expect(logo).toBeGreaterThan(0);
    expect(photo).toBeGreaterThan(logo);
    expect(name).toBeGreaterThan(photo);
    expect(card).toMatch(/rounded-2xl border bg-wsa-warm-white[^"]*text-center/);
    expect(card).not.toMatch(/sm:flex-row|sm:text-left/);
    expect(card).toMatch(/className="whitespace-nowrap[^"]*">\{MARYAM\.email\}/);
    expect(card).not.toContain("break-all");
  });

  it("ships her photograph from this site", () => {
    expect(publicFile(MARYAM.photo)).toBe(true);
  });

  it("leaves the Expression of Interest routing exactly as it was", () => {
    expect(PAGE).toContain("expressInterestHandoffUrl(");
    expect(CAMPAIGN_PATHS[CAMPAIGN_SLUG]).toBe(PAGE_PATH);
  });
});

/**
 * Tim Hunt to Farooq Gajo, 11 October 2026: the WSA page stays on the
 * Brooke House College opportunities and WSA's advice to families; the
 * Quranic Memorisation Competition's promotion and school registrations
 * belong to the Foundation's own communications, under the Committee.
 * Removing the section but leaving its route would keep a public endpoint
 * emailing on behalf of a form nobody can see, so both are checked gone.
 */
describe("the Quranic Memorisation Competition is not on the WSA page", () => {
  it("has no section, hero button or school form", () => {
    const raw = read("client/src/pages/SarkinFulaniFutureLeaders.tsx");
    expect(PAGE).not.toContain("quranic-competition");
    expect(PAGE).not.toContain("QuranicSchoolForm");
    expect(raw).not.toContain("@shared/quranicCompetition");
    expect(allRenderedCopy().join(" ")).not.toMatch(/quranic|memorisation|school registration/i);
  });

  it("leaves no server route, notifier or setting behind it", () => {
    expect(read("server/routers.ts")).not.toMatch(/registerQuranicCompetitionSchool|quranicCompetition/);
    expect(read("server/_core/notification.ts")).not.toContain("notifyQuranicCompetitionCommittee");
    expect(read("server/_core/env.ts")).not.toContain("QURANIC_COMPETITION_COMMITTEE_EMAILS");
    for (const f of ["shared/quranicCompetition.ts", "server/programme/quranicCompetition.ts"]) expect(existsSync(f), f).toBe(false);
  });
});

describe("the reviewers' open items are written down", () => {
  it("names the Office of His Royal Highness, Brooke House College and Tim Hunt", () => {
    const owners = REVIEW_NOTES.map(n => n.owner).join(" ");
    expect(owners).toContain("Farooq Gajo");
    expect(owners).toContain("Brooke House College");
    expect(owners).toContain("Tim Hunt");
  });

  it("records Farooq's answers of 10 October 2026 and Tim's routing decision of 15 October", () => {
    expect(REVIEW_NOTES.some(n => n.item.includes("Committee"))).toBe(false);
    const routing = REVIEW_NOTES.find(n => n.item.startsWith("Decided 15 October 2026"));
    expect(routing?.owner).toBe("Tim Hunt");
    expect(routing?.item).toContain("Farooq Gajo, Maryam Lawal and Tim only");
    expect(routing?.item).toContain("no date of birth or passport number");
    expect(REVIEW_NOTES.some(n => n.item.includes("Pipedrive status"))).toBe(true);
    expect(PATRON.foundationName).toBe("Sarkin Fulanin Lagos Foundation");
  });
});
