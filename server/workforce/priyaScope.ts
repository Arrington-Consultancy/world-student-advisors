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
    name: "Official rule research and evidence-based explanation",
    available: true,
    blockedBy: null,
    reason: null,
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
  // Applying a rule to a person. This is the regulated half.
  /\b(you|they|she|he|the applicant|the student|the sponsor|this student)\s+(is|are|would be|will be)\s+(eligible|ineligible|exempt|entitled|refused|approved|granted|accepted)\b/i,
  /\b(you|they|she|he|the applicant|the student|this student)\s+(qualif(y|ies)|do(es)? not qualify|meets? the requirement|fails? the requirement)\b/i,
  /\bin (your|his|her|their|this) case\b/i,
  /\b(your|his|her|their) (application|visa|claim|case)\s+(will|would|should)\s+(be\s+)?(succeed|fail|approved|refused|granted)/i,
  // Predicting an outcome a third party decides.
  /\b(likely|unlikely|probably|should be)\s+(to be\s+)?(approved|refused|granted|successful|fine|ok)\b/i,
  /\b(you|they|she|he)\s+(will|should|can expect to)\s+(get|receive|be granted|be approved|be refused)\b/i,
  // Advising a course of action on a regulated matter.
  /\b(you|they|she|he)\s+(should|ought to|must)\s+(apply|submit|switch|extend|appeal|withdraw)\b/i,
  /\bI (would|will|do)\s+(recommend|advise|suggest)\b/i,
]);

/**
 * Marks a sentence as reporting what a source says rather than asserting
 * it. Priya may state a published rule; she must show where it comes
 * from, which is Core Operating System section 8's evidence discipline
 * applied to her scope.
 */
const CITED_TO_SOURCE =
  /\b(gov\.uk|home office|ukvi|immigration rules|appendix|paragraph \S+|published|official guidance|the guidance|according to|as at|checked on|source:)\b/i;

export interface PreparationCheck {
  withinScope: boolean;
  /** Each rule statement found, so a reviewer can see what was caught. */
  violations: readonly string[];
}

/**
 * True where the sentence is put as a question or an instruction to
 * establish something, rather than as a determination about a person.
 */
function isInterrogativeOrDirective(sentence: string): boolean {
  const s = sentence.trim();
  if (s.endsWith("?")) return true;
  return /^\s*(confirm|check|verify|establish|obtain|ask|determine|clarify|identify|request|find out|whether|which|what|does|do|is there|are there)\b/i.test(s);
}

/**
 * Checks a Priya output before any staff member sees it.
 *
 * The line moved on 31 August 2026 and it is worth being exact about
 * where it now sits. Tom's consolidated authority permits official rule
 * research and evidence-based explanation, so stating what a published
 * rule says is no longer a violation. Applying that rule to one person's
 * circumstances still is, because that is the regulated activity AB-P04
 * reserves to a named human.
 *
 * So the check no longer looks for rule statements. It looks for
 * determinations: an eligibility verdict about a person, a prediction of
 * an outcome a third party decides, or a recommended course of action on
 * a regulated matter. A model asked about immigration will drift towards
 * all three while being helpful, which is why this runs on the output
 * rather than being asked of the prompt.
 *
 * A rule statement carrying no source is caught separately, as an
 * evidence failure rather than a scope one, because Core Operating
 * System section 8 requires the source and the date.
 */
export function checkPreparationOnly(text: string): PreparationCheck {
  const violations: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed === "") continue;
    if (isInterrogativeOrDirective(trimmed)) continue;
    // A sentence that names the block rather than making a determination
    // is the refusal working, not a violation.
    if (/\b(AB-P0[1-4]|authorised human|(cannot|can't|will not|won't|do not|don't)\s+(say|state|advise|confirm|tell|decide|assess)|outside my remit|blocked|not immigration advice)\b/i.test(trimmed)) {
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

export interface EvidenceCheck {
  /** True where every rule statement carries a source. */
  sourced: boolean;
  /** Rule statements made without naming where they came from. */
  unsourced: readonly string[];
}

/**
 * Rule statements must show their source.
 *
 * Core Operating System v1.1 section 8 binds every worker: information
 * that changes regularly must be verified before it is relied upon,
 * uncertainty must be labelled, and a worker must not guess where
 * verification is reasonably possible. Immigration rules are the textbook
 * case of information that changes regularly.
 *
 * This is what answers AB-P03's absence rather than waiving it. There is
 * no approved Knowledge and Evidence Standard setting a detailed source
 * hierarchy, but the constitution already requires a source, and an
 * unsourced immigration rule is exactly the risk the approval block
 * existed to prevent.
 */
export function checkRuleStatementsAreSourced(text: string): EvidenceCheck {
  const unsourced: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);

  const STATES_A_RULE =
    /\b(must|required to|need to|requirement is|threshold is|minimum is|eligible if|permitted to|the rule|the guidance|appendix|paragraph)\b/i;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed === "" || isInterrogativeOrDirective(trimmed)) continue;
    if (!STATES_A_RULE.test(trimmed)) continue;
    if (CITED_TO_SOURCE.test(trimmed)) continue;
    unsourced.push(trimmed);
  }

  return { sourced: unsourced.length === 0, unsourced };
}

export const PRIYA_REFUSAL =
  "That asks Priya to decide something about this person, which is regulated immigration advice and stays " +
  "with a named authorised human under AB-P04. She can tell you what the published rule says, with its " +
  "source and the date it was checked, what evidence this case needs, and what is uncertain. What she " +
  "cannot do is apply it to the student, predict the outcome, or tell them what to do.";
