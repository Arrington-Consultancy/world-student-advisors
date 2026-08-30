/**
 * Identity resolution tests — the pure half (buildProfile, assembleGrants).
 *
 * These exercise every way a stored access assignment can be missing,
 * partial or wrong, and assert that each one denies rather than degrading
 * into a smaller working profile. No database is touched.
 */
import { describe, it, expect } from "vitest";
import { assembleGrants, buildProfile, type StaffAccessRow } from "./identity";
import { evaluateAccess } from "./accessControl";

const NOW = new Date("2026-08-30T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function row(overrides: Partial<StaffAccessRow> = {}): StaffAccessRow {
  return {
    id: 1,
    isActive: 1,
    baseAccessLevel: 4,
    caseScope: "assigned_caseload",
    accessStatus: "active",
    teamId: "admissions",
    assignedByStaffUserId: 1,
    assignedAt: new Date("2026-08-30T00:00:00.000Z"),
    assignmentReason: "Access Control Standard v1.0",
    ...overrides,
  };
}

function grantRow(overrides: Partial<Parameters<typeof assembleGrants>[0][number]> = {}) {
  return {
    grantType: "functional_scope",
    value: "admissions",
    expiresAt: null as Date | null,
    grantedByStaffUserId: 1,
    reason: "Standing assignment",
    grantedAt: new Date("2026-08-30T00:00:00.000Z"),
    ...overrides,
  };
}

describe("buildProfile denies rather than degrading", () => {
  it("resolves a complete assignment", () => {
    const result = buildProfile(row(), [grantRow(), grantRow({ grantType: "action_permission", value: "read" })]);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.profile.baseAccessLevel).toBe(4);
      expect(result.profile.functionalScopes).toEqual(["admissions"]);
      expect(result.profile.actionPermissions).toEqual(["read"]);
      expect(result.profile.status).toBe("active");
    }
  });

  it("refuses an account with no access assignment at all", () => {
    const result = buildProfile(row({ baseAccessLevel: null, caseScope: null, accessStatus: null }), []);
    expect(result).toMatchObject({ resolved: false, reason: "no_access_assignment" });
  });

  it("refuses an out-of-range level rather than clamping it", () => {
    for (const bad of [0, 6, -1, 99]) {
      expect(buildProfile(row({ baseAccessLevel: bad }), [])).toMatchObject({
        resolved: false,
        reason: "invalid_access_assignment",
      });
    }
  });

  it("refuses a missing level even when the rest of the assignment is present", () => {
    expect(buildProfile(row({ baseAccessLevel: null }), [])).toMatchObject({
      resolved: false,
      reason: "invalid_access_assignment",
    });
  });

  it("refuses an unrecognised case scope rather than defaulting to the narrowest", () => {
    expect(buildProfile(row({ caseScope: "everything" }), [])).toMatchObject({
      resolved: false,
      reason: "invalid_access_assignment",
    });
  });

  it("resolves an inactive staff row to a disabled profile, so the model produces the denial", () => {
    const result = buildProfile(row({ isActive: 0 }), [
      grantRow({ grantType: "action_permission", value: "read" }),
      grantRow(),
    ]);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.profile.status).toBe("disabled");
      expect(
        evaluateAccess(result.profile, { action: "read", functionalScope: "admissions" }, NOW),
      ).toMatchObject({ allowed: false, deniedDimension: "account_status" });
    }
  });

  it("treats an unrecognised accessStatus as disabled", () => {
    const result = buildProfile(row({ accessStatus: "pending" }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.status).toBe("disabled");
  });

  it("treats a null accessStatus as disabled when a level is nonetheless recorded", () => {
    const result = buildProfile(row({ accessStatus: null }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.status).toBe("disabled");
  });

  it("cannot be re-enabled through accessStatus once isActive is 0", () => {
    const result = buildProfile(row({ isActive: 0, accessStatus: "active" }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.status).toBe("disabled");
  });

  it("cannot be re-enabled through isActive once accessStatus is suspended", () => {
    const result = buildProfile(row({ isActive: 1, accessStatus: "suspended" }), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.status).toBe("suspended");
  });

  it("resolves a profile holding nothing when the account has an assignment but no grants", () => {
    const result = buildProfile(row(), []);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.profile.functionalScopes).toEqual([]);
      expect(result.profile.actionPermissions).toEqual([]);
      expect(
        evaluateAccess(result.profile, { action: "read", functionalScope: "admissions" }, NOW),
      ).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
    }
  });
});

