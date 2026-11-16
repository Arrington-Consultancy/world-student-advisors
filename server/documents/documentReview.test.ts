import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkNoInventedExplanation, checkNoOutcomePrediction, checkRecordNotRewritten,
  checkFindingsAreActionable, deriveStatus, DOCUMENT_REVIEW_OWNER,
  PREPARATION_STATUS_MEANING, type DocumentFinding,
} from "./documentReview";
import {
  guardCredibilityReport, checkNoScriptedAnswers, checkUniversityModeAvoidsImmigration,
  deriveReadiness, MODE_OWNER, CONTRADICTION_OWNER, READINESS_MEANING,
  MIN_FOLLOW_UP_QUESTIONS, MAX_FOLLOW_UP_QUESTIONS,
  type Contradiction, type MissingInformation, type WeakArea,
} from "./credibilityReview";
import { listWorkers } from "../workforce/registry";
import { evaluateStaffPortalExecutionPermission } from "../workforce/permissions";

const finding = (over: Partial<DocumentFinding> = {}): DocumentFinding => ({
  kind: "employment_gap",
  found: "The CV shows employment ending March 2023 and the next entry beginning January 2024.",
  whyClarificationMayBeRequired: "Ten months are unaccounted for between the two entries.",
  questionForCounsellor: "What were you doing between March 2023 and January 2024?",
  source: "cv",
  ...over,
});

describe("the activity belongs to an approved worker, and no new worker was created", () => {
  it("Grace owns the document review and is authorised to execute", () => {
    expect(DOCUMENT_REVIEW_OWNER).toBe("grace");
    const grace = listWorkers().find(w => w.id === "grace");
    expect(grace).toBeDefined();
    expect(evaluateStaffPortalExecutionPermission("grace").allowed).toBe(true);
    // Her remit is exactly this: audit for defects and contradictions,
    // reporting to a human, never becoming the case owner.
    expect(grace!.roleTitle).toMatch(/quality assurance|audit/i);
  });

  it("the credibility modes are owned by existing approved workers", () => {
    expect(MODE_OWNER.university_admissions).toBe("james");
    expect(MODE_OWNER.ukvi_credibility).toBe("priya");
    expect(CONTRADICTION_OWNER).toBe("grace");
    for (const id of [MODE_OWNER.university_admissions, MODE_OWNER.ukvi_credibility, CONTRADICTION_OWNER]) {
      expect(evaluateStaffPortalExecutionPermission(id as never).allowed).toBe(true);
    }
  });

  it("introduces no worker the Register does not already carry", () => {
    const ids = new Set(listWorkers().map(w => w.id));
    for (const id of [DOCUMENT_REVIEW_OWNER, CONTRADICTION_OWNER, ...Object.values(MODE_OWNER)]) {
      expect(ids.has(id as never)).toBe(true);
    }
  });
});

describe("the review may not invent an explanation", () => {
  /**
   * The single most important guard. The value of the review is telling a
   * counsellor what to ask; supplying the answer destroys it, and does so
   * most convincingly when the invented reason sounds sympathetic.
   */
  it.each([
    "There is a gap from March to December, probably travelling.",
    "This period was likely caring for a family member.",
    "The student was presumably studying independently.",
    "This gap can be explained by the pandemic.",
    "A break of this length is not unusual for applicants from this region.",
  ])("refuses an invented explanation: %s", text => {
    expect(checkNoInventedExplanation(text).ok).toBe(false);
  });

  it("allows a plain observation and a question", () => {
    const text =
      "The CV shows employment ending in March 2023 and the next entry beginning in January 2024. " +
      "Ten months are unaccounted for. Ask the student what they were doing during that period.";
    expect(checkNoInventedExplanation(text).ok).toBe(true);
  });
});

