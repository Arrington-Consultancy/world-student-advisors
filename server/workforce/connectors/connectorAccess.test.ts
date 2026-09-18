import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The ten proofs Tom asked for on 11 September 2026, run against the real
 * gates with the outside world faked at the network edge only.
 *
 * Nothing between the connector entry point and the HTTP call is mocked:
 * the worker grant, the staff member's own access, the WSA boundary, the
 * location allowlist, the per-worker constraints and the audit writer are
 * all the production code. Only resolveStaffAccessProfile (the database)
 * and fetch (Pipedrive and Graph) are replaced.
 */
vi.mock("../../access/identity", () => ({ resolveStaffAccessProfile: vi.fn() }));
vi.mock("../../db", () => ({ getDb: async () => null }));
// The WSA Pipedrive OAuth grant, stood in for at the module edge: a usable
// read-only access token against the company's api_domain. The real module
// is tested in server/crm; here every request must carry it as a Bearer
// header and nothing else.
const OAUTH_ACCESS_TOKEN = "oauth-access-token-test-value";
const OAUTH_API_DOMAIN = "https://worldstudentadvisors.pipedrive.com";
vi.mock("../../crm/pipedriveOAuth", () => ({
  pipedriveOAuthStatusSync: () => "operational",
  getPipedriveOAuthAccess: async () => ({ ok: true, accessToken: OAUTH_ACCESS_TOKEN, apiDomain: OAUTH_API_DOMAIN }),
}));

const { resolveStaffAccessProfile } = await import("../../access/identity");
const { searchPipedrive, readPipedriveRecord, PIPEDRIVE_WORKER_CONSTRAINTS } = await import("./pipedrive");
const { readSharePointRecord } = await import("./sharepoint");
const { clearAuditLog, getAuditLog } = await import("../audit");
const { NEVER_PROJECTED_KEYS, WORKER_CRM_FIELDS } = await import("./crmProjection");

const ORIGINAL_ENV = { ...process.env };
const SITE = "worldstudentadvisors123.sharepoint.com,site-guid,web-guid";

type Level = 1 | 2 | 3 | 4;
function profile(over: Partial<{ level: Level; scopes: string[]; actions: string[]; overlays: string[]; caseScope: string; status: string }> = {}) {
  return {
    resolved: true as const,
    profile: {
      staffUserId: 7,
      baseAccessLevel: over.level ?? 1,
      functionalScopes: over.scopes ?? ["enquiry_triage", "discovery", "suitability", "admissions", "visa_compliance", "scholarships_funding", "pre_arrival_student_success", "quality_assurance", "education_research", "marketing_seo", "records_control", "paid_media", "social_media"],
      caseScope: over.caseScope ?? "organisation",
      actionPermissions: over.actions ?? ["read", "create", "update"],
      sensitiveOverlays: over.overlays ?? [],
      status: over.status ?? "active",
      teamId: null,
      temporaryGrants: [],
      unrecognisedValues: [],
    },
  };
}

const PERSON = { id: 501, name: "Test Student", email: [{ value: "student@example.com", primary: true }], phone: [{ value: "+447700900123", primary: true }], owner_id: { id: 9, name: "Eldah Therone", email: "eldah@worldstudentadvisors.com" }, update_time: "2026-09-10 10:00:00",
  e356695ee8528b30890e38e5f0875afb6644d61c: "P1234567", birthday: "2001-01-01", notes: "private", "307e8c7f3a14e8f6a24839151f093ce0f9c93365": "Taught Master's", "266a5abd49db981b98afac3ee06c92f499622602": "Nigerian" };
const DEAL = { id: 900, stage_id: 21, user_id: 9, update_time: "2026-09-10 10:00:00", "281c39e1c789dae2c1536d369515fc8d803a93c3": "Issued", "618f62532ad7b2a74cc6f4d2e1d2b2ad98743e53": 15000 };

function fakePipedrive(personStage = 21) {
  return vi.fn(async (url: string) => {
    const u = String(url);
    const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
    if (u.includes("/persons/search")) return ok({ items: [{ item: { id: 501 } }] });
    if (u.includes("/persons/501/deals")) return ok([{ ...DEAL, stage_id: personStage }]);
    if (u.includes("/persons/501")) return ok(PERSON);
    if (u.includes("/deals/900")) return ok({ ...DEAL, stage_id: personStage });
    if (u.includes("/leads")) return ok([]);
    return new Response("not found", { status: 404 });
  });
}

beforeEach(() => {
  clearAuditLog();
  process.env.PIPEDRIVE_API_TOKEN = "live-website-token-must-never-appear";
  process.env.SHAREPOINT_GRAPH_CLIENT_ID = "c"; process.env.SHAREPOINT_GRAPH_CLIENT_SECRET = "s";
  process.env.SHAREPOINT_GRAPH_TENANT_ID = "t"; process.env.SHAREPOINT_GRAPH_SITE_ID = SITE;
  vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile()) as never);
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.restoreAllMocks(); });

