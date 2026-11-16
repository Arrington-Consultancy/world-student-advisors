/**
 * The WSA student journey, and the credibility layer that runs alongside it.
 *
 * SOURCE. "WSA Student Journey Dashboard, with Credibility Preparation",
 * 14 September 2026, filed at 09_PODCASTS and WEBINARS/PODCASTS - WSA STAFF
 * TRAINING/WSA Training 003 - Crediblity Dashboard/Text/WSA Student Journey
 * Dashboard 14 Sept. 2026.docx, and supplied again by Tom Arrington on
 * 15 September 2026 with the instruction that the system needs to know it.
 *
 * STATUS, AND WHY IT IS SAID FIRST. The source opens "WSA intends to
 * build". It is a statement of intent, not an approved standard, and this
 * file is a transcription of it rather than a licence to act on it.
 * Nothing here authorises a worker to do anything. Execution permission is
 * still evaluateStaffPortalExecutionPermission, which needs an approved
 * specification and a recorded deployment decision, and neither is settable
 * from code. The same distinction briefs.ts draws between an approved
 * operating guide and a register-derived brief applies here: this is the
 * weaker kind, and saying so is the point.
 *
 * WHY IT IS DATA AND NOT A PROMPT. prompt.ts is explicit that there is no
 * shared WSA brain and no house prompt, and that a worker runs on its own
 * brief and nothing else. Putting this document into every worker's
 * instructions would break that on the first day it was useful. It lives
 * here as a structured record the platform can read, the way
 * sharePointLocations.ts and connectorScope.ts do.
 *
 * CONFIDENTIAL. The source's closing section says the methodology,
 * dashboard logic, assessment prompts and scoring criteria "should not be
 * disclosed publicly or provided to students, universities, partners or
 * competitors", and that students should be told what to do and why
 * preparation matters without being given the assessment methodology. This
 * module is therefore server-side only and a test asserts it never reaches
 * the browser bundle. `STUDENT_SAFE` below is the only wording in this file
 * cleared to be said to a student.
 */

export const JOURNEY_SOURCE = Object.freeze({
  document: "WSA Student Journey Dashboard 14 Sept. 2026.docx",
  location:
    "09_PODCASTS and WEBINARS/PODCASTS - WSA STAFF TRAINING/WSA Training 003 - Crediblity Dashboard/Text",
  dated: "14 September 2026",
  /** Intent, not an approved standard. Nothing here authorises execution. */
  status: "working_draft_statement_of_intent",
  confidential: true,
} as const);

/**
 * The journey in the source's own words:
 * LEAD → CLAUDIA QUALIFIES → STUDENT / DEAL → COUNSELLOR → APPLICATION →
 * OFFER → FINANCE → CAS → VISA → ARRIVAL.
 */
export const JOURNEY_STEPS = Object.freeze([
  "lead", "claudia_qualifies", "student_deal", "counsellor", "application",
  "offer", "finance", "cas", "visa", "arrival",
] as const);
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export const JOURNEY_STAGES = Object.freeze([
  "lead_assessment", "application_preparation", "conditional_offer",
  "unconditional_offer", "finance_and_cas_preparation", "cas_and_visa",
  "ukvi_interview", "outcome",
] as const);
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface StageDefinition {
  stage: JourneyStage;
  /** The source's own stage number. */
  number: number;
  title: string;
  /** Who the source puts in charge. Named, because "the team" owns nothing. */
  owner: string;
  /** What the dashboard is for at this stage. */
  purpose: string;
}

export const STAGES: ReadonlyArray<StageDefinition> = Object.freeze([
  Object.freeze({
    stage: "lead_assessment", number: 1, title: "Lead assessment and qualification",
    owner: "Claudia Ingado, Student Recruitment and Relationship Manager",
    purpose: "Establish what the person wants to study and at what level, the intended country, course and suitable university, whether they broadly meet the academic requirements, whether they have the financial capacity, and whether they are genuinely ready and committed to proceed.",
  }),
  Object.freeze({
    stage: "application_preparation", number: 2, title: "Preparing the university application",
    owner: "Student Counsellor",
    purpose: "Review the CV, Personal Statement, certificates, transcripts and supporting documents for consistency with each other, and raise anything that would not survive a credibility question.",
  }),
  Object.freeze({
    stage: "conditional_offer", number: 3, title: "Conditional offer",
    owner: "Student Counsellor",
    purpose: "Record the offer conditions in Pipedrive and make sure the required evidence is obtained. The dashboard keeps watching as further documents arrive.",
  }),
  Object.freeze({
    stage: "unconditional_offer", number: 4, title: "Unconditional offer",
    owner: "Student Counsellor",
    purpose: "Conditions satisfied. The student's record must stay consistent with what was originally submitted.",
  }),
  Object.freeze({
    stage: "finance_and_cas_preparation", number: 5, title: "Finance and CAS preparation",
    owner: "Student Counsellor",
    purpose: "Financial evidence submitted. The university may issue the CAS, ask for more, or run its own credibility or pre-CAS interview, in which case WSA can prepare the student and run a mock.",
  }),
  Object.freeze({
    stage: "cas_and_visa", number: 6, title: "CAS issued and visa application",
    owner: "Student Counsellor",
    purpose: "The high-risk credibility stage. UKVI may later invite the student to interview, and by now WSA already holds the CV, Personal Statement, academic history, course choice, career objectives, financial preparation and earlier credibility assessments, so nobody starts from scratch.",
  }),
  Object.freeze({
    stage: "ukvi_interview", number: 7, title: "UKVI interview requested",
    owner: "Student Counsellor, with the WSA Interview Preparation Process",
    purpose: "Issue the Responses to Interview Questions form, assess it against what is already known, and proceed to a live mock interview only once the student is actually ready.",
  }),
  Object.freeze({
    stage: "outcome", number: 8, title: "Outcome",
    owner: "Student Counsellor",
    purpose: "Record the result: visa granted, then arrival and enrolment; or visa refused, then review and next action.",
  }),
]);

