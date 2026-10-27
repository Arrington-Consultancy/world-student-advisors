/**
 * The country representative landing page: one template, one content file
 * per representative.
 *
 * Tim Hunt, 16 October 2026, briefing Speak to Madalitso: "Please use our
 * existing Speak to Juliet landing page as the design template, keeping the
 * same branding, layout and overall presentation", and "The objective is to
 * establish a consistent landing-page format that we can eventually use for
 * other WSA country representatives, while retaining the personal approach
 * that makes WSA different."
 *
 * So the layout lives once, in client/src/pages/AdvisorLandingPage.tsx, and
 * each representative is a content object (client/src/lib/speakToMadalitso.ts
 * is the first). Adding a country is a new content file, a route and its
 * metadata, never a new page component.
 *
 * WHAT IS SHARED, below: the parts of Speak to Juliet that are WSA's offer
 * rather than one person's, in the wording already approved there (trust
 * line, the seven service areas, the destinations, the closing line). Tim
 * asked for these to be kept as they are on Juliet's page, and
 * server/campaign/speakToMadalitso.test.ts holds them equal to Juliet's so
 * the two pages cannot drift apart.
 *
 * Speak to Juliet itself still runs on its own page component, unchanged.
 * Moving it onto this template is a separate decision for Tom Arrington: it
 * is live, it carries paid traffic, and nothing here needs it moved.
 *
 * WHAT THESE PAGES DO NOT DO, as for Juliet: the enquiry form is the
 * representative's own Pipedrive web form, embedded by Pipedrive's loader,
 * so a submission goes from the visitor's browser to Pipedrive and never
 * touches this server. No lead is created through this codebase.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AdvisorPerson {
  name: string;
  role: string;
  location?: string;
  /**
   * Contact details are optional, and their absence is the guarantee: the
   * counsellor has none on these pages, because the representative is the
   * contact until the student goes ahead (Tim Hunt's rule for Juliet and
   * Glenice, 19 September 2026, repeated for Madalitso and Eldah on 16
   * October). Leaving the values out of the data means no later edit can
   * publish them by accident.
   */
  whatsapp?: string;
  /** International, digits only, as wa.me needs. */
  whatsappDigits?: string;
  email?: string;
  photo: string;
  photoAlt: string;
  /** The photograph's own pixel size, so the page reserves its space. */
  photoWidth: number;
  photoHeight: number;
}

export interface AdvisorLandingContent {
  /** The page's route, e.g. "/speak-to-madalitso". */
  path: string;
  /** Where the Pipedrive form sends the student after submitting. */
  thankYouPath: string;
  country: {
    name: string;
    /** Lower-case ISO 3166-1 alpha-2 code, served as /flags/<code>.svg. */
    flagCode: string;
  };
  advisor: AdvisorPerson & {
    /** The organisation line in the hero caption. */
    organisation: string;
    /** The paragraph beside the podcast. */
    intro: string;
    /** Already typed when WhatsApp opens, so a blank first message is no obstacle. */
    firstMessage: string;
  };
  counsellor: AdvisorPerson & {
    headOfficeLine: string;
    /** The heading of the counsellor's panel. */
    panelHeading: string;
    panelBody: ReadonlyArray<string>;
  };
  hero: {
    eyebrow: string;
    headline: string;
    supporting: string;
    primaryCta: string;
    secondary: { heading: string; supporting: string; cta: string };
    phoneLabel: string;
    emailLabel: string;
  };
  /**
   * A line under the two people in the hero about their qualifications, when
   * the brief gives one (Tim Hunt for Gladys and Manet, 24 October 2026).
   */
  credentials?: string;
  podcast: {
    youtubeId: string;
    title: string;
    blurb: string;
    /**
     * What shows before play. "advisor" (the default) is the representative's
     * photograph. "brand" is a plain WSA panel, for a library recording the
     * representative is not in, so the page never suggests they present it.
     */
    poster?: "advisor" | "brand";
    /** The resource page in the Student Support Library, if it has one. */
    libraryPath?: string;
    libraryLabel?: string;
  };
  askHeading: string;
  studyFamilies: ReadonlyArray<{ title: string; body: string }>;
  availabilityNote: string;
  steps: ReadonlyArray<{ title: string; body: string }>;
  keyMessage: ReadonlyArray<string>;
  form: {
    embedUrl: string;
    heading: string;
    supporting: string;
    privacyLine: string;
  };
  thankYou: {
    eyebrow: string;
    headline: string;
    body: string;
    sooner: string;
    whatsappCta: string;
    whatsappMessage: string;
    back: string;
    library: string;
  };
}

