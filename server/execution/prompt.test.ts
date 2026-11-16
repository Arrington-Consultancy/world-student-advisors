import { describe, expect, it } from "vitest";
import { composeSystemPrompt, composeUserMessage, describeEvidence } from "./prompt";
import { getControlledBrief } from "./briefs";
import { buildWorkerContext } from "../workforce/context";

/**
 * 16 September 2026: the model was handed the CRM record as raw JSON and
 * repeated "stagePosition: 6" to a staff member as "stage position 6 of
 * the pipeline". The record is now rendered in the words a colleague
 * would use, without the fields that exist for code, and the prompt asks
 * for plain text because the panel renders none.
 */
const record = {
  personId: 369,
  name: "VIVIAN ONUH",
  email: "student@example.com",
  phone: null,
  counsellor: "Glenice Example",
  stageLabel: "CAS / Visa / Pre-Departure",
  lastUpdated: "2026-09-10 14:22:11",
  stagePosition: 6,
  confirmed: true,
  fields: { Course: "MSc Data Science", "Offer status": null },
};

describe("describeEvidence", () => {
  it("renders a CRM record as labelled plain lines without the code-only fields", () => {
    const text = describeEvidence("pipedrive", record);
    expect(text).toBe("Student: VIVIAN ONUH; Counsellor: Glenice Example; Stage: CAS / Visa / Pre-Departure; Last updated: 2026-09-10 14:22:11; Email: student@example.com; Phone: not recorded; Course: MSc Data Science; Offer status: not recorded");
    expect(text).not.toMatch(/stagePosition|confirmed|personId|[{}"]/);
  });
  it("passes anything that is not a CRM record through as JSON", () => {
    expect(describeEvidence("sharepoint", { title: "Standard", version: "1.0" })).toBe('{"title":"Standard","version":"1.0"}');
    expect(describeEvidence("pipedrive", [{ personId: 1 }])).toBe('[{"personId":1}]');
  });
});

describe("the composed prompt", () => {
  const brief = getControlledBrief("james");
  if (!brief) throw new Error("James has no controlled brief in this checkout");
  const context = buildWorkerContext({ workerId: "james", caseId: "", requestedByStudentId: "", availableCases: [], availableUpstreamOutputs: [] });
  it("asks for plain text and for records described in ordinary words", () => {
    const system = composeSystemPrompt({ brief, context, contributions: [] });
    expect(system).toContain("Write plain text.");
    expect(system).toContain("no Markdown");
    expect(system).toContain("Never quote internal field names, identifiers, pipeline positions");
  });
  it("puts the CRM record in front of the model as labelled lines, not JSON", () => {
    const user = composeUserMessage("Where is Vivian Ene Onuh in the application process?", {
      brief, context, contributions: [],
      evidence: { blocks: [{ source: "pipedrive", label: "CRM person 369", data: record }], notes: [] },
    });
    expect(user).toContain("CRM person 369 [pipedrive]: Student: VIVIAN ONUH; Counsellor: Glenice Example; Stage: CAS / Visa / Pre-Departure");
    expect(user).not.toContain("stagePosition");
    expect(user).not.toContain('"confirmed"');
  });
});
