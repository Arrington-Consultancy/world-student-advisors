import { invokeLLM } from "./_core/llm";
import { QUESTION_BANK, type InterviewType } from "./interviewQuestionBank";

export type { InterviewType };

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

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "in", "on", "for", "and", "or", "your", "this", "you", "is", "are",
  "will", "how", "what", "why", "do", "does", "did", "have", "has", "had", "would", "could", "should",
  "that", "with", "from", "at", "as", "be", "been", "was", "were", "it", "its", "their", "they",
  "them", "who", "which", "can", "not", "during", "after", "before", "while",
]);

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

/**
 * Guards personaliseQuestions against the model silently replacing a bank
 * question with invented content instead of lightly rewording it: requires
 * meaningful word overlap with the original, and forbids a wildly
 * different length. This is what makes "must not silently replace the
 * supplied questions" and "must not introduce unrelated questions"
 * enforceable in code rather than just requested in a prompt.
 */
export function isQuestionVariant(original: string, candidate: string): boolean {
  if (!candidate || !candidate.trim()) return false;
  if (candidate.length > original.length * 3 + 40) return false;
  const originalWords = significantWords(original);
  if (originalWords.size === 0) return true;
  const candidateWords = significantWords(candidate);
  let overlap = 0;
  originalWords.forEach((w) => {
    if (candidateWords.has(w)) overlap++;
  });
  return overlap / originalWords.size >= 0.4;
}

/**
 * Deterministically picks `count` questions from the supplied bank for one
 * interview type, in a fixed, sensible order — never the LLM's call. When
 * `count` is fewer than the full bank, the selection is spread evenly
 * across the bank (not just the first N) so even a short session still
 * touches motivation, course/institution knowledge, finances, and ties to
 * home country rather than clustering on whatever happens to come first.
 * Always returns questions that are members of QUESTION_BANK[interviewType]
 * — by construction, a category can never receive another category's
 * questions.
 */
export function selectSessionQuestions(interviewType: InterviewType, count: number): string[] {
  const bank = QUESTION_BANK[interviewType];
  const n = Math.max(1, Math.min(count, bank.length));
  if (n >= bank.length) return [...bank];

  const step = bank.length / n;
  const indices = Array.from({ length: n }, (_, i) => Math.floor(i * step));
  return indices.map((idx) => bank[idx]);
}

/**
 * Lightly rewords a fixed set of already-selected bank questions to
 * naturally reference course/university details the student has already
 * supplied (e.g. "this course" -> the actual course name). Never called
 * with an empty courseOrSubject — nothing to personalise, so the bank
 * questions are returned completely unchanged with no LLM call at all.
 *
 * The model may not add, remove, reorder, or replace questions, and may
 * not invent facts beyond what's supplied. If it doesn't return exactly
 * the same number of questions, the result is untrusted and the original
 * verbatim bank questions are returned instead — this is a hard fallback
 * enforced in code, not a request the model can decline into.
 */
export async function personaliseQuestions(
  interviewType: InterviewType,
  baseQuestions: string[],
  courseOrSubject: string | undefined,
): Promise<string[]> {
  if (!courseOrSubject || !courseOrSubject.trim()) {
    return baseQuestions;
  }

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: [
          `You are lightly personalising a fixed, already-approved set of ${TYPE_CONTEXT[interviewType]} questions for one student. You are wordsmithing them, never replacing, removing, adding, or reordering them, and never inventing new questions.`,
          "",
          "STRICT RULES — never break these:",
          CORE_RULES,
          "5. Return exactly the same number of questions, in the same order, one personalised rewrite per input question.",
          "6. Do not change a question's meaning, topic, or category. Only reference the supplied course/university detail where it fits naturally (e.g. replace 'this course' with the actual course name). If a question has nothing natural to personalise, return it unchanged.",
          "7. Do not invent facts about the course, university, or student beyond exactly what is supplied below.",
          "8. Never answer any of the questions yourself — only reword the question text.",
          "Output JSON only.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `Course/university detail supplied by the student: ${courseOrSubject}\n\nQuestions to personalise:\n${baseQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "personalised_questions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: { type: "string" },
              description: `Exactly ${baseQuestions.length} personalised questions, in the same order as supplied`,
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    const personalised: unknown = parsed.questions;

    if (
      !Array.isArray(personalised) ||
      personalised.length !== baseQuestions.length ||
      personalised.some((q) => typeof q !== "string" || !q.trim())
    ) {
      // Model didn't honour the count/shape constraints at all — fall back
      // to the untouched bank questions rather than risk a mismatched set.
      return baseQuestions;
    }

    // Per-question guard: even with the right count, revert any individual
    // question that isn't actually a variant of its bank original back to
    // the original verbatim text. Catches a model that quietly substitutes
    // invented or unrelated content while still returning the right number
    // of strings.
    return personalised.map((q, i) => (isQuestionVariant(baseQuestions[i], q) ? q : baseQuestions[i]));
  } catch {
    return baseQuestions;
  }
}

/**
 * Full question set for a new session: a deterministic, bank-only
 * selection, optionally personalised in wording. This is the only function
 * server/routers.ts calls to start a session — the supplied Standard AI
 * Interview Coach Question Bank is always the source, never an
 * LLM-invented replacement.
 */
export async function getSessionQuestions(
  interviewType: InterviewType,
  courseOrSubject: string | undefined,
  count: number,
): Promise<string[]> {
  const base = selectSessionQuestions(interviewType, count);
  return personaliseQuestions(interviewType, base, courseOrSubject);
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
