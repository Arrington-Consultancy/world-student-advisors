/**
 * Quality check and humanisation tests.
 * Clauses 10 and 11 of the WSA AI Operational Standard v1.0, plus the
 * binding universal no-em-dash rule and WSA Core Operating System §4.5
 * and §6 on guaranteed outcomes.
 */
import { describe, it, expect } from "vitest";
import { runQualityCheck, acceptHumanisation, findSubstanceChanges, type QualityCheckInput } from "./qualityCheck";

function input(overrides: Partial<QualityCheckInput> = {}): QualityCheckInput {
  return {
    text: "The application looks complete. Priya has confirmed the visa evidence is in order.",
    permissionChecked: true,
    hasUnresolvedDisagreement: false,
    disagreementVisibleInText: false,
    workerBoundaryBreaches: [],
    evidenceInsufficient: false,
    ...overrides,
  };
}

const codes = (r: { findings: readonly { code: string }[] }) => r.findings.map(f => f.code);

describe("§10 the quality check blocks unsafe output", () => {
  it("passes clean, permission-checked output", () => {
    const r = runQualityCheck(input());
    expect(r.passed).toBe(true);
    expect(r.blocking).toEqual([]);
  });

  it("blocks when no permission decision was recorded", () => {
    const r = runQualityCheck(input({ permissionChecked: false }));
    expect(r.passed).toBe(false);
    expect(codes(r)).toContain("permission_not_checked");
  });

  it("blocks a worker-boundary breach", () => {
    const r = runQualityCheck(input({ workerBoundaryBreaches: ["Priya contributed in admissions."] }));
    expect(r.passed).toBe(false);
    expect(codes(r)).toContain("worker_boundary_breach");
  });

  it("blocks when every specialist had insufficient evidence", () => {
    const r = runQualityCheck(input({ evidenceInsufficient: true }));
    expect(r.passed).toBe(false);
    expect(codes(r)).toContain("evidence_insufficient");
  });

  it("blocks a hidden unresolved disagreement", () => {
    const r = runQualityCheck(input({ hasUnresolvedDisagreement: true, disagreementVisibleInText: false }));
    expect(r.passed).toBe(false);
    expect(codes(r)).toContain("unresolved_disagreement_hidden");
  });

  it("allows an unresolved disagreement that the text actually states", () => {
    const r = runQualityCheck(input({ hasUnresolvedDisagreement: true, disagreementVisibleInText: true }));
    expect(r.passed).toBe(true);
  });
});

describe("student protection: no guaranteed outcomes", () => {
  const guarantees = [
    "We guarantee your visa will be approved.",
    "Our students have a 100% approval rate.",
    "You will definitely be accepted onto the course.",
    "You are certain to be approved for this place.",
    "This is assured admission to the university.",
  ];

  for (const text of guarantees) {
    it(`blocks: ${text}`, () => {
      const r = runQualityCheck(input({ text }));
      expect(r.passed).toBe(false);
      expect(codes(r)).toContain("guarantee_language");
    });
  }

  it("allows an honest statement of limits", () => {
    const r = runQualityCheck(input({ text: "We cannot promise a visa outcome. The decision rests with UKVI." }));
    expect(r.passed).toBe(true);
  });
});

