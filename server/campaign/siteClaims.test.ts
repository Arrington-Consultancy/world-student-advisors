import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * The site-wide footer appears on every page, including the Nigeria
 * campaign landing page, so paid traffic lands on whatever it says. The
 * reconciled Google Ads brief (v2.0, 12 September 2026, section 29) forbids
 * describing WSA as accredited, certified, recognised or endorsed by the
 * British Council, because every certificate WSA holds says the British
 * Council does none of those things for agents. This pins the footer to
 * what the certificates actually support.
 */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const footerSrc = read("../../client/src/components/Footer.tsx");
const footer = withoutComments(footerSrc);

/** Every public page that named the British Council on 12 September 2026. */
const PUBLIC_PAGES = ["Home", "About", "OurTeam", "Partners", "Privacy", "Terms", "NigeriaPostgraduate"];
const pages = Object.fromEntries(
  PUBLIC_PAGES.map(n => [n, withoutComments(read(`../../client/src/pages/${n}.tsx`))]),
);

describe("the site-wide footer makes no British Council claim the certificates do not support", () => {
  it("describes counsellors as UK knowledge-trained, the certificate's own words", () => {
    expect(footer).toContain("British Council UK knowledge-trained counsellors");
  });

  it("never says certified, accredited, recognised or endorsed", () => {
    expect(footer).not.toMatch(/British Council (Certified|Accredited|Recognised|Endorsed)/i);
    expect(footer).not.toMatch(/(certified|accredited|recognised|endorsed) by the British Council/i);
  });

  /**
   * "since 2012" is allowed only while the record that evidences it is
   * cited beside it. A bare date with no source is how the claim drifted
   * in the first place.
   */
  it("cites the record that evidences 'since 2012'", () => {
    if (/since 2012/.test(footer)) {
      expect(footerSrc).toMatch(/Grant Application of 17 June 2026/);
      expect(footerSrc).toMatch(/Incorporated 09 April 2015/);
    }
  });
});

describe("the same rule holds on every public page, not only the footer", () => {
  for (const name of PUBLIC_PAGES) {
    it(`${name} never says British Council certified, accredited, recognised or endorsed`, () => {
      expect(pages[name]).not.toMatch(/British Council (Certified|Accredited|Recognised|Endorsed)/i);
      expect(pages[name]).not.toMatch(/(certified|accredited|recognised|endorsed) by the British Council/i);
    });
  }

  it("uses the agreed wording wherever the British Council is named as a credential", () => {
    for (const name of ["Home", "About", "OurTeam", "Partners", "Privacy", "Terms"]) {
      expect(pages[name]).toContain("British Council UK knowledge-trained");
    }
  });

  /**
   * The per-counsellor badge is an individual claim, so it must stay gated
   * on a per-person flag rather than being rendered for everyone.
   */
  it("shows the team badge only for people flagged as holding a certificate", () => {
    expect(pages.OurTeam).toMatch(/if \(!person\.britishCouncil\) return null;/);
  });
});

describe("the public entry points outside the page set follow the same rule", () => {
  const shell = withoutComments(read("../../client/src/components/PortalBrandShell.tsx"));
  it("the Staff Portal sign-in shell does not say British Council recognised", () => {
    expect(shell).not.toMatch(/British Council (Certified|Accredited|Recognised|Endorsed)/i);
    expect(shell).toContain("British Council UK knowledge-trained");
  });

  /**
   * The graphic british_council_certified_b72a19c7.png reads "BRITISH COUNCIL
   * Certified Agent" in the image itself, so alt text cannot make it
   * compliant. It stays in the repository but nothing may render it.
   */
  it("no page renders the 'Certified Agent' graphic", () => {
    for (const name of PUBLIC_PAGES) expect(pages[name]).not.toContain("british_council_certified_b72a19c7");
    expect(footer).not.toContain("british_council_certified_b72a19c7");
  });
});

/**
 * The meta description is what Google prints under every result and what
 * a shared link shows, so it is the most-read sentence on the site. The
 * same rule applies to it, and to the per-route descriptions in seo.ts.
 */
describe("the site's search and social metadata follow the same rule", () => {
  const seo = withoutComments(read("../../shared/seo.ts"));
  const indexHtml = read("../../client/index.html");
  const bad = /British Council (Certified|Accredited|Recognised|Endorsed)|(certified|accredited|recognised|endorsed) by the British Council/i;
  it("no route description says British Council certified", () => {
    expect(seo).not.toMatch(bad);
  });
  it("index.html meta, keywords, Open Graph and Twitter descriptions do not either", () => {
    expect(indexHtml).not.toMatch(bad);
    expect(indexHtml).toMatch(/og:description" content="British Council UK knowledge-trained counsellors/);
  });
});
