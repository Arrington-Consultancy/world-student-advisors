import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  DESIRED_LEVEL_VALUES,
  DESTINATION_VALUES,
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
    const names = Array.from(content.matchAll(/name: "([^"]+)", emphasis/g)).map(m => m[1]);
    expect(names).not.toContain("Europe");
    expect(names[0]).toBe("United Kingdom");
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
    const emitted = Array.from(contentSrc.matchAll(/recordedAs: "([^"]+)" \}/g)).map(m => m[1]);
    expect(emitted.length).toBeGreaterThan(0);
    for (const v of emitted) expect(isDesiredLevelValue(v) || isDestinationValue(v)).toBe(true);
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

describe("what the CRM will and will not be able to tell apart", () => {
  it("records MRes, MPhil and taught Master's as one value, and says so", () => {
    expect(options).toContain("cannot tell an MRes or an MPhil from a taught Master's");
    const levels = Array.from(contentSrc.matchAll(/recordedAs: "(postgraduate|doctorate)" \}/g)).map(m => m[1]);
    expect(levels.filter(v => v === "postgraduate")).toHaveLength(3);
    expect(levels.filter(v => v === "doctorate")).toHaveLength(1);
  });

  it("every canonical value is one the live form really offers", () => {
    for (const v of DESIRED_LEVEL_VALUES) expect(contact).toContain(`value="${v}"`);
    for (const v of DESTINATION_VALUES) expect(contact).toContain(`value="${v}"`);
  });

  it("refuses a value the form does not offer", () => {
    for (const bad of ["mphil", "mres", "germany", "nigeria", ""]) {
      expect(isDesiredLevelValue(bad)).toBe(false);
      expect(isDestinationValue(bad)).toBe(false);
    }
  });
});

describe("a Nigerian number reaches the signup form in a form it can read", () => {
  it("gives a local mobile its country code and drops the trunk zero", () => {
    expect(toInternationalNigerianNumber("08012345678")).toBe("+2348012345678");
    expect(toInternationalNigerianNumber("0801 234 5678")).toBe("+2348012345678");
    expect(toInternationalNigerianNumber("8012345678")).toBe("+2348012345678");
  });

  it("leaves a number that already states its country alone", () => {
    expect(toInternationalNigerianNumber("+2348012345678")).toBe("+2348012345678");
    // A Nigerian now in the UK is not assumed to be dialling from Nigeria.
    expect(toInternationalNigerianNumber("+447914797830")).toBe("+447914797830");
    expect(toInternationalNigerianNumber("+44 7914 797830")).toBe("+447914797830");
  });

  it("understands 00 and a bare 234 prefix", () => {
    expect(toInternationalNigerianNumber("002348012345678")).toBe("+2348012345678");
    expect(toInternationalNigerianNumber("2348012345678")).toBe("+2348012345678");
  });

  it("drops a value it cannot make sense of rather than passing on a mangled one", () => {
    for (const bad of ["", "   ", "12", "0", "+", "+123", "abc", "080123"]) {
      expect(toInternationalNigerianNumber(bad)).toBeNull();
    }
  });

  it("never produces the +08 the international field read before", () => {
    for (const input of ["08012345678", "0703 111 2222", "09099999999"]) {
      expect(toInternationalNigerianNumber(input)).not.toMatch(/^\+0/);
    }
  });
});
