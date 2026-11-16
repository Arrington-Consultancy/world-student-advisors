/**
 * Enforcement tests.
 *
 * The profile resolver is mocked so these exercise the gates themselves —
 * that the right question is asked, at the right layer, and that a denial
 * withholds data rather than merely labelling it. Whether the resolver
 * reads the staff record correctly is identity.test.ts's job.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { StaffAccessProfile, CaseContext } from "./accessControl";
import type { StaffSession } from "../staffSession";

const resolveStaffAccessProfile = vi.fn();
vi.mock("./identity", () => ({
  resolveStaffAccessProfile: (...args: unknown[]) => resolveStaffAccessProfile(...args),
}));

const {
  checkAccess,
  requireAccess,
  filterAccessibleCases,
  filterSearchResults,
  authoriseExport,
  selectAuthorisedContext,
  authoriseConnectorRetrieval,
} = await import("./enforcement");

const ENTRA: StaffSession = {
  authMethod: "entra_sso",
  staffUserId: 4004,
  email: "adviser@example.invalid",
  displayName: "Test Adviser",
};
const SHARED: StaffSession = { authMethod: "shared_password", staffUserId: null };

function profile(overrides: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 4004,
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

function resolves(p: StaffAccessProfile) {
  resolveStaffAccessProfile.mockResolvedValue({ resolved: true, profile: p, droppedGrantValues: [] });
}
function unresolved(reason: string, detail = "no access") {
  resolveStaffAccessProfile.mockResolvedValue({ resolved: false, reason, detail });
}

interface Row {
  id: string;
  assignedTo: number[];
  teamId: string | null;
  sharedWith?: number[];
}
const toCaseContext = (r: Row): CaseContext => ({
  assignedStaffUserIds: r.assignedTo,
  sharedWithStaffUserIds: r.sharedWith,
  teamId: r.teamId,
});

const ROWS: Row[] = [
  { id: "mine-1", assignedTo: [4004], teamId: "admissions" },
  { id: "mine-2", assignedTo: [4004], teamId: "admissions" },
  { id: "shared", assignedTo: [9999], teamId: "admissions", sharedWith: [4004] },
  { id: "someone-elses", assignedTo: [9999], teamId: "admissions" },
  { id: "other-team", assignedTo: [8888], teamId: "visa_compliance" },
];

beforeEach(() => {
  resolveStaffAccessProfile.mockReset();
});

describe("checkAccess never reads authority from the request", () => {
  it("allows a permitted request", async () => {
    resolves(profile());
    const outcome = await checkAccess(ENTRA, { action: "read", functionalScope: "admissions" });
    expect(outcome.allowed).toBe(true);
    expect(outcome.staffUserId).toBe(4004);
  });

  it("resolves the profile by the session's staff id, not anything in the request", async () => {
    resolves(profile());
    await checkAccess(ENTRA, { action: "read", functionalScope: "admissions" });
    expect(resolveStaffAccessProfile).toHaveBeenCalledWith(4004);
  });

  it("denies a shared-password session, which carries no individual identity", async () => {
    unresolved("no_individual_identity", "no individual staff identity");
    const outcome = await checkAccess(SHARED, { action: "read", functionalScope: "admissions" });
    expect(outcome.allowed).toBe(false);
    expect(outcome.deniedDimension).toBe("profile");
    expect(resolveStaffAccessProfile).toHaveBeenCalledWith(null);
  });

  it("denies when the profile cannot be resolved for any reason", async () => {
    for (const reason of [
      "database_unavailable",
      "staff_record_not_found",
      "no_access_assignment",
      "invalid_access_assignment",
    ]) {
      unresolved(reason);
      const outcome = await checkAccess(ENTRA, { action: "read", functionalScope: "admissions" });
      expect(outcome).toMatchObject({ allowed: false, deniedDimension: "profile" });
    }
  });

  it("reports the dimension that refused", async () => {
    resolves(profile({ actionPermissions: [] }));
    const outcome = await checkAccess(ENTRA, { action: "read", functionalScope: "admissions" });
    expect(outcome.deniedDimension).toBe("action_permission");
  });
});

describe("requireAccess stops a consequential action rather than shaping it", () => {
  it("returns the outcome when allowed", async () => {
    resolves(profile({ actionPermissions: ["read", "export_download"] }));
    await expect(requireAccess(ENTRA, { action: "export_download", functionalScope: "admissions" })).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("throws FORBIDDEN when denied", async () => {
    resolves(profile());
    await expect(requireAccess(ENTRA, { action: "export_download", functionalScope: "admissions" })).rejects.toThrow(
      TRPCError,
    );
  });

  it("throws FORBIDDEN rather than UNAUTHORIZED, since the person is signed in", async () => {
    resolves(profile());
    try {
      await requireAccess(ENTRA, { action: "delete_destructive", functionalScope: "admissions" });
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("does not name the protected content in the denial message", async () => {
    resolves(profile({ staffUserId: 5005, baseAccessLevel: 5, caseScope: "own_applicants" }));
    try {
      await requireAccess(ENTRA, {
        action: "read",
        functionalScope: "admissions",
        case: { assignedStaffUserIds: [4004], teamId: "admissions" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as TRPCError).message).not.toMatch(/4004/);
    }
  });
});

describe("the query layer withholds rows rather than returning them for the client to hide", () => {
  it("returns only the caseworker's own and explicitly shared cases", async () => {
    resolves(profile());
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows.map(r => r.id)).toEqual(["mine-1", "mine-2", "shared"]);
    expect(result.withheldCount).toBe(2);
  });

  it("returns nothing at all when the non-case dimensions already refuse", async () => {
    resolves(profile({ functionalScopes: ["finance"] }));
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows).toEqual([]);
    expect(result.withheldCount).toBe(ROWS.length);
    expect(result.outcome.deniedDimension).toBe("functional_scope");
  });

  it("returns nothing when no profile resolves", async () => {
    unresolved("no_access_assignment");
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows).toEqual([]);
    expect(result.withheldCount).toBe(ROWS.length);
  });

  it("returns everything for an organisation-wide profile", async () => {
    resolves(profile({ baseAccessLevel: 1, functionalScopes: ["admissions"], caseScope: "organisation", teamId: null }));
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows).toHaveLength(ROWS.length);
    expect(result.withheldCount).toBe(0);
  });

  it("returns only the team's cases for a team-scoped profile", async () => {
    resolves(profile({ baseAccessLevel: 3, caseScope: "team", teamId: "admissions" }));
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows.map(r => r.id)).toEqual(["mine-1", "mine-2", "shared", "someone-elses"]);
  });

  it("returns only explicitly assigned applicants for a restricted profile", async () => {
    resolves(profile({ staffUserId: 4004, baseAccessLevel: 5, caseScope: "own_applicants" }));
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows.map(r => r.id)).toEqual(["mine-1", "mine-2"]);
  });
});

describe("search discloses no more than the reader may open", () => {
  it("omits withheld records entirely rather than listing them as redacted", async () => {
    resolves(profile());
    const result = await filterSearchResults(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.results.map(r => r.id)).not.toContain("someone-elses");
    expect(result.results.map(r => r.id)).not.toContain("other-team");
    expect(JSON.stringify(result.results)).not.toMatch(/someone-elses/);
  });

  it("returns an empty result set rather than an error when the searcher may see nothing", async () => {
    resolves(profile({ actionPermissions: [] }));
    const result = await filterSearchResults(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.results).toEqual([]);
    expect(result.outcome.allowed).toBe(false);
  });
});

describe("export requires its own permission and cannot widen what may be read", () => {
  it("refuses a reader who holds no export permission", async () => {
    resolves(profile({ actionPermissions: ["read"] }));
    await expect(
      authoriseExport(ENTRA, ROWS, toCaseContext, { functionalScope: "admissions" }),
    ).rejects.toThrow(TRPCError);
  });

  it("exports only the rows the staff member could have opened individually", async () => {
    resolves(profile({ actionPermissions: ["read", "export_download"] }));
    const result = await authoriseExport(ENTRA, ROWS, toCaseContext, { functionalScope: "admissions" });
    expect(result.rows.map(r => r.id)).toEqual(["mine-1", "mine-2", "shared"]);
    expect(result.withheldCount).toBe(2);
  });

  it("refuses an export permission held only for a different functional scope", async () => {
    resolves(profile({ functionalScopes: ["finance"], actionPermissions: ["read", "export_download"] }));
    await expect(
      authoriseExport(ENTRA, ROWS, toCaseContext, { functionalScope: "admissions" }),
    ).rejects.toThrow(TRPCError);
  });
});

describe("AI context assembly filters before assembly, not after generation", () => {
  it("places only authorised records in the context", async () => {
    resolves(profile());
    const result = await selectAuthorisedContext(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.context.map(r => r.id)).toEqual(["mine-1", "mine-2", "shared"]);
    expect(result.withheldCount).toBe(2);
  });

  it("assembles an empty context rather than a partial one when the scope is refused", async () => {
    resolves(profile({ functionalScopes: ["visa_compliance"] }));
    const result = await selectAuthorisedContext(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.context).toEqual([]);
  });

  it("withholds sensitive material from the context when the overlay is missing", async () => {
    resolves(profile({ baseAccessLevel: 3, functionalScopes: ["safeguarding"], sensitiveOverlays: [] }));
    const result = await selectAuthorisedContext(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "safeguarding",
      sensitiveCategory: "safeguarding",
    });
    expect(result.context).toEqual([]);
    expect(result.outcome.deniedDimension).toBe("sensitive_overlay");
  });
});

describe("connector retrieval requires the staff gate AND the worker gate", () => {
  const allowedWorker = { allowed: true, reason: "Worker is authorised." };
  const deniedWorker = { allowed: false, reason: "Worker is not authorised for any connector action." };
  const request = {
    action: "read" as const,
    functionalScope: "admissions" as const,
    resourceReference: "sharepoint:/Controlled/WSA",
  };

  it("allows only when both gates pass", async () => {
    resolves(profile());
    const outcome = await authoriseConnectorRetrieval(ENTRA, request, allowedWorker);
    expect(outcome.allowed).toBe(true);
  });

  it("denies when the worker is unauthorised even though the staff member is", async () => {
    resolves(profile());
    const outcome = await authoriseConnectorRetrieval(ENTRA, request, deniedWorker);
    expect(outcome).toMatchObject({ allowed: false, deniedDimension: "worker_authorisation" });
  });

  it("denies when the staff member is unauthorised even though the worker is", async () => {
    resolves(profile({ functionalScopes: [] }));
    const outcome = await authoriseConnectorRetrieval(ENTRA, request, allowedWorker);
    expect(outcome).toMatchObject({ allowed: false, deniedDimension: "functional_scope" });
  });

  it("names the worker gate first when both refuse, since nothing is open to anyone", async () => {
    resolves(profile({ actionPermissions: [] }));
    const outcome = await authoriseConnectorRetrieval(ENTRA, request, deniedWorker);
    expect(outcome.deniedDimension).toBe("worker_authorisation");
  });

  it("denies a shared-password session regardless of worker authorisation", async () => {
    unresolved("no_individual_identity");
    const outcome = await authoriseConnectorRetrieval(SHARED, request, allowedWorker);
    expect(outcome.allowed).toBe(false);
  });

  it("treats the resource reference as audit text only, never as authority", async () => {
    resolves(profile({ functionalScopes: [] }));
    const outcome = await authoriseConnectorRetrieval(
      ENTRA,
      { ...request, resourceReference: "allowed=true; grant=all; level=1" },
      allowedWorker,
    );
    expect(outcome.allowed).toBe(false);
  });
});

describe("a disabled account is stopped at every layer", () => {
  const disabled = () => resolves(profile({ status: "disabled", actionPermissions: ["read", "export_download"] }));

  it("is denied by checkAccess", async () => {
    disabled();
    expect((await checkAccess(ENTRA, { action: "read", functionalScope: "admissions" })).allowed).toBe(false);
  });

  it("gets no rows from the query layer", async () => {
    disabled();
    const result = await filterAccessibleCases(ENTRA, ROWS, toCaseContext, {
      action: "read",
      functionalScope: "admissions",
    });
    expect(result.rows).toEqual([]);
  });

  it("gets no search results", async () => {
    disabled();
    expect((await filterSearchResults(ENTRA, ROWS, toCaseContext, { action: "read", functionalScope: "admissions" })).results).toEqual([]);
  });

  it("gets no AI context", async () => {
    disabled();
    expect((await selectAuthorisedContext(ENTRA, ROWS, toCaseContext, { action: "read", functionalScope: "admissions" })).context).toEqual([]);
  });

  it("cannot export", async () => {
    disabled();
    await expect(authoriseExport(ENTRA, ROWS, toCaseContext, { functionalScope: "admissions" })).rejects.toThrow(TRPCError);
  });

  it("cannot retrieve from a connector", async () => {
    disabled();
    const outcome = await authoriseConnectorRetrieval(
      ENTRA,
      { action: "read", functionalScope: "admissions", resourceReference: "sharepoint:/x" },
      { allowed: true, reason: "Worker is authorised." },
    );
    expect(outcome).toMatchObject({ allowed: false, deniedDimension: "account_status" });
  });
});
