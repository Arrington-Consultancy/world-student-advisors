/**
 * The controlled scope-addition route, tested by what it refuses.
 *
 * decideControlledScopeAddition runs with no administrator present, so
 * every control it has is a refusal. A suite that only proved the happy
 * path would pass just as well against a function that returned an
 * approval for anything, which is the one outcome that matters here.
 *
 * The case that motivated it is the real one: Tom Arrington's named
 * account, staff_users id 1, holding Level 1, organisation case scope,
 * the executive scope and read, needing the thirteen worker scopes and
 * nothing else.
 *
 * No database, no network, no environment.
 */
import { describe, it, expect } from "vitest";
import { decideControlledScopeAddition, type CurrentAssignment, type ProposedAssignment } from "./administration";
import { CONSEQUENTIAL_ACTIONS, FUNCTIONAL_SCOPES, type FunctionalScope } from "./accessControl";
import { WORKER_FUNCTIONAL_SCOPE } from "./workerScope";

/** The thirteen scopes the staff-facing workers act within. */
const WORKER_SCOPES: FunctionalScope[] = [
  "enquiry_triage",
  "discovery",
  "education_research",
  "suitability",
  "admissions",
  "visa_compliance",
  "scholarships_funding",
  "pre_arrival_student_success",
  "quality_assurance",
  "marketing_seo",
  "records_control",
  "paid_media",
  "social_media",
];

const CURRENT: CurrentAssignment = Object.freeze({
  baseAccessLevel: 1,
  caseScope: "organisation",
  functionalScopes: ["executive"],
  actionPermissions: ["read"],
  sensitiveOverlays: [],
  accessStatus: "active",
  teamId: null,
});

const AUTHORITY = "Tom Arrington explicit named-account workforce access approval, 1 September 2026.";
const REASON = "Allow the named staff account to reach the approved workforce through the ordinary permission model.";

/** A proposal built the way the script builds it: current, plus scopes. */
function proposal(overrides: Partial<ProposedAssignment> = {}): ProposedAssignment {
  return {
    targetStaffUserId: 1,
    baseAccessLevel: 1,
    caseScope: "organisation",
    functionalScopes: ["executive", ...WORKER_SCOPES],
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    accessStatus: "active",
    teamId: null,
    authorityReference: AUTHORITY,
    reason: REASON,
    ...overrides,
  };
}

describe("the approved change", () => {
  it("permits adding the thirteen worker scopes to an existing Level 1 assignment", () => {
    const decision = decideControlledScopeAddition(CURRENT, proposal());
    expect(decision.permitted).toBe(true);
  });

  it("adds exactly thirteen functional scopes and revokes nothing", () => {
    const decision = decideControlledScopeAddition(CURRENT, proposal());
    if (!decision.permitted) throw new Error(decision.reason);
    expect(decision.grantsToAdd).toHaveLength(13);
    expect(decision.grantsToAdd.every(g => g.grantType === "functional_scope")).toBe(true);
    expect(decision.grantsToRevoke).toHaveLength(0);
  });

  it("keeps the executive scope the account already held", () => {
    const decision = decideControlledScopeAddition(CURRENT, proposal());
    if (!decision.permitted) throw new Error(decision.reason);
    expect(decision.grantsToAdd.map(g => g.value)).not.toContain("executive");
    expect(decision.grantsToRevoke.map(g => g.value)).not.toContain("executive");
  });

  it("writes one audit line per change and no more", () => {
    const decision = decideControlledScopeAddition(CURRENT, proposal());
    if (!decision.permitted) throw new Error(decision.reason);
    expect(decision.auditLines).toHaveLength(13);
    expect(decision.auditLines.every(l => l.changeType === "grant_added")).toBe(true);
  });

  it("covers every one of the thirteen staff-facing workers", () => {
    const staffFacing = Object.entries(WORKER_FUNCTIONAL_SCOPE)
      .filter(([id]) => !["wsa_core_brain", "wsa_governance_assurance", "staff_receptionist"].includes(id))
      .map(([, scope]) => scope);
    for (const scope of new Set(staffFacing)) {
      expect(WORKER_SCOPES).toContain(scope);
    }
    expect(new Set(staffFacing).size).toBe(13);
  });
});

