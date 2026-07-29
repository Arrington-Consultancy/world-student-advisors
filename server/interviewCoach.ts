import { invokeLLM } from "./_core/llm";

export type InterviewType = "cas" | "ukvi" | "university" | "course";

const TYPE_LABELS: Record<InterviewType, string> = {
  cas: "CAS (Confirmation of Acceptance for Studies) interview",
  ukvi: "UKVI credibility interview for a UK student visa",
  university: "UK university admissions interview",
  course: "course-specific academic interview",
};

export interface EvaluationResult {
  score: number;
  passed: boolean;
  weaknesses: string[];
  strengths: string[];
  researchRecommendations: string[];
  summary: string;
}

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
          "You are an experienced UK international-student admissions interviewer. Generate realistic interview questions. Output JSON only.",
      },
      {
        role: "user",
        content: `Generate exactly ${count} realistic questions for a ${TYPE_LABELS[interviewType]}${courseOrSubject ? ` for a student applying to study ${courseOrSubject}` : ""}. Questions should cover motivation, course/institution knowledge, finances (where appropriate for visa interviews), post-study plans, and ties to home country. Vary difficulty. Do not number them.`,
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

export async function evaluateAnswers(
  interviewType: InterviewType,
  courseOrSubject: string | undefined,
  qa: { question: string; answer: string }[],
): Promise<EvaluationResult> {
  const transcript = qa
    .map((item, i) => `Q${i + 1}: ${item.question}\nStudent answer: ${item.answer || "(no answer given)"}`)
    .join("\n\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a strict but supportive UK ${TYPE_LABELS[interviewType]} assessor for international students. You mark practice interviews.

STRICT RULES — never break these:
1. NEVER provide model answers, example answers, sample phrasing, or suggested wording of any kind. Do not rewrite or improve the student's answers.
2. The pass mark is 85 out of 100. Score honestly and rigorously across content, credibility, specificity, consistency, and communication.
3. For each weak area, EXPLAIN precisely why it is weak (vague, generic, inconsistent, lacking evidence, off-topic, too short, etc.) without showing what a better answer would say.
4. Recommend concrete further research topics the student should study themselves (e.g. "research your university's specific module list", "learn the financial maintenance requirements for your visa route").
Output JSON only.`,
      },
      {
        role: "user",
        content: `Interview type: ${TYPE_LABELS[interviewType]}${courseOrSubject ? `\nCourse/subject: ${courseOrSubject}` : ""}\n\nTranscript:\n${transcript}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "interview_evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "integer", description: "Overall score 0-100, pass mark is 85" },
            weaknesses: {
              type: "array",
              items: { type: "string" },
              description: "Specific weaknesses with clear explanations of WHY each is weak. Never include model answers or suggested wording.",
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "Genuine strengths observed in the answers",
            },
            researchRecommendations: {
              type: "array",
              items: { type: "string" },
              description: "Concrete topics the student should research further on their own",
            },
            summary: {
              type: "string",
              description: "Brief overall assessment (2-3 sentences). No model answers.",
            },
          },
          required: ["score", "weaknesses", "strengths", "researchRecommendations", "summary"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof content === "string" ? content : "{}");
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  return {
    score,
    passed: score >= 85,
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    researchRecommendations: Array.isArray(parsed.researchRecommendations) ? parsed.researchRecommendations : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}
