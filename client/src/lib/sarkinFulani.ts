import type { DesiredLevelValue } from "@shared/studentEnquiryOptions";
import { toInternationalNigerianNumber } from "./nigeriaLanding";

/**
 * The Sarkin Fulani Future Leaders Programme landing page: every word the
 * page shows, in one React-free module, so a wording change from Tim Hunt,
 * Farooq Gajo or Brooke House College touches this file and not the page.
 *
 * SOURCES, in order of authority:
 *  1. Tim Hunt's brief of 8 October 2026 (forwarded by Tom Arrington),
 *     which sets the six sections and the two forms.
 *  2. Farooq Gajo's revisions of 29 September 2026, Office of His Royal
 *     Highness: the programme is for the wider Arewa community, so
 *     "Fulani and Hausa Fulani" is not used; and His Royal Highness's
 *     Annual Quranic Memorisation Competition is its own section with a
 *     separate school registration routed to the Competition Committee.
 *  3. Tim Hunt's landing page proposal of 19 August 2026 (the text) and
 *     the discussion document sent to His Royal Highness in July 2026
 *     (the vision wording).
 *
 * WHAT IS PROVISIONAL, and said so on the page: the royal material awaits
 * the approval of the Office of His Royal Highness; the tuition fee award
 * wording and every Brooke House College offer await the College's
 * confirmation; the Essay Competition is proposed, not announced; and the
 * Competition Committee's details are to come from Farooq. REVIEW_NOTES
 * below lists each open item for the reviewers.
 *
 * UK English throughout. No em dashes. No guarantee language: Brooke House
 * College alone decides admission and awards, and the page says so.
 */

export const CAMPAIGN_SLUG = "sarkin-fulani-future-leaders" as const;
export const PAGE_PATH = "/sarkin-fulani-future-leaders";

/**
 * Publication state. While true the page carries the review banner, is
 * noindex, and is absent from the sitemap and the prerender list (the
 * tests hold those four together). Publishing is a separate decision for
 * Tom Arrington once Farooq and Brooke House have approved; it flips this
 * and the three registrations in one change.
 */
export const DRAFT = Object.freeze({
  isDraft: true,
  label: "Draft for review",
  line:
    "Not yet published. Royal material subject to approval by the Office of His Royal Highness. Brooke House College offers and tuition fee awards subject to the College's confirmation.",
});

export const PATRON = Object.freeze({
  honorific: "His Royal Highness",
  name: "Alhaji (Dr.) Mohammed Abubakar Bambado II",
  title: "Sarkin Fulani of Lagos",
  seal: "/images/sarkin-fulani/seal-sarkin-fulani-of-lagos.jpg",
  sealAlt: "Seal of the Palace of the Sarkin Fulani of Lagos",
  foundationName: "Sarkin Fulanin Lagos Foundation",
  foundationLogo: "/images/sarkin-fulani/sarkin-fulanin-lagos-foundation.png",
  foundationLogoAlt: "Sarkin Fulanin Lagos Foundation logo",
});

export const PARTNERS = Object.freeze({
  brookeHouse: Object.freeze({
    name: "Brooke House College",
    place: "England",
    logo: "/manus-storage/brooke_house_87454a0b.png",
    logoAlt: "Brooke House College",
  }),
  wsa: Object.freeze({
    name: "World Student Advisors",
    place: "United Kingdom and Nigeria",
    logo: "/manus-storage/wsa_logo_beb199d6.png",
    logoAlt: "World Student Advisors",
  }),
});

export const HERO = Object.freeze({
  eyebrow: "Under the patronage of His Royal Highness the Sarkin Fulani of Lagos",
  headline: "The Sarkin Fulani Future Leaders Programme",
  strap: "Creating educational opportunities for the next generation",
  supporting:
    "A pathway to Brooke House College in England for talented young people from the Arewa community, with World Student Advisors beside each family from first conversation to arrival.",
  recruiting: "Now recruiting for January 2027 entry",
  primaryCta: "Express your interest",
  schoolsCta: "Schools: Quranic Memorisation Competition",
  partnersLine: "In partnership with Brooke House College, England, and World Student Advisors",
});

