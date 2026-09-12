import { describe, it, expect } from "vitest";
import { DEFAULT_ACCESS, DEFAULT_ACCESS_IN_FORCE, DEFAULT_ACCESS_NOTICE, DEFAULT_ACCESS_SOURCE, DEFAULT_GRANTS_EVERYTHING } from "./accessDefault";
import { buildProfile } from "./identity";
import { ACTION_PERMISSIONS, CONSEQUENTIAL_ACTIONS, FUNCTIONAL_SCOPES, SENSITIVE_OVERLAYS } from "./accessControl";

/**
 * Tom Arrington, 12 September 2026, on Tim Hunt's request: full access by
 * default. These tests state exactly what that means, so the breadth is
 * visible in the record rather than implied, and so narrowing it later is
 * a deliberate act that shows up as a failing test rather than a drift.
 */
function row(over: Record<string, unknown> = {}) {
  return {
    id: 7,
    isActive: 1,
    baseAccessLevel: null,
    caseScope: null,
    accessStatus: null,
    teamId: null,
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...over,
  } as never;
}

describe("what the default actually grants", () => {
  it("is the whole standard: every functional scope, every action, every overlay, organisation scope, level 1", () => {
    expect(DEFAULT_ACCESS_IN_FORCE).toBe(true);
    expect(DEFAULT_GRANTS_EVERYTHING).toBe(true);
    expect(DEFAULT_ACCESS.baseAccessLevel).toBe(1);
    expect(DEFAULT_ACCESS.caseScope).toBe("organisation");
    expect([...DEFAULT_ACCESS.functionalScopes].sort()).toEqual([...FUNCTIONAL_SCOPES].sort());
    expect([...DEFAULT_ACCESS.actionPermissions].sort()).toEqual([...ACTION_PERMISSIONS].sort());
    expect([...DEFAULT_ACCESS.sensitiveOverlays].sort()).toEqual([...SENSITIVE_OVERLAYS].sort());
  });

  it("includes the consequential actions and the sensitive overlays, which is the part that was put to Tom explicitly", () => {
    for (const action of CONSEQUENTIAL_ACTIONS) expect(DEFAULT_ACCESS.actionPermissions).toContain(action);
    for (const overlay of ["visa_regulated", "finance", "hr_staff_private", "credentials_security"] as const) {
      expect(DEFAULT_ACCESS.sensitiveOverlays).toContain(overlay);
    }
  });

  it("says so in words a colleague can read, without the reader having to open the code", () => {
    expect(DEFAULT_ACCESS_NOTICE).toContain("without an explicit assignment");
    expect(DEFAULT_ACCESS_NOTICE).toMatch(/credential administration/);
    expect(DEFAULT_ACCESS_SOURCE).toContain("Tom Arrington");
    expect(DEFAULT_ACCESS_SOURCE).toContain("12 September 2026");
  });
});

describe("an assignment still wins, and a closed account stays closed", () => {
  it("an explicit narrower assignment is not widened by the default", () => {
    const result = buildProfile(row({ baseAccessLevel: 4, caseScope: "own_applicants", accessStatus: "active" }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.profile.assignmentSource).toBe("explicit");
      expect(result.profile.baseAccessLevel).toBe(4);
      expect(result.profile.caseScope).toBe("own_applicants");
      expect(result.profile.actionPermissions).toEqual([]);
      expect(result.profile.sensitiveOverlays).toEqual([]);
    }
  });

  it("an explicit suspension is honoured", () => {
    const result = buildProfile(row({ baseAccessLevel: 1, caseScope: "organisation", accessStatus: "suspended" }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.status).toBe("suspended");
  });

  it("an inactive staff row holds nothing, assignment or not", () => {
    expect(buildProfile(row({ isActive: 0 }), [])).toMatchObject({ resolved: false, reason: "no_access_assignment" });
    const assigned = buildProfile(row({ isActive: 0, baseAccessLevel: 1, caseScope: "organisation", accessStatus: "active" }), []);
    expect(assigned.resolved).toBe(true);
    if (assigned.resolved) expect(assigned.profile.status).toBe("disabled");
  });

  it("an unassigned active account is marked as holding default access, not as somebody's decision", () => {
    const result = buildProfile(row(), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.profile.assignmentSource).toBe("default");
      expect(result.profile.assignedByStaffUserId).toBeNull();
      expect(result.profile.assignedAt).toBeNull();
    }
  });
});
