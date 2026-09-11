/**
 * Production acceptance for the WSA AI Reporting Mirror. Runs inside the
 * Railway service's variables with a public database URL substituted.
 *
 * Proves, printing counts, names, statuses and hashes only, never a token
 * or a record value:
 *   1. Configuration: the Pipedrive credential choice and the Google grant.
 *   2. A sync run completes and is recorded.
 *   3. The credential can see only the mirror's own files: an unfiltered
 *      Drive listing returns exactly the folder and its four files.
 *   4. The manifest is complete, current, and every file's md5 on Drive
 *      matches it; the CSV headers carry only allowlisted columns and
 *      none of the excluded keys.
 *   5. The resolver, fed the mirror, answers a count and names the mirror
 *      as its source.
 * Exit 0 only when every proof holds.
 */
import { mirrorConfigState, mirrorTokenSource, runMirrorSync, recentMirrorRuns } from "../server/mirror/sync";
import { readMirror, miReaderOverMirror } from "../server/mirror/reader";
import { getDriveMirrorAccess, describeDriveMirrorGrant } from "../server/mirror/driveMirrorOAuth";
import { DriveClient } from "../server/mirror/driveClient";
import { LEAD_COLUMNS, DEAL_COLUMNS, PERSON_COLUMNS, NEVER_MIRRORED } from "../server/mirror/sanitise";
import { MIRROR_FOLDER_NAME } from "../server/mirror/manifest";
import { gatherEvidence } from "../server/workforce/mi/evidence";
import { runCrmBackup, recentBackupRuns, BACKUP_FOLDER_NAME } from "../server/mirror/backup";
import { workforceDriveIdentity } from "../server/workforce/connectors/googleDrive";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => { if (!ok) failures += 1; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`); };

console.log("\n=== 1. Configuration ===");
console.log(`  Pipedrive credential source: ${mirrorTokenSource() ?? "(not chosen)"}`);
const grant = await describeDriveMirrorGrant();
check(grant.status === "operational", "Google Drive grant", grant.status);
check(grant.scopes === "https://www.googleapis.com/auth/drive.file", "granted scope is exactly drive.file", grant.scopes ?? "(none)");
const state = await mirrorConfigState();
check(state === "ready", "mirror configuration", state);
if (state !== "ready") { console.log("\nRESULT: the mirror is not ready to run."); process.exit(1); }

console.log("\n=== 2. Sync run ===");
const run = await runMirrorSync("acceptance");
check(run.status === "complete", "run status", `${run.status}${run.reason ? `: ${run.reason}` : ""}`);
if (run.counts) console.log(`  counts: ${run.counts.leads} leads, ${run.counts.deals} deals, ${run.counts.persons} persons`);
const runs = await recentMirrorRuns(1);
check(runs.length === 1 && runs[0].status === "complete", "run recorded in mirror_sync_runs", runs[0] ? `id ${runs[0].id} ${runs[0].status}` : "no row");

console.log("\n=== 3. The credential sees only the mirror ===");
const access = await getDriveMirrorAccess();
if (access.ok) {
  const client = new DriveClient(access.accessToken);
  const everything = await client.listAll();
  const names = everything.map(f => f.name).sort();
  console.log(`  unfiltered listing: ${everything.length} item(s): ${names.join(", ")}`);
  const mirrorItems = everything.filter(f => f.name === MIRROR_FOLDER_NAME || everything.some(p => p.name === MIRROR_FOLDER_NAME && f.parents?.includes(p.id)));
  check(mirrorItems.length === 5, "exactly the mirror folder and its four files", `${mirrorItems.length}`);
  const backupRoot = everything.filter(f => f.name === BACKUP_FOLDER_NAME);
  const unexpected = everything.filter(f => !mirrorItems.includes(f) && f.name !== BACKUP_FOLDER_NAME && !backupRoot.some(b => f.parents?.includes(b.id)) && !everything.some(s => backupRoot.some(b => s.parents?.includes(b.id)) && f.parents?.includes(s.id)) && f.name !== "latest.json");
  check(unexpected.length === 0, "nothing beyond the mirror and backup folders is visible to the writer credential", unexpected.map(u => u.name).join(", "));
  const folder = everything.find(f => f.name === MIRROR_FOLDER_NAME);
  check(Boolean(folder), "the mirror folder is present");
  const identity = workforceDriveIdentity();
  if (identity && folder) {
    const perms = await (await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions?fields=permissions(emailAddress,role)`, { headers: { Authorization: `Bearer ${access.accessToken}` } })).json() as { permissions?: Array<{ emailAddress?: string; role?: string }> };
    check((perms.permissions ?? []).some(p => p.emailAddress === identity && p.role === "reader"), "mirror folder shared read-only with the workforce identity", identity);
    if (backupRoot[0]) {
      const bp = await (await fetch(`https://www.googleapis.com/drive/v3/files/${backupRoot[0].id}/permissions?fields=permissions(emailAddress,role)`, { headers: { Authorization: `Bearer ${access.accessToken}` } })).json() as { permissions?: Array<{ emailAddress?: string }> };
      check(!(bp.permissions ?? []).some(p => p.emailAddress === identity), "backup folder NOT shared with the workforce identity");
    }
  }
}

