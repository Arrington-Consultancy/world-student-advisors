import { LIBRARY_CODE_ALIASES, LIBRARY_PATH, getResourceBySlug } from "./studentSupportLibrary";
import { SUCCESS_STORIES_PATH, SUCCESS_STORY_COUNTRIES } from "./successStories";
export interface SeoEntry {
  title: string;
  description: string;
}

export const SITE_ORIGIN = "https://www.worldstudentadvisors.com";

export const DEFAULT_SEO: SeoEntry = {
  title: "World Student Advisors: Study Abroad with a Personal Counsellor",
  description:
    "World Student Advisors: British Council UK knowledge-trained counsellors helping international students from Africa and beyond study in the UK, Canada, and Europe. Free personal counsellor guidance from first enquiry to enrolment.",
};

export const SEO_MAP: Record<string, SeoEntry> = {
  "/": DEFAULT_SEO,
  "/about": {
    title: "About Us | World Student Advisors",
    description:
      "Meet the WorldStudentAdvisors team: British Council UK knowledge-trained counsellors giving every student a named personal counsellor, not a chatbot or call centre.",
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
      "Three-year UK bachelor's degrees providing subject expertise, transferable skills, and strong career foundations, with WorldStudentAdvisors guidance at every stage.",
  },
  "/pre-masters-top-up-degrees": {
    title: "Pre-Master's & Top-Up Degrees | World Student Advisors",
    description:
      "Pre-Master's and Top-Up Degree routes for international students progressing to full UK undergraduate or postgraduate study.",
  },
  "/masters-doctoral-degrees": {
    title: "Master's & Doctoral Degrees | World Student Advisors",
    description:
      "Postgraduate study routes in the UK: Master's and Doctoral degrees, with personal counsellor support from WorldStudentAdvisors.",
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
  "/our-team": {
    title: "Our Team | World Student Advisors",
    description:
      "Meet the people behind WorldStudentAdvisors: British Council UK knowledge-trained counsellors and the wider team who support students from first enquiry through application, visa preparation and enrolment.",
  },
  // Tim Hunt, 23 November 2026: "Podcasts" and "Mock Interviews", two items
  // in the menu, in place of "Student Support Library". The addresses are
  // unchanged.
  "/student-support-library": {
    title: "WSA Podcasts | World Student Advisors",
    description:
      "Free WSA podcasts and episode summaries on choosing a course, applying to university, preparing for interviews and visas, and getting ready to travel. No sign-up needed.",
  },
  "/student-support-library/study-interview-preparation": {
    title: "Mock Interviews | World Student Advisors",
    description:
      "Download a Pre-Mock Interview Questionnaire for your course, scholarship or visa interview, in the UK, Australia, Canada, Cyprus, Germany, Hungary or the USA, and work through it with your WSA counsellor.",
  },
  "/staff-portal": {
    title: "Staff Portal | World Student Advisors",
    description: "Internal WorldStudentAdvisors staff resources.",
  },
  "/portal/interview-coach": {
    title: "Interview Readiness Coach | World Student Advisors",
    description:
      "Practise CAS, UKVI, university and course interview questions with honest AI-marked feedback, free interview preparation from WorldStudentAdvisors that supports your Student Counsellor sessions.",
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
  "/student-success-stories": {
    title: "Student Success Stories | World Student Advisors",
    description:
      "Accounts from students who studied abroad with WorldStudentAdvisors, published in their own words and only with their recorded permission.",
  },
  "/contact": {
    title: "Contact & Registration | World Student Advisors",
    description:
      "Start your application or get in touch with WorldStudentAdvisors, free personal counsellor guidance for international students.",
  },
  "/contact/thank-you": {
    title: "Thank you for registering | World Student Advisors",
    description: "Thank you for registering with World Student Advisors. Our team will be in touch with you shortly.",
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
      "Free UK Student Visa masterclass and resources from WorldStudentAdvisors: bank statements, CAS, IHS, and common mistakes to avoid.",
  },
  "/DDVavita": {
    title: "WorldStudentAdvisors Due Diligence Review - Vavita",
    description:
      "Read the WorldStudentAdvisors due diligence review carried out before introducing Vavita to students and families.",
  },
  "/uk-masters-study": {
    title: "UK Taught Master's Study | World Student Advisors",
    description:
      "Guidance for international graduates considering MSc, MA, MBA and other taught Master's degrees in the UK, with free WSA Student Counsellor support.",
  },
  "/uk-masters-nigeria": {
    title: "UK Master's Study from Nigeria | World Student Advisors",
    description:
      "Practical UK taught Master's guidance for Nigerian graduates, covering entry requirements, WAEC evidence, funding, CAS, visa preparation and WSA counsellor support.",
  },
  "/nigeria-postgraduate": {
    title: "Taught Master's Abroad for Nigerian Graduates | World Student Advisors",
    description:
      "Taught Master's abroad for Nigerian graduates, UK first then Germany and Canada, with your own Personal Student Counsellor from first question to visa preparation.",
  },
  "/speak-to-juliet/thank-you": {
    title: "Thank you, your details are with Juliet | World Student Advisors",
    description: "Your enquiry has reached Juliet Nnajiofor-Uyi, WSA Higher Education Advisor in Lagos. She will be in touch shortly.",
  },
  "/sarkin-fulani-future-leaders": {
    title: "Sarkin Fulani Future Leaders Programme | World Student Advisors",
    description:
      "Under the patronage of His Royal Highness the Sarkin Fulani of Lagos, with Brooke House College and World Student Advisors: full-time education, football, Vector leadership, summer schools and tuition fee awards for young people from the Arewa community.",
  },
  "/speak-to-madalitso": {
    title: "Speak to Madalitso in Blantyre | World Student Advisors",
    description:
      "Madalitso Dube is WSA's Director for Malawi, in Blantyre. Message him about studying abroad, from UK boarding school to a PhD, with Eldah Therone as your WSA Student Counsellor when you apply.",
  },
  "/speak-to-gladys": {
    title: "Speak to Gladys in Accra | World Student Advisors",
    description:
      "Gladys Naadi is WSA's Director for Ghana, in Accra. Message her about studying abroad, from UK boarding school to a PhD, with Manet Khamayo as your WSA Student Counsellor when you apply.",
  },
  "/speak-to-gladys-thank-you": {
    title: "Thank you, your details are with Gladys | World Student Advisors",
    description: "Your enquiry has reached Gladys Naadi, WSA Director for Ghana in Accra. She will be in touch shortly.",
  },
  "/speak-to-eldah": {
    title: "Speak to Eldah, your WSA Student Counsellor | World Student Advisors",
    description:
      "Eldah Therone is a Team Leader and Senior Student Counsellor in WSA's UK Head Office team. Message her on WhatsApp for free help choosing a course and destination, preparing your applications and planning your next steps.",
  },
  "/speak-to-pedro": {
    title: "Speak to Pedro | Fale com o Pedro | World Student Advisors Angola",
    description:
      "Pedro Bezerra, WSA's Director for Portuguese-speaking Countries, gives free advice on studying abroad in English and Portuguese. Fale com o Pedro sobre estudar no estrangeiro.",
  },
  "/speak-to-claudia": {
    title: "Speak to Claudia about studying abroad | World Student Advisors",
    description:
      "Claudia Ingado is WSA's Student Recruitment Relationship Manager in the UK Head Office team. Message her on WhatsApp for free help exploring your study goals, budget and next steps before you meet a WSA Student Counsellor.",
  },
  "/speak-to-glenice": {
    title: "Speak to Glenice, your WSA Student Counsellor | World Student Advisors",
    description:
      "Glenice Owino is a Senior Student Counsellor in WSA's UK Head Office team. Message her on WhatsApp for free help choosing a course and destination, preparing your applications and getting ready to study abroad.",
  },
  "/speak-to-glenice/thank-you": {
    title: "Thank you, your details are with Glenice | World Student Advisors",
    description: "Thank you for sending your details. Glenice will be in touch with you shortly.",
  },
  "/speak-to-manet": {
    title: "Speak to Manet, your WSA Student Counsellor | World Student Advisors",
    description:
      "Manet Khamayo is a Student Counsellor in WSA's UK Head Office team, specialising in study destinations beyond the UK and online learning. Message her on WhatsApp for free help choosing a course and destination and preparing your applications.",
  },
  "/speak-to-lamango": {
    title: "Parlez à Lamango | Speak to Lamango | World Student Advisors Cameroon",
    description:
      "Lamango dirige le bureau de World Student Advisors à Yaoundé et accompagne les étudiants d’Afrique centrale francophone. Lamango runs the WSA office in Yaoundé, Cameroon, and gives free advice on studying abroad in French and English.",
  },
  "/speak-to-lamango/thank-you": {
    title: "Merci | Thank you, your details are with Lamango | World Student Advisors",
    description: "Merci. Lamango vous contactera très bientôt. Thank you for sending your details. Lamango will be in touch with you shortly.",
  },
  "/speak-to-pedro/thank-you": {
    title: "Thank you, your details are with Pedro | Obrigado | World Student Advisors",
    description: "Thank you for sending your details. Pedro will be in touch with you shortly. Obrigado. O Pedro vai entrar em contacto consigo em breve.",
  },
  "/speak-to-manet/thank-you": {
    title: "Thank you, your details are with Manet | World Student Advisors",
    description: "Thank you for sending your details. Manet will be in touch with you shortly.",
  },
  "/speak-to-eldah/thank-you": {
    title: "Thank you, your details are with Eldah | World Student Advisors",
    description: "Thank you for sending your details. Eldah will be in touch with you shortly.",
  },
  "/speak-to-madalitso/thank-you": {
    title: "Thank you, your details are with Madalitso | World Student Advisors",
    description: "Your enquiry has reached Madalitso Dube, WSA Director for Malawi in Blantyre. He will be in touch shortly.",
  },
  "/speak-to-juliet": {
    title: "Speak to Juliet in Lagos | World Student Advisors",
    description:
      "Juliet Nnajiofor-Uyi is a WSA Higher Education Advisor in Lagos. Message her about studying abroad, from UK boarding school to a PhD, with Glenice Owino as your WSA Student Counsellor when you apply.",
  },
};

export const CANONICAL_PATHS: Record<string, string> = {
  // /student-support-library/wsa-024 and every other code form 301 to the
  // slug form, so a counsellor who knows the code can type it and crawlers
  // see one URL per resource (shared/studentSupportLibrary.ts).
  ...LIBRARY_CODE_ALIASES,
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
  // The counsellors page became OUR TEAM on 14 September 2026 (Change Entry
  // 098). The old path is indexed and linked externally, so it 301s here.
  "/counsellors": "/our-team",
  "/learning-hub": "/student-support-library",
  "/learning-hub/podcasts": "/student-support-library",
  "/podcasts": "/student-support-library",
  "/webukvisa": "/WebUKVisa",
  "/ddvavita": "/DDVavita",
  // Tim Hunt asked for a short link he can put in print and messaging. It is
  // an alias, not a second page: both spellings 301 to the canonical route so
  // crawlers and analytics see one URL. Express matches req.path with its own
  // case, so the lower-case spelling is listed too, as /webukvisa is.
  "/LPJuliet": "/speak-to-juliet",
  "/lpjuliet": "/speak-to-juliet",
};

export const NOINDEX_PATH_PREFIXES = ["/portal", "/staff-portal"];
// /nigeria-postgraduate was noindex as a working draft from its creation on
// 12 September 2026 until Tom Arrington's GO the same day, when noindex, the
// draft banner, the sitemap entry and the prerender entry all changed
// together (Change Entry 097). Paid traffic is a separate decision.
// /speak-to-juliet was noindex and out of the sitemap and prerender list
// from its creation on 19 September 2026, through Tim Hunt's revisions, until
// Tom Arrington's GO to publish on 29 September 2026, when noindex, the
// sitemap entry and the prerender entry changed together, as
// /nigeria-postgraduate did. Paid traffic is a separate decision.
// /speak-to-juliet/thank-you is the post-submission page for Tim Hunt's
// Pipedrive form. It is reached only by that redirect, is linked from
// nowhere, and stays noindex whatever happens to its parent.
// /sarkin-fulani-future-leaders was a draft for review (Tim Hunt's brief of
// 8 October 2026): noindex, out of the sitemap and prerender list, linked
// from nowhere, until the Office of His Royal Highness had approved the royal
// material and Brooke House College had confirmed its offers. It was
// published on 23 November 2026 on Tim's word: noindex, the sitemap entry and
// the prerender entry changed together, as they did for the two pages above.
// On 24 November Tim sent the live address to Brooke House College and to
// His Royal Highness for approval and promised not to promote the page
// before then, so it is noindex and out of the sitemap again until both have
// approved. The page itself stays up, and prerendered, for them to read.
// /speak-to-madalitso/thank-you is the post-submission page for Tim Hunt's
// Malawi Pipedrive form (16 October 2026), private in the same way as
// Juliet's. /speak-to-madalitso itself is published from the start: Tim
// supplied the finished content, form and photographs together.
// /speak-to-gladys-thank-you is the same for Tim's Ghana form (24 October
// 2026); /speak-to-gladys is published from the start, as Madalitso's was.
export const NOINDEX_PATHS = new Set(["/404", "/speak-to-juliet/thank-you", "/sarkin-fulani-future-leaders", "/speak-to-madalitso/thank-you", "/speak-to-gladys-thank-you", "/speak-to-eldah/thank-you", "/contact/thank-you", "/speak-to-glenice/thank-you", "/speak-to-manet/thank-you", "/speak-to-pedro/thank-you", "/speak-to-lamango", "/speak-to-lamango/thank-you"]);

export function getCanonicalPath(path: string): string {
  return CANONICAL_PATHS[path] ?? path;
}

export function getCanonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${getCanonicalPath(path)}`;
}

/**
 * Each Student Support Library resource page carries its own title and
 * description, from the resource record, so a link pasted into WhatsApp or
 * email previews as that podcast and search engines index it as one.
 */
function getLibraryResourceSeo(path: string): SeoEntry | undefined {
  if (!path.startsWith(`${LIBRARY_PATH}/`)) return undefined;
  const resource = getResourceBySlug(path.slice(LIBRARY_PATH.length + 1));
  if (!resource) return undefined;
  return {
    title: `${resource.title} | WSA Podcasts | World Student Advisors`,
    description: `${resource.code}: ${resource.description} Watch or listen, and download the WSA summary.`,
  };
}

/**
 * Each success story country page names its country, so a link shared on
 * WhatsApp previews as that country's stories. Only cleared countries have a
 * page at all (shared/routes.ts), so this never describes a hidden one.
 */
function getSuccessStorySeo(path: string): SeoEntry | undefined {
  if (!path.startsWith(`${SUCCESS_STORIES_PATH}/`)) return undefined;
  const slug = path.slice(SUCCESS_STORIES_PATH.length + 1);
  const country = SUCCESS_STORY_COUNTRIES.find(c => c.slug === slug);
  if (!country) return undefined;
  return {
    title: `Student Success Stories: ${country.name} | World Student Advisors`,
    description: `How students and families from ${country.name} studied abroad with World Student Advisors, in their own words and published with their permission.`,
  };
}

export function getSeoForPath(path: string): SeoEntry {
  const canonical = getCanonicalPath(path);
  return SEO_MAP[canonical] ?? getLibraryResourceSeo(canonical) ?? getSuccessStorySeo(canonical) ?? DEFAULT_SEO;
}

export function shouldNoindex(path: string): boolean {
  return NOINDEX_PATHS.has(path) || NOINDEX_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
