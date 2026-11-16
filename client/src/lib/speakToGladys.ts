/**
 * Speak to Gladys: the Ghana landing page, on the country representative
 * template (client/src/lib/advisorLandingPage.ts).
 *
 * AUTHORITY. Tim Hunt's email of 24 October 2026 to Tom Arrington, "Speak to
 * Glady's Landing Page": "Using Juliet's landing page as a template - please
 * find attached changes for Gladys", with his annotated document "Gladys
 * Landing Page.docx", the photographs and both British Council certificates,
 * all in 16_WEBSITE_AI/07 Landing Pages/Gladys Landing Page. Tom Arrington
 * asked for the page on 27 October 2026. Every line below is Tim's wording
 * from that document, or Juliet's and Madalitso's approved wording with the
 * names changed where his document says "no change" or "this can stay as is".
 *
 * HER NAME AND ROLE are as Tim wrote them: "Gladys Naadi, Director for
 * Ghana", in Accra. (The Our Team page has "Gladys Naadi Banhu", "Regional
 * Director, Ghana", and an older WhatsApp number; that page is not changed
 * here.)
 *
 * THE PHOTOGRAPHS are the two Tim attached for this page, "Gladys AI.png" and
 * "Manet Khamayo lighter.png", cropped to the template's 3:4 portrait.
 *
 * THE BRITISH COUNCIL LINE. Tim: "Gladys and Manet have British Council
 * qualifications... Ask AI how to weave this in, please." Gladys holds the
 * British Council "UK agent and counsellor training" certification award
 * (30 January 2026) and Manet its certificate of completion (valid to April
 * 2028). The British Council's own footnote says it does not endorse,
 * accredit or validate agents, so the line says what the certificates are
 * and claims nothing more.
 *
 * THE RECORDING. Gladys has no podcast of her own. Tim: "The biggest
 * challenge Ghanaian students have is getting a Student Visa for the UK",
 * so the slot carries WSA 023 from the Student Support Library, behind a
 * plain WSA poster rather than Gladys's photograph, because she is not in it.
 *
 * THE FORM is Tim's Pipedrive form, "all set up in Pipedrive for Gladys":
 * Gladys Naadi is Source Owner and Manet Khamayo Student Owner. All of that
 * is Pipedrive's; nothing here touches it. Its thank-you address is the one
 * Tim gave, /speak-to-gladys-thank-you.
 */
import { FREE_SERVICE_LINE, studyFamiliesFor, type AdvisorLandingContent } from "./advisorLandingPage";

