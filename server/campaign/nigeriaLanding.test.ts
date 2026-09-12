import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  CAMPAIGN_DESTINATIONS,
  CAMPAIGN_PROGRAMMES,
  DESIRED_LEVEL_VALUES,
  DESTINATION_VALUES,
  PIPEDRIVE_CAMPAIGN_OPTION_IDS,
  PIPEDRIVE_OPTION_GAPS,
  isDesiredLevelValue,
  isDestinationValue,
} from "../../shared/studentEnquiryOptions";
import { NOINDEX_PATHS } from "../../shared/seo";
import { toInternationalNigerianNumber } from "../../client/src/lib/nigeriaLanding";

/**
 * The Nigeria postgraduate landing page, checked against the two things
 * that would actually do damage: publishing a claim WSA cannot evidence,
 * and letting an unlaunched campaign page reach search or paid traffic.
 *
 * The page's content lives in a React-free module, but the component is
 * read as source here, because "this sentence is not on the page" is the
 * assertion that matters and only the source can prove it.
 */

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/**
 * Comments explain why a claim is absent, and naturally quote the claim.
 * Asserting against raw source therefore fails on the explanation rather
 * than on the page. These strip comments so the assertions run against
 * what actually ships to a reader.
 */
const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const pageSrc = read("../../client/src/pages/NigeriaPostgraduate.tsx");
const contentSrc = read("../../client/src/lib/nigeriaLanding.ts");
const page = withoutComments(pageSrc);
/**
 * Page copy only. EVIDENCE_NEEDED names the claims WSA cannot make, and a
 * benefit's `source` cites the instruction it came from ("prefer X to Y"),
 * so both quote wording that must not appear to a reader. Neither is
 * rendered; both are cut before the claim assertions run.
 */
const content = withoutComments(contentSrc)
  .slice(0, withoutComments(contentSrc).indexOf("EVIDENCE_NEEDED"))
  .replace(/source: "[^"]*"/g, "");
const options = read("../../shared/studentEnquiryOptions.ts");
const pipedrive = read("../../server/pipedrive.ts");
const contact = read("../../client/src/pages/Contact.tsx");
const sitemap = read("../../client/public/sitemap.xml");
const prerender = read("../../shared/prerenderRoutes.ts");

