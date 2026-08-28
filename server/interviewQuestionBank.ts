export type InterviewType = "cas" | "ukvi" | "university" | "course";

/**
 * Standard AI Interview Coach Question Bank, supplied by WSA (31 July 2026),
 * quality-controlled 27 August 2026 against official sources (GOV.UK Student
 * and Child Student caseworker guidance; University of Kent and University
 * of Bradford credibility-interview guidance; UCAS admissions-interview
 * guidance — see the design/audit report this revision implements). No
 * question here reproduces any of those sources verbatim; each is an
 * original question grounded in the theme those sources document.
 *
 * cas/ukvi were near-duplicates of each other before this revision (10 of
 * 14 questions shared substance). Study gaps, prior visa history, and
 * "why not another country" — all directly evidenced in the GOV.UK
 * guidance's genuine-student risk factors but previously absent from both
 * — are now covered once each, with the least immigration-specific of the
 * old UKVI duplicates ("What other universities did you apply to?")
 * removed to make room rather than simply padding the bank.
 *
 * No African-market-specific question set exists here, deliberately: the
 * official sources describe the same interview and the same risk-factor
 * assessment regardless of the applicant's origin. What's added instead is
 * the funding/study-history/immigration-history depth that's genuinely
 * evidenced as relevant wherever that scrutiny is real, for any applicant
 * facing it.
 *
 * This is the primary and only source of interview question content — the
 * LLM is never used to invent replacement questions. Anywhere this module
 * is used, the LLM's role is limited to: rewording a question to naturally
 * reference course/university details already supplied by the student
 * (server/interviewCoach.ts personaliseQuestions), and asking targeted
 * follow-up questions grounded in a specific answer (assessAnswer). Which
 * subset of a category to ask, and in what order, is decided
 * deterministically in code (selectSessionQuestions), not by the model.
 */
export const QUESTION_BANK: Record<InterviewType, string[]> = {
  cas: [
    "Why have you chosen to study in the UK rather than in your home country?",
    "What motivated you to choose this particular course, and how does it relate to your academic background?",
    "Can you explain how this course will help you achieve your long-term career goals?",
    "Why did you choose this university over other institutions offering similar programmes?",
    "What other universities did you consider, and why did you ultimately choose this one?",
    "Which other countries, if any, did you consider for your studies, and why did you choose the UK instead?",
    "What do you know about your course, including the modules you will study?",
    "What did you study previously, and how does it prepare you for this programme?",
    "Have you had any breaks in your study history, and if so, how would you explain them?",
    "Who is sponsoring your studies?",
    "How will your tuition fees and living expenses be funded throughout your studies?",
    "Can you explain the source of the funds you have shown for your visa application?",
    "Do you have any family members living in the UK?",
    "What are your plans after completing your studies, and do you intend to return to your home country?",
    "What ties do you have to your home country, such as family, employment opportunities, business interests, or property?",
    "Have you arranged accommodation for your studies, and can you explain where you plan to live while studying in the UK?",
  ],
  ukvi: [
    "Why do you want to study in the UK?",
    "Which other countries, if any, did you consider for your studies, and why did you choose the UK instead?",
    "Why have you chosen this course?",
    "Why have you chosen this university?",
    "What do you know about your course and its modules?",
    "How does this course relate to your previous studies?",
    "Have you had any breaks in your study history, and if so, how would you explain them?",
    "How will this course help your future career?",
    "Have you applied for a UK visa before? If so, what was the outcome?",
    "Who is paying for your studies?",
    "How much are your tuition fees?",
    "How will you meet your living expenses in the UK?",
    "Do you plan to work while studying in the UK?",
    "Do you have relatives or friends in the UK?",
    "What will you do after completing your studies?",
    "What accommodation arrangements have you made in the UK, and how will you pay for your accommodation during your studies?",
  ],
  university: [
    "Why have you chosen this course?",
    "Why have you chosen to study this course at this university?",
    "What specific aspects of the curriculum interest you most?",
    "Which modules are you most looking forward to studying and why?",
    "What do you know about the university and its reputation?",
    "What research strengths or facilities of the university attracted you?",
    "How does your academic background prepare you for this course?",
    "What relevant skills or experience do you bring to this programme?",
    "How do you plan to fund your tuition fees and living expenses?",
    "What are your academic and professional goals?",
    "What are your career plans after completing the course?",
    "How will this qualification help you contribute to your home country?",
    "What are your expectations of studying and living in the UK?",
    "What do you know about the city and campus you'd be studying in, and how did you find that out?",
  ],
  course: [
    "Why are you interested in this specific course?",
    "What inspired you to pursue this field of study?",
    "What do you know about the main subjects covered in this course?",
    "Which module interests you the most and why?",
    "What skills do you expect to gain from this course?",
    "How does this course relate to your previous studies or work experience?",
    "What challenges do you expect in this course, and how will you manage them?",
    "Have you undertaken any projects, research, or practical activities related to this subject?",
    "What current developments or trends in this field interest you?",
    "How do you think this course will improve your professional skills?",
    "What type of career do you hope to pursue after graduation?",
    "How will this qualification help you progress academically or professionally?",
    "Why do you believe you are a suitable candidate for this course?",
  ],
};
