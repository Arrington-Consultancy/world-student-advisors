/**
 * Speak to Eldah: the first Student Counsellor landing page, on the
 * counsellor template (client/src/lib/counsellorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's email of 12 November 2026 to Tom Arrington,
 * "Eldah's landing page and attached materials", with his mock-up, links,
 * portrait, Union Flag and British Council certificate, all in
 * 16_WEBSITE_AI/07 Landing Pages/Eldah Landing Page. Eldah reviewed Tim's
 * earlier mock-up on 2 November 2026 ("happy with the content and layout").
 * Tom Arrington asked for the page on 13 November 2026.
 *
 * THE WORDS are Tim's, from the mock-up. One change, which Tim invited
 * ("happy for you to suggest improvements"): the badge at the top reads "WSA
 * UK Head Office team", his own phrase from the same email, rather than the
 * mock-up's "UK Head Office" beside her photograph, which reads as where she
 * is. Eldah works from Kenya; Tim's point is that she is part of the team WSA
 * runs from its UK Head Office.
 *
 * THE CONTACT DETAILS are the ones in the mock-up and on Eldah's Our Team
 * record: WSA's UK Head Office WhatsApp, +44 7470 689 849, and her WSA
 * address.
 *
 * THE CERTIFICATE is the British Council "UK agent and counsellor training"
 * certificate Tim attached (awarded 28 April 2025, valid for two years). The
 * page says what it is, that she completed the training, and claims nothing
 * more: the British Council does not endorse or accredit agents.
 *
 * THE VIDEO is WSA 034, "Eldah Therone, Team Leader WSA", already in the
 * Student Support Library; Tim's link is its library page.
 *
 * THE FORM is Tim's tested Pipedrive form, "Speak to Eldah", embedded
 * exactly as he sent it.
 */
import type { CounsellorLandingContent } from "./counsellorLandingPage";

export const ELDAH_PAGE: CounsellorLandingContent = Object.freeze({
  path: "/speak-to-eldah",
  thankYouPath: "/speak-to-eldah/thank-you",

  person: {
    name: "Eldah Therone",
    firstName: "Eldah",
    role: "Team Leader and Senior Student Counsellor",
    whatsapp: "+44 7470 689 849",
    whatsappDigits: "447470689849",
    email: "eldah@worldstudentadvisors.com",
    photo: "/team/eldah-therone-portrait.jpg",
    photoAlt: "Eldah Therone, Team Leader and Senior Student Counsellor at World Student Advisors",
    photoWidth: 960,
    photoHeight: 920,
    firstMessage: "Hello Eldah, I saw your WSA page and I would like to ask about studying abroad.",
  },

  teamBadge: "WSA UK Head Office team",

  hero: {
    headline: "Speak to Eldah",
    subheading: "Your dedicated WSA Student Counsellor",
    intro: [
      "Hello, I’m Eldah Therone, Team Leader and Senior Student Counsellor at World Student Advisors.",
      "I can help you choose a suitable course and destination, prepare your applications and plan your next steps towards studying abroad.",
    ],
    freeLine: "Our advice and university application support are free of charge.",
    primaryCta: "WhatsApp Eldah",
  },

  trust: ["British Council trained", "Personal guidance", "Support through to arrival"],

  // WSA 034 in the Student Support Library (Tim Hunt, 12 November 2026).
  video: {
    youtubeId: "_VvWRjVXsEg",
    label: "Meet Eldah",
    caption: "Get to know the person who will support your study plans.",
    libraryPath: "/student-support-library/eldah-therone-team-leader-wsa",
  },

  credentials: {
    heading: "Professional guidance you can trust",
    body: "Eldah has completed British Council Agent and Counsellor Training. She combines personal guidance with the support of the wider WSA team.",
    certificate: {
      src: "/team/certificates/eldah-therone-british-council.png",
      alt: "Eldah Therone’s British Council certificate in UK agent and counsellor training, awarded 28 April 2025",
      width: 637,
      height: 902,
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
    // Tim Hunt's tested form, 12 November 2026, exactly as he sent it.
    embedUrl: "https://webforms.pipedrive.com/f/6rJKJRIG1HiEmgyINvRSmovbZiPwVnlN23DlkYHqaI6HgnEAICQLikJDzRLpBxSUcH",
    heading: "Prefer Eldah to contact you?",
    supporting: "Leave your details and Eldah will contact you to discuss your study plans.",
    privacyLine: "Your details go to WSA’s student records system so that Eldah can contact you.",
  },

  thankYou: {
    headline: "Thank you. Your details are with Eldah.",
    body: "Eldah will be in touch with you shortly.",
    whatsappCta: "WhatsApp Eldah",
    whatsappMessage: "Hello Eldah, I have just sent you my details through your page.",
    back: "Back to Eldah’s page",
  },
} satisfies CounsellorLandingContent);
