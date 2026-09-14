/**
 * The values the student signup form accepts for level of study and
 * destination, in one place so a campaign landing page can hand a
 * student's answers to that form without either side guessing, and so the
 * Pipedrive mapping can be checked against the same list.
 *
 * WHY THESE EXIST SEPARATELY. Tom Arrington, 12 September 2026: the Nigeria
 * campaign covers Taught Master's, MPhil, MRes and PhD, and WSA must be
 * able to measure which of the four produced leads, applications and
 * enrolments. Collapsing them into one "postgraduate" value would make
 * that measurement impossible after the fact, and no amount of later
 * analysis recovers a distinction that was never recorded.
 *
 * The same applies to destination. Germany is not "Europe": a campaign
 * that advertises Germany and records it as a continent cannot tell you
 * whether Germany worked.
 *
 * MAPPING RULE. A value here maps to a real Pipedrive option or it does
 * not map at all. Mapping to "the nearest thing" is how Australia used to
 * be recorded as New Zealand; the comment in server/pipedrive.ts still
 * warns about it. Where Pipedrive has no option yet, that is recorded in
 * PIPEDRIVE_OPTION_GAPS and fixed by adding the option, not by rounding.
 */

export const DESIRED_LEVEL_VALUES = Object.freeze([
  "foundation", "hnd", "undergraduate", "top-up", "pre-masters",
  // The four postgraduate routes the Nigeria campaign advertises. Kept
  // separate all the way to the CRM.
  "postgraduate", "mphil", "mres", "doctorate",
  "boarding", "language",
] as const);

export const DESTINATION_VALUES = Object.freeze([
  "uk", "germany", "usa", "canada", "europe", "multiple",
] as const);

export type DesiredLevelValue = (typeof DESIRED_LEVEL_VALUES)[number];
export type DestinationValue = (typeof DESTINATION_VALUES)[number];

export function isDesiredLevelValue(v: string): v is DesiredLevelValue {
  return (DESIRED_LEVEL_VALUES as readonly string[]).includes(v);
}
export function isDestinationValue(v: string): v is DestinationValue {
  return (DESTINATION_VALUES as readonly string[]).includes(v);
}

/**
 * The four programme routes in the approved campaign scope, with the form
 * value each one is recorded as. Every one is distinct: this list having
 * four entries and four distinct values is the whole point, and a test
 * asserts it.
 *
 * "postgraduate" carries Taught Master's for historical reasons — it is
 * the value the live form has always used and it already maps to
 * Pipedrive's "Taught Master's" option, so renaming it would orphan
 * existing records for no gain.
 */
export const CAMPAIGN_PROGRAMMES: ReadonlyArray<{
  label: string;
  note: string;
  value: DesiredLevelValue;
}> = Object.freeze([
  { label: "Taught Master's", note: "MA, MSc and MBA programmes", value: "postgraduate" },
  { label: "MPhil", note: "Research degree, often a route to PhD", value: "mphil" },
  { label: "MRes", note: "Master's by research", value: "mres" },
  { label: "PhD", note: "Doctoral research", value: "doctorate" },
]);

/**
 * UK first, then the other destinations WSA actually works with, each
 * recorded as itself.
 *
 * United States and Other European destinations added 14 September 2026 on
 * Tim Hunt's landing page review: "We have USA and Europe." Both already
 * existed as distinct Pipedrive options (85 and 84) and as values the
 * signup form offers, so this widens what the campaign advertises without
 * inventing anything downstream.
 *
 * "Other European destinations" is deliberately not "Europe". The rule
 * that Germany is recorded as Germany is unchanged: this is the catch-all
 * for the European countries that have no option of their own, and it
 * never absorbs one that has.
 */
export const CAMPAIGN_DESTINATIONS: ReadonlyArray<{
  label: string;
  emphasis: "primary" | "secondary";
  note: string;
  value: DestinationValue;
}> = Object.freeze([
  { label: "United Kingdom", emphasis: "primary", value: "uk", // "Where most applicants go" and "where we know the route best" were
    // both stronger than WSA can currently evidence, so neither is claimed.
    note: "Our main destination for this campaign." },
  { label: "United States", emphasis: "secondary", value: "usa", note: "Considered where the course and your funding position fit." },
  { label: "Canada", emphasis: "secondary", value: "canada", note: "Considered where the course and your funding position fit." },
  { label: "Germany", emphasis: "secondary", value: "germany", note: "Considered where the course and your funding position fit." },
  { label: "Other European destinations", emphasis: "secondary", value: "europe", note: "European countries with no option of their own, considered one country at a time." },
]);

/**
 * Values with no Pipedrive option of their own, and therefore no mapping.
 * Empty since 12 September 2026: MRes and Germany were the only two, and
 * both now have real options (314 and 315), added and verified through
 * scripts/pipedrive-campaign-options.mjs.
 *
 * It stays here, empty, on purpose. The next campaign that advertises
 * something Pipedrive cannot record should list it here rather than round
 * it to a neighbouring option, and a test asserts that anything listed
 * here is genuinely absent from the Pipedrive maps.
 */
export const PIPEDRIVE_OPTION_GAPS: ReadonlyArray<{
  field: "Desired Level of Study" | "Preferred Study Destination";
  value: string;
  optionLabel: string;
}> = Object.freeze([]);

/**
 * Every campaign value and the Pipedrive option id it is recorded as.
 * This is the measurement contract: four programmes, four ids; five
 * destinations, five ids; no two sharing one.
 */
export const PIPEDRIVE_CAMPAIGN_OPTION_IDS = Object.freeze({
  postgraduate: 43, // Taught Master's
  mphil: 44, // MPhil research degree
  mres: 314, // MRes research degree
  doctorate: 45, // PhD Doctorate
  uk: 78, // United Kingdom (UK)
  usa: 85, // United States
  canada: 86, // Canada
  germany: 315, // Germany
  europe: 84, // Other European Counties (Pipedrive's spelling)
} as const);
