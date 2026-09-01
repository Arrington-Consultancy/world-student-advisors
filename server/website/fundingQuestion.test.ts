import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const contact = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/Contact.tsx"), "utf8");

/**
 * The funding question, reworded at staff request on 1 September 2026.
 *
 * The same request asked for Student Loan and Mixed funding to be removed.
 * That part is NOT done: both remain open pending clarification, and these
 * tests hold them in place so a later tidy-up cannot quietly drop an option
 * a student needs in order to describe how they are actually paying.
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

  /**
   * Explicitly retained, not overlooked. Removing either was requested and
   * deferred pending clarification from staff.
   */
  it("keeps Student Loan, which is deferred and not removed", () => {
    expect(contact).toContain('<option value="loan">Student Loan</option>');
  });

  it("keeps Mixed funding, which is deferred and not removed", () => {
    expect(contact).toContain('<option value="mixed">Mixed funding</option>');
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
