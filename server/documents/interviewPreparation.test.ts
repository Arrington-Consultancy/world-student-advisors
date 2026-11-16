import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("../access/enforcement", () => ({ checkAccessForStaffUser: vi.fn(async () => ({ allowed: true, reason: "test" })) }));

import { invokeLLM } from "../_core/llm";
import { checkAccessForStaffUser } from "../access/enforcement";
import {
  INTERVIEW_KIND_DEFINITIONS, extractDocumentText, guardInterviewOutput, interviewKind, prepareInterview,
  PREPARATION_WITHHELD_NOTICE, type SuppliedDocument,
} from "./interviewPreparation";
import { clearAuditLog, getAuditLog } from "../workforce/audit";

const CV = "Ada Test. BSc Human Physiology, University of Lagos, 2019 to 2023. Healthcare Assistant at Lagos General Hospital from January 2024, monitoring vital signs and supporting nurses. Volunteer at a community clinic in 2023.";
const PS = "I am applying for the MA Nursing (Adult) at the University of Salford because my physiology degree and my work as a healthcare assistant have shown me that I want to become a Registered Adult Nurse. I considered Portsmouth and Lincoln. Salford's simulation facilities and placement partnerships decided it.";
const RIQ = "Q: Which other universities did you consider? A: I can't disclose the other universities. Q: What are the modules? A: Adult Nursing Practice, Clinical Skills and Practice, Evidence-Based Nursing Practice. Q: What is your career plan? A: To return to Nigeria as a Registered Adult Nurse and open a care home.";

const docs: SuppliedDocument[] = [
  { role: "cv", text: CV },
  { role: "personal_statement", text: PS },
  { role: "riq", text: RIQ },
];

const FINDINGS = JSON.stringify({
  contradictions: [{ kind: "different_explanation_university_choice", detail: "The Personal Statement names Portsmouth and Lincoln; the RIQ says the other universities cannot be disclosed." }],
  weakAreas: [{ kind: "weak_course_knowledge", detail: "Module titles are listed without what they cover.", risk: "high" }],
  missingInformation: [{ kind: "career_path", detail: "Where the student intends to work immediately after qualifying." }],
});
const STUDENT =
  "PREPARATION FOR YOUR WSA MOCK INTERVIEW\n\nAda, your Personal Statement names Portsmouth and Lincoln but your RIQ says you cannot disclose the other universities. You must be able to say which universities you compared and what you compared. You list module titles without saying what they cover; go back to the current Salford course page and be able to explain at least three modules. Verify any ranking you intend to mention against the published table and its year, and be ready to say where it came from.\n\nBefore your mock interview you must be able to explain without notes\nYour exact course title; three modules in detail; your career path; why Salford; how you compared Portsmouth and Lincoln.";
const INTERVIEWER =
  "CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE\n\nPrincipal credibility risks: the university comparison contradiction; thin course knowledge.\n\nAREA: Other universities considered\nQUESTION: Which other universities did you consider and how did you compare them?\nWHAT I AM TESTING: consistency with the Personal Statement.\nEXPECTED CONTENT: Portsmouth and Lincoln, and the factors compared.\nFOLLOW UP / PROBE QUESTIONS: What did Portsmouth offer that Salford did not?\nRED FLAGS: refusing to name them.\nDOCUMENT CROSS CHECK: Personal Statement paragraph 3 against RIQ answer 1.\n\nAssessment framework: naturalness, depth of knowledge, evidence of research, personal credibility, consistency, rehearsal risk, AI or stock-answer risk, failure to answer. Threshold 85 out of 100, scored only after the live mock interview.";
const SCRIPTED = 'You should say "I chose Salford for its simulation suite". Before your mock interview you must be able to explain without notes: your course.';

type Reply = string | { content: string; finish: string };
function modelReplies(...replies: Reply[]) {
  const fn = vi.mocked(invokeLLM);
  fn.mockReset();
  for (const r of replies) {
    const content = typeof r === "string" ? r : r.content;
    const finish = typeof r === "string" ? "stop" : r.finish;
    fn.mockResolvedValueOnce({ choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finish }] });
  }
}
function lastUserMessage(callIndex: number): string {
  const msgs = vi.mocked(invokeLLM).mock.calls[callIndex][0].messages;
  return [...msgs].reverse().find(m => m.role === "user")?.content ?? "";
}

beforeEach(() => {
  clearAuditLog();
  vi.mocked(checkAccessForStaffUser).mockResolvedValue({ allowed: true, reason: "test" } as never);
});

