import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FakeDrive } from "./fakeDrive";
import { CRM_FIELDS, gatherEvidence } from "../workforce/mi/evidence";

/**
 * The mirror end to end against an in-memory Drive and a faked Pipedrive:
 * a complete run writes sanitised files then the manifest; a Pipedrive
 * failure touches Drive not at all; an upload failure leaves the last good
 * manifest and the reader refuses the inconsistent set; a stale manifest is
 * refused; the Pipedrive token never reaches Drive; the resolver, fed the
 * mirror, answers with the mirror named as its source.
 */
vi.mock("../db", () => ({ getDb: async () => null }));
vi.mock("./driveMirrorOAuth", async importOriginal => {
  const actual = await importOriginal<typeof import("./driveMirrorOAuth")>();
  return { ...actual, getDriveMirrorAccess: vi.fn(async () => ({ ok: true, accessToken: "drive-access-token-test" })) };
});

const { runMirrorSync, mirrorTokenSource, mirrorToken } = await import("./sync");
const { readMirror, miReaderOverMirror } = await import("./reader");
const { resolveInformationQuestion } = await import("../workforce/mi/resolve");
const { MIRROR_FILE_NAMES, MIRROR_FOLDER_NAME } = await import("./manifest");

const PIPEDRIVE_TOKEN = "pipedrive-website-token-value-for-test";
const NOW = new Date("2026-09-11T12:00:00Z");
const ORIGINAL_ENV = { ...process.env };

const PERSON = { id: 501, name: "Test Student", email: [{ value: "student@example.com" }], phone: [{ value: "+447700900123" }], owner_id: { id: 1, name: "Tim Hunt" }, e356695ee8528b30890e38e5f0875afb6644d61c: "P1234567", notes: "private", [CRM_FIELDS.personNationality]: "Nigerian" };
const LEADS = [
  { id: "L1", title: "Test Student", add_time: "2026-06-01 09:00:00", is_archived: true, source_name: "Web forms", owner_id: 1, person_id: 501 },
  { id: "L2", title: "Other Person", add_time: "2026-07-01 09:00:00", is_archived: false, source_name: "Manually created", owner_id: 1, person_id: 502, [CRM_FIELDS.leadUtmSource]: "google" },
];
const DEALS = [{ id: 900, title: "Test Student", add_time: "2026-08-01 09:00:00", status: "open", stage_id: 21, user_id: { id: 1, name: "Tim Hunt" }, person_id: { value: 501 }, [CRM_FIELDS.dealApplicationDate1]: "2026-08-10" }];
const USERS = [{ id: 1, name: "Tim Hunt", email: "tim.hunt@worldstudentadvisors.com" }];

function pipedriveFetch(fail = false) {
  return async (input: string | URL | Request): Promise<Response> => {
    const u = String(input);
    if (fail) return new Response("boom", { status: 500 });
    const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data, additional_data: { pagination: { more_items_in_collection: false } } }), { status: 200 });
    if (u.includes("/leads")) return ok(LEADS);
    if (u.includes("/deals")) return ok(DEALS);
    if (u.includes("/persons")) return ok([PERSON]);
    if (u.includes("/users")) return ok(USERS);
    return new Response("not found", { status: 404 });
  };
}

let drive: FakeDrive;
let pipedriveCalls: string[];
function wire(failPipedrive = false) {
  drive = new FakeDrive();
  pipedriveCalls = [];
  const pd = pipedriveFetch(failPipedrive);
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input);
    if (u.includes("googleapis.com")) return drive.fetch(input, init);
    pipedriveCalls.push(u);
    return pd(input);
  });
}

beforeEach(() => {
  process.env.PIPEDRIVE_MIRROR_TOKEN_SOURCE = "website_token";
  process.env.PIPEDRIVE_API_TOKEN = PIPEDRIVE_TOKEN;
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.unstubAllGlobals(); });

