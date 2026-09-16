import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ getDb: async () => null }));

const { extractNameCandidates, resolveStudentByName, searchTerms } = await import("./studentContext");
const { gatherConnectorEvidence } = await import("./evidence");
const { LOOKUP_ACTOR } = await import("../crm/staffLookup");
import type { LookupDeps, CrmCandidate } from "../crm/staffLookup";
import type { ProfileResolution } from "../access/identity";

/**
 * A staff member names a student in ordinary language; the worker gets that
 * one record and nothing else. Tom Arrington, 16 September 2026. The
 * properties that matter: the worker never searches, the staff member's own
 * lookup and case scope decide what is found, one match becomes a read,
 * several become a question, none becomes a plain statement, and a refusal
 * stays a refusal.
 */
describe("extractNameCandidates", () => {
  it("finds a three-part name in a natural question and ignores sentence-initial capitals", () => {
    expect(extractNameCandidates("Where is Vivian Ene Onuh in the application process, who is her counsellor, and what should happen next?")).toEqual(["Vivian Ene Onuh"]);
  });
  it("handles a possessive, punctuation and upper-case CRM spelling", () => {
    expect(extractNameCandidates("Bring me up to speed on Peter Agada's application.")).toEqual(["Peter Agada"]);
    expect(extractNameCandidates("Is CHRISTOPHER MASIRI ready to submit?")).toEqual(["CHRISTOPHER MASIRI"]);
  });
  it("does not treat WSA vocabulary, worker names or institutions as students", () => {
    expect(extractNameCandidates("What are the entry requirements at Teesside University for a pre-master's?")).toEqual([]);
    expect(extractNameCandidates("James, what does the CAS Status field mean?")).toEqual([]);
    expect(extractNameCandidates("Is this application ready to send?")).toEqual([]);
  });
  it("never proposes a single word, and stops at four", () => {
    expect(extractNameCandidates("Ask Vivian please")).toEqual([]);
    expect(extractNameCandidates("Alpha Beta Gamma Delta Epsilon Zeta arrived")).toEqual([]);
  });
});

function profile(scopes: string[], level = 1): ProfileResolution {
  return {
    resolved: true,
    profile: {
      staffUserId: 7, baseAccessLevel: level as 1, functionalScopes: scopes as never, caseScope: "organisation", actionPermissions: ["read"], sensitiveOverlays: [], temporaryGrants: [], status: "active", teamId: null,
    } as never,
  } as ProfileResolution;
}
function candidate(id: number, name: string, stage = "S9 - Offers & Conditions"): CrmCandidate {
  return { personId: id, name, email: `${id}@example.invalid`, phone: null, ownerEmail: "eldah@worldstudentadvisors.com", ownerName: "Eldah Therone", stageLabel: stage, updateTime: "2026-09-14 15:50:00" };
}
function deps(found: CrmCandidate[], scopes = ["admissions"]): { deps: LookupDeps; audits: unknown[]; searches: string[] } {
  const audits: unknown[] = []; const searches: string[] = [];
  return {
    audits, searches,
    deps: {
      resolveProfile: async () => profile(scopes),
      search: async (term, by) => { searches.push(`${by}:${term}`); return found; },
      resolveOwner: async () => 3,
      audit: e => audits.push(e),
    },
  };
}
const ask = { workerId: "james" as const, staffUserId: 7, authMethod: "entra_sso" as const };

describe("searchTerms", () => {
  it("tries the full name, then first and last, then the surname, and never a first name alone", () => {
    expect(searchTerms("Vivian Ene Onuh")).toEqual(["Vivian Ene Onuh", "Vivian Onuh", "Onuh"]);
    expect(searchTerms("Peter Agada")).toEqual(["Peter Agada", "Agada"]);
  });
});