describe("the three interview types and who owns them", () => {
  it("James owns the university's own interviews; Priya owns UKVI; no new worker", () => {
    expect(INTERVIEW_KIND_DEFINITIONS.map(k => [k.id, k.owner])).toEqual([
      ["university_course_credibility", "james"],
      ["university_cas", "james"],
      ["ukvi_credibility", "priya"],
    ]);
    expect(interviewKind("university_course_credibility").guardSet).toBe("university");
    expect(interviewKind("university_cas").guardSet).toBe("immigration_bounded");
    expect(interviewKind("ukvi_credibility").guardSet).toBe("immigration_bounded");
  });
});

describe("reading the documents", () => {
  it("reads pasted text, a text file and a Word file; refuses anything else and anything too short", async () => {
    const pasted = await extractDocumentText({ role: "cv", text: CV });
    expect(pasted.source).toBe("pasted");
    const txt = await extractDocumentText({ role: "cv", filename: "Ada Test - CV.txt", contentBase64: Buffer.from(CV).toString("base64") });
    expect(txt.source).toBe("text");
    expect(txt.text).toContain("Human Physiology");
    const docx = readFileSync(join(__dirname, "fixtures", "cv-sample.docx")).toString("base64");
    const word = await extractDocumentText({ role: "cv", filename: "Ada Test - CV.docx", contentBase64: docx });
    expect(word.source).toBe("docx");
    expect(word.text).toContain("Healthcare Assistant");
    await expect(extractDocumentText({ role: "riq", filename: "riq.xlsx", contentBase64: Buffer.from("x".repeat(200)).toString("base64") })).rejects.toThrow(/not a PDF, Word/);
    await expect(extractDocumentText({ role: "riq", filename: "riq.txt", contentBase64: Buffer.from("too short").toString("base64") })).rejects.toThrow(/only 9 characters/);
    await expect(extractDocumentText({ role: "riq" })).rejects.toThrow(/no file and no text/);
  });
});

describe("the guards on both documents", () => {
  it("a university course review may carry no immigration content; a UKVI review may, within Priya's scope", () => {
    const text = "Be ready to explain your choice of course. Questions about the visa belong with Priya.";
    expect(guardInterviewOutput(text, "university_course_credibility").ok).toBe(false);
    expect(guardInterviewOutput("Be ready to explain your choice of course.", "university_course_credibility").ok).toBe(true);
    expect(guardInterviewOutput("Be ready to explain how you will fund the course; the CAS interview will ask.", "university_cas").ok).toBe(true);
  });
  it("in the immigration-bounded modes a rule about the visa needs its source; an instruction to the student does not", () => {
    const heading = "Before your mock interview you must be able to explain without notes";
    expect(guardInterviewOutput(heading, "ukvi_credibility").ok).toBe(true);
    expect(guardInterviewOutput("You must be able to explain your career path.", "university_cas").ok).toBe(true);
    const unsourced = guardInterviewOutput("You must show maintenance funds of a set amount for the visa.", "ukvi_credibility");
    expect(unsourced.failed).toContain("immigration rule stated without its source and date");
    const sourced = guardInterviewOutput(
      "The Immigration Rules Appendix Student require maintenance funds to be held for 28 days (GOV.UK, Appendix Student, checked 18 September 2026).",
      "ukvi_credibility",
    );
    expect(sourced.failed).not.toContain("immigration rule stated without its source and date");
  });
  it("no document may script an answer, predict an outcome, invent an explanation or rewrite the record", () => {
    expect(guardInterviewOutput('You should say "I chose Salford for its simulation suite".', "ukvi_credibility").failed).toContain("scripted answer");
    expect(guardInterviewOutput("With this preparation you will be granted the visa.", "ukvi_credibility").failed).toContain("outcome prediction");
    expect(guardInterviewOutput("The gap in 2023 is quite normal for applicants from Nigeria.", "university_course_credibility").failed).toContain("invented explanation");
    expect(guardInterviewOutput("I have corrected the CV so the dates now align.", "university_course_credibility").failed).toContain("record rewritten");
  });
});

