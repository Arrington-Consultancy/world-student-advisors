/**
 * WSA Staff Portal access control — permission-model tests.
 *
 * Covers the pure model in accessControl.ts against WSA Staff Portal Access
 * Control Standard v1.0 (APPROVED). The eleven negative cases the standard's
 * implementation instruction names explicitly each have their own top-level
 * describe block, worded as they were required, so an assurance reviewer can
 * find them by name without reading the whole file.
 *
 * No database, no network, no environment: this suite has no production
 * effect and can be run anywhere.
 */
import { describe, it, expect } from "vitest";
import {
  ACCESS_LEVEL_NAMES,
  ACTION_PERMISSIONS,
  BUSINESS_DATA_MIN_LEVEL,
  CASE_SCOPES,
  CONSEQUENTIAL_ACTIONS,
  FUNCTIONAL_SCOPES,
  SENSITIVE_OVERLAYS,
  SENSITIVE_OVERLAY_MIN_LEVEL,
  consequentialActionsHeld,
  evaluateAccess,
  resolveEffectiveAccess,
  type AccessLevel,
  type AccessRequest,
  type ActionPermission,
  type CaseContext,
  type CaseScope,
  type FunctionalScope,
  type SensitiveOverlay,
  type StaffAccessProfile,
  type TemporaryGrant,
} from "./accessControl";

// ── Fixtures ────────────────────────────────────────────────────────────
// Deliberately fictional staff user IDs. Per the controlling instruction,
// no assignment is invented for any real person other than the one approved
// human assignment (Tom Arrington, Level 1 + Executive), which is asserted
// in its own block below and is READ-shaped only.
const NOW = new Date("2026-08-30T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function profile(overrides: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1001,
    baseAccessLevel: 4,
    functionalScopes: ["admissions"],
    caseScope: "assigned_caseload",
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    temporaryGrants: [],
    status: "active",
    teamId: "admissions",
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...overrides,
  };
}

function grant(overrides: Partial<TemporaryGrant> = {}): TemporaryGrant {
  return {
    grantedByStaffUserId: 9001,
    reason: "Cover during annual leave",
    grantedAt: new Date(NOW.getTime() - HOUR),
    expiresAt: new Date(NOW.getTime() + HOUR),
    ...overrides,
  };
}

function caseFor(assignedTo: number[], teamId: string | null = "admissions", sharedWith?: number[]): CaseContext {
  return { assignedStaffUserIds: assignedTo, teamId, sharedWithStaffUserIds: sharedWith };
}

// ── §1: three independent dimensions ────────────────────────────────────
describe("§1 all three dimensions must be satisfied independently", () => {
  const request: AccessRequest = { action: "read", functionalScope: "admissions" };

  it("allows when level, scope and action all line up", () => {
    expect(evaluateAccess(profile(), request, NOW).allowed).toBe(true);
  });

  it("denies on the action dimension alone", () => {
    const decision = evaluateAccess(profile({ actionPermissions: [] }), request, NOW);
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });

  it("denies on the functional-scope dimension alone", () => {
    const decision = evaluateAccess(profile({ functionalScopes: ["finance"] }), request, NOW);
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });

  it("denies on the level dimension alone", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 4, functionalScopes: ["executive"] }),
      { action: "read", functionalScope: "executive", businessDataClass: "governance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("denies on the case dimension alone", () => {
    const decision = evaluateAccess(profile(), { ...request, case: caseFor([2002]) }, NOW);
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });
});

// ── §2/§3: seniority never implies capability ───────────────────────────
describe("§3 a senior level never implies a consequential capability", () => {
  const consequential = Array.from(CONSEQUENTIAL_ACTIONS);

  for (const level of [1, 2, 3, 4, 5] as AccessLevel[]) {
    for (const action of consequential) {
      it(`denies ${action} at Level ${level} when it is not explicitly granted`, () => {
        const decision = evaluateAccess(
          profile({ baseAccessLevel: level, functionalScopes: [...FUNCTIONAL_SCOPES], actionPermissions: ["read"] }),
          { action, functionalScope: "executive" },
          NOW,
        );
        expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
      });
    }
  }

  it("reports no consequential action for a read-only Level 1 profile", () => {
    expect(consequentialActionsHeld(profile({ baseAccessLevel: 1, actionPermissions: ["read"] }), NOW)).toEqual([]);
  });

  it("reports only the consequential actions that were explicitly granted", () => {
    const held = consequentialActionsHeld(
      profile({ baseAccessLevel: 3, actionPermissions: ["read", "update", "export_download"] }),
      NOW,
    );
    expect(held).toEqual(["export_download"]);
  });

  it("names every level for audit without those names carrying authority", () => {
    expect(Object.keys(ACCESS_LEVEL_NAMES)).toEqual(["1", "2", "3", "4", "5"]);
  });
});

