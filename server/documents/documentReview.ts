/**
 * Reviewing a student's CV against their Personal Statement.
 *
 * OWNERSHIP. This is Grace's work and no new worker was created for it.
 * Her approved remit is independent audit of case work for defects,
 * contradictions and missing evidence, reporting to the authorised human
 * and never becoming the case owner. Comparing two submitted documents for
 * inconsistent dates, gaps and things present in one and absent from the
 * other is that activity exactly, and her record carries no open blockers.
 *
 * Three boundaries are enforced here rather than asked of the model,
 * because each one is a way this feature could quietly become something
 * WSA did not approve.
 *
 * IT MAY NOT INVENT AN EXPLANATION. The whole value of the review is
 * telling a counsellor what to ask. A finding that says "the student was
 * probably travelling" answers the question instead of raising it, and a
 * counsellor reading it has been given a fact nobody established.
 *
 * IT MAY NOT CORRECT THE RECORD. The submitted CV and Personal Statement
 * are the application record. Where the review believes something in them
 * is wrong, that is flagged for the authorised admissions or immigration
 * process, never edited. Grace's own boundary already says she does not
 * rewrite a case.
 *
 * IT MAY NOT PREDICT AN OUTCOME. The preparation status is WSA's internal
 * view of how ready the case is to be discussed. It is not a view on
 * whether an admission or a visa will be granted, and language that reads
 * as such is withheld.
 */

export type PreparationStatus = "clear" | "minor_clarification_needed" | "significant_gaps";

export const PREPARATION_STATUS_LABEL: Readonly<Record<PreparationStatus, string>> = Object.freeze({
  clear: "Clear",
  minor_clarification_needed: "Minor Clarification Needed",
  significant_gaps: "Significant Gaps or Inconsistencies",
});

/**
 * Said on every report. The status is a preparation state, and the moment
 * it is read as a forecast it becomes advice WSA has no authority to give.
 */
export const PREPARATION_STATUS_MEANING =
  "This is an internal WSA preparation status describing how ready this case is to be discussed with the " +
  "student. It is not a prediction of an admissions decision, a credibility decision or a visa outcome, and " +
  "must not be presented to anyone as one.";

export type FindingKind =
  | "education_gap"
  | "employment_gap"
  | "date_inconsistency"
  | "present_in_one_document_only"
  | "unclear_period"
  | "chronological_inconsistency"
  | "requires_clarification";

/** Which document produced a finding. A finding with no source cannot be checked. */
export type SourceDocument = "cv" | "personal_statement" | "both";

export interface DocumentFinding {
  kind: FindingKind;
  /** What was found. Observation only. */
  found: string;
  /** Why a counsellor may need to clarify it. Never an explanation of the gap itself. */
  whyClarificationMayBeRequired: string;
  /** The question to put to the student. This is the deliverable. */
  questionForCounsellor: string;
  /** Where it was found, so the counsellor can look at the same thing. */
  source: SourceDocument;
  /** The words the finding came from, so it can be checked rather than believed. */
  excerpt?: string;
}

export interface DocumentReviewReport {
  status: PreparationStatus;
  statusMeaning: string;
  findings: readonly DocumentFinding[];
  /** Stated plainly: the review did not alter the submitted documents. */
  recordUnchanged: true;
  /** Where a finding may need formal correction, it is routed, not fixed. */
  flaggedForFormalCorrection: readonly string[];
}

/* ── Guards, applied to the model's output before a staff member sees it ── */

/**
 * Phrases that supply an explanation the student never gave.
 *
 * A gap in a CV is an observation. "A gap, likely due to caring
 * responsibilities" is an invention, and it is the more dangerous for
 * sounding sympathetic and plausible.
 */
const INVENTED_EXPLANATION = [
  /\b(probably|presumably|likely|may have been|might have been|appears to have been|seems to have been)\s+(travel|caring|ill|unemploy|study|work|volunteer|rest)/i,
  /\b(this (?:gap|period) (?:is|was) (?:probably|likely|presumably))/i,
  /\bthe student (?:was|had been) (?:probably|likely|presumably)/i,
  /\bsuggests? that the student (?:was|had|took)/i,
  /\bcan be explained by\b/i,
  // Not anchored on "this is". "A break of this length is not unusual for
  // applicants from this region" explains the gap away just as effectively,
  // and reads as reassuring expertise rather than as the invention it is.
  /\b(?:is|are|was|were)\s+(?:quite\s+|fairly\s+|very\s+)?(?:normal|common|typical|not unusual|not uncommon|understandable|to be expected)\b/i,
];

