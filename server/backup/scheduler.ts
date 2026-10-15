/**
 * Runs the database backup once a night at 03:15 Europe/London: after the
 * 02:30 Pipedrive backup, when the site is quiet. One line at start puts
 * the state in the deploy log; a run that stands down says nothing.
 */
import { msUntilNextLondon } from "../mirror/scheduler";
import { databaseBackupConfigState, runDatabaseBackup } from "./databaseBackup";

export const DATABASE_BACKUP_TIME = Object.freeze({ hour: 3, minute: 15 });

export function startDatabaseBackupScheduler(env: NodeJS.ProcessEnv = process.env): { stop: () => void } {
  void databaseBackupConfigState(env).then(state => console.log(`[Database backup] state at start: ${state}; nightly at 03:15 London`));
  let timer: NodeJS.Timeout | null = null;
  const tick = async () => {
    try {
      const r = await runDatabaseBackup("schedule");
      if (r.status === "complete") console.log(`[Database backup] scheduled run complete: ${r.snapshotLabel}; ${r.manifest!.tables.length} tables, ${r.manifest!.totalRows} rows, ${r.manifest!.file.bytes} bytes; kept ${r.retention?.kept ?? "?"}, moved to trash ${(r.retention?.trashed.length ?? 0) + (r.retention?.trashedIncomplete.length ?? 0)}`);
    } catch (error) {
      console.warn("[Database backup] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
    schedule();
  };
  const schedule = () => { timer = setTimeout(tick, msUntilNextLondon(DATABASE_BACKUP_TIME.hour, DATABASE_BACKUP_TIME.minute)); timer.unref?.(); };
  schedule();
  return { stop: () => { if (timer) clearTimeout(timer); } };
}
