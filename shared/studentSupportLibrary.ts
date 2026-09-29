/**
 * Student Support Library: the one data source for the public library, its
 * four sections, every resource's permanent page, the sitemap, the prerender
 * list and the search. Shared between client and server so the route
 * registry, SEO and tests read the same record the page renders.
 *
 * AUTHORITY. Tim Hunt's reorganised Podcast Main List, "NEW STRUCTURE
 * WSA_ChatGPT_Workflows_Master_Index.docx" of 26 September 2026 (four
 * sections, each podcast once), his email of the same day answering the
 * four content questions in the technical proposal, and his reply of
 * 27 September ("039 to Section one is ok"). Tom Arrington gave the GO to
 * build on 29 September 2026. Titles and descriptions are his, verbatim,
 * unchanged from the 25 August list they were already taken from.
 *
 * TIM'S DECISIONS, 26 SEPTEMBER 2026, APPLIED HERE:
 *  - WSA 004 (Undergraduate Course Advice) plays the recording in his list,
 *    WqNU_CRy_p8, not the library-guide recording the website had.
 *  - WSA 017 (Cyprus West University) plays his updated recording,
 *    mLDmQplce-o, with the "version two, 6 September 2026" summary he
 *    attached; its keywords are drawn from that new summary.
 *  - WSA 033 (UK University Scholarships): "REMOVE". Not here.
 *  - WSA 040 (Student Support Library guide): "out of date now ... REMOVE".
 *    Never added.
 *  - WSA 039 (Ten Steps to UK University Success) stays in section 1, as
 *    "it explains ten steps and how we help the student".
 * See REMOVED_RESOURCES for the two codes that are deliberately absent.
 *
 * THE CODE BELONGS TO THE RESOURCE, NOT THE SECTION (Tim, 23 August 2026).
 * Each resource has exactly one home section; the guard tests fail if any
 * code is unplaced, placed twice, or if a removed code returns.
 *
 * PERMANENT LINKS. Each resource has a fixed slug, stored here rather than
 * derived from the title at run time, so a title edit never breaks a link
 * a counsellor has already sent to a student. The format is Tim's:
 * /student-support-library/<slug>. Slugs are the ones in the technical
 * proposal of 26 September, which Tim read ("Makes sense"). The code form,
 * /student-support-library/wsa-024, redirects permanently to the slug.
 *
 * `keywords` are terms drawn from each resource's real summary PDF text,
 * not invented, so search surfaces a resource by its content ("bank
 * statement" and "IHS" find WSA 025) and not only its title.
 */

export const LIBRARY_PATH = "/student-support-library";

export type LibrarySectionId =
  | "how-wsa-can-help-you"
  | "choosing-where-and-what-to-study"
  | "applications-interviews-and-visas"
  | "preparing-to-travel-and-life-abroad";

export interface LibrarySection {
  id: LibrarySectionId;
  /** 1 to 4, Tim Hunt's numbering. */
  number: 1 | 2 | 3 | 4;
  title: string;
}

export interface LibraryResource {
  /** Permanent WSA code. Belongs to the resource, never the section. */
  code: string;
  /** Permanent URL slug; never derived from the title at run time. */
  slug: string;
  title: string;
  description: string;
  youtubeUrl: string;
  /** Filename within /public/downloads/. */
  pdfFile: string;
  /** The one section this resource lives in. */
  section: LibrarySectionId;
  /** Search terms drawn from the resource's actual summary PDF text. */
  keywords: string[];
}

/** Tim Hunt's four sections, in his order. */
export const LIBRARY_SECTIONS: readonly LibrarySection[] = Object.freeze([
  { id: "how-wsa-can-help-you", number: 1, title: "How WSA Can Help You" },
  { id: "choosing-where-and-what-to-study", number: 2, title: "Choosing Where and What to Study" },
  { id: "applications-interviews-and-visas", number: 3, title: "Applications, Interviews and Visas" },
  { id: "preparing-to-travel-and-life-abroad", number: 4, title: "Preparing to Travel and Life Abroad" },
]);

/**
 * Every live resource, in Tim Hunt's Master Index order: section 1 first,
 * then 2, 3 and 4, each in the order he listed them.
 */
