/**
 * Near-match reasoning for student names.
 *
 * Tom Arrington, 17 September 2026: "if the spelling is slightly out the
 * worker should guess and question that; we should be looking for Tom's
 * when it's Thomas, or Tomas Carl when it's Karl; workers need to think
 * rather than just spit things out."
 *
 * This module proposes and ranks. It never decides that a record IS the
 * student: a near match is handed to the worker as a probable match with
 * the name as recorded, and the worker is instructed to say which record it
 * used and ask the staff member to confirm. Exact matches keep their
 * existing path; this runs only when the exact spellings found nothing.
 *
 * Three ideas, all deliberately simple and readable:
 *   1. Discovery terms. Pipedrive's name search matches on word prefixes,
 *      so the first letters of each name part find "Kitakang" from
 *      "Kitakhang", and a short form's long form finds "Thomas" from "Tom".
 *   2. Normalisation. Spellings that sound alike are compared alike:
 *      c and k, ph and f, y and i, doubled letters, accents.
 *   3. Scoring. Jaro-Winkler similarity per name part, with a nickname
 *      table counting as an exact part, and the surname weighted most.
 */

/** Short forms and their long forms. Each group is one person's name. */
const NICKNAME_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["thomas", "tom", "tommy", "tomas"],
  ["william", "will", "bill", "billy", "liam"],
  ["karl", "carl"],
  ["katherine", "catherine", "kathryn", "kate", "katie", "kathy", "cathy", "cath"],
  ["christopher", "chris", "kit"],
  ["christine", "christina", "chris", "tina"],
  ["elizabeth", "liz", "lizzie", "beth", "eliza", "betty"],
  ["michael", "mike", "mick", "micheal"],
  ["joseph", "joe", "joey"],
  ["joanne", "joanna", "jo"],
  ["nicholas", "nick", "nicolas"],
  ["benjamin", "ben", "benny"],
  ["samuel", "sam", "sammy"],
  ["samantha", "sam"],
  ["daniel", "dan", "danny"],
  ["matthew", "matt", "mathew"],
  ["alexander", "alex", "xander"],
  ["alexandra", "alex", "sandra"],
  ["stephen", "steven", "steve"],
  ["jonathan", "jon", "john", "johnny", "jonny"],
  ["anthony", "tony", "antony"],
  ["robert", "rob", "bob", "bobby", "robbie"],
  ["richard", "rick", "richie", "ricky"],
  ["edward", "ed", "eddie", "ted", "teddy"],
  ["james", "jim", "jimmy", "jamie"],
  ["margaret", "maggie", "meg", "peggy"],
  ["patricia", "pat", "trish", "tricia"],
  ["rebecca", "becky", "becca"],
  ["jennifer", "jen", "jenny"],
  ["victoria", "vicky", "vicki", "tori"],
  ["emmanuel", "manny", "emma"],
  ["oluwaseun", "seun"],
  ["oluwatobi", "tobi"],
  ["oluwafemi", "femi"],
  ["oluwakemi", "kemi"],
  ["chukwuemeka", "emeka"],
  ["chukwudi", "chudi"],
  ["chinedu", "nedu"],
  ["ngozi", "ngo"],
  ["abdulrahman", "rahman", "abdul"],
  ["mohammed", "mohammad", "muhammad", "mohamed", "muhammed"],
  ["ibrahim", "ibraheem", "ibro"],
  ["abubakar", "abu", "abubakr"],
  ["joyce", "joy"],
];

const NICKNAME_INDEX: Map<string, Set<string>> = (() => {
  const index = new Map<string, Set<string>>();
  for (const group of NICKNAME_GROUPS) {
    for (const name of group) {
      const set = index.get(name) ?? new Set<string>();
      for (const other of group) set.add(other);
      index.set(name, set);
    }
  }
  return index;
})();

/** True when the two name parts are recorded as forms of the same name. */
export function sameNameForm(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  return NICKNAME_INDEX.get(x)?.has(y) ?? false;
}

/** True when the part is a name WSA's list knows in any of its forms. */
export function isKnownNameForm(part: string): boolean {
  return NICKNAME_INDEX.has(part.toLowerCase());
}

/** Every recorded form of a name, the typed one first, capitalised for searching. */
export function nameForms(part: string): string[] {
  const lower = part.toLowerCase();
  const others = Array.from(NICKNAME_INDEX.get(lower) ?? []).filter(n => n !== lower);
  return [lower, ...others].map(n => n[0].toUpperCase() + n.slice(1));
}

/** The long forms a short form may stand for, for discovery searches. */
export function longForms(part: string): string[] {
  const set = NICKNAME_INDEX.get(part.toLowerCase());
  if (!set) return [];
  return Array.from(set).filter(n => n !== part.toLowerCase() && n.length > part.length);
}

/** Spellings that sound alike compare alike. */
export function normaliseNamePart(part: string): string {
  return part
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/ph/g, "f")
    .replace(/kh/g, "k")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/q/g, "k")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
}

/** Jaro-Winkler similarity, 0 to 1. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i += 1) {
    const from = Math.max(0, i - window), to = Math.min(b.length - 1, i + window);
    for (let j = from; j <= to; j += 1) {
      if (!bMatched[j] && a[i] === b[j]) { aMatched[i] = true; bMatched[j] = true; matches += 1; break; }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0, k = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** How alike two name parts are: 1 for the same name or a known form of it. */
export function partSimilarity(typed: string, recorded: string): number {
  if (sameNameForm(typed, recorded)) return 1;
  const a = normaliseNamePart(typed), b = normaliseNamePart(recorded);
  if (a === "" || b === "") return 0;
  if (a === b) return 0.98;
  // A short form that is a prefix of the recorded name ("Chi" for "Chidi").
  if (a.length >= 3 && b.startsWith(a)) return 0.9;
  return jaroWinkler(a, b);
}

