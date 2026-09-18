/**
 * Interview preparation from the student's own documents.
 *
 * Tim Hunt to the WSA team, 18 September 2026: mock interviews are not as
 * productive as they could be because the student arrives unprepared. Staff
 * should be able to upload a student's CV, Personal Statement and completed
 * RIQ (Responses to Interview Questions) for one of three interview types
 * and receive two documents: Student Preparation Feedback, sent to the
 * student before the mock interview, and the WSA Mock Interview Structure,
 * for the person conducting it. Tom Arrington asked for it to be set up in
 * the Staff Portal so the team has one consistent process.
 *
 * NO NEW WORKER. This is the credibility review of 1 September 2026
 * (credibilityReview.ts) wired to documents and a screen. Ownership is as
 * that record settled it: James owns preparation for a university's own
 * interviews (course credibility, and the pre-CAS interview); Priya owns
 * the UKVI credibility interview inside her bounded scope; Grace's
 * contradiction and record guards apply to every output.
 *
 * WHAT THE OUTPUT MAY NOT DO, ENFORCED IN CODE. No model answers or scripts
 * for the student to memorise; no explanation invented for a gap; no
 * prediction of an admissions, credibility or visa outcome; no alteration
 * of the submitted record; no ranking, module or fact the documents did not
 * supply. In a university course review no immigration interpretation at
 * all. In the CAS and UKVI reviews, Priya's own scope checks. An output that
 * fails is put back to the model once and withheld if it still fails.
 *
 * THE DOCUMENTS ARE NOT STORED. They are read in memory, the text is sent
 * to the model under the owning worker's brief, and nothing of them is
 * written anywhere. One audit row records who ran the preparation, when,
 * for which interview type, with the readiness status; never the content.
 *
 * NO WEB ACCESS. The workers cannot verify a ranking, module list or course
 * title online (Amelia's web research is unauthorised), so the outputs use
 * only what the student stated, tell the student which published source to
 * check, and never supply a figure. This is stricter than the team's manual
 * ChatGPT method, which did verify rankings, and the record says so.
 */
import { invokeLLM, type Message } from "../_core/llm";
import { getControlledBrief } from "../execution/briefs";
import { composeSystemPrompt } from "../execution/prompt";
import { prepareForRelease } from "../execution/execute";
import { getWorker } from "../workforce/registry";
import { evaluateStaffPortalExecutionPermission } from "../workforce/permissions";
import { checkAccessForStaffUser } from "../access/enforcement";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import { recordAuditEvent, type AuditAuthMethod } from "../workforce/audit";
import { checkPreparationOnly, checkRuleStatementsAreSourced } from "../workforce/priyaScope";
import {
  checkNoInventedExplanation, checkNoOutcomePrediction, checkRecordNotRewritten, type GuardResult,
} from "./documentReview";
import {
  checkNoScriptedAnswers, checkStatusNotPresentedAsOutcome, checkUniversityModeAvoidsImmigration,
  deriveReadiness, READINESS_MEANING, type ReadinessStatus,
} from "./credibilityReview";
import type { WorkerId } from "../workforce/types";

/* ── Interview types ─────────────────────────────────────────────────── */

export type InterviewKind = "university_course_credibility" | "university_cas" | "ukvi_credibility";

export const INTERVIEW_KINDS: readonly InterviewKind[] = ["university_course_credibility", "university_cas", "ukvi_credibility"];

export interface InterviewKindDefinition {
  id: InterviewKind;
  label: string;
  /** Who conducts the real interview and what they are testing. */
  interviewer: string;
  owner: WorkerId;
  /** Which guard set applies to the text. */
  guardSet: "university" | "immigration_bounded";
}