describe("the review may not predict an outcome", () => {
  it.each([
    "On this evidence the application will be refused.",
    "The student is likely to be granted the visa.",
    "They would pass the credibility interview comfortably.",
    "There is a good chance of admission.",
  ])("refuses an outcome prediction: %s", text => {
    expect(checkNoOutcomePrediction(text).ok).toBe(false);
  });

  it("allows a preparation status stated as what it is", () => {
    expect(checkNoOutcomePrediction(
      "Preparation status: Significant Gaps or Inconsistencies. Two periods need clarification before the case is discussed.",
    ).ok).toBe(true);
  });

  it("says on every report that the status is not a prediction", () => {
    expect(PREPARATION_STATUS_MEANING).toMatch(/not a prediction/i);
    expect(READINESS_MEANING).toMatch(/not a prediction/i);
  });
});

describe("the submitted record is never silently rewritten", () => {
  it.each([
    "I have corrected the dates in the CV.",
    "The personal statement has been amended to match.",
    "The CV now reads January 2024.",
  ])("refuses a description of editing the record: %s", text => {
    expect(checkRecordNotRewritten(text).ok).toBe(false);
  });

  it("allows flagging a genuine error for the authorised process", () => {
    const text =
      "The CV gives a graduation year of 2021 and the personal statement gives 2020. " +
      "If one is wrong this needs formal correction through admissions rather than an edit here.";
    expect(checkRecordNotRewritten(text).ok).toBe(true);
  });
});

describe("findings must be actionable, and the status must follow them", () => {
  it("refuses a finding with no question for the counsellor", () => {
    expect(checkFindingsAreActionable([finding({ questionForCounsellor: "" })]).ok).toBe(false);
  });

  it("refuses a finding with no stated reason for clarification", () => {
    expect(checkFindingsAreActionable([finding({ whyClarificationMayBeRequired: "" })]).ok).toBe(false);
  });

  it("accepts a complete finding", () => {
    expect(checkFindingsAreActionable([finding()]).ok).toBe(true);
  });

  it("derives the status from the findings so the two cannot disagree", () => {
    expect(deriveStatus([])).toBe("clear");
    expect(deriveStatus([finding({ kind: "requires_clarification" })])).toBe("minor_clarification_needed");
    expect(deriveStatus([finding({ kind: "employment_gap" }), finding({ kind: "date_inconsistency" })]))
      .toBe("significant_gaps");
  });
});

describe("university and UKVI reviews are distinct, not one process", () => {
  /**
   * The item 5 boundary. University mode produces NO immigration
   * interpretation at all, which is a stronger position than producing one
   * carefully, because there is nothing to get wrong.
   */
  it.each([
    "The student should be ready for the UKVI credibility interview.",
    "Their maintenance funds may be questioned.",
    "This could affect the CAS.",
    "The Home Office will look closely at this gap.",
  ])("refuses immigration content in a university review: %s", text => {
    expect(checkUniversityModeAvoidsImmigration(text).ok).toBe(false);
    expect(guardCredibilityReport(text, "university_admissions").ok).toBe(false);
  });

  it("allows admissions preparation in a university review", () => {
    const text =
      "The student cannot yet explain why this course rather than the two others they applied to. " +
      "Ask them what specifically drew them to this module structure.";
    expect(guardCredibilityReport(text, "university_admissions").ok).toBe(true);
  });

  it("names which check refused, so a withheld report is explainable", () => {
    const result = guardCredibilityReport("The Home Office will refuse this.", "university_admissions");
    expect(result.ok).toBe(false);
    expect(result.failed.length).toBeGreaterThan(0);
  });
});