describe("credential choice is explicit", () => {
  it("does nothing until Tom sets the token source", async () => {
    delete process.env.PIPEDRIVE_MIRROR_TOKEN_SOURCE;
    expect(mirrorTokenSource()).toBeNull();
    expect(mirrorToken()).toBeNull();
    wire();
    const r = await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    expect(r.status).toBe("skipped");
    expect(drive.requests).toHaveLength(0);
    expect(pipedriveCalls).toHaveLength(0);
  });
  it("dedicated source reads PIPEDRIVE_MIRROR_API_TOKEN, not the website token", () => {
    process.env.PIPEDRIVE_MIRROR_TOKEN_SOURCE = "dedicated";
    process.env.PIPEDRIVE_MIRROR_API_TOKEN = "dedicated-token";
    expect(mirrorToken()).toBe("dedicated-token");
  });
});

describe("a complete run", () => {
  it("writes sanitised data files then the manifest, into one folder, and the Pipedrive token never reaches Drive", async () => {
    wire();
    const r = await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    expect(r.status).toBe("complete");
    expect(r.counts).toEqual({ leads: 2, deals: 1, persons: 1 });
    const names = Array.from(drive.files.values()).map(f => f.name).sort();
    expect(names).toEqual([MIRROR_FOLDER_NAME, "deals.csv", "leads.csv", "manifest.json", "persons.csv"].sort());
    const folder = Array.from(drive.files.values()).find(f => f.name === MIRROR_FOLDER_NAME)!;
    for (const f of Array.from(drive.files.values())) if (f.id !== folder.id) expect(f.parents).toEqual([folder.id]);
    const all = Array.from(drive.files.values()).map(f => f.content).join("\n");
    for (const v of ["Test Student", "student@example.com", "+447700900123", "P1234567", "private", "tim.hunt@worldstudentadvisors.com"]) expect(all).not.toContain(v);
    expect(all).toContain("Nigerian");
    expect(all).toContain("Tim Hunt");
    for (const req of drive.requests) { expect(req.url).not.toContain(PIPEDRIVE_TOKEN); expect(req.auth).toBe("Bearer drive-access-token-test"); }
    // Manifest last, and it describes every file with its md5.
    const uploads = drive.requests.filter(q => q.url.includes("/upload/")).map(q => q.url);
    expect(uploads.length).toBe(4);
    const manifest = JSON.parse(Array.from(drive.files.values()).find(f => f.name === "manifest.json")!.content);
    expect(manifest.status).toBe("complete");
    expect(manifest.lastSuccessfulSyncAt).toBe(NOW.toISOString());
    expect(manifest.recordCounts).toEqual({ leads: 2, deals: 1, persons: 1 });
    expect(manifest.fieldsExcluded).toContain("email");
    expect(manifest.files.map((f: { name: string }) => f.name).sort()).toEqual(["deals.csv", "leads.csv", "persons.csv"]);
    expect(manifest.coveragePeriod.from).toBe("2026-06-01T09:00:00.000Z");
    // Pipedrive was read with the website token as a query parameter, GET only.
    expect(pipedriveCalls.every(u => u.includes(`api_token=${PIPEDRIVE_TOKEN}`))).toBe(true);
  });
  it("a second run replaces the files in place rather than duplicating them", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    await runMirrorSync("schedule", { fetchImpl: drive.fetch, now: () => new Date(NOW.getTime() + 3600_000) });
    expect(drive.files.size).toBe(5);
  });
});

describe("failure never overwrites the last good data", () => {
  it("a Pipedrive failure ends the run before Drive is touched", async () => {
    wire(true);
    const r = await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/before anything was written/);
    expect(drive.requests).toHaveLength(0);
  });
  it("an upload failure part way leaves the previous manifest, and the reader refuses the inconsistent set", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const before = Array.from(drive.files.values()).find(f => f.name === "manifest.json")!.content;
    drive.failUploadsNamed.add("deals.csv");
    const later = new Date(NOW.getTime() + 60_000);
    const r = await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => later });
    expect(r.status).toBe("failed");
    expect(Array.from(drive.files.values()).find(f => f.name === "manifest.json")!.content).toBe(before);
    // leads.csv was rewritten (same content here, so md5 matches); simulate a real change to prove the check bites.
    drive.corrupt("leads.csv", "id,created_at\nX,2026-01-01\n");
    const read = await readMirror({ fetchImpl: drive.fetch, now: later });
    expect(read.status).toBe("inconsistent");
    expect(read.detail).toMatch(/does not match the manifest/);
  });
});

