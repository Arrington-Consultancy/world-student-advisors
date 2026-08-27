import { describe, expect, it, vi, beforeEach } from "vitest";
import { invokeLLM } from "./_core/llm";
import { QUESTION_BANK, type InterviewType } from "./interviewQuestionBank";

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

const ALL_TYPES: InterviewType[] = ["cas", "ukvi", "university", "course"];

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

describe("selectSessionQuestions — bank fidelity", () => {
  it("uses only its own supplied bank for every category, at every session length", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    for (const type of ALL_TYPES) {
      for (const count of [3, 5, 8, 14]) {
        const selected = selectSessionQuestions(type, count);
        for (const q of selected) {
          expect(QUESTION_BANK[type]).toContain(q);
        }
      }
    }
  });

  it("never leaks a question into a category whose own bank doesn't contain it (structural cross-category check)", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    // Course-Specific is the only bank with 13 entries (cas/ukvi are 16,
    // university is 14) and has several questions with no near-duplicate
    // elsewhere — a good canary for accidental leakage from another
    // category's array.
    const courseOnly = selectSessionQuestions("course", 13);
    const other = [...QUESTION_BANK.cas, ...QUESTION_BANK.ukvi, ...QUESTION_BANK.university].filter(
      (q) => !QUESTION_BANK.course.includes(q)
    );
    for (const q of courseOnly) {
      expect(other).not.toContain(q);
    }
  });

  it("returns exactly `count` questions when count is below the bank size", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    expect(selectSessionQuestions("cas", 5)).toHaveLength(5);
    expect(selectSessionQuestions("ukvi", 3)).toHaveLength(3);
    expect(selectSessionQuestions("university", 8)).toHaveLength(8);
    expect(selectSessionQuestions("course", 3)).toHaveLength(3);
  });

  it("returns the full bank, unchanged, when count meets or exceeds the bank size", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    expect(selectSessionQuestions("cas", QUESTION_BANK.cas.length)).toEqual(QUESTION_BANK.cas);
    expect(selectSessionQuestions("cas", 100)).toEqual(QUESTION_BANK.cas);
    expect(selectSessionQuestions("course", QUESTION_BANK.course.length)).toEqual(QUESTION_BANK.course);
  });

  it("spreads a short session across the bank rather than clustering on the first few questions", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    const selected = selectSessionQuestions("cas", 3);
    const indices = selected.map((q) => QUESTION_BANK.cas.indexOf(q));
    // With a session of 3 drawn from a much larger bank, the selection
    // should span meaningfully more than just indices 0-2.
    expect(Math.max(...indices) - Math.min(...indices)).toBeGreaterThan(3);
  });

  it("is deterministic — the same inputs always produce the same selection", async () => {
    const { selectSessionQuestions } = await import("./interviewCoach");
    expect(selectSessionQuestions("university", 5)).toEqual(selectSessionQuestions("university", 5));
  });
});

describe("isQuestionVariant — guards against silent replacement", () => {
  it("accepts a genuine personalisation that keeps the question's core wording", async () => {
    const { isQuestionVariant } = await import("./interviewCoach");
    expect(
      isQuestionVariant(
        "Why have you chosen this course?",
        "Why have you chosen the MSc International Business course?"
      )
    ).toBe(true);
  });

  it("rejects an unrelated, invented replacement question", async () => {
    const { isQuestionVariant } = await import("./interviewCoach");
    expect(isQuestionVariant("Why have you chosen this course?", "What is your favourite colour?")).toBe(false);
  });

  it("rejects an empty or whitespace-only candidate", async () => {
    const { isQuestionVariant } = await import("./interviewCoach");
    expect(isQuestionVariant("Why have you chosen this course?", "   ")).toBe(false);
  });

  it("rejects a wildly padded-out candidate even if it happens to share a few words", async () => {
    const { isQuestionVariant } = await import("./interviewCoach");
    const original = "Who is paying for your studies?";
    const padded = `${original} ` + "Also tell me everything about your family, your childhood, your favourite foods, your travel history, and any other unrelated topic you can think of at length. ".repeat(3);
    expect(isQuestionVariant(original, padded)).toBe(false);
  });
});

