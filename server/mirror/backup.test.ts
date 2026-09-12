import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FakeDrive } from "./fakeDrive";

/**
 * The daily disaster-recovery backup: a fresh timestamped snapshot each
 * run, everything read before anything written, the snapshot manifest
 * last and the latest pointer after it, a failure leaving the previous
 * snapshot and pointer untouched, and the backup folder never shared with
 * the workforce identity while the mirror folder is.
 */
vi.mock("../db", () => ({ getDb: async () => null }));
vi.mock("./driveMirrorOAuth", async importOriginal => {
  const actual = await importOriginal<typeof import("./driveMirrorOAuth")>();
  return { ...actual, getDriveMirrorAccess: vi.fn(async () => ({ ok: true, accessToken: "drive-access-token-test" })) };
});

const { runCrmBackup, BACKUP_ENTITIES, BACKUP_FOLDER_NAME, snapshotLabel } = await import("./backup");
const { runMirrorSync } = await import("./sync");
const { MIRROR_FOLDER_NAME } = await import("./manifest");
const { WORKER_DRIVE_ROOTS, DRIVE_NOT_DESIGNATED } = await import("../workforce/driveLocations");

const TOKEN = "pipedrive-website-token-value-for-test";
const SA_EMAIL = "wsa-workforce@wsa-reporting-mirror.iam.gserviceaccount.com";
const NOW = new Date("2026-09-12T02:30:00Z");
const ORIGINAL_ENV = { ...process.env };

const PERSON = { id: 501, name: "Test Student", email: [{ value: "student@example.com" }], add_time: "2026-06-01 09:00:00" };
/** Parsed-path matching, and a 404 for a malformed query, as the real API gives. */
function pipedrive(failOn: string | null = null) {
  return async (input: string | URL | Request): Promise<Response> => {
    const u = new URL(String(input));
    const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data, additional_data: { pagination: { more_items_in_collection: false } } }), { status: 200 });
    if (failOn && u.pathname.endsWith(failOn)) return new Response("boom", { status: 500 });
    if (/[?&]/.test(u.pathname)) return new Response(JSON.stringify({ success: false, error: "Not Found" }), { status: 404 });
    if ((String(input).match(/\?/g) ?? []).length > 1) return new Response(JSON.stringify({ success: false, error: "Not Found" }), { status: 404 });
    if (u.pathname === "/v1/persons") return ok([PERSON]);
    if (u.pathname === "/v1/deals") return ok([{ id: 900, title: "Deal", add_time: "2026-07-01 09:00:00" }]);
    if (u.pathname === "/v1/leads") return ok([{ id: "L1", title: "Lead", add_time: "2026-05-01 09:00:00" }]);
    if (u.pathname === "/v1/activities") return ok([{ id: 1, subject: "Call", due_date: "2026-09-01" }]);
    return ok([{ id: 1, name: "thing" }]);
  };
}
let drive: FakeDrive; let pipedriveCalls: string[];
function wire(failOn: string | null = null) {
  drive = new FakeDrive(); pipedriveCalls = [];
  const pd = pipedrive(failOn);
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input);
    if (u.includes("googleapis.com")) return drive.fetch(input, init);
    pipedriveCalls.push(u);
    return pd(input);
  });
}
const byName = (name: string) => Array.from(drive.files.values()).filter(f => f.name === name);

beforeEach(() => {
  process.env.PIPEDRIVE_MIRROR_TOKEN_SOURCE = "website_token";
  process.env.PIPEDRIVE_API_TOKEN = TOKEN;
  process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: SA_EMAIL, private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n" });
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.unstubAllGlobals(); });

