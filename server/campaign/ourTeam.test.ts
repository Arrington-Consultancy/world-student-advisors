import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { WSA_TEAM, SUPPORT_JOURNEY, REGIONAL_REPRESENTATIVES, whatsappLink } from "../../client/src/lib/team";
import { CANONICAL_PATHS, SEO_MAP, getCanonicalPath, shouldNoindex } from "../../shared/seo";
import { PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { isValidClientRoute } from "../../shared/routes";

/**
 * OUR TEAM, pinned to the approved implementation direction of 14 September
 * 2026 (`16_WEBSITE_Ai/06 Counsellors/
 * WSA_OUR_TEAM_Page_Implementation_Direction_14_Sep_2026.md`).
 *
 * The clauses worth a test are the ones where drift would publish something
 * WSA cannot evidence, or quietly undo an agreed decision: the team order,
 * the removal of country headings, the exact wording that was argued over,
 * the British Council badge and certificate gates, and the retention of the
 * regional representatives' records.
 */
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const page = read("../../client/src/pages/OurTeam.tsx");
const publicFile = (p: string) => existsSync(fileURLToPath(new URL(`../../client/public/${p}`, import.meta.url)));

describe("the page presents one WSA team in the approved order (clause 7)", () => {
  it("lists exactly the six approved people, in order", () => {
    expect(WSA_TEAM.map(p => `${p.name} — ${p.role}`)).toEqual([
      "Tim Hunt — Managing Director",
      "Tom Arrington — Business Consultant",
      "Eldah Therone — Senior Student Counsellor & Team Leader",
      "Glenice Owino — Senior Student Counsellor",
      "Manet Khamayo — Student Counsellor",
      "Claudia Ingado — Student Recruitment & Relationship Manager",
    ]);
  });

  it("renders the team as one grid, with no country grouping", () => {
    expect(page).toContain("WSA_TEAM.map(");
    // The old page grouped by region. Neither the region loop nor any
    // country heading may come back.
    expect(page).not.toMatch(/\["UK", "Kenya", "Nigeria", "Ghana", "Angola", "Malawi"\]/);
    expect(page).not.toMatch(/p\.region === region/);
    // No country may be used as a section heading. Naming the countries WSA
    // supports students in, inside a sentence, is a different claim and stays.
    const headings = [...page.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map(m => m[1].trim());
    for (const country of ["United Kingdom", "Kenya", "Nigeria", "Ghana", "Angola", "Malawi"]) {
      expect(headings).not.toContain(country);
    }
    expect(page).not.toContain("MapPin");
  });

  it("gives no physical location for the Sub-Saharan Africa Regional Office (clause 3)", () => {
    expect(page).toContain("Sub-Saharan Africa Regional Office");
    expect(page).not.toContain("Waiyaki Way");
    expect(page).not.toContain("Nafra Building");
  });
});

describe("the wording the direction settled (clauses 2, 3, 4, 6)", () => {
  it("uses the approved headings", () => {
    expect(page).toContain("Meet the WSA team");
    expect(page).toContain("The people behind WSA");
    expect(page).not.toContain("Meet the counsellors");
    expect(page).not.toContain("Your local experts");
  });

  it("uses the approved introduction verbatim", () => {
    expect(page).toContain(
      "our strength lies in our people. Our UK Head Office and Sub-Saharan Africa Regional Office work together as one team, supporting students from their first enquiry through application, visa preparation and enrolment.",
    );
  });

  it("keeps the standardised British Council panel wording, not the source document's variant", () => {
    expect(page).toContain("British Council UK knowledge-trained counsellors");
    expect(page).not.toContain("British Council trained Student Counsellors");
  });

  it("keeps the three principles and states the training claim as agreed", () => {
    for (const principle of ["Named and accountable", "Qualified and trained", "Ethical and honest"]) {
      expect(page).toContain(principle);
    }
    expect(page).toContain(
      "Our Student Counsellors support students through international admissions, student visa preparation and the wider student journey.",
    );
    // The previous claim of formal visa-process training is not evidenced.
    expect(page).not.toContain("trained in international admissions, visa processes");
  });
});

describe("how we support you is the student journey, not the org chart (clause 8)", () => {
  it("runs enquiry to enrolment through Claudia and a named counsellor", () => {
    expect(SUPPORT_JOURNEY.map(s => s.step)).toEqual([
      "Enquiry",
      "Claudia",
      "Named Student Counsellor",
      "Application",
      "Visa Preparation",
      "Enrolment",
    ]);
    expect(page).toContain("How we support you");
  });

  it("deliberately differs from the organisational order", () => {
    expect(SUPPORT_JOURNEY[1].step).toBe("Claudia");
    expect(WSA_TEAM[0].name).toBe("Tim Hunt");
  });
});

describe("the British Council badge and certificate gates (clauses 11 and 12)", () => {
  /** WSA holds a current certificate for exactly these four people. */
  const HOLDERS = ["Tim Hunt", "Eldah Therone", "Glenice Owino", "Manet Khamayo"];

  it("flags only the people WSA holds a current certificate for", () => {
    expect(WSA_TEAM.filter(p => p.britishCouncil).map(p => p.name).sort()).toEqual([...HOLDERS].sort());
  });

  it("never links a certificate for someone who does not hold one", () => {
    for (const person of WSA_TEAM) {
      if (person.certificate) expect(person.britishCouncil).toBe(true);
    }
  });

  /**
   * Holding a certificate is not consent to publish it. Only Tim Hunt's and
   * Eldah Therone's public use is evidenced (the controlled request document
   * of 10 September 2026, and Eldah's written consent of 12 September 2026
   * recorded in Change Entry 094), so only those two files exist.
   */
  it("publishes only the two certificates whose public use is evidenced", () => {
    expect(WSA_TEAM.filter(p => p.certificate).map(p => p.name)).toEqual(["Tim Hunt", "Eldah Therone"]);
    for (const person of WSA_TEAM) {
      if (person.certificate) expect(publicFile(person.certificate)).toBe(true);
    }
  });

  it("keeps the badge per-person and says it opens the certificate where it does", () => {
    expect(page).toMatch(/if \(!person\.britishCouncil\) return null;/);
    expect(page).toContain("Opens the certificate.");
    expect(page).toContain("View certificate");
  });

  it("never claims accreditation, certification, recognition or endorsement", () => {
    expect(page).not.toMatch(/British Council (Certified|Accredited|Recognised|Endorsed)/i);
    expect(page).not.toMatch(/(certified|accredited|recognised|endorsed) by the British Council/i);
  });
});

describe("nothing unevidenced is published (clauses 13 and 16)", () => {
  /**
   * The only reference to an Oxford credential for Tom Arrington is the
   * suggestion "You could add your Oxford qualification" in the 10 September
   * request document. No qualification record exists, so nothing may be
   * shown, and "Oxford Diploma" is a title no source uses.
   */
  it("shows no Oxford credential for Tom Arrington", () => {
    expect(page).not.toMatch(/Oxford/i);
    expect(JSON.stringify(WSA_TEAM)).not.toMatch(/Oxford/i);
  });

  it("gives every published person a photograph, a biography and a working contact route", () => {
    for (const person of WSA_TEAM) {
      expect(publicFile(person.photo), `${person.name} photograph`).toBe(true);
      expect(person.biography.length).toBeGreaterThan(2);
      expect(person.email).toMatch(/@worldstudentadvisors\.com$/);
      expect(person.phone).toMatch(/^\+44 /);
      expect(person.phoneKind).not.toBeNull();
    }
  });

  it("offers WhatsApp only for mobile numbers, and a landline as a telephone number", () => {
    const tom = WSA_TEAM.find(p => p.name === "Tom Arrington")!;
    expect(tom.phoneKind).toBe("telephone");
    expect(whatsappLink("+44 7470 689 849")).toBe("https://wa.me/447470689849");
  });

  it("uses the contact details from each person's own profile record", () => {
    const phones = Object.fromEntries(WSA_TEAM.map(p => [p.name, p.phone]));
    expect(phones).toEqual({
      "Tim Hunt": "+44 791 4797 830",
      "Tom Arrington": "+44 1752 477 026",
      "Eldah Therone": "+44 7470 689 849",
      "Glenice Owino": "+44 7459 720 726",
      "Manet Khamayo": "+44 7555 547 016",
      "Claudia Ingado": "+44 7341 905 979",
    });
  });
});

describe("the regional representatives' records survive the restructure (clause 14)", () => {
  it("keeps all eleven, with their photographs", () => {
    expect(REGIONAL_REPRESENTATIVES).toHaveLength(11);
    for (const person of REGIONAL_REPRESENTATIVES) {
      expect(person.name.length).toBeGreaterThan(0);
      expect(person.photo).toMatch(/^\/manus-storage\//);
      expect(publicFile(person.photo), `${person.name} photograph`).toBe(true);
    }
  });

  it("keeps every person who was on the old page", () => {
    const kept = new Set([...WSA_TEAM.map(p => p.name), ...REGIONAL_REPRESENTATIVES.map(p => p.name)]);
    for (const name of [
      "Tim Hunt", "Tom Arrington", "Babatunde Abdulia Azeez", "Eldah Therone", "Sarafina Kihumbu",
      "Glenice Owino", "Manet Khamayo", "Gladys Naadi Banhu", "Dr. Dele Kogbe", "Dr. Domoyi Castro Mathew",
      "Pedro Bezerra", "Juliet Nnajiofor-Uyi", "Winnie Kamuya", "Maryam Lawal", "Madalitso Dube",
      "Tobrise Arhawarien",
    ]) {
      expect(kept.has(name), `${name} must still have a record`).toBe(true);
    }
  });

  it("does not publish any of them on this page (clause 15 forbids regional pages in this task)", () => {
    expect(page).not.toContain("REGIONAL_REPRESENTATIVES");
    for (const person of REGIONAL_REPRESENTATIVES) expect(page).not.toContain(person.name);
  });
});

describe("the route change keeps /counsellors working", () => {
  it("serves the page at /our-team, indexable and prerendered", () => {
    expect(isValidClientRoute("/our-team")).toBe(true);
    expect(shouldNoindex("/our-team")).toBe(false);
    expect(PRERENDER_ROUTES).toContain("/our-team");
    expect(SEO_MAP["/our-team"]).toBeDefined();
  });

  it("301s the old path to the new one, in one hop", () => {
    expect(CANONICAL_PATHS["/counsellors"]).toBe("/our-team");
    expect(getCanonicalPath("/counsellors")).toBe("/our-team");
    // A redirect that lands on another redirect costs a hop and loses rank.
    expect(CANONICAL_PATHS["/our-team"]).toBeUndefined();
    const legacy = read("../../server/_core/legacyRedirects.ts");
    expect(legacy).toContain('"/meet-our-counsellors": "/our-team"');
  });

  it("keeps /counsellors a real route so an in-app link never 404s", () => {
    expect(isValidClientRoute("/counsellors")).toBe(true);
    expect(PRERENDER_ROUTES).not.toContain("/counsellors");
  });

  it("points the sitemap at the canonical path only", () => {
    const sitemap = read("../../client/public/sitemap.xml");
    expect(sitemap).toContain("https://www.worldstudentadvisors.com/our-team");
    expect(sitemap).not.toContain("https://www.worldstudentadvisors.com/counsellors");
  });
});