export const INTERVIEW_KIND_DEFINITIONS: readonly InterviewKindDefinition[] = Object.freeze([
  {
    id: "university_course_credibility",
    label: "University Course Credibility Interview",
    interviewer:
      "the university's admissions team, testing whether the student genuinely understands and has chosen the " +
      "course, the university and their career path",
    owner: "james",
    guardSet: "university",
  },
  {
    id: "university_cas",
    label: "University CAS Interview",
    interviewer:
      "the university's compliance team before issuing a Confirmation of Acceptance for Studies, testing " +
      "the same course, university and career credibility that UKVI will test, together with the student's " +
      "readiness to fund and complete the course",
    owner: "james",
    guardSet: "immigration_bounded",
  },
  {
    id: "ukvi_credibility",
    label: "UKVI Credibility Interview",
    interviewer:
      "UK Visas and Immigration, testing whether the student is a genuine student with a credible, consistent " +
      "account of their course, university, career plan and finances",
    owner: "priya",
    guardSet: "immigration_bounded",
  },
]);

export function interviewKind(id: InterviewKind): InterviewKindDefinition {
  const found = INTERVIEW_KIND_DEFINITIONS.find(k => k.id === id);
  if (!found) throw new Error(`Unknown interview kind: ${id}`);
  return found;
}

/* ── Documents ───────────────────────────────────────────────────────── */

export type DocumentRole = "cv" | "personal_statement" | "riq";

export const DOCUMENT_LABEL: Readonly<Record<DocumentRole, string>> = Object.freeze({
  cv: "CV",
  personal_statement: "Personal Statement",
  riq: "RIQ (Responses to Interview Questions)",
});

export interface SuppliedDocument {
  role: DocumentRole;
  /** Either a file (base64) with its name, or text pasted by the staff member. */
  filename?: string;
  contentBase64?: string;
  text?: string;
}

export interface ExtractedDocument {
  role: DocumentRole;
  text: string;
  /** How the text was obtained, for the staff member to see. */
  source: "pdf" | "docx" | "text" | "pasted";
  characters: number;
}

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_CHARACTERS = 60_000;
export const MIN_DOCUMENT_CHARACTERS = 80;

function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Reads one uploaded file to text. Nothing is written to disk; the buffer
 * lives for the length of this call.
 */
export async function extractDocumentText(doc: SuppliedDocument): Promise<ExtractedDocument> {
  if (doc.text !== undefined && doc.text.trim() !== "") {
    const text = doc.text.trim().slice(0, MAX_DOCUMENT_CHARACTERS);
    return { role: doc.role, text, source: "pasted", characters: text.length };
  }
  if (!doc.contentBase64 || !doc.filename) {
    throw new Error(`${DOCUMENT_LABEL[doc.role]}: no file and no text was supplied.`);
  }
  const buffer = Buffer.from(doc.contentBase64, "base64");
  if (buffer.length === 0) throw new Error(`${DOCUMENT_LABEL[doc.role]}: the file is empty.`);
  if (buffer.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`${DOCUMENT_LABEL[doc.role]}: the file is larger than ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.`);
  }
  const ext = extensionOf(doc.filename);
  let text: string;
  let source: ExtractedDocument["source"];
  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default as unknown as (data: Buffer) => Promise<{ text: string }>;
    text = (await pdfParse(buffer)).text;
    source = "pdf";
  } else if (ext === "docx") {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer })).value;
    source = "docx";
  } else if (ext === "txt" || ext === "md") {
    text = buffer.toString("utf8");
    source = "text";
  } else {
    throw new Error(`${DOCUMENT_LABEL[doc.role]}: "${doc.filename}" is not a PDF, Word (.docx) or text file.`);
  }
  const cleaned = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length < MIN_DOCUMENT_CHARACTERS) {
    throw new Error(
      `${DOCUMENT_LABEL[doc.role]}: only ${cleaned.length} characters of text could be read from "${doc.filename}". ` +
        "A scanned PDF has no text layer; paste the text instead.",
    );
  }
  return { role: doc.role, text: cleaned.slice(0, MAX_DOCUMENT_CHARACTERS), source, characters: cleaned.length };
}

/* ── The model's structured answer ───────────────────────────────────── */

interface ModelFinding {
  kind: string;
  detail: string;
  risk?: "high" | "medium" | "low";
}

interface ModelAnswer {
  contradictions: ModelFinding[];
  weakAreas: ModelFinding[];
  missingInformation: ModelFinding[];
  studentPreparationFeedback: string;
  mockInterviewStructure: string;
}

