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
  /** The controlled authority this comes from, so a writer can check it. */
  rule: string;
  /** What to do instead. A finding without one is a complaint. */
  remedy: string;
  /**
   * The offending text with a little context, where the finding has a
   * locatable match. Null for findings about the whole piece, like
   * bullet spam, which have no single place to point at.
   */
  excerpt: string | null;
}

/**
 * The rule each finding enforces and what to do about it.
 *
 * Kept as one table rather than inline at each site, because the useful
 * half of a finding is the remedy, and a remedy written at the point of
 * detection tends to describe the pattern that fired rather than the
 * writing problem the reader has. "An em dash was found" is a detection.
 * "Use a comma, a full stop, or brackets" is a finding.
 */
export const FINDING_GUIDANCE: Readonly<Record<QualityFindingCode, { rule: string; remedy: string }>> = Object.freeze({
  permission_not_checked: {
    rule: "WSA Staff Portal Access Control Standard v1.0, sections 4 and 10",
    remedy: "Nothing can be released until the access decision has been made. This is a platform fault, not a writing one.",
  },
  evidence_insufficient: {
    rule: "WSA Core Operating System v1.1, section 4.3, evidence before assertion",
    remedy: "Say what could not be verified and who must verify it, rather than releasing the claim.",
  },
  worker_boundary_breach: {
    rule: "WSA Core Operating System v1.1, section 10, defined remit",
    remedy: "Remove the material outside the worker's remit and name the specialist who owns it.",
  },
  missing_caveat: {
    rule: "WSA Core Operating System v1.1, section 4.4, transparency",
    remedy: "State the limitation, cost, risk or condition plainly rather than leaving it out.",
  },
  guarantee_language: {
    rule: "WSA Core Operating System v1.1, sections 4.5 and 6, honest limits",
    remedy:
      "Remove the promise. WSA cannot commit to an outcome a university, an awarding body or an immigration " +
      "authority decides. Say what WSA will do instead.",
  },
  unresolved_disagreement_hidden: {
    rule: "WSA Core Operating System v1.1, section 9",
    remedy: "Say that the specialists disagree and what each position is. Do not smooth it into one voice.",
  },
  em_dash: {
    rule: "WSA Global Writing Standard v1.0 APPROVED, the single binding rule",
    remedy: "Use a comma, a full stop, a colon, a semicolon, or brackets.",
  },
  double_hyphen: {
    rule: "WSA Global Writing Standard v1.0 APPROVED, in spirit",
    remedy: "A double hyphen is an em dash wearing a hat. Use a comma, a full stop, or brackets.",
  },
  corporate_ai_language: {
    rule: "WSA Writing Standards, plain language",
    remedy: "Say the specific thing instead. What actually changes for the reader?",
  },
  artificial_warmth: {
    rule: "WSA Writing Standards, plain language",
    remedy: "Cut it. Warmth that is not felt reads as a script, and staff notice faster than anyone.",
  },
  formulaic_contrast: {
    rule: "WSA Writing Standards, plain language",
    remedy: "State what it is. The contrast adds rhythm, not meaning.",
  },
  bullet_spam: {
    rule: "WSA Writing Standards, prose before lists",
    remedy: "Turn the connected points back into sentences. Keep bullets for things that are genuinely a list.",
  },
  heading_spam: {
    rule: "WSA Writing Standards, structure serves the reader",
    remedy: "Remove headings that introduce a sentence or two. A heading should earn its section.",
  },
  repeated_summary: {
    rule: "WSA Writing Standards, no filler",
    remedy: "Delete the closing summary. The reader has just read it.",
  },
  one_sentence_paragraph_run: {
    rule: "WSA Writing Standards, plain language",
    remedy: "Join the related sentences into paragraphs. Everything standing alone means nothing is emphasised.",
  },
});

/**
 * Pulls the offending text out with a little context either side, so the
 * writer can see the actual sentence rather than hunt for it.
 */
