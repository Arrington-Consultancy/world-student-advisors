import { describe, expect, it } from "vitest";
import {
  PREPARATION_CHECKLIST_HEADING,
  blockText,
  parseInterviewDocument,
  type InterviewBlock,
} from "./interviewDocumentStructure";

/**
 * The fixtures below are lifted verbatim from the two documents production
 * produced for the fictional student Ada Okonkwo-Test, harness run
 * 35330725418 on the deployed build (18 September 2026, University CAS
 * Interview, owned by James). If the worker's output shape changes, these
 * tests are what notices.
 */

const STUDENT_FEEDBACK = `PREPARATION FOR YOUR WSA MOCK INTERVIEW

Dear Ada,

This note sets out what you need to research, clarify or prepare before your mock interview. Please work through each one and bring your own answers, not memorised lines, to the mock session.

1. Your career plan needs one consistent version

Your Personal Statement says that after qualifying you intend to "gain experience in an acute hospital setting and later specialise in older adult care," with no country stated. These are not the same plan.

7. Two gaps in your account that will likely come up

Your CV shows volunteering ending in August 2022 and your Healthcare Assistant role starting in January 2023, with your degree finishing in July 2022.

${PREPARATION_CHECKLIST_HEADING}

- One consistent career plan: what you will do immediately after qualifying, where, and how the later care home ambition fits in.
- Why this specific course suits you, linked to your physiology degree and your Healthcare Assistant experience.
- A plain explanation of the July 2022 to January 2023 gap on your CV.

Please work through these points and bring your own answers to the mock interview.`;

const INTERVIEWER_STRUCTURE = `CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE

Student: Ada Okonkwo-Test
Course: MA Nursing (Adult), University of Salford
Purpose: Mock preparation for the university's CAS compliance interview
Interviewer note: This document is for WSA staff conducting the mock interview. Do not share the risk commentary or red flag notes with the student.

PRINCIPAL CREDIBILITY RISKS, IN ORDER

1. Career plan inconsistency between documents. The Personal Statement describes acute hospital experience followed by later specialisation in older adult care, with no country stated. RIQ Q6 introduces a return to Nigeria.

2. Other universities considered: direct contradiction. The Personal Statement names Portsmouth and Lincoln; the RIQ answer refuses to disclose them.

AREA 1: CAREER PLAN CONSISTENCY

QUESTION: You've told us that after qualifying you plan to gain acute hospital experience and later specialise in older adult care. Talk me through this plan, in order.

WHAT I AM TESTING: Whether the student has one genuine, settled plan for her nursing career.

EXPECTED CONTENT: The student's own account, reconciled into a single account in her own words.

FOLLOW UP / PROBE QUESTIONS:
- Where does the acute hospital experience happen, in the UK or in Nigeria?
- When, roughly, do you expect to return to Nigeria?

RED FLAGS: Hesitation or a visibly different answer from either document.

DOCUMENT CROSS CHECK: Personal Statement ("gain experience in an acute hospital setting") against RIQ Q6 ("return to Nigeria as a Registered Adult Nurse").

WSA MOCK INTERVIEW ASSESSMENT FRAMEWORK

Assess the candidate across the following dimensions during and after the live mock interview:

- Naturalness: does the answer sound like the student's own thinking, or does it sound recited.
- Consistency: do the answers given in the live interview match what is written across the CV, Personal Statement and RIQ.

The readiness threshold for this student is 85 out of 100. This score is not given here and must be produced only after the live mock interview.`;

function texts(blocks: InterviewBlock[], type: InterviewBlock["type"]): string[] {
  return blocks.filter(b => b.type === type).map(blockText);
}

describe("the Student Preparation Feedback", () => {
  const blocks = parseInterviewDocument(STUDENT_FEEDBACK);

  it("takes its own first line as the title, once", () => {
    expect(blocks[0]).toEqual({ type: "title", text: "PREPARATION FOR YOUR WSA MOCK INTERVIEW" });
    expect(blocks.filter(b => b.type === "title")).toHaveLength(1);
  });

  it("reads the numbered areas as headings", () => {
    expect(texts(blocks, "heading")).toContain("1. Your career plan needs one consistent version");
    expect(texts(blocks, "heading")).toContain("7. Two gaps in your account that will likely come up");
  });

  it("reads the required closing checklist heading as a heading", () => {
    expect(texts(blocks, "heading")).toContain(PREPARATION_CHECKLIST_HEADING);
  });

  it("reads the checklist items as bullets, without their dashes", () => {
    const bullets = texts(blocks, "bullet");
    expect(bullets).toHaveLength(3);
    expect(bullets[2]).toBe("A plain explanation of the July 2022 to January 2023 gap on your CV.");
    expect(bullets.every(b => !b.startsWith("-"))).toBe(true);
  });

  it("leaves the salutation and the prose as paragraphs", () => {
    expect(texts(blocks, "paragraph")).toContain("Dear Ada,");
    expect(texts(blocks, "paragraph").some(p => p.startsWith("Your Personal Statement says"))).toBe(true);
  });
});

