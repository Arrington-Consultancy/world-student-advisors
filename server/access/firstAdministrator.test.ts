/**
 * The first-administrator bootstrap deadlock, and the rules that fix it.
 *
 * WSA hit this in production on 3 September 2026. The bootstrap established
 * a partial profile; the access screen then refused to let the only
 * administrator complete it, correctly, because nobody may administer
 * themselves; and there was no second administrator to ask. The estate was
 * stuck with an administrator who could not administer.
 *
 * The first two describe blocks reproduce BOTH walls that made it a
 * deadlock rather than an inconvenience, so neither can come back
 * unnoticed. The rest hold the boundaries of the route that breaks it.
 */
import { describe, expect, it } from "vitest";
import {
  decideAssignment,
  decideFirstAdministratorCompletion,
  type AdministratorAccess,
  type CurrentAssignment,
  type ProposedAssignment,
} from "./administration";
import {
  FIRST_ADMINISTRATOR_ACTIONS,
  FIRST_ADMINISTRATOR_CASE_SCOPE,
  FIRST_ADMINISTRATOR_LEVEL,
  FIRST_ADMINISTRATOR_SCOPES,
} from "./firstAdministratorProfile";
import { CONSEQUENTIAL_ACTIONS, type ActionPermission, type FunctionalScope } from "./accessControl";

const REASON = "Completing the first access administrator to the approved profile.";
const AUTHORITY = "Tom Arrington explicit first-administrator access approval, 3 September 2026.";

/** The profile the OLD bootstrap produced, which is what deadlocked. */
const OLD_BOOTSTRAP: CurrentAssignment = Object.freeze({
  baseAccessLevel: 1,
  caseScope: "organisation",
  functionalScopes: ["executive", "operations", "governance", "technical_administration"],
  actionPermissions: ["read", "create", "update", "access_admin"],
  sensitiveOverlays: [],
  accessStatus: "active",
  teamId: null,
});

/** The profile the FIXED bootstrap produces. */
const APPROVED: CurrentAssignment = Object.freeze({
  baseAccessLevel: FIRST_ADMINISTRATOR_LEVEL,
  caseScope: FIRST_ADMINISTRATOR_CASE_SCOPE,
  functionalScopes: [...FIRST_ADMINISTRATOR_SCOPES],
  actionPermissions: [...FIRST_ADMINISTRATOR_ACTIONS],
  sensitiveOverlays: [],
  accessStatus: "active",
  teamId: null,
});

function administratorFrom(assignment: CurrentAssignment, staffUserId: number): AdministratorAccess {
  return {
    staffUserId,
    baseAccessLevel: assignment.baseAccessLevel ?? 1,
    functionalScopes: assignment.functionalScopes,
    actionPermissions: assignment.actionPermissions,
    sensitiveOverlays: assignment.sensitiveOverlays,
    caseScope: assignment.caseScope,
    status: "active",
  };
}

function assignmentTo(targetStaffUserId: number, overrides: Partial<ProposedAssignment> = {}): ProposedAssignment {
  return {
    targetStaffUserId,
    baseAccessLevel: 3,
    caseScope: "organisation",
    functionalScopes: [],
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    accessStatus: "active",
    teamId: null,
    reason: "Onboarding a colleague to the Staff Portal.",
    authorityReference: AUTHORITY,
    ...overrides,
  };
}

describe("the deadlock, wall one: an administrator cannot complete their own account", () => {
  it("the access screen refuses self-administration, and must keep refusing", () => {
    const tom = administratorFrom(OLD_BOOTSTRAP, 1);
    const decision = decideAssignment(tom, OLD_BOOTSTRAP, assignmentTo(1, { functionalScopes: ["admissions"] }));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("self_administration");
  });

  it("still refuses self-administration once the account holds the approved profile", () => {
    const tom = administratorFrom(APPROVED, 1);
    const decision = decideAssignment(tom, APPROVED, assignmentTo(1, {
      functionalScopes: [...FIRST_ADMINISTRATOR_SCOPES, "governance"],
    }));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("self_administration");
  });

  it("refuses self-administration even for an administrator who holds everything", () => {
    const everything = administratorFrom(
      { ...APPROVED, functionalScopes: [...FIRST_ADMINISTRATOR_SCOPES, "governance", "executive"] },
      1,
    );
    const decision = decideAssignment(everything, APPROVED, assignmentTo(1));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("self_administration");
  });
});

