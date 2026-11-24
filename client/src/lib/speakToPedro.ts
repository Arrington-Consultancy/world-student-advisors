/**
 * Speak to Pedro / Fale com o Pedro: Pedro Bezerra's bilingual landing page
 * for Angola and the Portuguese-speaking countries.
 *
 * AUTHORITY. Tim Hunt to Tom Arrington, 22 November 2026, "Pedro landing
 * pages": his mock-up (30_Pedro_Angola_Landing_Page.png), Pedro's
 * photograph (20. Pedro Bezarra profile image.png; the page spells the
 * name Bezerra, as the mock-up, the Our Team page and the Angola stories
 * do) and Pedro's bilingual Pipedrive form ("Fale com o Pedro"). Tom
 * Arrington asked for it to be built on 23 November 2026. Every English and
 * Portuguese line is Tim's, from the mock-up, except as noted below. His
 * prototype site could not be read (it asks for a sign-in), so the mock-up
 * is the source.
 *
 * ONE PAGE, TWO LANGUAGES, SIDE BY SIDE, as the mock-up lays it out: English
 * on the left, Portuguese on the right, each column marked with its
 * language so a screen reader pronounces it properly. A phone has no room
 * for two columns, so there the mock-up's "English / Português" switch
 * chooses which one shows; the prerendered page carries both.
 *
 * THE ROLE. Pedro is the first contact. When a student is ready to apply,
 * he introduces them to Eldah Therone, their WSA Student Counsellor, as the
 * mock-up's "Meet Eldah Therone" box says.
 *
 * CHANGES TO THE MOCK-UP'S WORDING, for Tim and Pedro to check:
 *  - The Eldah box in Portuguese read "o Pedro apresentá-la-á à Eldah. Ela
 *    ajudá a preparar": the pronoun pointed at Eldah rather than the student
 *    and a word was missing. It reads "o Pedro vai apresentá-lo à Eldah. Ela
 *    vai ajudá-lo a preparar" here.
 *  - "Director Geral" is "Director-Geral", as in the Angola story Tim
 *    approved.
 *  - The privacy line under the form is the site's usual one; its
 *    Portuguese is new and is for Pedro to check.
 *  - The mock-up's note that "The registration form is awaiting connection"
 *    is gone: the form is connected.
 *
 * CONTACT DETAILS. Pedro's number and email are the ones the Our Team and
 * Contact pages already publish, and the ones the mock-up shows.
 */

export const PAGE_PATH = "/speak-to-pedro";

/**
 * Where Pedro's Pipedrive form can send a family once they have submitted
 * it. Tim Hunt tested the form on 23 November 2026 and landed on Eldah's
 * thank-you page ("This response from Pedro's form is my error in
 * Pipedrive?"). The website sends nobody anywhere after a Pipedrive form:
 * the redirect is set on the form in Pipedrive, and Pedro had no page of his
 * own for it to point at. This is that page. Tim changes the redirect.
 */
export const THANK_YOU_PATH = "/speak-to-pedro/thank-you";

/** Pedro's bilingual Pipedrive form, "Fale com o Pedro", as Tim supplied it. */
export const PEDRO_FORM_URL =
  "https://webforms.pipedrive.com/f/ccRoBZeUNXEdCX5jkah4pkwpWOJPWPKi15KSGg9ztZODgnu2uyiKRVutGmpOXy8zmj";

export const PEDRO = Object.freeze({
  name: "Pedro Bezerra",
  phone: "+44 7512 055 433",
  phoneHref: "tel:+447512055433",
  email: "beezapy@hotmail.com",
  photo: "/team/pedro-bezerra-portrait.jpg",
  photoWidth: 960,
  photoHeight: 960,
});

export const ELDAH = Object.freeze({
  photo: "/team/eldah-therone-portrait.jpg",
  photoWidth: 960,
  photoHeight: 920,
});

/** WSA 039 in the Student Support Library, as on Claudia's page. */
export const PODCAST = Object.freeze({
  youtubeId: "6a7do5dlbOI",
  youtubeUrl: "https://www.youtube.com/watch?v=6a7do5dlbOI",
  libraryPath: "/student-support-library/ten-steps-to-uk-university-success",
});

export const STORIES_PATHS = Object.freeze({
  angola: "/student-success-stories/angola",
  all: "/student-success-stories",
});

export type Lang = "en" | "pt";

export interface PedroCopy {
  /** BCP 47, set on the column so it is read in the right language. */
  htmlLang: string;
  switchLabel: string;
  hero: {
    eyebrow: string;
    headline: string;
    role: string;
    intro: readonly string[];
    freeLine: string;
    cta: string;
    photoAlt: string;
  };
  help: {
    heading: string;
    items: ReadonlyArray<{ title: string; body: string }>;
  };
  destinations: { heading: string; list: readonly string[] };
  podcast: { heading: string; title: string; body: string; cta: string };
  stories: {
    heading: string;
    body: string;
    angolaLink: string;
    allLink: string;
  };
  eldah: { heading: string; role: string; body: string; photoAlt: string };
  form: { heading: string; supporting: string; privacy: string };
  contactLabel: string;
  /** The page a family sees after sending the form. Wording follows the other thank-you pages. */
  thankYou: { headline: string; body: string; back: string };
}

