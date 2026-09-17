import { describe, expect, it, vi } from "vitest";
import { completeStudentLists, namesMissing, renderStudentList } from "./listCompleteness";
import type { GatheredEvidence, StudentList } from "./evidence";

const TOMS: StudentList = {
  typed: "Tom",
  students: [
    { personId: 1, name: "Tom Adeyemi", stageLabel: "Getting to know you", counsellor: "Eldah Therone" },
    { personId: 2, name: "Thomas Okafor", stageLabel: "No open enquiry", counsellor: "Tim Hunt" },
    { personId: 3, name: "Tomas Mozola", stageLabel: "Application Preparation", counsellor: null },
  ],
};
const evidence: GatheredEvidence = { blocks: [], notes: [], studentLists: [TOMS] };

describe("namesMissing", () => {
  it("counts a student as named when first and last recorded names both appear, whatever the case", () => {
    expect(namesMissing("We have tom adeyemi and THOMAS OKAFOR.", TOMS).map(s => s.name)).toEqual(["Tomas Mozola"]);
  });
  it("a count is not a name", () => {
    expect(namesMissing("There are 3 students recorded as Tom. Which one do you mean?", TOMS)).toHaveLength(3);
  });
});

describe("completeStudentLists", () => {
  it("leaves a complete reply alone and asks the model nothing", async () => {
    const ask = vi.fn();
    const full = "Tom Adeyemi: Getting to know you, Eldah Therone\nThomas Okafor: No open enquiry, Tim Hunt\nTomas Mozola: Application Preparation\nWhich one do you mean?";
    const r = await completeStudentLists(full, evidence, ask);
    expect(r.text).toBe(full);
    expect(r.summary).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });
  it("does nothing when the evidence carries no list", async () => {
    const ask = vi.fn();
    const r = await completeStudentLists("Some answer.", { blocks: [], notes: [] }, ask);
    expect(r.text).toBe("Some answer.");
    expect(ask).not.toHaveBeenCalled();
  });
  it("asks once for a rewrite naming the missing students, and takes a complete rewrite", async () => {
    const ask = vi.fn(async (correction: string) => {
      expect(correction).toContain("left out 2 of the 3 students");
      expect(correction).toContain("Thomas Okafor");
      expect(correction).toContain("Tomas Mozola");
      return "Tom Adeyemi, Thomas Okafor and Tomas Mozola are recorded. Which one do you mean?";
    });
    const r = await completeStudentLists("Tom Adeyemi is one of three. Which one?", evidence, ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(r.text).toContain("Tomas Mozola");
    expect(r.summary).toContain("rewritten once");
  });
  it("appends the list from the records when the rewrite still leaves somebody out", async () => {
    const ask = vi.fn(async () => "Tom Adeyemi and Thomas Okafor are recorded. Which one?");
    const r = await completeStudentLists("There are three Toms. Which one?", evidence, ask);
    expect(r.text.startsWith("Tom Adeyemi and Thomas Okafor are recorded. Which one?")).toBe(true);
    expect(r.text).toContain("Every student recorded as \"Tom\" or a form of that name (3):");
    expect(r.text).toContain("- Tomas Mozola: Application Preparation, no counsellor recorded");
    expect(r.text).toContain("- Thomas Okafor: No open enquiry, counsellor Tim Hunt");
    expect(r.summary).toContain("full list of 3 matching students was added");
  });
  it("appends the list to the original when the model gives nothing back or fails", async () => {
    const r1 = await completeStudentLists("There are three Toms.", evidence, async () => null);
    expect(r1.text).toContain("- Tom Adeyemi: Getting to know you, counsellor Eldah Therone");
    const r2 = await completeStudentLists("There are three Toms.", evidence, async () => { throw new Error("model down"); });
    expect(r2.text).toContain("Every student recorded as \"Tom\"");
  });
  it("never invents a student: every appended line comes from the list", () => {
    const rendered = renderStudentList(TOMS);
    const lines = rendered.split("\n").slice(1, -1);
    expect(lines).toHaveLength(3);
    expect(rendered.trim().endsWith(".")).toBe(true);
    for (const s of TOMS.students) expect(rendered).toContain(`- ${s.name}: ${s.stageLabel}`);
  });
});