// ── §2: business-data breadth by level ──────────────────────────────────
describe("§2 business-data visibility widens with level and stops where the table stops", () => {
  function readBusiness(level: AccessLevel, businessDataClass: string, overlays: SensitiveOverlay[] = []) {
    return evaluateAccess(
      profile({
        baseAccessLevel: level,
        functionalScopes: [...FUNCTIONAL_SCOPES],
        actionPermissions: ["read"],
        sensitiveOverlays: overlays,
      }),
      { action: "read", functionalScope: "executive", businessDataClass },
      NOW,
    );
  }

  for (const [dataClass, minLevel] of Object.entries(BUSINESS_DATA_MIN_LEVEL)) {
    it(`allows "${dataClass}" at its minimum level ${minLevel}`, () => {
      const overlays: SensitiveOverlay[] = dataClass === "company_financial" ? ["finance"] : [];
      expect(readBusiness(minLevel as AccessLevel, dataClass, overlays).allowed).toBe(true);
    });

    if (minLevel < 5) {
      it(`denies "${dataClass}" one level below its minimum`, () => {
        const overlays: SensitiveOverlay[] = dataClass === "company_financial" ? ["finance"] : [];
        const decision = readBusiness((minLevel + 1) as AccessLevel, dataClass, overlays);
        expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
      });
    }
  }

  it("denies an unrecognised business data class at every level, failing closed", () => {
    for (const level of [1, 2, 3, 4, 5] as AccessLevel[]) {
      expect(readBusiness(level, "not_a_real_class")).toMatchObject({
        allowed: false,
        deniedDimension: "unknown_value",
      });
    }
  });
});

// ── §4: intersection of level and functional scope ──────────────────────
describe("§4 a user sees only the intersection of level and functional scope", () => {
  it("denies an in-level request that is outside the granted scope", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 1, functionalScopes: ["executive"] }),
      { action: "read", functionalScope: "safeguarding" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });

  it("denies a scope outside the approved list even if it is spelled plausibly", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 1, functionalScopes: [...FUNCTIONAL_SCOPES] }),
      { action: "read", functionalScope: "student_finance" as FunctionalScope },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "unknown_value" });
  });

  it("keeps every approved scope reachable when granted", () => {
    for (const scope of FUNCTIONAL_SCOPES) {
      const decision = evaluateAccess(
        profile({ baseAccessLevel: 1, functionalScopes: [scope], actionPermissions: ["read"] }),
        { action: "read", functionalScope: scope },
        NOW,
      );
      expect(decision.allowed).toBe(true);
    }
  });
});

// ── §5: case scope ──────────────────────────────────────────────────────
describe("§5 case scope", () => {
  const read = (p: StaffAccessProfile, c: CaseContext) =>
    evaluateAccess(p, { action: "read", functionalScope: "admissions", case: c }, NOW);

  it("organisation scope reaches a case owned by nobody the user knows", () => {
    expect(read(profile({ caseScope: "organisation", teamId: null }), caseFor([9999], "visa")).allowed).toBe(true);
  });

  it("team scope reaches a case in the same team", () => {
    expect(read(profile({ caseScope: "team", teamId: "admissions" }), caseFor([9999], "admissions")).allowed).toBe(true);
  });

  it("team scope reaches a cross-team case through an explicit handoff", () => {
    const decision = read(profile({ caseScope: "team", teamId: "admissions" }), caseFor([9999], "visa", [1001]));
    expect(decision.allowed).toBe(true);
  });

  it("team scope denies when both team ids are null rather than treating null as a match", () => {
    const decision = read(profile({ caseScope: "team", teamId: null }), caseFor([9999], null));
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("assigned caseload reaches an assigned case", () => {
    expect(read(profile({ caseScope: "assigned_caseload" }), caseFor([1001])).allowed).toBe(true);
  });

  it("assigned caseload reaches a case shared for cover or escalation", () => {
    expect(read(profile({ caseScope: "assigned_caseload" }), caseFor([9999], "admissions", [1001])).allowed).toBe(true);
  });

  it("own applicants reaches only an explicitly assigned applicant", () => {
    expect(read(profile({ baseAccessLevel: 5, caseScope: "own_applicants" }), caseFor([1001])).allowed).toBe(true);
  });

  it("own applicants is NOT widened by sharing", () => {
    const decision = read(profile({ baseAccessLevel: 5, caseScope: "own_applicants" }), caseFor([9999], "admissions", [1001]));
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies an unrecognised case scope, failing closed", () => {
    const decision = read(profile({ caseScope: "everything" as CaseScope }), caseFor([1001]));
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "unknown_value" });
  });

  it("leaves non-case requests unaffected by case scope", () => {
    const decision = evaluateAccess(
      profile({ caseScope: "own_applicants", baseAccessLevel: 5, functionalScopes: ["admissions"] }),
      { action: "read", functionalScope: "admissions" },
      NOW,
    );
    expect(decision.allowed).toBe(true);
  });

  it("covers every declared case scope in this suite", () => {
    expect([...CASE_SCOPES].sort()).toEqual(["assigned_caseload", "organisation", "own_applicants", "team"]);
  });
});

