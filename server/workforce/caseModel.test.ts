import { describe, expect, it } from "vitest";
import { evaluateHandoff, describeCaseStage, type Prerequisite } from "./caseModel";
import { getWorker } from "./registry";

const satisfied: Prerequisite[] = [{ description: "discovery complete", satisfied: true }];
const unmet: Prerequisite[] = [{ description: "discovery complete", satisfied: false }];

describe("evaluateHandoff — prerequisite gate", () => {
  it("blocks a handoff with an unmet prerequisite, before even checking the registry relationship", () => {
    const result = evaluateHandoff("sophie", "james", unmet);
    expect(result.handoffValid).toBe(false);
    expect(result.reason).toMatch(/unmet prerequisite/i);
    expect(result.downstreamExecutionAuthorised).toBe(false);
  });

  it("blocks a handoff with no evidenced registry relationship, even with prerequisites satisfied", () => {
    // sophie -> james is not an evidenced handoff (sophie -> daniel is)
    const result = evaluateHandoff("sophie", "james", satisfied);
    expect(result.handoffValid).toBe(false);
    expect(result.reason).toMatch(/no controlled evidence/i);
  });

  it("recognises a genuinely evidenced handoff (sophie -> daniel) once prerequisites are satisfied", () => {
    const result = evaluateHandoff("sophie", "daniel", satisfied);
    expect(result.handoffValid).toBe(true);
  });

  it("a downstream worker cannot silently bypass a required upstream gate — an evidenced handoff with unmet prerequisites still fails", () => {
    const result = evaluateHandoff("oliver", "james", unmet);
    expect(result.handoffValid).toBe(false);
  });

  it("handoff validity and downstream execution authority stay separate answers", () => {
    // Both are true for an approved downstream worker, and the point is
    // that they are computed separately: a valid handoff has never been
    // what authorises the worker receiving it.
    const result = evaluateHandoff("sophie", "daniel", satisfied);
    expect(result.handoffValid).toBe(true);
    expect(result.downstreamExecutionAuthorised).toBe(getWorker("daniel").staffPortalExecutionAuthorised);

    // A procedurally valid handoff into a worker that cannot execute
    // still reports the handoff valid and the execution refused.
    const toGovernance = evaluateHandoff("grace", "wsa_governance_assurance", satisfied);
    expect(toGovernance.downstreamExecutionAuthorised).toBe(false);
  });
});

describe("describeCaseStage", () => {
  it("produces a plain-language status another staff member could act on without private chat history", () => {
    const description = describeCaseStage({
      caseId: "case-1",
      currentStage: "Visa evidence review",
      owningWorkerId: "priya",
      prerequisites: [],
      status: "blocked",
      blockedReason: "Priya is approval_blocked pending AB-P01 to AB-P04.",
      nextControlledAction: "Route to the current authorised human process.",
    });
    expect(description).toContain("Priya");
    expect(description).toContain("blocked");
    expect(description).toContain("AB-P01");
    expect(description).toContain("Route to the current authorised human process.");
  });
});
