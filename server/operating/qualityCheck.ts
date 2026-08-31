/**
 * Quality check, then humanisation.
 *
 * Implements clauses 10 and 11 of the WSA AI Operational Standard v1.0
 * (APPROVED), plus the binding universal no-em-dash rule inherited from
 * the AI Brain & Worker Creation Standard.
 *
 * Pure: no database, no network, no model calls. It inspects a proposed
 * output and reports what is wrong with it. It does not rewrite anything,
 * because the standard is explicit that the humanisation pass "may improve
 * presentation but must not change substance", and a checker that silently
 * edits substance is the exact failure it exists to prevent.
 *
 * The order in §10 is fixed and this module enforces it: specialist work,
 * then accuracy and quality check, then humanisation, then the user sees
 * it. assertHumanisationPreservedSubstance() is the guard on the last
 * step, and it is deliberately strict about the things that carry meaning
 * rather than tone: numbers, dates, money, named institutions, negations,
 * caveats and the safeguarding and no-guarantee language.
 */

export type QualityFindingSeverity = "blocking" | "advisory";

export type QualityFindingCode =
  | "permission_not_checked"
  | "evidence_insufficient"
  | "worker_boundary_breach"
  | "missing_caveat"
  | "guarantee_language"
  | "unresolved_disagreement_hidden"
  | "em_dash"
  | "double_hyphen"
  | "corporate_ai_language"
  | "formulaic_contrast"
  | "bullet_spam"
  | "heading_spam"
  | "repeated_summary"
  | "one_sentence_paragraph_run"
  | "artificial_warmth";

export interface QualityFinding {
  code: QualityFindingCode;
  severity: QualityFindingSeverity;
  detail: string;
}

export interface QualityCheckInput {
  /** The proposed staff-facing or externally visible text. */
  text: string;
  /** Whether the access decision was actually made before this was assembled (§4, §10). */
  permissionChecked: boolean;
  /** From the collaboration result. A hidden unresolved conflict is blocking (§9). */
  hasUnresolvedDisagreement: boolean;
  /** Whether the text actually mentions the disagreement. */
  disagreementVisibleInText: boolean;
  /** Any contribution rejected for crossing a lane (§6). */
  workerBoundaryBreaches: readonly string[];
  /** True where every contributing specialist was on insufficient evidence (§17). */
  evidenceInsufficient: boolean;
}

export interface QualityCheckResult {
  passed: boolean;
  findings: readonly QualityFinding[];
  blocking: readonly QualityFinding[];
}

/**
 * §6 of the WSA Core Operating System forbids claiming or implying
 * guaranteed admission, scholarship, visa approval, employment,
 * post-study work rights or immigration outcomes. This is a
 * student-protection control, so it is blocking rather than advisory.
 */
/**
 * A negated guarantee is the opposite of the prohibited claim.
 *
 * "WSA does not guarantee admission" is the sentence §6 wants written, so
 * blocking it would push a writer to delete their own disclaimer to get
 * past the gate. That is the one failure mode a student-protection
 * control must not have. The same applies to naming the rule: a page that
 * explains it looks for guarantee language is not making a guarantee.
 *
 * So the word alone is not the finding. Each occurrence is read in
 * context, and only an unnegated one counts.
 */
