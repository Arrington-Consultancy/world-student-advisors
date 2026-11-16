/**
 * Manager Attention, next-action intelligence and notification discipline.
 * Clauses 20, 22, 28 and 29 of the WSA AI Operational Standard v1.0.
 */
import { describe, it, expect } from "vitest";
import {
  collectAttentionItems, buildManagerAttention, determineNextAction,
  type AttentionInput,
} from "./managerAttention";
import type { Escalation } from "./escalation";
import type { Milestone } from "./timeline";
import type { StaffAccessProfile } from "../access/accessControl";

const NOW = new Date("2026-08-30T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (d: number) => new Date(NOW.getTime() + d * DAY);

function profile(o: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1, baseAccessLevel: 1,
    functionalScopes: ["admissions", "operations", "safeguarding", "executive", "governance"],
    caseScope: "organisation", actionPermissions: ["read", "approve"], sensitiveOverlays: [],
    temporaryGrants: [], status: "active", teamId: null,
    assignedByStaffUserId: null, assignedAt: null, assignmentReason: null, ...o,
  };
}

function escalation(o: Partial<Escalation> = {}): Escalation {
  return {
    escalationId: "ESC-1", reason: "worker_disagreement",
    decisionRequired: "Decide whether to submit early.", caseId: "c1",
    functionalScope: "admissions", workersInvolved: ["james"], raisedAt: at(-1),
    ownerStaffUserId: null, status: "open", outcome: null,
    decidedByStaffUserId: null, decidedAt: null, learningCaptured: false, ...o,
  };
}

function milestone(o: Partial<Milestone> = {}): Milestone {
  return {
    milestoneId: "M1", caseId: "c1", description: "Interview preparation complete",
    dueAt: at(-10), completedAt: null, material: true,
    humanOwnerStaffUserId: 5, specialistWorkerId: "olivia", ...o,
  };
}

function input(o: Partial<AttentionInput> = {}): AttentionInput {
  return {
    escalations: [], pendingApprovals: [], permissionRequests: [],
    blockedCases: [], milestones: [], unroutedEscalationIds: [], ...o,
  };
}

describe("§29 nothing on track produces an item", () => {
  it("returns nothing when there is nothing outstanding", () => {
    expect(collectAttentionItems(input(), NOW)).toEqual([]);
  });

  it("ignores a decided escalation", () => {
    const items = collectAttentionItems(input({ escalations: [escalation({ status: "decided" })] }), NOW);
    expect(items).toEqual([]);
  });

  it("ignores a milestone that is not yet due", () => {
    const items = collectAttentionItems(input({ milestones: [milestone({ dueAt: at(5) })] }), NOW);
    expect(items).toEqual([]);
  });

  it("ignores trivially late work", () => {
    const items = collectAttentionItems(input({ milestones: [milestone({ dueAt: at(-1) })] }), NOW);
    expect(items).toEqual([]);
  });

  it("ignores an immaterial milestone however late", () => {
    const items = collectAttentionItems(input({ milestones: [milestone({ dueAt: at(-90), material: false })] }), NOW);
    expect(items).toEqual([]);
  });

  it("reports the view as clear when a manager has nothing to do", () => {
    const view = buildManagerAttention(profile(), input(), NOW);
    expect(view.clear).toBe(true);
    expect(view.items).toEqual([]);
  });
});

describe("§20 everything genuinely needing a human appears", () => {
  it("surfaces an unresolved escalation", () => {
    const items = collectAttentionItems(input({ escalations: [escalation()] }), NOW);
    expect(items).toHaveLength(1);
    expect(items[0].actionRequired).toBe("Decide whether to submit early.");
  });

  it("surfaces a consequential action awaiting approval", () => {
    const items = collectAttentionItems(input({
      pendingApprovals: [{ approvalId: "AP-1", caseId: "c1", functionalScope: "admissions", action: "submit the application", requestedAt: at(-2), workersInvolved: ["james"] }],
    }), NOW);
    expect(items[0].kind).toBe("consequential_action_awaiting_approval");
    expect(items[0].actionRequired).toMatch(/Approve or reject/);
  });

  it("surfaces a permission request", () => {
    const items = collectAttentionItems(input({
      permissionRequests: [{ requestId: "PR-1", subjectStaffUserId: 9, functionalScope: "admissions", requested: "export_download", reason: "monthly reporting", requestedAt: at(-1) }],
    }), NOW);
    expect(items[0].kind).toBe("permission_request");
  });

  it("surfaces a blocked case", () => {
    const items = collectAttentionItems(input({
      blockedCases: [{ caseId: "c2", functionalScope: "admissions", blockedReason: "no passport copy", blockedSince: at(-4) }],
    }), NOW);
    expect(items[0].kind).toBe("blocked_case");
  });

  it("surfaces material slippage past the trivial threshold", () => {
    const items = collectAttentionItems(input({ milestones: [milestone({ dueAt: at(-10) })] }), NOW);
    expect(items[0].kind).toBe("high_risk_delay");
    expect(items[0].summary).toMatch(/critical/);
  });
});

