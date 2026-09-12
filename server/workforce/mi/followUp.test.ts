import { describe, it, expect } from "vitest";
import { parseInformationQuestion, parseFollowUpQuestion, detectUnmodelled } from "./question";
import { questionForTurn, applyUnmodelled, MI_HUMAN_OWNER } from "./resolve";

/**
 * Continuing a question, and refusing to answer a narrower one than was
 * asked.
 *
 * Tom Arrington asked "how many cold leads are self funded since the site
 * has been redone" on 12 September 2026. He was given a count of website
 * leads: true, and not his question. "Cold" was dropped because the phrase
 * list only matched "went cold", and "self funded" was dropped because
 * nothing models it. Both are covered here.
 */

const NOW = new Date("2026-09-12T08:00:00.000Z");
const base = (text: string) => {
  const q = parseInformationQuestion(text, NOW);
  if (!q) throw new Error(`not read as a question: ${text}`);
  return q;
};

describe("the question that started this", () => {
  it("reads cold as a filter, not as decoration", () => {
    expect(base("how many cold leads have we had").status).toBe("cold");
    expect(base("how many cold enquiries came from the website").status).toBe("cold");
    // The original phrasing still works.
    expect(base("how many leads went cold last quarter").status).toBe("cold");
  });

  it("does not read a plain count as cold", () => {
    expect(base("how many leads have we had from the website").status).toBeNull();
  });

  it("carries self funded as a filter it cannot apply rather than dropping it", () => {
    const q = base("how many cold leads are self funded since the site has been redone");
    expect(q.unmodelled).toEqual(["how the student is funded"]);
    expect(q.status).toBe("cold");
    expect(q.channel).toBe("website");
  });

  it("recognises the ways staff write funding", () => {
    for (const text of ["self funded", "self-funded", "selffunded", "privately funded", "sponsored", "scholarship", "bursary", "student loan", "student finance"]) {
      expect(detectUnmodelled(`how many leads are ${text}`)).toHaveLength(1);
    }
  });

  it("does not invent a filter that is not there", () => {
    expect(detectUnmodelled("how many leads came from the website last quarter")).toEqual([]);
  });
});

describe("an answer that could not apply every filter is not presented as a plain answer", () => {
  const answered = {
    outcome: "answered" as const,
    gapType: "none" as const,
    answer: "We had 64 website leads.",
    coverage: null,
    sourcesChecked: ["the WSA reporting mirror"],
    evidenceAttempted: true,
    humanOwner: null,
  };

  it("downgrades to partial, names the filter, and records a reporting gap", () => {
    const out = applyUnmodelled(answered, base("how many cold leads are self funded"));
    expect(out.outcome).toBe("partial");
    expect(out.gapType).toBe("reporting_gap");
    expect(out.humanOwner).toBe(MI_HUMAN_OWNER);
    expect(out.answer).toContain("We had 64 website leads.");
    expect(out.answer).toContain("how the student is funded");
    expect(out.answer).toContain("could not answer");
  });

  it("leaves an answer alone when every filter was applied", () => {
    expect(applyUnmodelled(answered, base("how many leads came from the website"))).toEqual(answered);
  });

  it("does not dress up a denial as a partial answer", () => {
    const denied = { ...answered, outcome: "permission_denied" as const, answer: "Sign in first." };
    expect(applyUnmodelled(denied, base("how many cold leads are self funded"))).toEqual(denied);
  });
});

