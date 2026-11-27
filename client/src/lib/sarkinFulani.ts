
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
 *     "Fulani and Hausa Fulani" is not used.
 *  3. Tim Hunt's landing page proposal of 19 August 2026 (the text) and
 *     the discussion document sent to His Royal Highness in July 2026
 *     (the vision wording).
 *  4. Farooq Gajo's reply of 10 October 2026 and Tim Hunt's answer of 11
 *     October 2026: the vision wording reflects His Royal Highness's aims,
 *     the Foundation is the Sarkin Fulanin Lagos Foundation, His Royal
 *     Highness is happy with the enquiry and referral procedure, and the
 *     Quranic Memorisation Competition is not on this page. Tim: its
 *     promotion and school registrations belong to the Foundation's own
 *     communications, under the Committee.
 *  5. Brooke House College's confirmation of 12 October 2026 (Chad Male,
 *     Admissions Consultant, forwarded by Tim Hunt on 15 October): January
 *     2027 entry for around 32 students, with places by year group; the
 *     tuition fee awards, 10% and then a further 15% on football ability
 *     and/or academic level, decided on a football assessment and/or a
 *     current school report; recruitment can begin. Tim's other points
 *     (Football Academy, Vector, Summer Schools, Essay Competition) wait
 *     for Giles Williams.
 *  6. Tim Hunt, 15 October 2026, on the Expression of Interest: it goes
 *     first to the Office of His Royal Highness (Farooq Gajo), Maryam Lawal
 *     and Tim, with only what an eligibility check needs; the Student
 *     Counsellors come in once Farooq has confirmed eligibility and Maryam
 *     is ready to progress the student. Maryam is the principal WSA
 *     contact in Nigeria. The page stays in draft until Farooq and Brooke
 *     House College confirm everything for publication.
 *  7. Farooq Gajo, 18 November 2026, for the Office of His Royal Highness:
 *     "We have reviewed the landing page and we are okay with it." Tim Hunt
 *     the same day: "Let's try and get this live 1 Dec."
 *  8. Tim Hunt's revamp brief of 18 November 2026 ("Revamp the King's
 *     LP.docx", in 16_WEBSITE_AI/07 Landing Pages/King's Landing Page_Yes),
 *     section by section: new wording for the programme offers, the Vector
 *     Programme, the Summer Schools and the boarding fees; the Essay
 *     Competition and every "to be confirmed" note removed ("we need this
 *     launched"); his photograph beside the opportunities; and his own
 *     Pipedrive form, "Express your interest", in place of ours.
 *  9. Chad Male, Brooke House College, 19 November 2026, on the summer
 *     schools: "The two courses to list are the English Language Tuition
 *     Course and the High-Performance Football Development Camp." Tim's
 *     summer copy is kept for those two; its GCSE, A Level and IELTS taster
 *     paragraph is left out because the College did not list it.
 * 10. Tim Hunt, 20 November 2026, on the preview, to make the page "a bit
 *     more attractive" while keeping His Royal Highness's "professional and
 *     serious side" and the Royal seal: his photograph of the student is
 *     removed ("Looks boring. Remove him please"); the Football Academy team
 *     photograph and its facilities video join the football card; the
 *     scholarship competition link moves to the foot of the page, because
 *     it is separate from what Brooke House College offers the programme;
 *     a classroom photograph joins the fee awards; and the Vector
 *     Programme logo heads its card, with a matching header on the Summer
 *     Schools card, as in his mock-ups.
 *
 * WHAT IS STILL OPEN is in REVIEW_NOTES below, not on the page: Tim asked
 * for the amber "to be confirmed" notes to go (18 November 2026).
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
 *
 * PUBLISHED 23 November 2026. Tim Hunt, who had asked on 19 November that
 * the page's form not be used until he said so, told Tom Arrington on 23
 * November that he wanted the page out in time for the January intake. The
 * label and line below are kept for the record and are no longer shown.
 *
 * NOT YET PROMOTED (24 November 2026). On 24 November Tim sent the live
 * address to Brooke House College and to His Royal Highness for their
 * approval, and told His Royal Highness that WSA "will await Your Majesty's
 * approval before promoting the page". So the page stays up at its address,
 * without the review banner, for them to read, and search engines are kept
 * away from it: it is noindex and out of the sitemap (shared/seo.ts,
 * NOINDEX_PATHS, and client/public/sitemap.xml). When both have approved,
 * take it off NOINDEX_PATHS and put the sitemap entry back in one change.
 */
export const DRAFT = Object.freeze({
  isDraft: false,
  label: "Draft for review",
  line:
    "Not yet published. Approved by the Office of His Royal Highness on 18 November 2026; Brooke House College confirmed January 2027 entry and the tuition fee awards on 12 October 2026.",
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

/**
 * Brooke House College's own pages, for the links Tim's revamp brief of 18
 * November 2026 asks for. Checked on brookehousecollege.co.uk on 19
 * November 2026. The College has no Vector Programme page; its brochure is
 * still to come from Tim.
 */
export const BHC_LINKS = Object.freeze({
  scholarshipCompetition: "https://www.brookehousecollege.co.uk/football-academy/scholarship-competition",
  summerSchool: "https://www.brookehousecollege.co.uk/summer-school",
  termDates: "https://www.brookehousecollege.co.uk/parent-information/term-dates",
  learning: "https://www.brookehousecollege.co.uk/learning-at-brooke-house/high-performance-learning",
  boarding: "https://www.brookehousecollege.co.uk/life-at-brooke-house/boarding",
  catering: "https://www.brookehousecollege.co.uk/life-at-brooke-house/catering",
  studentLife: "https://www.brookehousecollege.co.uk/life-at-brooke-house/enrichment/enrichment-overview",
  fees: "https://www.brookehousecollege.co.uk/admissions/fees",
  // Tim Hunt, 22 November 2026, in place of the subjects booklet, which did
  // not download for him either: "Use this link, please". Later that night:
  // "We don't need a brochure now", as the College changes them too often.
  accreditations: "https://www.brookehousecollege.co.uk/about-us/accreditations-memberships",
});

/**
 * The Vector Programme brochure, sent by Tim Hunt on 22 November 2026. It is
 * on the programme's own site, not Brooke House College's. Read that day:
 * "Full-time elite football with academic programme for persons aged
 * between 18-23 years", and the three degrees the card lists.
 */
export const VECTOR_BROCHURE_URL = "https://vectoreducationsports.com/wp-content/uploads/pdf/BH_VectorPromoBrochure.pdf";

export interface PageLink {
  label: string;
  href: string;
}

export interface PageImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const WHAT_IS = Object.freeze({
  heading: "What is the Sarkin Fulani Future Leaders Programme?",
  paragraphs: [
    "An educational initiative created to open new opportunities for talented young people from the wider Arewa community.",
    "Under the patronage of His Royal Highness, the programme brings together Brooke House College in England and World Student Advisors to identify and support young people with ability, ambition, talent and leadership potential. The first students will be recruited for entry to Brooke House College in January 2027.",
    "This is about much more than studying in Britain. The ambition is to help develop educated, confident and responsible young people who can become future leaders within their professions, families and communities.",
  ],
  // Tim Hunt, 18 November 2026: new wording for this box, the Essay
  // Competition line removed, and the Vector line as "Elite football and
  // degree study after Brooke House College", to link to the brochure once
  // he sends it.
  offersHeading: "Explore your opportunities at Brooke House College",
  offers: [
    { text: "Study and board in England at Brooke House College." },
    // The scholarship competition link moved to the foot of the page (Tim
    // Hunt, 20 November 2026): this line is what the College offers the
    // programme, the competition is separate.
    { text: "Receive a 10% tuition fee award if admitted for full-time study through the programme. Brooke House College may increase the total award to 25% based on academic or football ability." },
    { text: "Combine your studies with advanced football training through the Brooke House College Football Academy." },
    { text: "Elite football and degree study after Brooke House College." },
    { text: "Practise your English and make new friends at a Brooke House College summer camp." },
  ] as ReadonlyArray<{ text: string; link?: PageLink }>,
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
  /** Facts the College has confirmed, shown as a list under a heading. */
  confirmedHeading?: string;
  confirmed?: string[];
  /** A plain list under a heading, such as the Vector Programme's degrees. */
  listHeading?: string;
  list?: string[];
  /** Links to Brooke House College's own pages, shown at the foot of the card. */
  links?: PageLink[];
  /** A photograph under the card's text. */
  image?: PageImage;
  /** A video on YouTube, linked under the photograph. */
  video?: PageLink;
  /** A logo banner across the top of the card, in place of the icon and eyebrow. */
  banner?: PageImage;
  /** A coloured header strip carrying the icon and the eyebrow as the card's label. */
  headerStrip?: boolean;
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
    // Brooke House College, 12 October 2026: around 32 places in all.
    confirmedHeading: "Places for January 2027, confirmed by Brooke House College",
    confirmed: [
      "Years 7, 8 and 9 (aged 12, 13 or 14 on or after 1 September): 17 places",
      "Year 10 (aged 15 on or after 1 September): 6 to 8 places, for students whose first language is English",
      "Year 11 (aged 16 on or after 1 September): full",
      "Years 12 and 13 (aged 17 on or after 1 September): 7 to 8 places",
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
    // Tim Hunt, 20 November 2026: the team photograph and the video, in the
    // space under the text.
    image: {
      src: "/images/sarkin-fulani/brooke-house-football-academy-team.jpg",
      alt: "The Brooke House College Football Academy team",
      width: 1200,
      height: 824,
    },
    video: { label: "Watch the Football Academy Facilities video", href: "https://www.youtube.com/watch?v=P7NHm6t8SYU" },
  },
  {
    // Tim Hunt, 18 November 2026. Brooke House College to confirm the age
    // range and degree options before the page goes live (REVIEW_NOTES).
    id: "vector",
    eyebrow: "The Vector Programme",
    // Tim Hunt, 20 November 2026: the Vector Programme logo across the top.
    banner: {
      src: "/images/sarkin-fulani/vector-programme-logo.jpg",
      alt: "The Vector Programme",
      width: 747,
      height: 158,
    },
    title: "Train at Coventry City. Play twice a week. Study for a degree.",
    body: [
      "When you leave Brooke House College, you can keep pursuing football while working towards a university degree. The Vector Programme, a joint venture between Coventry City Football Club and Brooke House College, combines full-time elite football training with degree study for players aged 18 to 23.",
      "Train four days a week with UEFA qualified coaches and put your skills to the test on two match days a week. The programme includes strength and conditioning, match analysis and recovery sessions, with opportunities to be seen by scouts.",
    ],
    listHeading: "The brochure lists three degree options:",
    list: [
      "BSc (Hons) Sport and Exercise Science with Management, awarded by Loughborough University",
      "BEng (Hons) Sustainable Engineering, awarded by Loughborough University",
      "BA (Hons) Business Management, awarded by Nottingham Trent University",
    ],
    // Tim Hunt, 22 November 2026: "Here is the Vector Brochure".
    links: [{ label: "Read the Vector Programme brochure (PDF)", href: VECTOR_BROCHURE_URL }],
  },
  {
    // Tim Hunt's wording of 18 November 2026, for the two courses Chad Male
    // named on 19 November: the High Performance Football Development Camp
    // and the English Language Tuition Course.
    id: "summer-schools",
    eyebrow: "Summer Schools at Brooke House College",
    headerStrip: true,
    title: "Train with football coaches, get behind the wheel or explore Britain",
    body: [
      "Spend part of your summer at a British boarding school and choose what you want to get out of it. Play football, try karting or horse riding, improve your English and meet students from around the world.",
      "Take your football further. The High Performance Football Development Camp gives committed players a taste of academy life. Work with UEFA qualified coaches on technique, tactics and match preparation.",
      "Learn English and try something new. On the English Language Tuition Course, combine English lessons with golf coaching, horse riding in the Leicestershire countryside or karting. Choose English Plus British Culture if you'd rather spend your time exploring Britain.",
      "Register your interest with WSA. We'll help your family choose a camp and confirm the 2027 options, dates, age requirements, fees and what's included with Brooke House College.",
    ],
    links: [
      { label: "Explore Brooke House College's summer camps", href: BHC_LINKS.summerSchool },
      { label: "Brooke House College term dates", href: BHC_LINKS.termDates },
    ],
  },
]);

/**
 * Tuition fee awards, Tim Hunt's fourth requirement. The figures are those
 * in the 19 August 2026 proposal, confirmed by Brooke House College on 12
 * October 2026 with the basis for the further 15%: football ability and/or
 * academic level, decided on a football assessment and/or a current school
 * report. The four paragraphs are Tim's replacement of 22 November 2026,
 * verbatim, which also settles which fees the awards apply to: the main
 * full-time programmes, and not the Vector Programme or summer schools.
 */
export const AWARDS = Object.freeze({
  heading: "How much financial support is available?",
  paragraphs: [
    "Students admitted to one of Brooke House College's main full-time programmes through the Sarkin Fulani Future Leaders Programme are eligible for a 10% tuition fee award.",
    "Brooke House College may increase the total award to up to 25% of tuition fees, based on a football assessment, a recent school report or both. These discounts do not apply to the Vector Programme or summer schools.",
    "Brooke House College makes all admissions and award decisions. Families pay the remaining tuition fees and any other expenses.",
    "Before you make a commitment, World Student Advisors will give you a clear breakdown of the tuition fees, any award and any additional costs.",
  ],
  // Tim Hunt, 18 November 2026: "Fees confirmed. Remove light brown text",
  // and this box in place of the tuition fee list.
  includedHeading: "What's included in your boarding fees?",
  includedIntro:
    "Brooke House College's published boarding fees cover teaching, accommodation and meals during term time and the October, February and May half term breaks.",
  included: [
    { text: "Classroom teaching for your chosen course.", link: { label: "Explore studying at Brooke House College.", href: BHC_LINKS.learning } },
    { text: "A place in a boarding house, with shared spaces to relax, study and spend time with friends.", link: { label: "See the boarding houses.", href: BHC_LINKS.boarding } },
    { text: "Meals during your stay in term time and the scheduled half term breaks.", link: { label: "See what's on the menu.", href: BHC_LINKS.catering } },
  ] as ReadonlyArray<{ text: string; link: PageLink }>,
  includedClose: {
    text: "Boarders also have pastoral support from residential staff and opportunities to take part in sport and activities beyond the classroom.",
    link: { label: "Explore student life at Brooke House.", href: BHC_LINKS.studentLife },
  } as { text: string; link: PageLink },
  feesLink: { label: "View Brooke House College's published fees", href: BHC_LINKS.fees } as PageLink,
  // Tim Hunt, 20 November 2026: "add a teaching classroom image". His
  // original file ("Classroom Future leaders learning together") arrived on
  // 22 November and replaced the crop from his mock-up; it carries the
  // College's own name and crest.
  photo: {
    src: "/images/sarkin-fulani/brooke-house-classroom.jpg",
    alt: "A teacher and three students working together around a laptop in a Brooke House College classroom",
    width: 1400,
    height: 637,
  } as PageImage,
  // Tim Hunt, 22 November 2026: under the classroom photo, the College's
  // accreditations page in place of the subjects booklet.
  photoLink: {
    label: "See Brooke House College's accreditations and memberships",
    href: BHC_LINKS.accreditations,
  } as PageLink,
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
  separateLine: "Football Academy fees are charged separately where applicable, and summer camps have their own fees.",
});

/**
 * The campus plan and the map, Tim Hunt, 22 November 2026: "Between these
 * two (How much financial support is available? and Taking the first steps
 * is simple) insert two images. 1. schematic of the campus. 2. Map where
 * BHC." Both carry the College's own wording, so each opens full size for a
 * phone reader, and the alt text gives what the picture says.
 */
export const CAMPUS = Object.freeze({
  label: "Brooke House College's campus and location",
  images: [
    {
      src: "/images/sarkin-fulani/brooke-house-campus-plan.jpg",
      alt: "Illustrated plan of the Brooke House College main campus, labelling the boarding houses with Resident Tutors, the chemistry and physics laboratories, the Football Academy offices, Brooke House itself and the teaching buildings.",
      width: 1600,
      height: 1191,
      caption: "The main campus in Market Harborough. Open the plan to see it full size.",
    },
    {
      src: "/images/sarkin-fulani/brooke-house-location.jpg",
      alt: "Map of the United Kingdom marking Market Harborough, Leicestershire, where Brooke House College is: less than an hour north of London by train and an hour and a half from Heathrow airport by car, according to the College.",
      width: 1600,
      height: 1138,
      caption: "Where the College is: Market Harborough, Leicestershire. Open the map to see it full size.",
    },
  ] as ReadonlyArray<PageImage & { caption: string }>,
});

/**
 * Tim Hunt, 22 November 2026: "make this section more attractive by adding
 * 5 images where there is natural space ... Aimed at the Muslim community.
 * Image 7 is actually Brooke House College." Placed as his mock-up shows:
 * under steps 1, 2, 4 and 6, and the College photograph beside step 7.
 */
export const STEPS_PHOTO: PageImage = Object.freeze({
  src: "/images/sarkin-fulani/steps/07-preparing-for-england.jpg",
  alt: "Students outside the admissions building at Brooke House College",
  width: 806,
  height: 211,
});

export const STEPS: ReadonlyArray<{ title: string; body: string; image?: PageImage }> = Object.freeze([
  {
    title: "Express your interest",
    body: "A student, parent or guardian completes the short form on this page.",
    image: {
      src: "/images/sarkin-fulani/steps/01-express-interest.jpg",
      alt: "A mother in a headscarf and her son looking at a phone together",
      width: 364,
      height: 197,
    },
  },
  {
    title: "The Office of His Royal Highness confirms eligibility",
    body: "Your Expression of Interest goes first to the Office of His Royal Highness, which confirms that the family is part of the community the programme serves.",
    image: {
      src: "/images/sarkin-fulani/steps/02-confirm-eligibility.jpg",
      alt: "Families in traditional dress at a community gathering",
      width: 364,
      height: 126,
    },
  },
  {
    title: "Talk to Maryam Lawal or a Student Counsellor",
    body: "Once eligibility is confirmed, Maryam Lawal, our Director in Nigeria, or a World Student Advisors Student Counsellor contacts the family personally to discuss the student's education, interests and ambitions, and which opportunity may suit. For full-time education, the family's ability to meet the costs of studying in the United Kingdom is discussed too.",
  },
  {
    title: "Apply",
    body: "Where full-time education is appropriate, World Student Advisors helps the family prepare and apply to Brooke House College.",
    image: {
      src: "/images/sarkin-fulani/steps/04-apply.jpg",
      alt: "A mother and her son reading an application together",
      width: 364,
      height: 126,
    },
  },
  {
    title: "Brooke House College assessment",
    body: "The College assesses the student independently. Depending on the pathway this may include academic records, English language ability, references, an interview and football ability where relevant. Brooke House College alone decides whether a student is admitted and the level of any award.",
  },
  {
    title: "Offer and financial information",
    body: "Successful applicants receive an offer, with clear information about tuition fees, any award and the additional costs to meet, before deciding whether to accept.",
    image: {
      src: "/images/sarkin-fulani/steps/06-offer-and-fees.jpg",
      alt: "A mother and her son smiling as they read a letter together",
      width: 364,
      height: 126,
    },
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
 * the Expression of Interest form stays separate and goes first to the
 * Office of His Royal Highness for the eligibility check.
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

/**
 * Tim Hunt's own Pipedrive form, "Express your interest", tested by Eldah
 * Therone and Farooq Gajo on 19 November 2026. Tim, 18 November: "I will
 * create a Pipedrive form". It replaces the page's own six questions and
 * their hand-off to the /contact sign-up. Pipedrive now does the routing
 * Tim set out the same day: the enquiry goes to Farooq Gajo, with Maryam
 * Lawal, Eldah and Tim copied; Eldah is Lead Owner and Maryam the Source
 * Owner. Embedded exactly as supplied, like the landing pages' forms.
 */
export const EXPRESS_INTEREST_FORM_URL =
  "https://webforms.pipedrive.com/f/6N4CIK8VYqnAXH4tLplKpATusPl6pnlplIUMXWxm59MMRC7NinhVX65oeXQG7kG6QP";

/** The opportunities Tim's form offers, listed beside it in the same order. */
export const OPPORTUNITIES: ReadonlyArray<string> = Object.freeze([
  "Boarding and full-time study at Brooke House College",
  "Football Academy and full-time study",
  "Summer football camp",
  "English language and activities summer school",
  "Vector Programme after leaving school",
  "I'm not sure and would like advice",
]);

export const EXPRESS_INTEREST = Object.freeze({
  heading: "Express your interest",
  supporting:
    "You do not need to know which opportunity is right before contacting us. Once the Office of His Royal Highness has confirmed eligibility, Maryam Lawal or a World Student Advisors Student Counsellor will talk to you and your family and help you explore the most appropriate option.",
  noPromise: "Completing the form does not mean admission or a tuition fee award. It starts a conversation.",
  privacy: "Your details go to World Student Advisors' student records system, and your name, contact details and chosen opportunity go to the Office of His Royal Highness to confirm eligibility, so that Maryam Lawal or a Student Counsellor can contact you.",
});

/* ------------------------------------------------------------------ */

/**
 * Tim Hunt, 20 November 2026: "Place the URL at the foot of the page." The
 * scholarship competition is the College's own, separate from what it
 * offers the programme.
 */
export const FOOT_LINK: PageLink = Object.freeze({
  label: "Explore Brooke House College's football scholarship competition",
  href: BHC_LINKS.scholarshipCompetition,
});

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
  { owner: "Office of His Royal Highness (Farooq Gajo)", item: "Approved the landing page on 18 November 2026: \"We have reviewed the landing page and we are okay with it.\" A photograph of His Royal Highness for the hero remains optional; the seal stands in its place." },
  { owner: "Brooke House College", item: "Confirmed on 12 October 2026 (Chad Male): January 2027 entry for around 32 students, with the places by year group now on the page, and the awards (10%, then a further 15% on football ability and/or academic level, decided on a football assessment and/or a current school report). Tim Hunt, 22 November 2026: the awards are for the main full-time programmes and do not apply to the Vector Programme or summer schools." },
  { owner: "Brooke House College", item: "Before the page goes live: the Vector Programme's current age range (the brochure says 18 to 23) and its three degree options (Tim Hunt, 18 November 2026). The Essay Competition is off the page until the College supplies it." },
  { owner: "Brooke House College", item: "Chad Male, 19 November 2026: the two summer courses to list are the English Language Tuition Course and the High-Performance Football Development Camp. 2027 dates, ages and fees are confirmed with the College for each family." },
  { owner: "Tim Hunt", item: "The Vector Programme brochure link arrived on 22 November 2026 in answer to where the poster \"Use this one Loughborough Under 23 Football Programme\" should go, so the card links the brochure and the poster is not used unless he says otherwise." },
  { owner: "Tim Hunt", item: "The classroom photograph is his original of 22 November 2026, with the College's accreditations page linked under it. No brochure: the subjects booklet would not download for him either, and the College changes its brochures too often (22 November). The photograph of a real student he edited (\"Nigerian Heritage Lesson in Classroom\") was removed at his request on 20 November." },
  { owner: "Tim Hunt", item: "His five step photographs of 22 November 2026 are small (364 pixels wide; the College photograph 806), so they are shown at their own size or less and look soft on a sharp phone screen. Larger originals would fix that." },
  { owner: "Tim Hunt", item: "Decided 18 November 2026: the Express your interest form is Tim's Pipedrive form. The enquiry goes to Farooq Gajo with Maryam Lawal, Eldah Therone and Tim copied; Eldah is Lead Owner and Maryam Source Owner. Tim said not to use it on the page until he says (19 November); the page is a draft until then." },
  { owner: "Tim Hunt", item: "The places list uses Brooke House's own words: the ages are 'on or after 1 September' and Year 10 is 'if English is their first language'. Tim to confirm these read as the College means them before publication." },
  { owner: "Tim Hunt", item: "Who else receives the programme's enquiry notification alongside the Student Counsellors (Maryam Lawal, for instance), and the timeline dates now that September 2026 has passed." },
  { owner: "Tim Hunt", item: "Maryam's photograph: the card uses the Our Team photograph; if the one attached to his email of 9 October is different, it needs filing where the site can take it." },
  { owner: "Tim Hunt", item: "Decided 15 October 2026: an Expression of Interest notifies Farooq Gajo, Maryam Lawal and Tim only, as a short version (name, contact details, nationality, country, chosen opportunity and the Lead id; no date of birth or passport number). The Student Counsellors are not notified until Farooq has confirmed eligibility and Maryam is ready. The page's steps and privacy line say so. Farooq's address is set in production, not in the code." },
  { owner: "Tim Hunt", item: "Pipedrive status for these Leads: Tim wants enquiries awaiting eligibility confirmation told apart from those approved for counselling, so none fall through. The website can apply a Lead label on creation once Tim has created it and named it; the switch to approved is then Maryam's, in Pipedrive." },
]);

/** Every string a visitor can read, for the copy tests. */
export function allRenderedCopy(): string[] {
  return [
    DRAFT.label, DRAFT.line,
    PATRON.honorific, PATRON.name, PATRON.title, PATRON.sealAlt, PATRON.foundationName, PATRON.foundationLogoAlt,
    PARTNERS.brookeHouse.name, PARTNERS.brookeHouse.place, PARTNERS.wsa.name, PARTNERS.wsa.place,
    ...Object.values(HERO),
    VISION.heading, VISION.motto, ...VISION.paragraphs, VISION.patronRole, VISION.foundationLine,
    WHAT_IS.heading, ...WHAT_IS.paragraphs, WHAT_IS.offersHeading, ...WHAT_IS.offers.flatMap(o => [o.text, ...(o.link ? [o.link.label] : [])]),
    WHO_FOR.heading, WHO_FOR.intro, ...WHO_FOR.criteria, WHO_FOR.close,
    ...OPPORTUNITY_CARDS.flatMap(c => [
      c.eyebrow, c.title, ...c.body, ...(c.pending ?? []),
      ...(c.confirmedHeading ? [c.confirmedHeading] : []), ...(c.confirmed ?? []),
      ...(c.listHeading ? [c.listHeading] : []), ...(c.list ?? []),
      ...(c.links ?? []).map(l => l.label),
      ...(c.image ? [c.image.alt] : []), ...(c.video ? [c.video.label] : []), ...(c.banner ? [c.banner.alt] : []),
    ]),
    AWARDS.heading, ...AWARDS.paragraphs, AWARDS.includedHeading, AWARDS.includedIntro,
    ...AWARDS.included.flatMap(i => [i.text, i.link.label]), AWARDS.includedClose.text, AWARDS.includedClose.link.label, AWARDS.feesLink.label, AWARDS.photo.alt, AWARDS.photoLink.label,
    CAMPUS.label, ...CAMPUS.images.flatMap(i => [i.alt, i.caption]), STEPS_PHOTO.alt, ...STEPS.flatMap(s => (s.image ? [s.image.alt] : [])),
    AWARDS.budgetHeading, ...AWARDS.budget, AWARDS.separateLine,
    ...STEPS.flatMap(s => [s.title, s.body]),
    ...TIMELINE.flatMap(t => [t.when, t.what]),
    BEHIND.heading, BEHIND.brookeHouse, BEHIND.wsa,
    MARYAM.name, MARYAM.programmeRole, MARYAM.title, MARYAM.organisation, MARYAM.email, MARYAM.whatsapp,
    MARYAM.photoAlt, MARYAM.eyebrow, MARYAM.description, MARYAM.emailLabel, MARYAM.whatsappLabel,
    FOOT_LINK.label,
    ...OPPORTUNITIES,
    ...Object.values(EXPRESS_INTEREST),
    ...Object.values(FOOTER_LINE),
  ];
}