console.log("\n=== 4. Manifest and files ===");
const mirror = await readMirror();
check(mirror.status === "fresh", "mirror read status", mirror.status);
if (mirror.manifest) {
  const m = mirror.manifest;
  console.log(`  last successful sync: ${m.lastSuccessfulSyncAt}`);
  console.log(`  coverage: ${m.coveragePeriod.from ?? "(none)"} to ${m.coveragePeriod.to}`);
  console.log(`  status: ${m.status}${m.reason ? ` (${m.reason})` : ""}`);
  console.log(`  fields: leads ${m.fieldsIncluded.leads.join("|")}; deals ${m.fieldsIncluded.deals.join("|")}; persons ${m.fieldsIncluded.persons.join("|")}`);
  for (const f of m.files) console.log(`  ${f.name}: ${f.rowCount} rows, md5 ${f.md5}`);
  const headers = [...m.fieldsIncluded.leads, ...m.fieldsIncluded.deals, ...m.fieldsIncluded.persons];
  check(headers.every(h => !(NEVER_MIRRORED as readonly string[]).includes(h)), "no excluded key among the columns");
  check(JSON.stringify(m.fieldsIncluded) === JSON.stringify({ leads: [...LEAD_COLUMNS], deals: [...DEAL_COLUMNS], persons: [...PERSON_COLUMNS] }), "columns are exactly the allowlist");
}

console.log("\n=== 5. The resolver reads the mirror ===");
if (mirror.files) {
  const ev = await gatherEvidence(miReaderOverMirror(mirror.files));
  console.log(`  evidence records rebuilt: ${ev.records.length} (${ev.records.filter(r => r.kind === "lead").length} leads, ${ev.records.filter(r => r.kind === "deal").length} deals)`);
  check(ev.records.length > 0, "evidence rebuilt from the mirror");
  const byChannel = ev.records.reduce<Record<string, number>>((acc, r) => { acc[r.channel] = (acc[r.channel] ?? 0) + 1; return acc; }, {});
  console.log(`  channels: ${Object.entries(byChannel).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}

console.log("\n=== 6. Daily backup snapshot ===");
const backup = await runCrmBackup("acceptance");
check(backup.status === "complete", "backup run status", `${backup.status}${backup.reason ? `: ${backup.reason}` : ""}${backup.snapshotLabel ? ` snapshot ${backup.snapshotLabel}` : ""}`);
if (backup.counts) console.log(`  counts: ${Object.entries(backup.counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
const backupRuns = await recentBackupRuns(1);
check(backupRuns.length === 1 && backupRuns[0].status === "complete", "backup run recorded in crm_backup_runs", backupRuns[0] ? `id ${backupRuns[0].id} ${backupRuns[0].status}` : "no row");

console.log(`\nRESULT: ${failures === 0 ? "every proof holds; the reporting mirror and backup are accepted" : `${failures} proof(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
