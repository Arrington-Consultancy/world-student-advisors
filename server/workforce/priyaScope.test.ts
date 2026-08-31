import { describe, expect, it } from "vitest";
import {
  checkPreparationOnly,
  PRIYA_CAPABILITIES,
  PERMITTED_OUTPUT_SHAPES,
  PRIYA_BLOCKERS,
} from "./priyaScope";
import { getWorker } from "./registry";

/**
 * These are the tests that decide whether Priya is safe to run at all.
 * The rule is narrow and absolute: she may ask, she may not answer.
 */
describe("Priya's output check — she may ask, she may not answer", () => {
  const allowed = [
    "Confirm which immigration route applies to this student before proceeding.",
    "Obtain the applicant's current passport, previous visas and a full travel history.",
    "What is the student's current immigration status in the UK?",
    "Establish whether the sponsor holds a current licence, and record the date checked.",
    "Verify with the authorised human whether maintenance funds are in scope for this case.",
    "Identify the evidence the caseworker will need for the qualification claimed.",
    "It is uncertain whether the previous refusal is material here. A named authorised human must determine that.",
    "Clarify which documents must be translated and certified.",
  ];

  for (const text of allowed) {
    it(`allows preparation: "${text.slice(0, 45)}..."`, () => {
      expect(checkPreparationOnly(text).withinScope).toBe(true);
    });
  }

  const blocked = [
    "The applicant must show 28 consecutive days of maintenance funds.",
    "You need to hold the funds for 28 days before applying.",
    "The student is eligible for the Graduate route.",
    "The requirement is £1,334 per month for courses in London.",
    "Under Appendix Finance, the applicant must evidence course fees for one academic year.",
    "The rule requires a valid Confirmation of Acceptance for Studies.",
    "She qualifies under the Student route.",
    "No visa is required for a stay of under six months.",
    "The threshold is 4,500 for maintenance.",
    "They have to provide a tuberculosis certificate.",
  ];

  for (const text of blocked) {
    it(`blocks a rule statement: "${text.slice(0, 45)}..."`, () => {
      const result = checkPreparationOnly(text);
      expect(result.withinScope).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  }

  it("blocks a rule statement buried inside otherwise good preparation", () => {
    const mixed = [
      "Questions for the authorised human:",
      "Confirm which route applies to this student.",
      "The applicant must show 28 days of maintenance funds.",
      "Evidence required: current passport and previous visas.",
    ].join("\n");
    const result = checkPreparationOnly(mixed);
    expect(result.withinScope).toBe(false);
    expect(result.violations.join(" ")).toContain("28 days of maintenance funds");
  });

  it("does not treat her own refusal as a violation", () => {
    const refusal =
      "I cannot state what the rule requires. AB-P01 and AB-P03 are open, so a named authorised human must " +
      "answer that. I can set out what this case needs instead.";
    expect(checkPreparationOnly(refusal).withinScope).toBe(true);
  });

  it("a caveat does not rescue a rule statement", () => {
    const caveated =
      "Broadly speaking, and this should be checked, the applicant must show 28 days of maintenance funds.";
    expect(checkPreparationOnly(caveated).withinScope).toBe(false);
  });
});

describe("Priya's capability map records why each is off", () => {
  it("case preparation is the one available capability", () => {
    const available = PRIYA_CAPABILITIES.filter(c => c.available).map(c => c.id);
    expect(available).toEqual(["case_preparation"]);
  });

  it("rule explanation is blocked by AB-P03 and AB-P01, and not by a connector", () => {
    const rules = PRIYA_CAPABILITIES.find(c => c.id === "rules_explanation")!;
    expect(rules.blockedBy).toEqual(["AB-P03", "AB-P01"]);
    expect(rules.reason).toMatch(/Not a connector limitation/);
  });

  it("regulated advice stays blocked by AB-P04 whatever happens to P01 and P03", () => {
    const regulated = PRIYA_CAPABILITIES.find(c => c.id === "regulated_advice")!;
    expect(regulated.blockedBy).toContain("AB-P04");
    expect(regulated.reason).toMatch(/irrespective of AB-P01 and AB-P03/);
  });

  it("all four approval blockers remain recorded", () => {
    expect(Object.keys(PRIYA_BLOCKERS)).toEqual(["AB_P01", "AB_P02", "AB_P03", "AB_P04"]);
  });

  it("preparation may produce only questions, evidence requirements and uncertainty", () => {
    expect(PERMITTED_OUTPUT_SHAPES).toHaveLength(3);
  });

  it("the register agrees with the scope module about which capabilities are on", () => {
    const registryOn = getWorker("priya").capabilities
      .filter(c => c.unavailableBecause === null)
      .map(c => c.id)
      .sort();
    const scopeOn = PRIYA_CAPABILITIES.filter(c => c.available).map(c => c.id).sort();
    expect(registryOn).toEqual(scopeOn);
  });
});

/**
 * Implementing a bounded capability is not approval of it. Priya's
 * specification is still APPROVAL BLOCKED, so none of this runs until Tom
 * approves a bounded specification.
 */
describe("the bounded capability is built, not activated", () => {
  it("Priya remains approval_blocked and not executable", () => {
    const priya = getWorker("priya");
    expect(priya.specificationStatus).toBe("approval_blocked");
    expect(priya.staffPortalExecutionAuthorised).toBe(false);
  });
});
