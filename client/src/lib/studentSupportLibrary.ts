/**
 * Student Support Library — Stage 2 canonical resource data.
 *
 * The WSA code belongs to the resource, not the section: each of the 39
 * permanent resources (WSA 001–039) is a single canonical object here, with
 * its own title, description, podcast link, PDF summary and search keywords.
 * LIBRARY_SECTIONS then maps each of the 9 sections to the codes that appear
 * within it — a resource used in several sections is referenced by code in
 * each, never duplicated as a separate record.
 *
 * Titles, descriptions, section placement and podcast links are taken
 * verbatim from "Tom WSA Student Support Library - 25 August 2026.docx" and
 * cross-checked against the actual summary PDFs in SharePoint
 * (09_PODCASTS and WEBINARS/WSA 000 SUMMARY MAIN LIST/PDF). `keywords` are
 * terms drawn from those same PDFs' real text, not invented, so that search
 * can surface a resource by its content (e.g. "Bank Statement" → WSA 025)
 * and not just its title.
 */

export interface CanonicalResource {
  /** Permanent WSA code — belongs to the resource, never the section. */
  code: string;
  title: string;
  description: string;
  youtubeUrl: string;
  /** Filename within /public/downloads/ */
  pdfFile: string;
  /** Search terms drawn from the resource's actual summary PDF text. */
  keywords: string[];
}

export interface LibrarySection {
  title: string;
  codes: string[];
}