describe("UKVI mode is bound by Priya's approved limits, using her own checks", () => {
  it("refuses a determination about this student", () => {
    const result = guardCredibilityReport(
      "The applicant is eligible for the student route on these funds.",
      "ukvi_credibility",
    );
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("regulated advice in UKVI mode");
  });

  it("refuses advising the student on a course of action", () => {
    expect(guardCredibilityReport("They should apply before the deadline to be safe.", "ukvi_credibility").ok)
      .toBe(false);
  });

  it("refuses a rule stated without its official source and date", () => {
    const result = guardCredibilityReport(
      "The maintenance requirement is 1,334 pounds per month.",
      "ukvi_credibility",
    );
    expect(result.ok).toBe(false);
    expect(result.failed).toContain("immigration rule stated without its source and date");
  });

  it("allows a sourced, dated rule statement with no determination", () => {
    const text =
      "Ask the student to confirm which figures they relied on. " +
      "According to the published Home Office guidance checked on 1 September 2026, the maintenance " +
      "requirement is set out in the Immigration Rules appendix.";
    expect(guardCredibilityReport(text, "ukvi_credibility").ok).toBe(true);
  });
});

describe("the review prepares the student to understand, not to recite", () => {
  it.each([
    'Tell them to say: "I chose this university for its research reputation."',
    "You should say that the gap was for family reasons.",
    "Suggested answer: the course structure matched my goals.",
    "Rehearse this answer before the interview.",
  ])("refuses a scripted answer: %s", text => {
    expect(checkNoScriptedAnswers(text).ok).toBe(false);
  });

  it("allows naming what the student needs to understand", () => {
    const text =
      "The student needs to understand why this university rather than the two alternatives they named. " +
      "They cannot currently describe the course content beyond the title.";
    expect(checkNoScriptedAnswers(text).ok).toBe(true);
  });

  it("asks for 15 to 20 personalised follow-up questions", () => {
    expect(MIN_FOLLOW_UP_QUESTIONS).toBe(15);
    expect(MAX_FOLLOW_UP_QUESTIONS).toBe(20);
  });
});

describe("GREEN, AMBER and RED are preparation statuses only", () => {
  it.each([
    "AMBER means they will probably pass.",
    "GREEN indicates a high chance of approval.",
    "RED means the visa will be refused.",
  ])("refuses a status presented as a forecast: %s", text => {
    expect(guardCredibilityReport(text, "university_admissions").ok).toBe(false);
  });

  it("derives readiness from the findings", () => {
    const contradiction = (): Contradiction => ({
      kind: "different_dates",
      applicationRecordSays: "Graduated 2021",
      educationDnaSays: "Graduated 2020",
      whyItMatters: "The two accounts of the same qualification disagree.",
      questionForCounsellor: "Which year did you graduate, and can you evidence it?",
    });
    const missing = (): MissingInformation => ({
      what: "Employment dates for 2023",
      whyItIsNeeded: "The period is unaccounted for in both documents.",
      requiredFromStudent: true,
    });
    const weak = (risk: "high" | "medium" | "low"): WeakArea => ({
      kind: "weak_course_knowledge",
      observation: "Cannot describe the course beyond its title.",
      risk,
      whatTheStudentNeedsToUnderstand: "The core modules and why they chose them.",
    });

    expect(deriveReadiness([], [], [])).toBe("green");
    expect(deriveReadiness([], [missing()], [])).toBe("amber");
    expect(deriveReadiness([contradiction()], [], [])).toBe("amber");
    expect(deriveReadiness([contradiction(), contradiction()], [], [])).toBe("red");
    expect(deriveReadiness([], [], [weak("high"), weak("high")])).toBe("red");
  });
});

describe("missing information is flagged, never filled in", () => {
  it("carries an explicit required-from-student marker in the data itself", () => {
    const missing: MissingInformation = {
      what: "What the student did between March 2023 and January 2024",
      whyItIsNeeded: "Neither document accounts for the period.",
      requiredFromStudent: true,
    };
    expect(missing.requiredFromStudent).toBe(true);
    // The type forbids false, so this cannot be turned off by assignment.
    const source = readFileSync(path.resolve(import.meta.dirname, "./credibilityReview.ts"), "utf8");
    expect(source).toContain("requiredFromStudent: true");
    expect(source).toContain("factCheckRequired: true");
  });
});
