/**
 * Escalation routing, ownership and closure tests.
 * Clauses 18 and 19 of the WSA AI Operational Standard v1.0.
 */
import { describe, it, expect } from "vitest";
import {
  routeEscalation,
  validateEscalation,
  isAwaitingHuman,
  minimumLevelForReason,
  type CandidateRecipient,
  type Escalation,
} from "./escalation";
import type { AccessLevel, ActionPermission, FunctionalScope, SensitiveOverlay, StaffAccessProfile } from "../access/accessControl";

const NOW = new Date("2026-08-30T12:00:00.000Z");

function profile(o: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1,
    baseAccessLevel: 1,
    functionalScopes: ["safeguarding", "admissions", "executive"],
    caseScope: "organisation",
    actionPermissions: ["read", "approve"],
    sensitiveOverlays: [],
    temporaryGrants: [],
    status: "active",
    teamId: null,
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...o,
  };
}

function candidate(staffUserId: number, displayName: string, o: Partial<StaffAccessProfile> = {}): CandidateRecipient {
  return { staffUserId, displayName, profile: profile({ staffUserId, ...o }) };
}

function escalation(o: Partial<Escalation> = {}): Escalation {
  return {
    escalationId: "ESC-1",
    reason: "worker_disagreement",
    decisionRequired: "Decide whether to submit before the visa evidence lands.",
    caseId: "case-1",
    functionalScope: "admissions",
    workersInvolved: ["james", "priya"],
    raisedAt: NOW,
    ownerStaffUserId: null,
    status: "open",
    outcome: null,
    decidedByStaffUserId: null,
    decidedAt: null,
    learningCaptured: false,
    ...o,
  };
}

describe("§18 routing needs authorised AND relevant, not just senior", () => {
  it("routes to a candidate authorised for the scope and able to decide", () => {
    const r = routeEscalation(escalation(), [candidate(10, "Manager A")], NOW);
    expect(r.unroutable).toBe(false);
    expect(r.recipients.map(x => x.staffUserId)).toEqual([10]);
  });

  it("excludes a candidate without the functional scope", () => {
    const r = routeEscalation(escalation(), [candidate(10, "Wrong lane", { functionalScopes: ["finance"] })], NOW);
    expect(r.unroutable).toBe(true);
    expect(r.excluded[0].staffUserId).toBe(10);
  });

  it("excludes a reader who cannot decide", () => {
    const r = routeEscalation(escalation(), [candidate(10, "Reader", { actionPermissions: ["read"] })], NOW);
    expect(r.unroutable).toBe(true);
    expect(r.excluded[0].reason).toMatch(/cannot decide it/);
  });

  it("accepts access_admin as an ability to decide", () => {
    const r = routeEscalation(escalation(), [candidate(10, "Access admin", { actionPermissions: ["read", "access_admin"] })], NOW);
    expect(r.unroutable).toBe(false);
  });

  it("alerts more than one human where several are authorised and relevant", () => {
    const r = routeEscalation(escalation(), [candidate(10, "A"), candidate(11, "B")], NOW);
    expect(r.recipients.map(x => x.staffUserId).sort()).toEqual([10, 11]);
  });

  it("excludes a disabled account however senior", () => {
    const r = routeEscalation(escalation(), [candidate(10, "Leaver", { status: "disabled" })], NOW);
    expect(r.unroutable).toBe(true);
    expect(r.excluded[0].reason).toMatch(/not active/);
  });
});