// ── §6: action permissions are granted, never inferred ──────────────────
describe("§6 each action permission is separately granted", () => {
  for (const action of ACTION_PERMISSIONS) {
    it(`allows "${action}" only when it is in the profile`, () => {
      const withAction = evaluateAccess(
        profile({ baseAccessLevel: 1, functionalScopes: ["executive"], actionPermissions: [action] }),
        { action, functionalScope: "executive" },
        NOW,
      );
      expect(withAction.allowed).toBe(true);

      const withoutAction = evaluateAccess(
        profile({
          baseAccessLevel: 1,
          functionalScopes: ["executive"],
          actionPermissions: ACTION_PERMISSIONS.filter(a => a !== action),
        }),
        { action, functionalScope: "executive" },
        NOW,
      );
      expect(withoutAction).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
    });
  }

  it("denies an action outside the approved list, failing closed", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 1, functionalScopes: ["executive"], actionPermissions: [...ACTION_PERMISSIONS] }),
      { action: "purge" as ActionPermission, functionalScope: "executive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "unknown_value" });
  });
});

// ── §7: sensitive overlays ──────────────────────────────────────────────
describe("§7 a sensitive overlay is necessary and never sufficient", () => {
  function readSensitive(level: AccessLevel, category: SensitiveOverlay, overlays: SensitiveOverlay[]) {
    return evaluateAccess(
      profile({
        baseAccessLevel: level,
        functionalScopes: [...FUNCTIONAL_SCOPES],
        actionPermissions: ["read"],
        sensitiveOverlays: overlays,
      }),
      { action: "read", functionalScope: "governance", sensitiveCategory: category },
      NOW,
    );
  }

  for (const category of SENSITIVE_OVERLAYS) {
    const minLevel = SENSITIVE_OVERLAY_MIN_LEVEL[category];

    it(`allows "${category}" with the overlay at its minimum level ${minLevel}`, () => {
      expect(readSensitive(minLevel, category, [category]).allowed).toBe(true);
    });

    it(`denies "${category}" at that same level WITHOUT the overlay`, () => {
      expect(readSensitive(minLevel, category, [])).toMatchObject({
        allowed: false,
        deniedDimension: "sensitive_overlay",
      });
    });

    if (minLevel < 5) {
      it(`denies "${category}" WITH the overlay but below its minimum level`, () => {
        expect(readSensitive((minLevel + 1) as AccessLevel, category, [category])).toMatchObject({
          allowed: false,
          deniedDimension: "access_level",
        });
      });
    }
  }

  it("does not let one overlay stand in for another", () => {
    expect(readSensitive(1, "safeguarding", ["finance"])).toMatchObject({
      allowed: false,
      deniedDimension: "sensitive_overlay",
    });
  });

  it("denies an unrecognised sensitive category, failing closed", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 1, functionalScopes: [...FUNCTIONAL_SCOPES], sensitiveOverlays: [...SENSITIVE_OVERLAYS] }),
      { action: "read", functionalScope: "governance", sensitiveCategory: "medical" as SensitiveOverlay },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "unknown_value" });
  });
});

