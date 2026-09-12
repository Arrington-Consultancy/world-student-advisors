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

/** UK first, then Germany and Canada, each recorded as itself. */
export const CAMPAIGN_DESTINATIONS: ReadonlyArray<{
  label: string;
  emphasis: "primary" | "secondary";
  note: string;
  value: DestinationValue;
}> = Object.freeze([
  { label: "United Kingdom", emphasis: "primary", value: "uk", note: "Where most WSA postgraduate applicants go, and where we know the admissions and visa route best." },
  { label: "Germany", emphasis: "secondary", value: "germany", note: "Considered where the course and your funding position fit." },
  { label: "Canada", emphasis: "secondary", value: "canada", note: "Considered where the course and your funding position fit." },
]);

/**
 * Values with no Pipedrive option of their own yet, and therefore no
 * mapping. Named here so the gap is visible rather than discovered later
 * as a hole in the reporting. Adding the option is a controlled change:
 * scripts/pipedrive-campaign-options.mjs, dry run first.
 */
export const PIPEDRIVE_OPTION_GAPS: ReadonlyArray<{
  field: "Desired Level of Study" | "Preferred Study Destination";
  value: string;
  optionLabel: string;
}> = Object.freeze([
  { field: "Desired Level of Study", value: "mres", optionLabel: "MRes research degree" },
  { field: "Preferred Study Destination", value: "germany", optionLabel: "Germany" },
]);