export const LIBRARY_RESOURCES: readonly LibraryResource[] = Object.freeze([
  // How WSA Can Help You
  {
    code: "WSA 001",
    slug: "code-of-conduct",
    title: "Code of Conduct",
    description: "A straightforward guide to what WSA expects from students and what you can expect from us throughout your student journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=4Qh-fbvTPYY",
    pdfFile: "wsa-001-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["code of conduct", "extreme trust", "ethics", "conflicts of interest", "confidentiality", "professional standards"],
  },
  {
    code: "WSA 005",
    slug: "why-choose-wsa",
    title: "Why Choose WSA?",
    description: "Discover the personal support available from WSA and how your Student Counsellor works with you from enquiry to arrival.",
    youtubeUrl: "https://www.youtube.com/watch?v=aiSXhUTgMKw",
    pdfFile: "wsa-005-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["why choose WSA", "free service", "personalised advice", "tuition discounts", "podcast library"],
  },
  {
    code: "WSA 007",
    slug: "wsa-usp-and-the-student-journey",
    title: "WSA USP and the Student Journey",
    description: "Discover what makes WSA different and the support available throughout your journey from first enquiry to studying abroad.",
    youtubeUrl: "https://www.youtube.com/watch?v=ADQ1h0Ofhik",
    pdfFile: "wsa-007-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["student journey", "career counselling", "CAS", "accommodation", "visa", "pre-departure", "graduation"],
  },
  {
    code: "WSA 034",
    slug: "eldah-therone-team-leader-wsa",
    title: "Eldah Therone, Team Leader WSA",
    description: "Meet Eldah, WSA's Team Leader, and hear how she and the team support students throughout their international education journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=_VvWRjVXsEg",
    pdfFile: "wsa-034-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["Eldah Therone", "Team Leader", "named counsellor", "university application support"],
  },
  {
    code: "WSA 035",
    slug: "glenice-owino-senior-student-counsellor",
    title: "Glenice Owino, Senior Student Counsellor",
    description: "Meet Glenice and discover how a WSA Student Counsellor supports students through the important stages of studying abroad.",
    youtubeUrl: "https://www.youtube.com/shorts/e6-bf2vKoao",
    pdfFile: "wsa-035-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["Glenice Owino", "Senior Student Counsellor", "named counsellor", "university application support"],
  },
  {
    code: "WSA 036",
    slug: "juliet-nnajiofor-uyi-lagos-nigeria",
    title: "Juliet Nnajiofor-Uyi, Lagos, Nigeria",
    description: "Meet Juliet in Lagos and learn about the personal support WSA provides to students and families in Nigeria.",
    youtubeUrl: "https://www.youtube.com/watch?v=SZjjr2T3qTU",
    pdfFile: "wsa-036-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["Juliet Nnajiofor-Uyi", "Nigeria", "Lagos", "UK Agent and Counsellor Certification Award", "boarding schools", "football summer camps"],
  },
  {
    code: "WSA 037",
    slug: "madalitso-dube-director-for-malawi",
    title: "Madalitso Dube, Director for Malawi",
    description: "Meet Madalitso and discover how WSA supports students in Malawi who are considering international education.",
    youtubeUrl: "https://www.youtube.com/watch?v=bAKpWI_DH8Q",
    pdfFile: "wsa-037-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["Madalitso Dube", "Malawi", "Blantyre", "Director"],
  },
  {
    code: "WSA 038",
    slug: "manet-khamayo-student-counsellor-nonuk",
    title: "Manet Khamayo, Student Counsellor NONUK",
    description: "Meet Manet and learn how WSA supports students exploring international study opportunities beyond the UK.",
    youtubeUrl: "https://www.youtube.com/watch?v=oGFf6-IHt5A",
    pdfFile: "wsa-038-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["Manet Khamayo", "Student Counsellor", "affordable international study", "non-UK destinations", "hybrid pathways"],
  },
  {
    code: "WSA 039",
    slug: "ten-steps-to-uk-university-success",
    title: "Ten Steps to UK University Success",
    description: "Follow ten practical steps designed to help you prepare for and make the most of your UK university experience.",
    youtubeUrl: "https://youtu.be/6a7do5dlbOI",
    pdfFile: "wsa-039-summary.pdf",
    section: "how-wsa-can-help-you",
    keywords: ["ten steps", "UK university success", "CAS", "student visa", "accommodation", "arrival airport", "enrolment"],
  },
  // Choosing Where and What to Study
  {
    code: "WSA 002",
    slug: "cost-of-studying-abroad",
    title: "Cost of Studying Abroad",
    description: "An introduction to tuition fees, living costs and the financial planning you should consider before choosing where to study.",
    youtubeUrl: "https://www.youtube.com/watch?v=7hEjR19N4O8",
    pdfFile: "wsa-002-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["cost of studying abroad", "tuition fees", "living costs", "budget", "UK", "Cyprus", "Hungary", "hybrid study", "online MBA", "graduate route"],
  },
  {
    code: "WSA 003",
    slug: "phd-support",
    title: "PhD Support",
    description: "Understand the PhD application process and how WSA can support you with your research degree journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=Jo4cT1dC2tc",
    pdfFile: "wsa-003-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["PhD", "MPhil", "research proposal", "research degree", "supervisor", "research application rejected"],
  },
  {
    code: "WSA 004",
    slug: "undergraduate-course-advice",
    title: "Undergraduate Course Advice",
    description: "Understand your undergraduate study options and how to choose a course and university that suit your goals.",
    youtubeUrl: "https://www.youtube.com/watch?v=WqNU_CRy_p8",
    pdfFile: "wsa-004-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["undergraduate course advice", "foundation course", "choosing a degree", "CV", "school results"],
  },
  {
    code: "WSA 008",
    slug: "canadian-phd",
    title: "Canadian PhD",
    description: "Understand the key stages involved in applying for doctoral study in Canada and how to prepare a strong application.",
    youtubeUrl: "https://youtu.be/cTSBETNEi3g",
    pdfFile: "wsa-008-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canadian PhD", "research degree", "master's degree", "study permit", "supervision", "doctoral"],
  },
  {
    code: "WSA 009",
    slug: "canadian-undergraduate-degree",
    title: "Canadian Undergraduate Degree",
    description: "An introduction to undergraduate study in Canada and the key points to consider when choosing your university and course.",
    youtubeUrl: "https://youtu.be/78btZP_mH0Q",
    pdfFile: "wsa-009-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canadian undergraduate degree", "choosing a degree", "academic strengths", "career prospects", "four years"],
  },
  {
    code: "WSA 012",
    slug: "selecting-a-canadian-masters",
    title: "Selecting a Canadian Masters",
    description: "Understand what to consider when choosing a Canadian Masters programme that matches your academic background and career plans.",
    youtubeUrl: "https://youtu.be/EF2e349JboM",
    pdfFile: "wsa-012-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canadian master's", "co-op", "work placement", "progression", "specialisation", "work permit"],
  },
  {
    code: "WSA 013",
    slug: "aberystwyth-university",
    title: "Aberystwyth University",
    description: "Discover Aberystwyth University, its study opportunities and the reasons it could be the right choice for your degree.",
    youtubeUrl: "https://www.youtube.com/watch?v=r5Dv1BN9G1E",
    pdfFile: "wsa-013-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Aberystwyth University", "Wales", "International Accommodation Award", "tuition fee reduction", "scholarship"],
  },
  {
    code: "WSA 014",
    slug: "aberystwyth-university-ufp",
    title: "Aberystwyth University UFP",
    description: "Learn about the University Foundation Programme at Aberystwyth and how it can provide a route into undergraduate study.",
    youtubeUrl: "https://www.youtube.com/watch?v=Kr2zXcyrumQ",
    pdfFile: "wsa-014-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["International Foundation Programme", "IFP", "Aberystwyth", "IELTS", "pathway", "integrated foundation year", "scholarship"],
  },
  {
    code: "WSA 015",
    slug: "canada-an-international-study-destination",
    title: "Canada: An International Study Destination",
    description: "Discover what Canada offers international students and the important factors to consider when deciding whether to study there.",
    youtubeUrl: "https://youtu.be/cTbVrV5Kwls",
    pdfFile: "wsa-015-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canada", "bilingual", "multicultural", "University of Toronto", "McGill", "University of British Columbia"],
  },
  {
    code: "WSA 016",
    slug: "canadian-courses-community-and-technical-institutes",
    title: "Canadian Courses: Community and Technical Institutes",
    description: "Explore Canada's community and technical institutes and understand how their programmes differ from traditional university study.",
    youtubeUrl: "https://youtu.be/CXGwd0apOeg",
    pdfFile: "wsa-016-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canada colleges", "technical institutes", "career colleges", "Designated Learning Institution", "DLI", "PGWP", "Post-Graduation Work Permit"],
  },
  {
    code: "WSA 017",
    slug: "cyprus-west-university",
    title: "Cyprus West University",
    description: "Discover Cyprus West University, the courses available and the practical considerations when deciding whether it is right for you.",
    youtubeUrl: "https://youtu.be/mLDmQplce-o",
    pdfFile: "wsa-017-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Cyprus West University", "CWU", "Northern Cyprus", "Mediterranean", "scholarship", "tuition fees", "living costs", "MBA", "Computer Engineering", "Business Administration", "Civil Aviation Management", "student residence permit", "Manet Khamayo"],
  },
  {
    code: "WSA 018",
    slug: "introduction-to-canadian-universities",
    title: "Introduction to Canadian Universities",
    description: "An introduction to Canada's universities and the choices available to international students considering Canadian higher education.",
    youtubeUrl: "https://youtu.be/ed1eRvpTmX8",
    pdfFile: "wsa-018-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canadian universities", "undergraduate", "master's", "PhD", "WAEC", "NECO", "KCSE", "GCSE", "A Levels", "International Baccalaureate"],
  },
  {
    code: "WSA 019",
    slug: "the-canadian-education-system",
    title: "The Canadian Education System",
    description: "Understand how the Canadian education system works and the main study routes available to international students.",
    youtubeUrl: "https://youtu.be/RqOQ6WCRb5o",
    pdfFile: "wsa-019-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["Canadian education system", "provinces", "territories", "Designated Learning Institution", "DLI", "PGWP", "private career colleges"],
  },
  {
    code: "WSA 020",
    slug: "uclan-cyprus-the-british-university",
    title: "UCLan Cyprus, The British University",
    description: "Discover UCLan Cyprus and the opportunity to gain a British university education while studying in Cyprus.",
    youtubeUrl: "https://youtu.be/MchRH2L-Ulg",
    pdfFile: "wsa-020-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["UCLan Cyprus", "Larnaka", "double-awarded degree", "bursary", "scholarship", "PhD", "distance learning", "student visa"],
  },
  {
    code: "WSA 021",
    slug: "university-of-debrecen",
    title: "University of Debrecen",
    description: "Discover the University of Debrecen in Hungary, its study opportunities and what international students should consider before applying.",
    youtubeUrl: "https://www.youtube.com/watch?v=cSEZdgQQR4o",
    pdfFile: "wsa-021-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["University of Debrecen", "Hungary", "Medicine", "Dentistry", "application fee", "entrance procedure fee"],
  },
  {
    code: "WSA 022",
    slug: "university-of-lincoln",
    title: "University of Lincoln",
    description: "Discover the University of Lincoln, its study opportunities and the support available when considering an application.",
    youtubeUrl: "https://youtu.be/zm35CMrUAy4",
    pdfFile: "wsa-022-summary.pdf",
    section: "choosing-where-and-what-to-study",
    keywords: ["University of Lincoln", "Teaching Excellence Framework", "scholarship", "Africa Scholarship", "pre-sessional English", "tuition fee deposit"],
  },
  // Applications, Interviews and Visas
  {
    code: "WSA 010",
    slug: "personal-statement-guide",
    title: "Personal Statement Guide",
    description: "Learn how to prepare a clear, personal and convincing statement that supports your university application.",
    youtubeUrl: "https://www.youtube.com/watch?v=Uwz3OWh8rWA",
    pdfFile: "wsa-010-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["personal statement", "UCAS", "three questions", "references", "postgraduate statement", "artificial intelligence"],
  },
  {
    code: "WSA 011",
    slug: "reference-guidelines",
    title: "Reference Guidelines",
    description: "Learn what universities expect from an academic or professional reference and how to make sure yours supports your application.",
    youtubeUrl: "https://www.youtube.com/watch?v=N7UOMcN7iiA",
    pdfFile: "wsa-011-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["references", "referee", "academic reference", "professional reference", "UCAS reference"],
  },
  {
    code: "WSA 023",
    slug: "cas-and-ukvi-credibility-interview",
    title: "CAS and UKVI Credibility Interview",
    description: "Understand the purpose of CAS and UKVI credibility interviews and how to prepare to answer questions confidently and truthfully.",
    youtubeUrl: "https://www.youtube.com/watch?v=jqaNY_UTekc",
    pdfFile: "wsa-023-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["pre-CAS interview", "UKVI credibility interview", "credibility interview", "genuine student", "English language", "visa"],
  },
  {
    code: "WSA 024",
    slug: "cas-shield",
    title: "CAS Shield",
    description: "Understand the CAS Shield process, what universities may assess and how to prepare effectively.",
    youtubeUrl: "https://www.youtube.com/watch?v=ebDntBQEgsQ",
    pdfFile: "wsa-024-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["CAS Shield", "Enroly", "Confirmation of Acceptance for Studies", "CAS", "financial evidence", "TB certificate", "ATAS", "visa refusal"],
  },
  {
    code: "WSA 025",
    slug: "uk-student-visa-essentials",
    title: "UK Student Visa Essentials",
    description: "Understand the essential requirements and preparation needed when applying for a UK Student Visa.",
    youtubeUrl: "https://www.youtube.com/watch?v=-l-HNsIcqUY",
    pdfFile: "wsa-025-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["UK Student Visa", "bank statement", "28 days", "financial evidence", "CAS", "maintenance requirement", "Immigration Health Surcharge", "IHS", "TB test", "visa fee", "priority service", "credibility interview", "previous refusal", "Visa, Healthcare and Additional Costs"],
  },
  {
    code: "WSA 026",
    slug: "uk-university-credibility-interview",
    title: "UK University Credibility Interview",
    description: "Learn what universities are looking for in a credibility interview and how to demonstrate that you are a genuine, well-prepared student.",
    youtubeUrl: "https://youtu.be/kYb7iXC2vb4",
    pdfFile: "wsa-026-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["university interview", "professional interview", "Nursing", "Teaching", "Social Work", "scenario questions", "online interview"],
  },
  {
    code: "WSA 027",
    slug: "canadian-student-visa-permit",
    title: "Canadian Student Visa Permit",
    description: "Understand the Canadian study permit process and the key requirements international students need to consider.",
    youtubeUrl: "https://youtu.be/X1zs-QROHBk",
    pdfFile: "wsa-027-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["Canadian study permit", "Designated Learning Institution", "biometrics", "Provincial Attestation Letter", "PAL", "TAL", "financial requirements", "CAD"],
  },
  {
    code: "WSA 028",
    slug: "child-visa-uk",
    title: "Child Visa UK",
    description: "Understand the UK Child Student Visa route and the main requirements for younger students and their families.",
    youtubeUrl: "https://youtu.be/j1kMkJaUip8",
    pdfFile: "wsa-028-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["UK Child Student Visa", "child visa", "financial requirements", "documentation", "interview preparation", "aged 4 to 17"],
  },
  {
    code: "WSA 029",
    slug: "visitor-visa-uk-under-18-years-and-over",
    title: "Visitor Visa UK: Under 18 Years and Over",
    description: "Understand the main considerations when applying for a UK Visitor Visa, including arrangements for applicants under 18.",
    youtubeUrl: "https://youtu.be/JgJuzfEDJNo",
    pdfFile: "wsa-029-summary.pdf",
    section: "applications-interviews-and-visas",
    keywords: ["UK Visitor Visa", "standard visitor visa", "sports course", "football", "under 18", "parental consent", "ETA", "Electronic Travel Authorisation"],
  },
  // Preparing to Travel and Life Abroad
  {
    code: "WSA 006",
    slug: "working-while-studying",
    title: "Working While Studying",
    description: "Understand the opportunities and restrictions around working while studying abroad and why your studies must remain your priority.",
    youtubeUrl: "https://www.youtube.com/watch?v=qx2yZo3UrM0",
    pdfFile: "wsa-006-summary.pdf",
    section: "preparing-to-travel-and-life-abroad",
    keywords: ["working while studying", "20 hours", "10 hours", "term time", "vacation work", "National Minimum Wage", "self-employed", "financial requirements"],
  },
  {
    code: "WSA 030",
    slug: "pre-departure-by-glenice-owino",
    title: "Pre-Departure by Glenice Owino",
    description: "Glenice explains the important preparations to make before leaving home and beginning your international study journey.",
    youtubeUrl: "https://youtu.be/xnwa_eJPBZ0",
    pdfFile: "wsa-030-summary.pdf",
    section: "preparing-to-travel-and-life-abroad",
    keywords: ["study abroad journey", "career counselling", "university application", "visa preparation", "departure"],
  },
  {
    code: "WSA 031",
    slug: "pre-departure-by-eldah-therone",
    title: "Pre-Departure by Eldah Therone",
    description: "Eldah takes you through the practical steps that will help you prepare confidently for travel and life as an international student.",
    youtubeUrl: "https://youtu.be/DoQbDGZUwqo",
    pdfFile: "wsa-031-summary.pdf",
    section: "preparing-to-travel-and-life-abroad",
    keywords: ["study journey support", "career", "university application", "student visa preparation", "departure", "return on investment"],
  },
  {
    code: "WSA 032",
    slug: "student-accommodation",
    title: "Student Accommodation",
    description: "Understand your accommodation options and the important questions to consider before deciding where you will live.",
    youtubeUrl: "https://www.youtube.com/watch?v=H_4_Rh96akc",
    pdfFile: "wsa-032-summary.pdf",
    section: "preparing-to-travel-and-life-abroad",
    keywords: ["student accommodation", "rental", "housing market", "location", "budget"],
  },
]);

