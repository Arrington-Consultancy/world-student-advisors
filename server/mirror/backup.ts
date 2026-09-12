/**
 * The daily Pipedrive disaster-recovery backup into Google Drive.
 *
 * Tom Arrington, 11 September 2026: alongside the hourly sanitised mirror
 * for AI use, a daily timestamped snapshot of leads, deals, persons,
 * organisations, activities, pipelines and stages, owners, custom field
 * definitions and the fields needed to reconstruct the CRM state. The
 * backup keeps what disaster recovery genuinely needs, so it is NOT
 * sanitised the way the mirror is; for exactly that reason its folder is
 * never shared with the workforce service account, is not in any worker's
 * folder allowlist, and is not readable by the resolution layer.
 *
 * Safety: every snapshot is a new timestamped folder. Everything is read
 * from Pipedrive before anything is written. The snapshot's own manifest
 * is written last, and the root pointer (latest.json) is updated only
 * after that. A failed run leaves the previous snapshot and the previous
 * pointer exactly as they were and records the failure with its reason.
 * Notes and email bodies are not included: they are message content, and
 * were not in Tom's list.
 */
import { createHash } from "crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { crmBackupRuns } from "../../drizzle/schema";
import { apiTokenAuth, createPipedriveReaderWithAuth } from "../pipedrive-read";
import { getDriveMirrorAccess } from "./driveMirrorOAuth";
import { DriveClient } from "./driveClient";
import { liveRun, mirrorConfigState, mirrorToken, mirrorTokenSource, type MirrorRunDeps } from "./sync";

export const BACKUP_FOLDER_NAME = "WSA Pipedrive Backup";

/** What is backed up, and how. Order is the write order. */
export const BACKUP_ENTITIES = Object.freeze([
  { name: "users", endpoint: "/users", paginated: false },
  { name: "pipelines", endpoint: "/pipelines", paginated: false },
  { name: "stages", endpoint: "/stages", paginated: false },
  { name: "dealFields", endpoint: "/dealFields", paginated: true },
  { name: "personFields", endpoint: "/personFields", paginated: true },
  { name: "organizationFields", endpoint: "/organizationFields", paginated: true },
  { name: "leadLabels", endpoint: "/leadLabels", paginated: false },
  { name: "leadSources", endpoint: "/leadSources", paginated: false },
  { name: "organizations", endpoint: "/organizations", paginated: true },
  { name: "persons", endpoint: "/persons", paginated: true },
  { name: "leads", endpoint: "/leads?archived_status=all", paginated: true },
  { name: "deals", endpoint: "/deals?status=all_not_deleted", paginated: true },
  { name: "activities", endpoint: "/activities?user_id=0&done=0,1", paginated: true },
] as const);