/**
 * His Royal Highness's educational vision, in the words of the discussion
 * document Brooke House College and WSA placed before him in July 2026,
 * with the community named as Farooq Gajo asked on 29 September 2026.
 * Royal material: displayed subject to the approval of his Office.
 */
export const VISION = Object.freeze({
  heading: "His Royal Highness's vision",
  motto: "Education changes lives. Legacy shapes generations.",
  paragraphs: [
    "For many years His Royal Highness has served the Arewa community of Lagos. The Sarkin Fulani Future Leaders Programme carries that service into education: a pathway through which young people of ability, ambition and good character can reach a British education and return as the teachers, doctors, engineers, entrepreneurs, public servants and community leaders of tomorrow.",
    "The programme is founded on opportunity, excellence, integrity and service. Every student is encouraged to become an ambassador for their community, showing that education, hard work and strong values can change a life.",
    "Its measure will not be examination results alone. It will be the lives changed, the families inspired and the contribution these young people make to their communities and their nation for generations to come.",
  ],
  patronRole:
    "His Royal Highness is Patron of the programme, providing leadership, strategic guidance and the connection between the programme and the Arewa community.",
  foundationLine: "The programme is supported by the Sarkin Fulanin Lagos Foundation.",
});

export const WHAT_IS = Object.freeze({
  heading: "What is the Sarkin Fulani Future Leaders Programme?",
  paragraphs: [
    "An educational initiative created to open new opportunities for talented young people from the wider Arewa community.",
    "Under the patronage of His Royal Highness, the programme brings together Brooke House College in England and World Student Advisors to identify and support young people with ability, ambition, talent and leadership potential. The first students will be recruited for entry to Brooke House College in January 2027.",
    "This is about much more than studying in Britain. The ambition is to help develop educated, confident and responsible young people who can become future leaders within their professions, families and communities.",
  ],
  offersHeading: "The programme offers",
  offers: [
    "Full-time education at Brooke House College",
    "Tuition fee awards for students admitted full-time",
    "Education combined with elite football development",
    "Leadership and personal development through the Vector Programme",
    "Brooke House College Summer Schools",
    "The proposed Brooke House College Essay Competition",
  ],
});

export const WHO_FOR = Object.freeze({
  heading: "Who are we looking for?",
  intro:
    "Promising young people from the Arewa community who have the potential to make the most of these opportunities. Selection is not based only on examination results. Brooke House College considers the whole student, including:",
  criteria: [
    "Academic ability and potential",
    "English language ability",
    "Ambition and motivation",
    "Leadership potential",
    "Strength of character and resilience",
    "Integrity and compassion",
    "Commitment to education",
    "Sporting ability, where relevant",
    "A desire to make a positive contribution to family, community and society",
  ],
  close: "We want to find young people who can succeed themselves and, in time, inspire and support others.",
});

export interface OpportunityCard {
  id: string;
  eyebrow: string;
  title: string;
  body: string[];
  /** Items Brooke House College will confirm before publication, shown as such. */
  pending?: string[];
}

/**
 * The Brooke House College opportunities, Tim Hunt's third requirement.
 * Every claim here is the College's to confirm; where the proposal left a
 * list for the College to complete, the card says so rather than inventing
 * dates, ages or fees.
 */
