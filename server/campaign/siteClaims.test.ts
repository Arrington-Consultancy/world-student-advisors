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