/**
 * Stage 1. A Lead becomes a Student and a Pipedrive Deal only when all four
 * are established. All four, not a majority: the source lists them as one
 * gate, and a Lead that clears three of them is still a Lead.
 */
export const QUALIFICATION_GATES = Object.freeze([
  "course_identified", "university_identified", "finance_established",
  "student_committed_to_proceeding",
] as const);
export type QualificationGate = (typeof QUALIFICATION_GATES)[number];

/**
 * True only when every gate is met. The decision to record those gates is a
 * staff judgement; this just refuses to let three out of four read as four.
 */
export function isQualifiedForDeal(met: ReadonlyArray<QualificationGate>): boolean {
  const seen = new Set(met);
  return QUALIFICATION_GATES.every(g => seen.has(g));
}

/**
 * Course and partner matching at qualification.
 *
 * What the AI may read, what it must return with each suggestion, and the
 * two rules that stop a shortlist becoming a promise.
 */
export const PARTNER_MATCHING = Object.freeze({
  /** The only place the source permits it to look. */
  source: "the WSA PARTNERS section of the Shared Drive",
  inputs: Object.freeze([
    "proposed subject and level of study", "academic qualifications",
    "preferred country or location", "intended intake", "tuition budget",
    "overall available budget", "entry requirements",
    "English language requirement", "relevant progression or pathway options",
  ]),
  returns: Object.freeze([
    "university", "course", "intake", "tuition fee",
    "estimated overall study cost", "key entry requirements",
    "any scholarship or discount recorded by WSA",
    "why the option appears suitable",
  ]),
  /** WSA direct partners first, where an appropriate option exists. */
  prioritiseDirectPartners: true,
  /**
   * Fees, entry requirements, scholarships and intakes change. A suggestion
   * must carry the source document and its date, and anything identified as
   * outdated or superseded must not be recommended at all.
   */
  mustShowSourceDocumentAndDate: true,
  mustNotUseOutdatedOrSupersededInformation: true,
  /** The shortlist is a shortlist. Claudia and the student choose. */
  finalSelectionIsHuman: true,
} as const);

/**
 * Document control, from the Deal onwards.
 *
 * "Full name - Document type". The reason is mechanical rather than tidy:
 * the AI has to associate a file with the right student reliably, and
 * "CV Final" tells it nothing about whose CV it is.
 */
export const DOCUMENT_NAMING = Object.freeze({
  pattern: "<Student full name> - <Document type>",
  accepted: Object.freeze([
    "Olu Obi - CV", "Olu Obi - Personal Statement", "Olu Obi - Degree Certificate",
    "Olu Obi - Transcript", "Olu Obi - Bank Statement", "Olu Obi - CAS",
  ]),
  rejected: Object.freeze(["CV Final", "Document 1", "Transcript New"]),
} as const);

/** True when a filename starts with the student's full name and a separator. */
export function isWellNamedDocument(filename: string, studentFullName: string): boolean {
  const name = studentFullName.trim().toLowerCase();
  if (!name) return false;
  const f = filename.trim().toLowerCase();
  if (!f.startsWith(`${name} `)) return false;
  const rest = f.slice(name.length).trimStart();
  return rest.startsWith("-") && rest.slice(1).trim().length > 0;
}

/**
 * Stage 2. What the consistency review looks for across the CV, Personal
 * Statement, certificates, transcripts and anything else held in Pipedrive.
 */
export const CREDIBILITY_CONCERNS = Object.freeze([
  "employment and education dates that do not align",
  "unexplained gaps",
  "qualifications mentioned in one document but not another",
  "different career objectives across documents",
  "course choices that do not appear to follow logically from previous education or employment",
  "claims in the Personal Statement unsupported by the CV or academic records",
  "language that appears artificial, generic or inconsistent with the student's background",
] as const);