export const OPPORTUNITY_CARDS: ReadonlyArray<OpportunityCard> = Object.freeze([
  {
    id: "full-time",
    eyebrow: "January 2027 entry",
    title: "Full-time education at Brooke House College",
    body: [
      "Brooke House College is a British boarding school in England providing academic education alongside extensive opportunities for personal development. Students follow a pathway suited to their age, academic background, abilities and ambitions.",
      "The aim is to prepare young people for university, future careers and adult life while building confidence, independence and the ability to succeed in an international environment.",
      "Families should express their interest early, to allow time for counselling, application, assessment, admission, financial planning and Student Visa preparation.",
    ],
  },
  {
    id: "football",
    eyebrow: "Football and education",
    title: "Develop your football without sacrificing your education",
    body: [
      "For talented footballers, Brooke House College offers a British education combined with high level football development through its Football Academy. Young players pursue their sporting ambitions while building a strong academic future.",
      "Football ability is assessed by Brooke House College where relevant. Football Academy fees are separate from the standard College tuition fee and are explained to families before any commitment.",
    ],
  },
  {
    id: "vector",
    eyebrow: "The Vector Programme",
    title: "Preparing young people for more than examinations",
    body: [
      "The Brooke House College Vector Programme sits alongside academic study and develops leadership, resilience, critical thinking, creativity, communication and teamwork: the qualities universities and employers value, and the qualities of future professionals and community leaders.",
      "Students can also take part in enrichment including entrepreneurship, creative and performing arts, community service, clubs and societies and the Duke of Edinburgh's Award.",
    ],
  },
  {
    id: "summer-schools",
    eyebrow: "Summer Schools",
    title: "Experience Britain. Learn. Explore. Make friends.",
    body: [
      "Brooke House College Summer Schools give young people from the Arewa community a way to experience Britain, develop confidence and discover life at a British boarding school. For some it is a memorable experience in its own right. For others it is a first look at Brooke House College before considering full-time education.",
      "Football and British Culture: football training combined with British culture and life in England, for young people with a passion for the game.",
      "British Culture with Exceptional Tours: learning and personal development combined with tours and experiences, for young people who want to discover Britain first hand.",
    ],
    pending: ["2027 dates, ages, duration, accommodation, fees and what is included, to be confirmed by Brooke House College"],
  },
  {
    id: "essay",
    eyebrow: "Proposed",
    title: "Brooke House College Essay Competition",
    body: [
      "Your ideas. Your voice. Your opportunity. Education is about thinking, questioning, forming ideas and communicating them well, and the programme wants young people from the Arewa community to show theirs.",
    ],
    pending: ["Essay question, who can enter, word limit, dates, judging and prizes, to be confirmed by Brooke House College"],
  },
]);

/**
 * Tuition fee awards, Tim Hunt's fourth requirement, with his caveat
 * carried onto the page: the wording is subject to Brooke House College's
 * confirmation. The figures are those in the 19 August 2026 proposal.
 */
export const AWARDS = Object.freeze({
  heading: "How much financial support is available?",
  paragraphs: [
    "Every student admitted for full-time education through the Sarkin Fulani Future Leaders Programme is eligible for a 10% tuition fee award from Brooke House College.",
    "Exceptional students may be considered by Brooke House College for a further reduction of up to 15% for academic, sporting or leadership achievement, so the maximum tuition fee reduction will normally be 25%.",
    "All admissions and tuition fee award decisions are made independently by Brooke House College. The programme is not a fully funded scholarship: families fund the remaining cost of the student's education and other expenses.",
    "Before a family makes any commitment, World Student Advisors makes sure they understand the fees, any award received and the additional costs involved. Every family receives a clear financial breakdown first.",
  ],
  confirmationNote: "Award wording subject to confirmation by Brooke House College.",
  includedHeading: "The published Brooke House College tuition fee includes",
  included: [
    "Academic tuition",
    "Boarding accommodation",
    "Meals during term time",
    "Pastoral care and student welfare",
    "Access to academic, sporting and enrichment facilities",
  ],
  budgetHeading: "Families should also budget for",
  budget: [
    "Student Visa fees",
    "Immigration Health Surcharge",
    "International flights and travel",
    "Clothing and personal expenses",
    "Examination fees where applicable",
    "School trips and optional activities",
    "Guardianship arrangements where required",
  ],
  separateLine: "Football Academy fees are charged separately where applicable. Summer School fees and inclusions will be published separately.",
});

export const STEPS: ReadonlyArray<{ title: string; body: string }> = Object.freeze([
  {
    title: "Express your interest",
    body: "A student, parent or guardian completes the short form on this page.",
  },
  {
    title: "Talk to a Student Counsellor",
    body: "A World Student Advisors Student Counsellor contacts the family personally to discuss the student's education, interests and ambitions, and which opportunity may suit. For full-time education, the family's ability to meet the costs of studying in the United Kingdom is discussed too.",
  },
  {
    title: "Apply",
    body: "Where full-time education is appropriate, World Student Advisors helps the family prepare and apply to Brooke House College.",
  },
  {
    title: "Brooke House College assessment",
    body: "The College assesses the student independently. Depending on the pathway this may include academic records, English language ability, references, an interview and football ability where relevant. Brooke House College alone decides whether a student is admitted and the level of any award.",
  },
  {
    title: "Offer and financial information",
    body: "Successful applicants receive an offer, with clear information about tuition fees, any award and the additional costs to meet, before deciding whether to accept.",
  },
  {
    title: "Preparing for England",
    body: "World Student Advisors supports the student and family through CAS, Student Visa preparation, travel planning and preparation for arrival in England.",
  },
]);

