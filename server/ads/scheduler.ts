/**
 * Runs the conversion syncs on a timer: the Qualified Lead sync, then the
 * Enquiry sync, in the same tick, one after the other, so the two never
 * overlap (conversionPass.ts holds one lock for both). Every 15 minutes by
 * default, first run a few minutes after boot, silent while unconfigured or
 * disabled except for one line each at start so the state is in the deploy
 * log. Each sync has its own switch: GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED
 * and GOOGLE_ADS_ENQUIRY_SYNC_ENABLED, each exactly "true" to send.
 */
import { runQualifiedLeadSync, syncConfigState } from "./qualifiedLeadSync";
import { enquirySyncConfigState, runEnquirySync } from "./enquirySync";
import { outcomeLine, type SyncOutcome } from "./conversionPass";

/** Silent when the sync stood down for configuration; anything else is worth a line. */
function worthLogging(r: SyncOutcome): boolean {
  return r.status !== "skipped" || r.reason === "a sync is already running";
}

export function startQualifiedLeadScheduler(env: NodeJS.ProcessEnv = process.env): { stop: () => void } {
  const minutes = Math.max(5, Number(env.GOOGLE_ADS_QUALIFIED_LEAD_SYNC_MINUTES) || 15);
  void syncConfigState(env).then(state => console.log(`[Google Ads QL] Qualified Lead sync state at start: ${state}; interval ${minutes} min`));
  void enquirySyncConfigState(env).then(state => console.log(`[Google Ads ENQ] Enquiry sync state at start: ${state}; interval ${minutes} min`));
  const tick = async () => {
    try {
      const r = await runQualifiedLeadSync("schedule");
      if (worthLogging(r)) console.log(outcomeLine("[Google Ads QL]", r));
    } catch (error) {
      console.warn("[Google Ads QL] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
    try {
      const r = await runEnquirySync("schedule");
      if (worthLogging(r)) console.log(outcomeLine("[Google Ads ENQ]", r));
    } catch (error) {
      console.warn("[Google Ads ENQ] scheduled run threw:", String((error as Error)?.message ?? error).slice(0, 200));
    }
  };
  const first = setTimeout(tick, 4 * 60 * 1000);
  const interval = setInterval(tick, minutes * 60 * 1000);
  first.unref?.(); interval.unref?.();
  return { stop: () => { clearTimeout(first); clearInterval(interval); } };
}
