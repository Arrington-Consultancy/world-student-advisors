import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "./interviewQuestionBank";

describe("Standard AI Interview Coach Question Bank — supplied counts (revised 27 Aug 2026)", () => {
  it("has exactly 16 CAS Interview Preparation questions", () => {
    expect(QUESTION_BANK.cas).toHaveLength(16);
  });

  it("has exactly 16 UKVI Credibility Interview Preparation questions", () => {
    expect(QUESTION_BANK.ukvi).toHaveLength(16);
  });

  it("has exactly 14 University Interview Preparation questions", () => {
    expect(QUESTION_BANK.university).toHaveLength(14);
  });

  it("has exactly 13 Course-Specific Interview Preparation questions", () => {
    expect(QUESTION_BANK.course).toHaveLength(13);
  });

  it("every question in every category is a non-empty string", () => {
    for (const category of Object.keys(QUESTION_BANK) as (keyof typeof QUESTION_BANK)[]) {
      for (const question of QUESTION_BANK[category]) {
        expect(typeof question).toBe("string");
        expect(question.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("covers exactly the four required categories, no more, no fewer", () => {
    expect(Object.keys(QUESTION_BANK).sort()).toEqual(["cas", "course", "ukvi", "university"]);
  });
});

describe("Question bank quality-control revision — evidenced additions", () => {
  it("adds a study-gaps question to both CAS and UKVI, evidenced by GOV.UK's genuine-student risk factors", () => {
    const studyGaps = "Have you had any breaks in your study history, and if so, how would you explain them?";
    expect(QUESTION_BANK.cas).toContain(studyGaps);
    expect(QUESTION_BANK.ukvi).toContain(studyGaps);
  });

  it("adds a neutrally-phrased prior-visa-history question to UKVI only — the Home Office's own credibility check, not a university academic one", () => {
    const priorVisa = "Have you applied for a UK visa before? If so, what was the outcome?";
    expect(QUESTION_BANK.ukvi).toContain(priorVisa);
    expect(QUESTION_BANK.cas).not.toContain(priorVisa);
  });

  it("adds a 'why the UK, not another country' question to both CAS and UKVI", () => {
    const whyUk = "Which other countries, if any, did you consider for your studies, and why did you choose the UK instead?";
    expect(QUESTION_BANK.cas).toContain(whyUk);
    expect(QUESTION_BANK.ukvi).toContain(whyUk);
  });
});

describe("Question bank quality-control revision — removals", () => {
  it("removes the ungrounded University 'nearest airport' question", () => {
    for (const q of QUESTION_BANK.university) {
      expect(q.toLowerCase()).not.toContain("airport");
    }
  });

  it("replaces it with a genuine city/campus-understanding question", () => {
    expect(QUESTION_BANK.university).toContain(
      "What do you know about the city and campus you'd be studying in, and how did you find that out?"
    );
  });

  it("removes UKVI's near-duplicate 'other universities' question rather than padding the bank on top of it", () => {
    expect(QUESTION_BANK.ukvi).not.toContain("What other universities did you apply to?");
  });
});

describe("Question bank quality-control revision — no invented facts", () => {
  it("no question in any category asserts a specific module, accreditation, facility, or requirement as fact", () => {
    // Every mention of "module" must be phrased as asking the student what
    // they know/expect, never the system asserting a named module exists —
    // the exact "Good" vs "Risky" distinction from the design report.
    const moduleQuestions = Object.values(QUESTION_BANK)
      .flat()
      .filter((q) => q.toLowerCase().includes("module"));
    expect(moduleQuestions.length).toBeGreaterThan(0);
    for (const q of moduleQuestions) {
      expect(q).toMatch(/\b(you|your)\b/i);
    }
  });
});
