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
 * The British Council wording is deliberate and narrow. Each certificate
 * in SharePoint states, in the British Council's own words, that it "does
 * not formally endorse, accredit or validate agents and counsellors" and
 * awards the certificate to individuals for their knowledge of the UK as
 * a study destination. So the page credits the individual, never WSA, and
 * shows that sentence beside the credential.
 */
import {
  CAMPAIGN_DESTINATIONS,
  CAMPAIGN_PROGRAMMES,
  type DestinationValue,
} from "@shared/studentEnquiryOptions";

export { CAMPAIGN_DESTINATIONS, CAMPAIGN_PROGRAMMES };

/**
 * The approved scope, confirmed by Tom Arrington on 12 September 2026:
 * Taught Master's, MPhil, MRes and PhD.
 *
 * The controlled Google Ads brief of 15 August 2026 covered taught
 * Master's only and excluded MRes, MPhil and PhD by name. That conflict
 * was the page's one hard launch blocker, and it is now closed: the brief
 * was reissued as version 2.0 on 12 September 2026 to the four-programme
 * scope, and filed in 11_SOCIAL_MEDIA/01_CAMPAIGNS. The 15 August document
 * remains in place unchanged as the superseded record.
 *
 * The page stays a draft, because "the brief no longer contradicts it" is
 * not the same decision as "launch it". That one is Tom's.
 */
export const SCOPE_STATUS_NOTE =
  "Campaign scope: Taught Master's, MPhil, MRes and PhD, confirmed by Tom Arrington on 12 September 2026. " +
  "The controlled Google Ads brief was reissued as version 2.0 on the same date to match that scope, " +
  "superseding the taught Master's only brief of 15 August 2026. Published on Tom's GO of 12 September 2026; paid traffic is a separate decision.";

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
 * Real WSA people, both already published on /our-team with genuine
 * photographs. No profile appears here without a photograph WSA already
 * holds, and no credential appears without the certificate to open.
 */
export interface CounsellorProfile {
  name: string;
  role: string;
  location: string;
  photo: string;
  /** Shown only where the person has approved it in writing. */
  contact: { whatsapp: string; whatsappHref: string; email: string } | null;
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
  /** Where the consent to publish this profile is recorded. */
  consentSource: string | null;
}

/**
 * The non-endorsement point, short enough to read on a phone.
 *
 * The certificate's full wording is "The British Council does not formally
 * endorse, accredit or validate agents and counsellors. It only awards this
 * certificate to individuals for their knowledge and awareness of the UK as
 * a study destination." This keeps both halves of that, in one sentence,
 * because the substance is what matters: no endorsement of WSA, and the
 * award belongs to the individual.
 */
export const BRITISH_COUNCIL_DISCLAIMER =
  "The British Council does not endorse, accredit or validate agents. This certificate recognises an individual's knowledge of the UK as a study destination.";

/**
 * Eldah Therone confirmed in writing on 12 September 2026 that she is
 * happy with the photograph, and that the telephone number, email address,
 * job title and certificate displayed are correct. That email is filed at
 * 11_SOCIAL_MEDIA/01_CAMPAIGNS/Eldah_Profile_Consent_and_Verified_Contact_12_Sep_2026.jpeg.
 * Her contact details appear here because she approved them, and for no
 * other reason.
 *
 * Babatunde Azeez is the Nigeria-based male counsellor. WSA holds his
 * photograph, already published on /our-team, but no British Council
 * certificate and no written consent to publish contact details, so his
 * card carries neither.
 */
export const COUNSELLORS: ReadonlyArray<CounsellorProfile> = Object.freeze([
  {
    name: "Eldah Therone",
    role: "Student Counsellor",
    location: "Nairobi, Kenya",
    photo: "/manus-storage/eldah_therone_6c167959.jpg",
    contact: {
      whatsapp: "+44 7470 689 849",
      whatsappHref: "https://wa.me/447470689849",
      email: "Eldah@WorldStudentAdvisors.com",
    },
    credential: {
      label: "British Council UK Agent and Counsellor Training, completed",
      validUntil: "28 April 2027",
      certificateCode: "67976",
      disclaimer: BRITISH_COUNCIL_DISCLAIMER,
      href: null,
    },
    consentSource: "Approved by Eldah Therone in writing, 12 September 2026.",
  },
  {
    name: "Babatunde Abdulia Azeez",
    role: "Senior Director for Nigeria",
    location: "Ibadan, Oyo State, Nigeria",
    photo: "/manus-storage/babatunde_azeez_1f9d8fb7.png",
    contact: null,
    credential: null,
    consentSource: null,
  },
]);

/** The named help route, approved by the person who answers it. */
export const HELP_CONTACT = Object.freeze({
  name: "Eldah Therone",
  role: "Student Counsellor",
  whatsapp: "+44 7470 689 849",
  whatsappHref: "https://wa.me/447470689849",
  email: "Eldah@WorldStudentAdvisors.com",
});

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
  { claim: "\"British Council recognised\" as a WSA organisational status", why: "The certificates WSA holds are individual training awards and explicitly say the British Council does not accredit or endorse agents. The site-wide footer was corrected on 12 September 2026 to \"British Council UK knowledge-trained counsellors\", which the certificates support. Every public page, the portal shell and the site's search and social metadata were brought to the same wording on 12 September 2026. WSA business cards still print \"Accredited by the British Council\", which the certificate contradicts; that remains outside this task." },
  { claim: "\"Established 2012\"", why: "Not claimed on this page. The site-wide footer's \"since 2012\" rests on the Grant Application of 17 June 2026 in 01_Company_&_Legal, which states trading began 1 April 2012 and the company was incorporated 9 April 2015. Trading from 2012 is evidenced; the company is not that old, so this page does not repeat the claim." },
  { claim: "\"We will get back to you within 24 hours\"", why: "On the first-draft hero. A response-time promise needs a service standard WSA is willing to be held to." },
  { claim: "Student testimonials and outcome quotes", why: "The first draft carried two quoted students with photographs. No consented, attributable WSA testimonial has been supplied, so none appear." },
  { claim: "Any admission, visa or outcome success rate", why: "Not claimed anywhere on this page, and should not be added without evidence." },
  { claim: "A British Council certificate for Babatunde Azeez", why: "None is held. His profile therefore shows no credential, and must not imply one." },
]);

export const NIGERIA_DIALLING_CODE = "+234";

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

/** Destination values the page offers, plus the "help me decide" answer. */
export const HELP_ME_DECIDE: DestinationValue = "multiple";
