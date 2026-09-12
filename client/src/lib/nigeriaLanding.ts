/**
 * Nigeria postgraduate landing page: the content, kept out of the
 * component so it can be tested without React.
 *
 * EVERY CLAIM ON THIS PAGE IS SOURCED. Tom Arrington, 12 September 2026:
 * trust and credibility rather than sales copy, and nothing fabricated.
 * The first-draft visual carried several claims WSA cannot currently
 * evidence ("British Council recognised", "Established 2012", a 24-hour
 * response promise, and two student testimonials with photographs). None
 * of them appear here. A claim arrives on this page only when a WSA
 * record supports it, and `EVIDENCE_NEEDED` lists what is still waiting.
 *
 * The British Council wording is deliberate and narrow. The certificate
 * in SharePoint states, in the British Council's own words, that it "does
 * not formally endorse, accredit or validate agents and counsellors" and
 * awards the certificate to individuals for their knowledge of the UK as
 * a study destination. So the page credits the individual, never WSA, and
 * shows that sentence beside the credential.
 */

import type { DesiredLevelValue, DestinationValue } from "@shared/studentEnquiryOptions";

export type ProgrammeLevel = "taught_masters" | "mres" | "mphil" | "phd";

/**
 * The scope Tom asked for on 12 September 2026. It is wider than the
 * controlled Google Ads brief of 15 August 2026, which covers taught
 * Master's only. That conflict is unresolved, so this page is a working
 * draft and must not take paid traffic until the brief is reconciled.
 */
export const PROGRAMME_SCOPE: ReadonlyArray<{
  id: ProgrammeLevel;
  label: string;
  note: string;
  /**
   * What the signup form will actually record. The form has no value for
   * MRes or MPhil, so all three Master's routes are recorded as
   * "postgraduate" and the distinction is lost on the way into the CRM.
   * That is a reporting gap, not a mapping decision to be buried here.
   */
  recordedAs: DesiredLevelValue;
}> = Object.freeze([
  { id: "taught_masters", label: "Taught Master's", note: "MA, MSc and MBA programmes", recordedAs: "postgraduate" },
  { id: "mres", label: "MRes", note: "Master's by research", recordedAs: "postgraduate" },
  { id: "mphil", label: "MPhil", note: "Research degree, often a route to PhD", recordedAs: "postgraduate" },
  { id: "phd", label: "PhD", note: "Doctoral research", recordedAs: "doctorate" },
]);

/** True when the CRM cannot tell two advertised programmes apart. */
export function scopeIsDistinguishableInCrm(): boolean {
  return new Set(PROGRAMME_SCOPE.map(p => p.recordedAs)).size === PROGRAMME_SCOPE.length;
}

export const SCOPE_CONFLICT_NOTE =
  "The controlled Google Ads brief of 15 August 2026 covers taught Master's only and excludes MRes, MPhil and PhD. " +
  "This page follows Tom Arrington's wider direction of 12 September 2026. The brief must be reconciled before paid traffic runs.";

/** UK first, then Germany and Canada. No thumbnails: the draft's flag strip made the page busy. */
export const DESTINATIONS: ReadonlyArray<{
  name: string;
  emphasis: "primary" | "secondary";
  note: string;
  /** Germany has no value of its own on the signup form and lands in "europe". */
  recordedAs: DestinationValue;
}> = Object.freeze([
  { name: "United Kingdom", emphasis: "primary", note: "Where most WSA postgraduate applicants go, and where we know the admissions and visa route best.", recordedAs: "uk" },
  { name: "Germany", emphasis: "secondary", note: "Considered where the course and your funding position fit.", recordedAs: "europe" },
  { name: "Canada", emphasis: "secondary", note: "Considered where the course and your funding position fit.", recordedAs: "canada" },
]);

export const OTHER_DESTINATIONS_NOTE =
  "Other European destinations may be discussed with your counsellor. We do not treat Europe as a single country.";

/**
 * What WSA offers, in the grouping Tom asked for. "Application Support"
 * covers CV, personal statement and course selection as one proposition
 * rather than explaining the whole process on the page.
 */
export interface Benefit { title: string; body: string; source: string }

export const BENEFITS: ReadonlyArray<Benefit> = Object.freeze([
  {
    title: "Your own Personal Student Counsellor",
    body: "One named person who knows your case, from your first question through to your offer and your visa preparation. Not a call centre and not a different adviser each time.",
    source: "WSA main USP, Implementation Direction 12 September 2026.",
  },
  {
    title: "Application Support",
    body: "Help with your CV, your personal statement and choosing courses and universities that match your degree, your grades and what you want to do next.",
    source: "Implementation Direction 12 September 2026: group CV, personal statement and application preparation as one proposition.",
  },
  {
    title: "Free Mock Interview for WSA students",
    body: "A practice interview with feedback before the real one, at no cost to students working with WSA.",
    source: "Implementation Direction 12 September 2026. WSA runs an Interview Coach service on the main site.",
  },
  {
    title: "Student Visa preparation support",
    body: "Preparation for your Student visa application: CAS, financial evidence, documents and credibility interview practice where it applies. We prepare you. The decision is always the Home Office's.",
    source: "Implementation Direction 12 September 2026: prefer 'Student Visa preparation support' to 'Full Visa Support'.",
  },
]);