describe("the WSA Mock Interview Structure", () => {
  const blocks = parseInterviewDocument(INTERVIEWER_STRUCTURE);

  it("reads the front matter as labelled lines", () => {
    const labelled = blocks.filter(b => b.type === "labelled");
    expect(labelled.map(b => b.type === "labelled" && b.label)).toEqual(
      expect.arrayContaining(["Student", "Course", "Purpose", "Interviewer note"]),
    );
    const student = labelled.find(b => b.type === "labelled" && b.label === "Student");
    expect(student).toEqual({ type: "labelled", label: "Student", text: "Ada Okonkwo-Test" });
  });

  it("reads a whole line in capitals as a heading, colon and all", () => {
    const headings = texts(blocks, "heading");
    expect(headings).toContain("AREA 1: CAREER PLAN CONSISTENCY");
    expect(headings).toContain("PRINCIPAL CREDIBILITY RISKS, IN ORDER");
    expect(headings).toContain("WSA MOCK INTERVIEW ASSESSMENT FRAMEWORK");
  });

  it("reads the six interviewer labels as labelled paragraphs, not headings", () => {
    const labels = blocks.filter(b => b.type === "labelled").map(b => (b.type === "labelled" ? b.label : ""));
    for (const label of ["QUESTION", "WHAT I AM TESTING", "EXPECTED CONTENT", "RED FLAGS", "DOCUMENT CROSS CHECK"]) {
      expect(labels).toContain(label);
    }
    expect(texts(blocks, "heading").some(h => h.startsWith("QUESTION"))).toBe(false);
  });

  it("reads a capitalised label with nothing after it as a label, not a heading", () => {
    const followUp = blocks.find(b => b.type === "labelled" && b.label === "FOLLOW UP / PROBE QUESTIONS");
    expect(followUp).toEqual({ type: "labelled", label: "FOLLOW UP / PROBE QUESTIONS", text: "" });
  });

  it("keeps a long numbered risk as a paragraph, not a heading", () => {
    const paragraphs = texts(blocks, "paragraph");
    expect(paragraphs.some(p => p.startsWith("1. Career plan inconsistency between documents."))).toBe(true);
    expect(paragraphs.some(p => p.startsWith("2. Other universities considered:"))).toBe(true);
    expect(texts(blocks, "heading").some(h => h.startsWith("1. Career plan"))).toBe(false);
  });

  it("keeps the threshold sentence as prose, so no score is implied", () => {
    expect(texts(blocks, "paragraph").some(p => p.includes("85 out of 100"))).toBe(true);
  });
});

describe("in every case", () => {
  it("keeps every non-blank line exactly once, in order", () => {
    for (const source of [STUDENT_FEEDBACK, INTERVIEWER_STRUCTURE]) {
      const lines = source.split("\n").map(l => l.trim()).filter(l => l !== "");
      const blocks = parseInterviewDocument(source);
      expect(blocks).toHaveLength(lines.length);
      blocks.forEach((block, i) => {
        // A bullet drops its dash and nothing else; every other block keeps
        // its line whole.
        const expected = block.type === "bullet" ? lines[i].replace(/^[-–—][ \t]+/, "") : lines[i];
        expect(blockText(block)).toBe(expected);
      });
    }
  });

  it("invents nothing for an empty document", () => {
    expect(parseInterviewDocument("")).toEqual([]);
    expect(parseInterviewDocument("\n\n   \n")).toEqual([]);
  });

  it("does not mistake an ordinary sentence carrying a colon for a label", () => {
    const blocks = parseInterviewDocument("Dear Ada,\nThere is one thing to settle: which plan is the real one.");
    expect(blocks[1]).toEqual({
      type: "paragraph",
      text: "There is one thing to settle: which plan is the real one.",
    });
  });
});
