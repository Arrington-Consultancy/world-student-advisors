/**
 * The WSA people records behind the public OUR TEAM page.
 *
 * Source of authority: the approved OUR TEAM implementation direction of
 * 14 September 2026 (`16_WEBSITE_Ai/06 Counsellors/
 * WSA_OUR_TEAM_Page_Implementation_Direction_14_Sep_2026.md`), which governs
 * wherever it differs from the source change document of the same date.
 *
 * Everything here is transcribed from a controlled record. Nothing is
 * inferred, and a field with no evidence behind it is left out rather than
 * filled in (implementation direction, clause 16):
 *
 *  - name, role            HUB Team details.docx, as amended by the
 *                          implementation direction's clause 7 ordering list,
 *                          which is the governing wording for job titles.
 *  - email, phone          each person's own first-person profile in
 *                          `06 Counsellors/Profiles`, which is the latest
 *                          record and resolves the two digit transpositions
 *                          in the 10 September request document.
 *  - biography             verbatim from that same profile document. Only
 *                          extraction artefacts (spaces inside words) are
 *                          repaired; no wording is rewritten.
 *  - photo                 `06 Counsellors/Photos`, imported by
 *                          scripts/fetch-team-assets.mjs and cropped by
 *                          scripts/optimise-team-photos.py.
 *  - britishCouncil        true only where WSA holds that person's current
 *                          British Council "UK knowledge agent and counsellor
 *                          training" certificate in `06 Counsellors/
 *                          Certficates`. It is an individual claim about
 *                          training, never accreditation: every certificate
 *                          states the British Council does not endorse,
 *                          accredit or validate agents.
 *  - certificate           set only where there is specific evidence of
 *                          consent to publish that certificate. Holding a
 *                          certificate is not consent to publish it.
 */

export interface TeamMember {
  /** Stable id used for the profile dialog and its deep link. */
  slug: string;
  name: string;
  /** Job title, per the implementation direction's clause 7 list. */
  role: string;
  /** What this person actually does at WSA, in their own words. */
  roleAtWsa: string;
  email: string;
  /** Displayed number. `phoneKind` decides whether it is offered as WhatsApp. */
  phone: string;
  phoneKind: "whatsapp" | "telephone" | null;
  photo: string;
  /** First-person biography, one string per paragraph. */
  biography: string[];
  /** Holds a current British Council UK knowledge training certificate. */
  britishCouncil: boolean;
  /** Public URL of that certificate, only where consent to publish it exists. */
  certificate: string | null;
}

/**
 * The public WSA team, in the order approved in clause 7. The order is the
 * organisation, not the student journey - the journey is the separate
 * "How we support you" sequence, which starts with Claudia.
 */