/**
 * Real WSA people, both already published on /counsellors with genuine
 * photographs. No profile appears here without a photograph WSA already
 * holds, and no credential appears without the certificate to open.
 */
export interface CounsellorProfile {
  name: string;
  role: string;
  location: string;
  photo: string;
  /** Present only where WSA holds the actual certificate. */
  credential: {
    label: string;
    validUntil: string;
    certificateCode: string;
    /** The British Council's own words, printed on the certificate. */
    disclaimer: string;
    /** Null until the file is placed in the campaign location and cleared for publication. */
    href: string | null;
  } | null;
}

export const BRITISH_COUNCIL_DISCLAIMER =
  "The British Council does not formally endorse, accredit or validate agents and counsellors. " +
  "It awards this certificate to individuals for their knowledge and awareness of the UK as a study destination.";

export const COUNSELLORS: ReadonlyArray<CounsellorProfile> = Object.freeze([
  {
    name: "Maryam Lawal",
    role: "Director for Nigeria",
    location: "Nigeria",
    photo: "/manus-storage/maryam_lawal_52fa19ff.png",
    credential: {
      label: "British Council UK Agent and Counsellor Training, completed",
      validUntil: "10 August 2028",
      certificateCode: "116270",
      disclaimer: BRITISH_COUNCIL_DISCLAIMER,
      href: null,
    },
  },
  {
    name: "Babatunde Abdulia Azeez",
    role: "Senior Director for Nigeria",
    location: "Ibadan, Oyo State, Nigeria",
    photo: "/manus-storage/babatunde_azeez_1f9d8fb7.png",
    credential: null,
  },
]);

/** The real library, already built and populated: 39 resources with podcasts and summaries. */
export const LIBRARY = Object.freeze({
  path: "/student-support-library",
  title: "WSA Student Support Library",
  body: "Podcasts and written summaries on applications, study costs, accommodation, visas and interviews. Free to use, no sign-up needed to browse.",
});

/**
 * Claims WSA cannot yet evidence, kept here rather than on the page.
 * Each was either on the first-draft visual or asked for, and each needs
 * a WSA record before it can be published.
 */
export const EVIDENCE_NEEDED: ReadonlyArray<{ claim: string; why: string }> = Object.freeze([
  { claim: "\"British Council recognised\" as a WSA organisational status", why: "The certificate WSA holds is an individual training award and explicitly says the British Council does not accredit or endorse agents. WSA business cards currently print \"Accredited by the British Council\", which the certificate contradicts." },
  { claim: "\"Established 2012\"", why: "On the first-draft footer. No WSA incorporation or trading record has been cited for this page." },
  { claim: "\"We will get back to you within 24 hours\"", why: "On the first-draft hero. A response-time promise needs a service standard WSA is willing to be held to." },
  { claim: "Student testimonials and outcome quotes", why: "The first draft carried two quoted students with photographs. No consented, attributable WSA testimonial has been supplied, so none appear." },
  { claim: "Any admission, visa or outcome success rate", why: "Not claimed anywhere on this page, and should not be added without evidence." },
  { claim: "A published help phone number", why: "The direction allows Eldah's WSA number once verified from an authorised source. Not yet verified, so no number appears." },
]);

/**
 * A Nigerian number as people actually write it, turned into the
 * international form the signup form expects.
 *
 * Typed as 08012345678, a local Nigerian mobile was handed over unchanged
 * and the international phone field read it as country code "+08",
 * producing "+08 0123 45678". The student would then have had to notice
 * and correct a mangled number on the next page, on the one field we most
 * need to be right.
 *
 * This page is for Nigerian graduates, so a bare local number is assumed
 * Nigerian and given +234. Anything the student writes with a "+" is
 * already international and is left exactly as it is, because guessing at
 * a number that already states its country would be worse than doing
 * nothing. An empty or implausible value is dropped rather than passed on.
 */
export const NIGERIA_DIALLING_CODE = "+234";

export function toInternationalNigerianNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }
  let digits = trimmed.replace(/\D/g, "");
  // 00 as the international prefix, then a country code.
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits.length >= 8 ? `+${digits}` : null;
  }
  // Already carries Nigeria's country code without the plus.
  if (digits.startsWith("234")) return digits.length >= 12 ? `+${digits}` : null;
  // A national number: one leading trunk zero, dropped for the international form.
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 9 && digits.length <= 11 ? `${NIGERIA_DIALLING_CODE}${digits}` : null;
}