export const CANONICAL_RESOURCES: Record<string, CanonicalResource> = {
  "WSA 001": {
    code: "WSA 001",
    title: "Code of Conduct",
    description: "A straightforward guide to what WSA expects from students and what you can expect from us throughout your student journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=4Qh-fbvTPYY",
    pdfFile: "wsa-001-summary.pdf",
    keywords: ["code of conduct", "extreme trust", "ethics", "conflicts of interest", "confidentiality", "professional standards"],
  },
  "WSA 002": {
    code: "WSA 002",
    title: "Cost of Studying Abroad",
    description: "An introduction to tuition fees, living costs and the financial planning you should consider before choosing where to study.",
    youtubeUrl: "https://www.youtube.com/watch?v=7hEjR19N4O8",
    pdfFile: "wsa-002-summary.pdf",
    keywords: ["cost of studying abroad", "tuition fees", "living costs", "budget", "UK", "Cyprus", "Hungary", "hybrid study", "online MBA", "graduate route"],
  },
  "WSA 003": {
    code: "WSA 003",
    title: "PhD Support",
    description: "Understand the PhD application process and how WSA can support you with your research degree journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=Jo4cT1dC2tc",
    pdfFile: "wsa-003-summary.pdf",
    keywords: ["PhD", "MPhil", "research proposal", "research degree", "supervisor", "research application rejected"],
  },
  "WSA 004": {
    code: "WSA 004",
    title: "Undergraduate Course Advice",
    description: "Understand your undergraduate study options and how to choose a course and university that suit your goals.",
    youtubeUrl: "https://www.youtube.com/watch?v=WqNU_CRy_p8",
    pdfFile: "wsa-004-summary.pdf",
    keywords: ["undergraduate course advice", "foundation course", "choosing a degree", "CV", "school results"],
  },
  "WSA 005": {
    code: "WSA 005",
    title: "Why Choose WSA?",
    description: "Discover the personal support available from WSA and how your Student Counsellor works with you from enquiry to arrival.",
    youtubeUrl: "https://www.youtube.com/watch?v=aiSXhUTgMKw",
    pdfFile: "wsa-005-summary.pdf",
    keywords: ["why choose WSA", "free service", "personalised advice", "tuition discounts", "podcast library"],
  },
  "WSA 006": {
    code: "WSA 006",
    title: "Working While Studying",
    description: "Understand the opportunities and restrictions around working while studying abroad and why your studies must remain your priority.",
    youtubeUrl: "https://www.youtube.com/watch?v=qx2yZo3UrM0",
    pdfFile: "wsa-006-summary.pdf",
    keywords: ["working while studying", "20 hours", "10 hours", "term time", "vacation work", "National Minimum Wage", "self-employed", "financial requirements"],
  },
  "WSA 007": {
    code: "WSA 007",
    title: "WSA USP and the Student Journey",
    description: "Discover what makes WSA different and the support available throughout your journey from first enquiry to studying abroad.",
    youtubeUrl: "https://www.youtube.com/watch?v=ADQ1h0Ofhik",
    pdfFile: "wsa-007-summary.pdf",
    keywords: ["student journey", "career counselling", "CAS", "accommodation", "visa", "pre-departure", "graduation"],
  },
  "WSA 008": {
    code: "WSA 008",
    title: "Canadian PhD",
    description: "Understand the key stages involved in applying for doctoral study in Canada and how to prepare a strong application.",
    youtubeUrl: "https://youtu.be/cTSBETNEi3g",
    pdfFile: "wsa-008-summary.pdf",
    keywords: ["Canadian PhD", "research degree", "master's degree", "study permit", "supervision", "doctoral"],
  },
  "WSA 009": {
    code: "WSA 009",
    title: "Canadian Undergraduate Degree",
    description: "An introduction to undergraduate study in Canada and the key points to consider when choosing your university and course.",
    youtubeUrl: "https://youtu.be/78btZP_mH0Q",
    pdfFile: "wsa-009-summary.pdf",
    keywords: ["Canadian undergraduate degree", "choosing a degree", "academic strengths", "career prospects", "four years"],
  },
  "WSA 010": {
    code: "WSA 010",
    title: "Personal Statement Guide",
    description: "Learn how to prepare a clear, personal and convincing statement that supports your university application.",
    youtubeUrl: "https://www.youtube.com/watch?v=Uwz3OWh8rWA",
    pdfFile: "wsa-010-summary.pdf",
    keywords: ["personal statement", "UCAS", "three questions", "references", "postgraduate statement", "artificial intelligence"],
  },
  "WSA 011": {
    code: "WSA 011",
    title: "Reference Guidelines",
    description: "Learn what universities expect from an academic or professional reference and how to make sure yours supports your application.",
    youtubeUrl: "https://www.youtube.com/watch?v=N7UOMcN7iiA",
    pdfFile: "wsa-011-summary.pdf",
    keywords: ["references", "referee", "academic reference", "professional reference", "UCAS reference"],
  },
  "WSA 012": {
    code: "WSA 012",
    title: "Selecting a Canadian Masters",
    description: "Understand what to consider when choosing a Canadian Masters programme that matches your academic background and career plans.",
    youtubeUrl: "https://youtu.be/EF2e349JboM",
    pdfFile: "wsa-012-summary.pdf",
    keywords: ["Canadian master's", "co-op", "work placement", "progression", "specialisation", "work permit"],
  },
  "WSA 013": {
    code: "WSA 013",
    title: "Aberystwyth University",
    description: "Discover Aberystwyth University, its study opportunities and the reasons it could be the right choice for your degree.",
    youtubeUrl: "https://www.youtube.com/watch?v=r5Dv1BN9G1E",
    pdfFile: "wsa-013-summary.pdf",
    keywords: ["Aberystwyth University", "Wales", "International Accommodation Award", "tuition fee reduction", "scholarship"],
  },
  "WSA 014": {
    code: "WSA 014",
    title: "Aberystwyth University UFP",
    description: "Learn about the University Foundation Programme at Aberystwyth and how it can provide a route into undergraduate study.",
    youtubeUrl: "https://www.youtube.com/watch?v=Kr2zXcyrumQ",
    pdfFile: "wsa-014-summary.pdf",
    keywords: ["International Foundation Programme", "IFP", "Aberystwyth", "IELTS", "pathway", "integrated foundation year", "scholarship"],
  },
  "WSA 015": {
    code: "WSA 015",
    title: "Canada: An International Study Destination",
    description: "Discover what Canada offers international students and the important factors to consider when deciding whether to study there.",
    youtubeUrl: "https://youtu.be/cTbVrV5Kwls",
    pdfFile: "wsa-015-summary.pdf",
    keywords: ["Canada", "bilingual", "multicultural", "University of Toronto", "McGill", "University of British Columbia"],
  },
  "WSA 016": {
    code: "WSA 016",
    title: "Canadian Courses: Community and Technical Institutes",
    description: "Explore Canada's community and technical institutes and understand how their programmes differ from traditional university study.",
    youtubeUrl: "https://youtu.be/CXGwd0apOeg",
    pdfFile: "wsa-016-summary.pdf",
    keywords: ["Canada colleges", "technical institutes", "career colleges", "Designated Learning Institution", "DLI", "PGWP", "Post-Graduation Work Permit"],
  },
  "WSA 017": {
    code: "WSA 017",
    title: "Cyprus West University",
    description: "Discover Cyprus West University, the courses available and the practical considerations when deciding whether it is right for you.",
    youtubeUrl: "https://youtu.be/xlJOfunvQYM",
    pdfFile: "wsa-017-summary.pdf",
    keywords: ["Cyprus West University", "Northern Cyprus", "TRNC", "scholarship", "MBA", "transit visa"],
  },
  "WSA 018": {
    code: "WSA 018",
    title: "Introduction to Canadian Universities",
    description: "An introduction to Canada's universities and the choices available to international students considering Canadian higher education.",
    youtubeUrl: "https://youtu.be/ed1eRvpTmX8",
    pdfFile: "wsa-018-summary.pdf",
    keywords: ["Canadian universities", "undergraduate", "master's", "PhD", "WAEC", "NECO", "KCSE", "GCSE", "A Levels", "International Baccalaureate"],
  },
  "WSA 019": {
    code: "WSA 019",
    title: "The Canadian Education System",
    description: "Understand how the Canadian education system works and the main study routes available to international students.",
    youtubeUrl: "https://youtu.be/RqOQ6WCRb5o",
    pdfFile: "wsa-019-summary.pdf",
    keywords: ["Canadian education system", "provinces", "territories", "Designated Learning Institution", "DLI", "PGWP", "private career colleges"],
  },
  "WSA 020": {
    code: "WSA 020",
    title: "UCLan Cyprus, The British University",
    description: "Discover UCLan Cyprus and the opportunity to gain a British university education while studying in Cyprus.",
    youtubeUrl: "https://youtu.be/MchRH2L-Ulg",
    pdfFile: "wsa-020-summary.pdf",
    keywords: ["UCLan Cyprus", "Larnaka", "double-awarded degree", "bursary", "scholarship", "PhD", "distance learning", "student visa"],
  },
  "WSA 021": {
    code: "WSA 021",
    title: "University of Debrecen",
    description: "Discover the University of Debrecen in Hungary, its study opportunities and what international students should consider before applying.",
    youtubeUrl: "https://www.youtube.com/watch?v=cSEZdgQQR4o",
    pdfFile: "wsa-021-summary.pdf",
    keywords: ["University of Debrecen", "Hungary", "Medicine", "Dentistry", "application fee", "entrance procedure fee"],
  },
  "WSA 022": {
    code: "WSA 022",
    title: "University of Lincoln",
    description: "Discover the University of Lincoln, its study opportunities and the support available when considering an application.",
    youtubeUrl: "https://youtu.be/zm35CMrUAy4",
    pdfFile: "wsa-022-summary.pdf",
    keywords: ["University of Lincoln", "Teaching Excellence Framework", "scholarship", "Africa Scholarship", "pre-sessional English", "tuition fee deposit"],
  },
  "WSA 023": {
    code: "WSA 023",
    title: "CAS and UKVI Credibility Interview",
    description: "Understand the purpose of CAS and UKVI credibility interviews and how to prepare to answer questions confidently and truthfully.",
    youtubeUrl: "https://www.youtube.com/watch?v=jqaNY_UTekc",
    pdfFile: "wsa-023-summary.pdf",
    keywords: ["pre-CAS interview", "UKVI credibility interview", "credibility interview", "genuine student", "English language", "visa"],
  },
  "WSA 024": {
    code: "WSA 024",
    title: "CAS Shield",
    description: "Understand the CAS Shield process, what universities may assess and how to prepare effectively.",
    youtubeUrl: "https://www.youtube.com/watch?v=ebDntBQEgsQ",
    pdfFile: "wsa-024-summary.pdf",
    keywords: ["CAS Shield", "Enroly", "Confirmation of Acceptance for Studies", "CAS", "financial evidence", "TB certificate", "ATAS", "visa refusal"],
  },
  "WSA 025": {
    code: "WSA 025",
    title: "UK Student Visa Essentials",
    description: "Understand the essential requirements and preparation needed when applying for a UK Student Visa.",
    youtubeUrl: "https://www.youtube.com/watch?v=-l-HNsIcqUY",
    pdfFile: "wsa-025-summary.pdf",
    keywords: ["UK Student Visa", "bank statement", "28 days", "financial evidence", "CAS", "maintenance requirement", "Immigration Health Surcharge", "IHS", "TB test", "visa fee", "priority service", "credibility interview", "previous refusal"],
  },
  "WSA 026": {
    code: "WSA 026",
    title: "UK University Credibility Interview",
    description: "Learn what universities are looking for in a credibility interview and how to demonstrate that you are a genuine, well-prepared student.",
    youtubeUrl: "https://youtu.be/kYb7iXC2vb4",
    pdfFile: "wsa-026-summary.pdf",
    keywords: ["university interview", "professional interview", "Nursing", "Teaching", "Social Work", "scenario questions", "online interview"],
  },
  "WSA 027": {
    code: "WSA 027",
    title: "Canadian Student Visa Permit",
    description: "Understand the Canadian study permit process and the key requirements international students need to consider.",
    youtubeUrl: "https://youtu.be/X1zs-QROHBk",
    pdfFile: "wsa-027-summary.pdf",
    keywords: ["Canadian study permit", "Designated Learning Institution", "biometrics", "Provincial Attestation Letter", "PAL", "TAL", "financial requirements", "CAD"],
  },
  "WSA 028": {
    code: "WSA 028",
    title: "Child Visa UK",
    description: "Understand the UK Child Student Visa route and the main requirements for younger students and their families.",
    youtubeUrl: "https://youtu.be/j1kMkJaUip8",
    pdfFile: "wsa-028-summary.pdf",
    keywords: ["UK Child Student Visa", "child visa", "financial requirements", "documentation", "interview preparation", "aged 4 to 17"],
  },
  "WSA 029": {
    code: "WSA 029",
    title: "Visitor Visa UK: Under 18 Years and Over",
    description: "Understand the main considerations when applying for a UK Visitor Visa, including arrangements for applicants under 18.",
    youtubeUrl: "https://youtu.be/JgJuzfEDJNo",
    pdfFile: "wsa-029-summary.pdf",
    keywords: ["UK Visitor Visa", "standard visitor visa", "sports course", "football", "under 18", "parental consent", "ETA", "Electronic Travel Authorisation"],
  },
  "WSA 030": {
    code: "WSA 030",
    title: "Pre-Departure by Glenice Owino",
    description: "Glenice explains the important preparations to make before leaving home and beginning your international study journey.",
    youtubeUrl: "https://youtu.be/xnwa_eJPBZ0",
    pdfFile: "wsa-030-summary.pdf",
    keywords: ["study abroad journey", "career counselling", "university application", "visa preparation", "departure"],
  },
  "WSA 031": {
    code: "WSA 031",
    title: "Pre-Departure by Eldah Therone",
    description: "Eldah takes you through the practical steps that will help you prepare confidently for travel and life as an international student.",
    youtubeUrl: "https://youtu.be/DoQbDGZUwqo",
    pdfFile: "wsa-031-summary.pdf",
    keywords: ["study journey support", "career", "university application", "student visa preparation", "departure", "return on investment"],
  },
  "WSA 032": {
    code: "WSA 032",
    title: "Student Accommodation",
    description: "Understand your accommodation options and the important questions to consider before deciding where you will live.",
    youtubeUrl: "https://www.youtube.com/watch?v=H_4_Rh96akc",
    pdfFile: "wsa-032-summary.pdf",
    keywords: ["student accommodation", "rental", "housing market", "location", "budget"],
  },
  "WSA 033": {
    code: "WSA 033",
    title: "UK University Scholarships",
    description: "Understand the types of university scholarships that may be available and how to approach your search realistically.",
    youtubeUrl: "https://youtu.be/MzIk7sdNO9k",
    pdfFile: "wsa-033-summary.pdf",
    keywords: ["scholarship", "full scholarship", "Chevening", "Commonwealth Scholarships", "Africa Initiative for Governance", "funding"],
  },
  "WSA 034": {
    code: "WSA 034",
    title: "Eldah Therone, Team Leader WSA",
    description: "Meet Eldah, WSA's Team Leader, and hear how she and the team support students throughout their international education journey.",
    youtubeUrl: "https://www.youtube.com/watch?v=_VvWRjVXsEg",
    pdfFile: "wsa-034-summary.pdf",
    keywords: ["Eldah Therone", "Team Leader", "named counsellor", "university application support"],
  },
  "WSA 035": {
    code: "WSA 035",
    title: "Glenice Owino, Senior Student Counsellor",
    description: "Meet Glenice and discover how a WSA Student Counsellor supports students through the important stages of studying abroad.",
    youtubeUrl: "https://www.youtube.com/shorts/e6-bf2vKoao",
    pdfFile: "wsa-035-summary.pdf",
    keywords: ["Glenice Owino", "Senior Student Counsellor", "named counsellor", "university application support"],
  },
  "WSA 036": {
    code: "WSA 036",
    title: "Juliet Nnajiofor-Uyi, Lagos, Nigeria",
    description: "Meet Juliet in Lagos and learn about the personal support WSA provides to students and families in Nigeria.",
    youtubeUrl: "https://www.youtube.com/watch?v=SZjjr2T3qTU",
    pdfFile: "wsa-036-summary.pdf",
    keywords: ["Juliet Nnajiofor-Uyi", "Nigeria", "Lagos", "UK Agent and Counsellor Certification Award", "boarding schools", "football summer camps"],
  },
  "WSA 037": {
    code: "WSA 037",
    title: "Madalitso Dube, Director for Malawi",
    description: "Meet Madalitso and discover how WSA supports students in Malawi who are considering international education.",
    youtubeUrl: "https://www.youtube.com/watch?v=bAKpWI_DH8Q",
    pdfFile: "wsa-037-summary.pdf",
    keywords: ["Madalitso Dube", "Malawi", "Blantyre", "Director"],
  },
  "WSA 038": {
    code: "WSA 038",
    title: "Manet Khamayo, Student Counsellor NONUK",
    description: "Meet Manet and learn how WSA supports students exploring international study opportunities beyond the UK.",
    youtubeUrl: "https://www.youtube.com/watch?v=oGFf6-IHt5A",
    pdfFile: "wsa-038-summary.pdf",
    keywords: ["Manet Khamayo", "Student Counsellor", "affordable international study", "non-UK destinations", "hybrid pathways"],
  },
  "WSA 039": {
    code: "WSA 039",
    title: "Ten Steps to UK University Success",
    description: "Follow ten practical steps designed to help you prepare for and make the most of your UK university experience.",
    youtubeUrl: "https://youtu.be/6a7do5dlbOI",
    pdfFile: "wsa-039-summary.pdf",
    keywords: ["ten steps", "UK university success", "CAS", "student visa", "accommodation", "arrival airport", "enrolment"],
  },
};

