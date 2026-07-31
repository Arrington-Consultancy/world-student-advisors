import { invokeLLM } from "./_core/llm";

export type InterviewType = "cas" | "ukvi" | "university" | "course";

/**
 * Exact labels required for the four interview types the student chooses
 * between before starting a session.
 */
export const TYPE_LABELS: Record<InterviewType, string> = {
  cas: "CAS Interview Preparation",
  ukvi: "UKVI Credibility Interview Preparation",
  university: "University Interview Preparation",
  course: "Course-Specific Interview Preparation",
};

const TYPE_CONTEXT: Record<InterviewType, string> = {
  cas: "CAS (Confirmation of Acceptance for Studies) interview",
  ukvi: "UKVI credibility interview for a UK student visa",
  university: "UK university admissions interview",
  course: "course-specific academic interview",
};

/** Shared rules every prompt in this file must carry — never relax these. */
const CORE_RULES = [
  "NEVER provide model answers, example answers, sample phrasing, or suggested wording of any kind. Do not rewrite, improve, or hint at a stronger version of the student's answer.",
  "The pass mark is 85 out of 100. Score honestly and rigorously — do not inflate scores to be encouraging.",
  "Explain weaknesses and missing information precisely (vague, generic, inconsistent, lacking evidence, off-topic, too short, etc.) without ever revealing what the correct or better content would be.",
  "Recommend concrete research or homework the student must do themselves, not generic advice (e.g. 'research your university's specific module list for [course]', not 'do more research').",
].join("\n");

