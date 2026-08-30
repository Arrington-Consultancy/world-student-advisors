import { describe, it, expect } from "vitest";
import {
  SOCIAL_BRAIN_RECORDS,
  DESIGNED_TO_REMEMBER,
  HELD_ELSEWHERE,
  MEMORY_HORIZON,
  CONTROL_PACK_STATUS,
} from "./socialBrain";

/**
 * The controlled list, retyped from §8 of the Nia working draft. Kept as a
 * literal rather than derived from the module, so that renaming, dropping
 * or inventing a register fails here — which is the only thing that makes
 * this a check on the transcription rather than a restatement of it.
 */
const SECTION_8 = [
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

describe("the Social Brain matches the controlled record", () => {
  it("holds exactly the ten records of §8, in order", () => {
    expect(SOCIAL_BRAIN_RECORDS.map(r => r.name)).toEqual(SECTION_8);
  });

  it("gives every record a purpose and a stable id", () => {
    const ids = new Set<string>();
    for (const r of SOCIAL_BRAIN_RECORDS) {
      expect(r.purpose.length).toBeGreaterThan(20);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it("does not cite the unwritten Control Pack as its source", () => {
    // The Pack is named by the QC Review and does not exist. The page may
    // mention that; it may not claim the records came from it.
    expect(CONTROL_PACK_STATUS.source).toContain("Specialist_v0.1_WORKING_DRAFT.docx");
    expect(CONTROL_PACK_STATUS.source).not.toContain("Control_Pack");
    expect(CONTROL_PACK_STATUS.note.toLowerCase()).toContain("not been written");
  });
});

describe("the paid-media boundary", () => {
  it("has no register for spend, budget or cost", () => {
    // §14 gives paid media to Alex; §8 has no spend record. A register
    // here would move that boundary without a controlled change.
    const text = SOCIAL_BRAIN_RECORDS.map(r => `${r.name} ${r.purpose}`).join(" ").toLowerCase();
    for (const term of ["spend", "budget", "cost per", "ad spend", "cpc", "cpm"]) {
      expect(text).not.toContain(term);
    }
  });

  it("does not offer spend as something Nia remembers", () => {
    const text = DESIGNED_TO_REMEMBER.map(c => `${c.question} ${c.answer}`).join(" ").toLowerCase();
    expect(text).not.toContain("spend");
    expect(text).not.toContain("budget");
  });

  it("names Alex as the owner of spend", () => {
    const spend = HELD_ELSEWHERE.find(e => /spend|budget/i.test(e.subject));
    expect(spend).toBeDefined();
    expect(spend!.owner).toContain("Alex");
    expect(spend!.why).toContain("NIA-11");
  });
});

describe("what she is designed to remember", () => {
  it("covers repeating, which has no register of its own", () => {
    const repeat = DESIGNED_TO_REMEMBER.find(c => /repeat/i.test(c.question));
    expect(repeat).toBeDefined();
    // Cited to the brief so the claim is checkable against the document.
    expect(repeat!.sections.join(" ")).toContain("§21");
    expect(repeat!.sections.join(" ")).toContain("NIA-09");
  });

  it("cites a section of the brief for every capability claimed", () => {
    for (const c of DESIGNED_TO_REMEMBER) {
      expect(c.sections.length).toBeGreaterThan(0);
      expect(c.sections.some(s => /§\d+|NIA-\d+/.test(s))).toBe(true);
    }
  });
});

describe("the memory horizon is honest", () => {
  it("reports empty while every register is empty", () => {
    const anythingRecorded = SOCIAL_BRAIN_RECORDS.some(r => r.recorded > 0);
    expect(anythingRecorded).toBe(false);
    expect(MEMORY_HORIZON.populated).toBe(false);
  });

  it("says plainly that no past question can be answered yet", () => {
    expect(MEMORY_HORIZON.actualState).toMatch(/nothing has been imported/i);
    // The blockers are named, so "import the history" is not open-ended.
    expect(MEMORY_HORIZON.toChangeThat).toContain("NIA-G03");
    expect(MEMORY_HORIZON.toChangeThat).toContain("NIA-G06");
  });
});
