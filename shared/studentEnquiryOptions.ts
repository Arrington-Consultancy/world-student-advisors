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
  // The postgraduate routes, kept separate all the way to the CRM.
  "postgraduate", "mphil", "mres", "doctorate",
  "boarding", "language",
  // Offered by the signup form and now by the Nigeria campaign. Added to
  // this list 15 September 2026 so a campaign page may emit it: prefill is
  // validated against these values, so "other" was previously dropped on
  // the hop to the signup form.
  "other",
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
 * The programme routes in the campaign scope, with the form value each one
 * is recorded as. Every one is distinct: this list having distinct values
 * is the whole point, and a test asserts it.
 *
 * CHANGED 15 September 2026 on Tim Hunt's instruction: MRes removed, Other
 * added as the last option. RESTORED 16 September 2026 on Tom Arrington's
 * campaign brief: the controlled Google Ads Brief v2.1 (14 September 2026)
 * approves Taught Master's, MPhil, MRes and PhD and requires all four to be
 * named in the form, and Tom's instruction of 16 September is that the page
 * "correctly represents all four programme types" and that MRes must not be
 * excluded. Other stays last, as Tim asked. MRes maps to Pipedrive option
 * 314, so the measurement contract in brief section 22 holds.
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
  // Tim Hunt, 15 September 2026: "Other IN as the last option." Last in the
  // list because that is where he asked for it, and because a catch-all
  // above a named programme trains people to stop reading.
  { label: "Other", note: "Something else, or not sure yet", value: "other" },
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
  /**
   * What the enquiry form's dropdown shows, and therefore what a submission
   * records. Deliberately NOT Tim's landing-page wording: he writes "USA" in
   * the destination copy below while the form keeps "United States", so the
   * two are separate fields and only `placementLabel` carries his copy.
   */
  label: string;
  /**
   * Primary or secondary destination. Retained as data; the destination list
   * now leads with `flag` rather than a tinted icon, per Tim's 16 September
   * 2026 presentation.
   */
  emphasis: "primary" | "secondary";
  /** Emoji flag, as Tim supplied it on 16 September 2026. */
  flag: string;
  /** How the destination is named in "Where we place postgraduates". */
  placementLabel: string;
  /** Tim's destination copy, verbatim. */
  note: string;
  value: DestinationValue;
}> = Object.freeze([
  // The destination copy below is Tim Hunt's, supplied verbatim in "Nigeria
  // Landing Page - changes 16 Sept 2026.docx" and not edited here. It
  // supersedes the shorter notes set in his 14 September review.
  { label: "United Kingdom", emphasis: "primary", value: "uk", flag: "\u{1F1EC}\u{1F1E7}", placementLabel: "United Kingdom",
    note: "Our main destination, supported by WSA\u2019s strong network of UK universities and education partners." },
  { label: "United States", emphasis: "secondary", value: "usa", flag: "\u{1F1FA}\u{1F1F8}", placementLabel: "USA",
    note: "The land of opportunity, with world leading universities and an enormous choice of postgraduate programmes." },
  { label: "Canada", emphasis: "secondary", value: "canada", flag: "\u{1F1E8}\u{1F1E6}", placementLabel: "Canada",
    note: "A major international study destination with opportunities for talented graduates and skilled professionals." },
  { label: "Germany", emphasis: "secondary", value: "germany", flag: "\u{1F1E9}\u{1F1EA}", placementLabel: "Germany",
    note: "An excellent option for postgraduate study, with a wide range of Master\u2019s programmes taught entirely in English and many competitively priced study options. (www.daad.de)" },
  { label: "Other European destinations", emphasis: "secondary", value: "europe", flag: "\u{1F1EA}\u{1F1FA}", placementLabel: "Other European destinations",
    note: "WSA has strong links across Europe, particularly in Cyprus, Hungary, France and the Netherlands, as well as other EU countries. We consider each country individually to find the right course, university and budget for you." },
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
  mres: 314, // MRes research degree (added to production 12 September 2026)
  doctorate: 45, // PhD Doctorate
  other: 46, // Other / Not Sure
  uk: 78, // United Kingdom (UK)
  usa: 85, // United States
  canada: 86, // Canada
  germany: 315, // Germany
  europe: 84, // Other European Counties (Pipedrive's spelling)
} as const);
