import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import {
  lookupStudents,
  LOOKUP_ACTOR,
  type CrmCandidate,
  type LookupDeps,
  type LookupBy,
} from "./staffLookup";
import type { StaffAccessProfile } from "../access/accessControl";
import type { ProfileResolution } from "../access/identity";
import { WORKER_CRM_SCOPE } from "../workforce/crmScope";

/**
 * The staff-facing student lookup, tested against the six properties Tom
 * Arrington required on 8 September 2026 plus one of mine.
 *
 * The concern behind all of them: "staff-facing" must not mean the backend
 * token quietly exposes the whole CRM to every authenticated staff member.
 * So the fixtures are two students owned by two different staff members,
 * and nearly every test asks the same question from a different angle: can
 * the second one's record reach the first one's screen?
 *
 * Dependencies are injected, so no database and no Pipedrive are involved,
 * and a spy on `search` can prove the CRM was never contacted at all.
 */

const ME = 10;
const COLLEAGUE = 20;

function resolved(over: Partial<StaffAccessProfile> = {}): ProfileResolution {
  return {
    resolved: true,
    droppedGrantValues: [],
    profile: {
      staffUserId: ME,
      baseAccessLevel: 4,
      functionalScopes: ["enquiry_triage"],
      caseScope: "own_applicants",
      actionPermissions: ["read"],
      sensitiveOverlays: [],
      temporaryGrants: [],
      status: "active",
      teamId: null,
      assignedByStaffUserId: null,
      assignedAt: null,
      assignmentReason: null,
      ...over,
    },
  };
}

const UNRESOLVED: ProfileResolution = {
  resolved: false,
  reason: "no_individual_identity",
  detail: "shared password",
};

/** Owned by me. */
const MINE: CrmCandidate = {
  personId: 1001,
  name: "Mine Fixture",
  email: "mine@fixture.test",
  phone: "+44 7700 900001",
  ownerEmail: "me@worldstudentadvisors.com",
  ownerName: "Me",
  stageLabel: "Getting to know you",
  updateTime: "2026-09-01T10:00:00Z",
};

/** Owned by a colleague. Must never appear on my screen under own_applicants. */
const THEIRS: CrmCandidate = {
  personId: 2002,
  name: "Theirs Fixture",
  email: "theirs@fixture.test",
  phone: "+44 7700 900002",
  ownerEmail: "colleague@worldstudentadvisors.com",
  ownerName: "Colleague",
  stageLabel: "Offer received",
  updateTime: "2026-09-02T10:00:00Z",
};

/** Owner email matches no staff account. */
const ORPHAN: CrmCandidate = { ...THEIRS, personId: 3003, name: "Orphan Fixture", ownerEmail: "nobody@elsewhere.test", ownerName: "Nobody" };

const OWNER_MAP: Record<string, number> = {
  "me@worldstudentadvisors.com": ME,
  "colleague@worldstudentadvisors.com": COLLEAGUE,
};

function deps(
  profile: ProfileResolution,
  candidates: CrmCandidate[] = [MINE, THEIRS],
): LookupDeps & { search: ReturnType<typeof vi.fn>; audit: ReturnType<typeof vi.fn> } {
  return {
    resolveProfile: vi.fn(async () => profile),
    search: vi.fn(async () => candidates),
    resolveOwner: vi.fn(async (email: string | null) => (email ? OWNER_MAP[email] ?? null : null)),
    audit: vi.fn(),
    now: new Date("2026-09-09T12:00:00Z"),
  };
}

const ask = (d: LookupDeps, by: LookupBy = "email", staffUserId: number | null = ME) =>
  lookupStudents({ staffUserId, authMethod: "entra_sso", term: "fixture", by }, d);

describe("1. a user without enquiry_triage gets nothing", () => {
  it("is refused and Pipedrive is never called", async () => {
    const d = deps(resolved({ functionalScopes: ["admissions"] }));
    const r = await ask(d);
    expect(r.refused).toBe(true);
    expect(d.search).not.toHaveBeenCalled();
  });

  it("is refused with the scope named, so the person knows what to ask for", async () => {
    const d = deps(resolved({ functionalScopes: [] }));
    const r = await ask(d);
    expect(r.refused && r.reason).toContain("enquiry_triage");
  });

  it("holding read without the scope is not enough", async () => {
    const d = deps(resolved({ functionalScopes: ["marketing_seo"], actionPermissions: ["read", "create"] }));
    expect((await ask(d)).refused).toBe(true);
    expect(d.search).not.toHaveBeenCalled();
  });
});

