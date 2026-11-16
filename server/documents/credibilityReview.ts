import {
  checkNoInventedExplanation, checkNoOutcomePrediction, checkRecordNotRewritten,
  type GuardResult,
} from "./documentReview";
import { checkPreparationOnly, checkRuleStatementsAreSourced } from "../workforce/priyaScope";

/**
 * Credibility readiness: the CV and Personal Statement against the
 * Education DNA.
 *
 * OWNERSHIP, AND WHY IT IS SPLIT.
 * No new worker was created. Three existing approved workers own the three
 * different activities inside this workflow, and keeping them apart is what
 * keeps the workflow inside WSA's actual authority.
 *
 *   Grace owns finding the contradictions. Comparing a fixed record against
 *   a later account for inconsistent dates, titles and explanations is
 *   independent audit of case work, which is her approved remit.
 *
 *   James owns university interview preparation. Admissions and application
 *   is his, and preparing a student to discuss their own application with a
 *   university is admissions preparation.
 *
 *   Priya owns anything immigration. Her bounded scope permits stating what
 *   a published rule says with its source and date, and forbids applying it
 *   to a person, predicting an outcome, or advising a course of action.
 *
 * THE UNIVERSITY AND UKVI BOUNDARY IS STRUCTURAL, NOT ADVISORY.
 * The two modes are separate values, each with its own owner and its own
 * output guards, and there is no mode that means both. A university review
 * produces no immigration interpretation at all, which is stronger than
 * producing one carefully. A UKVI review runs Priya's own scope checks on
 * the text before any staff member reads it, so a UKVI-mode answer that
 * drifts into telling this student what will happen to them is withheld by
 * the same code that guards Priya everywhere else.
 *
 * THE APPLICATION RECORD IS FIXED.
 * The submitted CV and Personal Statement are what the student has already
 * put their name to. The Education DNA is evidence of how they currently
 * explain themselves. Where the two disagree, the disagreement is the
 * finding. Neither document is rewritten to remove it, and a genuine error
 * is routed to the authorised admissions or immigration process instead.
 */

export type ReviewMode = "university_admissions" | "ukvi_credibility";

export const MODE_OWNER: Readonly<Record<ReviewMode, string>> = Object.freeze({
  university_admissions: "james",
  ukvi_credibility: "priya",
});

/** Grace finds the contradictions in both modes; the mode owner prepares the student-facing side. */
export const CONTRADICTION_OWNER = "grace" as const;

export const MODE_DESCRIPTION: Readonly<Record<ReviewMode, string>> = Object.freeze({
  university_admissions:
    "Preparing the student to discuss their own application with a university. Produces no immigration " +
    "interpretation of any kind.",
  ukvi_credibility:
    "Preparing the student to discuss their application where immigration rules are engaged. Bounded by " +
    "Priya's approved scope: a published rule may be stated with its official source and the date it was " +
    "checked; it may not be applied to this student, and no outcome may be predicted.",
});

export type ReadinessStatus = "green" | "amber" | "red";

export const READINESS_MEANING =
  "GREEN, AMBER and RED are internal WSA preparation statuses describing how ready this student is to " +
  "discuss their own application. They are not a prediction of an admissions decision, a credibility " +
  "decision or a visa outcome, and must never be presented to anyone, including the student, as one.";

export type ContradictionKind =
  | "different_dates"
  | "different_job_title_or_responsibility"
  | "different_academic_information"
  | "changed_career_objective"
  | "different_explanation_course_choice"
  | "different_explanation_university_choice"
  | "different_explanation_uk_choice"
  | "different_explanation_for_gap"
  | "new_information_only_in_education_dna";

export type WeaknessKind =
  | "weak_academic_progression"
  | "weak_course_knowledge"
  | "weak_university_choice_reasoning"
  | "weak_uk_choice_reasoning"
  | "weak_alternative_comparison"
  | "career_plan_inconsistency"
  | "financial_understanding_gap"
  | "appears_memorised_or_generic"
  | "vulnerable_to_follow_up";

export type RiskLevel = "high" | "medium" | "low";

export interface Contradiction {
  kind: ContradictionKind;
  /** What the fixed application record says. Quoted, not paraphrased into agreement. */
  applicationRecordSays: string;
  /** What the Education DNA says. */
  educationDnaSays: string;
  whyItMatters: string;
  questionForCounsellor: string;
}

export interface WeakArea {
  kind: WeaknessKind;
  observation: string;
  risk: RiskLevel;
  whatTheStudentNeedsToUnderstand: string;
}

/**
 * Something the student has not provided.
 *
 * Marked as required rather than filled in. A review that invents the
 * missing answer produces a student who has never been asked the question
 * and a counsellor who thinks they have.
 */
export interface MissingInformation {
  what: string;
  whyItIsNeeded: string;
  /** Always true. Present so the intent is visible in the data, not only in prose. */
  requiredFromStudent: true;
}

/** Something asserted that WSA has not verified. */
export interface FactCheckRequired {
  claim: string;
  whereClaimed: "cv" | "personal_statement" | "education_dna";
  whyDoubtful: string;
  /** Always true, for the same reason as above. */
  factCheckRequired: true;
}

