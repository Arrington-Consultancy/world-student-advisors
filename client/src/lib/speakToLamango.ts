/**
 * World Student Advisors Cameroon: Lamango's landing page, in English and
 * French, for Tim Hunt's bilingual Pipedrive form of 26 November 2026.
 *
 * Built to Tim's mock-up of 28 November 2026 ("Tim's Mock Lamago LP"). The
 * wording here is his, in both languages, as are the map, her portrait and
 * the order of the page: the region and its nine countries, Lamango, how we
 * can help, the destinations, the success stories, Manet, then the form.
 * English sits on the left and French on the right, as he laid them out. A
 * phone shows one language at a time and opens in French, the language his
 * form puts first.
 *
 * His mock-up says "Add tel and email" under her portrait: those are the
 * ones the Contact page already publishes.
 *
 * Still a draft until Tim approves it: noindex, out of the sitemap and the
 * prerender list, linked from nowhere (shared/seo.ts).
 */

export const PAGE_PATH = "/speak-to-lamango";

/** Where the form can send a student after they submit it. Tim sets that redirect in Pipedrive. */
export const THANK_YOU_PATH = "/speak-to-lamango/thank-you";

/** Tim's form, "Parlez à Lamango / Speak to Lamango", exactly as supplied. */
export const LAMANGO_FORM_URL =
  "https://webforms.pipedrive.com/f/6zhaUeZkY2Bc4jY7Rwdes9m6f6wJbIUyRR06KZRFG5WGRI7uuNYQsoqyCaJfahar5h";

/** As the Contact page publishes them (client/src/pages/Contact.tsx); a test holds the two together. */
export const LAMANGO = Object.freeze({
  name: "Lamango Enow Magdaline Esq.",
  phone: "+237 699 93 10 86",
  phoneHref: "tel:+237699931086",
  whatsappHref: "https://wa.me/237699931086",
  email: "Lamango.enow@worldstudentadvisors.com",
  address:
    "Carrefour Ministre via 10ème arrêt Bitotol, PO Box 863, Yaoundé, Cameroon",
});

/** The set the country pages use, so it shows on every device. */
export const CAMEROON_FLAG_SRC = "/flags/cm.svg";

/** Tim's map of the region, from his mock-up. Its labels are in French. */
export const MAP = Object.freeze({
  src: "/images/lamango/central-africa-map.jpg",
  width: 1521,
  height: 912,
});

/** Her portrait, as Tim supplied it for this page. */
export const PORTRAIT = Object.freeze({
  src: "/team/lamango-enow-portrait.jpg",
  width: 511,
  height: 641,
});

/** The lighter portrait of Manet that Tim chose for this page. */
export const MANET_PHOTO = Object.freeze({
  src: "/team/manet-khamayo-lighter.jpg",
  width: 720,
  height: 960,
});

export const SUCCESS_STORIES_PATH = "/student-success-stories";

export type Lang = "en" | "fr";
/** Left to right on a large screen, as in Tim's mock-up. */
export const LANGS = ["en", "fr"] as const;
/** The language a phone opens in: the one Tim's form puts first. */
export const DEFAULT_LANG: Lang = "fr";

export interface LamangoCopy {
  htmlLang: string;
  switchLabel: string;
  region: {
    title: string;
    name: string;
    countries: readonly string[];
    mapAlt: string;
  };
  intro: {
    paragraphs: readonly string[];
    whatsapp: string;
    portraitAlt: string;
  };
  help: {
    heading: string;
    items: ReadonlyArray<{ title: string; body: string }>;
  };
  destinations: { heading: string; list: readonly string[] };
  stories: { heading: string; body: string; link: string };
  manet: { heading: string; role: string; body: string; photoAlt: string };
  form: { privacy: string };
  contactLabel: string;
  officeLabel: string;
  whatsappLabel: string;
  thankYou: { headline: string; body: string; back: string };
}

