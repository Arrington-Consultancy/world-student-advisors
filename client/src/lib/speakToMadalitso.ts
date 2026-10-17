/**
 * Speak to Madalitso: the Malawi landing page, on the country representative
 * template (client/src/lib/advisorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's two emails of 16 October 2026 to Tom Arrington:
 *   - "Madalitso - Malawi": the address, Madalitso's details, his tested
 *     Pipedrive form and the thank-you page.
 *   - "Speak to Madalitso, Malawi Landing Page, Design and Pipedrive
 *     Integration": the content, section by section, with "use our
 *     existing Speak to Juliet landing page as the design template".
 *   - His visual mock-up, "World Student Advisors Malawi Landing Page.png",
 *     in 16_WEBSITE_AI/07 Landing Pages/Madalitso Landing Page, for the
 *     wording the email does not give (the podcast blurb, the panel
 *     heading, the line beside the podcast).
 * Where the email and the mock-up differ, the email's wording is used.
 *
 * THE EMAIL ADDRESS ENDS .co.uk. Tim: "Madalitso's email address ends in
 * .co.uk, not .com. Please ensure this is correct throughout the page."
 * The test suite holds it.
 *
 * THE PHOTOGRAPHS are the ones already on the Our Team page, which are the
 * photographs in Tim's mock-up.
 *
 * THE FORM is Tim's Pipedrive form, tested by him: Eldah is Lead Owner,
 * Madalitso is Source Owner, Madalitso receives the enquiry by email and the
 * student an automatic acknowledgement. All of that is Pipedrive's; nothing
 * here touches it.
 */
import { FREE_SERVICE_LINE, studyFamiliesFor, type AdvisorLandingContent } from "./advisorLandingPage";

export const MADALITSO_PAGE: AdvisorLandingContent = Object.freeze({
  path: "/speak-to-madalitso",
  thankYouPath: "/speak-to-madalitso/thank-you",
  country: { name: "Malawi", flagCode: "mw" },

  advisor: {
    name: "Madalitso Dube",
    role: "Director for Malawi",
    location: "Blantyre, Malawi",
    whatsapp: "+265 888 77 28 50",
    whatsappDigits: "265888772850",
    email: "madalitso@worldstudentadvisors.co.uk",
    photo: "/manus-storage/madalitso_dube_5417ba52.jpg",
    photoAlt: "Madalitso Dube, Director for Malawi at World Student Advisors in Blantyre",
    photoWidth: 1024,
    photoHeight: 1024,
    organisation: "World Student Advisors",
    intro:
      "Madalitso is your first point of contact in Malawi. He works with students and families across the country, from first questions through to deciding where to apply.",
    firstMessage: "Hello Madalitso, I saw the WSA page and I would like to ask about studying abroad.",
  },

  // Eldah, Madalitso's dedicated Student Counsellor. No contact details:
  // Madalitso is the first point of contact (see AdvisorPerson).
  counsellor: {
    name: "Eldah Therone",
    role: "Madalitso's dedicated WSA Student Counsellor",
    photo: "/team/eldah-therone.jpg",
    photoAlt: "Eldah Therone, Student Counsellor at World Student Advisors",
    photoWidth: 720,
    photoHeight: 960,
    headOfficeLine: "Linked to WSA UK Head Office",
    panelHeading: "Your dedicated Student Counsellor",
    // Tim Hunt's suggested wording, 16 October 2026.
    panelBody: [
      "Madalitso is your first point of contact in Malawi. When you are ready to proceed, he introduces you to Eldah, who supports your course selection, applications and visa preparation. Madalitso remains involved throughout your journey.",
    ],
  },

  hero: {
    eyebrow: "For the people of Malawi",
    headline: "Thinking about studying abroad? Speak to Madalitso.",
    supporting: "Free, personal support for Malawian students and families from Madalitso and the World Student Advisors team.",
    primaryCta: "Message Madalitso on WhatsApp",
    secondary: {
      heading: "Prefer Madalitso to contact you?",
      supporting: "Leave your details and Madalitso will get in touch with you.",
      cta: "Send my details to Madalitso",
    },
    phoneLabel: "Call or WhatsApp",
    emailLabel: "Email Madalitso",
  },

  // WSA 037, already in the Student Support Library (Tim Hunt, 16 October 2026).
  podcast: {
    youtubeId: "bAKpWI_DH8Q",
    title: "Meet Madalitso",
    blurb: "WSA 037 Madalitso Dube, Director for Malawi. Find out more about Madalitso and how he can help you explore opportunities to study abroad.",
    libraryPath: "/student-support-library/madalitso-dube-director-for-malawi",
    libraryLabel: "WSA 037 in the Student Support Library",
  },

  askHeading: "What you can ask Madalitso about",
  studyFamilies: studyFamiliesFor("Malawi"),
  availabilityNote:
    "What is available depends on your qualifications, the intake and the school or university. Madalitso will tell you what fits your situation.",

  // Tim Hunt's three steps, 16 October 2026, as he wrote them.
  steps: [
    { title: "Speak to Madalitso", body: "Contact Madalitso on WhatsApp or complete the enquiry form." },
    {
      title: "Madalitso discusses your options",
      body: "Madalitso helps you explore suitable courses, universities and destinations, taking account of your qualifications, ambitions and budget.",
    },
    {
      title: "Eldah takes your application forward",
      body: "When you're ready to proceed, Madalitso introduces you to Eldah Therone, your dedicated WSA Student Counsellor. Eldah supports your applications and visa preparation, while Madalitso remains involved.",
    },
  ],

  // Tim Hunt's closing section, 16 October 2026, as he wrote it.
  keyMessage: [
    "Madalitso is your person in Malawi.",
    "Eldah is your dedicated WSA Student Counsellor, linked to UK Head Office.",
    "WSA provides the infrastructure and expertise.",
    FREE_SERVICE_LINE,
  ],

  form: {
    // Tim Hunt's tested form, 16 October 2026, exactly as he sent it.
    embedUrl: "https://webforms.pipedrive.com/f/6FBbycG4wTfm62tM1Vlu80jIF2PTcZ6TbHsoiumvEGG6UDug9KFPWb39sXsaF1TcmT",
    heading: "Ask Madalitso to contact you",
    supporting: "Leave your details below and Madalitso will get in touch with you.",
    privacyLine: "Your details go to WSA's student records system so that Madalitso can contact you.",
  },

  // Tim confirmed the student receives Pipedrive's automatic acknowledgement.
  thankYou: {
    eyebrow: "Speak to Madalitso",
    headline: "Thank you. Your details are with Madalitso.",
    body: "Madalitso will be in touch with you shortly. You will also receive an email confirming that we have your enquiry.",
    sooner: "Would you like to talk sooner?",
    whatsappCta: "Message Madalitso on WhatsApp",
    whatsappMessage: "Hello Madalitso, I have just sent you my details through your page.",
    back: "Back to Madalitso's page",
    library: "Explore the Student Support Library while you wait",
  },
} satisfies AdvisorLandingContent);
