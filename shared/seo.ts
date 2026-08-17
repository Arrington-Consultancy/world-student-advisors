export interface SeoEntry {
  title: string;
  description: string;
}

export const SITE_ORIGIN = "https://www.worldstudentadvisors.com";

export const DEFAULT_SEO: SeoEntry = {
  title: "World Student Advisors — Study Abroad with a Personal Counsellor",
  description:
    "World Student Advisors — British Council certified education agent helping international students from Africa and beyond study in the UK, Canada, and Europe. Free personal counsellor guidance from first enquiry to enrolment.",
};

export const SEO_MAP: Record<string, SeoEntry> = {
  "/": DEFAULT_SEO,
  "/about": {
    title: "About Us | World Student Advisors",
    description:
      "Meet the WorldStudentAdvisors team — a British Council certified education agency giving every student a named personal counsellor, not a chatbot or call centre.",
  },
  "/study-options": {
    title: "Study Options | World Student Advisors",
    description:
      "Explore study routes with WorldStudentAdvisors: A-Levels, Foundation, International Year One, Undergraduate, Pre-Master's, and Master's/Doctoral programmes in the UK.",
  },
  "/a-levels": {
    title: "A-Levels for International Students | World Student Advisors",
    description:
      "The gold-standard UK academic qualification for international students, studied over two years within a UK boarding school environment. Guidance from WorldStudentAdvisors.",
  },
  "/international-foundation-programme": {
    title: "International Foundation Programme | World Student Advisors",
    description:
      "A one-year preparatory qualification for international students needing extra academic or English language preparation before UK university entry.",
  },
  "/international-year-one": {
    title: "International Year One | World Student Advisors",
    description:
      "A Level 4 university pathway programme leading directly into Year Two of a full UK undergraduate degree.",
  },
  "/undergraduate-degrees": {
    title: "Undergraduate Degrees in the UK | World Student Advisors",
    description:
      "Three-year UK bachelor's degrees providing subject expertise, transferable skills, and strong career foundations — with WorldStudentAdvisors guidance at every stage.",
  },
  "/pre-masters-top-up-degrees": {
    title: "Pre-Master's & Top-Up Degrees | World Student Advisors",
    description:
      "Pre-Master's and Top-Up Degree routes for international students progressing to full UK undergraduate or postgraduate study.",
  },
  "/masters-doctoral-degrees": {
    title: "Master's & Doctoral Degrees | World Student Advisors",
    description:
      "Postgraduate study routes in the UK — Master's and Doctoral degrees — with personal counsellor support from WorldStudentAdvisors.",
  },
  "/sport-pathways": {
    title: "Sport Pathways | World Student Advisors",
    description:
      "Sport academy and sport pathway study options for international students, guided by WorldStudentAdvisors.",
  },
  "/online-learning": {
    title: "Online Learning | World Student Advisors",
    description:
      "Online and distance learning study options for international students, with WorldStudentAdvisors counsellor support.",
  },
  "/counsellors": {
    title: "Our Counsellors | World Student Advisors",
    description:
      "Meet WorldStudentAdvisors' team of British Council certified counsellors across the UK, Kenya, Nigeria, Ghana, Angola, and Malawi.",
  },
  "/learning-hub": {
    title: "Learning Hub | World Student Advisors",
    description:
      "Free videos, podcasts, and guides on UK student visas, university applications, and studying abroad from WorldStudentAdvisors.",
  },
  "/learning-hub/cv-university-application": {
    title: "CV & University Application Guidance | World Student Advisors",
    description:
      "Guidance on building a strong CV and university application as an international student, from WorldStudentAdvisors.",
  },
  "/training-workshops": {
    title: "Training & Workshops | World Student Advisors",
    description:
      "Training and workshop sessions from WorldStudentAdvisors for students and partner organisations.",
  },
  "/events": {
    title: "Events | World Student Advisors",
    description:
      "Upcoming webinars and events from WorldStudentAdvisors, including UK Student Visa masterclasses.",
  },
  "/partners": {
    title: "Educational Partners | World Student Advisors",
    description:
      "WorldStudentAdvisors' trusted network of UK and international university and college partners.",
  },
  "/podcasts": {
    title: "Podcasts | World Student Advisors",
    description:
      "Listen to WorldStudentAdvisors' podcast series on UK student visas, university applications, and studying abroad.",
  },
  "/contact": {
    title: "Contact & Registration | World Student Advisors",
    description:
      "Start your application or get in touch with WorldStudentAdvisors — free personal counsellor guidance for international students.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | World Student Advisors",
    description:
      "Read how WorldStudentAdvisors collects, protects and uses student, parent and partner information.",
  },
  "/terms": {
    title: "Terms & Conditions | World Student Advisors",
    description:
      "Read the terms and conditions for using WorldStudentAdvisors' website, services and student support resources.",
  },
  "/compliance": {
    title: "Compliance & Policies | World Student Advisors",
    description:
      "WorldStudentAdvisors' compliance policies, including data protection, code of conduct and anti-bribery standards.",
  },
  "/code-of-conduct": {
    title: "Code of Conduct | World Student Advisors",
    description:
      "WorldStudentAdvisors' code of conduct for ethical student recruitment, counselling and partner relationships.",
  },
  "/anti-bribery-and-anti-corruption-policy": {
    title: "Anti-Bribery & Anti-Corruption Policy | World Student Advisors",
    description:
      "WorldStudentAdvisors' anti-bribery and anti-corruption policy for ethical international education guidance.",
  },
  "/data-protection-consent": {
    title: "Data Protection Consent | World Student Advisors",
    description:
      "Data protection consent information for students and families working with WorldStudentAdvisors.",
  },
  "/sub-saharan-regional-office-policy": {
    title: "Sub-Saharan Regional Office Policy | World Student Advisors",
    description:
      "WorldStudentAdvisors' regional office policy for Sub-Saharan Africa student support and partner activity.",
  },
  "/WebUKVisa": {
    title: "UK Student Visa Guide | World Student Advisors",
    description:
      "Free UK Student Visa masterclass and resources from WorldStudentAdvisors — bank statements, CAS, IHS, and common mistakes to avoid.",
  },
  "/DDVavita": {
    title: "WorldStudentAdvisors Due Diligence Review - Vavita",
    description:
      "Read the WorldStudentAdvisors due diligence review carried out before introducing Vavita to students and families.",
  },
};

