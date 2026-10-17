import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { gzipSync } from "zlib";
import { FakeDrive } from "../mirror/fakeDrive";
import type { DumpResult } from "./databaseDump";

/**
 * The nightly database backup to Google Drive (Tom Arrington, 15 October
 * 2026): the export is made before Drive is touched, stored in a fresh
 * timestamped folder, checked against Drive's own md5, its manifest
 * written after it and the latest pointer after that, and a failure leaves
 * the previous good snapshot and pointer exactly as they were.
 */
vi.mock("../db", () => ({ getDb: async () => null }));
const driveStatus = vi.hoisted(() => ({ value: "operational" as string }));
vi.mock("../mirror/driveMirrorOAuth", async importOriginal => {
  const actual = await importOriginal<typeof import("../mirror/driveMirrorOAuth")>();
  return {
    ...actual,
    getDriveMirrorStatus: vi.fn(async () => {
      if (driveStatus.value === "throws") throw new Error("Table 'railway.connector_oauth_grants' doesn't exist");
      return driveStatus.value;
    }),
    getDriveMirrorAccess: vi.fn(async () => (driveStatus.value === "operational" ? { ok: true, accessToken: "drive-access-token-test" } : { ok: false, status: driveStatus.value })),
  };
});

const { runDatabaseBackup, databaseBackupConfigState, DATABASE_BACKUP_FOLDER_NAME, NOT_INCLUDED } = await import("./databaseBackup");
const { snapshotLabel } = await import("../mirror/backup");
const { DUMP_FILE_NAME } = await import("./databaseDump");

const NOW = new Date("2026-10-16T02:15:00Z");
const LATER = new Date(NOW.getTime() + 24 * 3600_000);
const ENV = { DATABASE_URL: "mysql://user:secret-password@db.example:3306/railway" } as NodeJS.ProcessEnv;
const fast = { sleep: async () => {}, random: () => 0 };

function fakeDump(sql = "CREATE TABLE `users` (`id` int);\nINSERT INTO `users` (`id`) VALUES\n(1);\n-- WSA database backup complete: 1 tables, 1 rows.\n"): DumpResult {
  const bytes = gzipSync(Buffer.from(sql));
  return {
    bytes, uncompressedBytes: sql.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), md5: createHash("md5").update(bytes).digest("hex"),
    database: "railway", serverVersion: "9.7.2",
    tables: [{ name: "__drizzle_migrations", rows: 21, columns: 3 }, { name: "users", rows: 1, columns: 1 }], totalRows: 22,
    migrationsApplied: 21, otherObjects: { views: 0, triggers: 0, routines: 0, events: 0 },
    startedAt: NOW, finishedAt: NOW,
  };
}

let drive: FakeDrive;
const byName = (name: string) => Array.from(drive.files.values()).filter(f => f.name === name);
const inFolder = (folderId: string) => Array.from(drive.files.values()).filter(f => f.parents.includes(folderId));
const run = (deps: Partial<Parameters<typeof runDatabaseBackup>[1]> = {}, at = NOW) =>
  runDatabaseBackup("manual", { env: ENV, now: () => at, fetchImpl: drive.fetch, driveOptions: fast, dump: async () => fakeDump(), ...deps });

beforeEach(() => { drive = new FakeDrive(); driveStatus.value = "operational"; });

describe("a complete database backup", () => {
  it("stores the export in a fresh snapshot folder, then its manifest, then the latest pointer", async () => {
    const dump = fakeDump();
    const r = await run({ dump: async () => dump });
    expect(r.status).toBe("complete");
    const root = byName(DATABASE_BACKUP_FOLDER_NAME)[0];
    const snap = byName(snapshotLabel(NOW))[0];
    expect(snap.parents).toEqual([root.id]);
    expect(inFolder(snap.id).map(f => f.name).sort()).toEqual([DUMP_FILE_NAME, "manifest.json"]);
    // The bytes in Drive are exactly the export.
    expect(Buffer.compare(byName(DUMP_FILE_NAME)[0].bytes!, dump.bytes)).toBe(0);
    const manifest = JSON.parse(byName("manifest.json")[0].content);
    expect(manifest).toMatchObject({ kind: "database_backup", status: "complete", snapshotLabel: snapshotLabel(NOW), totalRows: 22, migrationsApplied: 21 });
    expect(manifest.file).toMatchObject({ name: DUMP_FILE_NAME, md5: dump.md5, sha256: dump.sha256, bytes: dump.bytes.length });
    expect(manifest.tables).toEqual(dump.tables);
    expect(manifest.restore).toMatch(/gunzip -c database\.sql\.gz \| mysql/);
    expect(manifest.notIncluded).toEqual([...NOT_INCLUDED]);
    expect(manifest.notIncluded.join(" ")).toMatch(/CONNECTOR_TOKEN_KEY/);
    const latest = JSON.parse(byName("latest.json")[0].content);
    expect(latest).toMatchObject({ snapshotLabel: snapshotLabel(NOW), snapshotFolderId: snap.id, status: "complete", totalRows: 22 });
    expect(byName("latest.json")[0].parents).toEqual([root.id]);
    // Write order: the export, then the manifest, then the pointer.
    // (the export's bytes are the resumable PUT; the two JSON files are multipart POSTs)
    const writes = drive.requests.filter(q => q.method === "PUT" || (q.method === "POST" && q.url.includes("uploadType=multipart")));
    expect(writes.map(q => q.method)).toEqual(["PUT", "POST", "POST"]);
  });

  it("never shares the backup folder and never puts the database password anywhere it sends", async () => {
    await run();
    expect(drive.permissions.size).toBe(0);
    expect(drive.requests.filter(q => q.url.includes("/permissions"))).toHaveLength(0);
    for (const q of drive.requests) expect(q.url).not.toContain("secret-password");
    for (const f of drive.files.values()) expect(f.content).not.toContain("secret-password");
  });

  it("a second night adds a second snapshot and moves the pointer; the first is untouched", async () => {
    await run();
    const first = byName(DUMP_FILE_NAME)[0].bytes!;
    await run({ dump: async () => fakeDump("-- the next night\n") }, LATER);
    expect(byName(snapshotLabel(NOW))).toHaveLength(1);
    expect(byName(snapshotLabel(LATER))).toHaveLength(1);
    expect(byName(DUMP_FILE_NAME)).toHaveLength(2);
    expect(Buffer.compare(byName(DUMP_FILE_NAME)[0].bytes!, first)).toBe(0);
    expect(JSON.parse(byName("latest.json")[0].content).snapshotLabel).toBe(snapshotLabel(LATER));
  });
});

