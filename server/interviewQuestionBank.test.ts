import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "./interviewQuestionBank";

describe("Standard AI Interview Coach Question Bank — supplied counts", () => {
  it("has exactly 14 CAS Interview Preparation questions", () => {
    expect(QUESTION_BANK.cas).toHaveLength(14);
  });

  it("has exactly 14 UKVI Credibility Interview Preparation questions", () => {
    expect(QUESTION_BANK.ukvi).toHaveLength(14);
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
