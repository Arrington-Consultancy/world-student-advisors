/**
 * Term matching for the receptionist.
 *
 * Split out from the router because the matching was quietly wrong in two
 * ways that both produced the same visible symptom: reception saying it
 * could not identify an owner for an ordinary question.
 *
 * First, matching was substring-based. "post" matched "postgraduate", so
 * "postgraduate application" scored for the social-media specialist as
 * well as admissions, and the longer accidental match could win. Terms
 * are now matched on whole words.
 *
 * Second, the vocabulary was drawn narrowly from role titles, so it held
 * "course research" but not "course". A staff member asking "what English
 * courses are available" hit nothing at all, which reads as a broken
 * assistant rather than as a vocabulary gap.
 *
 * Plurals and a few common endings are normalised so "courses",
 * "admissions" and "applying" reach the same terms as their stems.
 */

/** Lowercase, strip punctuation, split to words, normalise simple endings. */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(stem);
}

/**
 * A deliberately small stemmer. Enough to join courses/course and
 * applying/apply, and nothing clever enough to create false matches of
 * its own.
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

/**
 * Does this sequence of terms appear as consecutive whole words?
 * A single-word term must match a whole token, never part of one.
 */
export function matchesTerm(tokens: readonly string[], term: string): boolean {
  const termTokens = tokenise(term);
  if (termTokens.length === 0) return false;
  for (let i = 0; i + termTokens.length <= tokens.length; i++) {
    let hit = true;
    for (let j = 0; j < termTokens.length; j++) {
      if (tokens[i + j] !== termTokens[j]) {
        hit = false;
        break;
      }
    }
    if (hit) return true;
  }
  return false;
}

/**
 * Score a request against one domain's terms.
 *
 * A longer term scores higher, so "paid media" beats a stray "media" and
 * a two-word phrase beats a one-word coincidence. Squaring the word count
 * makes a specific phrase decisively stronger than several vague hits.
 */
export function scoreTerms(tokens: readonly string[], terms: readonly string[]): number {
  let score = 0;
  for (const term of terms) {
    if (matchesTerm(tokens, term)) {
      const words = tokenise(term).length;
      score += words * words;
    }
  }
  return score;
}
