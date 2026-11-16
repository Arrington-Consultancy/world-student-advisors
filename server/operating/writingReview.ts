/**
 * WSA writing review: the non-blocking second layer.
 *
 * Tom pasted deliberately awful AI marketing copy into the content checker
 * on 11 September 2026 and it returned exactly one issue, the em dash. The
 * copy was full of "unlocking opportunities", "empowering your future",
 * "holistic", "tailored solutions", "navigate the complex landscape",
 * "leveraging our expertise", "every step of the way" and so on, and none
 * of it was caught.
 *
 * WHY IT WAS MISSED. The blocking layer already had a small advisory list,
 * but it was written as a handful of exact phrases rather than as the
 * classes of writing the standard actually describes. "leverage" was
 * matched with a word boundary so "leveraging" slipped past. "unlock the
 * power" was matched but "unlocking opportunities" was not. "navigate the
 * complexities" was matched but "navigate the complex landscape" was not.
 * A list of exact phrases will always lose to a writer, or a model, that
 * reaches for a synonym.
 *
 * WHAT THIS LAYER IS, AND IS NOT. It never blocks. Blocking belongs to
 * server/operating/qualityCheck.ts and is untouched by this file. This
 * layer reports writing that is permitted but reads badly, generically or
 * obviously machine written, and every rule names the clause of the
 * approved standard it comes from so a writer can check it rather than
 * take it on trust.
 *
 * THE AUTHORITY, AND WHERE IT RUNS OUT. Every rule below carries a
 * RuleAuthority. Most cite the WSA Global Writing Standard v1.1 (APPROVED,
 * 29 August 2026), which is the only approved writing authority WSA holds:
 * a SharePoint search for a controlled tone of voice record returns only
 * Nia working drafts marked NOT APPROVED. Two rules cite nothing, because
 * the standard genuinely does not cover them, and those are marked
 * provisional rather than dressed up as approved. See PROVISIONAL_RULES and
 * the governance note at the bottom of this file.
 */

/* ── Authority ───────────────────────────────────────────────────────── */

/**
 * Where a rule comes from.
 *
 * A rule with no approved clause behind it is not silently treated as
 * equal to one that has. The distinction is carried in the data and shown
 * on screen, so nothing unapproved can quietly become a WSA rule by
 * sitting in this file long enough.
 */
export type RuleAuthority =
  | {
      approved: true;
      /** e.g. "WSA Global Writing Standard v1.1, section 2" */
      clause: string;
      /** The words of the standard this rule implements. Quoted, not paraphrased. */
      quote: string;
    }
  | {
      approved: false;
      /** What the rule is trying to protect, in plain words. */
      principle: string;
      /** The exact governance change that would make this rule approved. */
      needs: string;
    };

const GWS = "WSA Global Writing Standard v1.1 (APPROVED, 29 August 2026)";

/** §1: the core writing rule. The authority for "this reads like a machine". */
const NOT_MACHINE_WRITTEN: RuleAuthority = {
  approved: true,
  clause: `${GWS}, section 1`,
  quote:
    "WSA writing must sound like a capable human professional. It should be clear, natural and " +
    "appropriately formal without becoming stiff, over-engineered or obviously machine-written.",
};

/** §2: the authority for flagging vague, polished, evidence-free wording. */
const PREFER_CONCRETE: RuleAuthority = {
  approved: true,
  clause: `${GWS}, section 2`,
  quote: "Prefer specific facts, evidence and concrete wording over polished generalities.",
};

/** §2: the authority for flagging repetition. */
const DO_NOT_RESTATE: RuleAuthority = {
  approved: true,
  clause: `${GWS}, section 2`,
  quote: "Do not restate a point after it is already clear. Stop when the job is done.",
};

/** §3: the authority for flagging pressure and inflated sales language. */
const NO_ARTIFICIAL_PRESSURE: RuleAuthority = {
  approved: true,
  clause: `${GWS}, section 3`,
  quote:
    "Marketing may be more conversational, but it must remain truthful and must not create " +
    "artificial urgency, guarantees or pressure.",
};

/* ── The shape of a warning ──────────────────────────────────────────── */

export type WritingWarningCategory =
  | "machine_written"
  | "polished_generality"
  | "inflated_motivation"
  | "unevidenced_claim"
  | "repeated_aspiration"
  | "emoji_density";

export interface WritingWarning {
  category: WritingWarningCategory;
  /** The exact text that triggered it, as the writer typed it. */
  phrase: string;
  /** Why it is weak or does not sound like WSA. */
  why: string;
  /** A plainer alternative. Absent where the fix is to cut it rather than swap it. */
  plainer?: string;
  authority: RuleAuthority;
}