export const WSA_TEAM: TeamMember[] = [
  {
    slug: "tim-hunt",
    name: "Tim Hunt",
    role: "Managing Director",
    roleAtWsa: "Founded World Student Advisors and leads the company.",
    email: "tim.hunt@worldstudentadvisors.com",
    phone: "+44 791 4797 830",
    phoneKind: "whatsapp",
    photo: "/team/tim-hunt.jpg",
    biography: [
      "Rugby has been an important part of my life for as long as I can remember. I played competitively from a young age and went on to captain teams in Bristol, Cambridgeshire, Hertfordshire and Warwickshire. In 1992, while working on a project in Fiji, I also had the extraordinary experience of captaining and coaching the Kadavu Island Premiership XV.",
      "So why am I telling you about rugby when I now run an international education company?",
      "Because rugby taught me values that have stayed with me throughout my life: teamwork, self-discipline, responsibility, respect and, above all, looking after the people around you. Those principles have influenced the way I built World Student Advisors and how I believe we should work with students.",
      "At WSA, trust is not something we simply talk about. We have to earn it.",
      "When you join us, I want you to feel that you have people on your side who genuinely care about what happens to you. Choosing where and what to study can affect the rest of your life, and we take that responsibility personally.",
      "That is why our motto means so much to me: “Your Future is Our Mission.”",
    ],
    britishCouncil: true,
    certificate: "/team/certificates/tim-hunt-british-council.pdf",
  },
  {
    slug: "tom-arrington",
    name: "Tom Arrington",
    role: "Business Consultant",
    roleAtWsa: "Works with Tim and the team on business development, technology, systems and new ideas.",
    email: "tom@worldstudentadvisors.com",
    phone: "+44 1752 477 026",
    phoneKind: "telephone",
    photo: "/team/tom-arrington.jpg",
    biography: [
      "I’m Tom Arrington, and I work with WSA as a Business Consultant.",
      "I have spent more than 20 years building, running, buying and selling businesses, mostly in the South West of England. That experience has taught me that businesses are really about people. You can have good systems, strong ideas and ambitious plans, but you still need to listen, understand what is happening and make sensible decisions.",
      "That is one of the things I enjoy about working with WSA. It is a business with a very clear purpose, helping students and their families make important decisions about their future. My role is mainly behind the scenes, working with Tim and the team on business development, technology, systems and new ideas that can help WSA improve.",
      "I am naturally curious and enjoy looking at how things work and how they might work better. I also believe that change should have a reason behind it. Sometimes the best solution is not to make something more complicated, but to make it clearer, simpler and more useful.",
      "That is the approach I try to bring to WSA.",
    ],
    britishCouncil: false,
    certificate: null,
  },
  {
    slug: "eldah-therone",
    name: "Eldah Therone",
    role: "Senior Student Counsellor & Team Leader",
    roleAtWsa: "Leads the counselling team and works directly with students and their families.",
    email: "eldah@worldstudentadvisors.com",
    phone: "+44 7470 689 849",
    phoneKind: "whatsapp",
    photo: "/team/eldah-therone.jpg",
    biography: [
      "I’m Eldah Therone, a Senior Student Counsellor and Team Leader with World Student Advisors in Nairobi.",
      "My own journey with WSA actually began with persistence. I contacted Tim several times because I wanted the opportunity to join the company. Eventually, he gave me a chance, and I started as a trainee Student Counsellor.",
      "I had previously worked in sales, which taught me confidence and how to communicate with different people. But student counselling taught me something more important: you need to listen. Every student and every family has a different situation, different worries and different ambitions.",
      "Over time, I took on greater responsibility within WSA and today I help lead our team in Kenya. I am proud of that, but the part of the job I value most remains working directly with students and their families.",
      "As a mother myself, I understand why parents ask questions and sometimes worry. When a family trusts WSA with a student’s future, I believe we have a responsibility to earn that trust.",
    ],
    britishCouncil: true,
    certificate: "/team/certificates/eldah-therone-british-council.pdf",
  },
  {
    slug: "glenice-owino",
    name: "Glenice Owino",
    role: "Senior Student Counsellor",
    roleAtWsa: "Supports students from exploring courses and universities through applications, visas and preparing to leave home.",
    email: "glenice@worldstudentadvisors.com",
    phone: "+44 7459 720 726",
    phoneKind: "whatsapp",
    photo: "/team/glenice-owino.jpg",
    biography: [
      "What I enjoy most about my work is getting to know students and their families and understanding what they really want from their education.",
      "I’m Glenice Owino, a Senior Student Counsellor with WSA, based in Kenya. Before moving into international education, I worked in customer service, administration, human resources and marketing. Those experiences taught me something important about working with people: listen first, understand their situation and never assume that everyone needs the same answer.",
      "That is how I approach student counselling. Choosing to study overseas is a big decision, not only for the student but often for the whole family. I want my students to feel comfortable asking questions, including the difficult ones, and to know that I will always give them straightforward and honest advice.",
      "I support students throughout their journey, from exploring courses and universities to applications, visas and preparing to leave home.",
      "For me, the most rewarding part is seeing a student who was initially uncertain become confident about the path they have chosen.",
    ],
    britishCouncil: true,
    certificate: null,
  },
  {
    slug: "manet-khamayo",
    name: "Manet Khamayo",
    role: "Student Counsellor",
    roleAtWsa: "Listens, guides and supports students as they take the next step towards studying overseas.",
    email: "manet@worldstudentadvisors.com",
    // Corrected 15 September 2026 on Tim Hunt's instruction: 546016, not
    // 547016. whatsappHref() strips non-digits from this same string, so the
    // link and the visible number cannot drift apart.
    phone: "+44 7555 546016",
    phoneKind: "whatsapp",
    photo: "/team/manet-khamayo.jpg",
    biography: [
      "Sometimes, the most unexpected conversations can open the door to a completely new journey. Mine began while I was working in the hospitality sector, where I had the opportunity to meet Tim Hunt, Founder and Managing Director of World Student Advisors.",
      "At the time, I had no idea that meeting would lead me towards a career that would become so meaningful to me. Hospitality taught me something I carry with me every day as a Student Counsellor: people want to be heard, understood and genuinely cared for. Working with people from different backgrounds also taught me the importance of building trust and putting people first.",
      "I hold a bachelor’s degree in business management, but for me, counselling is not simply about choosing a university or course. It is about understanding the person behind the application, listening to their ambitions and helping them make confident and informed decisions.",
      "Every student has a different story. My role is to listen, guide and support them as they take the next step towards studying overseas and building their future.",
    ],
    britishCouncil: true,
    certificate: null,
  },
  {
    slug: "claudia-ingado",
    name: "Claudia Ingado",
    role: "Student Recruitment & Relationship Manager",
    roleAtWsa: "Often the first person a student speaks to when they contact WSA.",
    email: "claudia@worldstudentadvisors.com",
    phone: "+44 7341 905 979",
    phoneKind: "whatsapp",
    photo: "/team/claudia-ingado.jpg",
    biography: [
      "I enjoy meeting people, having conversations and finding out what they want to achieve. That is one of the things that attracted me to my role with World Student Advisors.",
      "I’m Claudia Ingado, Student Recruitment & Relationship Manager with WSA in Kenya. My role often means I am one of the first people a student speaks to when they contact us. I think that first conversation matters. Students should feel welcome, able to ask questions and confident that somebody is genuinely interested in what they want to do.",
      "I am naturally curious and outgoing, and outside work I enjoy nature walks, travelling and going on safari. I like meeting people from different backgrounds and learning about their experiences.",
      "At WSA, my job is about relationships rather than simply recruitment. I want to understand each student as an individual, what they hope to achieve and what concerns they may have before helping them take the next step.",
      "For me, a good relationship starts with a conversation, and I look forward to having many of them with our students.",
    ],
    britishCouncil: false,
    certificate: null,
  },
];