describe("§18 sensitive escalations need the matching overlay, not seniority", () => {
  const safeguarding = escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" });

  it("excludes a Level 1 executive who holds no safeguarding overlay", () => {
    const r = routeEscalation(safeguarding, [candidate(1, "Tom", { baseAccessLevel: 1, sensitiveOverlays: [] })], NOW);
    expect(r.unroutable).toBe(true);
    expect(r.excluded[0].reason).toMatch(/requires an explicit overlay/);
  });

  it("routes to a candidate who holds the safeguarding overlay", () => {
    const r = routeEscalation(
      safeguarding,
      [candidate(2, "Safeguarding lead", { baseAccessLevel: 2, sensitiveOverlays: ["safeguarding"] })],
      NOW,
    );
    expect(r.unroutable).toBe(false);
    expect(r.recipients[0].reason).toMatch(/safeguarding overlay/);
  });

  it("does not expose a safeguarding matter to every privileged person", () => {
    const r = routeEscalation(safeguarding, [
      candidate(1, "Executive, no overlay", { baseAccessLevel: 1 }),
      candidate(2, "Safeguarding lead", { baseAccessLevel: 2, sensitiveOverlays: ["safeguarding"] }),
    ], NOW);
    expect(r.recipients.map(x => x.staffUserId)).toEqual([2]);
    expect(r.excluded.map(x => x.staffUserId)).toEqual([1]);
  });

  const categoryCases: [Escalation["reason"], SensitiveOverlay, FunctionalScope][] = [
    ["suspected_fraud", "complaints_legal", "governance"],
    ["complaint", "complaints_legal", "quality_assurance"],
    ["data_breach", "credentials_security", "technical_administration"],
    ["regulated_immigration_matter", "visa_regulated", "visa_compliance"],
  ];

  for (const [reason, overlay, scope] of categoryCases) {
    it(`${reason} requires the ${overlay} overlay`, () => {
      const without = routeEscalation(escalation({ reason, functionalScope: scope }), [
        candidate(1, "No overlay", { functionalScopes: [scope], sensitiveOverlays: [] }),
      ], NOW);
      expect(without.unroutable).toBe(true);

      const level = minimumLevelForReason(reason) as AccessLevel;
      const withOverlay = routeEscalation(escalation({ reason, functionalScope: scope }), [
        candidate(1, "Has overlay", { baseAccessLevel: level, functionalScopes: [scope], sensitiveOverlays: [overlay] }),
      ], NOW);
      expect(withOverlay.unroutable).toBe(false);
    });
  }

  it("reports no minimum level for a reason that carries no sensitive category", () => {
    expect(minimumLevelForReason("worker_disagreement")).toBeNull();
  });
});

describe("§18 an unroutable escalation stays open rather than being downgraded", () => {
  it("reports unroutable with no recipients", () => {
    const r = routeEscalation(escalation({ reason: "safeguarding_concern", functionalScope: "safeguarding" }), [], NOW);
    expect(r.unroutable).toBe(true);
    expect(r.recipients).toEqual([]);
    expect(r.reason).toMatch(/stays open and unrouted/);
  });

  it("keeps every exclusion auditable", () => {
    const r = routeEscalation(escalation(), [
      candidate(10, "Wrong lane", { functionalScopes: ["finance"] }),
      candidate(11, "Reader", { actionPermissions: ["read"] }),
    ], NOW);
    expect(r.excluded).toHaveLength(2);
    expect(r.excluded.every(x => x.reason.length > 0)).toBe(true);
  });
});

describe("§19 escalations carry an owner and a real closure", () => {
  it("accepts a well-formed open escalation", () => {
    expect(validateEscalation(escalation()).valid).toBe(true);
  });

  it("rejects an escalation that does not say what needs deciding", () => {
    const v = validateEscalation(escalation({ decisionRequired: "  " }));
    expect(v.problems).toContain("Escalation does not say what needs deciding.");
  });

  it("rejects an escalation recording no workers involved", () => {
    const v = validateEscalation(escalation({ workersInvolved: [] }));
    expect(v.problems).toContain("Escalation records no workers involved.");
  });

  it("rejects an open escalation that already carries an outcome", () => {
    const v = validateEscalation(escalation({ outcome: "Resolved somehow" }));
    expect(v.valid).toBe(false);
  });

  it("requires an owner once acknowledged", () => {
    const v = validateEscalation(escalation({ status: "acknowledged", ownerStaffUserId: null }));
    expect(v.problems).toContain("An acknowledged escalation must have an owner.");
  });

  it("refuses a closure with no owner, outcome or decider", () => {
    const v = validateEscalation(escalation({ status: "closed" }));
    expect(v.valid).toBe(false);
    expect(v.problems).toHaveLength(4);
  });

  it("accepts a properly closed escalation", () => {
    const v = validateEscalation(escalation({
      status: "closed",
      ownerStaffUserId: 10,
      outcome: "Held submission until the visa evidence arrived.",
      decidedByStaffUserId: 10,
      decidedAt: new Date(NOW.getTime() + 3600_000),
    }));
    expect(v.valid).toBe(true);
  });

  it("rejects an escalation decided before it was raised", () => {
    const v = validateEscalation(escalation({
      status: "decided",
      ownerStaffUserId: 10,
      outcome: "x",
      decidedByStaffUserId: 10,
      decidedAt: new Date(NOW.getTime() - 3600_000),
    }));
    expect(v.problems).toContain("Escalation was decided before it was raised.");
  });
});

describe("awaiting-human state feeds Manager Attention", () => {
  it("open and acknowledged still need a human", () => {
    expect(isAwaitingHuman(escalation({ status: "open" }))).toBe(true);
    expect(isAwaitingHuman(escalation({ status: "acknowledged" }))).toBe(true);
  });

  it("decided and closed do not", () => {
    expect(isAwaitingHuman(escalation({ status: "decided" }))).toBe(false);
    expect(isAwaitingHuman(escalation({ status: "closed" }))).toBe(false);
  });
});
