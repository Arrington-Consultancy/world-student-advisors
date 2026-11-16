import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const contact = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/Contact.tsx"), "utf8");

/**
 * The funding question, reworded at staff request on 1 September 2026.
 *
 * That request also asked for Student Loan and Mixed funding to be removed.
 * It was held then, because "a member of staff asked" was not enough to
 * drop an option a student might need to describe how they are paying, and
 * these tests pinned both in place until someone with the authority said
 * otherwise.
 *
 * Tim Hunt did so on 15 September 2026, in writing, as Managing Director.
 * The tests now pin the opposite: both options are gone, and the removal is
 * asserted at the rendered options rather than at a note claiming it.
 */
describe("the funding question wording", () => {
  it("asks the applicant how they are financing their studies", () => {
    expect(contact).toContain("How are you financing your studies? *");
  });

  it("no longer shows the old internal-sounding label", () => {
    expect(contact).not.toContain(">Education Funding *<");
  });
});

describe("the funding options that must remain", () => {
  it.each([
    ["", "Select..."],
    ["self-funded", "Self-funded / Family"],
    ["scholarship", "Scholarship"],
    ["sponsor", "Sponsor / Employer"],
  ])("keeps %s", (value, label) => {
    expect(contact).toContain(`<option value="${value}">${label}</option>`);
  });

});

describe("the funding options Tim removed on 15 September 2026", () => {
  it.each([
    ["loan", "Student Loan"],
    ["mixed", "Mixed funding"],
  ])("no longer offers %s", (value, label) => {
    expect(contact).not.toContain(`<option value="${value}">${label}</option>`);
    expect(contact).not.toContain(`<option value="${value}">`);
  });

  /**
   * Neither mapped honestly: Pipedrive has no loan option, so "loan" was
   * filed as Self-funded and "mixed" as "Looking for a partial
   * scholarship". Removing the options stops the CRM being told something
   * the student never said.
   */
  it("leaves no unreachable mixed-funding questions behind the removed option", () => {
    expect(contact).not.toContain('formData.educationFunding === "mixed"');
    for (const field of ["mixedFundingSources", "mixedFundingConfirmedAmount", "mixedFundingRemaining"]) {
      expect(contact).not.toContain(field);
    }
  });

  /**
   * The server still accepts both values. A submission already in flight,
   * or a record that already carries one, must not be rejected because the
   * form stopped offering the option.
   */
  it("the server still understands a value the form no longer offers", () => {
    const pipedrive = readFileSync(path.resolve(import.meta.dirname, "../pipedrive.ts"), "utf8");
    expect(pipedrive).toMatch(/\bloan: \d+/);
    expect(pipedrive).toMatch(/\bmixed: \d+/);
  });
});

describe("the scholarship follow-up questions are retained", () => {
  it("still asks the three scholarship questions when Scholarship is chosen", () => {
    expect(contact).toContain('formData.educationFunding === "scholarship"');
    for (const field of ["scholarshipName", "scholarshipStatus", "scholarshipCoverage"]) {
      expect(contact).toContain(field);
    }
  });

  it("still validates the scholarship name and status", () => {
    expect(contact).toMatch(/scholarshipName\s*=\s*"Please tell us which scholarship"/);
    expect(contact).toMatch(/scholarshipStatus\s*=\s*"Please select the funding status"/);
  });
});
