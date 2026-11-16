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
 *
 * Tim Hunt, 14 November 2026, "Claudia LP": the same structure for Claudia,
 * who makes first contact before a Student Counsellor takes over. Her
 * mock-up has no video of her and no certificate ("She does not yet hold
 * the British Council qualification and does not have her own podcast"),
 * names her under the subheading, rings her number as well as offering
 * WhatsApp, and shows a WSA podcast she is not in. So the video and the
 * credentials are optional, and the page takes an optional podcast, shown
 * with a WSA poster rather than a photograph of someone who is not in it.
 */

export interface CounsellorLandingContent {
  /** The page's route, e.g. "/speak-to-eldah". */
  path: string;
  /** Where the counsellor's Pipedrive form sends the student after submitting. */
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
    /**
     * The number under the WhatsApp button rings the phone (tel:) instead of
     * opening WhatsApp, which the main button already does. Claudia: Tim
     * Hunt, 14 November 2026, "WhatsApp and telephone links".
     */
    callable?: boolean;
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
    /** Name and role under the subheading, as in Claudia's mock-up. */
    showNameAndRole?: boolean;
    intro: ReadonlyArray<string>;
    freeLine: string;
    primaryCta: string;
  };
  /** The three points in the band under the hero. */
  trust: ReadonlyArray<string>;
  /** The counsellor's own video. Optional: Claudia has none yet. */
  video?: {
    youtubeId: string;
    label: string;
    caption: string;
    /** The resource page in the Student Support Library. */
    libraryPath: string;
  };
  /** A qualification with its certificate. Optional: Claudia has none yet. */
  credentials?: {
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
    items: ReadonlyArray<{ icon: "course" | "applications" | "budget" | "next-steps"; title: string; body: string }>;
  };
  destinationsHeading: string;
  /**
   * A WSA podcast from the Student Support Library that the counsellor is
   * not in, after the destinations. It plays in the page only when pressed.
   */
  podcast?: {
    /** As the library numbers it, e.g. "WSA 039". */
    code: string;
    youtubeId: string;
    title: string;
    body: string;
    cta: string;
    libraryPath: string;
  };
  stories: { heading: string; body: string; linkLabel: string };
  form: {
    embedUrl: string;
    heading: string;
    supporting: string;
    privacyLine: string;
  };
  /**
   * The counsellor's own thank-you page. Optional: a counsellor whose form
   * already redirects elsewhere (Claudia's is the Website Registration Form,
   * which sends students to /contact/thank-you) has none.
   */
  thankYou?: {
    headline: string;
    body: string;
    whatsappCta: string;
    whatsappMessage: string;
    back: string;
  };
}

/** Where the "Read Student Success Stories" link goes. */
export const SUCCESS_STORIES_LINK = "/student-success-stories";
