/**
 * Study interview preparation: the Student Support Library page that gives
 * each of Tim Hunt's Pre-Mock Interview Questionnaires its own download
 * link.
 *
 * AUTHORITY. Tim Hunt to Tom Arrington, 18 November 2026, "Student Library
 * mock interview page", with his mock-up WSA_PMIQ_Page_Mockup.png ("Website
 * visual for Tom"). Tom Arrington asked for it to be built on 22 November
 * 2026. Redesigned to Tim's brief of 23 November 2026, "WSA website updates
 * for Podcasts & Mock Interviews", and its design references: the page is
 * "Mock Interviews" in the menu (its own item since his second feedback
 * document of that day, with "Podcasts" beside it), opens with his banner
 * and "Find your questionnaire" button, puts "How it works"
 * directly below, shows his eligibility notice above each set of forms, and
 * lists WSA podcasts under each. Every heading and line is his.
 *
 * WHAT HE ASKED FOR, AND WHERE IT IS:
 *  - "give each form its own download link": every questionnaire has one
 *    `file`, served from /downloads/pmiq/, imported from SharePoint by
 *    scripts/fetch-pmiq-assets.mjs. A test holds the two lists together.
 *  - "leave out any references to passwords on the page": the forms open
 *    without one, and nothing here mentions a password (tested).
 *  - "a short note for students asking them to download the form to their
 *    device, fill it in, save it and send the completed copy to their WSA
 *    counsellor": NOTE, in his words.
 *  - "Please link to the PDFs currently in each folder": the Debrecen
 *    folder also holds two Word files; they are not PDFs and are not
 *    linked.
 *  - The "Pre-CAS Interview" video is gone. It was Birmingham City
 *    University's film, and Tim said on 23 November 2026 that it "should not
 *    be included, Eldah added it". His brief of the same day replaces it
 *    with WSA's own podcasts (UK_PODCASTS, ABROAD_PODCASTS).
 *  - The numbering is his: UK forms 01 to 09, and outside the UK one block
 *    of ten per destination (Australia 20 to 29 and so on), so a new form
 *    takes the next free number without renumbering the rest.
 */
import { SECTION_LINKS } from "./podcastsPage";

export const PAGE_PATH = "/student-support-library/study-interview-preparation";

/** Where the imported PDFs are served from (client/public/downloads/pmiq). */
export const PMIQ_DIR = "/downloads/pmiq";

export interface Questionnaire {
  /** Tim's number, shown in the badge: "01" to "09", then "20" onwards. */
  number: string;
  title: string;
  /** Filename within /downloads/pmiq/. */
  file: string;
}

export interface QuestionnaireGroup {
  name: string;
  subtitle?: string;
  /** The block of numbers this destination owns, as the mock-up shows it. */
  range: string;
  forms: Questionnaire[];
}

/** Where the questionnaires begin: the banner's button jumps here. */
export const QUESTIONNAIRES_ANCHOR = "questionnaires";

/** Tim's banner, "University and Visa Interview Practice Banner.png". */
export const HERO = {
  heading: "Practise for your university or visa interview",
  intro: "Prepare for a course, scholarship or visa interview.",
  cta: "Find your questionnaire",
  image: "/images/pmiq/mock-interview-banner.jpg",
  imageAlt: "A student talking with an interviewer on a video call",
  imageWidth: 1200,
  imageHeight: 800,
};

/**
 * Tim Hunt, 23 November 2026: "Please put the notice above the
 * questionnaires so students see it before choosing a form."
 */
export const ELIGIBILITY_NOTICE =
  "Free mock interview preparation is available only to WSA students we have supported from first contact through their application and offer at a WSA partner institution.";

export const STEPS_HEADING = "How it works";