describe("nothing on the page claims what WSA cannot evidence", () => {
  it("never says the British Council recognises, accredits or endorses WSA", () => {
    for (const claim of [
      /British Council[- ]recognised/i,
      /British Council[- ]accredited/i,
      /accredited by the British Council/i,
      /endorsed by the British Council/i,
    ]) {
      expect(page).not.toMatch(claim);
      expect(content).not.toMatch(claim);
    }
  });

  it("prints the British Council's own disclaimer wherever a credential is shown", () => {
    expect(content).toContain("does not formally endorse, accredit or validate");
    expect(pageSrc).toContain("credential.disclaimer");
  });

  it("credits the individual, and only where WSA holds the certificate", () => {
    // One profile carries a certificate, one does not. Counted on the data,
    // not the interface declaration above it.
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    expect((data.match(/credential: \{/g) ?? []).length).toBe(1);
    expect((data.match(/credential: null/g) ?? []).length).toBe(1);
  });

  it("carries no testimonial, no founding date and no response-time promise", () => {
    for (const claim of [/Established 2012/i, /within 24 hours/i, /what our students say/i, /testimonial/i]) {
      expect(page).not.toMatch(claim);
    }
  });

  it("claims no success rate and makes no guarantee", () => {
    for (const claim of [/success rate/i, /guarantee/i, /guaranteed/i]) {
      expect(page).not.toMatch(claim);
      expect(content).not.toMatch(claim);
    }
  });

  it("says visa preparation, never full visa support", () => {
    expect(content).toContain("Student Visa preparation support");
    expect(page).not.toMatch(/full visa support/i);
    expect(content).not.toMatch(/full visa support/i);
  });

  it("does not present Europe as a country, and leads with the UK", () => {
    const labels = CAMPAIGN_DESTINATIONS.map(d => d.label);
    expect(labels).not.toContain("Europe");
    expect(labels[0]).toBe("United Kingdom");
    // "Other European destinations" is allowed as a note, a bare "Europe" is not.
    expect(content).toContain("We do not treat Europe as a single country");
  });

  it("publishes no phone number until one is verified", () => {
    expect(page).not.toMatch(/\+\d{2,}[\d\s]{6,}/);
  });

  it("keeps the outstanding evidence list honest rather than empty", () => {
    expect(contentSrc).toContain("EVIDENCE_NEEDED");
    expect(contentSrc).toMatch(/Established 2012/);
    expect(contentSrc).toMatch(/within 24 hours/);
    expect(contentSrc).toMatch(/Accredited by the British Council/);
  });
});

describe("an unlaunched campaign page cannot be indexed or crawled into", () => {
  it("is noindex", () => expect(NOINDEX_PATHS.has("/nigeria-postgraduate")).toBe(true));
  it("is not in the sitemap", () => expect(sitemap).not.toContain("nigeria-postgraduate"));
  it("is not prerendered", () => expect(prerender).not.toContain("nigeria-postgraduate"));
  it("says on the page that it is a draft not for paid traffic", () => {
    expect(page).toMatch(/Working draft/);
    expect(page).toMatch(/Not published for paid traffic/);
  });
});

describe("the short form hands over to the one controlled lead path", () => {
  it("does not create a lead itself", () => {
    expect(page).not.toMatch(/createStudentLead|submitStudent|useMutation/);
  });

  it("sends the student to the signup form", () => {
    expect(page).toContain("/contact?");
  });

  it("only ever emits values the signup form accepts", () => {
    for (const p of CAMPAIGN_PROGRAMMES) expect(isDesiredLevelValue(p.value)).toBe(true);
    for (const d of CAMPAIGN_DESTINATIONS) expect(isDestinationValue(d.value)).toBe(true);
  });

  it("the signup form accepts a prefill only from its own option list", () => {
    expect(contact).toContain("isDesiredLevelValue(desiredLevel)");
    expect(contact).toContain("isDestinationValue(preferredDestination)");
  });

  it("prefill only writes into form state and cannot submit or skip the bot check", () => {
    expect(contact).toContain("turnstileToken");
    const block = contact.slice(contact.indexOf("Plain prefill from a campaign landing page"), contact.indexOf("Plain prefill from a campaign landing page") + 1800);
    expect(block).toContain("setFormData");
    expect(block).not.toContain("mutate");
  });
});

describe("the four programme types and three destinations stay separate into the CRM", () => {
  it("the campaign scope is exactly the four Tom confirmed", () => {
    expect(CAMPAIGN_PROGRAMMES.map(p => p.label)).toEqual(["Taught Master's", "MPhil", "MRes", "PhD"]);
  });

  it("each programme records as its own value, with nothing collapsed", () => {
    const values = CAMPAIGN_PROGRAMMES.map(p => p.value);
    expect(new Set(values).size).toBe(CAMPAIGN_PROGRAMMES.length);
    expect(values).toEqual(["postgraduate", "mphil", "mres", "doctorate"]);
    for (const v of values) expect(isDesiredLevelValue(v)).toBe(true);
  });

  it("destinations are UK, Germany and Canada, each recorded as itself", () => {
    expect(CAMPAIGN_DESTINATIONS.map(d => d.label)).toEqual(["United Kingdom", "Germany", "Canada"]);
    const values = CAMPAIGN_DESTINATIONS.map(d => d.value);
    expect(values).toEqual(["uk", "germany", "canada"]);
    expect(new Set(values).size).toBe(3);
    for (const v of values) expect(isDestinationValue(v)).toBe(true);
  });

  it("Germany is never recorded as Europe", () => {
    const germany = CAMPAIGN_DESTINATIONS.find(d => d.label === "Germany")!;
    expect(germany.value).not.toBe("europe");
    expect(germany.value).not.toBe("multiple");
  });

  it("the landing form hands over what the student picked, with no remapping", () => {
    expect(page).toContain('params.set("desiredLevel", level)');
    expect(page).toContain('params.set("preferredDestination", destination)');
    // The old collapsing map is gone.
    expect(page).not.toContain("recordedAs");
  });

  it("the signup form really offers every campaign value", () => {
    for (const p of CAMPAIGN_PROGRAMMES) expect(contact).toContain(`value="${p.value}"`);
    for (const d of CAMPAIGN_DESTINATIONS) expect(contact).toContain(`value="${d.value}"`);
  });

  it("every campaign value maps to its own Pipedrive option, in the live code", () => {
    for (const p of CAMPAIGN_PROGRAMMES) {
      const id = (PIPEDRIVE_CAMPAIGN_OPTION_IDS as Record<string, number>)[p.value];
      expect(id, `${p.label} has no Pipedrive option id`).toBeGreaterThan(0);
      expect(pipedrive).toMatch(new RegExp(`\\b${p.value}: ${id},`));
    }
    for (const d of CAMPAIGN_DESTINATIONS) {
      const id = (PIPEDRIVE_CAMPAIGN_OPTION_IDS as Record<string, number>)[d.value];
      expect(id, `${d.label} has no Pipedrive option id`).toBeGreaterThan(0);
      expect(pipedrive).toMatch(new RegExp(`\\b${d.value}: ${id}\\b`));
    }
  });

  it("no two campaign values share a Pipedrive option id", () => {
    const ids = Object.values(PIPEDRIVE_CAMPAIGN_OPTION_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    // Seven values: four programmes and three destinations.
    expect(ids).toHaveLength(CAMPAIGN_PROGRAMMES.length + CAMPAIGN_DESTINATIONS.length);
  });

  it("Germany is not recorded as Other European Counties", () => {
    const europe = 84;
    expect(PIPEDRIVE_CAMPAIGN_OPTION_IDS.germany).not.toBe(europe);
    expect(PIPEDRIVE_CAMPAIGN_OPTION_IDS.germany).toBe(315);
  });

  it("MRes is not recorded as a taught Master's", () => {
    expect(PIPEDRIVE_CAMPAIGN_OPTION_IDS.mres).not.toBe(PIPEDRIVE_CAMPAIGN_OPTION_IDS.postgraduate);
    expect(PIPEDRIVE_CAMPAIGN_OPTION_IDS.mres).toBe(314);
  });

  it("anything still listed as a Pipedrive gap is genuinely unmapped", () => {
    // Empty today. If a future campaign adds one, it must not be quietly
    // rounded to a neighbouring option instead.
    for (const gap of PIPEDRIVE_OPTION_GAPS) {
      expect(pipedrive).not.toMatch(new RegExp(`\\b${gap.value}: \\d+`));
    }
  });

  it("refuses a value the form does not offer", () => {
    for (const bad of ["masters", "phd", "deutschland", "nigeria", ""]) {
      expect(isDesiredLevelValue(bad)).toBe(false);
      expect(isDestinationValue(bad)).toBe(false);
    }
  });

  it("every canonical value is one the live form really offers", () => {
    for (const v of DESIRED_LEVEL_VALUES) expect(contact).toContain(`value="${v}"`);
    for (const v of DESTINATION_VALUES) expect(contact).toContain(`value="${v}"`);
  });
});

describe("a profile is published only on the evidence WSA holds", () => {
  it("shows contact details only for the person who approved them in writing", () => {
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    expect((data.match(/contact: \{/g) ?? []).length).toBe(1);
    expect((data.match(/contact: null/g) ?? []).length).toBe(1);
    expect(content).toContain("Approved by Eldah Therone in writing, 12 September 2026.");
  });

  it("uses the verified number, email and job title from that approval", () => {
    expect(content).toContain("+44 7470 689 849");
    expect(content).toContain("Eldah@WorldStudentAdvisors.com");
    expect(content).toContain('role: "Student Counsellor"');
    expect(content).toContain("https://wa.me/447470689849");
  });

  it("states Eldah's certificate exactly as the certificate does", () => {
    expect(content).toContain("28 April 2027");
    expect(content).toContain("67976");
  });

  it("gives Babatunde no credential, because none is held", () => {
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    const babatunde = data.slice(data.indexOf("Babatunde"));
    expect(babatunde).toContain("credential: null");
    expect(babatunde).not.toContain("British Council");
  });

  it("publishes no phone number other than the approved one", () => {
    const numbers = Array.from(page.matchAll(/\+\d[\d\s]{7,}/g)).map(m => m[0].trim());
    expect(numbers).toEqual([]);
    const inContent = Array.from(content.matchAll(/\+\d[\d\s]{7,}/g)).map(m => m[0].trim());
    expect(inContent.every(n => n.replace(/\s/g, "") === "+447470689849")).toBe(true);
  });
});
