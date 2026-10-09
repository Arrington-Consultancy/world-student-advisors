import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  CAMPAIGN_SLUG,
  DRAFT,
  MARYAM,
  OPPORTUNITIES,
  PAGE_PATH,
  PARTNERS,
  PATRON,
  QURANIC,
  REVIEW_NOTES,
  allRenderedCopy,
  expressInterestHandoffUrl,
  maryamWhatsAppHref,
} from "../../client/src/lib/sarkinFulani";
import { CAMPAIGN_PATHS, campaignReplacesGeneralNotification, isCampaignSlug } from "../../shared/campaignEnquiry";
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
 * together); the two forms go to their two different destinations and
 * neither opens a second route into Pipedrive; the community is named as
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

  it("says the College decides, and that the award wording awaits its confirmation", () => {
    expect(COPY).toMatch(/made independently by Brooke House College/);
    expect(COPY).toContain("Award wording subject to confirmation by Brooke House College.");
    expect(COPY).toContain("not a fully funded scholarship");
  });

  it("uses UK English and no em dash", () => {
    expect(COPY).not.toContain("—");
    expect(COPY).toContain("Memorisation");
    expect(COPY).not.toContain("Memorization");
    expect(COPY).not.toMatch(/\bprogram\b/);
  });
});

describe("the Expression of Interest goes down the one controlled path", () => {
  it("is a registered campaign that keeps the Student Counsellors' general notification", () => {
    expect(isCampaignSlug(CAMPAIGN_SLUG)).toBe(true);
    expect(CAMPAIGN_PATHS[CAMPAIGN_SLUG]).toBe(PAGE_PATH);
    expect(campaignReplacesGeneralNotification(CAMPAIGN_SLUG)).toBe(false);
  });

  it("resolves a recipient list for its own labelled copy", async () => {
    const { ENV } = await import("../_core/env");
    expect(ENV.campaignNotifyEmails[CAMPAIGN_SLUG]?.length).toBeGreaterThan(0);
    expect(ENV.staffNotifyEmails.length).toBeGreaterThan(0);
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

  it("ships her photograph from this site", () => {
    expect(publicFile(MARYAM.photo)).toBe(true);
  });

  it("leaves the Expression of Interest routing exactly as it was", () => {
    expect(PAGE).toContain("expressInterestHandoffUrl(");
    expect(CAMPAIGN_PATHS[CAMPAIGN_SLUG]).toBe(PAGE_PATH);
  });
});

describe("His Royal Highness's Quranic Memorisation Competition stands on its own", () => {
  it("is its own identified section, reachable from the hero", () => {
    expect(PAGE).toContain('id="quranic-competition"');
    expect(PAGE).toContain('href="#quranic-competition"');
    expect(QURANIC.eyebrow).toContain("Annual Quranic Memorisation Competition");
  });

  it("has its own form, sent to the Committee through its own procedure", () => {
    expect(PAGE).toContain("trpc.programme.registerQuranicCompetitionSchool.useMutation");
    expect(QURANIC.routingLine).toContain("Competition Committee in Nigeria");
    expect(QURANIC.routingLine).toContain("not a World Student Advisors enquiry");
  });

  it("promises no date, venue or category the Committee has not announced", () => {
    expect(QURANIC.detailsPending).toContain("announced by the Committee");
    const quranicCopy = [QURANIC.heading, ...QURANIC.paragraphs, QURANIC.formSupporting].join(" ");
    expect(quranicCopy).not.toMatch(/\b20\d\d\b/);
  });
});

describe("the reviewers' open items are written down", () => {
  it("names the Office of His Royal Highness, Brooke House College and Tim Hunt", () => {
    const owners = REVIEW_NOTES.map(n => n.owner).join(" ");
    expect(owners).toContain("Farooq Gajo");
    expect(owners).toContain("Brooke House College");
    expect(owners).toContain("Tim Hunt");
    expect(REVIEW_NOTES.some(n => n.item.includes("Committee"))).toBe(true);
  });
});
