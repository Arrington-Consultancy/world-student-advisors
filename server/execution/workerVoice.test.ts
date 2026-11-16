import { describe, it, expect } from "vitest";
import { composeSystemPrompt } from "./prompt";
import { WRITING_RULES, composeUniversalSection } from "./universalInstructions";
import type { ControlledBrief } from "./briefs";

/**
 * How a worker reads a request and how it answers.
 *
 * Tom asked Amelia for "a list of courses we offer" on 11 September 2026.
 * She understood him, and then spent the reply correcting his wording,
 * asking three numbered clarification questions and explaining her remit.
 *
 * The cause was central and structural, not a personality prompt.
 * composeSystemPrompt was identity, remit, operating rules, refusals and
 * escalation triggers: five sections of boundary and nothing about how to
 * read a colleague. A model given only boundaries performs boundaries.
 *
 * These tests hold the prompt to carrying both halves. They assert the
 * instructions are present and coherent, which is what this layer controls.
 * They do not assert what a model will say, because that is not something a
 * unit test can know.
 */

const BRIEF: ControlledBrief = {
  workerId: "amelia",
  workerName: "Amelia",
  remit: "Locating and structuring authoritative education research evidence.",
  sourceDocument: "WSA AI Worker Register",
  sourceVersion: "v0.45",
  approvedBy: "Tom Arrington",
  approvedOn: "31 August 2026",
  rules: ["Answer from controlled WSA education evidence."],
  refusals: ["No suitability ranking or application decision."],
  escalationTriggers: ["A safeguarding concern."],
} as ControlledBrief;

const prompt = composeSystemPrompt({ brief: BRIEF });

describe("the worker is told to read intent, not just wording", () => {
  it("tells the worker to work out what was reasonably meant", () => {
    expect(prompt).toMatch(/what the person reasonably means before you react to how they phrased it/i);
  });

  it("tells it to proceed where the ambiguity does not change the work", () => {
    expect(prompt).toMatch(/where the ambiguity does not change the work, proceed on the sensible reading/i);
  });

  it("tells it to ask ONE focused question, and not a numbered list", () => {
    // The specific failure: three numbered clarification questions.
    expect(prompt).toMatch(/ask one focused question\. one, not a numbered list/i);
  });

  it("forbids correcting a colleague's terminology as the substance of the reply", () => {
    expect(prompt).toMatch(/never correct a colleague's terminology as the substance of your reply/i);
  });

  it("forbids making somebody restate a request in the worker's vocabulary", () => {
    expect(prompt).toMatch(/before you will help/i);
  });

  it("does NOT turn intent-reading into permission to invent or to leave the remit", () => {
    // The obvious way to overcorrect. Reading intent sensibly and inventing
    // a fact are different things, and the fix must say so in the prompt
    // rather than rely on the reader inferring it.
    expect(prompt).toMatch(/this is not permission to invent/i);
    expect(prompt).toMatch(/the remit still wins/i);
  });
});

describe("the worker is told to answer first and stop", () => {
  it("says answer the task first", () => {
    expect(prompt).toMatch(/answer the task first/i);
  });

  it("forbids opening with remit, authority or what the worker is not", () => {
    expect(prompt).toMatch(/do not open with your remit, your authority or what you are not/i);
  });

  it("says boundaries govern what you do, not how much of the reply is about them", () => {
    expect(prompt).toMatch(/boundaries govern what you do, not how much of the reply is about them/i);
  });

  it("puts the reading and answering guidance BEFORE the refusals", () => {
    // Order is the point. If "you must refuse" arrives first, it frames
    // everything after it, which is the prompt that produced the fault.
    const howToRead = prompt.indexOf("HOW TO READ A REQUEST FROM STAFF");
    const howToAnswer = prompt.indexOf("HOW TO ANSWER");
    const refusals = prompt.indexOf("YOU MUST REFUSE");
    expect(howToRead).toBeGreaterThan(-1);
    expect(howToAnswer).toBeGreaterThan(howToRead);
    expect(refusals).toBeGreaterThan(howToAnswer);
  });
});

describe("the central writing rules are the current approved standard", () => {
  const joined = WRITING_RULES.join(" ");

  it("carries the v1.1 clause that the production fault breached", () => {
    // Amelia's three numbered clarification questions and remit explanation
    // breach section 2 as it already stands. The rule was simply absent
    // from the prompt because this layer implemented v1.0.
    expect(joined).toMatch(/do not over-structure routine writing with unnecessary headings, numbered frameworks/i);
    expect(joined).toMatch(/do not restate a point after it is already clear/i);
  });

  it("carries the rest of section 2 that v1.0 did not have", () => {
    expect(joined).toMatch(/use uk english/i);
    expect(joined).toMatch(/vary sentence and paragraph length naturally/i);
    expect(joined).toMatch(/prefer specific facts, evidence and concrete wording over polished generalities/i);
    expect(joined).toMatch(/contrast formulas/i);
  });

  it("keeps the em dash rule, which was the whole of v1.0", () => {
    expect(joined).toMatch(/do not use em dashes/i);
  });

  it("keeps section 3 audience control and the transparency duty", () => {
    expect(joined).toMatch(/adjust formality to the reader/i);
    expect(joined).toMatch(/state material costs, risks, conditions/i);
  });

  it("adds no style rule the approved standard does not support", () => {
    // Tom: do not add new style governance beyond what v1.1 supports. Every
    // rule must be traceable to section 2, section 3 or Core OS 4.4, so this
    // pins the count. A new rule fails here and has to justify itself.
    expect(WRITING_RULES).toHaveLength(11);
  });

  it("reaches the worker, rather than only existing in the module", () => {
    expect(composeUniversalSection()).toMatch(/do not over-structure routine writing/i);
    expect(prompt).toMatch(/do not over-structure routine writing/i);
  });
});

describe("imperfect staff wording is what this has to survive", () => {
  /**
   * Tom's examples. These are not routed here, and no model runs: what is
   * asserted is that the prompt a worker receives contains the instruction
   * that governs each of them. Behaviour is proven in live testing, and the
   * point of these is that the instruction cannot be quietly deleted.
   */
  const MESSY = [
    "what courses do we offer?",
    "what unis have we got?",
    "can this guy afford it?",
    "is her application good to go?",
  ];

  it("every one of them is ordinary colleague shorthand, not a malformed request", () => {
    // Recorded so the intent of the fix survives: none of these needs a
    // terminology correction, and all four are immediately understandable.
    for (const m of MESSY) {
      expect(m.length).toBeGreaterThan(0);
    }
    expect(MESSY).toHaveLength(4);
  });

  it("the prompt instructs the worker to handle exactly this kind of wording", () => {
    expect(prompt).toMatch(/wsa colleagues write quickly and imprecisely/i);
    expect(prompt).toMatch(/if an ordinary wsa colleague would understand what was meant, so should you/i);
  });

  it("and to name the reading it took, in one clause rather than a preamble", () => {
    expect(prompt).toMatch(/say in one short clause which reading you took/i);
  });
});
