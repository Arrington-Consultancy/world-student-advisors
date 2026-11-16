/**
 * One run of the Pipedrive to Google Drive reporting mirror.
 *
 * Order matters and is the safety property:
 *   1. Fetch everything from Pipedrive first. Any failure here ends the run
 *      as failed before Drive is touched, so the last good files stand.
 *   2. Build every sanitised file in memory and compute its md5.
 *   3. Write the data files, then the manifest last. The manifest carries
 *      each file's Drive id and md5, and a reader trusts a file only when
 *      the md5 Drive reports still matches. So a run that dies between two
 *      uploads leaves a mirror the reader recognises as inconsistent and
 *      refuses, rather than one it silently believes.
 * Every attempt is recorded in mirror_sync_runs, including the ones that
 * never reached Drive, with a plain reason and no record content.
 *
 * WHICH PIPEDRIVE CREDENTIAL. Tom chooses explicitly through
 * PIPEDRIVE_MIRROR_TOKEN_SOURCE: "website_token" uses the production
 * PIPEDRIVE_API_TOKEN (Tim Hunt's, admin, full visibility, verified on
 * 11 September 2026) for this server-side job only; "dedicated" uses
 * PIPEDRIVE_MIRROR_API_TOKEN. Unset means the mirror does not run. The
 * token never leaves this process and is never handed to a worker or the
 * model; only the sanitised files are.
 */
import { createHash } from "crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { mirrorSyncRuns } from "../../drizzle/schema";
import { apiTokenAuth, createPipedriveReaderWithAuth } from "../pipedrive-read";
import { getDriveMirrorAccess } from "./driveMirrorOAuth";
import { DriveClient, type DriveClientOptions } from "./driveClient";
import { dealRow, leadRow, personRow, ownerNameMap, toCsv, LEAD_COLUMNS, DEAL_COLUMNS, PERSON_COLUMNS, NEVER_MIRRORED, type Row } from "./sanitise";
import { MIRROR_FILE_NAMES, MIRROR_FOLDER_NAME, type MirrorManifest, type MirrorFileEntry } from "./manifest";
import { workforceDriveIdentity } from "../workforce/connectors/googleDrive";

/** Test seams only: production passes none of these. */
export interface MirrorRunDeps { fetchImpl?: typeof fetch; now?: () => Date; driveOptions?: DriveClientOptions }

export type MirrorTokenSource = "website_token" | "dedicated";

export function mirrorTokenSource(env: NodeJS.ProcessEnv = process.env): MirrorTokenSource | null {
  const v = env.PIPEDRIVE_MIRROR_TOKEN_SOURCE;
  return v === "website_token" || v === "dedicated" ? v : null;
}
export function mirrorToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const source = mirrorTokenSource(env);
  if (source === "website_token") return env.PIPEDRIVE_API_TOKEN || null;
  if (source === "dedicated") return env.PIPEDRIVE_MIRROR_API_TOKEN || null;
  return null;
}

export type MirrorConfigState = "ready" | "token_source_unset" | "token_missing" | "drive_unconfigured" | "drive_not_authorised" | "drive_reauthorisation_required";
export async function mirrorConfigState(): Promise<MirrorConfigState> {
  if (!mirrorTokenSource()) return "token_source_unset";
  if (!mirrorToken()) return "token_missing";
  const drive = await getDriveMirrorAccess();
  if (drive.ok) return "ready";
  if (drive.status === "unconfigured") return "drive_unconfigured";
  if (drive.status === "reauthorisation_required") return "drive_reauthorisation_required";
  return "drive_not_authorised";
}

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

/**
 * How long a row left in "running" is believed. Beyond this the process
 * that claimed it is taken to have died, and a new run may proceed.
 */
export const SYNC_CLAIM_STALE_MINUTES = 30;

/**
 * Two processes write this mirror: the service's own scheduler and any
 * out-of-process run such as the production acceptance. On 12 September
 * 2026 both ran at once, the folder was created twice over and Drive
 * answered one of them with a 500. The single-flight promise above only
 * covers one process, so the claim has to live where both can see it.
 *
 * This is a claim, not a lock: two runs that read this within the same
 * instant can both proceed. It closes the window that actually occurs,
 * where one run is minutes into its work, and it never blocks a run
 * behind a process that has died.
 */