describe("failure never touches the last good backup", () => {
  it("an export failure ends the run before Drive is touched", async () => {
    const r = await run({ dump: async () => { throw new Error("Table users: streamed 3 rows but COUNT(*) in the same snapshot says 4."); } });
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/before anything was written.*COUNT/);
    expect(drive.requests).toHaveLength(0);
  });

  it("an upload refusal leaves the new snapshot without a manifest and latest.json on the previous snapshot", async () => {
    await run();
    const before = byName("latest.json")[0].content;
    drive.failUploadsNamed.add(DUMP_FILE_NAME);
    const r = await run({}, LATER);
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/latest\.json still names the previous good snapshot/);
    expect(byName("latest.json")[0].content).toBe(before);
    const snap = byName(snapshotLabel(LATER))[0];
    expect(inFolder(snap.id).some(f => f.name === "manifest.json")).toBe(false);
  });

  it("a stored file whose md5 is not what was sent fails the run and does not move the pointer", async () => {
    await run();
    const before = byName("latest.json")[0].content;
    const dump = fakeDump();
    const r = await run({ dump: async () => ({ ...dump, md5: "0".repeat(32) }) }, LATER);
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/Drive reports md5/);
    expect(byName("latest.json")[0].content).toBe(before);
  });
});

describe("Drive's transient failures", () => {
  it("completes through rate limits on the export upload", async () => {
    drive.transientFailures.set(DUMP_FILE_NAME, 3);
    const r = await run();
    expect(r.status).toBe("complete");
    expect(byName(DUMP_FILE_NAME)).toHaveLength(1);
  });

  it("stores one copy when the upload lands without answering", async () => {
    drive.succeedThenFail.set(DUMP_FILE_NAME, 1);
    const r = await run();
    expect(r.status).toBe("complete");
    expect(byName(DUMP_FILE_NAME)).toHaveLength(1);
    expect(JSON.parse(byName("manifest.json")[0].content).file.fileId).toBe(byName(DUMP_FILE_NAME)[0].id);
  });
});

describe("standing down", () => {
  it("is off when DATABASE_BACKUP_ENABLED is \"false\"", async () => {
    expect(await databaseBackupConfigState({ ...ENV, DATABASE_BACKUP_ENABLED: "false" })).toBe("disabled");
    const dump = vi.fn(async () => fakeDump());
    const r = await run({ env: { ...ENV, DATABASE_BACKUP_ENABLED: "false" }, dump });
    expect(r.status).toBe("skipped");
    expect(dump).not.toHaveBeenCalled();
    expect(drive.requests).toHaveLength(0);
  });

  it("is ready by default, and stands down without a database or a usable Drive grant", async () => {
    expect(await databaseBackupConfigState(ENV)).toBe("ready");
    expect(await databaseBackupConfigState({})).toBe("no_database");
    driveStatus.value = "needs_reauthorisation";
    expect(await databaseBackupConfigState(ENV)).toBe("drive_needs_reauthorisation");
    const r = await run();
    expect(r.status).toBe("skipped");
    expect(drive.requests).toHaveLength(0);
  });

  it("stands down, without throwing, when the Drive grant cannot be read", async () => {
    // A PR preview's empty database has no grants table; at boot that rejection crashed the server.
    driveStatus.value = "throws";
    expect(await databaseBackupConfigState(ENV)).toBe("drive_unavailable");
    const r = await run();
    expect(r.status).toBe("skipped");
    expect(drive.requests).toHaveLength(0);
  });

  it("never runs two at once", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const dump = vi.fn(async () => { await gate; return fakeDump(); });
    const first = run({ dump });
    const second = run({ dump });
    release();
    expect((await first).status).toBe("complete");
    expect(await second).toMatchObject({ status: "skipped", reason: "a database backup was already running" });
    expect(dump).toHaveBeenCalledTimes(1);
  });
});

