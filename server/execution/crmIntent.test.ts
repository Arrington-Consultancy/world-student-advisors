import { describe, expect, it, vi } from "vitest";
import { evidenceSourceText, gatherConnectorEvidence, nameCandidatesIn, studentRecordIntent } from "./evidence";
import { extractNameCandidates, resolveStudentByName } from "./studentContext";
import { composeSystemPrompt } from "./prompt";
import { getControlledBrief } from "./briefs";
import { routeByRemit } from "../workforce/remitRouter";
import { routeStaffRequest } from "../workforce/router";
import type { CrmCandidate, LookupDeps } from "../crm/staffLookup";
import type { ProfileResolution } from "../access/identity";

/**
 * Tom Arrington, 18 September 2026. A generic question ("Which WSA
 * specialist should handle a student who already has an unconditional
 * university offer but now needs help finding and applying for a
 * scholarship, and what should that specialist do first?") was answered
 * from a CRM search: the words "now needs" were read as a name, the
 * near-match pass surfaced four unrelated real students, and the worker
 * could not name Harper although the Worker Register is authoritative.
 */
const GENERIC =
  "Which WSA specialist should handle a student who already has an unconditional university offer but now needs help finding and applying for a scholarship, and what should that specialist do first?";

describe("generic and hypothetical questions reach no student record", () => {
  it("the exact production question: no name, no intent, no CRM search", () => {
    expect(extractNameCandidates(GENERIC, { lenient: true })).toEqual([]);
    expect(nameCandidatesIn(GENERIC)).toEqual([]);
    const intent = studentRecordIntent(GENERIC);
    expect(intent.intent).toBe(false);
    expect(intent.reason).toBe("generic_or_routing_question");
  });
  it.each([
    "What is the process when a student with an unconditional offer wants a scholarship?",
    "How do we handle students who have missed the CAS deadline?",
    "If a student needs help finding funding, what should happen first?",
    "Generally, who looks after visa refusals?",
    "what should we do with an applicant who has two offers",
  ])("%j is a kind of case, not a record", text => {
    expect(studentRecordIntent(text).intent).toBe(false);
  });
  it("ordinary lower-case English never becomes a name", () => {
    for (const t of ["now needs help finding", "she now needs help finding and applying", "help finding and applying for a scholarship"]) {
      expect(extractNameCandidates(t, { lenient: true })).toEqual([]);
    }
  });
  it("the evidence layer makes no CRM call for the generic question", async () => {
    const resolve = vi.fn(async () => ({ kind: "none" as const, note: "should not be called" }));
    const evidence = await gatherConnectorEvidence({
      workerId: "sophie",
      requestText: GENERIC,
      staffUserId: 1,
      authMethod: "entra_sso",
      resolveByName: resolve as never,
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(evidence.blocks).toEqual([]);
    expect(evidence.notes.filter(n => n.source === "pipedrive")).toEqual([]);
  });
});

describe("named-student questions still reach the record", () => {
  it.each([
    ["Where is Vivian Onuh in the admissions process?", ["Vivian Onuh"]],
    ["What would Grace Okoro need for her visa?", ["Grace Okoro"]],
    ["How is managing this lead?  Joyce Kitakang Federal Ministry of Environment Department of Forestry, Utako District, Abuja, Nigeria", ["Joyce Kitakang"]],
  ] as const)("%j names %j", (text, names) => {
    const intent = studentRecordIntent(text);
    expect(intent.intent).toBe(true);
    expect(intent.names).toEqual([...names]);
  });
  it("an identifier is intent on its own", () => {
    expect(studentRecordIntent("what stage is grace@example.com at").intent).toBe(true);
    expect(studentRecordIntent("pipedrive person 8534").intent).toBe(true);
  });
  it("the evidence layer resolves the named student", async () => {
    const resolve = vi.fn(async () => ({ kind: "none" as const, note: "not found in the double" }));
    await gatherConnectorEvidence({ workerId: "james", requestText: "Where is Vivian Onuh in the admissions process?", staffUserId: 1, authMethod: "entra_sso", resolveByName: resolve as never });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect((resolve.mock.calls[0] as unknown[])[0]).toMatchObject({ name: "Vivian Onuh" });
  });
});

describe("ambiguous but genuine case lookups keep working", () => {
  it.each([
    "who has joyce kitakang",
    "is grace okoro on the crm",
    "ar ethere any toms on pipedrive",
    "what stage is chidi okafor at",
  ])("%j carries record intent and a name to search", text => {
    const intent = studentRecordIntent(text);
    expect(intent.intent).toBe(true);
    expect(intent.names.length).toBeGreaterThan(0);
  });
  it("a follow-up with no name reads the student from the earlier message", () => {
    expect(evidenceSourceText("yes", ["Where is Vivian Onuh in the admissions process?"])).toBe("Where is Vivian Onuh in the admissions process?");
    expect(evidenceSourceText("go ahead", [GENERIC])).toBe("go ahead");
  });
});

describe("worker-routing questions go to the specialist who owns the subject", () => {
  it("the production question routes to Harper, not to a record lookup", () => {
    const d = routeByRemit(GENERIC);
    expect(d.outcome).toBe("scholarship_options");
    expect(d.responsibleWorkerId).toBe("harper");
    expect(routeStaffRequest(GENERIC).responsibleWorkerId).toBe("harper");
  });
  it.each([
    ["Which specialist handles visa rules for dependants?", "priya"],
    ["who should handle scholarships for a student with an unconditional offer", "harper"],
    ["which worker deals with whether an application is ready to send", "james"],
  ])("%j -> %s", (text, worker) => {
    expect(routeStaffRequest(text).responsibleWorkerId).toBe(worker);
    expect(studentRecordIntent(text).intent).toBe(false);
  });
  it("a named student's record question still routes to Sophie", () => {
    expect(routeStaffRequest("Who is managing this lead? Joyce Kitakang").responsibleWorkerId).toBe("sophie");
  });
});

describe("every worker carries the approved Worker Register roster", () => {
  it("names Harper for scholarships, with the boundary, so a routing question is answered by name", () => {
    const brief = getControlledBrief("sophie")!;
    const system = composeSystemPrompt({ brief, context: { denied: false, caseData: null } as never, contributions: [] });
    expect(system).toContain("WSA SPECIALISTS, FROM THE APPROVED WORKER REGISTER");
    expect(system).toMatch(/- Harper, Scholarships & Funding: /);
    expect(system).toContain("name the specialist above who owns it");
    expect(system).toContain("Never invent a specialist");
  });
});

describe("data minimisation: a stray phrase never earns a list of real students", () => {
  function profile(): ProfileResolution {
    return {
      resolved: true,
      droppedGrantValues: [],
      profile: {
        staffUserId: 7, baseAccessLevel: 1, functionalScopes: ["enquiry_triage", "admissions"] as never, caseScope: "organisation",
        actionPermissions: ["read"], sensitiveOverlays: [], temporaryGrants: [], status: "active", teamId: null,
        assignedByStaffUserId: null, assignedAt: null, assignmentReason: null,
      } as never,
    } as ProfileResolution;
  }
  const unrelated: CrmCandidate[] = [
    { personId: 1, name: "Aneeka Snow", email: null, phone: null, ownerEmail: null, ownerName: "Tim Hunt", stageLabel: "No open enquiry", updateTime: "2026-09-01" },
    { personId: 2, name: "Newton Adeyemi", email: null, phone: null, ownerEmail: null, ownerName: "Tim Hunt", stageLabel: "No open enquiry", updateTime: "2026-09-01" },
  ];
  const deps: LookupDeps = {
    resolveProfile: async () => profile(),
    search: async () => unrelated,
    audit: () => undefined,
  };
  it("a phrase of ordinary English resolves to none, and the note names nobody", async () => {
    const r = await resolveStudentByName({ name: "now needs", workerId: "sophie", staffUserId: 7, authMethod: "entra_sso" }, deps);
    expect(r.kind).toBe("none");
    if (r.kind !== "none") return;
    expect(r.note).not.toContain("Aneeka");
    expect(r.note).not.toContain("Newton");
  });
  it("a real two-part name still reaches the near-match pass", async () => {
    const d: LookupDeps = { ...deps, search: async term => (term === "Okoro" ? [{ ...unrelated[0], personId: 3, name: "Grace Okoro" }] : []) };
    const r = await resolveStudentByName({ name: "Gracie Okoro", workerId: "sophie", staffUserId: 7, authMethod: "entra_sso" }, d);
    expect(r.kind).toBe("probable");
  });
});