export const GLADYS_PAGE: AdvisorLandingContent = Object.freeze({
  path: "/speak-to-gladys",
  thankYouPath: "/speak-to-gladys-thank-you",
  country: { name: "Ghana", flagCode: "gh" },

  advisor: {
    name: "Gladys Naadi",
    role: "Director for Ghana",
    location: "Accra, Ghana",
    whatsapp: "+233 55 521 6156",
    whatsappDigits: "233555216156",
    email: "gladys@worldstudentadvisors.com",
    photo: "/team/gladys-naadi.jpg",
    photoAlt: "Gladys Naadi, Director for Ghana at World Student Advisors in Accra",
    photoWidth: 720,
    photoHeight: 960,
    organisation: "World Student Advisors",
    intro:
      "Gladys is your first point of contact in Ghana. She works with students and families across the country, from first questions through to deciding where to apply.",
    firstMessage: "Hello Gladys, I saw the WSA page and I would like to ask about studying abroad.",
  },

  // Manet, Gladys's dedicated Student Counsellor. No contact details: Gladys
  // is the first point of contact (see AdvisorPerson). Tim marked the panel
  // "No change" from Juliet's, so it carries Glenice's two lines with the
  // names changed.
  counsellor: {
    name: "Manet Khamayo",
    role: "Gladys's dedicated Student Counsellor",
    photo: "/team/manet-khamayo-lighter.jpg",
    photoAlt: "Manet Khamayo, Student Counsellor at World Student Advisors",
    photoWidth: 720,
    photoHeight: 960,
    headOfficeLine: "Linked to WSA UK Head Office",
    panelHeading: "Your dedicated Student Counsellor",
    panelBody: [
      "I support students throughout their journey, from exploring courses and universities to applications, visas and preparing to leave home.",
      "Manet does not contact you at this stage. Gladys speaks to you first, and introduces you to Manet when you decide to go ahead.",
    ],
  },

  hero: {
    eyebrow: "For the people of Ghana",
    headline: "Thinking about studying abroad? Speak to Gladys.",
    supporting: "Free, personal support for Ghanaian students and families from Gladys and the World Student Advisors team.",
    primaryCta: "Message Gladys on WhatsApp",
    secondary: {
      heading: "Prefer Gladys to contact you?",
      supporting: "Leave your details and Gladys will get in touch with you.",
      cta: "Send my details to Gladys",
    },
    phoneLabel: "Call or WhatsApp",
    emailLabel: "Email Gladys",
  },

  credentials: "Gladys and Manet both hold British Council certificates in UK agent and counsellor training.",

  // WSA 023, already in the Student Support Library (Tim Hunt, 24 October 2026).
  podcast: {
    youtubeId: "jqaNY_UTekc",
    title: "WSA 023 CAS and UKVI Credibility Interview",
    blurb:
      "Getting a UK Student visa is the biggest challenge for many students in Ghana. World Student Advisors offers free interview training and a mock interview.",
    poster: "brand",
    libraryPath: "/student-support-library/cas-and-ukvi-credibility-interview",
    libraryLabel: "WSA 023 in the Student Support Library",
  },

  askHeading: "What you can ask Gladys about",
  studyFamilies: studyFamiliesFor("Ghana"),
  // Tim Hunt: "Replace the above sentence with this below, please."
  availabilityNote:
    "The study options available to you will depend on your academic qualifications, your preferred intake and the entry requirements of each institution. Gladys will help you explore suitable opportunities and guide you towards the best options for your circumstances and ambitions.",

  // Tim Hunt's three steps, 24 October 2026, as he wrote them.
  steps: [
    { title: "Speak to Gladys", body: "Message her on WhatsApp and tell her what you are thinking about. There is no form to fill in first." },
    {
      title: "Gladys talks it through with you",
      body: "Gladys is the person you deal with in Ghana. She follows up personally, helps you work out what to study and where, and stays with you while you decide.",
    },
    {
      title: "Manet takes your application forward",
      body: "When you decide to go ahead, Gladys introduces you to Manet Khamayo, your dedicated Student Counsellor, linked to WSA UK Head Office. Manet handles your course choice, your applications and your visa preparation. Gladys stays part of the conversation throughout.",
    },
  ],

  // Tim Hunt's closing section, 24 October 2026, as he wrote it.
  keyMessage: [
    "Gladys is your person in Ghana.",
    "Manet is your dedicated WSA Student Counsellor, linked to UK Head Office.",
    "WSA provides the infrastructure and expertise.",
    FREE_SERVICE_LINE,
  ],

  form: {
    // Tim Hunt's form, 24 October 2026, exactly as he sent it.
    embedUrl: "https://webforms.pipedrive.com/f/6FzmqLZuj3P8GwoHDGL648Ia2jcrXuCILo9S7P21FJUHdS3p7W3xc0t6gWZHyRYbIL",
    heading: "Ask Gladys to contact you",
    supporting: "Leave your details below and Gladys will get in touch with you.",
    privacyLine: "Your details go to WSA's student records system so that Gladys can contact you.",
  },

  // Tim has not said whether Gladys's form sends an automatic acknowledgement,
  // so, unlike Madalitso's page, this one does not promise an email.
  thankYou: {
    eyebrow: "Speak to Gladys",
    headline: "Thank you. Your details are with Gladys.",
    body: "Gladys will be in touch with you shortly.",
    sooner: "Would you like to talk sooner?",
    whatsappCta: "Message Gladys on WhatsApp",
    whatsappMessage: "Hello Gladys, I have just sent you my details through your page.",
    back: "Back to Gladys's page",
    library: "Explore the Student Support Library while you wait",
  },
} satisfies AdvisorLandingContent);
