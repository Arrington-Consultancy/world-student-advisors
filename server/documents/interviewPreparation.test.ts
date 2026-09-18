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

function answer(overrides: Partial<Record<string, unknown>> = {}) {
  return JSON.stringify({
    contradictions: [{ kind: "different_explanation_university_choice", detail: "The Personal Statement names Portsmouth and Lincoln; the RIQ says the other universities cannot be disclosed." }],
    weakAreas: [{ kind: "weak_course_knowledge", detail: "Module titles are listed without what they cover.", risk: "high" }],
    missingInformation: [{ kind: "career_path", detail: "Where the student intends to work immediately after qualifying." }],
    studentPreparationFeedback:
      "PREPARATION FOR YOUR WSA MOCK INTERVIEW\n\nAda, your Personal Statement names Portsmouth and Lincoln but your RIQ says you cannot disclose the other universities. You must be able to say which universities you compared and what you compared. You list module titles without saying what they cover; go back to the current Salford course page and be able to explain at least three modules. Verify any ranking you intend to mention against the published table and its year, and be ready to say where it came from.\n\nBefore your mock interview you must be able to explain without notes\nYour exact course title; three modules in detail; your career path; why Salford; how you compared Portsmouth and Lincoln.",
    mockInterviewStructure:
      "CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE\n\nPrincipal credibility risks: the university comparison contradiction; thin course knowledge.\n\nAREA: Other universities considered\nQUESTION: Which other universities did you consider and how did you compare them?\nWHAT I AM TESTING: consistency with the Personal Statement.\nEXPECTED CONTENT: Portsmouth and Lincoln, and the factors compared.\nFOLLOW UP / PROBE QUESTIONS: What did Portsmouth offer that Salford did not?\nRED FLAGS: refusing to name them.\nDOCUMENT CROSS CHECK: Personal Statement paragraph 3 against RIQ answer 1.\n\nAssessment framework: naturalness, depth of knowledge, evidence of research, personal credibility, consistency, rehearsal risk, AI or stock-answer risk, failure to answer. Threshold 85 out of 100, scored only after the live mock interview.",
    ...overrides,
  });
}

function modelReplies(...contents: string[]) {
  const fn = vi.mocked(invokeLLM);
  fn.mockReset();
  for (const c of contents) fn.mockResolvedValueOnce({ choices: [{ index: 0, message: { role: "assistant", content: c }, finish_reason: "stop" }] });
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
  it("produces both documents under the owning worker, derives the readiness status from the findings, stores nothing of the documents and audits the run", async () => {
    modelReplies(answer());
    const result = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "university_course_credibility", studentName: "Ada Test", documents: docs });
    expect(result.outcome).toBe("prepared");
    expect(result.owner).toBe("james");
    expect(result.ownerName).toBe("James");
    expect(result.status).toBe("amber");
    expect(result.studentPreparationFeedback).toContain("Before your mock interview you must be able to explain without notes");
    expect(result.mockInterviewStructure).toContain("FOLLOW UP / PROBE QUESTIONS");
    expect(result.counts).toEqual({ contradictions: 1, weakAreas: 1, missingInformation: 1 });
    expect(result.documents.map(d => d.role)).toEqual(["cv", "personal_statement", "riq"]);
    // The model saw the three documents under James's brief and the task, and nothing about a CRM record.
    const call = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(call.messages[0].content).toContain("YOUR REMIT");
    expect(call.messages[0].content).toContain("Admissions, Application and Pre-arrival");
    expect(call.messages[1].content).toContain("===== CV");
    expect(call.messages[1].content).toContain("University Course Credibility Interview");
    expect(call.messages[1].content).toContain("no web access");
    const audit = getAuditLog();
    expect(audit).toHaveLength(1);
    expect(audit[0].workerId).toBe("james");
    expect(audit[0].requestedCapability).toBe("interview_preparation:university_course_credibility");
    expect(audit[0].success).toBe(true);
    expect(JSON.stringify(audit[0])).not.toContain("Human Physiology");
  });

  it("the UKVI interview runs under Priya", async () => {
    modelReplies(answer());
    const result = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "ukvi_credibility", studentName: "Ada Test", documents: docs });
    expect(result.outcome).toBe("prepared");
    expect(result.owner).toBe("priya");
    expect(vi.mocked(invokeLLM).mock.calls[0][0].messages[0].content).toContain("Visa");
    expect(vi.mocked(invokeLLM).mock.calls[0][0].messages[1].content).toContain("Immigration is engaged");
  });

  it("a scripted answer is put back to the model once, and withheld if it survives", async () => {
    const scripted = answer({ studentPreparationFeedback: 'You should say "I chose Salford for its simulation suite". Before your mock interview you must be able to explain without notes: your course.' });
    modelReplies(scripted, answer());
    const fixed = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "university_course_credibility", studentName: "Ada Test", documents: docs });
    expect(fixed.outcome).toBe("prepared");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invokeLLM).mock.calls[1][0].messages.at(-1)?.content).toContain("scripted answer");

    modelReplies(scripted, scripted);
    const withheld = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "university_course_credibility", studentName: "Ada Test", documents: docs });
    expect(withheld.outcome).toBe("withheld");
    expect(withheld.studentPreparationFeedback).toBeNull();
    expect(withheld.reason).toBe(PREPARATION_WITHHELD_NOTICE);
    expect(getAuditLog().at(-1)?.success).toBe(false);
  });

  it("refuses before any model call when the staff member cannot reach the owning worker, or a document is missing", async () => {
    vi.mocked(checkAccessForStaffUser).mockResolvedValueOnce({ allowed: false, reason: "No assignment." } as never);
    modelReplies(answer());
    const refused = await prepareInterview({ staffUserId: 9, authMethod: "entra_sso", kind: "university_course_credibility", studentName: "Ada Test", documents: docs });
    expect(refused.outcome).toBe("refused_staff_access");
    expect(vi.mocked(invokeLLM)).not.toHaveBeenCalled();

    const missing = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "university_course_credibility", studentName: "Ada Test", documents: docs.slice(0, 2) });
    expect(missing.outcome).toBe("documents_unreadable");
    expect(missing.reason).toContain("RIQ");
    expect(vi.mocked(invokeLLM)).not.toHaveBeenCalled();
  });

  it("a model reply that is not the JSON object is asked for again", async () => {
    modelReplies("Here are my thoughts in prose.", answer());
    const result = await prepareInterview({ staffUserId: 1, authMethod: "entra_sso", kind: "university_cas", studentName: "Ada Test", documents: docs });
    expect(result.outcome).toBe("prepared");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledTimes(2);
  });
});