describe("resolveStudentByName", () => {
  it("finds a student whose CRM record lacks a middle name by falling back to first and last, and stops there", async () => {
    const searches: string[] = [];
    const d = deps([]);
    d.deps.search = async term => { searches.push(term); return term === "Vivian Onuh" ? [candidate(369, "VIVIAN ONUH")] : []; };
    const r = await resolveStudentByName({ ...ask, name: "Vivian Ene Onuh" }, d.deps);
    expect(r).toEqual({ kind: "one", personId: 369, name: "VIVIAN ONUH" });
    expect(searches).toEqual(["Vivian Ene Onuh", "Vivian Onuh"]);
  });
  it("a surname shared by several students becomes a question naming the spelling searched", async () => {
    const d = deps([]);
    d.deps.search = async term => term === "Okoro" ? [candidate(1, "Grace Okoro"), candidate(2, "Amaka Okoro")] : [];
    const r = await resolveStudentByName({ ...ask, name: "Gracie Okoro" }, d.deps);
    expect(r.kind).toBe("many");
    expect((r as { note: string }).note).toContain(`searched as "Okoro"`);
  });
  it("one match under the staff member's own authority becomes one person id, audited as the staff lookup, not as the worker", async () => {
    const d = deps([candidate(369, "VIVIAN ENE ONUH")]);
    const r = await resolveStudentByName({ ...ask, name: "Vivian Ene Onuh" }, d.deps);
    expect(r).toEqual({ kind: "one", personId: 369, name: "VIVIAN ENE ONUH" });
    expect(d.searches).toEqual(["name:Vivian Ene Onuh"]);
    const [event] = d.audits as Array<{ workerId: string; permissionReason: string; targetResourceId?: string }>;
    expect(event.workerId).toBe(LOOKUP_ACTOR);
    expect(event.permissionReason).toContain("scope=admissions");
    expect(event.targetResourceId).toBe("person:369");
  });
  it("several matches become a question, never a merge or a pick", async () => {
    const d = deps([candidate(1, "Grace Okoro"), candidate(2, "Grace Okoro", "S8 - App. Submitted")]);
    const r = await resolveStudentByName({ ...ask, name: "Grace Okoro" }, d.deps);
    expect(r.kind).toBe("many");
    expect((r as { note: string }).note).toContain("2 CRM students match");
    expect((r as { note: string }).note).toContain("which one they mean");
  });
  it("no match is stated plainly, with any case-scope withholding counted but never identified", async () => {
    const d = deps([]);
    expect((await resolveStudentByName({ ...ask, name: "Nobody Here" }, d.deps))).toMatchObject({ kind: "none" });
  });
  it("a staff member without the worker's scope is refused before the CRM is contacted", async () => {
    const d = deps([candidate(369, "VIVIAN ENE ONUH")], ["marketing_seo"]);
    const r = await resolveStudentByName({ ...ask, name: "Vivian Ene Onuh" }, d.deps);
    expect(r.kind).toBe("refused");
    expect(d.searches).toEqual([]);
  });
  it("a shared-password session has no identity and is refused", async () => {
    const d = deps([candidate(369, "VIVIAN ENE ONUH")]);
    d.deps.resolveProfile = async () => ({ resolved: false, reason: "no_profile" } as never);
    const r = await resolveStudentByName({ ...ask, staffUserId: null, authMethod: "shared_password", name: "Vivian Ene Onuh" }, d.deps);
    expect(r.kind).toBe("refused");
    expect(d.searches).toEqual([]);
  });
});

describe("gatherConnectorEvidence with a named student", () => {
  it("resolves the name under the staff member's authority and reads that one person under the worker's grant; the label says how it was identified", async () => {
    const seen: string[] = [];
    const evidence = await gatherConnectorEvidence({
      ...ask, requestText: "Where is Vivian Ene Onuh in the application process, who is her counsellor, and what should happen next?",
      resolveByName: async input => { seen.push(input.name); return { kind: "one", personId: 369, name: "VIVIAN ENE ONUH" }; },
    });
    expect(seen).toEqual(["Vivian Ene Onuh"]);
    // The read itself goes through the real gated connector, which in this
    // test has no database and no grant, so it reports a note rather than a
    // block: the point is that person 369 was the one and only thing asked for.
    const all = [...evidence.blocks.map(b => b.label), ...evidence.notes.map(n => n.note)].join("\n");
    expect(all).toContain("person 369");
    expect(all).not.toMatch(/person (?!369)\d+/);
  });
  it("does not resolve a name at all when the staff member typed an identifier", async () => {
    const seen: string[] = [];
    await gatherConnectorEvidence({ ...ask, requestText: "Where is Vivian Ene Onuh, CRM person 369?", resolveByName: async input => { seen.push(input.name); return { kind: "none", note: "x" }; } });
    expect(seen).toEqual([]);
  });
  it("does not resolve a name for a worker with no CRM grant", async () => {
    const seen: string[] = [];
    const evidence = await gatherConnectorEvidence({ ...ask, workerId: "amelia", requestText: "Tell me about Vivian Ene Onuh", resolveByName: async input => { seen.push(input.name); return { kind: "none", note: "x" }; } });
    expect(seen).toEqual([]);
    expect(evidence.blocks).toEqual([]);
  });
  it("relays a many-or-none resolution as a note the worker can state", async () => {
    const evidence = await gatherConnectorEvidence({ ...ask, requestText: "Where is Grace Okoro up to?", resolveByName: async () => ({ kind: "many", note: "2 CRM students match \"Grace Okoro\": ..." }) });
    expect(evidence.blocks).toEqual([]);
    expect(evidence.notes[0].note).toContain("2 CRM students match");
  });
});
