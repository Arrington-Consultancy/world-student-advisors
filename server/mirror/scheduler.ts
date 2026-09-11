/**
 * Hourly by default. Starts a few minutes after boot so a deploy does not
 * hammer Pipedrive, skips silently while the mirror is unconfigured, and
 * never overlaps itself (runMirrorSync is single-flight).
 */
import { runMirrorSync } from "./sync";

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
  return { stop: () => { clearTimeout(first); clearInterval(interval); } };
}