describe("2. an out-of-scope student is filtered before projection", () => {
  it("returns only my student, and counts the other as withheld", async () => {
    const r = await ask(deps(resolved()));
    expect(r.refused).toBe(false);
    if (r.refused) return;
    expect(r.results.map(x => x.personId)).toEqual([1001]);
    expect(r.withheldCount).toBe(1);
  });

  it("leaks no field of the withheld record anywhere in the response", async () => {
    const r = await ask(deps(resolved()));
    const json = JSON.stringify(r);
    for (const leak of ["2002", "Theirs Fixture", "theirs@fixture.test", "900002", "Offer received", "Colleague"]) {
      expect(json).not.toContain(leak);
    }
  });

  it("filters while the record is still raw, before it becomes a result", () => {
    const src = readFileSync("server/crm/staffLookup.ts", "utf8");
    const body = src.slice(src.indexOf("export async function lookupStudents"));
    const filter = body.indexOf("if (decision.allowed) permitted.push(candidate)");
    const projection = body.indexOf("permitted.map(project)");
    expect(filter).toBeGreaterThan(-1);
    expect(projection).toBeGreaterThan(-1);
    expect(filter).toBeLessThan(projection);
  });

  it("the owner match feeds only case scope: a matching owner cannot rescue a missing scope", async () => {
    const d = deps(resolved({ functionalScopes: [] }), [MINE]);
    expect((await ask(d)).refused).toBe(true);
  });
});

describe("3. an owner-email mismatch fails closed", () => {
  it("withholds a record whose owner matches no staff account", async () => {
    const r = await ask(deps(resolved(), [ORPHAN]));
    if (r.refused) throw new Error("unexpected refusal");
    expect(r.results).toHaveLength(0);
    expect(r.withheldCount).toBe(1);
  });

  it("withholds a record with no owner at all", async () => {
    const r = await ask(deps(resolved(), [{ ...MINE, ownerEmail: null, ownerName: null }]));
    if (r.refused) throw new Error("unexpected refusal");
    expect(r.results).toHaveLength(0);
  });

  it("does not guess: an owner email differing only by case is resolved by the resolver, not by the lookup", async () => {
    // The lookup passes the email through untouched. Normalisation belongs to
    // the resolver, which is tested against the real table; here a resolver
    // that does not match must produce a withheld record.
    const strict = deps(resolved(), [{ ...MINE, ownerEmail: "ME@WorldStudentAdvisors.com" }]);
    strict.resolveOwner = vi.fn(async (e: string | null) => (e && OWNER_MAP[e] !== undefined ? OWNER_MAP[e] : null));
    const r = await ask(strict);
    if (r.refused) throw new Error("unexpected refusal");
    expect(r.results).toHaveLength(0);
  });
});

describe("4. searching by phone, email or name cannot leak another student", () => {
  for (const by of ["phone", "email", "name"] as LookupBy[]) {
    it(`by ${by}: the colleague's student never appears`, async () => {
      const r = await ask(deps(resolved()), by);
      if (r.refused) throw new Error("unexpected refusal");
      expect(r.results.map(x => x.personId)).toEqual([1001]);
      expect(JSON.stringify(r)).not.toContain("Theirs Fixture");
      expect(r.searchedBy).toBe(by);
    });
  }
});