describe("it cannot move anything except a functional scope", () => {
  it("refuses a level change", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ baseAccessLevel: 2 }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("level_would_change");
  });

  it("refuses a case-scope change", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ caseScope: "team", teamId: "t1" }));
    expect(d.permitted).toBe(false);
  });

  it("refuses a status change", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ accessStatus: "suspended" }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("status_would_change");
  });

  it("refuses a team change", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ teamId: "growth" }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("team_would_change");
  });

  it("refuses adding any action permission at all, consequential or not", () => {
    for (const action of ["create", "update", "comment_handoff", "export_download", "approve"] as const) {
      const d = decideControlledScopeAddition(CURRENT, proposal({ actionPermissions: ["read", action] }));
      expect(d.permitted).toBe(false);
      if (!d.permitted) expect(d.code).toBe("action_permission_would_change");
    }
  });

  it("refuses every consequential permission by name", () => {
    for (const action of CONSEQUENTIAL_ACTIONS) {
      const d = decideControlledScopeAddition(CURRENT, proposal({ actionPermissions: ["read", action] }));
      expect(d.permitted).toBe(false);
    }
  });

  it("refuses removing an action permission", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ actionPermissions: [] }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("action_permission_would_change");
  });

  it("refuses adding any sensitive overlay", () => {
    for (const overlay of ["finance", "safeguarding", "visa_regulated", "credentials_security"] as const) {
      const d = decideControlledScopeAddition(CURRENT, proposal({ sensitiveOverlays: [overlay] }));
      expect(d.permitted).toBe(false);
      if (!d.permitted) expect(d.code).toBe("overlay_would_change");
    }
  });

  it("refuses removing a sensitive overlay somebody already holds", () => {
    const withOverlay: CurrentAssignment = { ...CURRENT, sensitiveOverlays: ["finance"] };
    const d = decideControlledScopeAddition(withOverlay, proposal({ sensitiveOverlays: [] }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("overlay_would_change");
  });

  it("refuses revoking a functional scope", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ functionalScopes: WORKER_SCOPES }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("scope_would_be_revoked");
  });
});

describe("it refuses what it has no standing to do", () => {
  it("refuses an account with no existing assignment: a first assignment is deliberate", () => {
    const unassigned: CurrentAssignment = {
      baseAccessLevel: null,
      caseScope: null,
      functionalScopes: [],
      actionPermissions: [],
      sensitiveOverlays: [],
      accessStatus: null,
      teamId: null,
    };
    const d = decideControlledScopeAddition(unassigned, proposal());
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("no_existing_assignment");
  });

  it("refuses a suspended account", () => {
    const suspended: CurrentAssignment = { ...CURRENT, accessStatus: "suspended" };
    const d = decideControlledScopeAddition(suspended, proposal({ accessStatus: "suspended" }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("target_not_active");
  });

  it("refuses a scope that is not on the approved list", () => {
    const d = decideControlledScopeAddition(
      CURRENT,
      proposal({ functionalScopes: ["executive", "superuser" as FunctionalScope] }),
    );
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("unknown_value");
  });

  it("refuses a missing or token authority reference", () => {
    for (const authorityReference of [undefined, "", "   ", "ok"]) {
      const d = decideControlledScopeAddition(CURRENT, proposal({ authorityReference }));
      expect(d.permitted).toBe(false);
      if (!d.permitted) expect(d.code).toBe("authority_missing");
    }
  });

  it("refuses a missing reason", () => {
    const d = decideControlledScopeAddition(CURRENT, proposal({ reason: "because" }));
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("reason_missing");
  });

  it("refuses a no-op, so a repeated apply cannot append audit rows recording nothing", () => {
    const after: CurrentAssignment = { ...CURRENT, functionalScopes: ["executive", ...WORKER_SCOPES] };
    const d = decideControlledScopeAddition(after, proposal());
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.code).toBe("no_change");
  });
});

describe("the route cannot reach the scopes nobody asked for", () => {
  it("the six scopes outside this approval are not in the proposal", () => {
    const outside = FUNCTIONAL_SCOPES.filter(s => s !== "executive" && !WORKER_SCOPES.includes(s));
    expect([...outside].sort()).toEqual(
      ["finance", "governance", "operations", "safeguarding", "technical_administration"].sort(),
    );
    const decision = decideControlledScopeAddition(CURRENT, proposal());
    if (!decision.permitted) throw new Error(decision.reason);
    for (const scope of outside) {
      expect(decision.grantsToAdd.map(g => g.value)).not.toContain(scope);
    }
  });
});