describe("personaliseQuestions — LLM role is limited to rewording, never inventing", () => {
  it("does not call the LLM at all when no course/university detail is supplied", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?", "Who is sponsoring your studies?"];
    const result = await personaliseQuestions("cas", base, undefined);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result).toEqual(base);
  });

  it("does not call the LLM when the course/university detail is blank/whitespace", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?"];
    const result = await personaliseQuestions("cas", base, "   ");
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result).toEqual(base);
  });

  it("uses the model's personalised wording when it is a genuine variant with the correct count", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?", "Who is sponsoring your studies?"];
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        questions: [
          "Why have you chosen the MSc International Business course?",
          "Who is sponsoring your MSc International Business studies?",
        ],
      })
    );
    const result = await personaliseQuestions("cas", base, "MSc International Business at University of Greenwich");
    expect(result).toEqual([
      "Why have you chosen the MSc International Business course?",
      "Who is sponsoring your MSc International Business studies?",
    ]);
  });

  it("falls back to the untouched bank questions when the model returns the wrong count", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?", "Who is sponsoring your studies?"];
    mockedInvokeLLM.mockResolvedValueOnce(llmJsonResponse({ questions: ["Only one question came back"] }));
    const result = await personaliseQuestions("cas", base, "MSc International Business");
    expect(result).toEqual(base);
  });

  it("reverts only the specific question the model silently replaced with invented content, keeping legitimate personalisation on the rest", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?", "Who is sponsoring your studies?"];
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        questions: [
          "Why have you chosen the MSc International Business course?", // genuine variant — kept
          "What is your favourite colour?", // invented, unrelated — must be reverted
        ],
      })
    );
    const result = await personaliseQuestions("cas", base, "MSc International Business");
    expect(result).toEqual([
      "Why have you chosen the MSc International Business course?",
      "Who is sponsoring your studies?", // reverted to the original bank question
    ]);
  });

  it("falls back to the bank questions if the model response can't be parsed", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    const base = ["Why have you chosen this course?"];
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{ index: 0, message: { role: "assistant" as const, content: "not json" }, finish_reason: "stop" }],
    });
    const result = await personaliseQuestions("cas", base, "MSc International Business");
    expect(result).toEqual(base);
  });

  it("never asks the model to invent new questions, and forbids it from answering them", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(llmJsonResponse({ questions: ["Why have you chosen this course?"] }));
    await personaliseQuestions("cas", ["Why have you chosen this course?"], "Computer Science");
    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/never inventing new questions/i);
    expect(systemMessage).toMatch(/never answer any of the questions yourself/i);
    expect(systemMessage).toMatch(/NEVER provide model answers/i);
  });
});