/** Language that turns a preparation status into a forecast. */
const OUTCOME_PREDICTION = [
  /\b(will|would|should|is likely to)\s+(be\s+)?(accepted|admitted|approved|refused|rejected|granted|denied)\b/i,
  /\b(visa|application|admission)\s+(will|would|should)\s+(be\s+)?(granted|approved|refused|rejected|successful)\b/i,
  /\b(pass|fail)\s+(the\s+)?(credibility|visa)\s+interview\b/i,
  /\b(good|strong|poor|weak)\s+chance\s+of\b/i,
  /\bunlikely to (?:be )?(?:get|receive|obtain|succeed)\b/i,
];

/** Language that describes editing the submitted documents rather than flagging. */
const SILENT_CORRECTION = [
  /\b(I have|we have|has been)\s+(corrected|amended|updated|fixed|rewritten|revised)\b/i,
  /\b(corrected|amended|updated)\s+the\s+(cv|personal statement|record|document)\b/i,
  /\bthe (?:cv|personal statement) now (?:reads|says|states)\b/i,
];

export interface GuardResult {
  ok: boolean;
  violations: readonly string[];
}

function scan(text: string, patterns: readonly RegExp[]): string[] {
  const hits: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const trimmed = sentence.trim();
    if (trimmed === "") continue;
    if (patterns.some(p => p.test(trimmed))) hits.push(trimmed);
  }
  return hits;
}

/** No finding may supply the explanation the review exists to go and ask for. */
export function checkNoInventedExplanation(text: string): GuardResult {
  const violations = scan(text, INVENTED_EXPLANATION);
  return { ok: violations.length === 0, violations };
}

/** No report may read as a forecast of an admissions, credibility or visa outcome. */
export function checkNoOutcomePrediction(text: string): GuardResult {
  const violations = scan(text, OUTCOME_PREDICTION);
  return { ok: violations.length === 0, violations };
}

/** No report may describe having changed the submitted application record. */
export function checkRecordNotRewritten(text: string): GuardResult {
  const violations = scan(text, SILENT_CORRECTION);
  return { ok: violations.length === 0, violations };
}

/**
 * A finding must be actionable by the person reading it.
 *
 * Without a question, a finding is an observation the counsellor has to
 * turn into a conversation themselves, which is the work this was meant to
 * do. Without a source, it cannot be checked against the document.
 */
export function checkFindingsAreActionable(findings: readonly DocumentFinding[]): GuardResult {
  const violations: string[] = [];
  for (const f of findings) {
    if (!f.questionForCounsellor || f.questionForCounsellor.trim() === "") {
      violations.push(`${f.kind}: no question for the counsellor to ask`);
    }
    if (!f.source) violations.push(`${f.kind}: no source document`);
    if (!f.whyClarificationMayBeRequired || f.whyClarificationMayBeRequired.trim() === "") {
      violations.push(`${f.kind}: no reason clarification may be required`);
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Derives the preparation status from the findings rather than letting the
 * model choose it.
 *
 * A model asked for a status alongside a list of problems tends to soften
 * one to match the tone of the other. Deriving it means the status cannot
 * disagree with the findings it is supposed to summarise.
 */
export function deriveStatus(findings: readonly DocumentFinding[]): PreparationStatus {
  if (findings.length === 0) return "clear";
  const serious = findings.filter(f =>
    f.kind === "date_inconsistency" ||
    f.kind === "chronological_inconsistency" ||
    f.kind === "education_gap" ||
    f.kind === "employment_gap",
  );
  if (serious.length >= 2) return "significant_gaps";
  return "minor_clarification_needed";
}

export const DOCUMENT_REVIEW_OWNER = "grace" as const;

/** What Grace tells the staff member when a guard withholds the draft. */
export const WITHHELD_NOTICE =
  "Grace prepared a review and it was withheld before you saw it, because it went beyond what she is " +
  "authorised to do. She reports what the documents say and what to ask the student. She does not explain " +
  "a gap on the student's behalf, does not predict an admissions or visa outcome, and does not alter the " +
  "submitted application record.";
