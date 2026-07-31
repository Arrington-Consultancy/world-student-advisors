import { describe, expect, it, vi, beforeEach } from "vitest";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const mockedInvokeLLM = vi.mocked(invokeLLM);

function llmJsonResponse(payload: unknown) {
  return {
    choices: [
      { index: 0, message: { role: "assistant" as const, content: JSON.stringify(payload) }, finish_reason: "stop" },
    ],
  };
}

beforeEach(() => {
  mockedInvokeLLM.mockReset();
});

describe("interview type selection", () => {
  it("exposes exactly the four required interview types with the exact required labels", async () => {
    const { TYPE_LABELS } = await import("./interviewCoach");
    expect(TYPE_LABELS).toEqual({
      cas: "CAS Interview Preparation",
      ukvi: "UKVI Credibility Interview Preparation",
      university: "University Interview Preparation",
      course: "Course-Specific Interview Preparation",
    });
  });
});

describe("prohibition on model answers", () => {
  it("instructs the model never to provide model answers when generating questions", async () => {
    const { generateQuestions } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(llmJsonResponse({ questions: ["Why this course?"] }));

    await generateQuestions("cas", undefined, 3);

    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/NEVER provide model answers/i);
  });

  it("instructs the model never to provide model answers when assessing an answer", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        needsFollowUp: false,
        followUpQuestion: "",
        score: 90,
        strengths: [],
        weaknesses: [],
        missingInformation: [],
        researchHomework: [],
      })
    );

    await assessAnswer({ interviewType: "cas", question: "Why this course?", answer: "A genuine, detailed answer about my motivations." });

    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/NEVER provide model answers/i);
    expect(systemMessage).not.toMatch(/here is a model answer/i);
  });
});

describe("follow-up behaviour", () => {
  it("does not call the LLM and requests a follow-up for a blank first answer", async () => {
    const { assessAnswer } = await import("./interviewCoach");

    const result = await assessAnswer({ interviewType: "cas", question: "Why this course?", answer: "   " });

    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toBeTruthy();
    expect(result.score).toBe(0);
  });

  it("surfaces a follow-up question when the model flags a vague first answer", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        needsFollowUp: true,
        followUpQuestion: "Can you name a specific module on the course you're interested in?",
        score: 0,
        strengths: [],
        weaknesses: [],
        missingInformation: [],
        researchHomework: [],
      })
    );

    const result = await assessAnswer({ interviewType: "course", question: "Why this course?", answer: "Because it sounds good." });

    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toBe("Can you name a specific module on the course you're interested in?");
  });

  it("never asks a second follow-up, even if the model tries to — the cap is enforced in code", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    // Model misbehaves and returns needsFollowUp: true on a second attempt.
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        needsFollowUp: true,
        followUpQuestion: "Can you say more?",
        score: 40,
        strengths: [],
        weaknesses: ["Still vague"],
        missingInformation: ["No specific module named"],
        researchHomework: ["Look up the course module list"],
      })
    );

    const result = await assessAnswer({
      interviewType: "course",
      question: "Why this course?",
      answer: "Because it sounds good.",
      followUp: { question: "Can you name a specific module?", answer: "Not really sure." },
    });

    expect(result.needsFollowUp).toBe(false);
    expect(result.score).toBe(40);
    expect(result.weaknesses).toContain("Still vague");
  });

  it("passes the original question, first answer, and follow-up exchange to the model on a second attempt", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        needsFollowUp: false,
        followUpQuestion: "",
        score: 70,
        strengths: [],
        weaknesses: [],
        missingInformation: [],
        researchHomework: [],
      })
    );

    await assessAnswer({
      interviewType: "ukvi",
      question: "How will you fund your studies?",
      answer: "My parents will pay.",
      followUp: { question: "How much do your parents need to show, and for how long?", answer: "I'm not sure of the exact figure." },
    });

    const call = mockedInvokeLLM.mock.calls[0][0];
    const userMessage = call.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toContain("How will you fund your studies?");
    expect(userMessage).toContain("My parents will pay.");
    expect(userMessage).toContain("How much do your parents need to show, and for how long?");
    expect(userMessage).toContain("I'm not sure of the exact figure.");
  });
});

describe("scoring and the 85% threshold", () => {
  it("averages per-question scores and passes at exactly 85", async () => {
    const { summariseSession } = await import("./interviewCoach");
    const summary = summariseSession([80, 90]);
    expect(summary.averageScore).toBe(85);
    expect(summary.passed).toBe(true);
    expect(summary.readyForMockInterview).toBe(true);
  });

  it("fails just below the threshold at 84", async () => {
    const { summariseSession } = await import("./interviewCoach");
    const summary = summariseSession([80, 88]);
    expect(summary.averageScore).toBe(84);
    expect(summary.passed).toBe(false);
    expect(summary.readyForMockInterview).toBe(false);
  });

  it("returns a safe zero result for an empty score list rather than dividing by zero", async () => {
    const { summariseSession } = await import("./interviewCoach");
    const summary = summariseSession([]);
    expect(summary.averageScore).toBe(0);
    expect(summary.passed).toBe(false);
  });

  it("returns strengths, weaknesses, missing information, and homework alongside the score for a substantive answer", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        needsFollowUp: false,
        followUpQuestion: "",
        score: 92,
        strengths: ["Specific and credible"],
        weaknesses: ["Slightly rehearsed tone"],
        missingInformation: ["Did not mention post-study plans"],
        researchHomework: ["Research the Graduate visa route"],
      })
    );

    const result = await assessAnswer({
      interviewType: "university",
      question: "Why do you want to study here?",
      answer: "A detailed, specific, genuine answer about the course and city.",
    });

    expect(result).toMatchObject({
      score: 92,
      strengths: ["Specific and credible"],
      weaknesses: ["Slightly rehearsed tone"],
      missingInformation: ["Did not mention post-study plans"],
      researchHomework: ["Research the Graduate visa route"],
    });
  });
});
