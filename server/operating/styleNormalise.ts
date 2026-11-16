/**
 * Mechanical style normalisation, before the release check.
 *
 * Tom Arrington, 16 September 2026: "A punctuation style violation must
 * not destroy an otherwise valid answer. If an answer contains a
 * mechanically correctable writing style violation such as an em dash,
 * automatically correct it and revalidate the answer." The Global Writing
 * Standard's ban on the em dash stands; what changes is that the pipeline
 * fixes the punctuation itself and then checks the result, instead of
 * throwing away a correct answer because the model reached for a dash.
 *
 * Only punctuation is touched, and only the constructions the check would
 * otherwise flag: the em dash in every form (the code point, the HTML
 * entity, the numeric entities) and the double hyphen used as prose
 * punctuation. Nothing else is rewritten; a factual, evidential,
 * permission, remit or guarantee failure is exactly as blocking as before,
 * because none of those is punctuation. The caller compares the result
 * against the original with findSubstanceChanges and falls back to the
 * original if anything but punctuation moved, which would then block as
 * it always did.
 *
 * The dash is written by code point, never as the literal character, for
 * the same reason as in qualityCheck.ts: a scan for em dashes in the
 * source must not need an exception for the code that removes them.
 */
const EM_DASH_ANY = /\u2014|&mdash;|&#8212;|&#x2014;/gi;
const DOUBLE_HYPHEN_TIGHT = /([A-Za-z0-9])--([A-Za-z0-9])/g;
const DOUBLE_HYPHEN_SPACED = /([A-Za-z0-9]) -- ([A-Za-z0-9])/g;

export interface StyleNormalisation {
  text: string;
  /** How many constructions were replaced. Zero means the text is returned as given. */
  replacements: number;
  /** One line for a reason or an audit row. Empty when nothing changed. */
  summary: string;
}

/**
 * Replace each em dash with the ordinary punctuation the sentence position
 * calls for: a list marker at the start of a line becomes a hyphen; a dash
 * closing a line or a sentence becomes a full stop; a dash between words,
 * spaced or tight, becomes a comma. A pair of dashes bracketing an aside
 * therefore becomes a pair of commas, which is how the aside would have
 * been punctuated by hand.
 */
export function normaliseMechanicalStyle(input: string): StyleNormalisation {
  let replacements = 0;
  let text = input.replace(/\r\n/g, "\n");

  // Line-leading dash used as a bullet.
  text = text.replace(/^([ \t]*)(?:\u2014|&mdash;|&#8212;|&#x2014;)[ \t]*/gim, (_m, indent: string) => { replacements += 1; return `${indent}- `; });
  // Dash closing a line or the text: it was standing in for a full stop.
  text = text.replace(/[ \t]*(?:\u2014|&mdash;|&#8212;|&#x2014;)[ \t]*(?=\n|$)/gi, () => { replacements += 1; return "."; });
  // Dash before closing punctuation: drop it.
  text = text.replace(/[ \t]*(?:\u2014|&mdash;|&#8212;|&#x2014;)[ \t]*(?=[.,;:!?)\]])/gi, () => { replacements += 1; return ""; });
  // Everything else: a comma.
  text = text.replace(/[ \t]*(?:\u2014|&mdash;|&#8212;|&#x2014;)[ \t]*/gi, () => { replacements += 1; return ", "; });
  if (EM_DASH_ANY.test(text)) {
    // Defensive: the passes above are exhaustive, but a dash that somehow
    // survived is replaced rather than shipped.
    text = text.replace(EM_DASH_ANY, () => { replacements += 1; return ", "; });
  }

  text = text.replace(DOUBLE_HYPHEN_TIGHT, (_m, a: string, b: string) => { replacements += 1; return `${a}, ${b}`; });
  text = text.replace(DOUBLE_HYPHEN_SPACED, (_m, a: string, b: string) => { replacements += 1; return `${a}, ${b}`; });

  // Tidy what the substitutions can leave behind: a comma already there,
  // a doubled space, a space before a comma or full stop.
  text = text.replace(/,\s*,/g, ",").replace(/ {2,}/g, " ").replace(/ ([,.])/g, "$1").replace(/,\.(?=\s|$)/g, ".");

  if (replacements === 0) return { text: input, replacements: 0, summary: "" };
  return {
    text,
    replacements,
    summary: `${replacements} em dash${replacements === 1 ? "" : "es"} or double hyphen${replacements === 1 ? "" : "s"} replaced with ordinary punctuation before the release check.`,
  };
}

/**
 * Markdown to plain text, for the Staff Portal's chat panel.
 *
 * Tom Arrington, 16 September 2026: raw "**CAS / Visa / Pre-Departure**"
 * reached the screen because the panel renders text, not Markdown. The
 * prompt now asks for plain text; this is the guarantee behind the ask.
 * Emphasis markers, heading marks, inline code ticks and horizontal rules
 * are removed, and asterisk or plus bullets become hyphen bullets. Words,
 * numbers, dates and negations are untouched, which is what the caller's
 * substance comparison confirms before the result is used.
 */
export function stripMarkdown(input: string): StyleNormalisation {
  let replacements = 0;
  let text = input.replace(/\r\n/g, "\n");

  // Heading marks: "## Next steps" becomes "Next steps".
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, () => { replacements += 1; return ""; });
  // Bold and bold-italic, asterisk or underscore form.
  text = text.replace(/\*{2,3}(\S(?:[^*\n]*?\S)?)\*{2,3}/g, (_m, inner: string) => { replacements += 1; return inner; });
  text = text.replace(/__(\S(?:[^_\n]*?\S)?)__/g, (_m, inner: string) => { replacements += 1; return inner; });
  // Italic with single asterisks around a word or phrase. "5 * 3" is not one.
  text = text.replace(/(^|[\s(])\*(\S(?:[^*\n]*?\S)?)\*(?=[\s.,;:!?)]|$)/gm, (_m, lead: string, inner: string) => { replacements += 1; return `${lead}${inner}`; });
  // Inline code ticks.
  text = text.replace(/`([^`\n]+)`/g, (_m, inner: string) => { replacements += 1; return inner; });
  // Asterisk, plus or bullet-character list markers become hyphens.
  text = text.replace(/^([ \t]*)[*+\u2022][ \t]+/gm, (_m, indent: string) => { replacements += 1; return `${indent}- `; });
  // A horizontal rule is a line of three or more hyphens, asterisks or underscores on its own.
  text = text.replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, () => { replacements += 1; return ""; });
  // Three or more blank lines left behind collapse to one blank line.
  text = text.replace(/\n{3,}/g, "\n\n");

  if (replacements === 0) return { text: input, replacements: 0, summary: "" };
  return {
    text,
    replacements,
    summary: `${replacements} Markdown marker${replacements === 1 ? "" : "s"} removed for the plain-text panel.`,
  };
}
