/**
 * Speak to Pedro: the Angola page for families in Luanda, in Portuguese
 * first and English second.
 *
 * AUTHORITY. Tom Arrington's build brief of 18 October 2026, "CLAUDE BRIEF -
 * Pedro Angola Bilingual Landing Page", in WSA SharePoint under
 * 16_WEBSITE_Artificial Inteligence (AI)/07 Landing Pages. It authorises a
 * reviewable draft only: no publication, no merge, no advertising and no CRM
 * change without Tom's approval.
 *
 * DRAFT UNTIL EVERY BLOCKER BELOW IS CLEARED. The four routes are noindex,
 * out of the sitemap and prerender list, and linked from nowhere. While
 * publicationBlockers() returns anything, the page says "draft" at the top.
 *
 * WHAT IS NOT ON THIS PAGE, AND WHY. No phone number, WhatsApp number or
 * email address: none has been approved for this page. No podcast: none has
 * been approved. No testimonials, rankings, partnerships, fees, scholarships
 * or promises of a place or a visa. No "free service" line: Tim Hunt
 * confirmed that for Speak to Juliet, and it has not been confirmed for this
 * audience.
 *
 * THE ENQUIRY FORM IS PIPEDRIVE'S, AS ON SPEAK TO MADALITSO. Read-only check
 * of the live account, 18 October 2026 (run 39133447741):
 *   - Pedro Bezerra is not a Pipedrive user, so he cannot be a Lead Owner or
 *     fill a user field. No "Source Owner" or referrer field exists on Leads.
 *   - Every Lead from Tim's "Speak to Madalitso" form has the native Lead
 *     Owner Eldah Therone (user 25633444); the form's name is recorded in
 *     the Lead's native Source channel ID, which is what ties those Leads to
 *     Madalitso.
 *   - The website's own sign-up path sets no owner at all, and asks for date
 *     of birth and passport details, which this brief rules out.
 * So the page embeds a Pedro form once Tim has created it in Pipedrive (Lead
 * Owner Eldah, form name "Speak to Pedro"), one per language, each
 * redirecting to its own thank-you page below. Until then the form slot says
 * plainly that it is pending. Creating the form is CRM configuration and
 * needs Tom's approval.
 *
 * THE PHOTOGRAPH. Tom chose the smiling picture, top left in "website
 * photo.jpg" (12_SPOKES_&_CONSORTIUM/Pedro), a WhatsApp screenshot of four
 * pictures. The draft uses that crop, 450 pixels square, and labels it.
 * Publication needs the original file and Pedro's permission.
 */
import { PIPEDRIVE_LOADER_SRC } from "./advisorLandingPage";

export type PedroLang = "pt" | "en";

export const PEDRO_LANGS: ReadonlyArray<PedroLang> = Object.freeze([
  "pt",
  "en",
]);

/** Portuguese is the default: it owns the plain address. */
export const PEDRO_PATHS: Readonly<Record<PedroLang, string>> = Object.freeze({
  pt: "/speak-to-pedro",
  en: "/speak-to-pedro/en",
});

/** Where each language's Pipedrive form sends the family after submitting. */
export const PEDRO_THANK_YOU_PATHS: Readonly<Record<PedroLang, string>> =
  Object.freeze({
    pt: "/speak-to-pedro/obrigado",
    en: "/speak-to-pedro/en/thank-you",
  });

export const PEDRO_ALL_PATHS: ReadonlyArray<string> = Object.freeze([
  PEDRO_PATHS.pt,
  PEDRO_PATHS.en,
  PEDRO_THANK_YOU_PATHS.pt,
  PEDRO_THANK_YOU_PATHS.en,
]);

/** The unchanged WSA logo, the same file the site header uses. */
export const WSA_LOGO = Object.freeze({
  src: "/manus-storage/wsa_logo_beb199d6.png",
  width: 1366,
  height: 325,
});

export const PEDRO_PHOTO = Object.freeze({
  src: "/team/pedro-bezerra-draft.jpg",
  width: 450,
  height: 450,
  /** False until Tom approves the original photograph and Pedro's permission is recorded. */
  approvedForPublication: false,
});

export const ELDAH_PHOTO = Object.freeze({
  src: "/team/eldah-therone.jpg",
  width: 720,
  height: 960,
});

/**
 * The embed URL of each language's Pipedrive form, exactly as Pipedrive
 * gives it. Empty until Tim creates the forms: Pipedrive does not expose web
 * forms through its API (HTTP 404, run 35484248589), so the URL can only
 * come from Pipedrive's own interface. Never guessed.
 */
