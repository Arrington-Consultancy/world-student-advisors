/**
 * Runs the Qualified Lead conversion sync on a timer. Every 15 minutes by
 * default, first run a few minutes after boot, never overlapping itself,
 * silent while unconfigured except for one line at start so the state is
 * in the deploy log.
 */
import { runQualifiedLeadSync, syncConfigState } from "./qualifiedLeadSync";

export function startQualifiedLeadScheduler(env: NodeJS.ProcessEnv = process.env): { stop: () => void } {
  const minutes = Math.max(5, Number(env.GOOGLE_ADS_QUALIFIED_LEAD_SYNC_MINUTES) || 15);
  void syncConfigState(env).then(state => console.log(`[Google Ads QL] Qualified Lead sync state at start: ${state}; interval ${minutes} min`));
  const tick = async () => {
    try {
      const r = await runQualifiedLeadSync("schedule");
      if (r.status !== "skipped" || r.reason === "a sync is already running") {
        console.log(`[Google Ads QL] scheduled run: ${r.status}; considered ${r.considered}, uploaded ${r.uploaded}, skipped ${r.skipped}, failed ${r.failed}, status checked ${r.statusChecked}${r.reason ? ` (${r.reason.slice(0, 160)})` : ""}`);
      }
    } catch (error) {
      console.warn("[Google Ads QL] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
  };
  const first = setTimeout(tick, 4 * 60 * 1000);
  const interval = setInterval(tick, minutes * 60 * 1000);
  first.unref?.(); interval.unref?.();
  return { stop: () => { clearTimeout(first); clearInterval(interval); } };
}
