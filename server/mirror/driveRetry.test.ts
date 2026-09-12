import { describe, it, expect } from "vitest";
import { FakeDrive } from "./fakeDrive";
import { DriveClient, driveFailureIsTransient, backoffMs, DEFAULT_MAX_ATTEMPTS } from "./driveClient";
import { liveRun, SYNC_CLAIM_STALE_MINUTES } from "./sync";
import { BACKUP_CLAIM_STALE_MINUTES } from "./backup";

/**
 * Two Drive answers failed a production mirror run on 12 September 2026: a
 * 403 "userRateLimitExceeded" partway through the backup uploads, and a
 * 500 "the operation was successful, but there was an error preparing the
 * response" on a folder create. These prove the first is now waited out,
 * the second does not leave a duplicate, and a 403 that means "you may
 * not" is still answered at once rather than retried for a minute.
 */

const NEVER_SLEEPS = { sleep: async () => {}, random: () => 0 };
const client = (drive: FakeDrive, maxAttempts?: number) =>
  new DriveClient("drive-access-token-test", drive.fetch, { ...NEVER_SLEEPS, ...(maxAttempts ? { maxAttempts } : {}) });

describe("which Drive failures are worth another attempt", () => {
  const rateLimited = JSON.stringify({ error: { code: 403, errors: [{ reason: "userRateLimitExceeded", domain: "usageLimits" }] } });
  const refused = JSON.stringify({ error: { code: 403, errors: [{ reason: "insufficientFilePermissions" }] } });

  it("waits out the ones Google asks callers to wait out", () => {
    expect(driveFailureIsTransient(403, rateLimited)).toBe(true);
    expect(driveFailureIsTransient(429, "{}")).toBe(true);
    expect(driveFailureIsTransient(500, "The operation was successful, but there was an error preparing the response.")).toBe(true);
    expect(driveFailureIsTransient(503, "{}")).toBe(true);
    for (const reason of ["rateLimitExceeded", "userRateLimitExceededSharedQuota", "sharingRateLimitExceeded", "backendError"])
      expect(driveFailureIsTransient(403, JSON.stringify({ error: { errors: [{ reason }] } }))).toBe(true);
  });

  it("does not retry a refusal, whatever its status", () => {
    expect(driveFailureIsTransient(403, refused)).toBe(false);
    expect(driveFailureIsTransient(403, JSON.stringify({ error: { errors: [{ reason: "storageQuotaExceeded" }] } }))).toBe(false);
    expect(driveFailureIsTransient(401, "{}")).toBe(false);
    expect(driveFailureIsTransient(404, "{}")).toBe(false);
    expect(driveFailureIsTransient(400, "{}")).toBe(false);
    // A bare 403 with no reason at all is a refusal until it says otherwise.
    expect(driveFailureIsTransient(403, "Forbidden")).toBe(false);
  });

  it("backs off by doubling, caps the wait, and jitters", () => {
    expect([0, 1, 2, 3, 4, 5].map(i => backoffMs(i, () => 0))).toEqual([1000, 2000, 4000, 8000, 16000, 32000]);
    expect(backoffMs(9, () => 0)).toBe(32000);
    expect(backoffMs(0, () => 0.5)).toBe(1500);
  });

  it("gives a rate-limited call about a minute, which is the length of Drive's window", () => {
    const total = Array.from({ length: DEFAULT_MAX_ATTEMPTS - 1 }, (_, i) => backoffMs(i, () => 0)).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(60_000);
  });
});

describe("a rate-limited write is waited out rather than failing the run", () => {
  it("retries an upload until Drive accepts it, and stores it once", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    const folder = await c.createFolder("WSA AI Reporting Mirror");
    drive.transientFailures.set("leads.csv", 3);
    const stored = await c.putFile(folder.id, "leads.csv", "id\n1\n", "text/csv");
    expect(stored.id).toBeTruthy();
    expect(Array.from(drive.files.values()).filter(f => f.name === "leads.csv")).toHaveLength(1);
    expect(Array.from(drive.files.values()).find(f => f.name === "leads.csv")!.content).toBe("id\n1\n");
  });

  it("gives up once the budget is spent, and the error still names what Drive said", async () => {
    const drive = new FakeDrive();
    const c = client(drive, 3);
    const folder = await c.createFolder("WSA AI Reporting Mirror");
    drive.transientFailures.set("leads.csv", 99);
    await expect(c.putFile(folder.id, "leads.csv", "id\n1\n", "text/csv")).rejects.toThrow(/HTTP 403.*userRateLimitExceeded/s);
    const attempts = drive.requests.filter(r => r.url.includes("/upload/")).length;
    expect(attempts).toBe(3);
  });

  it("answers a refusal at once instead of retrying it", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    const folder = await c.createFolder("WSA AI Reporting Mirror");
    drive.failUploadsNamed.add("leads.csv");
    await expect(c.putFile(folder.id, "leads.csv", "id\n1\n", "text/csv")).rejects.toThrow(/insufficientFilePermissions/);
    expect(drive.requests.filter(r => r.url.includes("/upload/")).length).toBe(1);
  });
});