export interface NameMatch<T> {
  candidate: T;
  /** 0 to 1. The surname carries the most weight. */
  score: number;
  /** Every typed part is the same name or a known form of it. */
  exact: boolean;
}

/**
 * Scores a typed name against a recorded one. Each typed part takes its
 * best counterpart among the recorded parts; the last typed part (the
 * surname as people type it) counts double. A recorded middle name the
 * staff member did not type costs nothing.
 */
export function nameMatchScore(typed: string, recorded: string): { score: number; exact: boolean } {
  const typedParts = typed.trim().split(/\s+/).filter(Boolean);
  const recordedParts = recorded.trim().split(/\s+/).filter(Boolean);
  if (typedParts.length === 0 || recordedParts.length === 0) return { score: 0, exact: false };
  // Read from both sides. From the typed side, a typed middle name the
  // record does not carry ("Vivian Ene Onuh" against "VIVIAN ONUH") costs
  // nothing. From the record's side, trailing words the person typed that
  // are not part of the name at all ("Joyce Kitakang Federal Ministry"
  // against "Joyce Iya Kitakang") cost nothing either, provided the record's
  // own first and last names are both present in what was typed. The better
  // reading wins; neither can invent a match the other side contradicts.
  const fromTyped = onePerspective(typedParts, recordedParts);
  const fromRecord = onePerspective(recordedParts, typedParts);
  return fromRecord.score > fromTyped.score ? fromRecord : fromTyped;
}

function onePerspective(parts: string[], against: string[]): { score: number; exact: boolean } {
  let weighted = 0, weightTotal = 0, exact = true;
  parts.forEach((part, index) => {
    const best = Math.max(...against.map(r => partSimilarity(part, r)));
    const isMiddle = index > 0 && index < parts.length - 1;
    // A middle name either matches nearly exactly or is treated as absent;
    // a short middle name ("Iya") scores spuriously against long words.
    if (isMiddle && best < 0.85) return;
    const weight = index === parts.length - 1 ? 2 : 1;
    weighted += best * weight;
    weightTotal += weight;
    if (best < 1) exact = false;
  });
  if (weightTotal === 0) return { score: 0, exact: false };
  return { score: weighted / weightTotal, exact };
}

export const PROBABLE_THRESHOLD = 0.86;
export const POSSIBLE_THRESHOLD = 0.76;
/** A probable match must beat the runner-up by this much to be offered alone. */
export const CLEAR_MARGIN = 0.05;

export type Ranking<T> =
  | { kind: "exact"; match: NameMatch<T> }
  | { kind: "probable"; match: NameMatch<T>; others: NameMatch<T>[] }
  | { kind: "several"; matches: NameMatch<T>[] }
  | { kind: "none" };

/** Ranks candidates against the typed name and says how sure the ranking is. */
export function rankNameMatches<T extends { name: string }>(typed: string, candidates: readonly T[]): Ranking<T> {
  const seen = new Set<string>();
  const scored: NameMatch<T>[] = [];
  for (const candidate of candidates) {
    const key = JSON.stringify([candidate.name, (candidate as { personId?: unknown }).personId ?? null]);
    if (seen.has(key)) continue;
    seen.add(key);
    const { score, exact } = nameMatchScore(typed, candidate.name);
    scored.push({ candidate, score, exact });
  }
  scored.sort((a, b) => b.score - a.score);
  const exactOnes = scored.filter(m => m.exact);
  if (exactOnes.length === 1) return { kind: "exact", match: exactOnes[0] };
  const possible = scored.filter(m => m.score >= POSSIBLE_THRESHOLD);
  if (possible.length === 0) return { kind: "none" };
  const [first, second] = possible;
  if (first.score >= PROBABLE_THRESHOLD && (!second || first.score - second.score >= CLEAR_MARGIN)) {
    return { kind: "probable", match: first, others: possible.slice(1, 4) };
  }
  return { kind: "several", matches: possible.slice(0, 4) };
}

/**
 * Search terms for discovering near matches, when the exact spellings found
 * nothing. Prefix stems of each part, long forms of a short first name, and
 * the c/k and ph/f spellings of the surname. Bounded, distinct, in order of
 * usefulness. The surname comes first because it narrows most.
 */
export function fuzzySearchTerms(typed: string): string[] {
  const parts = typed.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const surname = parts[parts.length - 1];
  const first = parts[0];
  const out: string[] = [];
  const push = (t: string) => { const v = t.trim(); if (v.length >= 3 && !out.some(o => o.toLowerCase() === v.toLowerCase())) out.push(v); };
  const stem = (p: string) => p.slice(0, Math.max(3, Math.min(5, Math.ceil(p.length * 0.6))));
  push(stem(surname));
  for (const variant of spellingVariants(surname)) push(variant);
  for (const long of longForms(first)) push(long[0].toUpperCase() + long.slice(1));
  if (parts.length >= 2) push(stem(first));
  return out.slice(0, 6);
}

/** The commonest alternative spellings of one name part. */
export function spellingVariants(part: string): string[] {
  const lower = part.toLowerCase();
  const variants = new Set<string>();
  const swap = (from: string, to: string) => { if (lower.includes(from)) variants.add(lower.split(from).join(to)); };
  swap("ck", "k"); swap("kh", "k"); swap("k", "c"); swap("c", "k"); swap("ph", "f"); swap("f", "ph"); swap("y", "i"); swap("i", "y");
  variants.delete(lower);
  return Array.from(variants).map(v => v[0].toUpperCase() + v.slice(1));
}
