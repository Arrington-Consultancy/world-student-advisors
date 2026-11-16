/**
 * Speak to Claudia, on the counsellor template
 * (client/src/lib/counsellorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's email of 14 November 2026 to Tom Arrington, copied
 * to Claudia, "Claudia LP", with his mock-up ("Claudia's study abroad
 * welcome page.png"), her photograph ("Claudia Ingado final version.png"),
 * the Union Flag and his links document (Links.docx). Tom Arrington asked
 * for the page on 14 November 2026.
 *
 * HER ROLE, in Tim's words: "Her full job title is Student Recruitment
 * Relationship Manager. She makes first contact, discusses study plans and
 * budgets, then introduces suitable students to a WSA Student Counsellor."
 * So the page is her first conversation with a student, not a counsellor's
 * application support.
 *
 * THE WORDS are Tim's, from the mock-up: "She does not yet hold the British
 * Council qualification and does not have her own podcast, so please keep
 * the wording and content as shown in the supplied visual." No
 * certificate, no video of her and no British Council line.
 *
 * THE CONTACT DETAILS are Tim's: "WhatsApp and telephone links using +44
 * 7341 905 979. The +44 prefix is correct", and her WSA address. The main
 * button opens WhatsApp; the number under it rings her.
 *
 * THE PODCAST is WSA 039, "Ten Steps to UK University Success", from the
 * Student Support Library, as in the mock-up and the links document.
 * Claudia is not in it, so it is shown with a WSA poster, not her photo.
 *
 * THE FORM is "the existing Pipedrive registration form supplied in the
 * links document, embedded beneath 'Prefer Claudia to contact you?'.
 * Please retain its existing routing to Claudia." That is Tim's Website
 * Registration Form, the one on /contact, which already makes Claudia Lead
 * Owner and Source Owner and, since Tim set it on 15 November 2026, sends
 * the student to /contact/thank-you. So Claudia has no thank-you page of
 * her own.
 */
import type { CounsellorLandingContent } from "./counsellorLandingPage";
import { REGISTRATION_FORM_URL, REGISTRATION_THANK_YOU_PATH } from "./registrationForm";

export const CLAUDIA_PAGE = Object.freeze({
  path: "/speak-to-claudia",
  thankYouPath: REGISTRATION_THANK_YOU_PATH,

  person: {
    name: "Claudia Ingado",
    firstName: "Claudia",
    role: "Student Recruitment Relationship Manager",
    whatsapp: "+44 7341 905 979",
    whatsappDigits: "447341905979",
    email: "claudia@worldstudentadvisors.com",
    photo: "/team/claudia-ingado-portrait.jpg",
    photoAlt: "Claudia Ingado, Student Recruitment Relationship Manager at World Student Advisors",
    photoWidth: 960,
    photoHeight: 960,
    firstMessage: "Hello Claudia, I saw your WSA page and I would like to talk about studying abroad.",
    callable: true,
  },

  teamBadge: "WSA UK Head Office team",

  hero: {
    headline: "Speak to Claudia",
    subheading: "Your first step towards studying abroad",
    showNameAndRole: true,
    intro: [
      "Hello, I’m Claudia. I’ll help you explore your study and career goals, understand your options and plan an affordable route to an international university.",
      "When you are ready, I’ll introduce you to a WSA Student Counsellor for your applications and next steps.",
    ],
    freeLine: "Our advice and university application support are free of charge.",
    primaryCta: "WhatsApp Claudia",
  },

  trust: ["Your study goals", "Practical guidance", "The wider WSA team"],

  help: {
    heading: "Let’s build your study plan",
    items: [
      {
        icon: "course",
        title: "Your goals",
        body: "Discuss your interests, qualifications and career ambitions.",
      },
      {
        icon: "budget",
        title: "Your budget",
        body: "Explore tuition fees, living costs and how you will fund your studies.",
      },
      {
        icon: "next-steps",
        title: "Your next steps",
        body: "Agree a realistic plan and meet your WSA Student Counsellor when you are ready.",
      },
    ],
  },

  destinationsHeading: "Popular study destinations we support",

  // WSA 039 in the Student Support Library (Tim Hunt, 14 November 2026).
  podcast: {
    code: "WSA 039",
    youtubeId: "6a7do5dlbOI",
    title: "Ten Steps to UK University Success",
    body: "Start your journey with this WSA podcast. Learn the key steps towards a successful university placement.",
    cta: "Watch or listen to Ten Steps",
    libraryPath: "/student-support-library/ten-steps-to-uk-university-success",
  },

  stories: {
    heading: "Student Success Stories",
    body: "See how WSA has supported students on their journey.",
    linkLabel: "Read Student Success Stories",
  },

  form: {
    // Tim Hunt's Website Registration Form, from his links document.
    embedUrl: REGISTRATION_FORM_URL,
    heading: "Prefer Claudia to contact you?",
    supporting: "Leave your details and Claudia will contact you to discuss your study plans.",
    privacyLine: "Your details go to WSA’s student records system so that Claudia can contact you.",
  },
} satisfies CounsellorLandingContent);
