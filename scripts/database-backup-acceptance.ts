/**
 * Production acceptance for the nightly database backup (Tom Arrington,
 * 15 October 2026). Runs inside the Railway service's variables with a
 * public database URL substituted, as the other acceptance workflows do.
 *
 *   1. Configuration: the backup's state and the database it reads.
 *   2. One real backup, exactly as the nightly run makes it: a new
 *      timestamped snapshot in Google Drive, "WSA Database Backup".
 *   3. Read back from Drive: latest.json names this snapshot, Drive's md5
 *      and the downloaded bytes' sha256 match the manifest, and the file
 *      ends with its completion line.
 *   4. Hands the downloaded file to the workflow (BACKUP_ACCEPTANCE_OUT),
 *      which restores it into a throwaway MySQL and compares every table's
 *      row count with the manifest (database-backup-restore-check.ts).
 *
 * Prints table names, counts, sizes and checksums only: never a row.
 * Exit 0 only when every step passed.
 */
import { mkdirSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import { join } from "path";
import { databaseBackupConfigState, runDatabaseBackup, DATABASE_BACKUP_FOLDER_NAME } from "../server/backup/databaseBackup";
import { DUMP_FILE_NAME } from "../server/backup/databaseDump";
import { getDriveMirrorAccess } from "../server/mirror/driveMirrorOAuth";
import { DriveClient } from "../server/mirror/driveClient";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => { if (!ok) failures += 1; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`); };
const note = (label: string) => console.log(`  note ${label}`);
function finish(): never { console.log(`\nRESULT: ${failures === 0 ? "every step passed" : `${failures} check(s) failed`}.`); process.exit(failures === 0 ? 0 : 1); }

console.log("\n=== 1. Configuration ===");
const state = await databaseBackupConfigState();
check(state === "ready", "database backup ready", state);
if (state !== "ready") finish();

console.log("\n=== 2. One real backup ===");
const r = await runDatabaseBackup("acceptance");
check(r.status === "complete", "backup run complete", `${r.status}${r.reason ? `: ${r.reason.slice(0, 300)}` : ""}`);
if (!r.manifest) finish();
const m = r.manifest!;
note(`snapshot ${m.snapshotLabel}; database ${m.database.name}, MySQL ${m.database.serverVersion}`);
note(`${m.tables.length} tables, ${m.totalRows} rows; ${m.file.bytes} bytes compressed, ${m.file.uncompressedBytes} uncompressed; migrations recorded ${m.migrationsApplied}`);
note(`views ${m.otherObjects.views}, triggers ${m.otherObjects.triggers}, routines ${m.otherObjects.routines}, events ${m.otherObjects.events}`);
for (const t of m.tables) note(`table ${t.name}: ${t.rows} rows`);

console.log("\n=== 3. Read back from Google Drive ===");
const drive = await getDriveMirrorAccess();
if (!drive.ok) { check(false, "Drive grant usable", drive.status); finish(); }
const client = new DriveClient(drive.accessToken);
const root = await client.findFolder(DATABASE_BACKUP_FOLDER_NAME);
check(Boolean(root), `"${DATABASE_BACKUP_FOLDER_NAME}" folder exists`);
const latestFile = root ? await client.findInFolder(root.id, "latest.json") : null;
const latest = latestFile ? JSON.parse(await client.download(latestFile.id)) as { snapshotLabel?: string; snapshotFolderId?: string } : null;
check(latest?.snapshotLabel === m.snapshotLabel && latest?.snapshotFolderId === r.snapshotFolderId, "latest.json names this snapshot", latest?.snapshotLabel ?? "missing");
const storedManifest = r.snapshotFolderId ? await client.findInFolder(r.snapshotFolderId, "manifest.json") : null;
check(Boolean(storedManifest) && JSON.parse(await client.download(storedManifest!.id)).file?.sha256 === m.file.sha256, "manifest.json stored in the snapshot");
const meta = await client.getMeta(m.file.fileId);
check(meta.md5Checksum === m.file.md5, "Drive's md5 of the stored file matches", meta.md5Checksum ?? "none");
const bytes = await client.downloadBytes(m.file.fileId);
check(createHash("sha256").update(bytes).digest("hex") === m.file.sha256, "downloaded file's sha256 matches the manifest", `${bytes.length} bytes`);
let raw: Buffer = Buffer.alloc(0);
try { raw = gunzipSync(bytes); } catch (error) { check(false, "file decompresses", String((error as Error)?.message ?? error)); }
const sql = raw.toString("utf8");
check(raw.length === m.file.uncompressedBytes, "decompressed size matches the manifest", `${raw.length} bytes`);
check(sql.trimEnd().endsWith(`-- WSA database backup complete: ${m.tables.length} tables, ${m.totalRows} rows.`), "file ends with its completion line");
check(!/\bDROP\s+(TABLE|DATABASE)\b/i.test(sql.split("\n").filter(l => !l.startsWith("INSERT INTO ") && !l.startsWith("(")).join("\n")), "no DROP statement: a restore cannot overwrite an existing table");

const out = process.env.BACKUP_ACCEPTANCE_OUT;
if (out) {
  console.log("\n=== 4. Hand-off to the restore test ===");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, DUMP_FILE_NAME), bytes);
  writeFileSync(join(out, "expected.json"), JSON.stringify({ snapshotLabel: m.snapshotLabel, tables: m.tables, totalRows: m.totalRows }));
  note(`written to the runner's temporary folder for the restore step; removed when the job ends`);
}
finish();
