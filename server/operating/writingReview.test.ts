import { describe, it, expect } from "vitest";
import { reviewWriting, PROVISIONAL_RULES, ASPIRATION_REPEAT_LIMIT } from "./writingReview";
import { runQualityCheck } from "./qualityCheck";

/**
 * The two writing layers.
 *
 * Tom pasted deliberately awful AI marketing copy into the checker on
 * 11 September 2026 and got back exactly one issue, the em dash. These
 * tests are built on that sample, and they hold both halves of the fix:
 * the blocking layer still blocks exactly what it blocked before, and the
 * new review layer catches the rest without ever blocking anything.
 */

/**
 * The sample, close to what Tom pasted. It contains one em dash, which is
 * the only thing in it that breaks a binding rule.
 *
 * This file is a .test.ts, so it is excluded from the repository-wide em
 * dash scan in server/emDash.test.ts. That exclusion is what lets the
 * fixture contain the character it is testing for.
 */
const AWFUL = [
  "Welcome to your journey with us — we are here to help.",
  "",
  "At WSA we believe in unlocking opportunities and empowering your future.",
  "Our holistic, tailored solutions help you navigate the complex landscape of UK study.",
  "By leveraging our expertise, our dedicated team of experts is with you every step of the way.",
  "",
  "We deliver world-class, industry-leading guidance with a proven track record.",
  "Let us help you transform your future and turn your ambitions into reality.",
  "Your journey starts here. Your future is bright. Let's make it happen! 🎓🚀✨🔥💯🎉",
].join("\n");

/** Plain WSA writing: specific, unexcited, no marketing gloss. */
const PLAIN = [
  "Your application to Greenwich is with the admissions team. They usually reply within ten working days.",
  "",
  "We sent your transcript and your English test result on 3 September. If they ask for anything else,",
  "I will email you the same day. You do not need to do anything until then.",
  "",
  "If you want to add a second choice, tell me before the end of the month and I will check the entry",
  "requirements against your grades.",
].join("\n");

function check(text: string) {
  return runQualityCheck({
    text,
    permissionChecked: true,
    hasUnresolvedDisagreement: false,
    disagreementVisibleInText: false,
    workerBoundaryBreaches: [],
    evidenceInsufficient: false,
  });
}

