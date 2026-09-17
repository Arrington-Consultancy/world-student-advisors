import { describe, expect, it } from "vitest";
import { fuzzySearchTerms, jaroWinkler, longForms, nameMatchScore, normaliseNamePart, partSimilarity, rankNameMatches, sameNameForm, spellingVariants } from "./nameMatch";

/**
 * Tom Arrington, 17 September 2026: "we should be looking for Tom's when
 * it's Thomas, or Tomas Carl when it's Karl; workers need to think rather
 * than just spit things out." A near match is proposed and questioned; it
 * is never silently treated as the student.
 */
describe("name forms and spellings", () => {
  it("knows short and long forms of the same name", () => {
    expect(sameNameForm("Tom", "Thomas")).toBe(true);
    expect(sameNameForm("Karl", "Carl")).toBe(true);
    expect(sameNameForm("Emeka", "Chukwuemeka")).toBe(true);
    expect(sameNameForm("Tom", "Timothy")).toBe(false);
    expect(longForms("Tom")).toContain("thomas");
  });
  it("compares sound-alike spellings alike", () => {
    expect(normaliseNamePart("Kitakhang")).toBe(normaliseNamePart("Kitakang"));
    expect(normaliseNamePart("Philip")).toBe(normaliseNamePart("Filip"));
    expect(normaliseNamePart("Carl")).toBe(normaliseNamePart("Karl"));
    expect(partSimilarity("Kitakhang", "Kitakang")).toBeGreaterThan(0.95);
    expect(partSimilarity("Onuh", "Onwuh")).toBeGreaterThan(0.85);
    expect(partSimilarity("Onuh", "Okoro")).toBeLessThan(0.7);
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 2);
  });
  it("offers the commonest alternative spellings and the discovery stems", () => {
    expect(spellingVariants("Karl")).toContain("Carl");
    expect(spellingVariants("Kitakhang")).toContain("Kitakang");
    const terms = fuzzySearchTerms("Tom Kitakhang");
    expect(terms[0]).toBe("Kitak");
    expect(terms).toContain("Thomas");
    expect(terms.length).toBeLessThanOrEqual(6);
  });
});

describe("scoring and ranking", () => {
  it("a recorded middle name costs nothing, and the surname weighs most", () => {
    expect(nameMatchScore("Joyce Kitakang", "Joyce Iya Kitakang")).toEqual({ score: 1, exact: true });
    expect(nameMatchScore("Joyce Kitakhang", "Joyce Iya Kitakang").score).toBeGreaterThan(0.95);
    expect(nameMatchScore("Tom Karl", "Thomas Carl").exact).toBe(true);
    expect(nameMatchScore("Joyce Okoro", "Joyce Iya Kitakang").score).toBeLessThan(0.76);
    // Trailing words that are not the name cost nothing when the record's own first and last names are present.
    expect(nameMatchScore("Joyce Kitakang Federal Ministry", "Joyce Iya Kitakang").exact).toBe(true);
    expect(nameMatchScore("Joyce Adeyemi Federal Ministry", "Joyce Iya Kitakang").score).toBeLessThan(0.76);
  });
  it("one clear near match is probable; two close ones are several; nothing alike is none", () => {
    const people = [{ personId: 1, name: "Joyce Iya Kitakang" }, { personId: 2, name: "Grace Okoro" }, { personId: 3, name: "Joy Adeyemi" }];
    const r = rankNameMatches("Joyce Kitakhang", people);
    expect(r.kind).toBe("probable");
    if (r.kind === "probable") expect(r.match.candidate.personId).toBe(1);
    const two = rankNameMatches("Chidi Okafor", [{ personId: 4, name: "Chidi Okafor" }, { personId: 5, name: "Chidi Okafor" }]);
    expect(two.kind).toBe("several");
    expect(rankNameMatches("Vivian Onuh", [{ personId: 6, name: "Peter Agada" }]).kind).toBe("none");
    const exact = rankNameMatches("Tom Karl", [{ personId: 7, name: "Thomas Carl" }, { personId: 8, name: "Tom Kane" }]);
    expect(exact.kind).toBe("exact");
  });
});
