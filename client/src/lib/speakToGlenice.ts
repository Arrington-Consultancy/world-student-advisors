/**
 * Speak to Glenice, on the counsellor template
 * (client/src/lib/counsellorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's email of 12 November 2026 to Tom Arrington,
 * "Glenice's landing page", with his mock-up ("Glenice's WSA Study Guidance
 * Landing Page.png"), her portrait, British Council certificate, the Union
 * Flag and his links document (Glenice_Landing_Page_Links.docx): "using the
 * same structure as Eldah's and the attached mock-up as a guide". Tom
 * Arrington asked for the page on 14 November 2026.
 *
 * THE WORDS are Tim's, from the mock-up, the same as Eldah's page apart from
 * her name, her title and her video. Her title is Senior Student Counsellor.
 *
 * THE BADGE: "As explained in my Eldah email, please use 'WSA UK Head
 * Office team'. We will promote Glenice across several African countries.
 * This describes her place within WSA without suggesting she physically
 * works in the UK."
 *
 * THE CONTACT DETAILS are Tim's, matching her Our Team record: "Telephone
 * and WhatsApp: +44 7459 720 726" and her WSA address. The main button opens
 * WhatsApp; the number under it rings her, as the mock-up's phone icon shows.
 *
 * THE VIDEO is WSA 030, "Pre-Departure by Glenice Owino", from the Student
 * Support Library: "Her video is about preparing for departure and life
 * abroad, so please retain that description beneath it."
 *
 * THE CERTIFICATE is the British Council "UK knowledge agent and counsellor
 * training" certificate Tim attached, valid until 5 May 2027. The page says
 * only that she completed the training: the British Council does not
 * endorse or accredit agents.
 *
 * THE FORM is "Glenice's Pipedrive form" from the links document, embedded
 * exactly as supplied. The document notes that its embedded testing and
 * routing are not yet confirmed; Tim is to test it and point its redirect at
 * /speak-to-glenice/thank-you.
 */
import type { CounsellorLandingContent } from "./counsellorLandingPage";

export const GLENICE_PAGE = Object.freeze({
  path: "/speak-to-glenice",
  thankYouPath: "/speak-to-glenice/thank-you",

  person: {
    name: "Glenice Owino",
    firstName: "Glenice",
    role: "Senior Student Counsellor",
    whatsapp: "+44 7459 720 726",
    whatsappDigits: "447459720726",
    email: "glenice@worldstudentadvisors.com",
    photo: "/team/glenice-owino-portrait.jpg",
    photoAlt: "Glenice Owino, Senior Student Counsellor at World Student Advisors",
    photoWidth: 960,
    photoHeight: 960,
    firstMessage: "Hello Glenice, I saw your WSA page and I would like to ask about studying abroad.",
    callable: true,
  },

  teamBadge: "WSA UK Head Office team",

  hero: {
    headline: "Speak to Glenice",
    subheading: "Your dedicated WSA Student Counsellor",
    intro: [
      "Hello, I’m Glenice Owino, Senior Student Counsellor at World Student Advisors.",
      "I can help you choose a suitable course and destination, prepare your applications and plan your next steps towards studying abroad.",
    ],
    freeLine: "Our advice and university application support are free of charge.",
    primaryCta: "WhatsApp Glenice",
  },

  trust: ["British Council trained", "Personal guidance", "Support through to arrival"],

  // WSA 030 in the Student Support Library (Tim Hunt, 12 November 2026).
  video: {
    youtubeId: "xnwa_eJPBZ0",
    label: "Meet Glenice",
    caption: "Practical advice on preparing to travel and life abroad.",
    libraryPath: "/student-support-library/pre-departure-by-glenice-owino",
  },

  credentials: {
    heading: "Professional guidance you can trust",
    body: "Glenice has completed British Council Agent and Counsellor Training. She combines personal guidance with the support of the wider WSA team.",
    certificate: {
      src: "/team/certificates/glenice-owino-british-council.png",
      alt: "Glenice Owino’s British Council certificate in UK knowledge agent and counsellor training, valid until 5 May 2027",
      width: 563,
      height: 792,
      linkLabel: "View certificate",
    },
  },

  help: {
    heading: "How I can help you",
    items: [
      {
        icon: "course",
        title: "Choose your course and destination",
        body: "Get personalised advice to find a course and study destination that fits your goals, interests and future plans.",
      },
      {
        icon: "applications",
        title: "Prepare your applications",
        body: "Receive step-by-step support with your university applications and the required documents.",
      },
      {
        icon: "next-steps",
        title: "Get ready for your next steps",
        body: "Be guided on key preparations before you travel, so you can feel confident and ready for your study experience abroad.",
      },
    ],
  },

  destinationsHeading: "Popular study destinations we support",

  stories: {
    heading: "Students share their experiences",
    body: "Read about how World Student Advisors has supported students on their study journey.",
    linkLabel: "Read Student Success Stories",
  },

  form: {
    // "Glenice's Pipedrive form", Tim Hunt's links document, 12 November 2026.
    embedUrl: "https://webforms.pipedrive.com/f/6FnUG6dlB0AuBLmC0Umw5eoeGKcawiB4F4CuMxVTp2QzslXYC8LYTuBXAKiTWIAblh",
    heading: "Prefer Glenice to contact you?",
    supporting: "Leave your details and Glenice will contact you to discuss your study plans.",
    privacyLine: "Your details go to WSA’s student records system so that Glenice can contact you.",
  },

  thankYou: {
    headline: "Thank you. Your details are with Glenice.",
    body: "Glenice will be in touch with you shortly.",
    whatsappCta: "WhatsApp Glenice",
    whatsappMessage: "Hello Glenice, I have just sent you my details through your page.",
    back: "Back to Glenice’s page",
  },
} satisfies CounsellorLandingContent);