// ── §9/§10: temporary grants ────────────────────────────────────────────
describe("§9 temporary grants widen access only while they are live", () => {
  it("a live grant adds a functional scope", () => {
    const p = profile({
      functionalScopes: ["admissions"],
      temporaryGrants: [grant({ functionalScopes: ["visa_compliance"] })],
    });
    expect(evaluateAccess(p, { action: "read", functionalScope: "visa_compliance" }, NOW).allowed).toBe(true);
  });

  it("a live grant adds an action permission", () => {
    const p = profile({ temporaryGrants: [grant({ actionPermissions: ["export_download"] })] });
    expect(evaluateAccess(p, { action: "export_download", functionalScope: "admissions" }, NOW).allowed).toBe(true);
  });

  it("a live grant adds a sensitive overlay but not the level it needs", () => {
    const p = profile({ baseAccessLevel: 4, temporaryGrants: [grant({ sensitiveOverlays: ["finance"] })] });
    const decision = evaluateAccess(
      p,
      { action: "read", functionalScope: "admissions", sensitiveCategory: "finance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("a grant may widen case scope", () => {
    const p = profile({ caseScope: "own_applicants", temporaryGrants: [grant({ caseScope: "team" })] });
    expect(resolveEffectiveAccess(p, NOW).caseScope).toBe("team");
  });

  it("a grant may not narrow case scope", () => {
    const p = profile({ caseScope: "organisation", temporaryGrants: [grant({ caseScope: "own_applicants" })] });
    expect(resolveEffectiveAccess(p, NOW).caseScope).toBe("organisation");
  });

  it("a grant never raises the base access level", () => {
    const p = profile({ baseAccessLevel: 4, temporaryGrants: [grant({ functionalScopes: ["executive"] })] });
    expect(resolveEffectiveAccess(p, NOW).baseAccessLevel).toBe(4);
    expect(
      evaluateAccess(p, { action: "read", functionalScope: "executive", businessDataClass: "governance" }, NOW),
    ).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("a grant with a malformed expiry contributes nothing", () => {
    const p = profile({
      temporaryGrants: [grant({ expiresAt: undefined as unknown as Date, actionPermissions: ["delete_destructive"] })],
    });
    expect(resolveEffectiveAccess(p, NOW).actionPermissions.has("delete_destructive")).toBe(false);
  });

  it("a grant expiring exactly now is already inert", () => {
    const p = profile({ temporaryGrants: [grant({ expiresAt: NOW, actionPermissions: ["approve"] })] });
    expect(resolveEffectiveAccess(p, NOW).actionPermissions.has("approve")).toBe(false);
  });
});

// ═══ The eleven required negative tests ═════════════════════════════════

describe("NEGATIVE 1 — Level 1 without destructive permission", () => {
  it("denies delete_destructive to a Level 1 executive who was never granted it", () => {
    const tom = profile({
      staffUserId: 1,
      baseAccessLevel: 1,
      functionalScopes: ["executive"],
      caseScope: "organisation",
      actionPermissions: ["read"],
      teamId: null,
    });
    const decision = evaluateAccess(
      tom,
      { action: "delete_destructive", functionalScope: "executive", case: caseFor([9999], "visa") },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });

  it("still denies it when the records_destructive overlay is held but the action is not", () => {
    const decision = evaluateAccess(
      profile({
        baseAccessLevel: 1,
        functionalScopes: ["records_control"],
        actionPermissions: ["read"],
        sensitiveOverlays: ["records_destructive"],
      }),
      { action: "delete_destructive", functionalScope: "records_control", sensitiveCategory: "records_destructive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });
});

describe("NEGATIVE 2 — Level 2 attempting finance access", () => {
  it("denies company financial records to Level 2 even with the finance overlay and scope", () => {
    const decision = evaluateAccess(
      profile({
        baseAccessLevel: 2,
        functionalScopes: ["finance", "executive"],
        actionPermissions: ["read"],
        sensitiveOverlays: ["finance"],
        caseScope: "organisation",
      }),
      { action: "read", functionalScope: "finance", businessDataClass: "company_financial", sensitiveCategory: "finance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("denies finance-category material to Level 2 with no finance overlay", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 2, functionalScopes: ["finance"], actionPermissions: ["read"] }),
      { action: "read", functionalScope: "finance", sensitiveCategory: "finance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "sensitive_overlay" });
  });

  it("denies a financial_action to Level 2 that holds finance scope and overlay but not the action", () => {
    const decision = evaluateAccess(
      profile({
        baseAccessLevel: 2,
        functionalScopes: ["finance"],
        actionPermissions: ["read", "update"],
        sensitiveOverlays: ["finance"],
      }),
      { action: "financial_action", functionalScope: "finance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });
});

describe("NEGATIVE 3 — Level 3 attempting unrelated-team case access", () => {
  it("denies a Level 3 team manager a case belonging to another team", () => {
    const decision = evaluateAccess(
      profile({
        staffUserId: 3003,
        baseAccessLevel: 3,
        functionalScopes: ["admissions"],
        caseScope: "team",
        teamId: "admissions",
        actionPermissions: ["read"],
      }),
      { action: "read", functionalScope: "admissions", case: caseFor([7007], "visa_compliance") },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies it even when the other team's case is assigned to them but not shared", () => {
    // Assignment alone is not a team-scope route: §5 requires either the same
    // team or an explicit handoff.
    const decision = evaluateAccess(
      profile({ staffUserId: 3003, baseAccessLevel: 3, caseScope: "team", teamId: "admissions" }),
      { action: "read", functionalScope: "admissions", case: caseFor([3003], "visa_compliance") },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });
});

describe("NEGATIVE 4 — Level 4 attempting an unassigned applicant", () => {
  it("denies a caseworker an applicant who is neither assigned to nor shared with them", () => {
    const decision = evaluateAccess(
      profile({ staffUserId: 4004, baseAccessLevel: 4, caseScope: "assigned_caseload" }),
      { action: "read", functionalScope: "admissions", case: caseFor([5005], "admissions", [6006]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies it for an update as well as a read", () => {
    const decision = evaluateAccess(
      profile({
        staffUserId: 4004,
        baseAccessLevel: 4,
        caseScope: "assigned_caseload",
        actionPermissions: ["read", "update"],
      }),
      { action: "update", functionalScope: "admissions", case: caseFor([5005]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });
});

describe("NEGATIVE 5 — Level 5 attempting another user's applicant", () => {
  it("denies a restricted user an applicant assigned to a colleague", () => {
    const decision = evaluateAccess(
      profile({ staffUserId: 5005, baseAccessLevel: 5, caseScope: "own_applicants" }),
      { action: "read", functionalScope: "admissions", case: caseFor([4004]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies it even when the colleague shared the case, since sharing does not widen own_applicants", () => {
    const decision = evaluateAccess(
      profile({ staffUserId: 5005, baseAccessLevel: 5, caseScope: "own_applicants" }),
      { action: "read", functionalScope: "admissions", case: caseFor([4004], "admissions", [5005]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies a restricted user management reporting even about their own applicants", () => {
    const decision = evaluateAccess(
      profile({ staffUserId: 5005, baseAccessLevel: 5, caseScope: "own_applicants" }),
      {
        action: "read",
        functionalScope: "admissions",
        businessDataClass: "management_reporting",
        case: caseFor([5005]),
      },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });
});

describe("NEGATIVE 6 — missing sensitive overlay", () => {
  it("denies safeguarding material to a senior, in-scope, action-permitted user with no overlay", () => {
    const decision = evaluateAccess(
      profile({
        baseAccessLevel: 1,
        functionalScopes: ["safeguarding"],
        caseScope: "organisation",
        actionPermissions: ["read"],
        sensitiveOverlays: [],
      }),
      { action: "read", functionalScope: "safeguarding", sensitiveCategory: "safeguarding", case: caseFor([9999]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "sensitive_overlay" });
  });

  it("denies every sensitive category to a fully scoped Level 1 holding no overlays", () => {
    for (const category of SENSITIVE_OVERLAYS) {
      const decision = evaluateAccess(
        profile({
          baseAccessLevel: 1,
          functionalScopes: [...FUNCTIONAL_SCOPES],
          caseScope: "organisation",
          actionPermissions: [...ACTION_PERMISSIONS],
          sensitiveOverlays: [],
        }),
        { action: "read", functionalScope: "governance", sensitiveCategory: category },
        NOW,
      );
      expect(decision).toMatchObject({ allowed: false, deniedDimension: "sensitive_overlay" });
    }
  });
});

describe("NEGATIVE 7 — direct API bypass attempt", () => {
  it("offers no field on the request by which a caller can assert authority", () => {
    // Structural guarantee: authority is read only from the server-resolved
    // profile. A crafted request body carries resource description only.
    const crafted = {
      action: "delete_destructive",
      functionalScope: "records_control",
      // Everything below is what an attacker would try to inject. None of it
      // is read by evaluateAccess.
      baseAccessLevel: 1,
      accessLevel: 1,
      actionPermissions: [...ACTION_PERMISSIONS],
      functionalScopes: [...FUNCTIONAL_SCOPES],
      sensitiveOverlays: [...SENSITIVE_OVERLAYS],
      caseScope: "organisation",
      status: "active",
      isAdmin: true,
      allowed: true,
    } as unknown as AccessRequest;

    const decision = evaluateAccess(profile({ baseAccessLevel: 5, caseScope: "own_applicants" }), crafted, NOW);
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });

  it("ignores an injected case context that claims the caller is assigned when the level forbids the class", () => {
    const decision = evaluateAccess(
      profile({ staffUserId: 5005, baseAccessLevel: 5, caseScope: "own_applicants" }),
      {
        action: "read",
        functionalScope: "admissions",
        businessDataClass: "company_financial",
        case: caseFor([5005]),
      },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("denies a request whose action and scope are both fabricated strings", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 1, functionalScopes: [...FUNCTIONAL_SCOPES], actionPermissions: [...ACTION_PERMISSIONS] }),
      { action: "*" as ActionPermission, functionalScope: "*" as FunctionalScope },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "unknown_value" });
  });

  it("cannot be satisfied by a profile object that was never resolved from the server's records", () => {
    // A profile whose status field is absent (as a hand-built object from an
    // untrusted source would be) fails closed on account status.
    const forged = { ...profile(), status: undefined as unknown as StaffAccessProfile["status"] };
    expect(evaluateAccess(forged, { action: "read", functionalScope: "admissions" }, NOW)).toMatchObject({
      allowed: false,
      deniedDimension: "account_status",
    });
  });
});

describe("NEGATIVE 8 — AI retrieval of unauthorised context", () => {
  // AI context assembly must ask the same question as any other reader, on
  // behalf of the signed-in staff member. These assert the model gives the
  // same answer for a retrieval request as for a UI read, so the later
  // wiring has nothing weaker to call.
  const caseworker = profile({
    staffUserId: 4004,
    baseAccessLevel: 4,
    functionalScopes: ["admissions"],
    caseScope: "assigned_caseload",
    actionPermissions: ["read"],
    teamId: "admissions",
  });

  it("denies a retrieval of a case outside the caseworker's caseload", () => {
    const decision = evaluateAccess(
      caseworker,
      { action: "read", functionalScope: "admissions", case: caseFor([8008]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "case_scope" });
  });

  it("denies a retrieval from a functional area the staff member does not hold", () => {
    const decision = evaluateAccess(
      caseworker,
      { action: "read", functionalScope: "finance", case: caseFor([4004]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });

  it("denies a retrieval of company financial records for a caseworker's summary", () => {
    const decision = evaluateAccess(
      caseworker,
      { action: "read", functionalScope: "admissions", businessDataClass: "company_financial" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "access_level" });
  });

  it("denies a retrieval of safeguarding material without the overlay", () => {
    const decision = evaluateAccess(
      profile({
        staffUserId: 4004,
        baseAccessLevel: 3,
        functionalScopes: ["safeguarding", "admissions"],
        caseScope: "assigned_caseload",
        actionPermissions: ["read"],
      }),
      { action: "read", functionalScope: "safeguarding", sensitiveCategory: "safeguarding", case: caseFor([4004]) },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "sensitive_overlay" });
  });

  it("allows only the intersection the staff member would see themselves", () => {
    const decision = evaluateAccess(
      caseworker,
      { action: "read", functionalScope: "admissions", case: caseFor([4004]) },
      NOW,
    );
    expect(decision.allowed).toBe(true);
  });
});

describe("NEGATIVE 9 — export without export permission", () => {
  it("denies export_download to a user who may read the very same record", () => {
    const p = profile({
      staffUserId: 4004,
      baseAccessLevel: 4,
      functionalScopes: ["admissions"],
      caseScope: "assigned_caseload",
      actionPermissions: ["read", "update", "comment_handoff"],
    });
    const target: AccessRequest = { action: "read", functionalScope: "admissions", case: caseFor([4004]) };
    expect(evaluateAccess(p, target, NOW).allowed).toBe(true);
    expect(evaluateAccess(p, { ...target, action: "export_download" }, NOW)).toMatchObject({
      allowed: false,
      deniedDimension: "action_permission",
    });
  });

  it("denies export_download to a Level 1 executive with organisation-wide read", () => {
    const decision = evaluateAccess(
      profile({
        baseAccessLevel: 1,
        functionalScopes: [...FUNCTIONAL_SCOPES],
        caseScope: "organisation",
        actionPermissions: ["read"],
      }),
      { action: "export_download", functionalScope: "executive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });

  it("denies external_send and submit on the same basis", () => {
    const p = profile({ baseAccessLevel: 1, functionalScopes: [...FUNCTIONAL_SCOPES], actionPermissions: ["read"] });
    for (const action of ["external_send", "submit"] as ActionPermission[]) {
      expect(evaluateAccess(p, { action, functionalScope: "admissions" }, NOW)).toMatchObject({
        allowed: false,
        deniedDimension: "action_permission",
      });
    }
  });
});

describe("NEGATIVE 10 — expired temporary grant", () => {
  const expired = grant({
    grantedAt: new Date(NOW.getTime() - 48 * HOUR),
    expiresAt: new Date(NOW.getTime() - HOUR),
    functionalScopes: ["finance"],
    actionPermissions: ["export_download", "approve"],
    sensitiveOverlays: ["finance"],
    caseScope: "organisation",
  });

  it("contributes no functional scope once expired", () => {
    const decision = evaluateAccess(
      profile({ temporaryGrants: [expired] }),
      { action: "read", functionalScope: "finance" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });

  it("contributes no action permission once expired", () => {
    const decision = evaluateAccess(
      profile({ temporaryGrants: [expired] }),
      { action: "export_download", functionalScope: "admissions" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "action_permission" });
  });

  it("contributes no sensitive overlay and no widened case scope once expired", () => {
    const effective = resolveEffectiveAccess(profile({ temporaryGrants: [expired] }), NOW);
    expect(effective.sensitiveOverlays.size).toBe(0);
    expect(effective.caseScope).toBe("assigned_caseload");
  });

  it("granted the same access before it expired, proving expiry is what removed it", () => {
    const beforeExpiry = new Date(NOW.getTime() - 2 * HOUR);
    expect(
      evaluateAccess(profile({ temporaryGrants: [expired] }), { action: "export_download", functionalScope: "finance" }, beforeExpiry)
        .allowed,
    ).toBe(true);
  });

  it("is removed by expiry alone even while a second, live grant is present", () => {
    const p = profile({ temporaryGrants: [expired, grant({ functionalScopes: ["visa_compliance"] })] });
    expect(evaluateAccess(p, { action: "read", functionalScope: "visa_compliance" }, NOW).allowed).toBe(true);
    expect(evaluateAccess(p, { action: "read", functionalScope: "finance" }, NOW)).toMatchObject({
      allowed: false,
      deniedDimension: "functional_scope",
    });
  });
});

describe("NEGATIVE 11 — disabled staff account", () => {
  const fullyPrivileged: Partial<StaffAccessProfile> = {
    baseAccessLevel: 1,
    functionalScopes: [...FUNCTIONAL_SCOPES],
    caseScope: "organisation",
    actionPermissions: [...ACTION_PERMISSIONS],
    sensitiveOverlays: [...SENSITIVE_OVERLAYS],
    teamId: null,
  };

  it("denies a disabled account despite a complete set of permissions", () => {
    const decision = evaluateAccess(
      profile({ ...fullyPrivileged, status: "disabled" }),
      { action: "read", functionalScope: "executive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "account_status" });
  });

  it("denies a suspended account the same way", () => {
    const decision = evaluateAccess(
      profile({ ...fullyPrivileged, status: "suspended" }),
      { action: "read", functionalScope: "executive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "account_status" });
  });

  it("denies a disabled account every action across every scope", () => {
    const disabled = profile({ ...fullyPrivileged, status: "disabled" });
    for (const action of ACTION_PERMISSIONS) {
      for (const scope of FUNCTIONAL_SCOPES) {
        expect(evaluateAccess(disabled, { action, functionalScope: scope }, NOW).allowed).toBe(false);
      }
    }
  });

  it("denies a disabled account even where a live temporary grant would otherwise apply", () => {
    const decision = evaluateAccess(
      profile({ status: "disabled", temporaryGrants: [grant({ actionPermissions: ["approve"] })] }),
      { action: "approve", functionalScope: "admissions" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "account_status" });
  });

  it("denies an account whose status is an unrecognised string", () => {
    const decision = evaluateAccess(
      profile({ ...fullyPrivileged, status: "pending" as StaffAccessProfile["status"] }),
      { action: "read", functionalScope: "executive" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "account_status" });
  });
});

// ── The one approved human assignment ───────────────────────────────────
describe("The first controlled human assignment: Tom Arrington, Level 1 + Executive", () => {
  // The only real-person assignment authorised at this stage. No assignment
  // is modelled here for any other named individual.
  const tomArrington = profile({
    staffUserId: 1,
    baseAccessLevel: 1,
    functionalScopes: ["executive"],
    caseScope: "organisation",
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    teamId: null,
    assignedByStaffUserId: 1,
    assignedAt: new Date("2026-08-30T00:00:00.000Z"),
    assignmentReason: "Access Control Standard v1.0 §12 — first controlled assignment",
  });

  it("gives full authorised business-data visibility for read", () => {
    for (const dataClass of Object.keys(BUSINESS_DATA_MIN_LEVEL)) {
      if (dataClass === "company_financial") continue; // covered separately below
      const decision = evaluateAccess(
        tomArrington,
        { action: "read", functionalScope: "executive", businessDataClass: dataClass },
        NOW,
      );
      expect(decision.allowed).toBe(true);
    }
  });

  it("reaches any student or applicant record across the organisation for read", () => {
    expect(
      evaluateAccess(
        tomArrington,
        { action: "read", functionalScope: "executive", case: caseFor([9999], "visa_compliance") },
        NOW,
      ).allowed,
    ).toBe(true);
  });

  it("does NOT reach company financial records without a finance overlay", () => {
    const decision = evaluateAccess(
      tomArrington,
      { action: "read", functionalScope: "executive", businessDataClass: "company_financial" },
      NOW,
    );
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "sensitive_overlay" });
  });

  it("DOES reach company financial records once the Executive/Finance configuration grants that overlay", () => {
    const withFinanceOverlay = { ...tomArrington, sensitiveOverlays: ["finance"] as SensitiveOverlay[] };
    expect(
      evaluateAccess(
        withFinanceOverlay,
        { action: "read", functionalScope: "executive", businessDataClass: "company_financial" },
        NOW,
      ).allowed,
    ).toBe(true);
  });

  it("holds no credential administration, destructive, payment or external-submission authority", () => {
    expect(consequentialActionsHeld(tomArrington, NOW)).toEqual([]);
    for (const action of ["credential_admin", "delete_destructive", "financial_action", "external_send", "submit", "access_admin", "export_download"] as ActionPermission[]) {
      expect(evaluateAccess(tomArrington, { action, functionalScope: "executive" }, NOW)).toMatchObject({
        allowed: false,
        deniedDimension: "action_permission",
      });
    }
  });

  it("sees nothing outside the executive functional scope it was granted", () => {
    const decision = evaluateAccess(tomArrington, { action: "read", functionalScope: "safeguarding" }, NOW);
    expect(decision).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });
});

// ── Deny-by-default sweep ───────────────────────────────────────────────
describe("deny by default", () => {
  it("an empty profile is denied every action in every scope", () => {
    const empty = profile({
      baseAccessLevel: 5,
      functionalScopes: [],
      actionPermissions: [],
      sensitiveOverlays: [],
      caseScope: "own_applicants",
      teamId: null,
    });
    for (const action of ACTION_PERMISSIONS) {
      for (const scope of FUNCTIONAL_SCOPES) {
        expect(evaluateAccess(empty, { action, functionalScope: scope }, NOW).allowed).toBe(false);
      }
    }
  });

  it("every denial names the dimension that failed", () => {
    const decision = evaluateAccess(profile({ actionPermissions: [] }), { action: "read", functionalScope: "admissions" }, NOW);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.deniedDimension).toBeTruthy();
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });

  it("no denial reason leaks the value of the data being protected", () => {
    const decision = evaluateAccess(
      profile({ baseAccessLevel: 5, caseScope: "own_applicants", staffUserId: 5005 }),
      { action: "read", functionalScope: "admissions", case: caseFor([4004]) },
      NOW,
    );
    if (!decision.allowed) {
      expect(decision.reason).not.toMatch(/4004/);
    }
  });
});
