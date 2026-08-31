/**
 * Quality check and humanisation tests.
 * Clauses 10 and 11 of the WSA AI Operational Standard v1.0, plus the
 * binding universal no-em-dash rule and WSA Core Operating System §4.5
 * and §6 on guaranteed outcomes.
 */
import { describe, it, expect } from "vitest";
import { runQualityCheck, acceptHumanisation, findSubstanceChanges, type QualityCheckInput, FINDING_GUIDANCE } from "./qualityCheck";

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

describe("guarantee detection reads negation", () => {
  const check = (text: string) =>
    runQualityCheck({
      text,
      permissionChecked: true,
      hasUnresolvedDisagreement: false,
      disagreementVisibleInText: false,
      workerBoundaryBreaches: [],
      evidenceInsufficient: false,
    }).findings.filter(f => f.code === "guarantee_language");

  it("still blocks an actual guarantee", () => {
    expect(check("We guarantee your visa will be approved.")).toHaveLength(1);
    expect(check("Guaranteed progression to a top university.")).toHaveLength(1);
  });

  it("does not block a disclaimer that denies a guarantee", () => {
    // The sentence the Core Operating System wants written. Blocking it
    // would push a writer to delete their own disclaimer to pass the gate.
    expect(check("WSA does not guarantee admission to any institution.")).toEqual([]);
    expect(check("We make no guarantee as to the accuracy of this page.")).toEqual([]);
    expect(check("They cannot guarantee an outcome.")).toEqual([]);
    expect(check("Scholarships should not be treated as guaranteed.")).toEqual([]);
    expect(check("These tools don't guarantee any outcome.")).toEqual([]);
  });

  it("does not block naming the rule itself", () => {
    expect(check("It looks for guarantee language and corporate filler.")).toEqual([]);
  });

  it("still blocks a guarantee that appears after an unrelated negative", () => {
    // A negation earlier in a different sentence must not launder a later
    // claim, or one "not" at the top of a page would disable the control.
    expect(check("This is not a brochure. We guarantee you a place.")).toHaveLength(1);
  });
});

describe("double hyphen means prose punctuation", () => {
  const check = (text: string) =>
    runQualityCheck({
      text,
      permissionChecked: true,
      hasUnresolvedDisagreement: false,
      disagreementVisibleInText: false,
      workerBoundaryBreaches: [],
      evidenceInsufficient: false,
    }).findings.filter(f => f.code === "double_hyphen");

  it("flags a double hyphen used as a dash", () => {
    expect(check("The answer--and this matters--was wrong.")).toHaveLength(1);
    expect(check("The answer -- and this matters -- was wrong.")).toHaveLength(1);
  });

  it("ignores CSS custom properties and command flags", () => {
    // Training people to dismiss the finding is worse than not having it.
    expect(check('className="w-(--sidebar-width) bg-(--color-bg)"')).toEqual([]);
    expect(check('style={{ "--normal-bg": "var(--popover)" }}')).toEqual([]);
    expect(check("Run npm test --coverage to check.")).toEqual([]);
  });
});

/**
 * A finding that says only what is wrong makes the reader guess at the
 * fix. These assert the useful half stays attached.
 */
describe("every finding carries its rule, its remedy and the offending text", () => {
  const check = (text: string) =>
    runQualityCheck({
      text,
      permissionChecked: true,
      hasUnresolvedDisagreement: false,
      disagreementVisibleInText: false,
      workerBoundaryBreaches: [],
      evidenceInsufficient: false,
    });

  it("names a controlled rule and a remedy on every finding", () => {
    const result = check(
      "Our bespoke solutions unlock seamless growth — it is not just a service, it is a journey.",
    );
    expect(result.findings.length).toBeGreaterThan(0);
    for (const f of result.findings) {
      expect(f.rule.length, `${f.code} has no rule`).toBeGreaterThan(10);
      expect(f.remedy.length, `${f.code} has no remedy`).toBeGreaterThan(10);
    }
  });

  it("quotes the offending text for an em dash rather than just naming it", () => {
    const result = check("Growth — the real kind — takes time.");
    const emDash = result.findings.find(f => f.code === "em_dash")!;
    expect(emDash.excerpt).toContain("Growth");
    expect(emDash.remedy).toMatch(/comma|full stop|brackets/i);
    expect(emDash.rule).toMatch(/Global Writing Standard/);
  });

  it("quotes the offending phrase for corporate filler", () => {
    const result = check("We will leverage our network to deliver value.");
    const filler = result.findings.find(f => f.code === "corporate_ai_language")!;
    expect(filler.excerpt).toContain("leverage");
  });

  it("gives no excerpt where the finding is about the whole piece", () => {
    const result = check("- one\n- two\n- three\n- four\n- five");
    const spam = result.findings.find(f => f.code === "bullet_spam");
    expect(spam?.excerpt).toBeNull();
  });

  /**
   * GUARANTEE_WORD is a duck-typed matcher carrying only .test, because
   * deciding whether a guarantee is negated needs more than a pattern.
   * Asking it for a location used to throw.
   */
  it("survives a matcher that is not a real regular expression", () => {
    const result = check("We guarantee your visa will be approved.");
    const guarantee = result.findings.find(f => f.code === "guarantee_language")!;
    expect(guarantee.severity).toBe("blocking");
    expect(guarantee.excerpt).toBeNull();
    expect(guarantee.remedy).toMatch(/Remove the promise/);
  });

  it("every finding code has guidance, so none can ship without a remedy", () => {
    for (const [code, guidance] of Object.entries(FINDING_GUIDANCE)) {
      expect(guidance.rule.length, `${code} rule`).toBeGreaterThan(10);
      expect(guidance.remedy.length, `${code} remedy`).toBeGreaterThan(10);
    }
  });
});
