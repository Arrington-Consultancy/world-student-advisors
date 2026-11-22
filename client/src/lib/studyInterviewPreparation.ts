/**
 * Study interview preparation: the Student Support Library page that gives
 * each of Tim Hunt's Pre-Mock Interview Questionnaires its own download
 * link.
 *
 * AUTHORITY. Tim Hunt to Tom Arrington, 18 November 2026, "Student Library
 * mock interview page", with his mock-up WSA_PMIQ_Page_Mockup.png ("Website
 * visual for Tom"). Every heading, line and form title below is his, from
 * that mock-up. Tom Arrington asked for it to be built on 22 November 2026.
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
 *  - The "Pre-CAS Interview" video for the UK section: held back until a
 *    person has looked at it, because the repository is public (see the
 *    import script).
 *  - The numbering is his: UK forms 01 to 09, and outside the UK one block
 *    of ten per destination (Australia 20 to 29 and so on), so a new form
 *    takes the next free number without renumbering the rest.
 */

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

export const BREADCRUMB = {
  library: "Student Library",
  page: "Study interview preparation",
};

export const HERO = {
  heading: "Prepare for your study interview",
  intro:
    "Practise for a course, scholarship, credibility or visa interview. Send your interview date, time and instructions to your WSA counsellor.",
};

export const ELIGIBILITY = {
  heading: "Download your questionnaire",
  text: "Free for students who are registered with WSA, have WSA as their sole agent and have been placed by WSA at a partner institution.",
};

export const STEPS_HEADING = "How it works";

export const STEPS = [
  {
    title: "Download and complete the PDF",
    text: "Save a copy, type your answers and send it to your counsellor. If the PDF will not save on your phone, send your answers in question order.",
  },
  {
    title: "Review your preparation",
    text: "Your counsellor will review your answers and help you work through any gaps.",
  },
  {
    title: "Practise in a mock interview",
    text: "Use your own examples, speak in your own words and get feedback.",
  },
] as const;

/** Tim's note, 18 November 2026. */
export const NOTE =
  "Download the form to your device, fill it in, save it and send the completed copy to your WSA counsellor.";

export const DOWNLOAD_LABEL = "Download PDF";

export const UK_HEADING = "UK interview questionnaires";

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

export const ABROAD_HEADING = "Interview questionnaires outside the UK";
export const ABROAD_INTRO =
  "Choose your destination or university, then download the form for your interview.";

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

/** The link from the library's own page to this one. */
export const LIBRARY_CALLOUT = {
  eyebrow: "Interview questionnaires",
  heading: "Prepare for your study interview",
  text: "Download the questionnaire for your course, scholarship, credibility or visa interview, in the UK or abroad, then work through your answers with your WSA counsellor before your mock interview.",
  link: "Choose your questionnaire",
};

/** Every string the page renders, for the copy guards. */
export function allRenderedCopy(): string {
  return [
    BREADCRUMB.library,
    BREADCRUMB.page,
    HERO.heading,
    HERO.intro,
    ELIGIBILITY.heading,
    ELIGIBILITY.text,
    STEPS_HEADING,
    ...STEPS.flatMap(s => [s.title, s.text]),
    NOTE,
    DOWNLOAD_LABEL,
    UK_HEADING,
    ABROAD_HEADING,
    ABROAD_INTRO,
    ...ABROAD_GROUPS.flatMap(g => [g.name, g.subtitle ?? "", g.range]),
    ...ALL_FORMS.map(f => f.title),
    LIBRARY_CALLOUT.eyebrow,
    LIBRARY_CALLOUT.heading,
    LIBRARY_CALLOUT.text,
    LIBRARY_CALLOUT.link,
  ].join("\n");
}
