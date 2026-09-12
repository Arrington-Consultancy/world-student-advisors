/**
 * The values the student signup form accepts for level of study and
 * destination, in one place so a campaign landing page can hand a student's
 * answers to that form without either side guessing.
 *
 * These are the existing option values on /contact, transcribed verbatim.
 * Nothing here changes what the form offers; it only names it, so a prefill
 * can be checked against the real list instead of trusted.
 *
 * TWO KNOWN LIMITS, both real and both worth WSA's attention rather than
 * quiet mapping:
 *
 * 1. The form cannot tell an MRes or an MPhil from a taught Master's. Both
 *    land in "postgraduate". So a campaign that advertises MRes and MPhil
 *    cannot currently report on them separately, and the CRM will not know
 *    which of the three a lead asked about.
 * 2. The form offers "Europe" as though it were a destination country, which
 *    the 12 September 2026 landing-page review says not to do. Germany has
 *    no value of its own, so a student who chooses Germany is recorded as
 *    "europe" and the detail is lost.
 */

export const DESIRED_LEVEL_VALUES = Object.freeze([
  "foundation", "hnd", "undergraduate", "top-up", "pre-masters",
  "postgraduate", "doctorate", "boarding", "language",
] as const);

export const DESTINATION_VALUES = Object.freeze([
  "uk", "usa", "canada", "europe", "multiple",
] as const);

export type DesiredLevelValue = (typeof DESIRED_LEVEL_VALUES)[number];
export type DestinationValue = (typeof DESTINATION_VALUES)[number];

export function isDesiredLevelValue(v: string): v is DesiredLevelValue {
  return (DESIRED_LEVEL_VALUES as readonly string[]).includes(v);
}
export function isDestinationValue(v: string): v is DestinationValue {
  return (DESTINATION_VALUES as readonly string[]).includes(v);
}