export const COPY: Readonly<Record<Lang, PedroCopy>> = Object.freeze({
  en: {
    htmlLang: "en-GB",
    switchLabel: "English",
    hero: {
      eyebrow: "World Student Advisors Angola",
      headline: "Speak to Pedro",
      role: "Director for Portuguese-speaking Countries",
      intro: [
        "I’m Pedro Bezerra. I was born in Angola, am a British citizen and live in the UK. I speak English and Portuguese fluently.",
        "I studied Business Management as an undergraduate and Digital Marketing at master’s level, both at Coventry University in England.",
      ],
      freeLine: "Our advice and university application support are free.",
      cta: "Register your interest",
      photoAlt:
        "Pedro Bezerra, Director for Portuguese-speaking Countries at World Student Advisors",
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
    podcast: {
      heading: "Podcast",
      title: "WSA 039 · Ten Steps to UK University Success",
      body: "Tim Hunt, Managing Director of WSA, shares ten practical steps for preparing for university in the UK.",
      cta: "Listen in English",
    },
    stories: {
      heading: "Student success stories",
      body: "Read about two students from Angola. One pursued a master’s degree and the other took an English language course.",
      angolaLink: "Read the Angola success stories",
      allLink: "See all student success stories",
    },
    eldah: {
      heading: "Meet Eldah Therone",
      role: "Your WSA Student Counsellor",
      body: "When you’re ready to apply, Pedro will introduce you to Eldah. She’ll help you prepare your documents and submit your university application.",
      photoAlt: "Eldah Therone, WSA Student Counsellor",
    },
    form: {
      heading: "Prefer Pedro to contact you?",
      supporting: "Tell us what you’d like to study.",
      privacy:
        "Your details go to WSA’s student records system so that Pedro can contact you.",
    },
    contactLabel: "Call or email Pedro",
    thankYou: {
      headline: "Thank you. Your details are with Pedro.",
      body: "Pedro will be in touch with you shortly.",
      back: "Back to Pedro's page",
    },
  },
  pt: {
    htmlLang: "pt-AO",
    switchLabel: "Português",
    hero: {
      eyebrow: "World Student Advisors Angola",
      headline: "Fale com o Pedro",
      role: "Director para os Países Lusófonos",
      intro: [
        "Sou Pedro Bezerra. Nasci em Angola, tenho cidadania britânica e vivo no Reino Unido. Falo português e inglês fluentemente.",
        "Concluí a licenciatura em Gestão de Empresas e o mestrado em Marketing Digital na Universidade de Coventry, em Inglaterra.",
      ],
      freeLine:
        "O nosso aconselhamento e apoio às candidaturas universitárias são gratuitos.",
      cta: "Registe o seu interesse",
      photoAlt:
        "Pedro Bezerra, Director para os Países Lusófonos na World Student Advisors",
    },
    help: {
      heading: "Como podemos ajudar",
      items: [
        {
          title: "Escolha o curso e o destino",
          body: "Encontre um curso e um país que se ajustem aos seus interesses, orçamento e objectivos.",
        },
        {
          title: "Prepare as suas candidaturas",
          body: "Receba apoio em cada etapa da candidatura e na preparação dos documentos necessários.",
        },
        {
          title: "Prepare a sua viagem",
          body: "Planeie o alojamento e prepare a sua partida e chegada.",
        },
      ],
    },
    destinations: {
      heading: "Destinos de estudo populares",
      list: [
        "Reino Unido",
        "EUA",
        "Canadá",
        "Austrália",
        "Alemanha",
        "Chipre",
        "Hungria",
        "Irlanda",
        "Europa",
      ],
    },
    podcast: {
      heading: "Podcast",
      title: "WSA 039 · Dez passos para o sucesso universitário no Reino Unido",
      body: "Tim Hunt, Director-Geral da WSA, apresenta dez passos práticos para se preparar para estudar numa universidade britânica.",
      cta: "Ouvir em inglês",
    },
    stories: {
      heading: "Histórias de sucesso dos estudantes",
      body: "Conheça o percurso de dois estudantes angolanos. Uma estudante frequentou um mestrado e o outro estudante fez um curso de inglês.",
      angolaLink: "Ler as histórias de sucesso de Angola",
      allLink: "Ver todas as histórias de sucesso",
    },
    eldah: {
      heading: "Conheça a Eldah Therone",
      role: "A sua orientadora de estudos na WSA",
      body: "Quando estiver pronto para se candidatar, o Pedro vai apresentá-lo à Eldah. Ela vai ajudá-lo a preparar os documentos e a apresentar a candidatura à universidade.",
      photoAlt: "Eldah Therone, orientadora de estudos da WSA",
    },
    form: {
      heading: "Prefere que o Pedro entre em contacto consigo?",
      supporting: "Diga-nos o que gostaria de estudar.",
      privacy:
        "Os seus dados ficam no sistema de registo de estudantes da WSA, para que o Pedro possa contactá-lo.",
    },
    contactLabel: "Telefone ou envie um email ao Pedro",
    thankYou: {
      headline: "Obrigado. Os seus dados estão com o Pedro.",
      body: "O Pedro vai entrar em contacto consigo em breve.",
      back: "Voltar à página do Pedro",
    },
  },
});

/** Every string the page renders, for the copy guards. */
export function allRenderedCopy(): string {
  return (["en", "pt"] as const)
    .flatMap(l => {
      const c = COPY[l];
      return [
        c.switchLabel,
        ...Object.values(c.hero).flat(),
        c.help.heading,
        ...c.help.items.flatMap(i => [i.title, i.body]),
        c.destinations.heading,
        ...c.destinations.list,
        ...Object.values(c.podcast),
        ...Object.values(c.stories),
        ...Object.values(c.eldah),
        ...Object.values(c.form),
        c.contactLabel,
        ...Object.values(c.thankYou),
      ];
    })
    .join("\n");
}