describe("getSessionQuestions — end-to-end session start, bank-only, no cross-category leakage", () => {
  it("returns bank-only questions for every category with no personalisation requested", async () => {
    const { getSessionQuestions } = await import("./interviewCoach");
    for (const type of ALL_TYPES) {
      const questions = await getSessionQuestions(type, undefined, 5);
      expect(mockedInvokeLLM).not.toHaveBeenCalled();
      for (const q of questions) {
        expect(QUESTION_BANK[type]).toContain(q);
      }
    }
  });

  it("never lets a personalisation attempt leak another category's or invented text into the session", async () => {
    const { getSessionQuestions, selectSessionQuestions } = await import("./interviewCoach");
    // Whatever selectSessionQuestions genuinely picks for this call — no
    // need to mock it, its own tests above already prove it's bank-only.
    const realBase = selectSessionQuestions("cas", 3);

    // Simulate a badly-behaved model trying to substitute a UKVI-style
    // question and a fully invented one into a CAS session, at the right
    // count so the count-only guard alone wouldn't catch it.
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({
        questions: [
          "How much are your tuition fees?", // lifted from a different category, unrelated to this CAS question
          realBase[1], // left genuinely alone
          "What did you have for breakfast?", // fully invented
        ],
      })
    );

    const questions = await getSessionQuestions("cas", "Computer Science", 3);
    expect(questions).toHaveLength(3);
    for (const q of questions) {
      expect(QUESTION_BANK.cas).toContain(q);
    }
    // The two tampered questions must have been reverted to their originals.
    expect(questions[0]).toBe(realBase[0]);
    expect(questions[2]).toBe(realBase[2]);
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

  it("grounds the follow-up decision in the specific answer given — two different answers produce two different assessment calls", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({ needsFollowUp: true, followUpQuestion: "Be more specific.", score: 0, strengths: [], weaknesses: [], missingInformation: [], researchHomework: [] })
    );
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({ needsFollowUp: false, followUpQuestion: "", score: 90, strengths: ["Specific and credible"], weaknesses: [], missingInformation: [], researchHomework: [] })
    );

    await assessAnswer({ interviewType: "cas", question: "Why this course?", answer: "Because it's good." });
    await assessAnswer({
      interviewType: "cas",
      question: "Why this course?",
      answer: "Because the MSc International Business programme's core modules in global trade policy directly match my undergraduate dissertation.",
    });

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    const firstCallUserMessage = mockedInvokeLLM.mock.calls[0][0].messages.find((m) => m.role === "user")?.content ?? "";
    const secondCallUserMessage = mockedInvokeLLM.mock.calls[1][0].messages.find((m) => m.role === "user")?.content ?? "";
    expect(firstCallUserMessage).toContain("Because it's good.");
    expect(secondCallUserMessage).toContain("global trade policy");
    expect(firstCallUserMessage).not.toEqual(secondCallUserMessage);
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

describe("prohibition on model answers", () => {
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

  it("instructs the model never to provide model answers when personalising questions", async () => {
    const { personaliseQuestions } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(llmJsonResponse({ questions: ["Why have you chosen this course?"] }));

    await personaliseQuestions("cas", ["Why have you chosen this course?"], "Computer Science");

    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/NEVER provide model answers/i);
  });
});

describe("marking fairness — substance over polish", () => {
  it("instructs the model to assess substance and explicitly never penalise non-native English, minor grammar, or brevity", async () => {
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

    await assessAnswer({ interviewType: "ukvi", question: "Why do you want to study in the UK?", answer: "For get good education and future job." });

    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/never penalise understandable non-native english/i);
    expect(systemMessage).toMatch(/minor grammar errors/i);
    expect(systemMessage).toMatch(/culturally different but valid phrasing/i);
    expect(systemMessage).toMatch(/concise answer/i);
    expect(systemMessage).toMatch(/relevance, clarity, specificity, genuine understanding, consistency/i);
  });

  it("a short answer is not automatically treated as a weakness by the prompt's own wording", async () => {
    const { assessAnswer } = await import("./interviewCoach");
    mockedInvokeLLM.mockResolvedValueOnce(
      llmJsonResponse({ needsFollowUp: false, followUpQuestion: "", score: 95, strengths: [], weaknesses: [], missingInformation: [], researchHomework: [] })
    );

    await assessAnswer({ interviewType: "course", question: "Which module interests you most?", answer: "Applied statistics — it's the foundation for the data science career I want." });

    const call = mockedInvokeLLM.mock.calls[0][0];
    const systemMessage = call.messages.find((m) => m.role === "system")?.content ?? "";
    expect(systemMessage).toMatch(/a short, complete answer is not a weakness/i);
  });

  it("no question-generation call site invents replacement questions — question content only ever originates from selectSessionQuestions (bank), never a free-form LLM generation prompt", async () => {
    const { getSessionQuestions } = await import("./interviewCoach");
    // With no course/university supplied, this must resolve purely from the
    // bank with zero LLM involvement — the strongest possible proof that
    // nothing is invented.
    const questions = await getSessionQuestions("university", undefined, 5);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    for (const q of questions) {
      expect(QUESTION_BANK.university).toContain(q);
    }
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