/** Tim's "How it works.png", 23 November 2026. */
export const STEPS = [
  {
    icon: "pdf",
    title: "Complete your questionnaire",
    text: "Download the PDF, fill it in and send it to your WSA counsellor.",
  },
  {
    icon: "review",
    title: "Review your answers",
    text: "Your counsellor will help you identify what to work on before your interview.",
  },
  {
    icon: "practise",
    title: "Practise in a mock interview",
    text: "Answer in your own words and get feedback.",
  },
] as const;

/** Tim's note, 18 November 2026. */
export const NOTE =
  "Download the form to your device, fill it in, save it and send the completed copy to your WSA counsellor.";

export const DOWNLOAD_LABEL = "Download PDF";

export const UK_HEADING = "UK Pre-Mock Interview Questionnaires (PMIQ)";

export const UK_FORMS: readonly Questionnaire[] = Object.freeze([
  {
    number: "01",
    title: "Education course interview",
    file: "pmiq-01-education-course-interview.pdf",
  },
  {
    number: "02",
    title: "Social Work course interview",
    file: "pmiq-02-social-work-course-interview.pdf",
  },
  {
    number: "03",
    title: "Nursing course interview",
    file: "pmiq-03-nursing-course-interview.pdf",
  },
  {
    number: "04",
    title: "Public Health course interview",
    file: "pmiq-04-public-health-course-interview.pdf",
  },
  { number: "05", title: "PhD interview", file: "pmiq-05-phd-interview.pdf" },
  {
    number: "06",
    title: "University scholarship interview",
    file: "pmiq-06-university-scholarship-interview.pdf",
  },
  {
    number: "07",
    title: "CAS Shield coaching",
    file: "pmiq-07-cas-shield-coaching.pdf",
  },
  {
    number: "08",
    title: "University credibility interview (non CAS Shield)",
    file: "pmiq-08-university-credibility-interview.pdf",
  },
  {
    number: "09",
    title: "UKVI credibility interview",
    file: "pmiq-09-ukvi-credibility-interview.pdf",
  },
]);

export const ABROAD_HEADING =
  "Pre-Mock Interview Questionnaires (PMIQ) outside the UK";
export const ABROAD_INTRO =
  "Choose your destination or university, then download the questionnaire for your interview.";

const CREDIBILITY = "University and Course Credibility Interview";

export const ABROAD_GROUPS: readonly QuestionnaireGroup[] = Object.freeze([
  {
    name: "Australia",
    range: "20 to 29",
    forms: [
      {
        number: "20",
        title: "Student Visa Interview Preparation",
        file: "pmiq-20-australia-student-visa-interview.pdf",
      },
      {
        number: "21",
        title: CREDIBILITY,
        file: "pmiq-21-australia-credibility-interview.pdf",
      },
    ],
  },
  {
    name: "Canada",
    range: "30 to 39",
    forms: [
      {
        number: "30",
        title: "Study Permit Interview Preparation",
        file: "pmiq-30-canada-study-permit-interview.pdf",
      },
      {
        number: "31",
        title: CREDIBILITY,
        file: "pmiq-31-canada-credibility-interview.pdf",
      },
    ],
  },
  {
    name: "Cyprus West University",
    range: "40 to 49",
    forms: [
      {
        number: "40",
        title: "Entry and Student Permit Preparation",
        file: "pmiq-40-cyprus-west-university-entry-and-student-permit.pdf",
      },
      {
        number: "41",
        title: CREDIBILITY,
        file: "pmiq-41-cyprus-west-university-credibility-interview.pdf",
      },
    ],
  },
  {
    name: "Germany",
    range: "50 to 59",
    forms: [
      {
        number: "50",
        title: "Student Visa Interview Preparation",
        file: "pmiq-50-germany-student-visa-interview.pdf",
      },
      {
        number: "51",
        title: CREDIBILITY,
        file: "pmiq-51-germany-credibility-interview.pdf",
      },
    ],
  },
  {
    name: "UCLan Cyprus",
    subtitle: "The British University of Cyprus",
    range: "60 to 69",
    forms: [
      {
        number: "60",
        title: "Student Visa and Arrival Preparation",
        file: "pmiq-60-uclan-cyprus-student-visa-and-arrival.pdf",
      },
      {
        number: "61",
        title: CREDIBILITY,
        file: "pmiq-61-uclan-cyprus-credibility-interview.pdf",
      },
    ],
  },
  {
    name: "University of Debrecen",
    range: "70 to 79",
    forms: [
      {
        number: "70",
        title: "Student Visa and Residence Permit Preparation",
        file: "pmiq-70-debrecen-student-visa-and-residence-permit.pdf",
      },
      {
        number: "71",
        title: CREDIBILITY,
        file: "pmiq-71-debrecen-credibility-interview.pdf",
      },
      {
        number: "72",
        title: "MSc Engineering Management Entrance Interview",
        file: "pmiq-72-debrecen-msc-engineering-management-interview.pdf",
      },
    ],
  },
  {
    name: "USA",
    range: "80 to 89",
    forms: [
      {
        number: "80",
        title: "F-1 Student Visa Interview Preparation",
        file: "pmiq-80-usa-f1-student-visa-interview.pdf",
      },
      {
        number: "81",
        title: CREDIBILITY,
        file: "pmiq-81-usa-credibility-interview.pdf",
      },
    ],
  },
]);