export const COPY: Readonly<Record<Lang, LamangoCopy>> = Object.freeze({
  en: {
    htmlLang: "en-GB",
    switchLabel: "English",
    region: {
      title: "World Student Advisors Cameroon",
      name: "Central Africa",
      countries: [
        "Angola",
        "Cameroon",
        "Central African Republic",
        "Chad",
        "Democratic Republic of the Congo",
        "Equatorial Guinea",
        "Gabon",
        "Republic of the Congo",
        "São Tomé and Príncipe",
      ],
      mapAlt:
        "Map of Central Africa showing Cameroon, with Yaoundé marked, and Chad, the Central African Republic, Equatorial Guinea, São Tomé and Príncipe, Gabon, Congo, DR Congo and Angola",
    },
    intro: {
      paragraphs: [
        "Based in Yaoundé, Lamango Enow Magdaline is World Student Advisors’ regional representative for Central Africa. She speaks French and English and will be your first point of contact to discuss studying abroad. She’ll help you choose a destination and course that suit your goals and budget.",
        "When you’re ready to apply, Lamango will introduce you to Manet Khamayo, your WSA Student Counsellor. Manet will manage your university application and help you prepare your student visa application. Our advice and university application support are free.",
      ],
      whatsapp: "WhatsApp Lamango",
      portraitAlt:
        "Lamango Enow Magdaline, World Student Advisors regional representative for Central Africa",
    },
    help: {
      heading: "How we can help you",
      items: [
        {
          title: "Choose your course and destination",
          body: "Find a course and country that fit your interests, budget and goals.",
        },
        {
          title: "Prepare your applications",
          body: "Get step by step help with your applications and supporting documents.",
        },
        {
          title: "Get ready to travel",
          body: "Plan your accommodation and prepare for departure and arrival.",
        },
      ],
    },
    destinations: {
      heading: "Popular study destinations",
      list: [
        "UK",
        "USA",
        "Canada",
        "Australia",
        "Germany",
        "Cyprus",
        "Hungary",
        "Ireland",
        "Europe",
      ],
    },
    stories: {
      heading: "WSA Student Success Stories",
      body: "Read how students supported by WSA chose where to study and took their next step abroad.",
      link: "Read their stories",
    },
    manet: {
      heading: "Meet Manet Khamayo",
      role: "Your WSA Student Counsellor",
      body: "Lamango is your first contact in Cameroon and Central Africa. When you’re ready to apply, she’ll introduce you to Manet, who will manage your university application and help with your student visa.",
      photoAlt: "Manet Khamayo, WSA Student Counsellor",
    },
    form: {
      privacy:
        "Your details go to WSA’s student records system so that Lamango can contact you.",
    },
    contactLabel: "Call or message Lamango",
    officeLabel: "Yaoundé office",
    whatsappLabel: "WhatsApp",
    thankYou: {
      headline: "Thank you. Your details are with Lamango.",
      body: "Lamango will be in touch with you shortly.",
      back: "Back to Lamango's page",
    },
  },
  fr: {
    htmlLang: "fr-CM",
    switchLabel: "Français",
    region: {
      title: "World Student Advisors Cameroun",
      name: "Afrique centrale",
      countries: [
        "Angola",
        "Cameroun",
        "République centrafricaine",
        "Tchad",
        "République démocratique du Congo",
        "Guinée équatoriale",
        "Gabon",
        "République du Congo",
        "São Tomé-et-Príncipe",
      ],
      mapAlt:
        "Carte de l’Afrique centrale montrant le Cameroun, avec Yaoundé, ainsi que le Tchad, la République centrafricaine, la Guinée équatoriale, São Tomé-et-Príncipe, le Gabon, le Congo, la RD Congo et l’Angola",
    },
    intro: {
      paragraphs: [
        "Basée à Yaoundé, Lamango Enow Magdaline est la représentante régionale de World Student Advisors pour l’Afrique centrale. Elle parle français et anglais et sera votre premier point de contact pour discuter de votre projet d’études à l’étranger. Elle vous aidera à choisir une destination et une formation adaptées à vos objectifs et à votre budget.",
        "Lorsque vous serez prêt à déposer votre candidature, Lamango vous mettra en contact avec Manet Khamayo, votre conseillère WSA. Manet suivra votre candidature auprès de l’établissement et vous aidera à préparer votre demande de visa étudiant. Nos conseils et notre accompagnement pour les candidatures universitaires sont gratuits.",
      ],
      whatsapp: "Écrire à Lamango sur WhatsApp",
      portraitAlt:
        "Lamango Enow Magdaline, représentante régionale de World Student Advisors pour l’Afrique centrale",
    },
    help: {
      heading: "Comment nous pouvons vous aider",
      items: [
        {
          title: "Choisissez votre formation et votre destination",
          body: "Trouvez une formation et un pays adaptés à vos intérêts, à votre budget et à vos objectifs.",
        },
        {
          title: "Préparez vos candidatures",
          body: "Bénéficiez d’un accompagnement à chaque étape de vos candidatures et de la préparation des pièces justificatives.",
        },
        {
          title: "Préparez votre voyage",
          body: "Prévoyez votre logement et préparez votre départ et votre arrivée.",
        },
      ],
    },
    destinations: {
      heading: "Destinations d’études populaires",
      list: [
        "Royaume-Uni",
        "États-Unis",
        "Canada",
        "Australie",
        "Allemagne",
        "Chypre",
        "Hongrie",
        "Irlande",
        "Europe",
      ],
    },
    stories: {
      heading: "Parcours de réussite avec WSA",
      body: "Découvrez comment les étudiants accompagnés par WSA ont choisi leur destination et concrétisé leur projet.",
      link: "Lire leurs témoignages",
    },
    manet: {
      heading: "Rencontrez Manet Khamayo",
      role: "Votre conseillère WSA",
      body: "Lamango est votre premier contact au Cameroun et en Afrique centrale. Lorsque vous serez prêt à postuler, elle vous présentera Manet, qui suivra votre candidature et vous aidera à préparer votre demande de visa étudiant.",
      photoAlt: "Manet Khamayo, conseillère WSA",
    },
    form: {
      privacy:
        "Vos coordonnées sont enregistrées dans le système de dossiers étudiants de WSA afin que Lamango puisse vous contacter.",
    },
    contactLabel: "Appelez Lamango ou écrivez-lui",
    officeLabel: "Bureau de Yaoundé",
    whatsappLabel: "WhatsApp",
    thankYou: {
      headline: "Merci. Lamango a bien reçu vos coordonnées.",
      body: "Lamango vous contactera très bientôt.",
      back: "Retour à la page de Lamango",
    },
  },
});

/** Every string the two pages render, for the copy guards. */
export function allRenderedCopy(): string {
  return LANGS.flatMap(l => {
    const c = COPY[l];
    return [
      c.switchLabel,
      c.region.title,
      c.region.name,
      ...c.region.countries,
      c.region.mapAlt,
      ...c.intro.paragraphs,
      c.intro.whatsapp,
      c.intro.portraitAlt,
      c.help.heading,
      ...c.help.items.flatMap(i => [i.title, i.body]),
      c.destinations.heading,
      ...c.destinations.list,
      ...Object.values(c.stories),
      ...Object.values(c.manet),
      c.form.privacy,
      c.contactLabel,
      c.officeLabel,
      c.whatsappLabel,
      ...Object.values(c.thankYou),
    ];
  }).join("\n");
}