/**
 * Codes Tim Hunt removed on 26 September 2026. Listed so the guard tests can
 * assert they never return, and so a reader knows the gap in the numbering
 * is deliberate. Their code-form URLs are not aliased and return 404.
 */
export const REMOVED_RESOURCES: readonly { code: string; title: string; reason: string }[] = Object.freeze([
  { code: "WSA 033", title: "UK University Scholarships", reason: "Tim Hunt, 26 September 2026: \"REMOVE\"." },
  { code: "WSA 040", title: "Student Support Library", reason: "Tim Hunt, 26 September 2026: \"this is out of date now, as based on the previous structure) REMOVE\". Never added to the website." },
]);

export const LIBRARY_DISCLAIMER =
  "Disclaimer: This information is provided in good faith and was believed to be accurate at the time of publication. Fees, dates, entry requirements, visa regulations and other information may change. Students should check current requirements before making any financial or study commitments.";

export function resourcePath(slug: string): string {
  return `${LIBRARY_PATH}/${slug}`;
}

/** /student-support-library/<slug> for every live resource. */
export const LIBRARY_RESOURCE_PATHS: readonly string[] = Object.freeze(LIBRARY_RESOURCES.map(r => resourcePath(r.slug)));

/** The code form of each link, lower case, which 301s to the slug form. */
export const LIBRARY_CODE_ALIASES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(LIBRARY_RESOURCES.map(r => [`${LIBRARY_PATH}/${r.code.toLowerCase().replace(" ", "-")}`, resourcePath(r.slug)])),
);