/* ── The registers ───────────────────────────────────────────────────── */

/**
 * One entry catches a class of wording, not a single phrase.
 *
 * Deliberately not a transcription of the phrases in Tom's test. Each entry
 * was written to catch the family the example belongs to, so that a writer
 * reaching for the next synonym is caught too. "unlocking opportunities"
 * and "unlock your potential" are the same move and both match; the earlier
 * list caught only the exact string it had been given.
 */
interface Rule {
  re: RegExp;
  why: string;
  plainer?: string;
  category: WritingWarningCategory;
  authority: RuleAuthority;
}

const MACHINE_WRITTEN: readonly Rule[] = [
  {
    re: /\bleverag(e|es|ed|ing)\b/gi,
    why: "Consultancy filler. It means use, and use is the clearer word.",
    plainer: "use",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bholistic(ally)?\b/gi,
    why: "Says nothing a reader can picture. Almost every use means whole or complete.",
    plainer: "complete, or say what it actually covers",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\b(tailored|bespoke|customised|personalised)\s+(solutions?|packages?|approach(es)?|experiences?)\b/gi,
    why: "A solution is not a thing a student receives. Name what you actually do for them.",
    plainer: "what you will actually do, for example: we check your grades against each course",
    category: "machine_written",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\bnavigat(e|ing)\s+the\s+(complex|complicated|challenging|ever-changing|tricky)\s+\w+/gi,
    why: "A stock metaphor. It sounds like effort without naming any.",
    plainer: "say what is difficult and what you do about it",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bunlock(s|ed|ing)?\s+(the\s+)?(power|potential|opportunit(y|ies)|door(s)?|secret(s)?|success)\b/gi,
    why: "Nothing is locked. The word is doing no work.",
    plainer: "say what the student can actually do next",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bempower(s|ed|ing|ment)?\b/gi,
    why: "Claims to hand over a power that was never withheld.",
    plainer: "help, or say what support is actually given",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bseamless(ly)?\b/gi,
    why: "Describes an absence of problems rather than the thing itself.",
    plainer: "cut it, or say what makes it simple",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\b(synerg(y|ies|istic)|cutting[- ]edge|state[- ]of[- ]the[- ]art|best[- ]in[- ]class|game[- ]chang(er|ing)|next[- ]level|one[- ]stop[- ]shop|end[- ]to[- ]end|ecosystem)\b/gi,
    why: "Stock business vocabulary. It could sit in any brochure in any industry.",
    plainer: "cut it, or replace it with the specific fact underneath",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\b(delve|dive)\s+(deep\s+)?into\b/gi,
    why: "A model's favourite verb. People say look at.",
    plainer: "look at",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bin\s+today'?s\s+(fast[- ]paced|competitive|ever[- ]changing|globalised?)\b/gi,
    why: "A throat-clearing opener that carries no information.",
    plainer: "delete the sentence and start with the point",
    category: "machine_written",
    authority: NOT_MACHINE_WRITTEN,
  },
];

const INFLATED_MOTIVATION: readonly Rule[] = [
  {
    re: /\b(your|the|this|their)\s+(academic\s+|educational\s+|student\s+|learning\s+)?journey\b/gi,
    why: "Applying to university is an application, not a journey. The word is doing sentiment, not meaning.",
    plainer: "your application, or your course",
    category: "inflated_motivation",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\bevery\s+step\s+of\s+the\s+way\b/gi,
    why: "A promise of constant presence that no service can keep, and the reader knows it.",
    plainer: "say when you are available and what you do",
    category: "inflated_motivation",
    authority: NO_ARTIFICIAL_PRESSURE,
  },
  {
    re: /\btransform(s|ed|ing|ative)?\s+(your|their|lives|futures?)\b/gi,
    why: "Overstates what an education agent does. It invites a claim WSA cannot evidence.",
    plainer: "say the concrete outcome, for example: a place on a course you are qualified for",
    category: "inflated_motivation",
    authority: NO_ARTIFICIAL_PRESSURE,
  },
  {
    re: /\bturn(ing)?\s+(your|their)\s+(dreams?|ambitions?|aspirations?|goals?)\s+into\s+(a\s+)?realit(y|ies)\b/gi,
    why: "Sales copy. It promises an outcome that depends on grades, funding and a visa.",
    plainer: "say what WSA actually does and what the student has to do",
    category: "inflated_motivation",
    authority: NO_ARTIFICIAL_PRESSURE,
  },
  {
    re: /\b(let'?s|we'?ll)\s+make\s+it\s+happen\b/gi,
    why: "A rallying cry rather than information. It reads as pressure.",
    plainer: "say the next step you want the reader to take",
    category: "inflated_motivation",
    authority: NO_ARTIFICIAL_PRESSURE,
  },
  {
    re: /\b(embark\s+on|begin)\s+(your|their|this)\b/gi,
    why: "Inflated register for starting something ordinary.",
    plainer: "start",
    category: "inflated_motivation",
    authority: NOT_MACHINE_WRITTEN,
  },
  {
    re: /\b(brighter|better)\s+(future|tomorrow)\b/gi,
    why: "A feeling, not a fact, and one every competitor also claims.",
    plainer: "cut it, or name the actual outcome",
    category: "inflated_motivation",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\b(achiev(e|ing)|realis(e|ing)|reach(ing)?)\s+(your|their)\s+(full\s+)?(potential|dreams?)\b/gi,
    why: "Unmeasurable. Nobody can tell whether it happened.",
    plainer: "name the qualification, the course or the offer",
    category: "inflated_motivation",
    authority: PREFER_CONCRETE,
  },
];

