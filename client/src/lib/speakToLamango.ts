/**
 * Parlez à Lamango / Speak to Lamango: the Cameroon landing page, in French
 * and English, for Tim Hunt's bilingual Pipedrive form of 26 November 2026.
 * Tom Arrington asked for it on 27 November 2026, modelled on Pedro's page.
 *
 * A FIRST DRAFT, AND NOT YET TIM'S. He sent the form and nothing else, so:
 *  - the two lines about Lamango are the form's own words, his;
 *  - her name, title, office address, number and email are the ones the
 *    Contact page already publishes;
 *  - "How we can help you" and the destinations are Pedro's, put into
 *    French;
 *  - there is no photograph, podcast or success story, because none has
 *    been supplied or cleared for Cameroon.
 * Still needed from Tim: her photograph, a few lines about her or a mock-up,
 * and whether the page should name study in French in Canada. The French is
 * for Lamango to check.
 *
 * So the page is a draft: noindex, out of the sitemap and the prerender
 * list, linked from nowhere (shared/seo.ts). French comes first, as it does
 * on Tim's form.
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

export type Lang = "fr" | "en";
export const LANGS = ["fr", "en"] as const;

export interface LamangoCopy {
  htmlLang: string;
  switchLabel: string;
  hero: {
    eyebrow: string;
    headline: string;
    role: string;
    intro: readonly string[];
    freeLine: string;
    cta: string;
  };
  help: {
    heading: string;
    items: ReadonlyArray<{ title: string; body: string }>;
  };
  destinations: { heading: string; list: readonly string[] };
  form: { heading: string; supporting: string; privacy: string };
  contactLabel: string;
  officeLabel: string;
  whatsappLabel: string;
  thankYou: { headline: string; body: string; back: string };
}

export const COPY: Readonly<Record<Lang, LamangoCopy>> = Object.freeze({
  fr: {
    htmlLang: "fr-CM",
    switchLabel: "Français",
    hero: {
      eyebrow: "World Student Advisors Cameroun",
      headline: "Parlez à Lamango",
      role: "Représentante régionale exclusive, Afrique centrale",
      intro: [
        "Lamango dirige le bureau de World Student Advisors à Yaoundé, au Cameroun, et accompagne les étudiants des pays francophones d’Afrique centrale.",
        "Elle vous contactera en français ou en anglais, selon votre préférence, pour discuter de vos options d’études.",
      ],
      freeLine:
        "Nos conseils et notre accompagnement pour les candidatures universitaires sont gratuits.",
      cta: "Enregistrez votre intérêt",
    },
    help: {
      heading: "Comment nous pouvons vous aider",
      items: [
        {
          title: "Choisir votre formation et votre destination",
          body: "Trouvez une formation et un pays qui correspondent à vos intérêts, à votre budget et à vos objectifs.",
        },
        {
          title: "Préparer vos candidatures",
          body: "Bénéficiez d’une aide étape par étape pour vos candidatures et vos pièces justificatives.",
        },
        {
          title: "Préparer votre départ",
          body: "Organisez votre logement et préparez votre départ et votre arrivée.",
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
    form: {
      heading: "Vous préférez que Lamango vous contacte ?",
      supporting: "Dites-nous ce que vous aimeriez étudier.",
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
  en: {
    htmlLang: "en-GB",
    switchLabel: "English",
    hero: {
      eyebrow: "World Student Advisors Cameroon",
      headline: "Speak to Lamango",
      role: "Exclusive Regional Representative, Central Africa",
      intro: [
        "Lamango runs the World Student Advisors office in Yaoundé, Cameroon, and supports students from francophone countries across Central Africa.",
        "She’ll contact you in French or English, whichever you prefer, to discuss your study options.",
      ],
      freeLine: "Our advice and university application support are free.",
      cta: "Register your interest",
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
    form: {
      heading: "Prefer Lamango to contact you?",
      supporting: "Tell us what you’d like to study.",
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
});

/** Every string the two pages render, for the copy guards. */
export function allRenderedCopy(): string {
  return LANGS.flatMap(l => {
    const c = COPY[l];
    return [
      c.switchLabel,
      c.hero.eyebrow,
      c.hero.headline,
      c.hero.role,
      ...c.hero.intro,
      c.hero.freeLine,
      c.hero.cta,
      c.help.heading,
      ...c.help.items.flatMap(i => [i.title, i.body]),
      c.destinations.heading,
      ...c.destinations.list,
      ...Object.values(c.form),
      c.contactLabel,
      c.officeLabel,
      c.whatsappLabel,
      ...Object.values(c.thankYou),
    ];
  }).join("\n");
}
