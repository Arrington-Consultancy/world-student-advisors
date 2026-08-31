import { describe, it, expect } from "vitest";
import {
  SOCIAL_BRAIN_RECORDS,
  PACK_TO_BRIEF,
  DESIGNED_TO_REMEMBER,
  HELD_ELSEWHERE,
  MEMORY_HORIZON,
  CONTROL_PACK,
} from "./socialBrain";

/**
 * The nine sections, retyped from the Control Pack rather than derived
 * from the module, so renaming, dropping or inventing a register fails
 * here. That is the only thing that makes this a check on the
 * transcription instead of a restatement of it.
 */
const CONTROL_PACK_SECTIONS = [
  [1, "Master Social Content Ledger"],
  [2, "Asset & Version Register"],
  [3, "Video Timecode & Retention Register"],
  [4, "Africa Market Intelligence Profile"],
  [5, "AI-Slop & Human Voice Review"],
  [6, "Editorial Calendar & Series Register"],
  [7, "Performance & Experiment Register"],
  [8, "Community Insight Register"],
  [9, "Publication Readiness Checklist"],
];

/** Brief §8's ten records, retyped. The other side of the reconciliation. */
const BRIEF_SECTION_8 = [
  "Master Social Content Ledger",
  "Asset & Version Register",
  "Platform Performance Register",
  "Video Timecode & Retention Register",
  "Africa Market Intelligence Library",
  "Hook & Format Library",
  "AI-Slop Pattern Register",
  "Editorial Calendar & Series Register",
  "Community Insight Register",
  "Experiment Register",
];

describe("the Social Brain matches the Control Pack", () => {
  it("holds exactly the nine sections of the Pack, in order, numbered", () => {
    expect(SOCIAL_BRAIN_RECORDS.map(r => [r.section, r.name])).toEqual(CONTROL_PACK_SECTIONS);
  });

  it("cites the Control Pack, which exists, as its source", () => {
    // This assertion exists because the opposite was published: the page
    // briefly told staff the Pack had never been written.
    expect(CONTROL_PACK.document).toBe(
      "WSA_Nia_Social_Brain_Supporting_Control_Pack_v0.1_WORKING_DRAFT.docx",
    );
    expect(CONTROL_PACK.status).toBe("NOT APPROVED");
    expect(CONTROL_PACK.created).toContain("062");
  });

  it("carries the Pack's authority note, which grants no publishing right", () => {
    expect(CONTROL_PACK.authorityNote).toContain("does not grant live publishing authority");
  });
});

describe("reconciliation with brief §8", () => {
  it("accounts for every record named in brief §8", () => {
    const covered = PACK_TO_BRIEF.map(i => i.briefSection8);
    for (const record of BRIEF_SECTION_8) expect(covered).toContain(record);
  });

  it("maps every Pack section that a brief record maps onto", () => {
    const mapped = PACK_TO_BRIEF.map(i => i.controlPack).filter((s): s is string => s !== null);
    for (const [section, name] of CONTROL_PACK_SECTIONS) {
      expect(mapped).toContain(`§${section} ${name}`);
    }
  });

  it("flags Hook & Format Library as unreconciled rather than quietly dropping it", () => {
    const hook = PACK_TO_BRIEF.find(i => i.briefSection8 === "Hook & Format Library");
    expect(hook).toBeDefined();
    expect(hook!.controlPack).toBeNull();
    expect(hook!.note).toContain("UNRECONCILED");
  });

  it("flags Publication Readiness as added by the Pack, not present in the brief", () => {
    const readiness = PACK_TO_BRIEF.find(i => i.controlPack === "§9 Publication Readiness Checklist");
    expect(readiness).toBeDefined();
    expect(readiness!.briefSection8).toContain("not in brief");
    expect(readiness!.note).toContain("UNRECONCILED");
  });

  it("does not resolve either gap in code", () => {
    // Two controlled records disagree. A module must not pick a winner.
    const unresolved = PACK_TO_BRIEF.filter(i => i.note.includes("UNRECONCILED"));
    expect(unresolved).toHaveLength(2);
  });
});

describe("the paid-media boundary", () => {
  it("has no register for spend, budget or cost", () => {
    // Brief §14 gives paid measurement to Alex; the Pack has no spend
    // record. A register here would move that boundary without a
    // controlled change.
    const text = SOCIAL_BRAIN_RECORDS.map(r => `${r.name} ${r.purpose}`).join(" ").toLowerCase();
    for (const term of ["spend", "budget", "cost per", "cpc", "cpm"]) {
      expect(text).not.toContain(term);
    }
  });

  it("does not offer spend as something Nia remembers", () => {
    const text = DESIGNED_TO_REMEMBER.map(c => `${c.question} ${c.answer}`).join(" ").toLowerCase();
    expect(text).not.toContain("spend");
    expect(text).not.toContain("budget");
  });

  it("names Alex as the owner, and states the narrower thing she may record", () => {
    const spend = HELD_ELSEWHERE.find(e => /spend/i.test(e.subject));
    expect(spend).toBeDefined();
    expect(spend!.owner).toContain("Alex");
    expect(spend!.why).toContain("NIA-T11");
    // The Pack's §7 confounder field is genuinely hers; saying only
    // "not hers" would understate what the record already allows.
    expect(spend!.why).toContain("confounder");
    expect(spend!.why).toContain("not the source of truth");
  });

  it("routes every neighbouring specialism to a named owner", () => {
    for (const e of HELD_ELSEWHERE) {
      expect(e.owner).toMatch(/[A-Z][a-z]+/);
      expect(e.why).toMatch(/§\d+|NIA-T\d+/);
    }
  });
});

describe("what she is designed to remember", () => {
  it("covers repeating, which has no register of its own", () => {
    const repeat = DESIGNED_TO_REMEMBER.find(c => /repeat/i.test(c.question));
    expect(repeat).toBeDefined();
    expect(repeat!.sources.join(" ")).toContain("lineage");
    expect(repeat!.sources.join(" ")).toContain("NIA-T13");
  });

  it("cites a controlled source for every capability claimed", () => {
    for (const c of DESIGNED_TO_REMEMBER) {
      expect(c.sources.length).toBeGreaterThan(0);
      expect(c.sources.some(s => /Control Pack §\d+|Brief §\d+|NIA-T\d+/.test(s))).toBe(true);
    }
  });
});

describe("the memory horizon is honest", () => {
  it("reports empty while every register is empty", () => {
    expect(SOCIAL_BRAIN_RECORDS.some(r => r.recorded > 0)).toBe(false);
    expect(MEMORY_HORIZON.populated).toBe(false);
  });

  it("says plainly that no past question can be answered yet", () => {
    expect(MEMORY_HORIZON.actualState).toMatch(/nothing has been imported/i);
    expect(MEMORY_HORIZON.toChangeThat).toContain("NIA-G03");
    expect(MEMORY_HORIZON.toChangeThat).toContain("NIA-G06");
  });
});