const UNEVIDENCED_CLAIM: readonly Rule[] = [
  {
    re: /\b(world[- ]class|industry[- ]leading|market[- ]leading|unparalleled|unrivalled|second\s+to\s+none|unmatched)\b/gi,
    why: "A superlative with no evidence behind it. It is the kind of claim a reader discounts on sight.",
    plainer: "give the fact instead, for example a number, a year, or an accreditation",
    category: "unevidenced_claim",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\b(proven\s+track\s+record|trusted\s+by\s+(thousands|hundreds|students\s+worldwide)|countless\s+students)\b/gi,
    why: "Implies a number without giving one.",
    plainer: "give the real number, or remove the claim",
    category: "unevidenced_claim",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\b(dedicated|passionate|expert)\s+team\s+of\s+(experts?|professionals?|advisors?|counsellors?)\b/gi,
    why: "Every agency says this, so it distinguishes WSA from none of them.",
    plainer: "say who they are and what they are qualified in",
    category: "unevidenced_claim",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\bcomprehensive\s+(range|suite|support|guidance|service)\b/gi,
    why: "Comprehensive is unfalsifiable. It sets no expectation the reader can hold WSA to.",
    plainer: "list what is actually included",
    category: "polished_generality",
    authority: PREFER_CONCRETE,
  },
  {
    re: /\bwe\s+(are\s+)?(here\s+to\s+help|understand\s+that\s+every\s+student)\b/gi,
    why: "Reassurance with no content. It occupies the place where a fact should be.",
    plainer: "say the specific thing you do",
    category: "polished_generality",
    authority: PREFER_CONCRETE,
  },
];

/**
 * Words that carry aspiration rather than information.
 *
 * Used for the repetition rule rather than flagged on first use, because
 * one "future" in a page is normal English and four is a tic. Section 2's
 * "do not restate a point after it is already clear" is the authority, and
 * repetition is the only thing being judged here.
 */
const ASPIRATION_WORDS = [
  "journey",
  "future",
  "empower",
  "unlock",
  "dream",
  "potential",
  "transform",
  "opportunity",
  "success",
] as const;

/** Above this many uses of the same aspiration word, it is a tic rather than a word. */
export const ASPIRATION_REPEAT_LIMIT = 3;

/* ── Provisional rules: no approved clause behind them ───────────────── */

/**
 * Emoji density.
 *
 * THE STANDARD DOES NOT COVER THIS. WSA Global Writing Standard v1.1 says
 * nothing about emoji, symbols or decoration anywhere in its six sections,
 * and no approved tone of voice record exists. Section 3's requirement
 * that formal correspondence be "more formal and precise" is an argument
 * about one audience, not a general rule, and stretching it into one here
 * would be inventing a WSA rule in code.
 *
 * So this is marked provisional. It still produces a warning, because Tom
 * asked for it and a warning blocks nothing, but the warning says on its
 * face that no approved rule stands behind it.
 */
export const EMOJI_LIMIT = 3;

const EMOJI_AUTHORITY: RuleAuthority = {
  approved: false,
  principle:
    "Heavy emoji use reads as marketing decoration rather than professional writing, and looks worse " +
    "in formal correspondence with a university or a parent than in a social post.",
  needs:
    "A clause in the Global Writing Standard covering emoji and decoration, ideally per audience, since " +
    "what suits an Instagram caption does not suit a university email. Until then this is advice only.",
};