const NEGATED_BEFORE = /\b(no|not|never|without|cannot|can'?t|doesn'?t|don'?t|didn'?t|won'?t|nor)\b[^.;!?]{0,60}$/i;
const NAMING_THE_RULE_AFTER = /^\s*(language|wording|claims?|phrasing)\b/i;

export function statesAnUnnegatedGuarantee(text: string): boolean {
  const word = /\bguarantee(s|d|ing)?\b/gi;
  for (let m = word.exec(text); m !== null; m = word.exec(text)) {
    const before = text.slice(Math.max(0, m.index - 80), m.index);
    const after = text.slice(m.index + m[0].length);
    if (NEGATED_BEFORE.test(before)) continue;
    if (NAMING_THE_RULE_AFTER.test(after)) continue;
    return true;
  }
  return false;
}

/** Matches only where an unnegated guarantee is actually stated. */
const GUARANTEE_WORD = {
  test: (text: string) => statesAnUnnegatedGuarantee(text),
} as unknown as RegExp;

const GUARANTEE_PATTERNS: readonly { re: RegExp; what: string }[] = [
  { re: GUARANTEE_WORD, what: "guarantee" },
  { re: /\b100%\s*(success|approval|acceptance)/i, what: "a 100% success claim" },
  { re: /\bwill definitely (be )?(get|receive|be granted|be accepted|be approved)/i, what: "a definite-outcome claim" },
  { re: /\bcertain to (be )?(accepted|approved|granted)/i, what: "a certainty-of-outcome claim" },
  { re: /\bassured (admission|approval|place|visa)/i, what: "an assured-outcome claim" },
];

/** §11 — corporate AI language and formulaic constructions to avoid. */
const CORPORATE_AI_PATTERNS: readonly { re: RegExp; what: string }[] = [
  { re: /\bleverage\b/i, what: "leverage" },
  { re: /\bsynerg(y|ies|istic)\b/i, what: "synergy" },
  { re: /\bdelve into\b/i, what: "delve into" },
  { re: /\bin today's fast-paced\b/i, what: "in today's fast-paced" },
  { re: /\bunlock the (power|potential)\b/i, what: "unlock the power" },
  { re: /\bseamless(ly)?\b/i, what: "seamless" },
  { re: /\bit'?s worth noting that\b/i, what: "it's worth noting that" },
  { re: /\bat the end of the day\b/i, what: "at the end of the day" },
  { re: /\bnavigate the complexities\b/i, what: "navigate the complexities" },
];

const ARTIFICIAL_WARMTH: readonly { re: RegExp; what: string }[] = [
  { re: /\b(great|excellent|fantastic) question\b/i, what: "great question" },
  { re: /\bI'?m (so )?(happy|glad|delighted) to help\b/i, what: "I'm happy to help" },
  { re: /\bdon'?t hesitate to reach out\b/i, what: "don't hesitate to reach out" },
  { re: /\brest assured\b/i, what: "rest assured" },
  { re: /\babsolutely\b/i, what: "absolutely" },
];

/** §11 — "It's not X, it's Y" and its close relatives. */
const FORMULAIC_CONTRAST: readonly RegExp[] = [
  /\bit'?s not (just )?(about )?[^.,;]{1,40},? it'?s\b/i,
  /\bthat'?s not to say [^.]{1,60}\. rather,/i,
  /\bnot only [^.,;]{1,40},? but also\b/i,
];

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

/**
 * Runs the §10 accuracy and quality check. Blocking findings stop the
 * output; advisory findings are style matters that a humanisation pass
 * should address but which do not make the answer unsafe.
 */
export function runQualityCheck(input: QualityCheckInput): QualityCheckResult {
  const findings: QualityFinding[] = [];
  const { text } = input;

  // Permission compliance (§4, §10, §32).
  if (!input.permissionChecked) {
    findings.push({
      code: "permission_not_checked",
      severity: "blocking",
      detail: "No access decision was recorded before this output was assembled.",
    });
  }

  // Worker boundaries (§6).
  for (const breach of input.workerBoundaryBreaches) {
    findings.push({ code: "worker_boundary_breach", severity: "blocking", detail: breach });
  }

  // Evidence quality (§17).
  if (input.evidenceInsufficient) {
    findings.push({
      code: "evidence_insufficient",
      severity: "blocking",
      detail: "Every contributing specialist was working from insufficient evidence.",
    });
  }

  // §9 — an unresolved conflict must not be smoothed away.
  if (input.hasUnresolvedDisagreement && !input.disagreementVisibleInText) {
    findings.push({
      code: "unresolved_disagreement_hidden",
      severity: "blocking",
      detail: "Specialists disagree materially but the output does not say so.",
    });
  }

  // Student protection: no guarantees (WSA Core §4.5 and §6).
  for (const { re, what } of GUARANTEE_PATTERNS) {
    if (re.test(text)) {
      findings.push({
        code: "guarantee_language",
        severity: "blocking",
        detail: `Output contains ${what}. WSA must not promise or imply outcomes controlled by third parties.`,
      });
    }
  }

  // §11 writing standard. Em dashes are a binding universal rule.
  if (/—/.test(text)) {
    findings.push({ code: "em_dash", severity: "blocking", detail: "Output contains an em dash, which is prohibited universally." });
  }
  // Prose punctuation only. A CSS custom property (--sidebar-width) or a
  // command flag (--coverage) is not a writer reaching for a dash, and
  // flagging those trains people to ignore the finding when it is real.
  // Prose brackets the pair symmetrically, either tight (word--word) or
  // spaced on both sides; a flag or a variable never does, because it
  // always has a space, quote or bracket on the left and none on the right.
  if (/[A-Za-z0-9]--[A-Za-z0-9]|[A-Za-z0-9] -- [A-Za-z0-9]/.test(text)) {
    findings.push({ code: "double_hyphen", severity: "advisory", detail: "Double hyphen used as prose punctuation." });
  }
  for (const { re, what } of CORPORATE_AI_PATTERNS) {
    if (re.test(text)) findings.push({ code: "corporate_ai_language", severity: "advisory", detail: `Corporate AI phrasing: "${what}".` });
  }
  for (const { re, what } of ARTIFICIAL_WARMTH) {
    if (re.test(text)) findings.push({ code: "artificial_warmth", severity: "advisory", detail: `Artificial warmth: "${what}".` });
  }
  for (const re of FORMULAIC_CONTRAST) {
    if (re.test(text)) {
      findings.push({ code: "formulaic_contrast", severity: "advisory", detail: "Formulaic contrast construction." });
      break;
    }
  }

  const paras = paragraphs(text);
  const bulletLines = text.split("\n").filter(l => /^\s*[-*•]\s+/.test(l)).length;
  const totalLines = text.split("\n").filter(l => l.trim()).length;
  if (bulletLines >= 4 && totalLines > 0 && bulletLines / totalLines > 0.6) {
    findings.push({ code: "bullet_spam", severity: "advisory", detail: "Most of the output is bullets rather than prose." });
  }

  const headings = text.split("\n").filter(l => /^\s*#{1,6}\s+/.test(l) || /^\s*\*\*[^*]+\*\*\s*$/.test(l)).length;
  if (headings >= 3 && paras.length <= headings * 2) {
    findings.push({ code: "heading_spam", severity: "advisory", detail: "Headings outnumber the substance beneath them." });
  }

  const singleSentenceParas = paras.filter(p => !/\n/.test(p) && (p.match(/[.!?](\s|$)/g) ?? []).length === 1).length;
  if (paras.length >= 4 && singleSentenceParas / paras.length > 0.7) {
    findings.push({
      code: "one_sentence_paragraph_run",
      severity: "advisory",
      detail: "Nearly every paragraph is a single sentence.",
    });
  }

  if (paras.length >= 3) {
    const last = paras[paras.length - 1].toLowerCase();
    if (/^(in summary|to summarise|to sum up|in conclusion|overall)\b/.test(last)) {
      findings.push({ code: "repeated_summary", severity: "advisory", detail: "Output ends with a summary of what it just said." });
    }
  }

  const blocking = findings.filter(f => f.severity === "blocking");
  return { passed: blocking.length === 0, findings, blocking };
}

// ── Humanisation guard (§10) ────────────────────────────────────────────
export interface SubstanceChange {
  kind: "number" | "date" | "money" | "negation" | "caveat" | "institution";
  detail: string;
}

const CAVEAT_TERMS = [
  "not guaranteed", "cannot promise", "subject to", "may not", "no guarantee",
  "safeguarding", "must not", "at your own risk", "we do not",
];

function tokensOf(re: RegExp, text: string): string[] {
  return (text.match(re) ?? []).map(s => s.trim().toLowerCase()).sort();
}

/**
 * §10 — "A final humanisation pass may improve presentation but must not
 * change substance."
 *
 * Compares the checked text against the humanised text and reports
 * anything that changed which carries meaning. It is intentionally
 * one-directional about caveats: adding a caveat is allowed, removing one
 * is not, because a humanisation pass that drops a safeguarding
 * qualification to read more smoothly is the specific harm this guards.
 */
export function findSubstanceChanges(before: string, after: string): SubstanceChange[] {
  const changes: SubstanceChange[] = [];

  const numbersBefore = tokensOf(/\b\d[\d,.]*%?\b/g, before);
  const numbersAfter = tokensOf(/\b\d[\d,.]*%?\b/g, after);
  if (numbersBefore.join("|") !== numbersAfter.join("|")) {
    changes.push({ kind: "number", detail: `Numbers changed: [${numbersBefore.join(", ")}] became [${numbersAfter.join(", ")}].` });
  }

  const moneyBefore = tokensOf(/[£$€]\s?\d[\d,.]*/g, before);
  const moneyAfter = tokensOf(/[£$€]\s?\d[\d,.]*/g, after);
  if (moneyBefore.join("|") !== moneyAfter.join("|")) {
    changes.push({ kind: "money", detail: "A monetary amount changed." });
  }

  const dateRe = /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi;
  const datesBefore = tokensOf(dateRe, before);
  const datesAfter = tokensOf(dateRe, after);
  if (datesBefore.join("|") !== datesAfter.join("|")) {
    changes.push({ kind: "date", detail: "A date changed." });
  }

  const negRe = /\b(not|never|cannot|can't|won't|must not|no)\b/gi;
  const negBefore = (before.match(negRe) ?? []).length;
  const negAfter = (after.match(negRe) ?? []).length;
  if (negAfter < negBefore) {
    changes.push({ kind: "negation", detail: `Negations dropped from ${negBefore} to ${negAfter}.` });
  }

  for (const term of CAVEAT_TERMS) {
    const inBefore = before.toLowerCase().includes(term);
    const inAfter = after.toLowerCase().includes(term);
    if (inBefore && !inAfter) {
      changes.push({ kind: "caveat", detail: `Caveat removed: "${term}".` });
    }
  }

  const instRe = /\bUniversity of [A-Z][A-Za-z]+\b|\b[A-Z][A-Za-z]+ University\b/g;
  const instBefore = tokensOf(instRe, before);
  const instAfter = tokensOf(instRe, after);
  if (instBefore.join("|") !== instAfter.join("|")) {
    changes.push({ kind: "institution", detail: "A named institution changed." });
  }

  return changes;
}

export interface HumanisationResult {
  accepted: boolean;
  /** The text to show. On rejection this is the pre-humanisation text, never a half-edited blend. */
  text: string;
  substanceChanges: readonly SubstanceChange[];
  reason: string;
}

/**
 * Applies the humanisation pass only if it left the substance alone. On
 * rejection it returns the checked text unchanged rather than the
 * humanised version, because a presentation improvement is never worth a
 * changed fact.
 */
export function acceptHumanisation(checkedText: string, humanisedText: string): HumanisationResult {
  const substanceChanges = findSubstanceChanges(checkedText, humanisedText);
  if (substanceChanges.length > 0) {
    return {
      accepted: false,
      text: checkedText,
      substanceChanges,
      reason: "The humanisation pass changed substance, so the checked text is used instead.",
    };
  }

  // A humanisation pass must not reintroduce a prohibited construction.
  if (/—/.test(humanisedText)) {
    return {
      accepted: false,
      text: checkedText,
      substanceChanges: [],
      reason: "The humanisation pass introduced an em dash, which is prohibited universally.",
    };
  }

  return { accepted: true, text: humanisedText, substanceChanges: [], reason: "Presentation improved without changing substance." };
}
