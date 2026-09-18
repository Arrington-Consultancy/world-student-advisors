import { describe, expect, it } from "vitest";
import { interviewDocxBlob } from "@/lib/interviewDocx";
import { PREPARATION_CHECKLIST_HEADING } from "./interviewDocumentStructure";

/**
 * The Word file a staff member downloads. Built here from the same text
 * production produced, and opened back up as a zip so the test can say what
 * is actually inside it rather than that a function returned something.
 */

const FEEDBACK = `PREPARATION FOR YOUR WSA MOCK INTERVIEW

Dear Ada,

This note sets out what you need to prepare before your mock interview.

1. Your career plan needs one consistent version

Your Personal Statement and your RIQ do not describe the same plan.

${PREPARATION_CHECKLIST_HEADING}

- One consistent career plan, stated the same way every time.
- A plain explanation of the July 2022 to January 2023 gap on your CV.`;

const STRUCTURE = `CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE

Student: Ada Okonkwo-Test
Course: MA Nursing (Adult), University of Salford

AREA 1: CAREER PLAN CONSISTENCY

QUESTION: Talk me through this plan, in order.

RED FLAGS: Hesitation or a visibly different answer from either document.`;

/** The text of every w:t node in a part of the file, in order. */
async function partText(blob: Blob, match: (name: string) => boolean): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const names = Object.keys(zip.files).filter(match);
  const parts: string[] = [];
  for (const name of names) {
    const xml = await zip.file(name)!.async("string");
    parts.push([...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join("\n"));
  }
  return parts.join("\n");
}

/** The body of the document. */
const documentText = (blob: Blob) => partText(blob, n => n === "word/document.xml");

/** The page footer, which Word keeps in its own part. */
const footerText = (blob: Blob) => partText(blob, n => /^word\/footer\d*\.xml$/.test(n));

async function entries(blob: Blob): Promise<string[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  return Object.keys(zip.files);
}

describe("the Word download", () => {
  it("produces a real Word file with the parts Word expects", async () => {
    const blob = await interviewDocxBlob({
      text: FEEDBACK,
      documentName: "Student Preparation Feedback",
      studentName: "Ada Okonkwo-Test",
      interviewName: "University CAS Interview",
      confidential: false,
    });

    expect(blob.size).toBeGreaterThan(2000);
    const names = await entries(blob);
    expect(names).toContain("word/document.xml");
    expect(names).toContain("[Content_Types].xml");
    expect(names).toContain("word/numbering.xml");
  });

  it("carries every line of the worker's text, and adds no advice of its own", async () => {
    const blob = await interviewDocxBlob({
      text: FEEDBACK,
      documentName: "Student Preparation Feedback",
      studentName: "Ada Okonkwo-Test",
      interviewName: "University CAS Interview",
      confidential: false,
    });
    const text = await documentText(blob);

    for (const line of FEEDBACK.split("\n").map(l => l.replace(/^- /, "").trim()).filter(Boolean)) {
      expect(text).toContain(line);
    }
    // The only additions are the subtitle and the footer, both of which name
    // the document rather than saying anything about the student.
    expect(text).toContain("University CAS Interview");
    expect(await footerText(blob)).toContain("Student Preparation Feedback for Ada Okonkwo-Test");
  });

  it("marks the interviewer's copy confidential and the student's copy not", async () => {
    const forInterviewer = await documentText(
      await interviewDocxBlob({
        text: STRUCTURE,
        documentName: "WSA Mock Interview Structure",
        studentName: "Ada Okonkwo-Test",
        interviewName: "University CAS Interview",
        confidential: true,
      }),
    );
    expect(forInterviewer).toContain("Confidential, for the interviewer only.");

    const forStudent = await documentText(
      await interviewDocxBlob({
        text: FEEDBACK,
        documentName: "Student Preparation Feedback",
        studentName: "Ada Okonkwo-Test",
        interviewName: "University CAS Interview",
        confidential: false,
      }),
    );
    expect(forStudent.toLowerCase()).not.toContain("confidential");
  });

  it("writes the labelled lines with their labels intact", async () => {
    const text = await documentText(
      await interviewDocxBlob({
        text: STRUCTURE,
        documentName: "WSA Mock Interview Structure",
        studentName: "Ada Okonkwo-Test",
        interviewName: "University CAS Interview",
        confidential: true,
      }),
    );
    expect(text).toContain("QUESTION: ");
    expect(text).toContain("Talk me through this plan, in order.");
    // A label introducing a list keeps its colon, exactly as the worker wrote it.
    const withList = await documentText(
      await interviewDocxBlob({
        text: "CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE\n\nFOLLOW UP / PROBE QUESTIONS:\n- Where does the experience happen?",
        documentName: "WSA Mock Interview Structure",
        studentName: "Ada Okonkwo-Test",
        interviewName: "University CAS Interview",
        confidential: true,
      }),
    );
    expect(withList).toContain("FOLLOW UP / PROBE QUESTIONS:");
    expect(text).toContain("Student: ");
    expect(text).toContain("Ada Okonkwo-Test");
  });

  it("produces a file even when the student's name was left blank", async () => {
    const blob = await interviewDocxBlob({
      text: FEEDBACK,
      documentName: "Student Preparation Feedback",
      studentName: "",
      interviewName: "University CAS Interview",
      confidential: false,
    });
    expect(blob.size).toBeGreaterThan(2000);
    expect(await footerText(blob)).toContain("Student Preparation Feedback for Student");
  });
});
