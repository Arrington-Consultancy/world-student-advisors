import { describe, expect, it } from "vitest";
import { WORKER_REGISTRY, listWorkers, getWorker, ESTATE_LEVEL_NEXT_CONTROL } from "./registry";
import type { WorkerId } from "./types";

const EXPECTED_IDS: WorkerId[] = [
  "wsa_core_brain",
  "sophie",
  "daniel",
  "amelia",
  "oliver",
  "james",
  "priya",
  "harper",
  "olivia",
  "grace",
  "ethan",
  "maya",
  "alex",
  "wsa_governance_assurance",
  "staff_receptionist",
  // Added from WSA_AI_Worker_Register_v0.42.docx, read 30 August 2026.
  "nia",
];

describe("worker registry integrity", () => {
  it("contains exactly the controlled estate — every worker in the Register plus the receptionist, nothing invented", () => {
    const ids = listWorkers()
      .map(w => w.id)
      .sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it("every entry has all required fields populated", () => {
    for (const w of listWorkers()) {
      expect(w.canonicalName).toBeTruthy();
      expect(w.roleTitle).toBeTruthy();
      expect(w.specificationVersion).toBeTruthy();
      expect(w.specificationStatus).toBeTruthy();
      expect(w.staffPortalExecutionStatus).toBeTruthy();
      expect(w.currentNextControl).toBeTruthy();
      expect(Array.isArray(w.materialBlockers)).toBe(true);
      expect(w.personality.summary).toBeTruthy();
      expect(w.personality.whatFor).toBeTruthy();
      expect(w.personality.whatNotFor).toBeTruthy();
      expect(w.connectorIntent.sharePoint).toBeTruthy();
      expect(w.connectorIntent.googleDrive).toBeTruthy();
      expect(w.connectorIntent.hardBoundary).toBeTruthy();
      expect(w.escalationRoute).toContain("Tom Arrington");
      expect(w.controlledBriefReference).toContain("sharepoint.com");
    }
  });

  it("getWorker returns the same object as the map, and throws for an unknown id", () => {
    expect(getWorker("sophie")).toBe(WORKER_REGISTRY.get("sophie"));
    // @ts-expect-error — deliberately not a WorkerId
    expect(() => getWorker("not-a-real-worker")).toThrow(/unknown worker/i);
  });

  it("entries are frozen — cannot be mutated at runtime", () => {
    const sophie = getWorker("sophie");
    expect(() => {
      // @ts-expect-error — intentional mutation attempt
      sophie.specificationStatus = "approved_for_everything";
    }).toThrow();
    expect(getWorker("sophie").specificationStatus).toBe("approved");
  });
});

describe("approval status comes from the controlled record, not from code", () => {
  /**
   * These used to assert Sophie was the only approved worker. That was a
   * true statement of the position on 30 August and is deliberately false
   * since Tom Arrington's consolidated completion and activation
   * authority of 31 August. What they protect is not the count: it is
   * that the register is the source, and that approval and connector
   * authority remain separate things.
   */
  const APPROVED_31_AUGUST: WorkerId[] = [
    "sophie", "daniel", "amelia", "oliver", "james", "priya",
    "harper", "olivia", "grace", "ethan", "maya", "alex", "nia",
  ];

  it("the approved list is exactly the workers the controlled record names", () => {
    const approved = listWorkers().filter(w => w.specificationStatus === "approved").map(w => w.id);
    expect(approved.sort()).toEqual([...APPROVED_31_AUGUST].sort());
  });

  it("execution authority is opened by the register and by nothing else", () => {
    // Every executable worker must ALSO carry the deployment-channel
    // decision. Approval alone has never been enough, and that is the
    // property worth keeping now that thirteen workers are approved.
    for (const w of listWorkers()) {
      if (!w.staffPortalExecutionAuthorised) continue;
      expect(w.specificationStatus, `${w.id} executes without an approved specification`).toBe("approved");
      expect(w.staffPortalExecutionStatus, `${w.id} executes without a channel decision`).toBe(
        "staff_portal_authorised",
      );
    }
  });

  it("no worker has connector or write authorisation, whatever its approval status", () => {
    // The activation opened execution. It opened no credential, and this
    // is the test that would fail if a future change conflated them again.
    for (const w of listWorkers()) {
      expect(w.connectorUseAuthorised, `${w.id}`).toBe(false);
      expect(w.writesAuthorised, `${w.id}`).toBe(false);
    }
  });

  it("Priya is approved for a bounded scope, with regulated advice still shut", () => {
    const priya = getWorker("priya");
    expect(priya.specificationStatus).toBe("approved");
    const regulated = priya.capabilities.find(c => c.id === "regulated_advice")!;
    expect(regulated.unavailableBecause).not.toBeNull();
    expect(priya.currentNextControl).toMatch(/AB-P04/);
  });

  it("every worker that is live names what it still cannot do", () => {
    // A worker with every capability open and nothing recorded as
    // unavailable would be the shape of an activation that quietly
    // widened a remit. Sophie aside, each live worker keeps a named
    // restriction or an empty blocker list it has earned.
    for (const w of listWorkers()) {
      if (!w.staffPortalExecutionAuthorised) continue;
      for (const capability of w.capabilities) {
        if (capability.unavailableBecause !== null) {
          expect(capability.unavailableBecause.length, `${w.id}/${capability.id}`).toBeGreaterThan(15);
        }
      }
    }
  });

  it("records the estate-level next control as Tom's approval, the Gatekeeper review having passed", () => {
    expect(ESTATE_LEVEL_NEXT_CONTROL).toMatch(/gatekeeper review passed/i);
    expect(ESTATE_LEVEL_NEXT_CONTROL).toMatch(/no additional .* self-approval/i);
  });
});

describe("Gatekeeper review currency — stale 'review pending' text cannot return", () => {
  const REVIEWED: WorkerId[] = [
    "sophie", "daniel", "amelia", "oliver", "james", "priya",
    "harper", "olivia", "grace", "ethan", "maya", "alex",
  ];

  it("no Gatekeeper-reviewed worker claims the review is still pending", () => {
    for (const id of REVIEWED) {
      const w = getWorker(id);
      const text = [w.currentNextControl, ...w.materialBlockers].join(" ");
      expect(
        /gatekeeper[^.]{0,40}pending|independent governance & assurance review\b(?![^.]*passed)/i.test(text),
        `${id} still records the independent Gatekeeper review as an outstanding control`,
      ).toBe(false);
    }
  });

  it("every Gatekeeper-reviewed worker records that it passed", () => {
    for (const id of REVIEWED) {
      expect(getWorker(id).gatekeeperReview).toBe("passed_cleared_for_approval");
    }
  });

  it("Nia is pending review, because she was created after it", () => {
    expect(getWorker("nia").gatekeeperReview).toBe("pending");
    expect(getWorker("nia").materialBlockers.join(" ")).toMatch(/governance & assurance review pending/i);
  });
});

/**
 * Priya's boundary after the 31 August activation. Research is open and
 * determination is not, so this checks both halves: a test that only
 * confirmed she was live would pass if the boundary were removed.
 */
describe("Priya — research is open, determination is not", () => {
  const capability = (id: string) => getWorker("priya").capabilities.find(c => c.id === id)!;

  it("official rule research is available", () => {
    expect(capability("rules_explanation").unavailableBecause).toBeNull();
  });

  it("case preparation is available", () => {
    expect(capability("case_preparation").unavailableBecause).toBeNull();
  });

  it("regulated advice stays blocked, naming AB-P04", () => {
    const regulated = capability("regulated_advice");
    expect(regulated.unavailableBecause).not.toBeNull();
    expect(regulated.unavailableBecause).toMatch(/AB-P04/);
  });

  it("neither open capability needs a connector, so neither is a hidden credential grant", () => {
    expect(capability("rules_explanation").requiresConnector).toBeNull();
    expect(capability("case_preparation").requiresConnector).toBeNull();
  });
});