export const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    title: "Getting Started",
    codes: ["WSA 001", "WSA 002", "WSA 003", "WSA 004", "WSA 005", "WSA 006", "WSA 007"],
  },
  {
    title: "Preparing Your Application",
    codes: ["WSA 008", "WSA 009", "WSA 002", "WSA 010", "WSA 003", "WSA 011", "WSA 012", "WSA 004"],
  },
  {
    title: "Your University Application",
    codes: ["WSA 013", "WSA 014", "WSA 015", "WSA 016", "WSA 008", "WSA 009", "WSA 002", "WSA 017", "WSA 018", "WSA 010", "WSA 003", "WSA 011", "WSA 012", "WSA 019", "WSA 020", "WSA 004", "WSA 021", "WSA 022"],
  },
  {
    title: "Interview Preparation",
    codes: ["WSA 023", "WSA 024", "WSA 010", "WSA 003", "WSA 025", "WSA 026"],
  },
  {
    title: "CAS, Student Visas and Study Permits",
    codes: ["WSA 027", "WSA 023", "WSA 024", "WSA 028", "WSA 002", "WSA 025", "WSA 026", "WSA 029"],
  },
  {
    title: "Preparing to Travel",
    codes: ["WSA 027", "WSA 028", "WSA 002", "WSA 030", "WSA 031", "WSA 032", "WSA 025", "WSA 033", "WSA 029", "WSA 006"],
  },
  {
    title: "Arriving and Studying Abroad",
    codes: ["WSA 001", "WSA 030", "WSA 031", "WSA 032", "WSA 006", "WSA 007"],
  },
  {
    title: "The WSA Student Journey",
    codes: ["WSA 034", "WSA 035", "WSA 036", "WSA 037", "WSA 038", "WSA 030", "WSA 031", "WSA 039", "WSA 005", "WSA 007"],
  },
  {
    title: "Meet WSA",
    codes: ["WSA 034", "WSA 035", "WSA 036", "WSA 037", "WSA 038"],
  },
];