/* ------------------------------------------------------------------ */
/* Shared WSA content, as approved on Speak to Juliet                  */
/* ------------------------------------------------------------------ */

export function whatsappHref(digits: string, message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** Tim Hunt confirmed it in writing on 19 September 2026. */
export const FREE_SERVICE_LINE = "The service is free.";

/** WSA as the source of authority (Tim Hunt, 27 September 2026). Approved site wording only. */
export const TRUST_LINE: ReadonlyArray<string> = Object.freeze([
  "Backed by WSA UK Head Office",
  "British Council UK knowledge-trained counsellors",
  "With you from application to enrolment",
]);

export const FREE_BADGE = Object.freeze({ heading: "Free student support", line: FREE_SERVICE_LINE });
export const BACKED_BY_LABEL = "Backed by";
export const SUPPORT_HEADING = "Free service from WSA";
export const HELP_HEADING = "How we can help you";
export const READY_HEADING = "Ready to start?";

/** The seven service areas, in Tim Hunt's order. */
export const SUPPORT_STEPS: ReadonlyArray<string> = Object.freeze([
  "Course and university selection",
  "Applications and offers",
  "Payment guidance",
  "Visa preparation",
  "Interview and mock interview preparation",
  "Pre-departure support",
  "Support throughout your studies",
]);

export interface DestinationFlag {
  name: string;
  code: string;
  alt: string;
}

/** Names only; served from /flags (the MIT-licensed flag-icons set). */
export const DESTINATION_FLAGS: ReadonlyArray<DestinationFlag> = Object.freeze([
  { name: "UK", code: "gb", alt: "Flag of the United Kingdom" },
  { name: "USA", code: "us", alt: "Flag of the United States" },
  { name: "Canada", code: "ca", alt: "Flag of Canada" },
  { name: "Australia", code: "au", alt: "Flag of Australia" },
  { name: "Germany", code: "de", alt: "Flag of Germany" },
  { name: "Cyprus", code: "cy", alt: "Flag of Cyprus" },
  { name: "Hungary", code: "hu", alt: "Flag of Hungary" },
  { name: "Europe", code: "eu", alt: "Flag of the European Union" },
]);

export const DESTINATIONS_HEADING = "Study destinations";
export const WHERE_HEADING = "Where you could study";

/** Education wording only: no relationship, ranking, work or migration claims. */
export const DESTINATIONS: ReadonlyArray<{ name: string; body: string }> = Object.freeze([
  { name: "United Kingdom", body: "WSA's main destination, and where most WSA students go." },
  { name: "United States", body: "A large choice of undergraduate and postgraduate programmes." },
  { name: "Canada", body: "A major international study destination, with a wide choice of universities, colleges and programmes." },
  { name: "Australia", body: "A popular international study destination offering a wide range of universities and undergraduate and postgraduate programmes." },
  { name: "Germany", body: "Worth considering for postgraduate study, with Master's programmes taught in English and many competitively priced options." },
  { name: "Elsewhere in Europe", body: "Including Cyprus, Hungary, France and the Netherlands. Each one is considered on its own merits." },
]);

export const DESTINATIONS_LINE =
  "Your WSA counsellor will help you compare countries, universities, courses and costs to find the options that best fit your ambitions and budget.";

/** The four families from Juliet's page; only the country in "Online study" changes. */
export function studyFamiliesFor(countryName: string): ReadonlyArray<{ title: string; body: string }> {
  return Object.freeze([
    { title: "Degrees abroad", body: "PhD and Master's degrees, undergraduate degrees, top-up degrees and International Foundation Programmes." },
    { title: "School and sixth form", body: "UK boarding schools for GCSE, A Level and foundation courses." },
    { title: "Sport and summer", body: "UK boarding schools with football academies, and UK summer camps with football and other sports in July and August." },
    { title: "Online study", body: `Online courses and flexible study options you can take from home in ${countryName}.` },
  ]);
}

/** Pipedrive's own loader for embedded web forms, as on Juliet's page. */
export const PIPEDRIVE_LOADER_SRC = "https://webforms.pipedrive.com/f/loader";
export const FORM_FALLBACK = Object.freeze({
  line: "If the form does not appear here, open it in a new tab.",
  cta: "Open the form",
});
