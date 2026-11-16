/**
 * Hourly by default. Starts a few minutes after boot so a deploy does not
 * hammer Pipedrive, skips silently while the mirror is unconfigured, and
 * never overlaps itself (runMirrorSync is single-flight).
 */
import { runMirrorSync } from "./sync";
import { runCrmBackup } from "./backup";

export function startMirrorScheduler(env: NodeJS.ProcessEnv = process.env): { stop: () => void } {
  const minutes = Math.max(15, Number(env.MIRROR_SYNC_INTERVAL_MINUTES) || 60);
  const tick = async () => {
    try {
      const r = await runMirrorSync("schedule");
      if (r.status !== "skipped") console.log(`[Reporting mirror] scheduled run ${r.runId ?? "n/a"}: ${r.status}${r.reason ? ` (${r.reason.slice(0, 120)})` : ""}`);
    } catch (error) {
      console.warn("[Reporting mirror] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
  };
  const first = setTimeout(tick, 3 * 60 * 1000);
  const interval = setInterval(tick, minutes * 60 * 1000);
  first.unref?.(); interval.unref?.();

  // Daily backup at 02:30 Europe/London, when the CRM is quiet.
  const backupTick = async () => {
    try {
      const r = await runCrmBackup("schedule");
      if (r.status !== "skipped") console.log(`[CRM backup] scheduled run ${r.runId ?? "n/a"}: ${r.status}${r.reason ? ` (${r.reason.slice(0, 120)})` : ""}`);
    } catch (error) {
      console.warn("[CRM backup] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
    schedule();
  };
  let backupTimer: NodeJS.Timeout | null = null;
  const schedule = () => { backupTimer = setTimeout(backupTick, msUntilNextLondon(2, 30)); backupTimer.unref?.(); };
  schedule();
  return { stop: () => { clearTimeout(first); clearInterval(interval); if (backupTimer) clearTimeout(backupTimer); } };
}

/** Milliseconds until the next occurrence of hh:mm in Europe/London, DST included. */
export function msUntilNextLondon(hour: number, minute: number, now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const londonNow = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second));
  const offsetMs = londonNow.getTime() - now.getTime();
  let target = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, hour, minute, 0));
  if (target.getTime() <= londonNow.getTime()) target = new Date(target.getTime() + 24 * 3600 * 1000);
  return Math.max(60_000, target.getTime() - offsetMs - now.getTime());
}