describe("the deadlock, wall two: the old profile could not administer anybody", () => {
  it("REPRODUCES IT: the old bootstrap profile cannot grant a worker scope to a colleague", () => {
    const tom = administratorFrom(OLD_BOOTSTRAP, 1);
    const decision = decideAssignment(tom, APPROVED, assignmentTo(2, { functionalScopes: ["admissions"] }));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("grant_administrator_lacks");
  });

  it("FIXED: the approved profile can grant every scope it holds to a colleague", () => {
    const tom = administratorFrom(APPROVED, 1);
    for (const scope of FIRST_ADMINISTRATOR_SCOPES) {
      const decision = decideAssignment(tom, { ...APPROVED, functionalScopes: [] }, assignmentTo(2, {
        functionalScopes: [scope],
      }));
      expect(decision.permitted).toBe(true);
    }
  });

  it("FIXED: the approved profile can grant every action it holds, including appointing a second administrator", () => {
    const tom = administratorFrom(APPROVED, 1);
    for (const action of FIRST_ADMINISTRATOR_ACTIONS) {
      const decision = decideAssignment(tom, { ...APPROVED, functionalScopes: [] }, assignmentTo(2, {
        actionPermissions: [action],
      }));
      expect(decision.permitted).toBe(true);
    }
  });

  it("still cannot grant a consequential permission it does not hold", () => {
    const tom = administratorFrom(APPROVED, 1);
    const withheld = [...CONSEQUENTIAL_ACTIONS].filter(a => !FIRST_ADMINISTRATOR_ACTIONS.includes(a));
    expect(withheld.length).toBeGreaterThan(0);
    for (const action of withheld) {
      const decision = decideAssignment(tom, { ...APPROVED, functionalScopes: [] }, assignmentTo(2, {
        actionPermissions: ["read", action],
      }));
      expect(decision.permitted).toBe(false);
      if (!decision.permitted) expect(decision.code).toBe("grant_administrator_lacks");
    }
  });
});

describe("the approved first-administrator profile", () => {
  it("is Level 1, organisation, the thirteen worker scopes and four actions", () => {
    expect(FIRST_ADMINISTRATOR_LEVEL).toBe(1);
    expect(FIRST_ADMINISTRATOR_CASE_SCOPE).toBe("organisation");
    expect(FIRST_ADMINISTRATOR_SCOPES).toHaveLength(13);
    expect([...FIRST_ADMINISTRATOR_ACTIONS].sort()).toEqual(["access_admin", "create", "read", "update"]);
  });

  it("holds access_admin and no other consequential permission", () => {
    const consequential = FIRST_ADMINISTRATOR_ACTIONS.filter(a => CONSEQUENTIAL_ACTIONS.has(a));
    expect(consequential).toEqual(["access_admin"]);
  });

  it("names none of the six permissions Tom Arrington excluded", () => {
    for (const action of ["submit", "external_send", "financial_action", "approve", "delete_destructive", "credential_admin"] as ActionPermission[]) {
      expect(FIRST_ADMINISTRATOR_ACTIONS).not.toContain(action);
    }
  });

  it("names none of the scopes that map to no staff-facing worker", () => {
    for (const scope of ["executive", "operations", "governance", "technical_administration", "finance", "safeguarding"] as FunctionalScope[]) {
      expect(FIRST_ADMINISTRATOR_SCOPES).not.toContain(scope);
    }
  });
});