export const CANONICAL_PATHS: Record<string, string> = {
  "/study-options/a-levels": "/a-levels",
  "/study-options/international-foundation-programme": "/international-foundation-programme",
  "/study-options/international-year-one": "/international-year-one",
  "/study-options/undergraduate-degrees": "/undergraduate-degrees",
  "/study-options/pre-masters-top-up-degrees": "/pre-masters-top-up-degrees",
  "/study-options/masters-doctoral-degrees": "/masters-doctoral-degrees",
  "/study-options/sport-pathways": "/sport-pathways",
  "/study-options/online-learning": "/online-learning",
  "/privacy": "/privacy-policy",
  "/our-global-education-partners": "/partners",
  "/learning-hub/podcasts": "/podcasts",
  "/webukvisa": "/WebUKVisa",
  "/ddvavita": "/DDVavita",
};

export const NOINDEX_PATH_PREFIXES = ["/portal"];
export const NOINDEX_PATHS = new Set(["/404"]);

export function getCanonicalPath(path: string): string {
  return CANONICAL_PATHS[path] ?? path;
}

export function getCanonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${getCanonicalPath(path)}`;
}

export function getSeoForPath(path: string): SeoEntry {
  return SEO_MAP[getCanonicalPath(path)] ?? DEFAULT_SEO;
}

export function shouldNoindex(path: string): boolean {
  return NOINDEX_PATHS.has(path) || NOINDEX_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