function excerptFor(text: string, pattern: RegExp): string | null {
  // Not every matcher here is a real regular expression. GUARANTEE_WORD is
  // a duck-typed object carrying only .test, because deciding whether a
  // guarantee is negated needs more than a pattern can express. Those have
  // no location to point at, so they get no excerpt rather than a crash.
  if (!(pattern instanceof RegExp)) return null;

  const source = pattern.flags.includes("g") ? new RegExp(pattern.source, pattern.flags.replace("g", "")) : pattern;
  const match = source.exec(text);
  if (!match || match.index === undefined) return null;

  const CONTEXT = 45;
  const start = Math.max(0, match.index - CONTEXT);
  const end = Math.min(text.length, match.index + match[0].length + CONTEXT);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "..." : ""}${body}${end < text.length ? "..." : ""}`;
}

/** Builds a finding, filling the rule and remedy from the table. */
function finding(
  code: QualityFindingCode,
  severity: QualityFindingSeverity,
  detail: string,
  excerpt: string | null = null,
): QualityFinding {
  return { code, severity, detail, ...FINDING_GUIDANCE[code], excerpt };
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
/**
 * The em dash, written by code point.
 *
 * Deliberately not the literal character. A scanner looking for em dashes
 * in shipped copy would otherwise have to carve out an exception for the
 * detector that finds them, and an exception list is the thing that lets
 * a real one hide. With no literal in the source, the scan needs no
 * exceptions and cannot be weakened by growing one.
 */
const EM_DASH = /\u2014/;
const DOUBLE_HYPHEN = /[A-Za-z0-9]--[A-Za-z0-9]|[A-Za-z0-9] -- [A-Za-z0-9]/;

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
    findings.push(finding("permission_not_checked", "blocking",
      "No access decision was recorded before this output was assembled."));
  }

  // Worker boundaries (§6).
  for (const breach of input.workerBoundaryBreaches) {
    findings.push(finding("worker_boundary_breach", "blocking", breach));
  }

  // Evidence quality (§17).
  if (input.evidenceInsufficient) {
    findings.push(finding("evidence_insufficient", "blocking",
      "Every contributing specialist was working from insufficient evidence."));
  }

  // §9 — an unresolved conflict must not be smoothed away.
  if (input.hasUnresolvedDisagreement && !input.disagreementVisibleInText) {
    findings.push(finding("unresolved_disagreement_hidden", "blocking",
      "Specialists disagree materially but the output does not say so."));
  }

  // Student protection: no guarantees (WSA Core §4.5 and §6).
  for (const { re, what } of GUARANTEE_PATTERNS) {
    if (re.test(text)) {
      findings.push(finding("guarantee_language", "blocking",
        `Output contains ${what}. WSA must not promise or imply outcomes controlled by third parties.`,
        excerptFor(text, re)));
    }
  }

  // §11 writing standard. Em dashes are a binding universal rule.
  if (EM_DASH.test(text)) {
    findings.push(finding("em_dash", "blocking",
      "An em dash is banned everywhere by the Global Writing Standard, in every form including the HTML entity.",
      excerptFor(text, EM_DASH)));
  }
  // Prose punctuation only. A CSS custom property (--sidebar-width) or a
  // command flag (--coverage) is not a writer reaching for a dash, and
  // flagging those trains people to ignore the finding when it is real.
  // Prose brackets the pair symmetrically, either tight (word--word) or
  // spaced on both sides; a flag or a variable never does, because it
  // always has a space, quote or bracket on the left and none on the right.
  if (DOUBLE_HYPHEN.test(text)) {
    findings.push(finding("double_hyphen", "advisory", "Double hyphen used as prose punctuation.",
      excerptFor(text, DOUBLE_HYPHEN)));
  }
  for (const { re, what } of CORPORATE_AI_PATTERNS) {
    if (re.test(text)) {
      findings.push(finding("corporate_ai_language", "advisory", `"${what}" is corporate filler.`, excerptFor(text, re)));
    }
  }
  for (const { re, what } of ARTIFICIAL_WARMTH) {
    if (re.test(text)) {
      findings.push(finding("artificial_warmth", "advisory", `"${what}" is warmth the writer does not feel.`, excerptFor(text, re)));
    }
  }
  for (const re of FORMULAIC_CONTRAST) {
    if (re.test(text)) {
      findings.push(finding("formulaic_contrast", "advisory", "Formulaic contrast construction.", excerptFor(text, re)));
      break;
    }
  }

  const paras = paragraphs(text);
  const bulletLines = text.split("\n").filter(l => /^\s*[-*•]\s+/.test(l)).length;
  const totalLines = text.split("\n").filter(l => l.trim()).length;
  if (bulletLines >= 4 && totalLines > 0 && bulletLines / totalLines > 0.6) {
    findings.push(finding("bullet_spam", "advisory",
      `${bulletLines} of ${totalLines} lines are bullets.`));
  }

  const headings = text.split("\n").filter(l => /^\s*#{1,6}\s+/.test(l) || /^\s*\*\*[^*]+\*\*\s*$/.test(l)).length;
  if (headings >= 3 && paras.length <= headings * 2) {
    findings.push(finding("heading_spam", "advisory",
      `${headings} headings for ${paras.length} paragraphs.`));
  }

  const singleSentenceParas = paras.filter(p => !/\n/.test(p) && (p.match(/[.!?](\s|$)/g) ?? []).length === 1).length;
  if (paras.length >= 4 && singleSentenceParas / paras.length > 0.7) {
    findings.push(finding("one_sentence_paragraph_run", "advisory",
      `${singleSentenceParas} of ${paras.length} paragraphs are a single sentence.`));
  }

  if (paras.length >= 3) {
    const last = paras[paras.length - 1].toLowerCase();
    if (/^(in summary|to summarise|to sum up|in conclusion|overall)\b/.test(last)) {
      findings.push(finding("repeated_summary", "advisory",
        "Output ends with a summary of what it just said.", excerptFor(text, /^(in summary|to summarise|to sum up|in conclusion|overall)\b/im)));
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
  if (EM_DASH.test(humanisedText)) {
    return {
      accepted: false,
      text: checkedText,
      substanceChanges: [],
      reason: "The humanisation pass introduced an em dash, which is prohibited universally.",
    };
  }

  return { accepted: true, text: humanisedText, substanceChanges: [], reason: "Presentation improved without changing substance." };
}