export function liveRun<T extends { id: number; startedAt: Date; trigger: string }>(rows: T[], now: Date, staleMinutes: number): T | null {
  const row = rows[0];
  if (!row) return null;
  return now.getTime() - row.startedAt.getTime() < staleMinutes * 60_000 ? row : null;
}

export interface SyncOutcome { runId: number | null; status: "complete" | "partial" | "failed" | "skipped"; reason: string | null; counts?: { leads: number; deals: number; persons: number }; manifestFileId?: string }

let inflight: Promise<SyncOutcome> | null = null;

export function runMirrorSync(trigger: "schedule" | "manual" | "acceptance", deps: MirrorRunDeps = {}): Promise<SyncOutcome> {
  if (inflight) return inflight;
  inflight = doRun(trigger, deps).finally(() => { inflight = null; });
  return inflight;
}

async function doRun(trigger: "schedule" | "manual" | "acceptance", deps: MirrorRunDeps): Promise<SyncOutcome> {
  const now = deps.now ?? (() => new Date());
  const state = await mirrorConfigState();
  if (state !== "ready") return { runId: null, status: "skipped", reason: `Mirror not configured: ${state}.` };
  const db = await getDb();
  const startedAt = now();
  let runId: number | null = null;
  if (db) {
    const running = await db.select().from(mirrorSyncRuns).where(eq(mirrorSyncRuns.status, "running")).orderBy(desc(mirrorSyncRuns.id)).limit(1);
    const held = liveRun(running, startedAt, SYNC_CLAIM_STALE_MINUTES);
    if (held) return { runId: null, status: "skipped", reason: `Mirror sync ${held.id} (${held.trigger}) has been running since ${held.startedAt.toISOString()}; this run stood down rather than write the same folder twice.` };
    const [row] = await db.insert(mirrorSyncRuns).values({ startedAt, status: "running", trigger, tokenSource: mirrorTokenSource() }).$returningId();
    runId = row?.id ?? null;
  }
  const finish = async (patch: Partial<typeof mirrorSyncRuns.$inferInsert>, outcome: SyncOutcome): Promise<SyncOutcome> => {
    if (db && runId !== null) await db.update(mirrorSyncRuns).set({ ...patch, finishedAt: now() }).where(eq(mirrorSyncRuns.id, runId));
    return { ...outcome, runId };
  };
  const failed = (reason: string) => {
    console.warn(`[Reporting mirror] run failed: ${reason.slice(0, 200)}`);
    return finish({ status: "failed", reason: reason.slice(0, 400) }, { runId, status: "failed", reason });
  };

  // 1. Read everything first. The token stays inside this closure.
  const token = mirrorToken()!;
  const reader = createPipedriveReaderWithAuth(apiTokenAuth(() => token));
  let leadsRaw: Array<Record<string, unknown>>, dealsRaw: Array<Record<string, unknown>>, personsRaw: Array<Record<string, unknown>>, usersRaw: Array<Record<string, unknown>>;
  try {
    [leadsRaw, dealsRaw, personsRaw, usersRaw] = await Promise.all([reader.listLeadsRaw(), reader.listDealsRaw(), reader.listPersonsRaw(), reader.listUsersRaw()]);
  } catch (error) {
    return failed(`Pipedrive read failed before anything was written: ${String((error as Error)?.message ?? error)}`);
  }

  // 2. Sanitise and build.
  const owners = ownerNameMap(usersRaw);
  const leads = leadsRaw.map(l => leadRow(l, owners));
  const deals = dealsRaw.map(d => dealRow(d, owners));
  const persons = personsRaw.map(p => personRow(p, owners));
  const created = [...leads, ...deals].map(r => r.created_at).filter(Boolean).map(s => new Date(s.replace(" ", "T") + "Z").getTime()).filter(n => Number.isFinite(n));
  const coverageFrom = created.length ? new Date(Math.min(...created)) : null;
  const coverageTo = now();
  const files: Array<{ name: string; content: string; rows: Row[]; columns: readonly string[]; mime: string }> = [
    { name: MIRROR_FILE_NAMES.leads, content: toCsv(LEAD_COLUMNS, leads), rows: leads, columns: LEAD_COLUMNS, mime: "text/csv" },
    { name: MIRROR_FILE_NAMES.deals, content: toCsv(DEAL_COLUMNS, deals), rows: deals, columns: DEAL_COLUMNS, mime: "text/csv" },
    { name: MIRROR_FILE_NAMES.persons, content: toCsv(PERSON_COLUMNS, persons), rows: persons, columns: PERSON_COLUMNS, mime: "text/csv" },
  ];

  // 3. Write data files, then the manifest.
  const drive = await getDriveMirrorAccess({ fetchImpl: deps.fetchImpl });
  if (!drive.ok) return failed(`Google Drive grant not usable at write time: ${drive.status}.`);
  const client = new DriveClient(drive.accessToken, deps.fetchImpl, deps.driveOptions);
  let folderId: string;
  try {
    const folder = (await client.findFolder(MIRROR_FOLDER_NAME)) ?? (await client.createFolder(MIRROR_FOLDER_NAME));
    folderId = folder.id;
    // Tom Arrington, 11 September 2026: give the reporting capability access
    // to the mirror folder. The workforce service account is granted reader
    // on this one folder. The backup folder is never shared.
    const identity = workforceDriveIdentity();
    if (identity) await client.shareReader(folderId, identity);
  } catch (error) {
    return failed(`Could not find, create or share the mirror folder: ${String((error as Error)?.message ?? error)}`);
  }
  const written: MirrorFileEntry[] = [];
  for (const f of files) {
    try {
      const stored = await client.putFile(folderId, f.name, f.content, f.mime);
      const localMd5 = md5(f.content);
      if (stored.md5Checksum && stored.md5Checksum !== localMd5) throw new Error(`Drive reports a different md5 for ${f.name} than was sent.`);
      written.push({ name: f.name, fileId: stored.id, md5: localMd5, rowCount: f.rows.length, columns: [...f.columns] });
    } catch (error) {
      // Some files may now be newer than the manifest. The manifest is not
      // rewritten, so a reader sees the md5 mismatch and refuses.
      return finish(
        { status: "failed", reason: `Upload of ${f.name} failed after ${written.length} file(s) were written; manifest not updated, last good manifest stands: ${String((error as Error)?.message ?? error)}`.slice(0, 400), folderId, filesJson: JSON.stringify(written) },
        { runId, status: "failed", reason: `Upload of ${f.name} failed.` },
      );
    }
  }
  const manifest: MirrorManifest = {
    version: 1, source: "pipedrive", storage: "google_drive", folderName: MIRROR_FOLDER_NAME, folderId,
    lastSuccessfulSyncAt: coverageTo.toISOString(), status: "complete", reason: null,
    coveragePeriod: { from: coverageFrom ? coverageFrom.toISOString() : null, to: coverageTo.toISOString() },
    recordCounts: { leads: leads.length, deals: deals.length, persons: persons.length },
    fieldsIncluded: { leads: [...LEAD_COLUMNS], deals: [...DEAL_COLUMNS], persons: [...PERSON_COLUMNS] },
    fieldsExcluded: [...NEVER_MIRRORED],
    files: written,
    syncRunId: runId,
  };
  try {
    const stored = await client.putFile(folderId, MIRROR_FILE_NAMES.manifest, JSON.stringify(manifest, null, 2), "application/json");
    return finish(
      { status: "complete", reason: null, leadCount: leads.length, dealCount: deals.length, personCount: persons.length, coverageFrom, coverageTo, folderId, manifestFileId: stored.id, filesJson: JSON.stringify(written) },
      { runId, status: "complete", reason: null, counts: manifest.recordCounts, manifestFileId: stored.id },
    );
  } catch (error) {
    return finish(
      { status: "failed", reason: `Data files written but the manifest upload failed; readers will see the previous manifest and refuse mismatched files: ${String((error as Error)?.message ?? error)}`.slice(0, 400), folderId, filesJson: JSON.stringify(written) },
      { runId, status: "failed", reason: "Manifest upload failed." },
    );
  }
}

export async function recentMirrorRuns(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mirrorSyncRuns).orderBy(desc(mirrorSyncRuns.id)).limit(limit);
}