const entra = { staffUserId: 7, authMethod: "entra_sso" as const };
/** What the real resolver returns for a session with no individual identity. */
const UNRESOLVED = { resolved: false as const, reason: "no_access_assignment", detail: "This staff account has no recorded access assignment, so it holds no access (fail closed)." };

describe("1. authorised staff + authorised worker + authorised data succeeds", () => {
  it("Sophie looks up an incoming person by email and gets the approved fields", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const r = await searchPipedrive({ ...entra, workerId: "sophie", resourceScope: "person/search/email/student%40example.com" });
    expect(r.success).toBe(true);
    const rows = r.data as Array<Record<string, unknown>>;
    expect(rows[0].personId).toBe(501);
    expect(rows[0].counsellor).toBe("Eldah Therone");
    expect(Object.keys(rows[0].fields as object)).toContain("Desired Level of Study");
  });
  it("James reads a person and sees the application fields, Harper the funding ones", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const james = await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    const harper = await readPipedriveRecord({ ...entra, workerId: "harper", resourceScope: "person/501" });
    expect(james.success && harper.success).toBe(true);
    expect(Object.keys((james.data as any).fields)).toContain("Offer Status 1");
    expect(Object.keys((james.data as any).fields)).not.toContain("Confirmed Budget (GBP)");
    expect(Object.keys((harper.data as any).fields)).toContain("Confirmed Budget (GBP)");
  });
});

describe("1b. every CRM request rides the WSA OAuth grant and nothing else", () => {
  it("is a GET against the company api_domain with a Bearer header, no api_token parameter, and never the website token", async () => {
    const inner = fakePipedrive();
    const spy = vi.fn(async (url: string, init?: RequestInit) => inner(url));
    vi.stubGlobal("fetch", spy);
    const r = await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    expect(r.success).toBe(true);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
    for (const [url, init] of spy.mock.calls as unknown as Array<[string, RequestInit | undefined]>) {
      expect(url.startsWith(`${OAUTH_API_DOMAIN}/api/v1/`)).toBe(true);
      expect(url).not.toContain("api_token");
      expect(url).not.toContain("live-website-token");
      expect(url).not.toContain("api.pipedrive.com");
      expect((init?.headers as Record<string, string>)?.Authorization).toBe(`Bearer ${OAUTH_ACCESS_TOKEN}`);
      expect(init?.method ?? "GET").toBe("GET");
    }
  });
});

describe("2. unauthorised staff is denied", () => {
  it("a staff member without the worker's scope", async () => {
    vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile({ scopes: ["marketing_seo"] })) as never);
    vi.stubGlobal("fetch", fakePipedrive());
    const r = await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    expect(r.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("a shared-password session with no individual identity", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const r = await readPipedriveRecord({ staffUserId: null, authMethod: "shared_password", workerId: "james", resourceScope: "person/501" });
    expect(r.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("Priya's read needs the visa_regulated overlay on the staff member", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const without = await readPipedriveRecord({ ...entra, workerId: "priya", resourceScope: "person/501" });
    expect(without.success).toBe(false);
    expect(without.message.toLowerCase()).toMatch(/overlay|visa_regulated|sensitive/);
    vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile({ overlays: ["visa_regulated"] })) as never);
    const withOverlay = await readPipedriveRecord({ ...entra, workerId: "priya", resourceScope: "person/501" });
    expect(withOverlay.success).toBe(true);
    expect(JSON.stringify(withOverlay.data)).not.toContain("P1234567");
  });
});