export interface BackupManifest {
  version: 1;
  source: "pipedrive";
  kind: "disaster_recovery_backup";
  snapshotLabel: string;
  exportedAt: string;
  status: "complete" | "partial";
  reason: string | null;
  coverage: { earliestRecordCreatedAt: string | null; exportedAt: string };
  recordCounts: Record<string, number>;
  files: Array<{ name: string; fileId: string; md5: string; bytes: number; records: number }>;
  entitiesIncluded: string[];
  notIncluded: string[];
  backupRunId: number | null;
}

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
export function snapshotLabel(d: Date): string {
  return d.toISOString().replace(/[:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** A snapshot is minutes of work, so a stalled claim is believed for longer than the mirror's. */
export const BACKUP_CLAIM_STALE_MINUTES = 90;

export interface BackupOutcome { runId: number | null; status: "complete" | "failed" | "skipped"; reason: string | null; counts?: Record<string, number>; snapshotLabel?: string }

let inflight: Promise<BackupOutcome> | null = null;
export function runCrmBackup(trigger: "schedule" | "manual" | "acceptance", deps: MirrorRunDeps = {}): Promise<BackupOutcome> {
  if (inflight) return inflight;
  inflight = doBackup(trigger, deps).finally(() => { inflight = null; });
  return inflight;
}

async function doBackup(trigger: "schedule" | "manual" | "acceptance", deps: MirrorRunDeps): Promise<BackupOutcome> {
  const now = deps.now ?? (() => new Date());
  const state = await mirrorConfigState();
  if (state !== "ready") return { runId: null, status: "skipped", reason: `Backup not configured: ${state}.` };
  const db = await getDb();
  const startedAt = now();
  const label = snapshotLabel(startedAt);
  let runId: number | null = null;
  if (db) {
    // The same cross-process claim the mirror sync holds. A full snapshot
    // takes minutes and uploads tens of megabytes; two at once is how the
    // 12 September 2026 acceptance walked into a Drive rate limit.
    const running = await db.select().from(crmBackupRuns).where(eq(crmBackupRuns.status, "running")).orderBy(desc(crmBackupRuns.id)).limit(1);
    const held = liveRun(running, startedAt, BACKUP_CLAIM_STALE_MINUTES);
    if (held) return { runId: null, status: "skipped", reason: `CRM backup ${held.id} (${held.trigger}) has been running since ${held.startedAt.toISOString()}; this run stood down rather than take a second snapshot alongside it.` };
    const [row] = await db.insert(crmBackupRuns).values({ startedAt, status: "running", trigger, tokenSource: mirrorTokenSource(), snapshotLabel: label }).$returningId();
    runId = row?.id ?? null;
  }
  const finish = async (patch: Partial<typeof crmBackupRuns.$inferInsert>, outcome: BackupOutcome): Promise<BackupOutcome> => {
    if (db && runId !== null) await db.update(crmBackupRuns).set({ ...patch, finishedAt: now() }).where(eq(crmBackupRuns.id, runId));
    return { ...outcome, runId, snapshotLabel: label };
  };
  const failed = (reason: string, extra: Partial<typeof crmBackupRuns.$inferInsert> = {}) => {
    console.warn(`[CRM backup] run failed: ${reason.slice(0, 200)}`);
    return finish({ status: "failed", reason: reason.slice(0, 400), ...extra }, { runId, status: "failed", reason });
  };

  // 1. Read everything first.
  const token = mirrorToken()!;
  const reader = createPipedriveReaderWithAuth(apiTokenAuth(() => token));
  const collections: Array<{ name: string; records: Array<Record<string, unknown>> }> = [];
  for (const entity of BACKUP_ENTITIES) {
    try {
      const records = await reader.listCollectionRaw(entity.endpoint, entity.paginated);
      collections.push({ name: entity.name, records: Array.isArray(records) ? records : [] });
    } catch (error) {
      return failed(`Pipedrive read of ${entity.name} failed before anything was written: ${String((error as Error)?.message ?? error)}`);
    }
  }
  const counts = Object.fromEntries(collections.map(c => [c.name, c.records.length]));
  const created = collections.filter(c => ["leads", "deals", "persons", "organizations"].includes(c.name)).flatMap(c => c.records.map(r => typeof r.add_time === "string" ? new Date(r.add_time.replace(" ", "T") + "Z").getTime() : NaN)).filter(n => Number.isFinite(n));
  const earliest = created.length ? new Date(Math.min(...created)).toISOString() : null;

  // 2. Write into a fresh snapshot folder.
  const drive = await getDriveMirrorAccess({ fetchImpl: deps.fetchImpl });
  if (!drive.ok) return failed(`Google Drive grant not usable at write time: ${drive.status}.`);
  const client = new DriveClient(drive.accessToken, deps.fetchImpl, deps.driveOptions);
  let rootId: string, snapshotId: string;
  try {
    const root = (await client.findFolder(BACKUP_FOLDER_NAME)) ?? (await client.createFolder(BACKUP_FOLDER_NAME));
    rootId = root.id;
    snapshotId = (await client.createFolderIn(rootId, label)).id;
  } catch (error) {
    return failed(`Could not prepare the backup folders: ${String((error as Error)?.message ?? error)}`);
  }
  const files: BackupManifest["files"] = [];
  let totalBytes = 0;
  for (const c of collections) {
    const content = JSON.stringify({ entity: c.name, exportedAt: startedAt.toISOString(), count: c.records.length, records: c.records });
    try {
      const stored = await client.putFile(snapshotId, `${c.name}.json`, content, "application/json");
      const local = md5(content);
      if (stored.md5Checksum && stored.md5Checksum !== local) throw new Error(`Drive reports a different md5 for ${c.name}.json than was sent.`);
      files.push({ name: `${c.name}.json`, fileId: stored.id, md5: local, bytes: Buffer.byteLength(content, "utf8"), records: c.records.length });
      totalBytes += Buffer.byteLength(content, "utf8");
    } catch (error) {
      return failed(`Upload of ${c.name}.json failed after ${files.length} file(s); snapshot ${label} is incomplete and carries no manifest; the previous snapshot and latest.json stand: ${String((error as Error)?.message ?? error)}`, { snapshotFolderId: snapshotId, countsJson: JSON.stringify(counts) });
    }
  }
  const manifest: BackupManifest = {
    version: 1, source: "pipedrive", kind: "disaster_recovery_backup", snapshotLabel: label, exportedAt: startedAt.toISOString(), status: "complete", reason: null,
    coverage: { earliestRecordCreatedAt: earliest, exportedAt: startedAt.toISOString() },
    recordCounts: counts, files,
    entitiesIncluded: BACKUP_ENTITIES.map(e => e.name),
    notIncluded: ["notes", "mail messages", "files and attachments", "products"],
    backupRunId: runId,
  };
  try {
    await client.putFile(snapshotId, "manifest.json", JSON.stringify(manifest, null, 2), "application/json");
    // Only after the snapshot is whole does the pointer move.
    await client.putFile(rootId, "latest.json", JSON.stringify({ snapshotLabel: label, snapshotFolderId: snapshotId, exportedAt: startedAt.toISOString(), status: "complete", recordCounts: counts }, null, 2), "application/json");
  } catch (error) {
    return failed(`Snapshot files written but the manifest or pointer failed; latest.json still names the previous good snapshot: ${String((error as Error)?.message ?? error)}`, { snapshotFolderId: snapshotId, countsJson: JSON.stringify(counts), totalBytes });
  }
  return finish({ status: "complete", reason: null, snapshotFolderId: snapshotId, countsJson: JSON.stringify(counts), totalBytes }, { runId, status: "complete", reason: null, counts });
}

export async function recentBackupRuns(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmBackupRuns).orderBy(desc(crmBackupRuns.id)).limit(limit);
}