export const PEDRO_FORM_EMBED_URLS: Readonly<Record<PedroLang, string>> =
  Object.freeze({
    pt: "",
    en: "",
  });

export { PIPEDRIVE_LOADER_SRC };

export function isPipedriveFormUrl(url: string): boolean {
  return /^https:\/\/webforms\.pipedrive\.com\/f\/[A-Za-z0-9]+$/.test(url);
}

/**
 * Everything that must be settled before the page can be published, in
 * Tom's words of the brief. The page shows its draft banner while this list
 * is not empty, and the tests hold it to the data, so the banner cannot be
 * removed by deleting a line here while the cause is still true.
 */
export function publicationBlockers(): string[] {
  const out: string[] = [];
  if (!PEDRO_PHOTO.approvedForPublication)
    out.push(
      "Pedro's photograph: the original high-resolution file and his permission to use it."
    );
  for (const lang of PEDRO_LANGS) {
    if (!isPipedriveFormUrl(PEDRO_FORM_EMBED_URLS[lang]))
      out.push(
        `The ${lang === "pt" ? "Portuguese" : "English"} Pipedrive form: Lead Owner Eldah Therone, redirecting to ${PEDRO_THANK_YOU_PATHS[lang]}.`
      );
  }
  out.push(
    'Pedro\'s public title: "Director for Angola" (Contact page, Angola office letterhead) or "Director of Lusophone Countries" (Our Team).'
  );
  out.push("The Portuguese text, checked by a native speaker.");
  return out;
}