function parseModelAnswer(raw: string): ModelAnswer | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ModelAnswer>;
    if (typeof parsed.studentPreparationFeedback !== "string" || typeof parsed.mockInterviewStructure !== "string") return null;
    const list = (v: unknown): ModelFinding[] =>
      Array.isArray(v) ? v.filter(x => x && typeof x === "object" && typeof (x as ModelFinding).detail === "string") as ModelFinding[] : [];
    return {
      contradictions: list(parsed.contradictions),
      weakAreas: list(parsed.weakAreas),
      missingInformation: list(parsed.missingInformation),
      studentPreparationFeedback: parsed.studentPreparationFeedback,
      mockInterviewStructure: parsed.mockInterviewStructure,
    };
  } catch {
    return null;
  }
}

/* ── Guards ──────────────────────────────────────────────────────────── */

export interface OutputGuardResult {
  ok: boolean;
  failed: readonly string[];
  violations: readonly string[];
}

/**
 * Everything that must hold before either document is shown. The guard set
 * follows the interview kind: a university course review carries no
 * immigration content at all; a CAS or UKVI review runs Priya's own scope
 * checks (preparation only; any rule stated with its source and date).
 */
export function guardInterviewOutput(text: string, kind: InterviewKind): OutputGuardResult {
  const def = interviewKind(kind);
  const failed: string[] = [];
  const violations: string[] = [];
  const always: ReadonlyArray<readonly [string, GuardResult]> = [
    ["invented explanation", checkNoInventedExplanation(text)],
    ["outcome prediction", checkNoOutcomePrediction(text)],
    ["record rewritten", checkRecordNotRewritten(text)],
    ["scripted answer", checkNoScriptedAnswers(text)],
    ["status presented as outcome", checkStatusNotPresentedAsOutcome(text)],
  ];
  for (const [name, result] of always) {
    if (!result.ok) { failed.push(name); violations.push(...result.violations); }
  }
  if (def.guardSet === "university") {
    const immigration = checkUniversityModeAvoidsImmigration(text);
    if (!immigration.ok) { failed.push("immigration content in a university course review"); violations.push(...immigration.violations); }
  } else {
    const scope = checkPreparationOnly(text);
    if (!scope.withinScope) { failed.push("regulated immigration advice"); violations.push(...scope.violations); }
    const sourced = checkImmigrationRuleStatementsAreSourced(text);
    if (!sourced.sourced) { failed.push("immigration rule stated without its source and date"); violations.push(...sourced.unsourced); }
  }
  return { ok: failed.length === 0, failed, violations };
}

/**
 * Priya's evidence check, applied to immigration statements only.
 *
 * Her check reads every "must" or "need to" as a rule statement, which is
 * right for an answer about the Immigration Rules and wrong for a
 * preparation note whose required closing heading is "Before your mock
 * interview you must be able to explain without notes". Here a sentence
 * needs a source when it states a requirement AND is about immigration:
 * the visa, UKVI, the Home Office, the rules, the CAS, maintenance funds,
 * the Student route or the sponsor. "You must be able to explain your
 * career path" is an instruction to the student, not a rule about them.
 */
const IMMIGRATION_RULE_SUBJECT =
  /\b(visa|ukvi|home office|immigration|cas\b|confirmation of acceptance|maintenance|funds requirement|student route|sponsor|appendix|paragraph \d|english language requirement|credibility interview)\b/i;

export function checkImmigrationRuleStatementsAreSourced(text: string): { sourced: boolean; unsourced: readonly string[] } {
  const base = checkRuleStatementsAreSourced(text);
  const unsourced = base.unsourced.filter(sentence => IMMIGRATION_RULE_SUBJECT.test(sentence));
  return { sourced: unsourced.length === 0, unsourced };
}

/* ── Prompt ──────────────────────────────────────────────────────────── */

export const CREDIBILITY_AREAS = Object.freeze([
  "CAREER PATH: a clear, credible and logical career plan; what the student intends to do after the course and exactly how this qualification helps them get there.",
  "WHY THIS COURSE: why this particular course, and how it relates to their previous education, experience and future career.",
  "DETAILED COURSE KNOWLEDGE: the course structure, the modules, what the important modules actually cover, assessment where relevant, and how particular modules relate to the career plan. Knowing module names is not sufficient.",
  "WHY THIS UNIVERSITY: specific and convincing reasons for this university rather than generic statements about reputation, quality or facilities.",
  "OTHER UNIVERSITIES CONSIDERED: which other universities they researched, how they compared them and why they chose this one.",
  "UNIVERSITY RANKINGS: whether the student knows the ranking of their chosen university and of the ones they considered, with the ranking table and year.",
]);