export const TIMELINE: ReadonlyArray<{ when: string; what: string }> = Object.freeze([
  { when: "Autumn 2026", what: "Programme launch and recruitment begins." },
  { when: "Autumn 2026", what: "Expressions of interest, counselling, student assessments and Brooke House College admissions." },
  { when: "January 2027", what: "The first Sarkin Fulani Future Leaders Programme students begin at Brooke House College." },
  { when: "Summer 2027", what: "Brooke House College Summer Schools." },
  { when: "2027", what: "Brooke House College Essay Competition, subject to the College's confirmation." },
]);

export const BEHIND = Object.freeze({
  heading: "Who is behind the programme?",
  brookeHouse:
    "Provides education, boarding, pastoral care and student development. The College independently assesses applications and makes every decision on admission and tuition fee awards.",
  wsa:
    "The link between families and Brooke House College. Our Student Counsellors help families understand the opportunities, prepare applications and support students through admission, Student Visa preparation and enrolment.",
});

/**
 * Maryam Lawal, the programme's WSA contact in Nigeria. Tim Hunt, 9 October
 * 2026: her card sits immediately below "Who is behind the programme?" and
 * above the Expression of Interest, with both contact details live and a
 * WhatsApp icon rather than a telephone one. She answers general questions;
 * the Expression of Interest form stays separate and its routing is
 * unchanged until the Office of His Royal Highness confirms the procedure.
 * Her photograph is the one already on the Our Team page.
 */
export const MARYAM = Object.freeze({
  name: "Maryam Lawal",
  programmeRole: "Programme Relationship and Family Liaison",
  title: "Director, Nigeria",
  organisation: "World Student Advisors",
  email: "Maryam@WorldStudentAdvisors.com",
  whatsapp: "+44 7305 615 829",
  whatsappDigits: "447305615829",
  photo: "/images/sarkin-fulani/maryam-lawal.jpg",
  photoAlt: "Maryam Lawal, Director, Nigeria, World Student Advisors",
  eyebrow: "Your WSA contact in Nigeria",
  description: "Maryam is available to answer general questions about the programme and explain how families can begin their educational journey.",
  emailLabel: "Email Maryam",
  whatsappLabel: "WhatsApp Maryam",
});

/** The WhatsApp link Tim Hunt specified, with no pre-filled message. */
export function maryamWhatsAppHref(): string {
  return `https://wa.me/${MARYAM.whatsappDigits}`;
}

/* ------------------------------------------------------------------ */
/* Expression of Interest                                              */
/* ------------------------------------------------------------------ */

export interface Opportunity {
  value: string;
  label: string;
  /** The study level recorded at sign-up: Brooke House is a boarding school; the rest are "other". */
  desiredLevel: DesiredLevelValue;
}

/** Tim Hunt's list from the proposal, "I am not sure" last, as on the Nigeria pages. */
export const OPPORTUNITIES: ReadonlyArray<Opportunity> = Object.freeze([
  { value: "full-time-january-2027", label: "Full-time education at Brooke House College, January 2027", desiredLevel: "boarding" },
  { value: "football-and-education", label: "Football and Education", desiredLevel: "boarding" },
  { value: "summer-football-british-culture", label: "Summer School: Football and British Culture", desiredLevel: "other" },
  { value: "summer-british-culture-tours", label: "Summer School: British Culture with Exceptional Tours", desiredLevel: "other" },
  { value: "essay-competition", label: "Brooke House College Essay Competition", desiredLevel: "other" },
  { value: "not-sure", label: "I am not sure and would like advice", desiredLevel: "other" },
]);