/**
 * Rules that carry no approved clause. Exported so the screen, the tests
 * and any report can list them honestly rather than mixing them in.
 */
export const PROVISIONAL_RULES: readonly { category: WritingWarningCategory; authority: RuleAuthority }[] =
  Object.freeze([{ category: "emoji_density", authority: EMOJI_AUTHORITY }]);

/* ── The review ──────────────────────────────────────────────────────── */

const ALL_RULES: readonly Rule[] = [...MACHINE_WRITTEN, ...INFLATED_MOTIVATION, ...UNEVIDENCED_CLAIM];

/**
 * Counts emoji by code point range rather than by a list of characters,
 * so a new emoji does not walk past a hard-coded set.
 */
function countEmoji(text: string): number {
  // Written with surrogate pairs rather than the u flag and \u{...}
  // escapes, because this project's TypeScript target predates both. A
  // surrogate pair covers the astral plane, where almost every emoji
  // lives; the second range catches the older symbols that sit below
  // U+FFFF, such as the pointing hands and stars.
  const matches = text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[☀-➿⬀-⯿]/g);
  return (matches ?? []).length;
}

/**
 * The non-blocking WSA writing review.
 *
 * Returns warnings in the order they appear in the text, so a writer works
 * top to bottom rather than hunting. Never returns anything that blocks:
 * the caller decides what to do with these, and the approved standard does
 * not make any of them a release gate.
 */
export function reviewWriting(text: string): readonly WritingWarning[] {
  const warnings: { at: number; warning: WritingWarning }[] = [];
  const seen = new Set<string>();

  for (const rule of ALL_RULES) {
    // Fresh regex per run: a /g regex carries lastIndex between calls and
    // would skip matches on the second piece of text it ever saw.
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const phrase = m[0];
      // One warning per distinct phrase. Three uses of "empowering" is one
      // thing to fix, not three, and the repetition rule covers volume.
      const key = `${rule.category}:${phrase.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          at: m.index,
          warning: {
            category: rule.category,
            phrase,
            why: rule.why,
            ...(rule.plainer ? { plainer: rule.plainer } : {}),
            authority: rule.authority,
          },
        });
      }
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
  }

  // Repetition of aspiration words.
  for (const word of ASPIRATION_WORDS) {
    const re = new RegExp(`\\b${word}\\w*\\b`, "gi");
    const hits = text.match(re) ?? [];
    const first = hits[0];
    if (first !== undefined && hits.length >= ASPIRATION_REPEAT_LIMIT) {
      warnings.push({
        at: text.search(re),
        warning: {
          category: "repeated_aspiration",
          phrase: first,
          why:
            `"${word}" and its variants appear ${hits.length} times. Once is a word, ` +
            "three times is a tic, and the reader stops seeing it.",
          plainer: "keep the one that carries the most meaning and cut the rest",
          authority: DO_NOT_RESTATE,
        },
      });
    }
  }

  const emoji = countEmoji(text);
  if (emoji > EMOJI_LIMIT) {
    warnings.push({
      at: text.length,
      warning: {
        category: "emoji_density",
        phrase: `${emoji} emoji`,
        why:
          `There are ${emoji} emoji in this text. Past a few they read as decoration rather than ` +
          "writing, and they carry differently to a parent or a university than to a social feed.",
        plainer: "keep the one or two that genuinely add something",
        authority: EMOJI_AUTHORITY,
      },
    });
  }

  return warnings.sort((a, b) => a.at - b.at).map(w => w.warning);
}

/**
 * THE GOVERNANCE GAP, recorded here so it is not lost in a chat message.
 *
 * Everything above except the emoji rule cites a clause of an approved
 * standard. Two things are worth Tom knowing:
 *
 * 1. EMOJI HAS NO APPROVED RULE. Marked provisional above. It warns, it
 *    says it is unapproved, and it blocks nothing.
 *
 * 2. THE VOCABULARY ITSELF IS AN APPLICATION, NOT A LIST THE STANDARD
 *    GIVES. Section 2 says prefer concrete wording over polished
 *    generalities, and section 1 says do not sound obviously machine
 *    written. Deciding that "holistic" and "unlocking opportunities" are
 *    examples of those is a judgement made here, not a list anybody
 *    approved. That is defensible for a checker, which has to turn a
 *    principle into patterns to be of any use, but it is worth ratifying:
 *    a short discouraged-vocabulary appendix to the Global Writing
 *    Standard would move this from a reasonable reading to an approved
 *    one, and would let a worker cite it to a colleague.
 */