function taskInstructions(kind: InterviewKind, studentName: string, docs: readonly ExtractedDocument[]): string {
  const def = interviewKind(kind);
  const lines: string[] = [];
  lines.push(`INTERVIEW PREPARATION TASK for ${studentName}.`);
  lines.push(`Interview type: ${def.label}. The real interview is conducted by ${def.interviewer}.`);
  lines.push(
    "You have the student's three documents below, as submitted. Cross-check ALL THREE together. Pay particular attention to the WSA credibility areas:",
  );
  CREDIBILITY_AREAS.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  lines.push(
    "Also identify contradictions and inconsistencies between the documents, unexplained study or employment gaps, weak or generic answers, and anything likely to attract further questioning.",
  );
  lines.push("RULES THAT ARE ENFORCED ON YOUR OUTPUT:");
  lines.push("- Do not rewrite the CV or Personal Statement, and do not say that anything has been corrected. Where something looks wrong, say what to check and with whom.");
  lines.push("- Do not invent information, and do not explain a gap or a contradiction on the student's behalf. Raise it and say what the student must clarify.");
  lines.push("- Do not write model answers, scripts, suggested wording or a stronger version of anything for the student to memorise. The student must understand their own application and answer naturally.");
  lines.push("- Do not predict whether the student will pass, fail, be granted or be refused anything. GREEN, AMBER and RED are WSA preparation states, not forecasts.");
  lines.push("- You have no web access. Do not state a ranking, module title, course title, fee or entry requirement that the documents themselves do not contain. Where the student states one, tell them to verify it against the named published source (for a ranking: the table and the year) and to be ready to say where it came from. Never supply a figure.");
  if (def.guardSet === "university") {
    lines.push("- This is a university interview. Do not interpret immigration rules, the visa, UKVI or maintenance funds at all. If the student's documents raise them, say only that questions about immigration belong with Priya and an authorised human.");
  } else {
    lines.push("- Immigration is engaged. You may state what a published rule requires only with its official source and the date it was checked. You may not apply a rule to this student, predict an outcome or advise a course of action. Where you cannot cite the source, do not state the rule.");
  }
  lines.push("- Do not give a readiness score. A score is given only after the live mock interview, from the student's actual answers.");
  lines.push("PRODUCE, AS ONE JSON OBJECT WITH EXACTLY THESE KEYS:");
  lines.push('- "contradictions": array of {kind, detail}, each detail quoting what each document says and why it matters.');
  lines.push('- "weakAreas": array of {kind, detail, risk} where risk is "high", "medium" or "low".');
  lines.push('- "missingInformation": array of {kind, detail}: what the student has not provided and why it is needed.');
  lines.push(
    `- "studentPreparationFeedback": plain text written directly to ${studentName}, headed "PREPARATION FOR YOUR WSA MOCK INTERVIEW". ` +
      "Identify specifically what they need to research, correct, clarify, understand or prepare before the mock interview, prioritising career path, course knowledge, why this course, why this university, comparison with other universities and rankings. Explain weaknesses clearly but constructively. Finish with a concise checklist headed exactly: \"Before your mock interview you must be able to explain without notes\".",
  );
  lines.push(
    '- "mockInterviewStructure": plain text for the WSA interviewer, headed "CONFIDENTIAL WSA MOCK INTERVIEW STRUCTURE". ' +
      "State the principal credibility risks first. Then, for each important area, give QUESTION, WHAT I AM TESTING, EXPECTED CONTENT (what the student's own documents say they should be able to cover, never a script), FOLLOW UP / PROBE QUESTIONS, RED FLAGS and DOCUMENT CROSS CHECK, specific to this student's CV, Personal Statement and RIQ. Where an answer sounds memorised or generic, give follow-ups that test genuine understanding. End with the WSA mock interview assessment framework: naturalness, depth of knowledge, evidence of research, personal credibility, consistency, rehearsal risk, AI or stock-answer risk, failure to answer; the readiness threshold is 85 out of 100 and the score is given only after the live mock interview.",
  );
  lines.push("Write in plain text without Markdown symbols. Use blank lines between sections. Use the student's first name where you address them.");
  lines.push("");
  for (const d of docs) {
    lines.push(`===== ${DOCUMENT_LABEL[d.role]} (as submitted, ${d.characters} characters) =====`);
    lines.push(d.text);
    lines.push("");
  }
  return lines.join("\n");
}

