import { describe, expect, it } from "vitest";
import { normaliseMechanicalStyle, stripMarkdown } from "./styleNormalise";
import { runQualityCheck, findSubstanceChanges } from "./qualityCheck";

const DASH = "\u2014";
const quality = (text: string) => runQualityCheck({ text, permissionChecked: true, hasUnresolvedDisagreement: false, disagreementVisibleInText: false, workerBoundaryBreaches: [], evidenceInsufficient: false });

describe("normaliseMechanicalStyle", () => {
  it("leaves text without a dash exactly as it was", () => {
    const r = normaliseMechanicalStyle("Vivian is at CAS / Visa / Pre-Departure. Her counsellor is Glenice.");
    expect(r.replacements).toBe(0);
    expect(r.text).toBe("Vivian is at CAS / Visa / Pre-Departure. Her counsellor is Glenice.");
  });
  it("turns a spaced or tight em dash between words into a comma, and a bracketing pair into two commas", () => {
    expect(normaliseMechanicalStyle(`She holds an unconditional offer ${DASH} MA Education ${DASH} at Lincoln.`).text).toBe("She holds an unconditional offer, MA Education, at Lincoln.");
    expect(normaliseMechanicalStyle(`next step${DASH}the CAS request`).text).toBe("next step, the CAS request");
  });
  it("turns a dash closing a line into a full stop, drops one before closing punctuation, and makes a line-leading dash a hyphen bullet", () => {
    expect(normaliseMechanicalStyle(`Two things remain ${DASH}\nCAS and visa.`).text).toBe("Two things remain.\nCAS and visa.");
    expect(normaliseMechanicalStyle(`(see the record ${DASH})`).text).toBe("(see the record)");
    expect(normaliseMechanicalStyle(`${DASH} CAS\n${DASH} Visa`).text).toBe("- CAS\n- Visa");
  });
  it("handles the HTML entity forms and the double hyphen used as prose punctuation", () => {
    expect(normaliseMechanicalStyle("offer &mdash; conditional").text).toBe("offer, conditional");
    expect(normaliseMechanicalStyle("offer &#8212; conditional &#x2014; yes").text).toBe("offer, conditional, yes");
    expect(normaliseMechanicalStyle("offer--conditional and stage -- CAS").text).toBe("offer, conditional and stage, CAS");
  });
  it("does not touch a command flag or a CSS variable", () => {
    expect(normaliseMechanicalStyle("run with --coverage and set --sidebar-width").replacements).toBe(0);
  });
  it("produces text the release check passes, changes no substance, and says what it did", () => {
    const before = `Her application ${DASH} MSc Nursing at the University of Lincoln, applied 6 May 2026 ${DASH} is at Offers & Conditions with a conditional offer.`;
    const r = normaliseMechanicalStyle(before);
    expect(quality(before).passed).toBe(false);
    expect(quality(r.text).passed).toBe(true);
    expect(findSubstanceChanges(before, r.text)).toEqual([]);
    expect(r.summary).toContain("2 em dashes");
  });
  it("does not rescue a genuine failure: guarantee language still blocks after normalisation", () => {
    const r = normaliseMechanicalStyle(`We guarantee your visa ${DASH} always.`);
    expect(r.text).not.toContain(DASH);
    expect(quality(r.text).passed).toBe(false);
    expect(quality(r.text).blocking.map(f => f.code)).toContain("guarantee_language");
  });
});

describe("stripMarkdown", () => {
  it("leaves plain text exactly as it was", () => {
    const r = stripMarkdown("Vivian is at CAS / Visa / Pre-Departure.\n- CAS request\n- Visa application");
    expect(r.replacements).toBe(0);
    expect(r.text).toBe("Vivian is at CAS / Visa / Pre-Departure.\n- CAS request\n- Visa application");
  });
  it("removes bold, italic, heading and code marks and keeps the words", () => {
    const r = stripMarkdown("## Where she is\n\nVivian is at **CAS / Visa / Pre-Departure**, last updated *10 September 2026*. Field `Course` reads __MSc Data Science__.");
    expect(r.text).toBe("Where she is\n\nVivian is at CAS / Visa / Pre-Departure, last updated 10 September 2026. Field Course reads MSc Data Science.");
    expect(r.replacements).toBe(5);
    expect(r.summary).toContain("5 Markdown markers removed");
    expect(findSubstanceChanges("Vivian is at **CAS**, last updated *10 September 2026*.", stripMarkdown("Vivian is at **CAS**, last updated *10 September 2026*.").text)).toEqual([]);
  });
  it("turns asterisk and plus bullets into hyphen bullets and drops a horizontal rule", () => {
    expect(stripMarkdown("* CAS request\n+ Visa application\n\n---\n\nThen travel.").text).toBe("- CAS request\n- Visa application\n\nThen travel.");
  });
  it("does not read arithmetic or a lone asterisk as emphasis", () => {
    expect(stripMarkdown("5 * 3 * 2 and a footnote*").replacements).toBe(0);
  });
  it("what it produces passes the release check when the words were sound", () => {
    const r = stripMarkdown("**Her counsellor** is Glenice. **Next**: the CAS request.");
    expect(quality(r.text).passed).toBe(true);
    expect(r.text).toBe("Her counsellor is Glenice. Next: the CAS request.");
  });
});