describe("the completion route cannot become an escalation route", () => {
  const soleAdmin = { accessAdminHolderCount: 1, targetHoldsAccessAdmin: true };

  it("completes the old bootstrap profile to the approved one", () => {
    const decision = decideFirstAdministratorCompletion(OLD_BOOTSTRAP, soleAdmin, REASON, AUTHORITY);
    expect(decision.permitted).toBe(true);
  });

  it("produces exactly the approved profile and nothing else", () => {
    const decision = decideFirstAdministratorCompletion(OLD_BOOTSTRAP, soleAdmin, REASON, AUTHORITY);
    if (!decision.permitted) throw new Error(decision.reason);
    const added = decision.grantsToAdd.filter(g => g.grantType === "functional_scope").map(g => g.value).sort();
    const revoked = decision.grantsToRevoke.map(g => g.value).sort();
    expect(added).toEqual([...FIRST_ADMINISTRATOR_SCOPES].sort());
    expect(revoked).toEqual(["executive", "governance", "operations", "technical_administration"]);
  });

  it("refuses an account that does not already hold access_admin, so it cannot appoint anybody", () => {
    const decision = decideFirstAdministratorCompletion(
      OLD_BOOTSTRAP,
      { accessAdminHolderCount: 1, targetHoldsAccessAdmin: false },
      REASON,
      AUTHORITY,
    );
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("not_the_first_administrator");
  });

  it("refuses once a second administrator exists, so it closes when an estate exists", () => {
    for (const count of [2, 3, 9]) {
      const decision = decideFirstAdministratorCompletion(
        OLD_BOOTSTRAP,
        { accessAdminHolderCount: count, targetHoldsAccessAdmin: true },
        REASON,
        AUTHORITY,
      );
      expect(decision.permitted).toBe(false);
      if (!decision.permitted) expect(decision.code).toBe("administration_estate_established");
    }
  });

  it("refuses a no-op, so the run that uses it is the run that closes it", () => {
    const decision = decideFirstAdministratorCompletion(APPROVED, soleAdmin, REASON, AUTHORITY);
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("no_change");
  });

  it("refuses an account with no assignment: that is the bootstrap's job, not this route's", () => {
    const unassigned: CurrentAssignment = {
      baseAccessLevel: null, caseScope: null, functionalScopes: [], actionPermissions: [],
      sensitiveOverlays: [], accessStatus: null, teamId: null,
    };
    const decision = decideFirstAdministratorCompletion(unassigned, soleAdmin, REASON, AUTHORITY);
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("no_existing_assignment");
  });

  it("refuses a suspended account", () => {
    const decision = decideFirstAdministratorCompletion(
      { ...OLD_BOOTSTRAP, accessStatus: "suspended" }, soleAdmin, REASON, AUTHORITY,
    );
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("target_not_active");
  });

  it("requires a reason and a written authority reference", () => {
    expect(decideFirstAdministratorCompletion(OLD_BOOTSTRAP, soleAdmin, "short", AUTHORITY).permitted).toBe(false);
    expect(decideFirstAdministratorCompletion(OLD_BOOTSTRAP, soleAdmin, REASON, "").permitted).toBe(false);
  });

  it("never grants a consequential permission beyond access_admin, whatever the account started with", () => {
    for (const start of [OLD_BOOTSTRAP, { ...OLD_BOOTSTRAP, actionPermissions: ["read"] }]) {
      const decision = decideFirstAdministratorCompletion(start as CurrentAssignment, soleAdmin, REASON, AUTHORITY);
      if (!decision.permitted) continue;
      const granted = decision.grantsToAdd.filter(g => g.grantType === "action_permission").map(g => g.value);
      for (const action of granted) {
        if (CONSEQUENTIAL_ACTIONS.has(action as ActionPermission)) expect(action).toBe("access_admin");
      }
    }
  });

  it("never adds or removes a sensitive overlay", () => {
    const withOverlay: CurrentAssignment = { ...OLD_BOOTSTRAP, sensitiveOverlays: ["finance", "safeguarding"] };
    const decision = decideFirstAdministratorCompletion(withOverlay, soleAdmin, REASON, AUTHORITY);
    if (!decision.permitted) throw new Error(decision.reason);
    for (const g of [...decision.grantsToAdd, ...decision.grantsToRevoke]) {
      expect(g.grantType).not.toBe("sensitive_overlay");
    }
  });
});

describe("an ordinary administrator cannot use any of this to bypass the self-access rule", () => {
  it("a second administrator holding access_admin still cannot change their own access", () => {
    const second = administratorFrom(APPROVED, 2);
    const decision = decideAssignment(second, APPROVED, assignmentTo(2, { actionPermissions: ["read", "approve"] }));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("self_administration");
  });

  it("and cannot reach the completion route either, because two administrators close it", () => {
    const decision = decideFirstAdministratorCompletion(
      APPROVED,
      { accessAdminHolderCount: 2, targetHoldsAccessAdmin: true },
      REASON,
      AUTHORITY,
    );
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("administration_estate_established");
  });

  it("an administrator may still administer somebody else, which is the point of the role", () => {
    const tom = administratorFrom(APPROVED, 1);
    const decision = decideAssignment(tom, { ...APPROVED, functionalScopes: [] }, assignmentTo(2, {
      functionalScopes: ["enquiry_triage"],
    }));
    expect(decision.permitted).toBe(true);
  });
});