/* ── The procedure ───────────────────────────────────────────────────── */

export type PreparationOutcome =
  | "prepared"
  | "refused_staff_access"
  | "refused_worker_not_executable"
  | "refused_no_brief"
  | "documents_unreadable"
  | "withheld"
  | "model_unavailable";

export interface PreparationRequest {
  /** From the verified session. Never from request input. */
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  kind: InterviewKind;
  studentName: string;
  documents: readonly SuppliedDocument[];
}

export interface PreparationResult {
  outcome: PreparationOutcome;
  kind: InterviewKind;
  kindLabel: string;
  owner: WorkerId;
  ownerName: string;
  reason: string;
  status: ReadinessStatus | null;
  statusMeaning: string;
  documents: ReadonlyArray<Pick<ExtractedDocument, "role" | "source" | "characters">>;
  studentPreparationFeedback: string | null;
  mockInterviewStructure: string | null;
  counts: { contradictions: number; weakAreas: number; missingInformation: number } | null;
}

export const PREPARATION_WITHHELD_NOTICE =
  "The two documents were prepared and withheld before you saw them, because they went beyond what the owning " +
  "worker is authorised to produce: an answer written for the student to memorise, an explanation invented for " +
  "a gap, a prediction of an outcome, an alteration of the submitted record, immigration interpretation in a " +
  "university review, or an immigration rule stated without its source. Run the preparation again; if it is " +
  "withheld twice, tell Tom Arrington.";

function refuse(
  outcome: PreparationOutcome, reason: string, request: PreparationRequest, owner: WorkerId,
  documents: PreparationResult["documents"] = [],
): PreparationResult {
  const def = interviewKind(request.kind);
  return {
    outcome, kind: request.kind, kindLabel: def.label, owner, ownerName: getWorker(owner).canonicalName, reason,
    status: null, statusMeaning: READINESS_MEANING, documents,
    studentPreparationFeedback: null, mockInterviewStructure: null, counts: null,
  };
}

/**
 * Produces the two documents, or refuses with the reason. Every gate that
 * governs asking the owning worker a question in the portal governs this:
 * the staff member's own access to that worker's scope, the worker's
 * approval and deployment status, and the worker's controlled brief.
 */
