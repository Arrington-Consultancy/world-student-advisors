import { describe, it, expect } from "vitest";
import { listWorkers, getWorker, deriveAuthorisation } from "./registry";
import { evaluateStaffPortalExecutionPermission, evaluateConnectorPermission } from "./permissions";
import { getStatusDisplay } from "../../client/src/components/workforce/statusDisplay";

const CASE_WORKERS = [
  "sophie", "daniel", "amelia", "oliver", "james", "priya",
  "harper", "olivia", "grace", "ethan", "maya", "alex", "nia",
] as const;

describe("execution authority and connector authority are separate questions", () => {
  it("lets an approved worker execute with every connector still closed", () => {
    // The conflation this fixes: the whole estate read as unusable
    // because no connector credential exists, when Sophie's approved
    // function runs from staff input and controlled evidence.
    expect(evaluateStaffPortalExecutionPermission("sophie").allowed).toBe(true);
    for (const connector of ["sharepoint", "google_drive", "pipedrive"] as const) {
      const d = evaluateConnectorPermission({
        workerId: "sophie",
        connector,
        operation: "read",
        resourceScope: "test",
      });
      expect(d.allowed).toBe(false);
    }
  });

  it("still refuses execution for every worker the register has not approved", () => {
    for (const id of CASE_WORKERS) {
      if (id === "sophie") continue;
      expect(evaluateStaffPortalExecutionPermission(id).allowed).toBe(false);
    }
  });

  it("grants no worker any connector or write authority", () => {
    for (const w of listWorkers()) {
      expect(w.connectorUseAuthorised).toBe(false);
      expect(w.writesAuthorised).toBe(false);
    }
  });

  it("requires both halves: approval alone does not authorise execution", () => {
    // Tested directly, because Sophie is the only approved worker and a
    // rule that happens to agree with her single row is not a rule.
    expect(deriveAuthorisation("approved", "staff_portal_authorised").staffPortalExecutionAuthorised).toBe(true);
    expect(deriveAuthorisation("approved", "pending_channel_decision").staffPortalExecutionAuthorised).toBe(false);
    expect(deriveAuthorisation("approved", "prohibited").staffPortalExecutionAuthorised).toBe(false);
    expect(deriveAuthorisation("not_approved", "staff_portal_authorised").staffPortalExecutionAuthorised).toBe(false);
    expect(deriveAuthorisation("approval_blocked", "staff_portal_authorised").staffPortalExecutionAuthorised).toBe(false);
  });

  it("never derives connector authority from execution authority", () => {
    for (const spec of ["approved", "not_approved", "approval_blocked"] as const) {
      const d = deriveAuthorisation(spec, "staff_portal_authorised");
      expect(d.connectorUseAuthorised).toBe(false);
      expect(d.writesAuthorised).toBe(false);
    }
  });

  it("derives execution from the two controlled statuses, not from a flag set by hand", () => {
    for (const w of listWorkers()) {
      const expected = w.specificationStatus === "approved" && w.staffPortalExecutionStatus === "staff_portal_authorised";
      expect(w.staffPortalExecutionAuthorised).toBe(expected);
    }
  });
});

describe("the Gatekeeper review is recorded as done where it is done", () => {
  it("marks the twelve workers the Gatekeeper Result inspected as cleared", () => {
    // WSA_Governance_Assurance_Gatekeeper_Review_Result_v1.0, 29 August:
    // AMBER, no system-wide STOP, packet cleared to proceed to Tom.
    for (const id of CASE_WORKERS) {
      if (id === "nia") continue;
      expect(getWorker(id).gatekeeperReview).toBe("passed_cleared_for_approval");
    }
  });

  it("leaves Nia pending, because she was created after that review", () => {
    expect(getWorker("nia").gatekeeperReview).toBe("pending");
  });

  it("treats governance and infrastructure functions as not applicable", () => {
    for (const id of ["wsa_core_brain", "wsa_governance_assurance", "staff_receptionist"] as const) {
      expect(getWorker(id).gatekeeperReview).toBe("not_applicable");
    }
  });
});

describe("a missing connector disables a capability, not a worker", () => {
  it("gives every case worker at least one capability that needs no connector", () => {
    for (const id of CASE_WORKERS) {
      const w = getWorker(id);
      expect(w.capabilities.length).toBeGreaterThan(0);
      expect(w.capabilities.some(c => c.worksWithoutConnector)).toBe(true);
    }
  });

  it("names a reason for every capability that is switched off", () => {
    for (const w of listWorkers()) {
      for (const c of w.capabilities) {
        if (!c.worksWithoutConnector) {
          expect(c.unavailableBecause).not.toBeNull();
          expect((c.unavailableBecause ?? "").length).toBeGreaterThan(15);
        }
      }
    }
  });

  it("keeps Sophie's connector-dependent capability off while she is live", () => {
    const sophie = getWorker("sophie");
    expect(sophie.staffPortalExecutionAuthorised).toBe(true);
    const record = sophie.capabilities.find(c => c.requiresConnector === "sharepoint");
    expect(record?.unavailableBecause).toContain("not configured");
  });
});

describe("the portal describes the real state", () => {
  const display = (id: (typeof CASE_WORKERS)[number]) => {
    const w = getWorker(id);
    return getStatusDisplay({
      specificationStatus: w.specificationStatus,
      staffPortalExecutionStatus: w.staffPortalExecutionStatus,
      canOpenForLiveExecution: w.staffPortalExecutionAuthorised,
      gatekeeperReview: w.gatekeeperReview,
      unavailableCapabilities: w.capabilities.filter(c => c.unavailableBecause).map(c => c.name),
    });
  };

  it("shows Sophie as Limited, not as unusable, while one capability is off", () => {
    const d = display("sophie");
    expect(d.label).toBe("Limited");
    expect(d.tone).toBe("limited");
    expect(d.detail).toContain("Working");
  });

  it("never calls a Gatekeeper-cleared worker In design", () => {
    // The defect that prompted this: ten workers waiting on Tom were
    // labelled as though they were still being drafted.
    for (const id of CASE_WORKERS) {
      if (id === "nia" || id === "priya" || id === "sophie") continue;
      const d = display(id);
      expect(d.label).toBe("Awaiting approval");
      expect(d.label).not.toBe("In design");
    }
  });

  it("shows Priya as Blocked, distinct from awaiting approval", () => {
    expect(display("priya").label).toBe("Blocked");
  });

  it("shows Nia as In design, because she has not been independently reviewed", () => {
    expect(display("nia").label).toBe("In design");
  });

  it("never shows Live for a worker that cannot execute", () => {
    for (const id of CASE_WORKERS) {
      const w = getWorker(id);
      const d = display(id);
      if (!w.staffPortalExecutionAuthorised) {
        expect(d.label).not.toBe("Live");
        expect(d.label).not.toBe("Limited");
      }
    }
  });
});