describe("5. no edit, delete or worker CRM access is introduced", () => {
  it("the read module issues GET and nothing else", () => {
    const src = readFileSync("server/pipedrive-read.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/method\s*:/);
    expect(src).not.toMatch(/\b(POST|PUT|PATCH|DELETE)\b/);
  });

  it("the lookup never imports the write-capable Pipedrive module", () => {
    for (const f of ["server/crm/staffLookup.ts", "server/crm/lookupDeps.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/from\s+["']\.\.\/pipedrive["']/);
      expect(src).not.toContain("createStudentLead");
    }
  });

  it("every worker's CRM scope is still null: no worker gained Pipedrive access", () => {
    const values = Object.values(WORKER_CRM_SCOPE);
    expect(values).toHaveLength(16);
    expect(values.every(v => v === null)).toBe(true);
  });

  it("the lookup is recorded as the platform, not as a worker", async () => {
    const d = deps(resolved());
    await ask(d);
    const event = d.audit.mock.calls[0][0];
    expect(event.workerId).toBe(LOOKUP_ACTOR);
    expect(event.workerId).toBe("staff_portal");
  });
});

describe("6. the lookup is auditable against the named staff identity", () => {
  it("records an allowed lookup against the staff id, with counts and matched ids", async () => {
    const d = deps(resolved());
    await ask(d);
    expect(d.audit).toHaveBeenCalledTimes(1);
    const e = d.audit.mock.calls[0][0];
    expect(e.staffUserId).toBe(ME);
    expect(e.permissionDecision).toBe("allowed");
    expect(e.requestedCapability).toBe("crm:lookup");
    expect(e.connector).toBe("pipedrive");
    expect(e.permissionReason).toContain("1 returned, 1 withheld");
    expect(e.targetResourceId).toBe("person:1001");
  });

  it("records a refusal against the staff id too", async () => {
    const d = deps(resolved({ functionalScopes: [] }));
    await ask(d);
    const e = d.audit.mock.calls[0][0];
    expect(e.staffUserId).toBe(ME);
    expect(e.permissionDecision).toBe("denied");
    expect(e.errorCategory).toBe("permission_denied");
  });

  it("never writes the search term, which is itself personal data", async () => {
    const d = deps(resolved());
    await lookupStudents({ staffUserId: ME, authMethod: "entra_sso", term: "+44 7700 900001", by: "phone" }, d);
    const e = d.audit.mock.calls[0][0];
    expect(JSON.stringify(e)).not.toContain("900001");
  });

  it("never writes a withheld record's id", async () => {
    const d = deps(resolved());
    await ask(d);
    expect(JSON.stringify(d.audit.mock.calls[0][0])).not.toContain("2002");
  });
});

describe("7. a session with no individual identity gets nothing", () => {
  it("a shared-password session is refused before any CRM call", async () => {
    const d = deps(UNRESOLVED);
    const r = await lookupStudents({ staffUserId: null, authMethod: "shared_password", term: "fixture", by: "email" }, d);
    expect(r.refused).toBe(true);
    expect(d.search).not.toHaveBeenCalled();
  });

  it("an inactive account is refused before any CRM call", async () => {
    const d = deps(resolved({ status: "suspended" }));
    expect((await ask(d)).refused).toBe(true);
    expect(d.search).not.toHaveBeenCalled();
  });
});

describe("positive controls", () => {
  it("organisation scope sees both and withholds nothing", async () => {
    const r = await ask(deps(resolved({ caseScope: "organisation", baseAccessLevel: 1 })));
    if (r.refused) throw new Error("unexpected refusal");
    expect(r.results.map(x => x.personId).sort()).toEqual([1001, 2002]);
    expect(r.withheldCount).toBe(0);
  });

  it("returns exactly the seven approved fields and no others", async () => {
    const r = await ask(deps(resolved(), [MINE]));
    if (r.refused) throw new Error("unexpected refusal");
    expect(Object.keys(r.results[0]).sort()).toEqual(
      ["counsellor", "email", "lastUpdated", "name", "personId", "phone", "stageLabel"],
    );
    expect(JSON.stringify(r)).not.toContain("ownerEmail");
    expect(JSON.stringify(r)).not.toContain("me@worldstudentadvisors.com");
  });

  it("the coarse permission check runs before the search, in the source", () => {
    const src = readFileSync("server/crm/staffLookup.ts", "utf8");
    const body = src.slice(src.indexOf("export async function lookupStudents"));
    expect(body.indexOf("if (!coarse.allowed) return refuse")).toBeLessThan(body.indexOf("await deps.search("));
  });
});