describe("layer 1 still blocks, and is not weakened", () => {
  it("the em dash still blocks the awful sample", () => {
    const result = check(AWFUL);
    const codes = result.blocking.map(f => f.code);
    expect(codes).toContain("em_dash");
    expect(result.passed).toBe(false);
  });

  it("plain WSA copy has nothing blocking", () => {
    const result = check(PLAIN);
    expect(result.blocking).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("the review layer cannot block, because it is a separate function", () => {
    // The structural guarantee. reviewWriting returns warnings and nothing
    // else: it has no severity, no passed flag, and no way to reach the
    // blocking list. A style rule cannot become a release gate by accident.
    const warnings = reviewWriting(AWFUL);
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings) {
      expect(Object.keys(w).sort()).not.toContain("severity");
      expect(Object.keys(w).sort()).not.toContain("blocking");
    }
  });
});

describe("layer 2 catches what the old checker walked past", () => {
  const warnings = reviewWriting(AWFUL);
  const phrases = warnings.map(w => w.phrase.toLowerCase());
  const joined = phrases.join(" | ");

  it("returns many warnings, not one", () => {
    // The whole complaint: one issue came back for a page of this.
    expect(warnings.length).toBeGreaterThanOrEqual(10);
  });

  it("catches the inflections the old exact-phrase list missed", () => {
    // "leverage" was matched with a word boundary, so "leveraging" passed.
    expect(joined).toContain("leveraging");
    // "unlock the power" was matched, "unlocking opportunities" was not.
    expect(joined).toContain("unlocking opportunities");
    // "navigate the complexities" was matched, "navigate the complex landscape" was not.
    expect(joined).toContain("navigate the complex landscape");
  });

  it("catches the generic vocabulary", () => {
    for (const expected of ["holistic", "tailored solutions", "empowering"]) {
      expect(joined).toContain(expected);
    }
  });

  it("catches inflated motivational language", () => {
    for (const expected of ["every step of the way", "make it happen"]) {
      expect(joined).toContain(expected);
    }
    expect(joined).toMatch(/turn your ambitions into reality/);
  });

  it("catches claims with no evidence behind them", () => {
    const categories = warnings.filter(w => w.category === "unevidenced_claim").map(w => w.phrase.toLowerCase());
    expect(categories.join(" | ")).toMatch(/world-class|industry-leading|proven track record|team of experts/);
  });

  it("catches the repeated aspiration words rather than each use", () => {
    const repeats = warnings.filter(w => w.category === "repeated_aspiration");
    expect(repeats.length).toBeGreaterThan(0);
    expect(repeats.some(w => /appear/.test(w.why))).toBe(true);
  });

  it("catches emoji volume", () => {
    const emoji = warnings.filter(w => w.category === "emoji_density");
    expect(emoji).toHaveLength(1);
    expect(emoji[0].phrase).toMatch(/\d+ emoji/);
  });

  it("gives every warning a phrase, a reason and usually a plainer option", () => {
    // Tom asked for three things per warning. The first two are required.
    for (const w of warnings) {
      expect(w.phrase.length).toBeGreaterThan(0);
      expect(w.why.length).toBeGreaterThan(20);
    }
    const withPlainer = warnings.filter(w => w.plainer).length;
    expect(withPlainer / warnings.length).toBeGreaterThan(0.8);
  });

  it("reports each distinct phrase once rather than once per occurrence", () => {
    const keys = warnings.map(w => `${w.category}:${w.phrase.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns warnings in the order they appear in the text", () => {
    const positions = warnings
      .filter(w => w.category !== "emoji_density" && w.category !== "repeated_aspiration")
      .map(w => AWFUL.toLowerCase().indexOf(w.phrase.toLowerCase()));
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });
});

describe("every rule names the authority it comes from", () => {
  const warnings = reviewWriting(AWFUL);

  it("cites an approved clause, or says plainly that it does not have one", () => {
    for (const w of warnings) {
      if (w.authority.approved) {
        expect(w.authority.clause).toContain("Global Writing Standard v1.1");
        expect(w.authority.quote.length).toBeGreaterThan(20);
      } else {
        // An unapproved rule must say what would make it approved, so the
        // gap is actionable rather than just admitted.
        expect(w.authority.needs.length).toBeGreaterThan(20);
      }
    }
  });

  it("keeps the provisional rules to the one the standard genuinely does not cover", () => {
    // Emoji is the gap: the Global Writing Standard v1.1 says nothing about
    // emoji or decoration in any of its six sections. If a second rule ever
    // goes provisional, this fails and somebody has to justify it.
    expect(PROVISIONAL_RULES.map(r => r.category)).toEqual(["emoji_density"]);
  });

  it("marks the emoji warning as unapproved in the warning itself", () => {
    const emoji = reviewWriting("a 🎓 b 🚀 c ✨ d 🔥 e 💯").find(w => w.category === "emoji_density");
    expect(emoji?.authority.approved).toBe(false);
  });
});

describe("plain WSA copy is not over-flagged", () => {
  it("returns no warnings at all for ordinary specific writing", () => {
    // The failure mode of a style checker is crying wolf. If this ever
    // starts flagging normal casework prose, staff will stop reading it.
    expect(reviewWriting(PLAIN)).toEqual([]);
  });

  it("does not flag ordinary uses of a word that only matters in volume", () => {
    expect(reviewWriting("Your future course choice is up to you.")).toEqual([]);
    expect(reviewWriting("There is an opportunity to apply in January.")).toEqual([]);
  });

  it("flags an aspiration word only once it is a tic", () => {
    const twice = "Think about your future. The future intake opens in May.";
    expect(reviewWriting(twice).filter(w => w.category === "repeated_aspiration")).toEqual([]);

    const thrice = "Your future matters. The future intake opens in May. Plan your future now.";
    const flagged = reviewWriting(thrice).filter(w => w.category === "repeated_aspiration");
    expect(flagged).toHaveLength(1);
    expect(ASPIRATION_REPEAT_LIMIT).toBe(3);
  });

  it("tolerates a couple of emoji", () => {
    expect(reviewWriting("Congratulations on your offer 🎉").filter(w => w.category === "emoji_density"))
      .toEqual([]);
  });

  it("does not flag a legitimate use of the word solution or approach on its own", () => {
    expect(reviewWriting("We agreed an approach with the admissions team.")).toEqual([]);
  });
});

describe("the two layers are reported separately", () => {
  it("style warnings alone never make the piece fail", () => {
    // Take the awful copy and remove only the em dash. Everything wrong
    // with it is then style, and style must not block.
    const styleOnly = AWFUL.replace(/—/g, ",");
    const result = check(styleOnly);
    const warnings = reviewWriting(styleOnly);

    expect(warnings.length).toBeGreaterThanOrEqual(10);
    expect(result.blocking).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("the counts are what a staff member would read off the screen", () => {
    const result = check(AWFUL);
    const warnings = reviewWriting(AWFUL);
    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0].code).toBe("em_dash");
    expect(warnings.length).toBeGreaterThanOrEqual(10);
  });
});
