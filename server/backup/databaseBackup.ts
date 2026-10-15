/**
 * The nightly copy of the website's database outside Railway.
 *
 * Tom Arrington, 15 October 2026 ("Yes build"): Railway's volume backups
 * live inside Railway, so a second copy goes somewhere else. It goes to
 * Google Drive, into "WSA Database Backup", through the same approved
 * Drive grant (drive.file) that already holds the nightly Pipedrive
 * backup, so it needs no new permission from anyone.
 *
 * The same safety rules as the Pipedrive backup (server/mirror/backup.ts):
 * every run is a new timestamped folder; the whole export is made and
 * checked before anything is written; Drive's own md5 of the stored file
 * must match what was sent; the snapshot's manifest is written last and
 * the root pointer (latest.json) moves only after that. A failed run
 * leaves the previous snapshot and pointer exactly as they were.
 *
 * The export holds personal data and password hashes, so like the
 * Pipedrive backup its folder is never shared with the workforce identity
 * and no worker can read it. Stored connector tokens in it are sealed with
 * CONNECTOR_TOKEN_KEY, which is a Railway variable and is not in the
 * database, so is not in the backup.
 */
import { getDriveMirrorAccess, getDriveMirrorStatus } from "../mirror/driveMirrorOAuth";
import { DriveClient, type DriveClientOptions } from "../mirror/driveClient";
import { snapshotLabel } from "../mirror/backup";
import { DUMP_FILE_NAME, dumpDatabase, type DumpResult } from "./databaseDump";

export const DATABASE_BACKUP_FOLDER_NAME = "WSA Database Backup";
export const RESTORE_COMMAND = "gunzip -c database.sql.gz | mysql --host=HOST --port=PORT --user=USER --password DATABASE   (into an EMPTY MySQL 8 or 9 database)";
export const NOT_INCLUDED = Object.freeze([
  "Railway service variables, including CONNECTOR_TOKEN_KEY (needed to unseal the stored connector tokens) and every API key",
  "the website code (it is in GitHub)",
  "Pipedrive data (backed up separately to WSA Pipedrive Backup)",
]);

export interface DatabaseBackupManifest {
  version: 1;
  source: "mysql";
  kind: "database_backup";
  snapshotLabel: string;
  exportedAt: string;
  status: "complete";
  database: { name: string; serverVersion: string };
  file: { name: string; fileId: string; bytes: number; uncompressedBytes: number; md5: string; sha256: string };
  tables: Array<{ name: string; rows: number; columns: number }>;
  totalRows: number;
  migrationsApplied: number | null;
  otherObjects: DumpResult["otherObjects"];
  restore: string;
  notIncluded: string[];
}

export type DatabaseBackupState = "ready" | "disabled" | "no_database" | `drive_${string}`;

/** Why a run would stand down, or "ready". DATABASE_BACKUP_ENABLED="false" switches the nightly run off. */
export async function databaseBackupConfigState(env: NodeJS.ProcessEnv = process.env): Promise<DatabaseBackupState> {
  if (env.DATABASE_BACKUP_ENABLED === "false") return "disabled";
  if (!env.DATABASE_URL) return "no_database";
  const drive = await getDriveMirrorStatus();
  return drive === "operational" ? "ready" : `drive_${drive}`;
}

export interface DatabaseBackupOutcome {
  status: "complete" | "failed" | "skipped";
  reason: string | null;
  snapshotLabel?: string;
  snapshotFolderId?: string;
  manifest?: DatabaseBackupManifest;
}

export interface DatabaseBackupDeps {
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  driveOptions?: DriveClientOptions;
  dump?: (databaseUrl: string) => Promise<DumpResult>;
}

let inflight: Promise<DatabaseBackupOutcome> | null = null;
export function runDatabaseBackup(trigger: "schedule" | "manual" | "acceptance", deps: DatabaseBackupDeps = {}): Promise<DatabaseBackupOutcome> {
  if (inflight) return inflight.then(() => ({ status: "skipped" as const, reason: "a database backup was already running" }));
  inflight = doBackup(trigger, deps).finally(() => { inflight = null; });
  return inflight;
}