export async function generateQuestions(
  interviewType: InterviewType,
  courseOrSubject: string | undefined,
  count: number,
): Promise<string[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          `You are an experienced UK international-student admissions interviewer running a ${TYPE_LABELS[interviewType]} practice session. Generate realistic interview questions. Output JSON only.\n\n${CORE_RULES}`,
      },
      {
        role: "user",
        content: `Generate exactly ${count} realistic questions for a ${TYPE_CONTEXT[interviewType]}${courseOrSubject ? ` for a student applying to study ${courseOrSubject}` : ""}. Questions should cover motivation, course/institution knowledge, finances (where appropriate for visa interviews), post-study plans, and ties to home country. Vary difficulty. Do not number them.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "interview_questions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: { type: "string" },
              description: "The interview questions",
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof content === "string" ? content : "{}");
  const questions: string[] = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (questions.length === 0) {
    throw new Error("Failed to generate interview questions");
  }
  return questions.slice(0, count);
}

export interface FollowUpExchange {
  question: string;
  answer: string;
}

export interface AnswerAssessment {
  /** true only when this was the student's first attempt at the question and it needs probing further. */
  needsFollowUp: boolean;
  /** Set only when needsFollowUp is true. */
  followUpQuestion: string;
  /** Final mark for this question, 0-100. Only meaningful when needsFollowUp is false. */
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  researchHomework: string[];
}

const EMPTY_ANSWER_ASSESSMENT = (): AnswerAssessment => ({
  needsFollowUp: true,
  followUpQuestion: "You didn't answer that one — try again in your own words, even a short attempt.",
  score: 0,
  strengths: [],
  weaknesses: [],
  missingInformation: [],
  researchHomework: [],
});

/**
 * Assess a single answer in a one-question-at-a-time interview session.
 *
 * On the student's first attempt at a question, a vague, incomplete,
 * contradictory, or too-short answer gets one intelligent follow-up
 * question instead of a score. Once `followUp` is supplied (the student's
 * second attempt), a follow-up is never asked again — the code enforces
 * this cap itself rather than trusting the model to self-limit, so the
 * interaction can never loop indefinitely regardless of what the model
 * returns.
 */
export async function assessAnswer(params: {
  interviewType: InterviewType;
  courseOrSubject?: string;
  question: string;
  answer: string;
  followUp?: FollowUpExchange;
}): Promise<AnswerAssessment> {
  const { interviewType, courseOrSubject, question, answer, followUp } = params;
  const isSecondAttempt = Boolean(followUp);

  // Don't spend an API call scoring a blank submission.
  if (!isSecondAttempt && !answer.trim()) {
    return EMPTY_ANSWER_ASSESSMENT();
  }

  const transcript = [
    `Question: ${question}`,
    `Student's first answer: ${answer || "(no answer given)"}`,
    followUp ? `Follow-up question asked: ${followUp.question}` : "",
    followUp ? `Student's follow-up answer: ${followUp.answer || "(no answer given)"}` : "",
  ].filter(Boolean).join("\n");

  const attemptRule = isSecondAttempt
    ? "This is the student's SECOND attempt at this question (a follow-up has already been asked and answered). You must score it now — do not ask another follow-up under any circumstances, even if it is still weak. Reflect any remaining gaps honestly in weaknesses and missingInformation instead."
    : "This is the student's FIRST attempt at this question. If the answer is vague, incomplete, contradictory, or too short to assess properly, do not score it yet — instead set needsFollowUp to true and ask one focused, intelligent follow-up question that targets exactly what's missing or unclear, without revealing the information you're asking for. Only score it now if it is already a substantive, assessable answer.";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a strict but supportive UK ${TYPE_CONTEXT[interviewType]} assessor for international students, coaching a practice interview one question at a time.\n\nSTRICT RULES — never break these:\n${CORE_RULES}\n\n${attemptRule}\n\nWhen needsFollowUp is true, leave score at 0 and strengths/weaknesses/missingInformation/researchHomework as empty arrays — they are not used yet. When needsFollowUp is false, leave followUpQuestion as an empty string. Output JSON only.`,
      },
      {
        role: "user",
        content: `Interview type: ${TYPE_CONTEXT[interviewType]}${courseOrSubject ? `\nCourse/subject: ${courseOrSubject}` : ""}\n\n${transcript}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "answer_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            needsFollowUp: { type: "boolean", description: "True only if this is a first attempt that needs probing further" },
            followUpQuestion: { type: "string", description: "The follow-up question, or empty string if not needed" },
            score: { type: "integer", description: "0-100, pass mark is 85. 0 if needsFollowUp is true." },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: {
              type: "array",
              items: { type: "string" },
              description: "Specific weaknesses with clear explanations of WHY each is weak. Never include model answers or suggested wording.",
            },
            missingInformation: {
              type: "array",
              items: { type: "string" },
              description: "Specific facts, details, or context the student did not know or state — the gaps themselves, not advice.",
            },
            researchHomework: {
              type: "array",
              items: { type: "string" },
              description: "Concrete research or homework tasks the student must do themselves before their next attempt or the live mock interview.",
            },
          },
          required: ["needsFollowUp", "followUpQuestion", "score", "strengths", "weaknesses", "missingInformation", "researchHomework"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof content === "string" ? content : "{}");

  return {
    // Hard cap enforced in code: a second attempt can never trigger another follow-up,
    // regardless of what the model returned.
    needsFollowUp: isSecondAttempt ? false : Boolean(parsed.needsFollowUp),
    followUpQuestion: typeof parsed.followUpQuestion === "string" ? parsed.followUpQuestion : "",
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
    researchHomework: Array.isArray(parsed.researchHomework) ? parsed.researchHomework : [],
  };
}

export const PASS_MARK = 85;

export interface SessionSummary {
  averageScore: number;
  passed: boolean;
  readyForMockInterview: boolean;
}

/**
 * Pure aggregation — no LLM call. Takes the final score from each
 * substantive (non-follow-up) answer in the session and applies the 85%
 * average threshold that gates progression to a live mock interview with
 * a WSA Student Counsellor.
 */
export function summariseSession(scores: number[]): SessionSummary {
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;
  const passed = averageScore >= PASS_MARK;
  return { averageScore, passed, readyForMockInterview: passed };
}
