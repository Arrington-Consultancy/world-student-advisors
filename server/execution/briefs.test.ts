import { describe, expect, it } from "vitest";
import { getControlledBrief, workersWithBriefs, SOPHIE_BRIEF } from "./briefs";
import { composeSystemPrompt } from "./prompt";
import { UNIVERSAL_SOURCES, ETHICAL_BOUNDARIES, DECISION_PRIORITY } from "./universalInstructions";
import { listWorkers, getWorker } from "../workforce/registry";
import type { WorkerId } from "../workforce/types";

const CASE_WORKERS: WorkerId[] = [
  "sophie", "daniel", "amelia", "oliver", "james", "priya",
  "harper", "olivia", "grace", "ethan", "maya", "alex", "nia",
];

describe("controlled briefs — coverage and provenance", () => {
  it("every substantive worker has a brief", () => {
    for (const id of CASE_WORKERS) {
      expect(getControlledBrief(id), `${id} has no brief`).not.toBeNull();
    }
  });

  it("no governance or infrastructure function has one, because they do not execute case work", () => {
    for (const id of ["wsa_core_brain", "wsa_governance_assurance", "staff_receptionist"] as WorkerId[]) {
      expect(getControlledBrief(id)).toBeNull();
    }
  });

  it("Sophie's is the only brief drawn from an approved operating guide", () => {
    const approved = workersWithBriefs().filter(
      id => getControlledBrief(id)?.provenance === "approved_operating_guide",
    );
    expect(approved).toEqual(["sophie"]);
    expect(SOPHIE_BRIEF.sourceDocument).toBe("WSA_Sophie_Staff_Operating_Guide_v1.0_APPROVED.docx");
  });

  it("every other brief declares itself register-derived rather than borrowing approved status", () => {
    for (const id of workersWithBriefs()) {
      const brief = getControlledBrief(id)!;
      if (id === "sophie") continue;
      expect(brief.provenance).toBe("register_derived");
      expect(brief.sourceDocument).toMatch(/Worker_Register/);
    }
  });

  it("a brief names the worker, so no prompt addresses a specialist by its id", () => {
    for (const id of workersWithBriefs()) {
      const brief = getControlledBrief(id)!;
      expect(brief.workerName).toBe(getWorker(id).canonicalName);
    }
  });

  it("every brief states a remit and refuses something", () => {
    for (const id of workersWithBriefs()) {
      const brief = getControlledBrief(id)!;
      expect(brief.remit.length).toBeGreaterThan(40);
      expect(brief.rules.length).toBeGreaterThan(2);
      expect(brief.refusals.length).toBeGreaterThan(1);
    }
  });
});

/**
 * The point of the brief layer is that it does NOT authorise anything.
 * If writing a brief could activate a worker, pre-positioning thirteen of
 * them would have activated twelve unapproved specialists at once.
 */
describe("a brief is not an authorisation", () => {
  it("a brief never authorises: every executable worker also holds an approved specification", () => {
    // Briefs were written for thirteen workers while twelve of them could
    // not execute. What that proved still holds: authority comes from the
    // register, and a brief on its own opens nothing.
    for (const w of listWorkers()) {
      if (!w.staffPortalExecutionAuthorised) continue;
      expect(w.specificationStatus, w.id).toBe("approved");
    }
    for (const id of workersWithBriefs()) {
      const w = getWorker(id);
      if (w.specificationStatus !== "approved") {
        expect(w.staffPortalExecutionAuthorised, `${id} executes on a brief alone`).toBe(false);
      }
    }
  });

  it("no worker gained connector or write authority from having a brief", () => {
    for (const w of listWorkers()) {
      expect(w.connectorUseAuthorised).toBe(false);
      expect(w.writesAuthorised).toBe(false);
    }
  });
});

describe("worker isolation in the composed prompt", () => {
  it("a worker's prompt contains its own remit and no other worker's rules", () => {
    const oliverPrompt = composeSystemPrompt({
      brief: getControlledBrief("oliver")!,
      context: { workerId: "oliver", denied: false, caseData: null } as never,
      contributions: [],
    });
    expect(oliverPrompt).toContain("Education Suitability");
    // Harper's funding arithmetic rule is distinctive and must not appear.
    expect(oliverPrompt).not.toContain("funding gap");
    expect(oliverPrompt).not.toContain("Student Enquiry and Triage");
  });

  it("standing WSA rules appear in every worker's prompt", () => {
    for (const id of workersWithBriefs()) {
      const prompt = composeSystemPrompt({
        brief: getControlledBrief(id)!,
        context: { workerId: id, denied: false, caseData: null } as never,
        contributions: [],
      });
      expect(prompt, `${id} lost the standing rules`).toContain("WSA STANDING RULES");
      expect(prompt).toContain(ETHICAL_BOUNDARIES[3]);
      expect(prompt).toContain(DECISION_PRIORITY[0]);
      expect(prompt).toContain("Do not use em dashes");
    }
  });

  it("the standing rules are constraints, and say they never widen scope", () => {
    const prompt = composeSystemPrompt({
      brief: getControlledBrief("maya")!,
      context: { workerId: "maya", denied: false, caseData: null } as never,
      contributions: [],
    });
    expect(prompt).toContain("They never widen it");
    // The worker's own remit still follows, so the brief grants and the
    // standing rules constrain.
    expect(prompt.indexOf("WSA STANDING RULES")).toBeLessThan(prompt.indexOf("OPERATING RULES"));
  });

  it("records the approved sources the standing rules came from", () => {
    const docs = UNIVERSAL_SOURCES.map(s => s.document);
    expect(docs).toContain("WSA_Universal_Worker_Instructions_v1.0_APPROVED.docx");
    expect(docs).toContain("WSA_Core_Operating_System_v1.1_APPROVED.docx");
    expect(docs).toContain("WSA_Global_Writing_Standard_v1.0_APPROVED.docx");
    for (const s of UNIVERSAL_SOURCES) expect(s.approvedBy).toBe("Tom Arrington");
  });
});

/**
 * Each specialist must refuse the neighbouring specialist's work by name.
 * A workforce where every worker will have a go at everything is one
 * generalist wearing thirteen badges.
 */
describe("boundaries between specialists are stated, not implied", () => {
  const expectations: Array<[WorkerId, RegExp]> = [
    ["sophie", /suitability|admissions|visa/i],
    ["daniel", /recommend|conclusion/i],
    ["amelia", /rank|suitab/i],
    ["oliver", /research|application|visa/i],
    ["james", /visa|immigration/i],
    ["harper", /visa|immigration|investment/i],
    ["olivia", /visa|immigration|payment/i],
    ["grace", /rewrit|case owner/i],
    ["ethan", /paid media|advertis|social/i],
    ["maya", /destructive|retention/i],
    ["alex", /organic|social|student case/i],
    ["nia", /paid media|SEO|publish/i],
    ["priya", /rule|eligib/i],
  ];

  for (const [id, pattern] of expectations) {
    it(`${id} refuses work outside the remit`, () => {
      const refusals = getControlledBrief(id)!.refusals.join(" ");
      expect(refusals).toMatch(pattern);
    });
  }
});