describe("§18 and §20 an unrouted escalation is the most urgent thing there is", () => {
  it("ranks an unrouted escalation above everything else", () => {
    const items = collectAttentionItems(input({
      escalations: [escalation({ escalationId: "ESC-9", reason: "safeguarding_concern", functionalScope: "safeguarding" }), escalation()],
      unroutedEscalationIds: ["ESC-9"],
      milestones: [milestone({ dueAt: at(-30) })],
    }), NOW);
    expect(items[0].kind).toBe("unrouted_escalation");
    expect(items[0].summary).toMatch(/could not be routed/);
  });
});

describe("§28 notification discipline", () => {
  it("keeps a routine matter in the portal only", () => {
    const items = collectAttentionItems(input({
      permissionRequests: [{ requestId: "PR-1", subjectStaffUserId: 9, functionalScope: "admissions", requested: "read", reason: "x", requestedAt: NOW }],
    }), NOW);
    expect(items[0].channel).toBe("portal_only");
  });

  it("notifies an important matter", () => {
    const items = collectAttentionItems(input({ escalations: [escalation({ raisedAt: at(-2) })] }), NOW);
    expect(items[0].channel).toBe("notification");
  });

  it("uses a direct alert for an urgent, high-risk matter", () => {
    const items = collectAttentionItems(input({
      escalations: [escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" })],
    }), NOW);
    expect(items[0].channel).toBe("direct_alert");
  });

  it("never removes an item from the view because of its channel", () => {
    const view = buildManagerAttention(profile({ sensitiveOverlays: ["safeguarding"] }), input({
      permissionRequests: [{ requestId: "PR-1", subjectStaffUserId: 9, functionalScope: "admissions", requested: "read", reason: "x", requestedAt: NOW }],
      escalations: [escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" })],
    }), NOW);
    expect(view.items).toHaveLength(2);
    expect(view.items.map(i => i.channel)).toContain("portal_only");
  });
});

describe("§29 the attention view respects the same access model as any read", () => {
  it("withholds an item outside the manager's functional scope", () => {
    const view = buildManagerAttention(profile({ functionalScopes: ["finance"] }), input({ escalations: [escalation()] }), NOW);
    expect(view.items).toEqual([]);
    expect(view.withheldCount).toBe(1);
  });

  it("withholds a safeguarding escalation from a manager with no overlay", () => {
    const view = buildManagerAttention(
      profile({ sensitiveOverlays: [] }),
      input({ escalations: [escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" })] }),
      NOW,
    );
    expect(view.items).toEqual([]);
    expect(view.withheldCount).toBe(1);
  });

  it("shows it to a manager who holds the overlay", () => {
    const view = buildManagerAttention(
      profile({ baseAccessLevel: 2, sensitiveOverlays: ["safeguarding"] }),
      input({ escalations: [escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" })] }),
      NOW,
    );
    expect(view.items).toHaveLength(1);
    expect(view.withheldCount).toBe(0);
  });

  it("shows a disabled manager nothing at all", () => {
    const view = buildManagerAttention(profile({ status: "disabled" }), input({ escalations: [escalation()] }), NOW);
    expect(view.items).toEqual([]);
    expect(view.withheldCount).toBe(1);
  });
});

describe("§22 next-action intelligence", () => {
  it("names the next milestone and routes it to the owning specialist", () => {
    const n = determineNextAction({
      caseId: "c1", blockers: [], openEscalations: [],
      milestones: [milestone({ milestoneId: "later", dueAt: at(20) }), milestone({ milestoneId: "next", dueAt: at(3), description: "Confirm CAS" })],
    }, NOW);
    expect(n?.action).toBe("Confirm CAS");
    expect(n?.routeToWorkerId).toBe("olivia");
  });

  it("reports the human decision that is blocking instead of naming a task", () => {
    const n = determineNextAction({
      caseId: "c1", blockers: [], openEscalations: [escalation()],
      milestones: [milestone({ dueAt: at(3) })],
    }, NOW);
    expect(n?.blockedOnHuman).toBe("Decide whether to submit early.");
    expect(n?.routeToWorkerId).toBeNull();
  });

  it("prefers the oldest waiting decision", () => {
    const n = determineNextAction({
      caseId: "c1", blockers: [], milestones: [],
      openEscalations: [
        escalation({ escalationId: "new", raisedAt: at(-1), decisionRequired: "newer" }),
        escalation({ escalationId: "old", raisedAt: at(-9), decisionRequired: "older" }),
      ],
    }, NOW);
    expect(n?.blockedOnHuman).toBe("older");
  });

  it("reports a blocker when no escalation is open", () => {
    const n = determineNextAction({ caseId: "c1", blockers: ["Awaiting passport copy"], openEscalations: [], milestones: [milestone({ dueAt: at(3) })] }, NOW);
    expect(n?.blockedOnHuman).toBe("Awaiting passport copy");
  });

  it("returns nothing when there is genuinely nothing outstanding", () => {
    const n = determineNextAction({ caseId: "c1", blockers: [], openEscalations: [], milestones: [milestone({ completedAt: at(-1) })] }, NOW);
    expect(n).toBeNull();
  });
});
