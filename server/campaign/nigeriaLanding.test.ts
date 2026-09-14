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
import { CANONICAL_PATHS, NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { isValidClientRoute } from "../../shared/routes";
import { PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { toInternationalNigerianNumber } from "../../client/src/lib/nigeriaLanding";

/**
 * The Nigeria postgraduate landing page, checked against the two things
 * that would actually do damage: publishing a claim WSA cannot evidence,
 * and letting the page's publication state (index, sitemap, prerender, banner) drift out of step.
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

  it("states the non-endorsement point wherever a credential is shown, and keeps it short", () => {
    expect(content).toMatch(/does not endorse, accredit or validate agents/);
    expect(pageSrc).toContain("credential.disclaimer");
    // Short enough to read on a phone: one sentence and a clause, not an essay.
    const disclaimer = content.match(/BRITISH_COUNCIL_DISCLAIMER =\s*\n?\s*"([^"]+)"/)![1];
    expect(disclaimer.length).toBeLessThan(200);
    // Still says the two things that matter.
    expect(disclaimer).toMatch(/not endorse/);
    expect(disclaimer).toMatch(/individual/);
  });

  it("keeps the credential to what it is and when it expires", () => {
    expect(pageSrc).toContain("credential.label");
    expect(pageSrc).toContain("credential.validUntil");
  });

  it("carries no unfinished-looking placeholder on a public page", () => {
    // Case-sensitive and with the colon: a lowercase "placeholder" is the
    // ordinary HTML input attribute and is fine.
    expect(page).not.toContain("PLACEHOLDER:");
    expect(page).not.toMatch(/border-dashed border-amber/);
    expect(page).not.toMatch(/not yet published here/);
  });

  it("does not say the counsellors are all based in Nigeria, because one is not", () => {
    // Eldah Therone is in Nairobi. The page said "Real people, based in
    // Nigeria" beside her card, which was simply untrue.
    expect(page).not.toMatch(/based in Nigeria/);
    expect(page).toContain("Real people. Your counsellor is named and stays with you.");
  });

  /**
   * Tim Hunt set both of these word for word in the landing page review of
   * 14 September 2026. They are the paid campaign's promise, so they are
   * asserted exactly rather than left to drift under later copy edits.
   */
  it("carries the headline and standfirst as they were given", () => {
    expect(page).toContain("Study for Your Master&rsquo;s or PhD Abroad");
    expect(page).toContain(
      "Taught Master&rsquo;s, MRes, MPhil and PhD opportunities for Nigerian graduates, with your own WSA Student",
    );
    expect(page).toContain("Counsellor from course selection through to visa preparation.");
    // The headline it replaced is gone, not merely demoted.
    expect(page).not.toContain("Postgraduate study abroad, planned with one person who knows your case");
  });

  it("does not claim the UK is where most applicants go or where WSA knows best", () => {
    expect(options).not.toMatch(/where most WSA postgraduate applicants go/i);
    expect(options).not.toMatch(/know the admissions and visa route best/i);
    const uk = CAMPAIGN_DESTINATIONS.find(d => d.value === "uk")!;
    expect(uk.note).toBe("Our main destination for this campaign.");
  });

  it("credits the individual, and only where WSA holds the certificate", () => {
    // Counted on the data, not the interface declaration above it. Every
    // credential shown is one WSA holds, and no profile invents one.
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    const shown = (data.match(/credential: \{/g) ?? []).length;
    const withheld = (data.match(/credential: null/g) ?? []).length;
    const profiles = (data.match(/^    name: /gm) ?? []).length;
    expect(shown + withheld).toBe(profiles);
    expect(shown).toBe(1);
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

describe("a published campaign page is indexable, discoverable and carries no draft marking", () => {
  /**
   * Tom Arrington gave the GO on 12 September 2026. The brief requires the
   * banner and noindex to move together, and a page in the sitemap that a
   * crawler is told not to index (or the reverse) is a contradiction, so
   * all four states are asserted as one.
   */
  it("is indexable", () => {
    expect(NOINDEX_PATHS.has("/nigeria-postgraduate")).toBe(false);
    expect(shouldNoindex("/nigeria-postgraduate")).toBe(false);
  });
  it("is in the sitemap", () => expect(sitemap).toContain("https://www.worldstudentadvisors.com/nigeria-postgraduate</loc>"));
  it("is prerendered", () => expect(PRERENDER_ROUTES).toContain("/nigeria-postgraduate"));
  it("has its own title and description for search results", () => {
    const seo = SEO_MAP["/nigeria-postgraduate"];
    expect(seo?.title).toMatch(/Nigerian/);
    expect(seo?.description).toMatch(/MPhil, MRes and PhD/);
  });
  it("shows no draft banner or approval wording", () => {
    expect(page).not.toMatch(/Working draft/i);
    expect(page).not.toMatch(/Not published for paid traffic/i);
    expect(page).not.toMatch(/pending approval/i);
  });
  it("does not claim the Google Ads brief conflicts with this page", () => {
    expect(page).not.toMatch(/brief covers taught Master/i);
    expect(page).not.toMatch(/needs reconciling/i);
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

describe("the four programme types and five destinations stay separate into the CRM", () => {
  it("the campaign scope is exactly the four Tom confirmed", () => {
    expect(CAMPAIGN_PROGRAMMES.map(p => p.label)).toEqual(["Taught Master's", "MPhil", "MRes", "PhD"]);
  });

  it("each programme records as its own value, with nothing collapsed", () => {
    const values = CAMPAIGN_PROGRAMMES.map(p => p.value);
    expect(new Set(values).size).toBe(CAMPAIGN_PROGRAMMES.length);
    expect(values).toEqual(["postgraduate", "mphil", "mres", "doctorate"]);
    for (const v of values) expect(isDesiredLevelValue(v)).toBe(true);
  });

  /**
   * Widened on Tim Hunt's review of 14 September 2026 ("We have USA and
   * Europe") from UK, Germany and Canada to five. The list is asserted in
   * full and in order, so a destination cannot be added to the page
   * without the Pipedrive option check below being applied to it.
   */
  it("destinations are the five WSA works with, each recorded as itself", () => {
    expect(CAMPAIGN_DESTINATIONS.map(d => d.label)).toEqual([
      "United Kingdom", "United States", "Canada", "Germany", "Other European destinations",
    ]);
    const values = CAMPAIGN_DESTINATIONS.map(d => d.value);
    expect(values).toEqual(["uk", "usa", "canada", "germany", "europe"]);
    expect(new Set(values).size).toBe(5);
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
    // Nine values: four programmes and five destinations.
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
    const profiles = (data.match(/^    name: /gm) ?? []).length;
    const shown = (data.match(/contact: \{/g) ?? []).length;
    const withheld = (data.match(/contact: null/g) ?? []).length;
    expect(shown + withheld).toBe(profiles);
    // Each set of contact details on the page has a recorded consent.
    expect(shown).toBe((data.match(/consentSource: "/g) ?? []).length);
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

  /**
   * Tim Hunt, 14 September 2026: "Get rid of Babatunde this will cost WSA
   * 5% of the tuition fees if he is involved." A paid campaign page must
   * therefore not name him or show his photograph. This asserts the
   * published data, not a comment about it, so restoring his card fails.
   */
  it("does not route campaign enquiries to Babatunde Azeez", () => {
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    expect(data).not.toContain("Babatunde");
    expect(data).not.toContain("babatunde_azeez");
    expect(page).not.toMatch(/Babatunde/i);
  });

  /**
   * The same review asked for Claudia Ingado to replace Eldah here. She is
   * not published until WSA holds a photograph, verified contact details
   * and written consent, so this guards the half that can be guarded: if
   * Claudia is named on the page, she must be named with a real photograph
   * and with her actual job title, never as a "Student Counsellor", which
   * she is not.
   */
  it("if Claudia Ingado is published, she is published correctly", () => {
    const data = content.slice(content.indexOf("export const COUNSELLORS"));
    if (!data.includes("Claudia")) return;
    const claudia = data.slice(data.indexOf("Claudia"));
    expect(claudia).toContain('role: "Student Recruitment and Relationship Manager"');
    expect(claudia).not.toMatch(/photo: ""/);
    expect(claudia).not.toContain("consentSource: null");
  });

  it("publishes no phone number other than the approved one", () => {
    const numbers = Array.from(page.matchAll(/\+\d[\d\s]{7,}/g)).map(m => m[0].trim());
    expect(numbers).toEqual([]);
    const inContent = Array.from(content.matchAll(/\+\d[\d\s]{7,}/g)).map(m => m[0].trim());
    expect(inContent.every(n => n.replace(/\s/g, "") === "+447470689849")).toBe(true);
  });
});

/**
 * The taught Master's page at /uk-masters-nigeria is not the campaign's
 * Final URL and must not become a second one. Brief v2.0 names exactly one
 * destination, /nigeria-postgraduate, in sections 19 and 30.
 *
 * It still had a job to do, though. Until 14 September 2026 it told every
 * research applicant "It is not aimed at MRes, MPhil, PhD or doctorate
 * applicants", which turned away organically the very enquiries the
 * approved scope now wants. It keeps its taught Master's focus and sends
 * those students on instead.
 */
describe("the taught Master's page points research applicants onward without duplicating the campaign page", () => {
  const oldPage = withoutComments(read("../../client/src/pages/UKMastersNigeria.tsx"));

  it("no longer rejects research applicants", () => {
    expect(oldPage).not.toMatch(/not aimed at MRes, MPhil, PhD or doctorate applicants/i);
    expect(oldPage).not.toMatch(/not a research route/i);
  });

  it("routes them to the campaign page", () => {
    expect(oldPage).toContain('href="/nigeria-postgraduate"');
    expect(oldPage).toMatch(/MRes, MPhil or PhD/);
  });

  it("stays a taught Master's page rather than becoming a second campaign page", () => {
    // The enquiry form, the programme picker and the destination picker are
    // what make the campaign page the campaign page. None may appear here.
    expect(oldPage).not.toContain("CAMPAIGN_PROGRAMMES");
    expect(oldPage).not.toContain("CAMPAIGN_DESTINATIONS");
    expect(oldPage).not.toContain("Get my study options");
    expect(oldPage).toMatch(/taught Master's/i);
  });

  it("is still its own indexable route, neither redirected nor removed", () => {
    expect(isValidClientRoute("/uk-masters-nigeria")).toBe(true);
    expect(shouldNoindex("/uk-masters-nigeria")).toBe(false);
    expect(PRERENDER_ROUTES).toContain("/uk-masters-nigeria");
    expect(CANONICAL_PATHS["/uk-masters-nigeria"]).toBeUndefined();
  });
});

/**
 * Brief v2.0 section 15, and open point 2, forbid advertising three
 * research services until WSA confirms in writing that it provides them:
 * supervisor matching, research proposal writing and studentship
 * placement. Section 29 forbids guaranteeing a supervisor, a studentship or
 * a research place at all. This holds both Nigeria pages to that.
 */
describe("neither Nigeria page advertises unconfirmed research services", () => {
  const pages = {
    "nigeria-postgraduate": page,
    "uk-masters-nigeria": withoutComments(read("../../client/src/pages/UKMastersNigeria.tsx")),
  };

  for (const [name, source] of Object.entries(pages)) {
    it(`${name} promises no supervisor matching, proposal writing or studentship placement`, () => {
      expect(source).not.toMatch(/supervisor match/i);
      expect(source).not.toMatch(/(match|find|secure)( you)?( a| your)? supervisor/i);
      expect(source).not.toMatch(/(write|writing|draft|drafting) (your |a )?research proposal/i);
      expect(source).not.toMatch(/studentship (placement|guidance|matching)/i);
      // "should not be treated as guaranteed" is a disclaimer, not a
      // promise. What section 29 forbids is WSA guaranteeing an outcome.
      expect(source).not.toMatch(/we guarantee/i);
      expect(source).not.toMatch(/guaranteed (admission|place|offer|visa|supervisor|studentship|funding|scholarship)/i);
    });
  }
});