describe("retention: 30 daily backups, and the latest good one is never lost", () => {
  const night = (n: number) => new Date(NOW.getTime() + n * 24 * 3600_000);
  const live = (name: string) => byName(name).filter(f => !f.trashed);
  const snapshotsLeft = () => Array.from(drive.files.values()).filter(f => /^\d{4}-\d{2}-\d{2}T\d{6}Z$/.test(f.name) && !f.trashed).map(f => f.name).sort();

  it("keeps the 30 newest complete snapshots and moves older ones to the trash", async () => {
    for (let n = 0; n < 32; n++) expect((await run({}, night(n))).status).toBe("complete");
    const left = snapshotsLeft();
    expect(left).toHaveLength(30);
    expect(left[0]).toBe(snapshotLabel(night(2)));
    expect(left[29]).toBe(snapshotLabel(night(31)));
    // The two oldest went to the trash, with their contents; nothing was deleted outright.
    for (const n of [0, 1]) {
      const folder = byName(snapshotLabel(night(n)))[0];
      expect(folder.trashed).toBe(true);
      expect(inFolder(folder.id).every(f => f.trashed)).toBe(true);
    }
    expect(drive.requests.some(q => q.method === "DELETE")).toBe(false);
    expect(JSON.parse(live("latest.json")[0].content).snapshotLabel).toBe(snapshotLabel(night(31)));
  });

  it("reports what it kept and what it moved", async () => {
    for (let n = 0; n < 30; n++) await run({}, night(n));
    const r = await run({}, night(30));
    expect(r.retention).toEqual({ kept: 30, trashed: [snapshotLabel(night(0))], trashedIncomplete: [], error: null });
    expect(r.manifest!.retention).toMatch(/30 most recent complete snapshots are kept/);
  });

  it("a failed night deletes nothing, so the latest verified good backup and the other 29 stay", async () => {
    for (let n = 0; n < 30; n++) await run({}, night(n));
    const before = snapshotsLeft();
    const pointer = live("latest.json")[0].content;
    drive.failUploadsNamed.add(DUMP_FILE_NAME);
    for (let n = 30; n < 35; n++) expect((await run({}, night(n))).status).toBe("failed");
    expect(snapshotsLeft().filter(l => before.includes(l))).toEqual(before);
    expect(Array.from(drive.files.values()).some(f => f.trashed)).toBe(false);
    expect(live("latest.json")[0].content).toBe(pointer);
  });

  it("counts only complete snapshots, so failed nights never push a good backup out", async () => {
    for (let n = 0; n < 30; n++) await run({}, night(n));
    drive.failUploadsNamed.add(DUMP_FILE_NAME);
    for (let n = 30; n < 33; n++) await run({}, night(n));
    drive.failUploadsNamed.delete(DUMP_FILE_NAME);
    const r = await run({}, night(33));
    expect(r.status).toBe("complete");
    // One new good snapshot in, one old good snapshot out; the three failed nights' leftovers go to the trash.
    expect(r.retention!.trashed).toEqual([snapshotLabel(night(0))]);
    expect(r.retention!.trashedIncomplete.sort()).toEqual([30, 31, 32].map(n => snapshotLabel(night(n))));
    expect(snapshotsLeft()).toHaveLength(30);
  });

  it("leaves a manifest-less folder under six hours old alone: it may be a run still writing", async () => {
    await run({}, NOW);
    const root = byName(DATABASE_BACKUP_FOLDER_NAME)[0];
    const youngLabel = snapshotLabel(new Date(LATER.getTime() - 3600_000));
    drive.files.set("in-progress", { id: "in-progress", name: youngLabel, mimeType: "application/vnd.google-apps.folder", parents: [root.id], content: "" });
    const r = await run({}, LATER);
    expect(r.retention!.trashedIncomplete).toEqual([]);
    expect(drive.files.get("in-progress")!.trashed).toBeUndefined();
  });

  it("never touches anything in the folder that is not named like a snapshot", async () => {
    await run({}, NOW);
    const root = byName(DATABASE_BACKUP_FOLDER_NAME)[0];
    drive.files.set("notes", { id: "notes", name: "Notes from Tom", mimeType: "application/vnd.google-apps.folder", parents: [root.id], content: "" });
    for (let n = 1; n < 33; n++) await run({}, night(n));
    expect(drive.files.get("notes")!.trashed).toBeUndefined();
    expect(live("latest.json")).toHaveLength(1);
  });

  it("a trash refusal leaves the backup complete and says so; the snapshot stays for the next run", async () => {
    for (let n = 0; n < 30; n++) await run({}, night(n));
    drive.failTrash.add(snapshotLabel(night(0)));
    const r = await run({}, night(30));
    expect(r.status).toBe("complete");
    expect(r.retention!.error).toMatch(/Could not move 1 old snapshot/);
    expect(byName(snapshotLabel(night(0)))[0].trashed).toBeUndefined();
  });
});