describe("§11 writing standard", () => {
  it("blocks an em dash, which is prohibited universally", () => {
    const r = runQualityCheck(input({ text: "The application is complete — the visa evidence is in order." }));
    expect(r.passed).toBe(false);
    expect(codes(r)).toContain("em_dash");
  });

  it("flags a double hyphen used as prose punctuation", () => {
    const r = runQualityCheck(input({ text: "The file is ready--we can proceed." }));
    expect(codes(r)).toContain("double_hyphen");
    expect(r.passed).toBe(true);
  });

  it("flags corporate AI phrasing", () => {
    const r = runQualityCheck(input({ text: "We can leverage this to deliver a seamless experience." }));
    expect(codes(r)).toContain("corporate_ai_language");
  });

  it("flags artificial warmth", () => {
    const r = runQualityCheck(input({ text: "Great question. Rest assured, I'm happy to help." }));
    expect(codes(r)).toContain("artificial_warmth");
  });

  it("flags a formulaic contrast construction", () => {
    const r = runQualityCheck(input({ text: "It's not about the deadline, it's about the evidence." }));
    expect(codes(r)).toContain("formulaic_contrast");
  });

  it("flags bullet spam", () => {
    const r = runQualityCheck(input({ text: "Summary:\n- one\n- two\n- three\n- four\n- five" }));
    expect(codes(r)).toContain("bullet_spam");
  });

  it("flags a run of one-sentence paragraphs", () => {
    const r = runQualityCheck(input({ text: "First point.\n\nSecond point.\n\nThird point.\n\nFourth point." }));
    expect(codes(r)).toContain("one_sentence_paragraph_run");
  });

  it("flags a closing summary that repeats what was just said", () => {
    const r = runQualityCheck(input({ text: "A thing happened here.\n\nAnother thing followed it.\n\nIn summary, things happened." }));
    expect(codes(r)).toContain("repeated_summary");
  });

  it("treats style problems as advisory, not blocking", () => {
    const r = runQualityCheck(input({ text: "We can leverage this seamlessly." }));
    expect(r.passed).toBe(true);
    expect(r.findings.every(f => f.severity === "advisory")).toBe(true);
  });
});

describe("§10 humanisation may improve presentation but never substance", () => {
  it("accepts a pure rewording", () => {
    const before = "The application is complete. The deadline is 14 September 2026.";
    const after = "The application's complete, and the deadline is 14 September 2026.";
    const r = acceptHumanisation(before, after);
    expect(r.accepted).toBe(true);
    expect(r.text).toBe(after);
  });

  it("rejects a changed number and keeps the checked text", () => {
    const before = "You need 3 references.";
    const after = "You need 5 references.";
    const r = acceptHumanisation(before, after);
    expect(r.accepted).toBe(false);
    expect(r.text).toBe(before);
    expect(r.substanceChanges.map(c => c.kind)).toContain("number");
  });

  it("rejects a changed date", () => {
    const r = acceptHumanisation("The deadline is 14 September 2026.", "The deadline is 21 September 2026.");
    expect(r.accepted).toBe(false);
    expect(r.substanceChanges.map(c => c.kind)).toContain("date");
  });

  it("rejects a changed fee", () => {
    const r = acceptHumanisation("The fee is £14,500.", "The fee is £15,400.");
    expect(r.accepted).toBe(false);
    expect(r.substanceChanges.map(c => c.kind)).toContain("money");
  });

  it("rejects a dropped negation", () => {
    const r = acceptHumanisation("We cannot promise a visa outcome.", "We can support your visa application.");
    expect(r.accepted).toBe(false);
    expect(r.substanceChanges.map(c => c.kind)).toContain("negation");
  });

  it("rejects a removed safeguarding caveat", () => {
    const before = "This is subject to the safeguarding review.";
    const after = "This is ready to proceed.";
    const r = acceptHumanisation(before, after);
    expect(r.accepted).toBe(false);
    expect(r.substanceChanges.some(c => c.kind === "caveat")).toBe(true);
  });

  it("allows a caveat to be added", () => {
    const before = "The place is available.";
    const after = "The place is available, subject to confirmation.";
    const r = acceptHumanisation(before, after);
    expect(r.accepted).toBe(true);
  });

  it("rejects a changed institution name", () => {
    const r = acceptHumanisation("Offer from the University of Portsmouth.", "Offer from the University of Plymouth.");
    expect(r.accepted).toBe(false);
    expect(r.substanceChanges.map(c => c.kind)).toContain("institution");
  });

  it("rejects a humanisation pass that introduces an em dash", () => {
    const r = acceptHumanisation("The file is ready and complete.", "The file is ready and complete — nothing outstanding.");
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/em dash/);
    expect(r.text).not.toMatch(/—/);
  });

  it("reports every substance change it found, not just the first", () => {
    const changes = findSubstanceChanges("3 places at £100 by 1 January 2026.", "5 places at £200 by 2 February 2026.");
    expect(changes.length).toBeGreaterThanOrEqual(3);
  });

  it("never returns a half-edited blend on rejection", () => {
    const before = "You need 3 references.";
    const r = acceptHumanisation(before, "You need 5 references, and we guarantee approval.");
    expect(r.text).toBe(before);
  });
});