const message = (error: unknown) => String((error as Error)?.message ?? error);

async function doBackup(trigger: string, deps: DatabaseBackupDeps): Promise<DatabaseBackupOutcome> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const state = await databaseBackupConfigState(env);
  if (state !== "ready") return { status: "skipped", reason: `Database backup not running: ${state}.` };
  const label = snapshotLabel(now());
  const failed = (reason: string, extra: Partial<DatabaseBackupOutcome> = {}): DatabaseBackupOutcome => {
    console.warn(`[Database backup] ${trigger} run failed: ${reason.slice(0, 300)}`);
    return { status: "failed", reason, snapshotLabel: label, ...extra };
  };

  // 1. Make and check the whole export before touching Drive.
  let dump: DumpResult;
  try {
    dump = await (deps.dump ?? dumpDatabase)(env.DATABASE_URL!);
  } catch (error) {
    return failed(`The export failed before anything was written: ${message(error)}`);
  }

  // 2. Store it in a fresh snapshot folder.
  const drive = await getDriveMirrorAccess({ fetchImpl: deps.fetchImpl });
  if (!drive.ok) return failed(`Google Drive grant not usable at write time: ${drive.status}.`);
  const client = new DriveClient(drive.accessToken, deps.fetchImpl, deps.driveOptions);
  let rootId: string, snapshotId: string;
  try {
    rootId = ((await client.findFolder(DATABASE_BACKUP_FOLDER_NAME)) ?? (await client.createFolder(DATABASE_BACKUP_FOLDER_NAME))).id;
    snapshotId = (await client.createFolderIn(rootId, label)).id;
  } catch (error) {
    return failed(`Could not prepare the backup folders: ${message(error)}`);
  }
  let fileId: string;
  try {
    const stored = await client.putBinaryFile(snapshotId, DUMP_FILE_NAME, dump.bytes, "application/gzip");
    if (stored.md5Checksum !== dump.md5) throw new Error(`Drive reports md5 ${stored.md5Checksum ?? "none"} for the stored file, not the ${dump.md5} that was sent.`);
    fileId = stored.id;
  } catch (error) {
    return failed(`Upload of ${DUMP_FILE_NAME} failed; snapshot ${label} carries no manifest and latest.json still names the previous good snapshot: ${message(error)}`, { snapshotFolderId: snapshotId });
  }

  const manifest: DatabaseBackupManifest = {
    version: 1, source: "mysql", kind: "database_backup", snapshotLabel: label, exportedAt: dump.startedAt.toISOString(), status: "complete",
    database: { name: dump.database, serverVersion: dump.serverVersion },
    file: { name: DUMP_FILE_NAME, fileId, bytes: dump.bytes.length, uncompressedBytes: dump.uncompressedBytes, md5: dump.md5, sha256: dump.sha256 },
    tables: dump.tables, totalRows: dump.totalRows, migrationsApplied: dump.migrationsApplied, otherObjects: dump.otherObjects,
    restore: RESTORE_COMMAND,
    notIncluded: [...NOT_INCLUDED],
  };
  try {
    await client.putFile(snapshotId, "manifest.json", JSON.stringify(manifest, null, 2), "application/json");
    // Only after the snapshot is whole does the pointer move.
    await client.putFile(rootId, "latest.json", JSON.stringify({ snapshotLabel: label, snapshotFolderId: snapshotId, exportedAt: manifest.exportedAt, status: "complete", tables: dump.tables.length, totalRows: dump.totalRows, bytes: dump.bytes.length }, null, 2), "application/json");
  } catch (error) {
    return failed(`The export is stored but the manifest or pointer failed; latest.json still names the previous good snapshot: ${message(error)}`, { snapshotFolderId: snapshotId });
  }
  return { status: "complete", reason: null, snapshotLabel: label, snapshotFolderId: snapshotId, manifest };
}