/** Every questionnaire on the page, UK first, in Tim's order. */
export const ALL_FORMS: readonly Questionnaire[] = Object.freeze([
  ...UK_FORMS,
  ...ABROAD_GROUPS.flatMap(g => g.forms),
]);

export const pdfHref = (form: Questionnaire): string =>
  `${PMIQ_DIR}/${form.file}`;

/** What a screen reader hears for one download link. */
export const downloadAriaLabel = (
  form: Questionnaire,
  group?: QuestionnaireGroup
): string =>
  `${DOWNLOAD_LABEL}: ${form.number}, ${group ? `${group.name}, ` : ""}${form.title}`;

/**
 * WSA podcasts under each set of questionnaires, Tim Hunt, 23 November 2026:
 * "Add WSA 023 to 026 below the UK questionnaires and WSA 017, 020 and 021
 * below the international questionnaires." Titles and links come from the
 * library's own records, so they cannot drift from it.
 */
export const PODCASTS_HEADING = "WSA podcasts to help you prepare";
export const LISTEN_LABEL = "Listen";
export const UK_PODCAST_CODES = Object.freeze([
  "WSA 023",
  "WSA 024",
  "WSA 025",
  "WSA 026",
]);
export const ABROAD_PODCAST_CODES = Object.freeze([
  "WSA 017",
  "WSA 020",
  "WSA 021",
]);

/** The link from the Podcasts page to this one. */
export const LIBRARY_CALLOUT = {
  eyebrow: "Mock Interviews",
  heading: "Practise for your university or visa interview",
  text: "Download the Pre-Mock Interview Questionnaire for your course, scholarship or visa interview, then work through it with your WSA counsellor.",
  link: "Go to Mock Interviews",
};

/** Every string the page renders, for the copy guards. */
export function allRenderedCopy(): string {
  return [
    ...SECTION_LINKS.map(l => l.label),
    HERO.heading,
    HERO.intro,
    HERO.cta,
    HERO.imageAlt,
    ELIGIBILITY_NOTICE,
    STEPS_HEADING,
    ...STEPS.flatMap(s => [s.title, s.text]),
    NOTE,
    DOWNLOAD_LABEL,
    UK_HEADING,
    ABROAD_HEADING,
    ABROAD_INTRO,
    ...ABROAD_GROUPS.flatMap(g => [g.name, g.subtitle ?? "", g.range]),
    ...ALL_FORMS.map(f => f.title),
    PODCASTS_HEADING,
    LISTEN_LABEL,
    LIBRARY_CALLOUT.eyebrow,
    LIBRARY_CALLOUT.heading,
    LIBRARY_CALLOUT.text,
    LIBRARY_CALLOUT.link,
  ].join("\n");
}