describe("a write that landed without answering is not done twice", () => {
  it("adopts the folder the failed attempt actually created", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    drive.succeedThenFail.set("WSA AI Reporting Mirror", 1);
    const folder = await c.createFolder("WSA AI Reporting Mirror");
    expect(Array.from(drive.files.values()).filter(f => f.name === "WSA AI Reporting Mirror")).toHaveLength(1);
    expect(folder.id).toBe(Array.from(drive.files.values())[0].id);
  });

  it("adopts a snapshot folder created inside its parent", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    const root = await c.createFolder("WSA Pipedrive Backup");
    drive.succeedThenFail.set("2026-09-12T065620Z", 2);
    const snapshot = await c.createFolderIn(root.id, "2026-09-12T065620Z");
    const made = Array.from(drive.files.values()).filter(f => f.name === "2026-09-12T065620Z");
    expect(made).toHaveLength(1);
    expect(snapshot.id).toBe(made[0].id);
    expect(made[0].parents).toEqual([root.id]);
  });

  it("replaces rather than duplicates a file whose create landed without answering", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    const folder = await c.createFolder("WSA Pipedrive Backup");
    drive.succeedThenFail.set("deals.json", 1);
    const stored = await c.putFile(folder.id, "deals.json", '{"entity":"deals"}', "application/json");
    const copies = Array.from(drive.files.values()).filter(f => f.name === "deals.json");
    expect(copies).toHaveLength(1);
    expect(copies[0].content).toBe('{"entity":"deals"}');
    expect(stored.id).toBe(copies[0].id);
  });

  it("does not grant the same reader twice when the permission call is retried", async () => {
    const drive = new FakeDrive();
    const c = client(drive);
    const folder = await c.createFolder("WSA AI Reporting Mirror");
    await c.shareReader(folder.id, "wsa-workforce-drive@wsa-reporting-mirror.iam.gserviceaccount.com");
    await c.shareReader(folder.id, "WSA-Workforce-Drive@wsa-reporting-mirror.iam.gserviceaccount.com");
    expect(drive.permissions.get(folder.id)).toHaveLength(1);
  });
});

describe("one run at a time, across processes", () => {
  const NOW = new Date("2026-09-12T07:00:00.000Z");
  const row = (minutesAgo: number, id = 4) => ({ id, trigger: "schedule", startedAt: new Date(NOW.getTime() - minutesAgo * 60_000) });

  it("stands down while another process is minutes into the same work", () => {
    expect(liveRun([row(2)], NOW, SYNC_CLAIM_STALE_MINUTES)?.id).toBe(4);
    expect(liveRun([row(29)], NOW, SYNC_CLAIM_STALE_MINUTES)?.id).toBe(4);
  });

  it("proceeds when nothing is running", () => {
    expect(liveRun([], NOW, SYNC_CLAIM_STALE_MINUTES)).toBeNull();
  });

  it("is never blocked for ever by a process that died mid-run", () => {
    expect(liveRun([row(30)], NOW, SYNC_CLAIM_STALE_MINUTES)).toBeNull();
    expect(liveRun([row(600)], NOW, SYNC_CLAIM_STALE_MINUTES)).toBeNull();
  });

  it("believes a backup claim for longer, because a snapshot takes longer", () => {
    expect(BACKUP_CLAIM_STALE_MINUTES).toBeGreaterThan(SYNC_CLAIM_STALE_MINUTES);
    expect(liveRun([row(45)], NOW, BACKUP_CLAIM_STALE_MINUTES)?.id).toBe(4);
    expect(liveRun([row(45)], NOW, SYNC_CLAIM_STALE_MINUTES)).toBeNull();
  });
});