export interface CredibilityReadinessReport {
  mode: ReviewMode;
  modeOwner: string;
  status: ReadinessStatus;
  statusMeaning: string;
  /** The submitted record, summarised, never edited. */
  fixedApplicationRecordSummary: string;
  contradictions: readonly Contradiction[];
  missingInformation: readonly MissingInformation[];
  weakAreas: readonly WeakArea[];
  factChecksRequired: readonly FactCheckRequired[];
  /** 15 to 20, personalised to this student's own material. */
  followUpQuestions: readonly string[];
  priorityActionsBeforeMockInterview: readonly string[];
  /** Genuine errors routed to the authorised process rather than corrected here. */
  flaggedForFormalCorrection: readonly string[];
  recordUnchanged: true;
}

export const MIN_FOLLOW_UP_QUESTIONS = 15;
export const MAX_FOLLOW_UP_QUESTIONS = 20;

/* ── Guards ──────────────────────────────────────────────────────────── */

/**
 * A script the student memorises is the opposite of the point.
 *
 * The workflow exists to find what a student does not yet understand about
 * their own application. Handing them polished answers hides exactly that,
 * and a memorised answer is itself one of the weaknesses the review is
 * supposed to detect.
 */
const SCRIPTED_ANSWER = [
  /\b(say|tell them|answer|respond)\s*[:,]?\s*["“]/i,
  /\byou (?:should|could|can) say\b/i,
  /\bsuggested answer\b/i,
  /\bmodel answer\b/i,
  /\bscript for the student\b/i,
  /\brehearse this (?:answer|response|line)\b/i,
  /\bthe student should reply\b/i,
];

export function checkNoScriptedAnswers(text: string): GuardResult {
  const violations: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const trimmed = sentence.trim();
    if (trimmed !== "" && SCRIPTED_ANSWER.some(p => p.test(trimmed))) violations.push(trimmed);
  }
  return { ok: violations.length === 0, violations };
}

/**
 * In university mode, immigration must not appear at all.
 *
 * This is the item 5 boundary. Not "handled carefully in both modes" but
 * absent from one of them, because a workflow that produces immigration
 * interpretation under an admissions heading has escaped the authority
 * question rather than answered it.
 */
const IMMIGRATION_SUBJECT = [
  /\b(visa|ukvi|home office|immigration rules?|cas\b|confirmation of acceptance|maintenance funds?|credibility interview for (?:the )?visa)\b/i,
  /\bstudent route\b/i,
  /\bimmigration (?:status|history|adviser|advice)\b/i,
];

export function checkUniversityModeAvoidsImmigration(text: string): GuardResult {
  const violations: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const trimmed = sentence.trim();
    if (trimmed !== "" && IMMIGRATION_SUBJECT.some(p => p.test(trimmed))) violations.push(trimmed);
  }
  return { ok: violations.length === 0, violations };
}

/** Neither status set may be dressed up as a forecast. */
export function checkStatusNotPresentedAsOutcome(text: string): GuardResult {
  const asOutcome = [
    /\b(green|amber|red)\b[^.]{0,60}\b(means?|indicates?|suggests?)\b[^.]{0,60}\b(will|likely|chance|probability)\b/i,
    /\b(green|amber|red)\b[^.]{0,40}\b(pass|fail|approved|refused|granted|rejected)\b/i,
    /\blikely to (?:pass|fail|be granted|be refused)\b/i,
  ];
  const violations: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const trimmed = sentence.trim();
    if (trimmed !== "" && asOutcome.some(p => p.test(trimmed))) violations.push(trimmed);
  }
  return { ok: violations.length === 0, violations };
}

export interface ModeGuardResult {
  ok: boolean;
  /** Which check refused, so a withheld report says what it broke rather than failing vaguely. */
  failed: readonly string[];
  violations: readonly string[];
}

/**
 * Everything that must hold before a staff member reads the report.
 *
 * The mode decides which checks run, and UKVI mode runs Priya's own scope
 * code rather than a second copy of it. If her boundary is ever tightened,
 * this tightens with it, which is the point of calling hers instead of
 * writing another.
 */
export function guardCredibilityReport(text: string, mode: ReviewMode): ModeGuardResult {
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

  if (mode === "university_admissions") {
    const immigration = checkUniversityModeAvoidsImmigration(text);
    if (!immigration.ok) {
      failed.push("immigration content in university mode");
      violations.push(...immigration.violations);
    }
  } else {
    // Priya's own guards, not a copy of them.
    const scope = checkPreparationOnly(text);
    if (!scope.withinScope) {
      failed.push("regulated advice in UKVI mode");
      violations.push(...scope.violations);
    }
    const sourced = checkRuleStatementsAreSourced(text);
    if (!sourced.sourced) {
      failed.push("immigration rule stated without its source and date");
      violations.push(...sourced.unsourced);
    }
  }

  return { ok: failed.length === 0, failed, violations };
}

/** Derived from the findings, so the headline cannot disagree with the detail. */
export function deriveReadiness(
  contradictions: readonly Contradiction[],
  missing: readonly MissingInformation[],
  weakAreas: readonly WeakArea[],
): ReadinessStatus {
  const highRisk = weakAreas.filter(w => w.risk === "high").length;
  if (contradictions.length >= 2 || highRisk >= 2) return "red";
  if (contradictions.length > 0 || missing.length > 0 || highRisk > 0 || weakAreas.length >= 3) return "amber";
  return "green";
}

export const CREDIBILITY_WITHHELD_NOTICE =
  "A credibility readiness report was prepared and withheld before you saw it. WSA workers may find what " +
  "is inconsistent, missing or not yet understood, and say what to ask. They may not explain a gap on the " +
  "student's behalf, write answers for the student to memorise, predict an admissions or visa outcome, or " +
  "alter the submitted application record. In a university review they may not interpret immigration at " +
  "all, and in a UKVI review they stay inside Priya's approved limits.";