describe("preparing the two documents", () => {
  const base = { staffUserId: 1, authMethod: "entra_sso" as const, studentName: "Ada Test", documents: docs };

  it("three tasks in one conversation: findings as JSON, then each document as text under the owning worker; status derived; nothing of the documents stored; audited", async () => {
    modelReplies(FINDINGS, STUDENT, INTERVIEWER);
    const result = await prepareInterview({ ...base, kind: "university_course_credibility" });
    expect(result.outcome).toBe("prepared");
    expect(result.owner).toBe("james");
    expect(result.ownerName).toBe("James");
    expect(result.status).toBe("amber");
    expect(result.studentPreparationFeedback).toContain("Before your mock interview you must be able to explain without notes");
    expect(result.mockInterviewStructure).toContain("FOLLOW UP / PROBE QUESTIONS");
    expect(result.counts).toEqual({ contradictions: 1, weakAreas: 1, missingInformation: 1 });
    expect(result.documents.map(d => d.role)).toEqual(["cv", "personal_statement", "riq"]);
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(3);
    const first = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(first.messages[0].content).toContain("YOUR REMIT");
    expect(first.messages[0].content).toContain("Admissions, Application and Pre-arrival");
    expect(first.messages[1].content).toContain("===== CV");
    expect(first.messages[1].content).toContain("University Course Credibility Interview");
    expect(first.messages[1].content).toContain("no web access");
    expect(first.messages[1].content).toContain("TASK 1 OF 3");
    expect(lastUserMessage(1)).toContain("TASK 2 OF 3");
    expect(lastUserMessage(2)).toContain("TASK 3 OF 3");
    // The findings travel into the later tasks, so the documents build on the same analysis.
    expect(lastUserMessage(2)).toContain("Portsmouth and Lincoln");
    const audit = getAuditLog();
    expect(audit).toHaveLength(1);
    expect(audit[0].workerId).toBe("james");
    expect(audit[0].requestedCapability).toBe("interview_preparation:university_course_credibility");
    expect(audit[0].success).toBe(true);
    expect(JSON.stringify(audit[0])).not.toContain("Human Physiology");
  });

  it("the UKVI interview runs under Priya", async () => {
    modelReplies(FINDINGS, STUDENT, INTERVIEWER);
    const result = await prepareInterview({ ...base, kind: "ukvi_credibility" });
    expect(result.outcome).toBe("prepared");
    expect(result.owner).toBe("priya");
    const first = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(first.messages[0].content).toContain("Visa");
    expect(first.messages[1].content).toContain("Immigration is engaged");
  });

  it("a scripted answer is put back to the model once, and both documents are withheld if it survives", async () => {
    modelReplies(FINDINGS, SCRIPTED, STUDENT, INTERVIEWER);
    const fixed = await prepareInterview({ ...base, kind: "university_course_credibility" });
    expect(fixed.outcome).toBe("prepared");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(4);
    expect(lastUserMessage(2)).toContain("scripted answer");

    modelReplies(FINDINGS, SCRIPTED, SCRIPTED);
    const withheld = await prepareInterview({ ...base, kind: "university_course_credibility" });
    expect(withheld.outcome).toBe("withheld");
    expect(withheld.studentPreparationFeedback).toBeNull();
    expect(withheld.mockInterviewStructure).toBeNull();
    expect(withheld.reason).toBe(PREPARATION_WITHHELD_NOTICE);
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(3);
    expect(getAuditLog().at(-1)?.success).toBe(false);
  });

  it("a document cut off at the length limit is asked for again, more concisely", async () => {
    modelReplies(FINDINGS, { content: STUDENT.slice(0, 200), finish: "length" }, STUDENT, INTERVIEWER);
    const result = await prepareInterview({ ...base, kind: "university_course_credibility" });
    expect(result.outcome).toBe("prepared");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(4);
    expect(lastUserMessage(2)).toContain("cut off at the length limit");
    expect(result.studentPreparationFeedback).toContain("Before your mock interview");
  });

  it("refuses before any model call when the staff member cannot reach the owning worker, or a document is missing", async () => {
    vi.mocked(checkAccessForStaffUser).mockResolvedValueOnce({ allowed: false, reason: "No assignment." } as never);
    modelReplies(FINDINGS, STUDENT, INTERVIEWER);
    const refused = await prepareInterview({ ...base, staffUserId: 9, kind: "university_course_credibility" });
    expect(refused.outcome).toBe("refused_staff_access");
    expect(vi.mocked(invokeLLM)).not.toHaveBeenCalled();

    const missing = await prepareInterview({ ...base, kind: "university_course_credibility", documents: docs.slice(0, 2) });
    expect(missing.outcome).toBe("documents_unreadable");
    expect(missing.reason).toContain("RIQ");
    expect(vi.mocked(invokeLLM)).not.toHaveBeenCalled();
  });

  it("findings that are not the JSON object are asked for again; twice, and the run is withheld", async () => {
    modelReplies("Here are my thoughts in prose.", FINDINGS, STUDENT, INTERVIEWER);
    const result = await prepareInterview({ ...base, kind: "university_cas" });
    expect(result.outcome).toBe("prepared");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(4);

    modelReplies("prose", "more prose");
    const withheld = await prepareInterview({ ...base, kind: "university_cas" });
    expect(withheld.outcome).toBe("withheld");
    expect(withheld.reason).toContain("findings could not be read");
  });
});