export async function prepareInterview(request: PreparationRequest): Promise<PreparationResult> {
  const def = interviewKind(request.kind);
  const owner = def.owner;
  const worker = getWorker(owner);

  const staffAccess = await checkAccessForStaffUser(request.staffUserId, {
    action: "read",
    functionalScope: WORKER_FUNCTIONAL_SCOPE[owner],
  });
  if (!staffAccess.allowed) return refuse("refused_staff_access", staffAccess.reason, request, owner);

  const execution = evaluateStaffPortalExecutionPermission(owner);
  if (!execution.allowed) return refuse("refused_worker_not_executable", execution.reason, request, owner);

  const brief = getControlledBrief(owner);
  if (!brief) return refuse("refused_no_brief", `${worker.canonicalName} has no controlled brief.`, request, owner);

  // Every role once, every document readable.
  const extracted: ExtractedDocument[] = [];
  for (const role of ["cv", "personal_statement", "riq"] as const) {
    const supplied = request.documents.find(d => d.role === role);
    if (!supplied) return refuse("documents_unreadable", `${DOCUMENT_LABEL[role]} was not supplied.`, request, owner);
    try {
      extracted.push(await extractDocumentText(supplied));
    } catch (err) {
      return refuse("documents_unreadable", err instanceof Error ? err.message : String(err), request, owner);
    }
  }
  const documentSummary = extracted.map(d => ({ role: d.role, source: d.source, characters: d.characters }));

  const system = composeSystemPrompt({
    brief,
    context: {
      workerId: owner, ownSpecificationReference: worker.controlledBriefReference,
      caseData: null, upstreamOutputs: [], denied: false,
    },
    contributions: [],
  });
  const task = taskInstructions(request.kind, request.studentName.trim(), extracted);

  let answer: ModelAnswer | null = null;
  let guardFeedback: string | null = null;
  let studentText = "";
  let interviewerText = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      const messages: Message[] = [
        { role: "system", content: system },
        { role: "user", content: task },
      ];
      if (guardFeedback) {
        messages.push({ role: "assistant", content: JSON.stringify(answer) });
        messages.push({ role: "user", content: guardFeedback });
      }
      const response = await invokeLLM({ messages, responseFormat: { type: "json_object" }, maxTokens: 8000 });
      raw = response.choices[0]?.message.content ?? "";
    } catch (err) {
      return refuse("model_unavailable", err instanceof Error ? err.message : String(err), request, owner, documentSummary);
    }
    const parsed = parseModelAnswer(raw);
    if (!parsed) {
      guardFeedback = "Your reply was not one JSON object with the five required keys. Reply again with exactly that object and nothing else.";
      answer = null;
      continue;
    }
    answer = parsed;
    studentText = prepareForRelease(parsed.studentPreparationFeedback).text;
    interviewerText = prepareForRelease(parsed.mockInterviewStructure).text;
    const g1 = guardInterviewOutput(studentText, request.kind);
    const g2 = guardInterviewOutput(interviewerText, request.kind);
    if (g1.ok && g2.ok) break;
    const failed = Array.from(new Set([...g1.failed, ...g2.failed]));
    const violations = [...g1.violations, ...g2.violations].slice(0, 8);
    guardFeedback =
      `Your output broke these rules: ${failed.join("; ")}. The sentences at fault were: ${violations.map(v => `"${v}"`).join(" ")} ` +
      "Reply again with the same JSON object, keeping everything else, with those sentences removed or rewritten so that no rule is broken.";
    if (attempt === 1) answer = null;
  }

  const kindOwnerAudit = {
    staffUserId: request.staffUserId, authMethod: request.authMethod, workerId: owner,
    workerSpecificationVersion: worker.specificationVersion,
    requestedCapability: `interview_preparation:${request.kind}`,
  };

  if (!answer) {
    recordAuditEvent({
      ...kindOwnerAudit, permissionDecision: "allowed", permissionReason: "Prepared and withheld by the output guards.",
      success: false, errorCategory: "validation_error",
    });
    return refuse("withheld", PREPARATION_WITHHELD_NOTICE, request, owner, documentSummary);
  }

  const status = deriveReadiness(
    answer.contradictions.map(c => ({ kind: "different_explanation_course_choice" as const, applicationRecordSays: "", educationDnaSays: "", whyItMatters: c.detail, questionForCounsellor: "" })),
    answer.missingInformation.map(m => ({ what: m.detail, whyItIsNeeded: "", requiredFromStudent: true as const })),
    answer.weakAreas.map(w => ({ kind: "vulnerable_to_follow_up" as const, observation: w.detail, risk: w.risk ?? "medium", whatTheStudentNeedsToUnderstand: "" })),
  );

  recordAuditEvent({
    ...kindOwnerAudit, permissionDecision: "allowed",
    permissionReason: `Interview preparation produced under ${brief.sourceDocument}; readiness ${status.toUpperCase()}.`,
    success: true, errorCategory: "none",
  });

  return {
    outcome: "prepared", kind: request.kind, kindLabel: def.label, owner, ownerName: worker.canonicalName,
    reason: `${worker.canonicalName} prepared both documents under ${brief.sourceDocument}.`,
    status, statusMeaning: READINESS_MEANING, documents: documentSummary,
    studentPreparationFeedback: studentText, mockInterviewStructure: interviewerText,
    counts: { contradictions: answer.contradictions.length, weakAreas: answer.weakAreas.length, missingInformation: answer.missingInformation.length },
  };
}