/** The other language's address for the same page, keeping the visitor's query string (UTM tags included). */
export function languageSwitchHref(
  path: string,
  target: PedroLang,
  search = ""
): string {
  const isThankYou =
    path === PEDRO_THANK_YOU_PATHS.pt || path === PEDRO_THANK_YOU_PATHS.en;
  const base = isThankYou ? PEDRO_THANK_YOU_PATHS[target] : PEDRO_PATHS[target];
  const query =
    search && search !== "?"
      ? search.startsWith("?")
        ? search
        : `?${search}`
      : "";
  return `${base}${query}`;
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

export interface PedroCopy {
  langName: string;
  switchLabel: string;
  draft: { label: string; line: string; photo: string };
  hero: {
    eyebrow: string;
    headline: string;
    intro: string;
    primaryCta: string;
    secondaryCta: string;
    levels: string;
  };
  pedro: {
    name: string;
    role: string;
    place: string;
    body: string;
    office: string;
  };
  eldah: { name: string; role: string; body: string };
  pathways: {
    heading: string;
    intro: string;
    items: ReadonlyArray<{ title: string; body: string }>;
  };
  help: {
    heading: string;
    intro: string;
    items: ReadonlyArray<string>;
    honesty: string;
  };
  people: { heading: string; intro: string };
  process: {
    heading: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
    note: string;
  };
  form: {
    heading: string;
    supporting: string;
    privacy: string;
    minors: string;
    privacyLink: string;
    pendingTitle: string;
    pendingBody: string;
    fallbackLine: string;
    fallbackCta: string;
  };
  faq: {
    heading: string;
    items: ReadonlyArray<{ q: string; a: string }>;
    sourcesLabel: string;
  };
  closing: { heading: string; body: string; cta: string };
  footer: { home: string; privacy: string };
  thankYou: {
    eyebrow: string;
    headline: string;
    body: string;
    back: string;
    library: string;
  };
}

/** Official sources for the visa and English answers, checked on 18 October 2026. */
export const OFFICIAL_SOURCES = Object.freeze([
  {
    label: "GOV.UK: Child Student visa",
    href: "https://www.gov.uk/child-study-visa",
  },
  {
    label: "GOV.UK: Student visa, knowledge of English",
    href: "https://www.gov.uk/student-visa/knowledge-of-english",
  },
]);

const PT: PedroCopy = {
  langName: "Português",
  switchLabel: "Idioma",
  draft: {
    label: "Rascunho para revisão",
    line: "Não publicado. A fotografia, o título, o formulário e o texto aguardam aprovação.",
    photo: "Fotografia provisória",
  },
  hero: {
    eyebrow: "Luanda · Educação no Reino Unido",
    headline:
      "O futuro do seu filho pode começar com a educação certa no Reino Unido.",
    intro:
      "A World Student Advisors ajuda famílias em Angola a explorar escolas, colégios e universidades no Reino Unido, com orientação adaptada aos objetivos de cada estudante.",
    primaryCta: "Solicitar orientação",
    secondaryCta: "Ver percursos de estudo",
    levels: "Do internato à pós-graduação",
  },
  pedro: {
    name: "Pedro Bezerra",
    role: "Diretor da WSA para Angola",
    place: "Luanda",
    body: "Pedro representa a World Student Advisors em Angola e é o ponto de ligação da WSA para as famílias de Luanda.",
    office:
      "Escritório da WSA em Angola: Edifício Escom, Rua Marechal Brós Tito, 35/37, 10.º Piso, Fração D, Ingombota, Luanda.",
  },
  eldah: {
    name: "Eldah Therone",
    role: "Conselheira Sénior de Estudantes e Líder de Equipa",
    body: "Eldah é responsável pelo acompanhamento dos pedidos feitos nesta página e trabalha diretamente com os estudantes e as suas famílias.",
  },
  pathways: {
    heading: "Percursos de estudo no Reino Unido",
    intro:
      "O percurso certo depende da idade, das qualificações e dos objetivos do estudante. Ajudamos a perceber qual faz sentido.",
    items: [
      {
        title: "Escolas independentes e internatos",
        body: "Colégios privados no Reino Unido, muitos com regime de internato e acompanhamento pastoral. A idade de entrada e as condições variam de escola para escola.",
      },
      {
        title: "Sixth form, dos 16 aos 18 anos",
        body: "Os dois últimos anos do ensino secundário, normalmente com A Levels ou o International Baccalaureate, em preparação para a universidade.",
      },
      {
        title: "Foundation e pré-universitário",
        body: "Programas, normalmente de um ano, para quem precisa de reforçar as qualificações ou o inglês antes de iniciar uma licenciatura no Reino Unido.",
      },
      {
        title: "Licenciaturas",
        body: "Cursos de licenciatura, em geral de três anos em Inglaterra e de quatro na Escócia. As candidaturas são feitas através do UCAS.",
      },
      {
        title: "Pós-graduação",
        body: "Mestrados e doutoramentos. Muitos mestrados no Reino Unido duram um ano a tempo inteiro.",
      },
    ],
  },
  help: {
    heading: "Como a WSA acompanha a sua família",
    intro:
      "Uma orientação próxima e pessoal, do primeiro contacto até à chegada ao Reino Unido, centrada no que serve o estudante.",
    items: [
      "Escolha do curso, da escola ou da universidade",
      "Candidaturas e ofertas",
      "Orientação sobre pagamentos",
      "Preparação do pedido de visto",
      "Preparação para entrevistas",
      "Preparação para a partida",
      "Apoio durante os estudos",
    ],
    honesty:
      "As decisões de admissão cabem às escolas e universidades, e as de visto ao governo do Reino Unido. A WSA não garante vagas, vistos nem bolsas.",
  },
  people: {
    heading: "Quem acompanha o seu pedido",
    intro:
      "Um contacto da WSA em Angola e uma conselheira experiente da equipa da WSA.",
  },
  process: {
    heading: "Como funciona",
    steps: [
      {
        title: "Envie o seu pedido",
        body: "Preencha o formulário curto desta página, como pai, mãe, encarregado de educação ou estudante.",
      },
      {
        title: "Conversamos sobre o estudante",
        body: "Os objetivos, o nível de estudos atual, o calendário e o orçamento da família.",
      },
      {
        title: "Opções e candidatura",
        body: "Apresentamos opções adequadas e apoiamos a candidatura às escolas ou universidades escolhidas.",
      },
    ],
    note: "Nenhuma etapa garante uma vaga: cada escola e universidade decide de forma independente.",
  },
  form: {
    heading: "Solicitar orientação",
    supporting: "Deixe os seus dados e a equipa da WSA entrará em contacto.",
    privacy:
      "Os seus dados ficam registados no sistema de gestão de estudantes da WSA, para que a equipa possa responder ao seu pedido.",
    minors:
      "Se o pedido disser respeito a um estudante com menos de 18 anos, deve ser feito pelo pai, pela mãe ou pelo encarregado de educação.",
    privacyLink: "Política de privacidade (em inglês)",
    pendingTitle: "Formulário em preparação",
    pendingBody:
      "Rascunho: o formulário da WSA no Pipedrive para esta página ainda não foi criado. Será ligado aqui antes da publicação.",
    fallbackLine: "Se o formulário não aparecer, abra-o num novo separador.",
    fallbackCta: "Abrir o formulário",
  },
  faq: {
    heading: "Perguntas frequentes",
    sourcesLabel: "Informação oficial do governo do Reino Unido (em inglês):",
    items: [
      {
        q: "Que idade deve ter o estudante?",
        a: "Há percursos desde a escola até à pós-graduação. A idade, o ano escolar e as qualificações atuais determinam as opções, por isso começamos sempre por perceber a situação do estudante.",
      },
      {
        q: "Quanto custa estudar no Reino Unido?",
        a: "Os custos variam muito consoante a escola, a universidade, o curso e a cidade. Para além das propinas, convém prever o alojamento ou o internato, as despesas de vida, o pedido de visto e a sobretaxa de saúde do Reino Unido (Immigration Health Surcharge). O pedido de visto exige também prova de meios financeiros. Falamos sobre os custos antes de qualquer compromisso.",
      },
      {
        q: "Como funciona o internato?",
        a: "Nos internatos, os alunos vivem na escola durante o período letivo, com supervisão e apoio pastoral. As regras para fins de semana e férias variam, e muitas escolas pedem um tutor (guardian) no Reino Unido para alunos internacionais.",
      },
      {
        q: "Quando devemos começar?",
        a: "Quanto mais cedo, melhor. O ano letivo no Reino Unido começa normalmente em setembro, e algumas escolas e universidades têm também entradas em janeiro. Recomendamos começar a planear com cerca de um ano de antecedência.",
      },
      {
        q: "Que nível de inglês é necessário?",
        a: "Cada escola e universidade define os seus requisitos. Para o visto Student, o governo do Reino Unido exige o nível B1 do Quadro Europeu Comum de Referência para cursos abaixo da licenciatura e o nível B2 para licenciatura ou superior. Um programa foundation pode ajudar a reforçar o inglês.",
      },
      {
        q: "Como é protegida a segurança dos alunos menores?",
        a: "As escolas no Reino Unido têm obrigações de proteção de menores (safeguarding). Para alunos com menos de 18 anos, o visto exige o consentimento dos pais, e muitas escolas exigem um tutor no Reino Unido. Explicamos estas exigências a cada família.",
      },
      {
        q: "Que visto é necessário?",
        a: "Alunos dos 4 aos 17 anos que vão estudar numa escola independente podem pedir o visto Child Student. A partir dos 16 anos, para cursos de ensino complementar ou superior, aplica-se o visto Student. As decisões cabem ao governo do Reino Unido; ajudamos a preparar o pedido.",
      },
    ],
  },
  closing: {
    heading: "Pronto para dar o primeiro passo?",
    body: "Fale connosco sobre o futuro do seu filho no Reino Unido.",
    cta: "Solicitar orientação",
  },
  footer: {
    home: "World Student Advisors",
    privacy: "Política de privacidade (em inglês)",
  },
  thankYou: {
    eyebrow: "Pedido recebido",
    headline: "Obrigado. Recebemos o seu pedido.",
    body: "A equipa da World Student Advisors vai analisar as informações que enviou e entrará em contacto consigo.",
    back: "Voltar à página",
    library: "Explorar a Student Support Library (em inglês)",
  },
};

const EN: PedroCopy = {
  langName: "English",
  switchLabel: "Language",
  draft: {
    label: "Draft for review",
    line: "Not published. The photograph, title, form and wording await approval.",
    photo: "Draft photograph",
  },
  hero: {
    eyebrow: "Luanda · Education in the United Kingdom",
    headline: "The right UK education can help shape your child's future.",
    intro:
      "World Student Advisors helps families in Angola explore UK schools, colleges and universities, with advice tailored to each student's goals.",
    primaryCta: "Request guidance",
    secondaryCta: "See study pathways",
    levels: "From boarding school to postgraduate study",
  },
  pedro: {
    name: "Pedro Bezerra",
    role: "WSA Director for Angola",
    place: "Luanda",
    body: "Pedro represents World Student Advisors in Angola and is WSA's point of connection for families in Luanda.",
    office:
      "WSA office in Angola: Edifício Escom, Rua Marechal Brós Tito, 35/37, 10.º Piso, Fração D, Ingombota, Luanda.",
  },
  eldah: {
    name: "Eldah Therone",
    role: "Senior Student Counsellor and Team Leader",
    body: "Eldah is responsible for following up enquiries made on this page and works directly with students and their families.",
  },
  pathways: {
    heading: "Study pathways in the UK",
    intro:
      "The right pathway depends on the student's age, qualifications and goals. We help you work out which one makes sense.",
    items: [
      {
        title: "Independent and boarding schools",
        body: "Private schools in the UK, many with boarding and pastoral care. Entry ages and conditions vary from school to school.",
      },
      {
        title: "Sixth form, ages 16 to 18",
        body: "The final two years of secondary school, usually A Levels or the International Baccalaureate, preparing for university.",
      },
      {
        title: "Foundation and pre-university",
        body: "Programmes, usually one year long, for students who need to strengthen their qualifications or English before starting a UK degree.",
      },
      {
        title: "Undergraduate degrees",
        body: "Bachelor's degrees, generally three years in England and four in Scotland. Applications are made through UCAS.",
      },
      {
        title: "Postgraduate study",
        body: "Master's and doctoral degrees. Many UK Master's degrees last one year full time.",
      },
    ],
  },
  help: {
    heading: "How WSA supports your family",
    intro:
      "Close, personal guidance from the first conversation to arrival in the UK, centred on what serves the student.",
    items: [
      "Course, school and university selection",
      "Applications and offers",
      "Payment guidance",
      "Visa preparation",
      "Interview preparation",
      "Pre-departure preparation",
      "Support throughout your studies",
    ],
    honesty:
      "Admission decisions rest with schools and universities, and visa decisions with the UK government. WSA does not guarantee places, visas or scholarships.",
  },
  people: {
    heading: "Who follows up your enquiry",
    intro:
      "A WSA contact in Angola and an experienced counsellor from the WSA team.",
  },
  process: {
    heading: "How it works",
    steps: [
      {
        title: "Send your enquiry",
        body: "Complete the short form on this page, as a parent, guardian or student.",
      },
      {
        title: "We talk about the student",
        body: "Their goals, current level of study, timing and the family's budget.",
      },
      {
        title: "Options and application",
        body: "We present suitable options and support applications to the schools or universities you choose.",
      },
    ],
    note: "No step guarantees a place: every school and university decides independently.",
  },
  form: {
    heading: "Request guidance",
    supporting: "Leave your details and the WSA team will be in touch.",
    privacy:
      "Your details are recorded in WSA's student records system so that the team can respond to your enquiry.",
    minors:
      "If the enquiry concerns a student under 18, it should be made by a parent or guardian.",
    privacyLink: "Privacy policy",
    pendingTitle: "Form in preparation",
    pendingBody:
      "Draft: WSA's Pipedrive form for this page has not been created yet. It will be connected here before publication.",
    fallbackLine: "If the form does not appear here, open it in a new tab.",
    fallbackCta: "Open the form",
  },
  faq: {
    heading: "Questions parents ask",
    sourcesLabel: "Official UK government information:",
    items: [
      {
        q: "How old should the student be?",
        a: "There are pathways from school to postgraduate study. The student's age, school year and current qualifications decide the options, so we always start by understanding their situation.",
      },
      {
        q: "How much does it cost to study in the UK?",
        a: "Costs vary widely by school, university, course and city. As well as tuition fees, plan for accommodation or boarding, living costs, the visa application and the UK's Immigration Health Surcharge. The visa application also requires evidence of funds. We talk about costs before any commitment.",
      },
      {
        q: "How does boarding work?",
        a: "Boarders live at school during term, with supervision and pastoral support. Rules for weekends and holidays vary, and many schools ask international pupils to have a guardian in the UK.",
      },
      {
        q: "When should we start?",
        a: "The earlier the better. The UK academic year usually starts in September, and some schools and universities also have January intakes. We recommend starting to plan about a year ahead.",
      },
      {
        q: "What level of English is needed?",
        a: "Each school and university sets its own requirements. For the Student visa, the UK government requires CEFR level B1 for courses below degree level and B2 for degree level and above. A foundation programme can help strengthen English.",
      },
      {
        q: "How are students under 18 kept safe?",
        a: "UK schools have safeguarding duties. For students under 18 the visa requires parental consent, and many schools require a guardian in the UK. We explain these requirements to each family.",
      },
      {
        q: "Which visa is needed?",
        a: "Students aged 4 to 17 going to an independent school can apply for a Child Student visa. From 16, for further or higher education courses, the Student visa applies. Decisions rest with the UK government; we help prepare the application.",
      },
    ],
  },
  closing: {
    heading: "Ready to take the first step?",
    body: "Talk to us about your child's future in the UK.",
    cta: "Request guidance",
  },
  footer: { home: "World Student Advisors", privacy: "Privacy policy" },
  thankYou: {
    eyebrow: "Enquiry received",
    headline: "Thank you. We have your enquiry.",
    body: "The World Student Advisors team will review the information you sent and will be in touch.",
    back: "Back to the page",
    library: "Explore the Student Support Library",
  },
};

export const PEDRO_COPY: Readonly<Record<PedroLang, PedroCopy>> = Object.freeze(
  { pt: PT, en: EN }
);
