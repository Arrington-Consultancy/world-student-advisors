import { describe, expect, it } from "vitest";
import { decideAssignment, type AdministratorAccess, type CurrentAssignment, type ProposedAssignment } from "./administration";

const ADMIN: AdministratorAccess = {
  staffUserId: 1,
  baseAccessLevel: 1,
  functionalScopes: ["executive", "operations", "enquiry_triage", "finance", "safeguarding", "governance"],
  actionPermissions: ["read", "create", "update", "access_admin", "credential_admin", "financial_action"],
  sensitiveOverlays: ["finance", "safeguarding", "credentials_security"],
  caseScope: "organisation",
  status: "active",
};

const NOBODY: CurrentAssignment = {
  baseAccessLevel: null,
  caseScope: null,
  functionalScopes: [],
  actionPermissions: [],
  sensitiveOverlays: [],
  accessStatus: null,
  teamId: null,
};

function proposal(overrides: Partial<ProposedAssignment> = {}): ProposedAssignment {
  return {
    targetStaffUserId: 2,
    baseAccessLevel: 4,
    caseScope: "assigned_caseload",
    functionalScopes: ["enquiry_triage"],
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    accessStatus: "active",
    teamId: null,
    reason: "New caseworker joining the enquiry team.",
    ...overrides,
  };
}

describe("granting access to somebody else", () => {
  it("permits a straightforward assignment", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal());
    expect(decision.permitted).toBe(true);
  });

  it("records the level assignment and every grant added", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal());
    if (!decision.permitted) throw new Error("expected permitted");
    const types = decision.auditLines.map(l => l.changeType);
    expect(types).toContain("level_assigned");
    expect(types).toContain("case_scope_changed");
    expect(decision.grantsToAdd).toContainEqual({ grantType: "functional_scope", value: "enquiry_triage" });
    expect(decision.grantsToAdd).toContainEqual({ grantType: "action_permission", value: "read" });
  });

  it("revokes what is removed rather than leaving it behind", () => {
    const current: CurrentAssignment = {
      ...NOBODY,
      baseAccessLevel: 4,
      caseScope: "assigned_caseload",
      accessStatus: "active",
      functionalScopes: ["enquiry_triage", "finance"],
      actionPermissions: ["read", "update"],
    };
    const decision = decideAssignment(ADMIN, current, proposal());
    if (!decision.permitted) throw new Error("expected permitted");
    expect(decision.grantsToRevoke).toContainEqual({ grantType: "functional_scope", value: "finance" });
    expect(decision.grantsToRevoke).toContainEqual({ grantType: "action_permission", value: "update" });
  });

  it("distinguishes a first assignment from a change of level", () => {
    const existing: CurrentAssignment = { ...NOBODY, baseAccessLevel: 5, accessStatus: "active" };
    const decision = decideAssignment(ADMIN, existing, proposal());
    if (!decision.permitted) throw new Error("expected permitted");
    const level = decision.auditLines.find(l => l.changeType === "level_changed");
    expect(level?.previousValue).toBe("Level 5");
    expect(level?.newValue).toBe("Level 4");
  });
});

/**
 * The control that makes every other one mean something. An administrator
 * who can elevate themselves is bounded by nothing.
 */
describe("nobody administers their own access", () => {
  it("refuses a change to the administrator's own record", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({ targetStaffUserId: ADMIN.staffUserId }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("self_administration");
  });

  it("refuses even a harmless-looking self change", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({
      targetStaffUserId: ADMIN.staffUserId,
      baseAccessLevel: 5,
      functionalScopes: [],
      actionPermissions: [],
    }));
    expect(decision.permitted).toBe(false);
  });
});

