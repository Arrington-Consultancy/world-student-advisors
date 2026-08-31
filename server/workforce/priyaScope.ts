/**
 * Priya's boundary, as a control rather than as an instruction.
 *
 * The directive asked for the maximum safe useful capability rather than
 * a blanket block, and there is one, but it is narrower than the
 * Register's remit and the reasoning matters.
 *
 * Priya is APPROVAL BLOCKED by four decisions: AB-P01 immigration-advice
 * authority by jurisdiction and activity, AB-P02 an approved Decision and
 * Escalation Framework, AB-P03 an approved Knowledge and Evidence
 * Standard, and AB-P04 named human ownership for submissions, escalation,
 * refusals and adverse decisions. The 29 August Gatekeeper Result section
 * 8 independently reserves the same matters as external and human.
 *
 * Explaining a confirmed immigration rule was examined and stays blocked
 * for two separate reasons, neither of which is the missing connector:
 *
 *   AB-P03 is the immediate obstacle. With no approved Knowledge and
 *   Evidence Standard there is no controlled basis for which immigration
 *   source is authoritative or how current it must be. A worker saying
 *   the rule is X, with no standard governing where X came from, is the
 *   exact risk the block exists to prevent.
 *
 *   AB-P01 is the prior question. Whether explaining a published rule is
 *   information rather than regulated immigration advice is a legal
 *   determination about a regulated activity. This build programme may
 *   not make it and no controlled record makes it.
 *
 * What survives is preparation. Identifying which questions an authorised
 * human must answer, which documents must be produced, and what is
 * uncertain, states no rule and gives no advice. It needs no source
 * hierarchy because it asserts nothing, and AB-P01 does not reach it
 * because a question is not advice. It is also the genuinely useful part:
 * an adviser's time goes on assembling the case, not on recalling the
 * rule.
 *
 * AB-P04 is untouched. Submissions, representations, escalation, refusals
 * and adverse decisions remain blocked whatever happens to P01 and P03.
 *
 * The rules below are enforced here, in code, and not only stated in
 * Priya's brief. A prompt is an instruction to a model and a model can be
 * argued with; this cannot.
 */

export const PRIYA_BLOCKERS = Object.freeze({
  AB_P01: "Immigration-advice authority by jurisdiction and activity is undetermined.",
  AB_P02: "No approved Decision and Escalation Framework.",
  AB_P03: "No approved Knowledge and Evidence Standard, so no controlled source hierarchy for immigration rules.",
  AB_P04: "No named human owner for visa submission, regulated-advice escalation, refusals and adverse decisions.",
});

export type PriyaCapabilityId = "case_preparation" | "rules_explanation" | "regulated_advice";

export interface PriyaCapabilityState {
  id: PriyaCapabilityId;
  name: string;
  available: boolean;
  /** Null only where available. */
  blockedBy: readonly string[] | null;
  reason: string | null;
}

export const PRIYA_CAPABILITIES: readonly PriyaCapabilityState[] = Object.freeze([
  Object.freeze({
    id: "case_preparation" as const,
    name: "Visa and compliance case preparation",
    available: true,
    blockedBy: null,
    reason: null,
  }),
  Object.freeze({
    id: "rules_explanation" as const,
    name: "Explaining confirmed official immigration rules",
    available: false,
    blockedBy: Object.freeze(["AB-P03", "AB-P01"]),
    reason:
      "AB-P03: no approved Knowledge and Evidence Standard, so no controlled basis for which immigration " +
      "source is authoritative. AB-P01: whether explaining a published rule is information rather than " +
      "regulated advice is a legal determination no controlled record has made. Not a connector limitation.",
  }),
  Object.freeze({
    id: "regulated_advice" as const,
    name: "Regulated advice, representations and submissions",
    available: false,
    blockedBy: Object.freeze(["AB-P04", "AB-P02", "AB-P01"]),
    reason:
      "AB-P04: no named human owner for submission, escalation, refusals and adverse decisions. Blocked " +
      "irrespective of AB-P01 and AB-P03.",
  }),
]);

/**
 * What preparation may produce. Anything outside these three shapes is
 * not preparation.
 */
export const PERMITTED_OUTPUT_SHAPES: readonly string[] = Object.freeze([
  "Questions an authorised human must answer.",
  "Evidence and documents that must be obtained for this case.",
  "Points of genuine uncertainty, named as uncertain.",
]);

/**
 * Phrases that assert what an immigration rule is. A model asked for
 * preparation can drift into an answer, usually helpfully, so the output
 * is checked rather than trusted.
 *
 * These match assertions, not questions. "Confirm whether the applicant
 * must show maintenance funds" is preparation. "The applicant must show
 * maintenance funds" is a rule statement. The distinction is carried by
 * the leading verb, so the patterns anchor on assertive constructions and
 * the caller strips interrogatives first.
 */
const RULE_ASSERTION_PATTERNS: readonly RegExp[] = Object.freeze([
  /\b(the|this|that|which)\s+(rule|requirement|threshold|route|visa|category|policy)\s+(is|are|says?|states?|requires?)\b/i,
  /\b(you|they|the applicant|the student|the sponsor)\s+(must|need to|needs to|have to|has to|are required to|is required to|will need)\b/i,
  /\b(is|are)\s+(eligible|ineligible|exempt|permitted|allowed|entitled|required)\b/i,
  /\b(the|a|an)?\s*(requirement|threshold|minimum|maximum|limit|fee|amount|period|deadline)\s+(is|are|of)\s+[£$€]?\d/i,
  /\bunder\s+(paragraph|appendix|part|rule|section)\s+\S+\s*,?\s*(the|you|they|an?)\b/i,
  /\b(qualifies?|does not qualify|meets? the requirement|fails? the requirement)\b/i,
  /\b(no|any|a)\s+(visa|permission|leave|status)\s+(is|would be)\s+(required|needed|granted|refused)\b/i,
]);

export interface PreparationCheck {
  withinScope: boolean;
  /** Each rule statement found, so a reviewer can see what was caught. */
  violations: readonly string[];
}

/**
 * True where the sentence is put as a question or an instruction to
 * establish something, rather than as a statement of what the position
 * is. Preparation is allowed to name the subject of a rule; it is not
 * allowed to resolve it.
 */
function isInterrogativeOrDirective(sentence: string): boolean {
  const s = sentence.trim();
  if (s.endsWith("?")) return true;
  return /^\s*(confirm|check|verify|establish|obtain|ask|determine|clarify|identify|request|find out|whether|which|what|does|do|is there|are there)\b/i.test(s);
}

/**
 * Checks a Priya output for rule statements. Used by the execution layer,
 * so a drifting model is caught before a staff member reads it rather
 * than after.
 */
export function checkPreparationOnly(text: string): PreparationCheck {
  const violations: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed === "") continue;
    if (isInterrogativeOrDirective(trimmed)) continue;
    // A sentence that names the block rather than applying a rule is the
    // refusal working, not a violation.
    if (/\b(AB-P0[1-4]|authorised human|cannot (state|advise|confirm)|outside my remit|blocked)\b/i.test(trimmed)) {
      continue;
    }
    for (const pattern of RULE_ASSERTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        violations.push(trimmed);
        break;
      }
    }
  }

  return { withinScope: violations.length === 0, violations };
}

export const PRIYA_REFUSAL =
  "That needs an immigration answer, and Priya is not authorised to give one. AB-P01 and AB-P03 are open, so " +
  "there is no controlled basis for stating what a rule requires. She can set out what a named authorised " +
  "human must determine, what evidence this case needs, and what is uncertain. Ask for that, or put the " +
  "question to the authorised human directly.";
