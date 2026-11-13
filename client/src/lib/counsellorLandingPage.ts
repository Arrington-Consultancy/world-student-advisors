/**
 * The Student Counsellor landing page: one template, one content file per
 * counsellor.
 *
 * Tim Hunt, 12 November 2026, "Eldah's landing page and attached materials":
 * build Eldah's page from his mock-up ("Eldah Landing Page Visual.png", in
 * 16_WEBSITE_AI/07 Landing Pages/Eldah Landing Page), keeping WhatsApp as
 * the main contact option with his tested Pipedrive form as the
 * alternative, her video, her British Council certificate in a pop-up and a
 * link to the Student Success Stories; and "It would be useful if we could
 * reuse Eldah's page structure for Manet and Glenice later." The same
 * evening he asked for Glenice's and Manet's pages "using the same
 * structure as Eldah's".
 *
 * So the layout lives once, in client/src/pages/CounsellorLandingPage.tsx,
 * and each counsellor is a content object (client/src/lib/speakToEldah.ts
 * is the first). Adding a counsellor is a new content file, its routes and
 * their metadata, never a new page component.
 *
 * This is a different page from the country representative template
 * (advisorLandingPage.ts): there the representative is the contact and the
 * counsellor stays in the background; here the counsellor is the contact.
 * The two share WSA's destinations and the WhatsApp link format.
 *
 * As on the representative pages, the enquiry form is the counsellor's own
 * Pipedrive web form, embedded by Pipedrive's loader, so a submission goes
 * from the visitor's browser to Pipedrive and never touches this server.
 */

export interface CounsellorLandingContent {
  /** The page's route, e.g. "/speak-to-eldah". */
  path: string;
  /** A thank-you page the counsellor's Pipedrive form can send the student to. */
  thankYouPath: string;
  person: {
    name: string;
    firstName: string;
    /** As written in the hero introduction, e.g. "Team Leader and Senior Student Counsellor". */
    role: string;
    /** International format, shown on the page. */
    whatsapp: string;
    /** Digits only, as wa.me needs. */
    whatsappDigits: string;
    email: string;
    photo: string;
    photoAlt: string;
    /** The photograph's own pixel size, so the page reserves its space. */
    photoWidth: number;
    photoHeight: number;
    /** Already typed when WhatsApp opens. */
    firstMessage: string;
  };
  /**
   * Beside the Union Flag at the top. Tim Hunt, 12 November 2026: "WSA UK
   * Head Office team" expresses that the counsellor works for WSA's UK Head
   * Office "without suggesting they physically live in the UK".
   */
  teamBadge: string;
  hero: {
    headline: string;
    subheading: string;
    intro: ReadonlyArray<string>;
    freeLine: string;
    primaryCta: string;
  };
  /** The three points in the band under the hero. */
  trust: ReadonlyArray<string>;
  video: {
    youtubeId: string;
    label: string;
    caption: string;
    /** The resource page in the Student Support Library. */
    libraryPath: string;
  };
  credentials: {
    heading: string;
    body: string;
    certificate: {
      src: string;
      alt: string;
      width: number;
      height: number;
      linkLabel: string;
    };
  };
  help: {
    heading: string;
    items: ReadonlyArray<{ icon: "course" | "applications" | "next-steps"; title: string; body: string }>;
  };
  destinationsHeading: string;
  stories: { heading: string; body: string; linkLabel: string };
  form: {
    embedUrl: string;
    heading: string;
    supporting: string;
    privacyLine: string;
  };
  thankYou: {
    headline: string;
    body: string;
    whatsappCta: string;
    whatsappMessage: string;
    back: string;
  };
}

/** Where the "Read Student Success Stories" link goes. */
export const SUCCESS_STORIES_LINK = "/student-success-stories";