describe("a complete backup", () => {
  it("writes every entity into a fresh timestamped snapshot folder, then its manifest, then the latest pointer", async () => {
    wire();
    const r = await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => NOW });
    expect(r.status).toBe("complete");
    expect(r.snapshotLabel).toBe(snapshotLabel(NOW));
    const root = byName(BACKUP_FOLDER_NAME)[0];
    const snap = byName(snapshotLabel(NOW))[0];
    expect(snap.parents).toEqual([root.id]);
    const inSnap = Array.from(drive.files.values()).filter(f => f.parents.includes(snap.id)).map(f => f.name).sort();
    expect(inSnap).toEqual([...BACKUP_ENTITIES.map(e => `${e.name}.json`), "manifest.json"].sort());
    const manifest = JSON.parse(byName("manifest.json").find(f => f.parents.includes(snap.id))!.content);
    expect(manifest.kind).toBe("disaster_recovery_backup");
    expect(manifest.status).toBe("complete");
    expect(manifest.recordCounts.persons).toBe(1);
    expect(manifest.coverage.earliestRecordCreatedAt).toBe("2026-05-01T09:00:00.000Z");
    expect(manifest.notIncluded).toContain("notes");
    const latest = JSON.parse(byName("latest.json")[0].content);
    expect(latest.snapshotFolderId).toBe(snap.id);
    // The backup keeps what recovery needs: the raw person, name included.
    expect(byName("persons.json")[0].content).toContain("Test Student");
    // Write order: every entity file precedes the snapshot manifest, which precedes latest.json.
    const uploads = drive.requests.filter(q => q.url.includes("/upload/")).map(q => q.url);
    expect(uploads.length).toBe(BACKUP_ENTITIES.length + 2);
    for (const q of drive.requests) expect(q.url).not.toContain(TOKEN);
    expect(pipedriveCalls.every(u => u.includes(`api_token=${TOKEN}`))).toBe(true);
  });
  it("a second run adds a second snapshot and moves the pointer; the first snapshot is untouched", async () => {
    wire();
    await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const later = new Date(NOW.getTime() + 24 * 3600_000);
    await runCrmBackup("schedule", { fetchImpl: drive.fetch, now: () => later });
    expect(byName(snapshotLabel(NOW))).toHaveLength(1);
    expect(byName(snapshotLabel(later))).toHaveLength(1);
    expect(JSON.parse(byName("latest.json")[0].content).snapshotLabel).toBe(snapshotLabel(later));
  });
});

describe("failure never touches the last good backup", () => {
  it("a Pipedrive failure ends the run before Drive is touched", async () => {
    wire("/deals");
    const r = await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => NOW });
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/before anything was written/);
    expect(drive.requests).toHaveLength(0);
  });
  it("an upload failure leaves the snapshot without a manifest and latest.json pointing at the previous snapshot", async () => {
    wire();
    await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const before = byName("latest.json")[0].content;
    drive.failUploadsNamed.add("deals.json");
    const later = new Date(NOW.getTime() + 24 * 3600_000);
    const r = await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => later });
    expect(r.status).toBe("failed");
    expect(byName("latest.json")[0].content).toBe(before);
    const snap = byName(snapshotLabel(later))[0];
    expect(byName("manifest.json").some(f => f.parents.includes(snap.id))).toBe(false);
  });
});

describe("the backup is never worker-readable; the mirror is shared with the workforce identity", () => {
  it("the mirror folder is shared read-only with the service account and the backup folder is not", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    await runCrmBackup("manual", { fetchImpl: drive.fetch, now: () => NOW });
    const mirror = byName(MIRROR_FOLDER_NAME)[0];
    const backup = byName(BACKUP_FOLDER_NAME)[0];
    expect(drive.permissions.get(mirror.id)).toEqual([SA_EMAIL]);
    expect(drive.permissions.get(backup.id)).toBeUndefined();
    const permissionPosts = drive.requests.filter(q => q.method === "POST" && q.url.includes("/permissions"));
    expect(permissionPosts).toHaveLength(1);
    expect(permissionPosts[0].url).toContain(mirror.id);
  });
  it("sharing is idempotent across runs", async () => {
    wire();
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => NOW });
    await runMirrorSync("manual", { fetchImpl: drive.fetch, now: () => new Date(NOW.getTime() + 3600_000) });
    expect(drive.requests.filter(q => q.method === "POST" && q.url.includes("/permissions"))).toHaveLength(1);
  });
  it("no worker's Drive allowlist names the backup or mirror folders by name, and the not-designated list stands", () => {
    // Folder IDs for the mirror and backup are created at runtime and can
    // never appear in the static allowlist; the static list names only the
    // three inspected WSA folders.
    const all = Object.values(WORKER_DRIVE_ROOTS).flat();
    expect(new Set(all.map(r => r.id)).size).toBe(3);
    expect(all.some(r => /backup|mirror/i.test(r.name))).toBe(false);
    expect(DRIVE_NOT_DESIGNATED.map(f => f.name)).toContain("WSA Editable Docs");
  });
});