describe("a follow-up changes what it names and nothing else", () => {
  const first = base("how many cold leads came from the website last quarter");

  const follow = (text: string, previous = first) => {
    const r = parseFollowUpQuestion(text, previous, NOW);
    if (r.kind !== "question") throw new Error(`not read as a follow-up: ${text} (${r.reason})`);
    return r.question;
  };

  it("keeps the period when the follow-up does not name one", () => {
    const q = follow("and from Nigeria?");
    expect(q.country).toBe("Nigeria");
    expect(q.period.label).toBe("last quarter");
    expect(q.period.from.getTime()).toBe(first.period.from.getTime());
    expect(q.subject).toBe("leads");
    expect(q.status).toBe("cold");
    expect(q.channel).toBe("website");
  });

  it("changes the period when the follow-up names one, and keeps everything else", () => {
    const q = follow("what about the last 6 months?");
    expect(q.period.label).toBe("the last 6 months");
    expect(q.channel).toBe("website");
    expect(q.status).toBe("cold");
  });

  it("lets a person widen a filter they just set", () => {
    expect(follow("and overall?").channel).toBeNull();
    expect(follow("across all countries?", follow("and from Nigeria?")).country).toBeNull();
    // Widening one dimension does not widen the others.
    expect(follow("and overall?").status).toBe("cold");
    expect(follow("and overall?").period.label).toBe("last quarter");
  });

  it("changes the measure when asked, and rebuilds what depends on it", () => {
    const q = follow("which source produced the most?");
    expect(q.measure).toBe("ranking");
    expect(q.groupBy).toBe("channel");
    expect(q.period.label).toBe("last quarter");
  });

  it("refuses a sentence that changes nothing rather than re-answering", () => {
    for (const text of ["thanks", "ok", "hmm"]) {
      expect(parseFollowUpQuestion(text, first, NOW)).toMatchObject({ kind: "not_a_follow_up" });
    }
  });

  it("refuses a follow-up that asks for work to be produced", () => {
    expect(parseFollowUpQuestion("now export those to a spreadsheet", first, NOW)).toMatchObject({
      kind: "not_a_follow_up",
      reason: expect.stringContaining("produced"),
    });
  });

  it("carries an unanswerable filter introduced by a follow-up", () => {
    expect(follow("and how many of those were self funded?").unmodelled).toEqual(["how the student is funded"]);
  });

  it("does not lose an unanswerable filter from an earlier turn", () => {
    const withFunding = base("how many cold leads are self funded");
    expect(follow("and from Nigeria?", withFunding).unmodelled).toEqual(["how the student is funded"]);
  });
});

describe("the thread is rebuilt from text, server-side, every turn", () => {
  it("narrows across three turns", () => {
    const q = questionForTurn("and from Nigeria?", [
      "how many cold leads have we had",
      "just the website ones",
    ], NOW);
    expect(q).not.toBeNull();
    expect(q!.status).toBe("cold");
    expect(q!.channel).toBe("website");
    expect(q!.country).toBe("Nigeria");
  });

  it("keeps the period set two turns ago", () => {
    const q = questionForTurn("and from Kenya?", [
      "how many leads did we get in the last 3 months",
      "just the referred ones",
    ], NOW);
    expect(q!.period.label).toBe("the last 3 months");
    expect(q!.channel).toBe("referral");
    expect(q!.country).toBe("Kenya");
  });

  it("a follow-up that names a new subject starts from that subject", () => {
    const q = questionForTurn("how many applications did we have this year", ["how many leads last quarter"], NOW);
    expect(q!.subject).toBe("applications");
    expect(q!.period.label).toBe("2026 so far");
  });

  it("is null when nothing in the thread is a figure question", () => {
    expect(questionForTurn("and from Nigeria?", ["write me a blog post"], NOW)).toBeNull();
  });

  it("skips a turn it cannot read rather than resetting the thread", () => {
    const q = questionForTurn("and from Ghana?", ["how many cold leads last quarter", "thanks"], NOW);
    expect(q!.status).toBe("cold");
    expect(q!.period.label).toBe("last quarter");
    expect(q!.country).toBe("Ghana");
  });

  it("with no prior turns behaves exactly as a single question always did", () => {
    const threaded = questionForTurn("how many leads came from the website last quarter", [], NOW);
    expect(threaded).toEqual(base("how many leads came from the website last quarter"));
  });
});