/**
 * The student journey, which is deliberately a different order from the
 * organisation above (implementation direction, clause 8).
 */
export const SUPPORT_JOURNEY = [
  {
    step: "Enquiry",
    text: "You get in touch. There is no fee and no obligation, and you are never handed to a call centre or a chatbot.",
  },
  {
    step: "Claudia",
    text: "Claudia Ingado is usually the first person you speak to. She listens to what you want to achieve and makes sure you reach the right counsellor.",
  },
  {
    step: "Named Student Counsellor",
    text: "You are matched with one named Student Counsellor who stays with you. You will always know who you are dealing with and how to reach them.",
  },
  {
    step: "Application",
    text: "Your counsellor works through courses, universities, documents and deadlines with you, and reviews everything before it is submitted.",
  },
  {
    step: "Visa Preparation",
    text: "Your counsellor supports you through student visa preparation, so you know what is needed and when.",
  },
  {
    step: "Enrolment",
    text: "Support continues through pre-departure preparation and enrolment. Your counsellor does not disappear once you have a place.",
  },
] as const;

/**
 * Regional representatives, retained in full.
 *
 * Clause 14 removes these people from the public OUR TEAM page but
 * explicitly forbids deleting their photographs, biographies or underlying
 * records, so every field published before 14 September 2026 is preserved
 * here verbatim, including each person's British Council flag as it stood.
 * Clause 15 forbids building regional landing pages in this task, so nothing
 * renders this list today; it exists so the data survives the restructure
 * and is ready when those pages are approved.
 */