export interface LibrarySearchResult {
  resource: CanonicalResource;
  /** Section titles this resource appears in, in library order. */
  sections: string[];
}

function normalize(value: string): string {
  return value.toLowerCase();
}

/**
 * Case-insensitive, partial/common-word search across code, title,
 * description, section names and PDF-derived keywords. Every query term
 * must appear somewhere in a resource's combined text (AND, not OR), so
 * "Bank Statement" only matches a resource whose text contains both words.
 * Each canonical resource can only appear once in the results, however many
 * sections it belongs to.
 */
export function searchLibrary(query: string): LibrarySearchResult[] {
  const terms = normalize(query.trim())
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return [];

  const results: LibrarySearchResult[] = [];

  for (const code of Object.keys(CANONICAL_RESOURCES)) {
    const resource = CANONICAL_RESOURCES[code];
    const sections = LIBRARY_SECTIONS.filter(section => section.codes.includes(code)).map(
      section => section.title
    );
    const haystack = normalize(
      [resource.code, resource.title, resource.description, ...sections, ...resource.keywords].join(" | ")
    );

    if (terms.every(term => haystack.includes(term))) {
      results.push({ resource, sections });
    }
  }

  results.sort((a, b) => Number(a.resource.code.slice(4)) - Number(b.resource.code.slice(4)));
  return results;
}
