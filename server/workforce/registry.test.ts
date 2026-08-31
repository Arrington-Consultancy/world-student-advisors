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

describe("controlled approval status — Sophie is the only approved worker", () => {
  it("Sophie is the only worker with specificationStatus approved", () => {
    const approved = listWorkers().filter(w => w.specificationStatus === "approved");
    expect(approved.map(w => w.id)).toEqual(["sophie"]);
  });

  it("Priya is specifically approval_blocked, not merely not_approved", () => {
    expect(getWorker("priya").specificationStatus).toBe("approval_blocked");
  });

  it("every case-working specialist besides Sophie is not_approved or approval_blocked", () => {
    const specialists: WorkerId[] = ["daniel", "amelia", "oliver", "james", "priya", "harper", "olivia", "grace", "ethan", "maya", "alex"];
    for (const id of specialists) {
      const w = getWorker(id);
      expect(["not_approved", "approval_blocked"]).toContain(w.specificationStatus);
    }
  });

  it("authorises live execution only where the register does, which today is Sophie alone", () => {
    const authorised = listWorkers().filter(w => w.staffPortalExecutionAuthorised).map(w => w.id);
    expect(authorised).toEqual(["sophie"]);
  });

  it("Sophie's staff portal execution status records the resolved deployment-channel decision", () => {
    expect(getWorker("sophie").staffPortalExecutionStatus).toBe("staff_portal_authorised");
  });

  it("no worker has connector or write authorisation — no live credentials exist yet", () => {
    for (const w of listWorkers()) {
      expect(w.connectorUseAuthorised).toBe(false);
      expect(w.writesAuthorised).toBe(false);
    }
  });

  it("records the estate-level next control as Tom's approval, the Gatekeeper review having passed", () => {
    expect(ESTATE_LEVEL_NEXT_CONTROL).toMatch(/gatekeeper review passed/i);
    expect(ESTATE_LEVEL_NEXT_CONTROL).toMatch(/next control: tom arrington's consolidated approval decision/i);
    expect(ESTATE_LEVEL_NEXT_CONTROL).toMatch(/no additional .* self-approval/i);
  });
});

/**
 * The 29 August 2026 Gatekeeper Result inspected twelve worker documents
 * by name and cleared them to proceed to Tom. Register v0.42's per-worker
 * next-control lines still said that review was the next control, and the
 * portal repeated it to staff, describing ten cleared workers as still in
 * design.
 *
 * Nia is the one legitimate exception: she was created on 30 August, after
 * the review, so hers genuinely is pending. Naming her explicitly is the
 * point — a test that allowed any worker to claim a pending Gatekeeper
 * review would not have caught the stale text in the first place.
 */
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
 * Priya's bounded rule-explanation capability is the one the directive
 * asked about specifically. It is defined, it is genuinely useful, and it
 * is off — for a reason that is not the missing connector. This test
 * exists so nobody quietly opens it by nulling a field.
 */
describe("Priya — the bounded capability is defined and blocked for the right reason", () => {
  const rules = () => {
    const c = getWorker("priya").capabilities.find(x => x.id === "rules_explanation");
    if (!c) throw new Error("Priya's rules_explanation capability is missing");
    return c;
  };

  it("is unavailable", () => {
    expect(rules().unavailableBecause).not.toBeNull();
  });

  it("is blocked by AB-P03 and AB-P01, not by a connector", () => {
    const reason = rules().unavailableBecause ?? "";
    expect(reason).toMatch(/AB-P03/);
    expect(reason).toMatch(/AB-P01/);
    expect(rules().requiresConnector).toBeNull();
    expect(reason).not.toMatch(/connector/i);
  });

  it("Priya's regulated-advice capability stays blocked irrespective of those two decisions", () => {
    const regulated = getWorker("priya").capabilities.find(x => x.id === "regulated_advice");
    expect(regulated?.unavailableBecause).not.toBeNull();
  });
});