export const ENQUIRER_ROLES: ReadonlyArray<{ value: string; label: string }> = Object.freeze([
  { value: "parent", label: "Parent or guardian" },
  { value: "student", label: "Student" },
  { value: "other", label: "Teacher, relative or community leader" },
]);

export const EXPRESS_INTEREST = Object.freeze({
  heading: "Express your interest",
  supporting:
    "You do not need to know which opportunity is right before contacting us. A World Student Advisors Student Counsellor will talk to you and your family and help you explore the most appropriate option.",
  nextPageLine: "Six questions here, the rest on the next page.",
  cta: "Continue",
  noPromise: "Completing the form does not mean admission or a tuition fee award. It starts a conversation.",
  privacy: "Your details go to World Student Advisors' student records system so that a Student Counsellor can contact you.",
});

/**
 * The hand-off into the one controlled path to Pipedrive.
 *
 * This form does not create a Lead. It carries the family's own answers to
 * the /contact sign-up, which validates every field, runs the bot check
 * and writes the Lead, exactly as the Nigeria postgraduate page does. The
 * campaign slug makes the Lead note name this programme and sends the
 * programme's own notification as well as the Student Counsellors' usual
 * one (shared/campaignEnquiry.ts). A second, weaker route into the CRM for
 * the sake of six fields would be the wrong trade.
 */
export function expressInterestHandoffUrl(input: {
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  opportunity: string;
}): string {
  const params = new URLSearchParams();
  const first = input.firstName.trim().slice(0, 60);
  const last = input.lastName.trim().slice(0, 60);
  const email = input.email.trim().slice(0, 120);
  if (first) params.set("firstName", first);
  if (last) params.set("lastName", last);
  if (email) params.set("email", email);
  // A Nigerian number is handed over in international form, or not at all.
  const international = toInternationalNigerianNumber(input.phone);
  if (international) params.set("phone", international);

  const opportunity = OPPORTUNITIES.find(o => o.value === input.opportunity);
  if (opportunity) {
    params.set("desiredLevel", opportunity.desiredLevel);
    const role = ENQUIRER_ROLES.find(r => r.value === input.role);
    const roleNote = role ? ` (${role.label.toLowerCase()})` : "";
    params.set("areaOfStudy", `Sarkin Fulani Future Leaders Programme: ${opportunity.label}${roleNote}`.slice(0, 160));
  }
  params.set("preferredDestination", "uk");
  params.set("campaign", CAMPAIGN_SLUG);
  return `/contact?${params.toString()}#student-signup`;
}

/* ------------------------------------------------------------------ */
/* His Royal Highness's Annual Quranic Memorisation Competition        */
/* ------------------------------------------------------------------ */

/**
 * Farooq Gajo, 29 September 2026: the competition is His Royal Highness's
 * own, it stands as its own clearly identified section, and a school's
 * registration goes to the Competition Committee in Nigeria. The copy says
 * what is known and no more: the Committee's dates, categories and venue
 * are theirs to announce, and the page does not guess at them.
 */
export const QURANIC = Object.freeze({
  eyebrow: "His Royal Highness's Annual Quranic Memorisation Competition",
  heading: "For schools: register for the Quranic Memorisation Competition",
  paragraphs: [
    "Each year His Royal Highness the Sarkin Fulani of Lagos holds a Quranic Memorisation Competition for young people. It is organised by the Competition Committee in Nigeria and is separate from the Brooke House College opportunities above.",
    "Schools wishing to enter students can register their interest here. The Committee will contact the school with the competition's dates, categories and arrangements.",
  ],
  routingLine:
    "This form goes to the Competition Committee in Nigeria. It is not a World Student Advisors enquiry and is not added to WSA's student records.",
  formHeading: "School registration",
  formSupporting: "Please give the details a member of the Committee will need to contact your school.",
  cta: "Send registration to the Committee",
  successHeading: "Registration sent",
  successLine: "Your school's registration has been sent to the Competition Committee. A member of the Committee will be in touch with the contact you gave.",
  detailsPending: "Competition dates, categories and venue will be announced by the Committee.",
});

/* ------------------------------------------------------------------ */

export const FOOTER_LINE = Object.freeze({
  motto: "Education changes lives. Legacy shapes generations.",
  patronage: "Under the patronage of His Royal Highness Alhaji (Dr.) Mohammed Abubakar Bambado II, Sarkin Fulani of Lagos",
  partners: "In partnership with Brooke House College and World Student Advisors",
});

