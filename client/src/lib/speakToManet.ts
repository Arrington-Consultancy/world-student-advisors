/**
 * Speak to Manet, on the counsellor template
 * (client/src/lib/counsellorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's email of 12 November 2026 to Tom Arrington,
 * "Manet's landing page", with his mock-up ("Manet's WSA Study Abroad
 * Landing Page.png"), her portrait, British Council certificate, the Union
 * Flag and his links document (Manet_Landing_Page_Links.docx): "using the
 * same structure as Eldah's and Glenice's". Tom Arrington asked for the
 * page on 14 November 2026.
 *
 * HER TITLE: "Manet's title is Student Counsellor, specialising in study
 * destinations beyond the UK and online learning. Please keep that
 * specialism prominent." It is in the first line of her introduction, as in
 * the mock-up, in her photograph's description and in the page's search
 * description.
 *
 * THE BADGE: "WSA UK Head Office team", as for Eldah and Glenice: "We will
 * promote Manet across several African countries."
 *
 * HER EMAIL: "Her email address is still to be supplied. Please leave that
 * out of the preview for now and we will add it before publication." So the
 * page shows none.
 *
 * HER NUMBER: Tim's mock-up and links document give +44 7555 654 016. Her
 * Our Team record has +44 7555 546016, corrected on Tim's own instruction
 * on 15 September 2026 ("546016, not 547016"). Tim confirmed the Our Team
 * number on 16 November 2026 ("Website Correct", and her contact card), so
 * the page uses it.
 *
 * THE VIDEO is WSA 038, "Manet Khamayo, Student Counsellor NONUK", from the
 * Student Support Library, with the mock-up's caption.
 *
 * THE CERTIFICATE is the British Council "UK knowledge agent and counsellor
 * training" certificate Tim attached, valid until 21 April 2028, with the
 * grey margin of the screenshot trimmed. The page says only that she
 * completed the training.
 *
 * THE FORM is "Manet's Pipedrive form" from the links document, embedded
 * exactly as supplied. Tim set its redirect to /speak-to-manet/thank-you on
 * 16 November 2026; Manet tests her own form.
 *
 * PUBLICATION: Tim Hunt, 16 November 2026: "Glenice and Manet's pages
 * looks good. Please publish the pages". Her email had still not been
 * supplied, so the page is published without one; add it to `person.email`
 * when Tim sends it.
 */
import type { CounsellorLandingContent } from "./counsellorLandingPage";

export const MANET_PAGE = Object.freeze({
  path: "/speak-to-manet",
  thankYouPath: "/speak-to-manet/thank-you",

  person: {
    name: "Manet Khamayo",
    firstName: "Manet",
    role: "Student Counsellor, specialising in study destinations beyond the UK and online learning",
    whatsapp: "+44 7555 546016",
    whatsappDigits: "447555546016",
    photo: "/team/manet-khamayo-portrait.jpg",
    photoAlt: "Manet Khamayo, Student Counsellor at World Student Advisors, specialising in study destinations beyond the UK and online learning",
    photoWidth: 960,
    photoHeight: 960,
    firstMessage: "Hello Manet, I saw your WSA page and I would like to ask about studying abroad.",
    callable: true,
  },

  teamBadge: "WSA UK Head Office team",

  hero: {
    headline: "Speak to Manet",
    subheading: "Your dedicated WSA Student Counsellor",
    intro: [
      "Hello, I’m Manet Khamayo, Student Counsellor at World Student Advisors, specialising in study destinations beyond the UK and online learning.",
      "I can help you choose a suitable course and destination, prepare your applications and plan your next steps towards studying abroad.",
    ],
    freeLine: "Our advice and university application support are free of charge.",
    primaryCta: "WhatsApp Manet",
  },

  trust: ["British Council trained", "Personal guidance", "Support through to arrival"],

  // WSA 038 in the Student Support Library (Tim Hunt, 12 November 2026).
  video: {
    youtubeId: "oGFf6-IHt5A",
    label: "Meet Manet",
    caption: "Explore your study options beyond the UK and online.",
    libraryPath: "/student-support-library/manet-khamayo-student-counsellor-nonuk",
  },

  credentials: {
    heading: "Professional guidance you can trust",
    body: "Manet has completed British Council Agent and Counsellor Training. She combines personal guidance with the support of the wider WSA team.",
    certificate: {
      src: "/team/certificates/manet-khamayo-british-council.jpg",
      alt: "Manet Khamayo’s British Council certificate in UK knowledge agent and counsellor training, valid until 21 April 2028",
      width: 750,
      height: 1060,
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
    // "Manet's Pipedrive form", Tim Hunt's links document, 12 November 2026.
    embedUrl: "https://webforms.pipedrive.com/f/5VLj1bLK2vka3aEDr9bzwJiq932HJNhcSd8cj1MCh714Ly41QrnLVJFYd1uTVzdLGz",
    heading: "Prefer Manet to contact you?",
    supporting: "Leave your details and Manet will contact you to discuss your study plans.",
    privacyLine: "Your details go to WSA’s student records system so that Manet can contact you.",
  },

  thankYou: {
    headline: "Thank you. Your details are with Manet.",
    body: "Manet will be in touch with you shortly.",
    whatsappCta: "WhatsApp Manet",
    whatsappMessage: "Hello Manet, I have just sent you my details through your page.",
    back: "Back to Manet’s page",
  },
} satisfies CounsellorLandingContent);
