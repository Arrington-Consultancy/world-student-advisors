import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { WSA_TEAM, REGIONAL_REPRESENTATIVES, whatsappLink } from "../../client/src/lib/team";

/**
 * Tim Hunt's website edits of 15 September 2026, emailed to Tom Arrington
 * ("Website edits", 17:01, thread 1a0a604bb983c112).
 *
 * These are contact details. The failure that matters is not a page that
 * looks wrong, it is a page that looks right while a link dials a number
 * nobody answers, so every assertion here goes at the resolved link or the
 * published data, never at a comment claiming the change was made.
 *
 * The superseded values are asserted absent as well as the new ones
 * present. "The new number is on the page" is true of a page that shows
 * both.
 */

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/**
 * Comments record what was removed and naturally quote it, so an assertion
 * that a phrase is absent would fail on the note explaining its absence.
 * These strip comments so every assertion runs against what ships.
 */
const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const contactSrc = read("../../client/src/pages/Contact.tsx");
const contact = withoutComments(contactSrc);
const portal = withoutComments(read("../../client/src/pages/Portal.tsx"));
const teamSrc = withoutComments(read("../../client/src/lib/team.ts"));

const NIGERIA_OFFICE = "+234 818 204 9068";
const OLD_NIGERIA = ["+234 812 929 2769", "2349129292769", "8129292769"];

describe("Nigeria office: one number, and only one", () => {
  it("publishes Tim's Nigeria office WhatsApp number", () => {
    expect(contact).toContain(NIGERIA_OFFICE);
  });

  it("leaves no old or duplicate Nigeria number anywhere a reader can reach", () => {
    for (const src of [contact, portal, teamSrc]) {
      for (const old of OLD_NIGERIA) expect(src).not.toContain(old);
    }
    for (const person of REGIONAL_REPRESENTATIVES) {
      for (const old of OLD_NIGERIA) expect(person.whatsapp).not.toContain(old);
    }
  });

  it("every published +234 number is the one office number", () => {
    const found = new Set<string>();
    for (const src of [contact, portal, teamSrc]) {
      for (const m of src.matchAll(/\+234[\d\s]{6,}/g)) found.add(m[0].trim());
    }
    for (const n of found) expect(n.replace(/\s/g, "")).toBe(NIGERIA_OFFICE.replace(/\s/g, ""));
  });
});

describe("UK Head Office", () => {
  it("carries the address, email and WhatsApp Tim specified", () => {
    expect(contact).toContain("2 Newport Close, Clevedon, BS21 5DZ, England, UK");
    expect(contact).toContain("UKHeadOffice@WorldStudentAdvisors.com");
    expect(contact).toContain('whatsapp: "+44 7470 689 849"');
  });

  it("renders the office email as a mailto link, not as plain text", () => {
    expect(contact).toContain("href={`mailto:${office.email}`}");
  });

  it("no longer answers the UK Head Office on Tim's personal mobile", () => {
    const uk = contact.slice(contact.indexOf('country: "United Kingdom"'), contact.indexOf('country: "Kenya"'));
    expect(uk).not.toContain("7914 797830");
  });
});

describe("Manet Khamayo's number, text and link together", () => {
  it("shows and dials 546016", () => {
    const manet = WSA_TEAM.find(p => p.name === "Manet Khamayo")!;
    expect(manet.phone).toBe("+44 7555 546016");
    expect(whatsappLink(manet.phone)).toBe("https://wa.me/447555546016");
  });

  it("has no trace of the superseded 547016", () => {
    expect(teamSrc).not.toContain("547 016");
    expect(teamSrc).not.toContain("547016");
  });
});

describe("registration form funding options", () => {
  /**
   * Tim instructed removal on 15 September 2026. The request had been made
   * once before and deliberately held; the note recording that it was NOT
   * done must go with the options, or the next reader is told the opposite
   * of what the form now does.
   */
  it("no longer offers Student Loan or Mixed funding", () => {
    expect(contact).not.toContain('<option value="loan">');
    expect(contact).not.toContain('<option value="mixed">');
    expect(contact).not.toContain("Student Loan");
    expect(contact).not.toContain("Mixed funding<");
  });

  it("keeps the three funding options that remain", () => {
    for (const v of ["self-funded", "scholarship", "sponsor"]) {
      expect(contact).toContain(`<option value="${v}">`);
    }
  });

  it("carries no unreachable mixed-funding fields behind the removed option", () => {
    // The option is gone, so the conditional block could never render.
    expect(contact).not.toContain('formData.educationFunding === "mixed"');
    expect(contact).not.toContain("mixedFundingSources:");
  });

  it("the stale note saying the removal was NOT done is gone", () => {
    // Deliberately the raw source: this one is about the comment itself.
    expect(contactSrc).not.toContain("is NOT done");
  });
});

describe("Tim's presentation changes of 15 September 2026", () => {
  const nigeria = withoutComments(read("../../client/src/pages/NigeriaPostgraduate.tsx"));
  const header = withoutComments(read("../../client/src/components/Header.tsx"));
  const footer = withoutComments(read("../../client/src/components/Footer.tsx"));

  /**
   * "Nigerian flag bigger on the landing page, 300% bigger ish." It was
   * h-4 w-6. Asserted at the class rather than by eye, and asserted on
   * every instance, because the page draws the flag twice and changing one
   * of them is the easy half-fix.
   */
  it("draws the Nigerian flag about three times its old size, everywhere it appears", () => {
    const sizes = [...nigeria.matchAll(/<NigerianFlag className="([^"]+)"/g)].map(m => m[1]);
    expect(sizes.length).toBeGreaterThan(1);
    for (const s of sizes) expect(s).toBe("h-12 w-[4.5rem]");
    expect(nigeria).not.toContain('<NigerianFlag className="h-4 w-6"');
  });

  /**
   * "Staff portal down in footer of page not in main menu." Both halves
   * matter: gone from the menu AND present in the footer. Removing it from
   * one without adding it to the other would leave staff with no door.
   */
  it("keeps Staff Portal out of the main menu and in the footer", () => {
    expect(header).not.toContain("/staff-portal");
    expect(header).not.toContain("Staff Portal");
    expect(footer).toContain('href="/staff-portal"');
    expect(footer).toContain("Staff Portal");
  });

  it("does not disturb the rest of the main menu", () => {
    for (const href of ["/about", "/study-options", "/partners", "/our-team", "/events", "/student-support-library", "/portal/interview-coach"]) {
      expect(header, href).toContain(`"${href}"`);
    }
  });
});