describe("3. the wrong worker is denied", () => {
  it("Amelia, Ethan, Alex, Maya and Nia hold no CRM grant", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    for (const w of ["amelia", "ethan", "alex", "maya", "nia"] as const) {
      const r = await readPipedriveRecord({ ...entra, workerId: w, resourceScope: "person/501" });
      expect(r.success).toBe(false);
      expect(r.message).toContain("no controlled CRM decision");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("a read-only worker cannot search, and Sophie cannot search by name", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    expect((await searchPipedrive({ ...entra, workerId: "james", resourceScope: "person/search/email/x%40y.com" })).success).toBe(false);
    const byName = await searchPipedrive({ ...entra, workerId: "sophie", resourceScope: "person/search/name/Test" });
    expect(byName.success).toBe(false);
    expect(byName.message).toContain("not by name");
    expect(PIPEDRIVE_WORKER_CONSTRAINTS.SEARCH_FIELDS.sophie).toEqual(["email", "phone"]);
  });
});

describe("4. a student outside the remit or the case scope is denied", () => {
  it("a worker retired by merger (Olivia, 18 September 2026) may not read any student, confirmed or not, and makes no call", async () => {
    vi.stubGlobal("fetch", fakePipedrive(21));
    const r = await readPipedriveRecord({ ...entra, workerId: "olivia", resourceScope: "person/501" });
    expect(r.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("a staff member with a suspended account is denied before any call", async () => {
    vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile({ status: "suspended" })) as never);
    vi.stubGlobal("fetch", fakePipedrive());
    expect((await readPipedriveRecord({ ...entra, workerId: "sophie", resourceScope: "person/501" })).success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("5 and 6. SharePoint: non-allowlisted and excluded material is denied", () => {
  it("Ethan reads his designated location and is refused Nia's", async () => {
    const graph = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/oauth2/v2.0/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      if (u.includes(":/children")) return new Response(JSON.stringify({ value: [{ name: "audit.docx", file: {}, size: 10 }] }), { status: 200 });
      return new Response(JSON.stringify({ name: "16_WEBSITE_Ai", folder: {} }), { status: 200 });
    });
    vi.stubGlobal("fetch", graph);
    const ok = await readSharePointRecord({ ...entra, workerId: "ethan", resourceScope: `${SITE}/16_WEBSITE_Ai` });
    expect(ok.success).toBe(true);
    const denied = await readSharePointRecord({ ...entra, workerId: "ethan", resourceScope: `${SITE}/11_SOCIAL_MEDIA` });
    expect(denied.success).toBe(false);
    expect(denied.message).toContain("not designated for this worker");
  });
  it("personal, family, banking, HR, temp-download and named personal folders are refused for every designated worker", async () => {
    vi.stubGlobal("fetch", vi.fn());
    for (const w of ["amelia", "ethan", "alex", "grace", "maya", "nia"] as const) {
      for (const path of ["03_FAMILY_&_PERSONAL/x", "04_FINANCE_&_BANKING/x", "01_ADMIN_&_GOVERNANCE/04_HR_&_People Governance/x", "000_Temp download/x", "Mary Obeng/x", "05_HUB/14_HUB Password/x"]) {
        const r = await readSharePointRecord({ ...entra, workerId: w, resourceScope: `${SITE}/${path}` });
        expect(r.success).toBe(false);
      }
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("7. Arrington Consultancy data is inaccessible", () => {
  it("a path on any other site in the tenant is outside the WSA boundary", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const r = await readSharePointRecord({ ...entra, workerId: "maya", resourceScope: "arringtonconsultancy.sharepoint.com,other,web/01_ADMIN_&_GOVERNANCE" });
    expect(r.success).toBe(false);
    expect(r.message).toContain("Arrington Consultancy");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("no Google Drive grant exists for any worker's Drive read", async () => {
    const { searchGoogleDrive } = await import("./googleDrive");
    for (const w of ["ethan", "maya", "alex"] as const) {
      expect((await searchGoogleDrive({ ...entra, workerId: w, resourceScope: "folder/x" })).success).toBe(false);
    }
  });
});

describe("8. raw connector objects never reach the model", () => {
  it("a worker record carries only projected keys and never passport, birthday or notes", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const r = await readPipedriveRecord({ ...entra, workerId: "grace", resourceScope: "person/501" });
    const json = JSON.stringify(r.data);
    for (const forbidden of ["P1234567", "2001-01-01", "private", "owner_id", "visible_to", "e356695ee8528b30890e38e5f0875afb6644d61c"]) expect(json).not.toContain(forbidden);
    expect(Object.keys(r.data as object).sort()).toEqual(["confirmed", "counsellor", "email", "fields", "lastUpdated", "name", "personId", "phone", "stageLabel", "stagePosition"]);
  });
  it("no projection list names a never-projected key", () => {
    for (const list of Object.values(WORKER_CRM_FIELDS)) for (const f of list ?? []) expect(NEVER_PROJECTED_KEYS).not.toContain(f.key);
  });
});

describe("9. credentials never reach the model", () => {
  it("the execution and prompt layers read no connector credential", () => {
    for (const f of ["server/execution/execute.ts", "server/execution/prompt.ts", "server/execution/evidence.ts"]) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(src).not.toMatch(/PIPEDRIVE_API_TOKEN|SHAREPOINT_GRAPH_CLIENT_SECRET|CLIENT_SECRET|pipedriveApiToken|api_token/);
    }
  });
  it("a worker record contains no token even when the token is set", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    const r = await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    expect(JSON.stringify(r)).not.toContain("worker-token-test");
  });
});

describe("10. an audit event is created for successful and refused operations", () => {
  it("success", async () => {
    vi.stubGlobal("fetch", fakePipedrive());
    await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("allowed");
    expect(event.success).toBe(true);
    expect(event.connector).toBe("pipedrive");
    expect(event.staffUserId).toBe(7);
    expect(JSON.stringify(event)).not.toContain("worker-token-test");
  });
  it("refusal at the worker gate, the staff gate and the location gate", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await readPipedriveRecord({ ...entra, workerId: "nia", resourceScope: "person/501" });
    vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile({ scopes: [] })) as never);
    await readPipedriveRecord({ ...entra, workerId: "james", resourceScope: "person/501" });
    vi.mocked(resolveStaffAccessProfile).mockImplementation(async id => (id === null ? UNRESOLVED : profile()) as never);
    await readSharePointRecord({ ...entra, workerId: "ethan", resourceScope: `${SITE}/11_SOCIAL_MEDIA` });
    const events = getAuditLog();
    expect(events).toHaveLength(3);
    for (const e of events) { expect(e.permissionDecision).toBe("denied"); expect(e.errorCategory).toBe("permission_denied"); }
  });
});