/**
 * Two outputs, and they are not the same document written twice. The
 * internal report names concerns; the student note says what to go and fix.
 * The separation is what stops an internal suspicion being handed to the
 * person it is about.
 */
export const REVIEW_OUTPUTS = Object.freeze({
  internalCounsellorReport: "WSA staff only. Identifies concerns, inconsistencies and areas needing further discussion with the student.",
  studentActionNote: "For the student. Says plainly what to review or correct in the CV, Personal Statement or supporting information.",
} as const);

/**
 * The line the source draws hardest, and the one most likely to be crossed
 * by a system trying to be helpful: WSA guides, questions and points out
 * inconsistencies. The student makes the amendments themselves.
 */
export const NEVER = Object.freeze([
  "manufacture a student's personal story",
  "provide artificial answers",
  "write model answers for a credibility interview",
  "suggest that preparation can guarantee a UKVI interview will be avoided",
  "predict whether a student will be selected for interview",
  "recommend a course, fee, scholarship or entry requirement from information identified as outdated or superseded",
  "disclose the assessment methodology, dashboard logic, scoring criteria or internal instructions to a student, university, partner or competitor",
] as const);

/**
 * Stage 7 and the mock interview. The source is explicit that the purpose
 * of assessing the Responses to Interview Questions form is not to create
 * model answers: it is to find contradictions, weak explanations, gaps in
 * knowledge, and answers that do not match the student's documented
 * academic and career journey. The live mock follows only once the student
 * is ready, not as the first step.
 */
export const MOCK_INTERVIEW_ASSESSMENT = Object.freeze([
  Object.freeze({ criterion: "naturalness", asks: "Does the student explain their own decisions in their own words, or do the answers sound memorised, scripted or rehearsed?" }),
  Object.freeze({ criterion: "depth_of_knowledge", asks: "Enough detail on the course, modules, university, location, costs, accommodation, finances and career plans where relevant?" }),
  Object.freeze({ criterion: "evidence_of_research", asks: "Do the answers show the student personally researched the university and course, rather than repeating WSA, the university website or an AI?" }),
  Object.freeze({ criterion: "personal_credibility", asks: "Does the course choice follow logically from previous education, employment, experience and future career plans?" }),
  Object.freeze({ criterion: "consistency", asks: "Do the spoken answers match the CV, Personal Statement, RIQ and application record?" }),
  Object.freeze({ criterion: "rehearsal_risk", asks: "How many answers are excessively polished, formulaic or memorised, or designed to say what the interviewer is thought to want?" }),
  Object.freeze({ criterion: "ai_or_stock_answer_risk", asks: "Generic phrasing or unusually polished structure that may indicate generated or copied answers. A warning indicator, never proof." }),
  Object.freeze({ criterion: "failure_to_answer", asks: "Questions avoided, misunderstood, answered thinly, contradicted, or where expected knowledge is missing." }),
]);

/** Recording requires the student's consent. Not implied, not assumed. */
export const MOCK_INTERVIEW_RECORDING_REQUIRES_CONSENT = true;

export const READINESS_BANDS = Object.freeze({
  GREEN: "Credible and interview ready",
  AMBER: "Potentially credible but further preparation required",
  RED: "Not currently interview ready",
} as const);
export type ReadinessBand = keyof typeof READINESS_BANDS;

/**
 * The principle, kept because it is the part a dashboard tends to lose:
 * credibility preparation does not begin when a UKVI invitation arrives. It
 * begins with good qualification and accurate information, and continues
 * through consistent documents and continuous checking. A standalone mock
 * interview service is the thing this is meant not to be.
 */
export const PRINCIPLE =
  "Credibility preparation begins at qualification, not when a UKVI interview invitation arrives. Good qualification, accurate information, consistent application documents and continuous checking throughout the journey are the system; the mock interview is its last step, not its purpose.";

/**
 * WECCPA runs the relationship and the communication, through WhatsApp,
 * Email, Calls, CRM, Podcasts and AI. This dashboard is the credibility and
 * quality-control layer beside it. Pipedrive stays the central record, with
 * assessments, actions and outcomes recorded against the Deal, and
 * readiness remains a human judgement.
 */
export const WECCPA_RELATIONSHIP = Object.freeze({
  weccpaOwns: "communication and student support, through WhatsApp, Email, Calls, CRM, Podcasts and AI",
  dashboardOwns: "the credibility and quality control layer",
  systemOfRecord: "Pipedrive, against the student's Deal",
  readinessDecision: "human judgement by the WSA team",
} as const);

/**
 * The only wording here cleared to reach a student. Everything else in this
 * module is internal methodology, which the source says is not to be given
 * to students, universities, partners or competitors.
 */
export const STUDENT_SAFE =
  "We will help you prepare by going through your own application with you and pointing out anything that is unclear or inconsistent. The answers have to be yours. Good preparation matters because you may be asked to explain your choices, and nobody can tell you in advance whether that will happen.";