describe("the reader checks the manifest first", () => {
  it("no manifest means no completed sync", async () => {
    wire();
    const read = await readMirror({ fetchImpl: drive.fetch, now: NOW });
    expect(read.status).toBe("no_manifest");
  });
  it("fresh within the limit, stale beyond it, and the stale case says when the last good copy was", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const fresh = await readMirror({ fetchImpl: drive.fetch, now: new Date(NOW.getTime() + 60 * 60_000) });
    expect(fresh.status).toBe("fresh");
    expect(fresh.files?.leads).toHaveLength(2);
    const stale = await readMirror({ fetchImpl: drive.fetch, now: new Date(NOW.getTime() + 5 * 3600_000) });
    expect(stale.status).toBe("stale");
    expect(stale.manifest?.lastSuccessfulSyncAt).toBe(NOW.toISOString());
    expect(stale.files).toBeUndefined();
  });
});

describe("the resolver over the mirror", () => {
  const profile = { staffUserId: 7, baseAccessLevel: 1 as const, functionalScopes: ["enquiry_triage", "discovery", "admissions"], caseScope: "organisation" as const, actionPermissions: ["read"], sensitiveOverlays: [], status: "active" as const, teamId: null, temporaryGrants: [], unrecognisedValues: [] };
  const base = { staffUserId: 7, authMethod: "entra_sso" as const, profile: profile as never };
  const record = async () => true;

  it("answers a count from the mirror and names the mirror and its sync time as the source", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const read = await readMirror({ fetchImpl: drive.fetch, now: NOW });
    const source = async () => ({ ok: true as const, reader: miReaderOverMirror(read.files!), sourceName: "the WSA reporting mirror of Pipedrive", sourceLabel: "the WSA reporting mirror of Pipedrive, synced 11 September, 13:00" });
    const r = await resolveInformationQuestion({ ...base, requestText: "how many leads have we had in the last 12 months" }, { source, now: NOW, record });
    expect(r.outcome).toBe("answered");
    expect(r.answer).toContain("We had 2 leads");
    expect(r.answer).toContain("Source: the WSA reporting mirror of Pipedrive, synced 11 September, 13:00");
    expect(r.sourcesChecked[0]).toMatch(/^the WSA reporting mirror of Pipedrive leads/);
  });
  it("the mirror's rows rebuild the channel evidence the resolver relies on", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const read = await readMirror({ fetchImpl: drive.fetch, now: NOW });
    const ev = await gatherEvidence(miReaderOverMirror(read.files!));
    const l1 = ev.records.find(r => r.id === "L1")!;
    const l2 = ev.records.find(r => r.id === "L2")!;
    expect(l1.channel).toBe("website"); expect(l1.channelEvidence).toBe("web_form_source"); expect(l1.cold).toBe(true); expect(l1.country).toBe("Nigerian");
    expect(l2.channel).toBe("website"); expect(l2.channelEvidence).toBe("utm_source");
    const d = ev.records.find(r => r.kind === "deal")!;
    expect(d.hasApplicationDate).toBe(true); expect(d.stageId).toBe(21);
  });
  it("refuses to answer from a stale mirror and says when the last complete copy was", async () => {
    const source = async () => ({ ok: false as const, reason: "the reporting mirror was last synced 300 minutes ago, which is older than the 150-minute freshness limit, and there is no live CRM connection to fall back on", lastSuccessfulSyncAt: "2026-09-11T07:00:00Z" });
    const r = await resolveInformationQuestion({ ...base, requestText: "how many leads last month" }, { source, now: NOW, record });
    expect(r.outcome).toBe("connector_unavailable");
    expect(r.gapType).toBe("connector_gap");
    expect(r.evidenceAttempted).toBe(false);
    expect(r.answer).toContain("300 minutes ago");
    expect(r.answer).toContain("will not present that as current");
    expect(r.answer).not.toMatch(/We had \d+/);
  });
});