const BY_SLUG = new Map(LIBRARY_RESOURCES.map(r => [r.slug, r]));
const BY_CODE = new Map(LIBRARY_RESOURCES.map(r => [r.code, r]));
const SECTION_BY_ID = new Map(LIBRARY_SECTIONS.map(s => [s.id, s]));

export function getResourceBySlug(slug: string): LibraryResource | undefined {
  return BY_SLUG.get(slug);
}

export function getResourceByCode(code: string): LibraryResource | undefined {
  return BY_CODE.get(code);
}

export function getSection(id: LibrarySectionId): LibrarySection {
  const section = SECTION_BY_ID.get(id);
  if (!section) throw new Error(`Unknown library section: ${id}`);
  return section;
}

export function resourcesInSection(id: LibrarySectionId): LibraryResource[] {
  return LIBRARY_RESOURCES.filter(r => r.section === id);
}

export function pdfPath(resource: LibraryResource): string {
  return `/downloads/${resource.pdfFile}`;
}

export interface LibrarySearchResult {
  resource: LibraryResource;
  section: LibrarySection;
}

/**
 * Case-insensitive search across code, title, description, section title
 * and PDF-derived keywords. Every query term must appear somewhere in a
 * resource's combined text (AND, not OR), so "bank statement" only matches
 * a resource whose text contains both words. Results are in code order.
 */
export function searchLibrary(query: string): LibrarySearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const results: LibrarySearchResult[] = [];
  for (const resource of LIBRARY_RESOURCES) {
    const section = getSection(resource.section);
    const haystack = [resource.code, resource.title, resource.description, section.title, ...resource.keywords].join(" | ").toLowerCase();
    if (terms.every(term => haystack.includes(term))) results.push({ resource, section });
  }
  results.sort((a, b) => Number(a.resource.code.slice(4)) - Number(b.resource.code.slice(4)));
  return results;
}