/**
 * Open items for the reviewers, not rendered. Each is something the page
 * cannot settle on its own; the record and the review email list them.
 */
export const REVIEW_NOTES: ReadonlyArray<{ owner: string; item: string }> = Object.freeze([
  { owner: "Office of His Royal Highness (Farooq Gajo)", item: "Approval of the royal material: the vision wording, the display of the Palace seal and the Foundation logo, and the name of the community." },
  { owner: "Office of His Royal Highness (Farooq Gajo)", item: "A dignified photograph of His Royal Highness for the hero, if one is to be used; the seal stands in its place for now." },
  { owner: "Office of His Royal Highness (Farooq Gajo)", item: "The Competition Committee's email address and the fields it requires; the form holds a working set and sends to a holding address until then." },
  { owner: "Brooke House College", item: "Confirmation of the tuition fee award wording (10%, up to a further 15%, normally 25% maximum)." },
  { owner: "Brooke House College", item: "Summer School 2027 dates, ages, duration, fees and inclusions; Essay Competition details; Vector Programme wording; photographs of the College, the Football Academy and students." },
  { owner: "Tim Hunt", item: "Who else receives the programme's enquiry notification alongside the Student Counsellors (Maryam Lawal, for instance), and the timeline dates now that September 2026 has passed." },
  { owner: "Tim Hunt", item: "Maryam's photograph: the card uses the Our Team photograph; if the one attached to his email of 9 October is different, it needs filing where the site can take it." },
  { owner: "Office of His Royal Highness (Farooq Gajo)", item: "Whether Expressions of Interest go first to the Palace for an eligibility check before referral to WSA (Tim's email to Farooq of 9 October). The form's routing is unchanged until confirmed." },
]);

/** Every string a visitor can read, for the copy tests. */
export function allRenderedCopy(): string[] {
  return [
    DRAFT.label, DRAFT.line,
    PATRON.honorific, PATRON.name, PATRON.title, PATRON.sealAlt, PATRON.foundationName, PATRON.foundationLogoAlt,
    PARTNERS.brookeHouse.name, PARTNERS.brookeHouse.place, PARTNERS.wsa.name, PARTNERS.wsa.place,
    ...Object.values(HERO),
    VISION.heading, VISION.motto, ...VISION.paragraphs, VISION.patronRole, VISION.foundationLine,
    WHAT_IS.heading, ...WHAT_IS.paragraphs, WHAT_IS.offersHeading, ...WHAT_IS.offers,
    WHO_FOR.heading, WHO_FOR.intro, ...WHO_FOR.criteria, WHO_FOR.close,
    ...OPPORTUNITY_CARDS.flatMap(c => [c.eyebrow, c.title, ...c.body, ...(c.pending ?? [])]),
    AWARDS.heading, ...AWARDS.paragraphs, AWARDS.confirmationNote, AWARDS.includedHeading, ...AWARDS.included,
    AWARDS.budgetHeading, ...AWARDS.budget, AWARDS.separateLine,
    ...STEPS.flatMap(s => [s.title, s.body]),
    ...TIMELINE.flatMap(t => [t.when, t.what]),
    BEHIND.heading, BEHIND.brookeHouse, BEHIND.wsa,
    MARYAM.name, MARYAM.programmeRole, MARYAM.title, MARYAM.organisation, MARYAM.email, MARYAM.whatsapp,
    MARYAM.photoAlt, MARYAM.eyebrow, MARYAM.description, MARYAM.emailLabel, MARYAM.whatsappLabel,
    ...OPPORTUNITIES.map(o => o.label), ...ENQUIRER_ROLES.map(r => r.label),
    ...Object.values(EXPRESS_INTEREST),
    QURANIC.eyebrow, QURANIC.heading, ...QURANIC.paragraphs, QURANIC.routingLine, QURANIC.formHeading,
    QURANIC.formSupporting, QURANIC.cta, QURANIC.successHeading, QURANIC.successLine, QURANIC.detailsPending,
    ...Object.values(FOOTER_LINE),
  ];
}