describe("nobody grants what they do not hold", () => {
  it("refuses a level above the administrator's own", () => {
    const level3: AdministratorAccess = { ...ADMIN, baseAccessLevel: 3 };
    const decision = decideAssignment(level3, NOBODY, proposal({ baseAccessLevel: 2 }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("level_above_administrator");
  });

  it("permits assigning the administrator's own level", () => {
    const level3: AdministratorAccess = { ...ADMIN, baseAccessLevel: 3 };
    expect(decideAssignment(level3, NOBODY, proposal({ baseAccessLevel: 3 })).permitted).toBe(true);
  });

  it("refuses a functional scope the administrator lacks", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({ functionalScopes: ["visa_compliance"] }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("grant_administrator_lacks");
  });

  it("refuses an action permission the administrator lacks", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({ actionPermissions: ["read", "delete_destructive"] }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("grant_administrator_lacks");
  });

  it("refuses a sensitive overlay the administrator lacks", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({
      baseAccessLevel: 2,
      sensitiveOverlays: ["complaints_legal"],
    }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("grant_administrator_lacks");
  });

  it("an administrator cannot pass on access_admin they do not hold", () => {
    const noAdmin: AdministratorAccess = {
      ...ADMIN,
      actionPermissions: ["read", "create", "update"],
    };
    const decision = decideAssignment(noAdmin, NOBODY, proposal());
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("administrator_lacks_access_admin");
  });
});

describe("sensitive overlays keep their minimum levels", () => {
  it("refuses credentials_security below Level 1", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({
      baseAccessLevel: 2,
      sensitiveOverlays: ["credentials_security"],
    }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("overlay_below_minimum_level");
  });

  it("refuses safeguarding below Level 3", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({
      baseAccessLevel: 4,
      sensitiveOverlays: ["safeguarding"],
    }));
    expect(decision.permitted).toBe(false);
  });

  it("permits safeguarding at Level 3", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({
      baseAccessLevel: 3,
      sensitiveOverlays: ["safeguarding"],
    }));
    expect(decision.permitted).toBe(true);
  });

  it("checks the floor against the level being assigned, not the level held now", () => {
    const senior: CurrentAssignment = { ...NOBODY, baseAccessLevel: 1, accessStatus: "active" };
    // Demoting to 4 while keeping a Level 1 overlay must fail.
    const decision = decideAssignment(ADMIN, senior, proposal({
      baseAccessLevel: 4,
      sensitiveOverlays: ["credentials_security"],
    }));
    expect(decision.permitted).toBe(false);
  });
});

describe("section 9 requires a reason", () => {
  it("refuses an empty reason", () => {
    const decision = decideAssignment(ADMIN, NOBODY, proposal({ reason: "" }));
    expect(decision.permitted).toBe(false);
    if (decision.permitted) return;
    expect(decision.code).toBe("reason_missing");
  });

  it("refuses a token reason", () => {
    expect(decideAssignment(ADMIN, NOBODY, proposal({ reason: "ok" })).permitted).toBe(false);
  });
});

describe("a suspended administrator administers nothing", () => {
  for (const status of ["suspended", "disabled"] as const) {
    it(`refuses while ${status}`, () => {
      const inactive: AdministratorAccess = { ...ADMIN, status };
      const decision = decideAssignment(inactive, NOBODY, proposal());
      expect(decision.permitted).toBe(false);
      if (decision.permitted) return;
      expect(decision.code).toBe("administrator_not_active");
    });
  }
});

describe("values outside the approved lists are refused, not stored", () => {
  it("refuses an invented level", () => {
    expect(decideAssignment(ADMIN, NOBODY, proposal({ baseAccessLevel: 9 as never })).permitted).toBe(false);
  });

  it("refuses an invented scope", () => {
    expect(decideAssignment(ADMIN, NOBODY, proposal({ functionalScopes: ["everything" as never] })).permitted).toBe(false);
  });

  it("refuses an invented overlay", () => {
    expect(decideAssignment(ADMIN, NOBODY, proposal({ sensitiveOverlays: ["all" as never] })).permitted).toBe(false);
  });
});

/**
 * Tom Arrington, 17 September 2026: "i need to make my own approval
 * possible, I cant test the system without this." The bootstrap access
 * administrator, and only that account, may change their own access.
 */