describe("assembleGrants validates stored values against the approved lists", () => {
  it("drops an unrecognised functional scope and reports it", () => {
    const assembled = assembleGrants([grantRow({ value: "student_finance" })]);
    expect(assembled.functionalScopes).toEqual([]);
    expect(assembled.droppedGrantValues).toEqual(["functional_scope:student_finance"]);
  });

  it("drops a value stored under the wrong grant type", () => {
    // "read" is a valid action permission but not a valid functional scope.
    const assembled = assembleGrants([grantRow({ grantType: "functional_scope", value: "read" })]);
    expect(assembled.functionalScopes).toEqual([]);
    expect(assembled.droppedGrantValues).toEqual(["functional_scope:read"]);
  });

  it("drops an unrecognised grant type entirely", () => {
    const assembled = assembleGrants([grantRow({ grantType: "superuser", value: "yes" })]);
    expect(assembled.droppedGrantValues).toEqual(["superuser:yes"]);
    expect(assembled.actionPermissions).toEqual([]);
  });

  it("keeps the valid grants alongside a dropped one", () => {
    const assembled = assembleGrants([
      grantRow({ grantType: "action_permission", value: "read" }),
      grantRow({ grantType: "action_permission", value: "sudo" }),
    ]);
    expect(assembled.actionPermissions).toEqual(["read"]);
    expect(assembled.droppedGrantValues).toEqual(["action_permission:sudo"]);
  });

  it("routes an expiring grant to temporaryGrants and not to the standing lists", () => {
    const assembled = assembleGrants([
      grantRow({ grantType: "action_permission", value: "export_download", expiresAt: new Date(NOW.getTime() + HOUR) }),
    ]);
    expect(assembled.actionPermissions).toEqual([]);
    expect(assembled.temporaryGrants).toHaveLength(1);
    expect(assembled.temporaryGrants[0].actionPermissions).toEqual(["export_download"]);
    expect(assembled.temporaryGrants[0].expiresAt.getTime()).toBe(NOW.getTime() + HOUR);
  });

  it("carries who, what, when and why onto every temporary grant", () => {
    const assembled = assembleGrants([
      grantRow({
        grantType: "sensitive_overlay",
        value: "finance",
        expiresAt: new Date(NOW.getTime() + HOUR),
        grantedByStaffUserId: 42,
        reason: "Month-end cover",
      }),
    ]);
    expect(assembled.temporaryGrants[0]).toMatchObject({ grantedByStaffUserId: 42, reason: "Month-end cover" });
  });

  it("does not decide expiry itself — an already-expired row still reaches the model to judge", () => {
    const assembled = assembleGrants([
      grantRow({ grantType: "action_permission", value: "approve", expiresAt: new Date(NOW.getTime() - HOUR) }),
    ]);
    expect(assembled.temporaryGrants).toHaveLength(1);
    // And the model, not this layer, is what makes it inert:
    const result = buildProfile(row(), [
      grantRow({ grantType: "action_permission", value: "approve", expiresAt: new Date(NOW.getTime() - HOUR) }),
      grantRow(),
    ]);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(evaluateAccess(result.profile, { action: "approve", functionalScope: "admissions" }, NOW)).toMatchObject({
        allowed: false,
        deniedDimension: "action_permission",
      });
    }
  });

  it("records a standing case-scope grant separately rather than applying it silently", () => {
    const assembled = assembleGrants([grantRow({ grantType: "case_scope", value: "organisation" })]);
    expect(assembled.standingCaseScope).toBe("organisation");
  });

  it("a stored case-scope grant does not change the profile's caseScope column", () => {
    const result = buildProfile(row({ caseScope: "own_applicants" }), [
      grantRow({ grantType: "case_scope", value: "organisation" }),
    ]);
    expect(result.resolved).toBe(true);
    if (result.resolved) expect(result.profile.caseScope).toBe("own_applicants");
  });
});

describe("a shared-password session holds no access profile", () => {
  it("is documented by the resolver's no_individual_identity reason", async () => {
    const { resolveStaffAccessProfile } = await import("./identity");
    const result = await resolveStaffAccessProfile(null);
    expect(result).toMatchObject({ resolved: false, reason: "no_individual_identity" });
  });
});
