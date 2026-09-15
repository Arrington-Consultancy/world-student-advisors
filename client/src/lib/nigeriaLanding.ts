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
  "Your counsellor will talk through other destinations with you. We do not treat Europe as a single country, so where you have a particular country in mind it is recorded as that country.";

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
 * Real WSA people, already published on /our-team with genuine
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
 * The four people Tim Hunt put on this page.
 *
 * "6. Nigeria Landing Page — Replace Eldah with this, please", from
 * `Website Edits 15 Sept 2026.docx` in
 * 16_WEBSITE_Ai/01 Website Management (to Tom)/15 Sept 2026, with the names,
 * job titles, WhatsApp numbers and email addresses taken verbatim from
 * `WSA Team 4 girls.docx` in the same folder.
 *
 * That document is the consent as well as the content. This page had
 * published no profile without a photograph, verified contact details and a
 * recorded permission; all four are now supplied by the Managing Director in
 * a controlled document, so all four people appear with their contact
 * details. Job titles are his wording, including "Student Counsellor,
 * Non-UK" for Manet, which differs from the title on /our-team.
 *
 * Photographs are the ones WSA already holds and already publishes on
 * /our-team. Tim attached new images with the same instruction; those are
 * filed in the SharePoint folder above and are NOT yet in the repository,
 * because the connectors available here return an image to read but cannot
 * write its bytes to disk. Claudia's replacement photograph (his item 3) is
 * outstanding for that reason and that reason alone.
 *
 * Eldah keeps the British Council credential because WSA holds her
 * certificate. The other three carry none, because none is held, and the
 * card must not imply one.
 */
export const COUNSELLORS: ReadonlyArray<CounsellorProfile> = Object.freeze([
  {
    name: "Eldah Therone",
    role: "Team Leader",
    location: "Nairobi, Kenya",
    photo: "/team/eldah-therone.jpg",
    contact: {
      whatsapp: "+44 7470 689 849",
      whatsappHref: "https://wa.me/447470689849",
      email: "eldah@worldstudentadvisors.com",
    },
    credential: {
      label: "British Council UK Agent and Counsellor Training, completed",
      validUntil: "28 April 2027",
      certificateCode: "67976",
      disclaimer: BRITISH_COUNCIL_DISCLAIMER,
      href: null,
    },
    consentSource: "Approved by Eldah Therone in writing, 12 September 2026, and republished on Tim Hunt's instruction of 15 September 2026.",
  },
  {
    name: "Glenice Owino",
    role: "Senior Student Counsellor",
    location: "Nairobi, Kenya",
    photo: "/team/glenice-owino.jpg",
    contact: {
      whatsapp: "+44 7459 720 726",
      whatsappHref: "https://wa.me/447459720726",
      email: "glenice@worldstudentadvisors.com",
    },
    credential: null,
    consentSource: "WSA Team 4 girls.docx, supplied by Tim Hunt, 15 September 2026.",
  },
  {
    name: "Manet Khamayo",
    role: "Student Counsellor, Non-UK",
    location: "Nairobi, Kenya",
    photo: "/team/manet-khamayo.jpg",
    contact: {
      whatsapp: "+44 7555 546016",
      whatsappHref: "https://wa.me/447555546016",
      email: "manet@worldstudentadvisors.com",
    },
    credential: null,
    consentSource: "WSA Team 4 girls.docx, supplied by Tim Hunt, 15 September 2026.",
  },
  {
    name: "Claudia Ingado",
    role: "Student Recruitment & Relationship Manager",
    location: "Nairobi, Kenya",
    photo: "/team/claudia-ingado.jpg",
    contact: {
      whatsapp: "+44 7341 905 979",
      whatsappHref: "https://wa.me/447341905979",
      email: "claudia@worldstudentadvisors.com",
    },
    credential: null,
    consentSource: "WSA Team 4 girls.docx, supplied by Tim Hunt, 15 September 2026.",
  },
]);

/**
 * The named help route.
 *
 * Left as Eldah. Tim's 15 September instruction replaced the team block on
 * this page; it said nothing about this box, and changing who answers the
 * "would rather just ask someone" route is his call, not an inference from
 * a team list.
 */
export const HELP_CONTACT = Object.freeze({
  name: "Eldah Therone",
  role: "Team Leader",
  whatsapp: "+44 7470 689 849",
  whatsappHref: "https://wa.me/447470689849",
  email: "eldah@worldstudentadvisors.com",
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
  { claim: "Claudia Ingado's replacement photograph", why: "Tim Hunt's item 3 of 15 September 2026 supplies a new photograph of Claudia, filed as Claudia Ingado.png in 16_WEBSITE_Ai/01 Website Management (to Tom)/15 Sept 2026. It is not yet published: the connectors available to the implementer can display an image but cannot write its bytes to a file, so the existing photograph stands until the file is supplied directly. Her name, job title and contact details are his and are published." },
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