describe("the bootstrap access administrator may change their own access (17 September 2026)", () => {
  const BOOTSTRAP: AdministratorAccess = { ...ADMIN, bootstrapAdministrator: true };
  const OWN: CurrentAssignment = {
    baseAccessLevel: 1,
    caseScope: "organisation",
    functionalScopes: [...ADMIN.functionalScopes],
    actionPermissions: [...ADMIN.actionPermissions],
    sensitiveOverlays: [...ADMIN.sensitiveOverlays],
    accessStatus: "active",
    teamId: null,
  };
  const self = (overrides: Partial<ProposedAssignment> = {}) =>
    proposal({
      targetStaffUserId: BOOTSTRAP.staffUserId,
      baseAccessLevel: 1,
      caseScope: "organisation",
      functionalScopes: [...ADMIN.functionalScopes],
      actionPermissions: [...ADMIN.actionPermissions],
      sensitiveOverlays: [...ADMIN.sensitiveOverlays],
      reason: "Testing the Staff Portal end to end as the bootstrap administrator.",
      ...overrides,
    });

  it("permits the bootstrap administrator to widen their own access, even to what they do not hold yet", () => {
    const decision = decideAssignment(BOOTSTRAP, OWN, self({
      functionalScopes: [...ADMIN.functionalScopes, "visa_compliance"],
      actionPermissions: [...ADMIN.actionPermissions, "submit"],
    }));
    expect(decision.permitted).toBe(true);
    if (!decision.permitted) return;
    expect(decision.grantsToAdd).toContainEqual({ grantType: "functional_scope", value: "visa_compliance" });
    expect(decision.grantsToAdd).toContainEqual({ grantType: "action_permission", value: "submit" });
  });

  it("permits the bootstrap administrator to narrow their own access, so a lower level can be tested", () => {
    const decision = decideAssignment(BOOTSTRAP, OWN, self({
      baseAccessLevel: 4,
      caseScope: "own_applicants",
      functionalScopes: ["enquiry_triage"],
      actionPermissions: ["read", "access_admin"],
      sensitiveOverlays: [],
    }));
    expect(decision.permitted).toBe(true);
    if (!decision.permitted) return;
    expect(decision.auditLines.map(l => l.changeType)).toContain("level_changed");
    expect(decision.grantsToRevoke).toContainEqual({ grantType: "functional_scope", value: "finance" });
  });

  it("refuses the bootstrap administrator suspending or disabling their own account", () => {
    for (const accessStatus of ["suspended", "disabled"] as const) {
      const decision = decideAssignment(BOOTSTRAP, OWN, self({ accessStatus }));
      expect(decision.permitted).toBe(false);
      if (!decision.permitted) expect(decision.code).toBe("self_lockout");
    }
  });

  it("refuses the bootstrap administrator removing access_admin from their own account", () => {
    const decision = decideAssignment(BOOTSTRAP, OWN, self({ actionPermissions: ["read", "create", "update"] }));
    expect(decision.permitted).toBe(false);
    if (!decision.permitted) expect(decision.code).toBe("self_lockout");
  });

  it("still requires a reason and still refuses unknown values and overlay floors on a self-change", () => {
    const noReason = decideAssignment(BOOTSTRAP, OWN, self({ reason: "test" }));
    expect(noReason.permitted).toBe(false);
    if (!noReason.permitted) expect(noReason.code).toBe("reason_missing");

    const badScope = decideAssignment(BOOTSTRAP, OWN, self({ functionalScopes: ["made_up" as never] }));
    expect(badScope.permitted).toBe(false);
    if (!badScope.permitted) expect(badScope.code).toBe("unknown_value");

    const floor = decideAssignment(BOOTSTRAP, OWN, self({
      baseAccessLevel: 4,
      sensitiveOverlays: ["credentials_security"],
    }));
    expect(floor.permitted).toBe(false);
    if (!floor.permitted) expect(floor.code).toBe("overlay_below_minimum_level");
  });

  it("an inactive bootstrap administrator, or one without access_admin, is still refused first", () => {
    const suspended = decideAssignment({ ...BOOTSTRAP, status: "suspended" }, OWN, self());
    expect(suspended.permitted).toBe(false);
    if (!suspended.permitted) expect(suspended.code).toBe("administrator_not_active");

    const noAdmin = decideAssignment(
      { ...BOOTSTRAP, actionPermissions: ["read", "create", "update"] },
      OWN,
      self(),
    );
    expect(noAdmin.permitted).toBe(false);
    if (!noAdmin.permitted) expect(noAdmin.code).toBe("administrator_lacks_access_admin");
  });

  it("the flag changes nothing about what the bootstrap administrator may do to anybody else", () => {
    const level3: AdministratorAccess = { ...BOOTSTRAP, baseAccessLevel: 3 };
    const tooHigh = decideAssignment(level3, NOBODY, proposal({ baseAccessLevel: 2 }));
    expect(tooHigh.permitted).toBe(false);
    if (!tooHigh.permitted) expect(tooHigh.code).toBe("level_above_administrator");

    const lacks = decideAssignment(BOOTSTRAP, NOBODY, proposal({ functionalScopes: ["visa_compliance"] }));
    expect(lacks.permitted).toBe(false);
    if (!lacks.permitted) expect(lacks.code).toBe("grant_administrator_lacks");
  });

  it("every other administrator is still refused a self-change, flag absent or false", () => {
    for (const admin of [ADMIN, { ...ADMIN, bootstrapAdministrator: false }]) {
      const decision = decideAssignment(admin, OWN, self());
      expect(decision.permitted).toBe(false);
      if (!decision.permitted) expect(decision.code).toBe("self_administration");
    }
  });
});