export interface RegionalRepresentative {
  name: string;
  role: string;
  location: string;
  region: string;
  email: string;
  whatsapp: string;
  photo: string;
  britishCouncil: boolean;
}

export const REGIONAL_REPRESENTATIVES: RegionalRepresentative[] = [
  {
    name: "Babatunde Abdulia Azeez",
    role: "Senior Director for Nigeria",
    location: "Ibadan, Oyo State, Nigeria",
    region: "Nigeria",
    email: "babtunde@worldstudentadvisors.co.uk",
    whatsapp: "+234 818 204 9068",
    photo: "/manus-storage/babatunde_azeez_1f9d8fb7.png",
    britishCouncil: false,
  },
  {
    name: "Sarafina Kihumbu",
    role: "Senior Student Counsellor",
    location: "Nairobi, Kenya",
    region: "Kenya",
    email: "sarafina@worldstudentadvisors.com",
    whatsapp: "+44 734 190 5979",
    photo: "/manus-storage/sarafina_kihumbu_bf76c0cc.jpg",
    britishCouncil: true,
  },
  {
    name: "Gladys Naadi Banhu",
    role: "Regional Director, Ghana",
    location: "Ghana",
    region: "Ghana",
    email: "",
    whatsapp: "+233 55 610 2870",
    photo: "/manus-storage/gladys_naadi_banhu_7d1e632e.jpg",
    britishCouncil: true,
  },
  {
    name: "Dr. Dele Kogbe",
    role: "Higher Education Consultant",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/dr_dele_kogbe_7c9976ca.jpg",
    britishCouncil: false,
  },
  {
    name: "Dr. Domoyi Castro Mathew",
    role: "Director of Higher Education",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/dr_domoyi_castro_1b8b8a74.jpg",
    britishCouncil: false,
  },
  {
    name: "Pedro Bezerra",
    role: "Director of Lusophone Countries",
    location: "Angola",
    region: "Angola",
    email: "beezapy@hotmail.com",
    whatsapp: "+44 7512 055433",
    photo: "/manus-storage/pedro_bezerra_9d17852a.jpg",
    britishCouncil: false,
  },
  {
    name: "Juliet Nnajiofor-Uyi",
    role: "Higher Education Advisor",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/juliet_nnajiofor_uyi_7b797464.jpg",
    britishCouncil: false,
  },
  {
    name: "Winnie Kamuya",
    role: "Higher Education Consultant",
    location: "Kenya",
    region: "Kenya",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/winnie_kamuya_6f2fe224.jpg",
    britishCouncil: false,
  },
  {
    name: "Maryam Lawal",
    role: "Director for Nigeria",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/maryam_lawal_52fa19ff.png",
    britishCouncil: false,
  },
  {
    name: "Madalitso Dube",
    role: "Director for Malawi",
    location: "Malawi",
    region: "Malawi",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/madalitso_dube_5417ba52.jpg",
    britishCouncil: false,
  },
  {
    name: "Tobrise Arhawarien",
    role: "Student Counsellor",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/tobrise_arhawarien_724d3107.jpg",
    britishCouncil: false,
  },
];

/** WhatsApp deep link for a displayed number. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

export function findTeamMember(slug: string): TeamMember | undefined {
  return WSA_TEAM.find((person) => person.slug === slug);
}
